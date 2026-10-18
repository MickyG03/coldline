import styled from "styled-components";
import { Button } from "../../components/Button.tsx";
import { Icon } from "../../components/Icon.tsx";
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
  padding-right: ${({ theme }) => theme.sizes.space.xxl};
  margin-right: ${({ theme }) => theme.sizes.space.xxl};
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

const Actions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.sizes.space.xxl};
`;

const Place = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.sizes.space.md};
  align-items: center;
  color: ${({ theme }) => theme.palette.textSecondary};
  font-size: ${({ theme }) => theme.fonts.size.sm};
  white-space: nowrap;
  & small { display: block; font-size: ${({ theme }) => theme.fonts.size.xs}; color: ${({ theme }) => theme.palette.textMuted}; }
`;

const two = (n: number) => String(n).padStart(2, "0");

export function StatsRow({ network, onNewRequest, busy }: { network: Network | null; onNewRequest: () => void; busy: boolean }) {
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
      <Actions>
        <Place>
          <Icon name="pin" size="md" />
          <div>
            Los Angeles
            <small>Regional care network{network ? ` · ${network.pharmacy.name}` : ""}</small>
          </div>
        </Place>
        <Button $variant="soft" onClick={onNewRequest} disabled={busy}>
          <Icon name="plus" size="md" /> {busy ? "Opening request…" : "New request"}
        </Button>
      </Actions>
    </Row>
  );
}
