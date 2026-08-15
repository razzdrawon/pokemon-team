import { useState, type FormEvent } from 'react';
import styled from '@emotion/styled';
import type { ProfileDto } from '@pokemon/contracts';

interface ProfilePickerProps {
  profiles: ProfileDto[];
  selectedProfileId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  createError?: string;
  disabled?: boolean; // e.g. a team submit is in flight for the current profile
}

const List = styled.ul`
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const ProfileButton = styled.button<{ selected: boolean }>`
  padding: 6px 12px;
  border-radius: 6px;
  border: 2px solid ${(p) => (p.selected ? '#3b82f6' : '#e5e7eb')};
  background: ${(p) => (p.selected ? '#eff6ff' : 'white')};
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export function ProfilePicker({
  profiles,
  selectedProfileId,
  onSelect,
  onCreate,
  createError,
  disabled,
}: ProfilePickerProps) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onCreate(name.trim());
      setName('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <List>
        {profiles.map((p) => (
          <li key={p.id}>
            <ProfileButton
              type="button"
              selected={p.id === selectedProfileId}
              disabled={disabled}
              onClick={() => onSelect(p.id)}
            >
              {p.name} ({p.teamSize}/6)
            </ProfileButton>
          </li>
        ))}
      </List>
      <form onSubmit={handleCreate}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New profile name"
          disabled={disabled}
        />
        <button type="submit" disabled={disabled || submitting || !name.trim()}>
          Create
        </button>
        {createError && <span role="alert">{createError}</span>}
      </form>
    </div>
  );
}
