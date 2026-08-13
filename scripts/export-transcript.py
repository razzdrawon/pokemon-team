#!/usr/bin/env python3
"""
Export a Claude Code session to a readable Markdown transcript.

The interview README requires an LLM_TRANSCRIPT.md containing the tool, the model,
and the full conversation. Claude Code stores each session as JSONL under
~/.claude/projects/<url-encoded-cwd>/<session-id>.jsonl; this turns that into Markdown.

Usage:
    python3 scripts/export-transcript.py                     # newest session for this repo
    python3 scripts/export-transcript.py --list              # show available sessions
    python3 scripts/export-transcript.py --session <uuid>
    python3 scripts/export-transcript.py --thinking          # include reasoning blocks
    python3 scripts/export-transcript.py --full-tools        # full tool inputs, not summaries
    python3 scripts/export-transcript.py -o LLM_TRANSCRIPT.md
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

PROJECTS_DIR = Path.home() / ".claude" / "projects"

# Wrappers the harness injects into user turns — noise in a human-facing transcript.
NOISE_TAGS = (
    "system-reminder",
    "local-command-stdout",
    "command-name",
    "command-message",
    "command-args",
)

# Not everything the user says arrives as a plain user message. Rejecting a tool call,
# answering a clarifying question, or interrupting a turn all deliver the user's words
# inside a tool_result. Without these, a transcript silently loses half the conversation.
# Anchored to the START of the tool result on purpose. These phrases are how the harness
# opens a feedback message; searching anywhere would also match command output that merely
# quotes them (e.g. a grep over this very session log), fabricating user turns.
FEEDBACK_PATTERNS = [
    (re.compile(r"^\s*The user doesn't want to proceed with this tool use\..*?"
                r"the user said:\s*(.+)", re.DOTALL), "declined the proposed step"),
    (re.compile(r"^\s*\[Request interrupted by user[^\]]*\]\s*(.+)", re.DOTALL), "interrupted"),
    (re.compile(r"^\s*The user answered:\s*(.+)", re.DOTALL), "answered clarifying questions"),
    (re.compile(r"^\s*Your questions have been answered:\s*(.+)", re.DOTALL),
     "answered clarifying questions"),
    (re.compile(r"^\s*User has approved your plan\."), "approved the plan"),
]

# Harness boilerplate appended after the user's actual words.
FEEDBACK_TRAILERS = [
    re.compile(r"\s*You can now continue with these answers in mind\.\s*$"),
    re.compile(r"\s*Read the answers carefully.*$", re.DOTALL),
    re.compile(r"\s*Your plan has been saved to:.*$", re.DOTALL),
    re.compile(r"\s*\(eg\. if it was a file edit[^)]*\)\s*"),
]


def result_text(block: dict) -> str:
    """tool_result content is either a string or a list of {type:text} parts."""
    content = block.get("content")
    if isinstance(content, list):
        return " ".join(p.get("text", "") for p in content if isinstance(p, dict))
    return content if isinstance(content, str) else ""


def recover_user_feedback(block: dict) -> tuple[str, str] | None:
    """Pull the user's own words back out of a tool_result, with how they were delivered."""
    text = result_text(block)
    if not text:
        return None
    for pattern, kind in FEEDBACK_PATTERNS:
        match = pattern.search(text)
        if not match:
            continue
        said = match.group(1).strip() if match.groups() else ""
        for trailer in FEEDBACK_TRAILERS:
            said = trailer.sub("", said).strip()
        return (said, kind)
    return None


def encode_cwd(path: Path) -> str:
    """Claude Code encodes the project path by replacing non-alphanumerics with '-'."""
    return re.sub(r"[^a-zA-Z0-9]", "-", str(path))


