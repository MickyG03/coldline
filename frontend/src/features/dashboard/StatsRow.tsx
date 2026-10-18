import styled from "styled-components";
import { StatusDot } from "../../components/StatusDot.tsx";
import type { Network } from "../../connection/index.ts";

const Row = styled.div`
  display: grid;
  grid-template-columns: repeat(3, auto) 1fr;
  align-items: center;
  padding: ${({ theme }) => `${theme.sizes.space.xl} 0`};
  border-bottom: ${({ theme }) => theme.border.stroke.thin} solid ${({ theme }) => theme.palette.border};
`;

const Stat = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.sizes.space.lg};
  padding-right: ${({ theme }) => theme.sizes.space.xxxl};
  margin-right: ${({ theme }) => theme.sizes.space.xxxl};
  border-right: ${({ theme }) => theme.border.stroke.thin} solid ${({ theme }) => theme.palette.border};
`;

const Numeral = styled.span<{ $accent?: boolean }>`
  font-size: ${({ theme }) => theme.fonts.size.numeral};
  font-weight: ${({ theme }) => theme.fonts.weight.light};
  letter-spacing: ${({ theme }) => theme.fonts.tracking.tight};
  color: ${({ theme, $accent }) => ($accent ? theme.palette.primary : theme.palette.textPrimary)};
  & small { font-size: ${({ theme }) => theme.fonts.size.md}; }
`;

const Label = styled.div`
  font-size: ${({ theme }) => theme.fonts.size.sm};
  color: ${({ theme }) => theme.palette.textPrimary};
  & small {
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.sizes.space.xs};
    font-size: ${({ theme }) => theme.fonts.size.xs};
    color: ${({ theme }) => theme.palette.textMuted};
  }
`;

const Tagline = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.sizes.space.lg};
  font-size: ${({ theme }) => theme.fonts.size.xs};
  color: ${({ theme }) => theme.palette.textMuted};
  & svg { stroke: ${({ theme }) => theme.palette.borderStrong}; fill: none; }
`;

const two = (n: number) => String(n).padStart(2, "0");

/** Small branching-line illustration next to the tagline. */
function Branches() {
  return (
    <svg width="110" height="52" viewBox="0 0 110 52" aria-hidden>
      <path d="M0 26h38c10 0 12-16 24-16h30M38 26c10 0 12 14 24 14h30M58 26h34M70 10V4" />
      <circle cx="94" cy="10" r="3" /><circle cx="94" cy="26" r="3" /><circle cx="94" cy="40" r="3" /><circle cx="70" cy="3" r="2" />
    </svg>
  );
}

export function StatsRow({ network }: { network: Network | null }) {
  return (
    <Row>
      <Stat>
        <Numeral>{two(network?.connected ?? 0)}</Numeral>
        <Label>Connected facilities<small>One shared safety net</small></Label>
      </Stat>
      <Stat>
        <Numeral $accent>{two(network?.readyToReceive ?? 0)}</Numeral>
        <Label>Ready to receive<small><StatusDot $status="confirmed" /> Capacity reported</small></Label>
      </Stat>
      <Stat>
        <Numeral>{network?.nearestBackupMinutes ?? "—"}<small> min</small></Numeral>
        <Label>Nearest backup<small>Google Routes drive time</small></Label>
      </Stat>
      <Tagline>
        <Branches />
        <span>Small connections.<br />A stronger whole.</span>
      </Tagline>
    </Row>
  );
}
