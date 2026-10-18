import { useEffect, useRef } from "react";
import styled from "styled-components";
import { ChipButton } from "../../components/Chip.tsx";
import { Icon } from "../../components/Icon.tsx";
import { StatusDot } from "../../components/StatusDot.tsx";
import { RADII, type Filters } from "../filters.ts";

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.sizes.space.md};
  padding: ${({ theme }) => `${theme.sizes.space.lg} ${theme.sizes.space.xl}`};
  border-bottom: ${({ theme }) => theme.border.stroke.thin} solid ${({ theme }) => theme.palette.border};
  color: ${({ theme }) => theme.palette.textMuted};
`;

const Search = styled.input`
  flex: 1;
  max-width: 280px;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: ${({ theme }) => theme.fonts.size.sm};
  color: ${({ theme }) => theme.palette.textPrimary};
  &::placeholder { color: ${({ theme }) => theme.palette.textMuted}; }
`;

const Kbd = styled.kbd`
  padding: ${({ theme }) => `${theme.sizes.space.xxs} ${theme.sizes.space.xs}`};
  border: ${({ theme }) => theme.border.stroke.thin} solid ${({ theme }) => theme.palette.border};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  font-family: ${({ theme }) => theme.fonts.family.mono};
  font-size: ${({ theme }) => theme.fonts.size.xxs};
`;

const Spacer = styled.div`
  flex: 1;
`;

const Select = styled.select`
  border: 0;
  background: transparent;
  font-size: ${({ theme }) => theme.fonts.size.xs};
  color: ${({ theme }) => theme.palette.textSecondary};
  cursor: pointer;
`;

export function MapToolbar({ filters }: { filters: Filters }) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Bar>
      <Icon name="search" size="md" />
      <Search ref={input} placeholder="Search your network" value={filters.query}
        onChange={(e) => filters.setQuery(e.target.value)} />
      <Kbd>⌘K</Kbd>
      <Spacer />
      <ChipButton $active={filters.availableOnly} onClick={() => filters.setAvailableOnly(!filters.availableOnly)}>
        <StatusDot $status="confirmed" /> Available now
      </ChipButton>
      <Select value={filters.radius} onChange={(e) => filters.setRadius(Number(e.target.value))} aria-label="Radius">
        {RADII.map((r) => <option key={r} value={r}>{r} mi radius</option>)}
      </Select>
    </Bar>
  );
}