def find_sessions(cwd: Path) -> list[Path]:
    project_dir = PROJECTS_DIR / encode_cwd(cwd)
    if not project_dir.is_dir():
        return []
    return sorted(project_dir.glob("*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True)


def strip_noise(text: str) -> str:
    for tag in NOISE_TAGS:
        text = re.sub(rf"<{tag}>.*?</{tag}>", "", text, flags=re.DOTALL)
        text = re.sub(rf"<{tag}\s*/>", "", text)
    return text.strip()


def summarize_tool_input(name: str, tool_input: dict, repo_root: Path) -> str:
    """One-line gist of a tool call, so the transcript reads without drowning in JSON."""
    if not isinstance(tool_input, dict):
        return ""

    def rel(p: str) -> str:
        try:
            return str(Path(p).relative_to(repo_root))
        except (ValueError, TypeError):
            return str(p)

    for key in ("file_path", "path", "notebook_path"):
        if key in tool_input:
            return rel(tool_input[key])
    if "description" in tool_input:
        return str(tool_input["description"])
    if "command" in tool_input:
        cmd = " ".join(str(tool_input["command"]).split())
        return cmd if len(cmd) <= 120 else cmd[:117] + "..."
    for key in ("pattern", "query", "prompt", "subject", "url", "skill", "taskId"):
        if key in tool_input:
            val = " ".join(str(tool_input[key]).split())
            return val if len(val) <= 120 else val[:117] + "..."
    return ""


def fence(text: str, lang: str = "") -> str:
    """Fence content, widening the delimiter so embedded fences survive."""
    longest = max((len(m) for m in re.findall(r"^`{3,}", text, flags=re.MULTILINE)), default=0)
    bar = "`" * max(3, longest + 1)
    return f"{bar}{lang}\n{text}\n{bar}"


def parse_records(path: Path) -> list[dict]:
    records = []
    for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = line.strip()
        if not line:
            continue
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError:
            print(f"  warning: skipped unparseable line {lineno}", file=sys.stderr)
    return records


def build_markdown(records: list[dict], session_file: Path, repo_root: Path,
                   include_thinking: bool, full_tools: bool) -> str:
    model = None
    started = None
    turns: list[dict] = []

    for rec in records:
        if rec.get("type") not in ("user", "assistant"):
            continue
        message = rec.get("message") or {}
        role = message.get("role")
        if role not in ("user", "assistant"):
            continue

        model = model or message.get("model")
        started = started or rec.get("timestamp")

        content = message.get("content")
        if isinstance(content, str):
            blocks = [{"type": "text", "text": content}]
        elif isinstance(content, list):
            blocks = [b for b in content if isinstance(b, dict)]
        else:
            continue

        texts, thinking, tools = [], [], []
        for block in blocks:
            btype = block.get("type")
            if btype == "text":
                cleaned = strip_noise(block.get("text", ""))
                if cleaned:
                    texts.append(cleaned)
            elif btype == "thinking" and include_thinking:
                if block.get("thinking", "").strip():
                    thinking.append(block["thinking"].strip())
            elif btype == "tool_use":
                tools.append({
                    "name": block.get("name", "?"),
                    "input": block.get("input", {}),
                })
            elif btype == "tool_result":
                # Tool output itself is machine noise and is dropped, but the user's own
                # words are sometimes carried inside it — recover those.
                recovered = recover_user_feedback(block)
                if recovered:
                    said, kind = recovered
                    note = f"*[{kind}]*"
                    texts.append(f"{note}\n\n{said}" if said else note)

        if not (texts or thinking or tools):
            continue

        turns.append({"role": role, "texts": texts, "thinking": thinking, "tools": tools})

    # Merge consecutive same-role turns so one logical exchange reads as one section.
    merged: list[dict] = []
    for turn in turns:
        if merged and merged[-1]["role"] == turn["role"]:
            prev = merged[-1]
            prev["texts"] += turn["texts"]
            prev["thinking"] += turn["thinking"]
            prev["tools"] += turn["tools"]
        else:
            merged.append(turn)

    exported = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    out: list[str] = [
        "# LLM Transcript",
        "",
        "Required by the interview README: the tool and model used, and the full conversation.",
        "",
        "| | |",
        "|---|---|",
        "| **Tool** | Claude Code (CLI / desktop) |",
        f"| **Model** | {model or 'claude-opus-5'} |",
        f"| **Session** | `{session_file.stem}` |",
        f"| **Started** | {started or 'unknown'} |",
        f"| **Exported** | {exported} |",
        f"| **Exchanges** | {len(merged)} |",
        "",
        "Generated by [`scripts/export-transcript.py`](scripts/export-transcript.py) from the "
        "Claude Code session log. Tool calls are listed by name and target; their outputs "
        "(file contents, command output) are omitted for readability."
        + ("" if include_thinking else " Reasoning blocks are omitted."),
        "",
        "---",
        "",
    ]

    exchange = 0
    for turn in merged:
        if turn["role"] == "user":
            exchange += 1
            out.append(f"## {exchange}. Prompt")
        else:
            out.append(f"## {exchange}. Response")
        out.append("")

        for block in turn["thinking"]:
            out.append("<details><summary>Reasoning</summary>")
            out.append("")
            out.append(fence(block))
            out.append("")
            out.append("</details>")
            out.append("")

        for text in turn["texts"]:
            out.append(text)
            out.append("")

        if turn["tools"]:
            count = len(turn["tools"])
            out.append(f"<details><summary>Tool calls ({count})</summary>")
            out.append("")
            for tool in turn["tools"]:
                if full_tools:
                    payload = json.dumps(tool["input"], indent=2, ensure_ascii=False)
                    out.append(f"**`{tool['name']}`**")
                    out.append("")
                    out.append(fence(payload, "json"))
                    out.append("")
                else:
                    gist = summarize_tool_input(tool["name"], tool["input"], repo_root)
                    out.append(f"- `{tool['name']}`" + (f" — {gist}" if gist else ""))
            out.append("")
            out.append("</details>")
            out.append("")

        out.append("---")
        out.append("")

    return "\n".join(out).rstrip() + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--session", help="session UUID (default: most recently modified)")
    parser.add_argument("--list", action="store_true", help="list sessions for this repo and exit")
    parser.add_argument("--thinking", action="store_true", help="include reasoning blocks")
    parser.add_argument("--full-tools", action="store_true", help="full tool inputs, not summaries")
    parser.add_argument("-o", "--output", default="LLM_TRANSCRIPT.md", help="output path")
    parser.add_argument("--cwd", default=None, help="project dir (default: repo root)")
    args = parser.parse_args()

    repo_root = Path(args.cwd).resolve() if args.cwd else Path(__file__).resolve().parent.parent
    sessions = find_sessions(repo_root)

    if not sessions:
        print(f"No sessions found for {repo_root}", file=sys.stderr)
        print(f"Looked in: {PROJECTS_DIR / encode_cwd(repo_root)}", file=sys.stderr)
        return 1

    if args.list:
        print(f"Sessions for {repo_root}:\n")
        for path in sessions:
            mtime = datetime.fromtimestamp(path.stat().st_mtime).strftime("%Y-%m-%d %H:%M")
            size = path.stat().st_size / 1024
            print(f"  {path.stem}  {mtime}  {size:>8.0f} KB")
        return 0

    if args.session:
        matches = [p for p in sessions if p.stem == args.session]
        if not matches:
            print(f"Session {args.session} not found. Use --list.", file=sys.stderr)
            return 1
        session_file = matches[0]
    else:
        session_file = sessions[0]

    records = parse_records(session_file)
    markdown = build_markdown(records, session_file, repo_root, args.thinking, args.full_tools)

    output = Path(args.output)
    if not output.is_absolute():
        output = repo_root / output
    output.write_text(markdown, encoding="utf-8")

    print(f"Session:  {session_file.stem}")
    print(f"Records:  {len(records)}")
    print(f"Written:  {output}  ({len(markdown) / 1024:.0f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
