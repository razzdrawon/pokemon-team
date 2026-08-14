// One-off dev script — regenerates pokemon-seed.json from PokéAPI. Never run in setup or
// CI; the JSON it produces is committed and consumed by the data migration instead.
//   pnpm exec tsx src/seed/fetch-pokeapi.ts   (from packages/pokemon-user-backend)
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { PokemonDto } from '@pokemon/contracts';

const BASE_URL = 'https://pokeapi.co/api/v2';
const COUNT = 150;
const CONCURRENCY = 10;
const OUTPUT_PATH = join(process.cwd(), 'src/seed/pokemon-seed.json'); // run from package root

interface PokeApiListEntry {
  name: string;
  url: string;
}

interface PokeApiDetail {
  id: number;
  name: string;
  height: number;
  weight: number;
  sprites: { front_default: string | null };
  types: { type: { name: string } }[];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} — ${url}`);
  }
  return res.json() as Promise<T>;
}

async function fetchDetail(entry: PokeApiListEntry): Promise<PokemonDto> {
  const detail = await fetchJson<PokeApiDetail>(entry.url);
  if (!detail.sprites.front_default) {
    throw new Error(`No sprite for #${detail.id} (${detail.name})`);
  }
  return {
    id: detail.id,
    name: detail.name,
    spriteUrl: detail.sprites.front_default,
    types: detail.types.map((t) => t.type.name),
    height: detail.height,
    weight: detail.weight,
  };
}

// Simple concurrency-limited pool — polite to PokéAPI, fast enough for 150 items.
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

async function main() {
  console.log(`Fetching first ${COUNT} Pokémon from ${BASE_URL}...`);
  const { results: list } = await fetchJson<{ results: PokeApiListEntry[] }>(
    `${BASE_URL}/pokemon?limit=${COUNT}&offset=0`
  );
  if (list.length !== COUNT) {
    throw new Error(`Expected ${COUNT} entries, got ${list.length}`);
  }

  const pokemon = await mapWithConcurrency(list, CONCURRENCY, fetchDetail);
  pokemon.sort((a, b) => a.id - b.id);

  const seed = {
    source: BASE_URL,
    fetchedAt: new Date().toISOString(),
    count: pokemon.length,
    pokemon,
  };
  await writeFile(OUTPUT_PATH, JSON.stringify(seed, null, 2) + '\n');
  console.log(`Wrote ${pokemon.length} Pokémon to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
