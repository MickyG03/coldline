import { useState } from "react";
import styled from "styled-components";
import { Button } from "../../components/Button.tsx";
import { Chip } from "../../components/Chip.tsx";
import { Icon } from "../../components/Icon.tsx";
import { StatusDot } from "../../components/StatusDot.tsx";
import { Overline } from "../../components/Text.tsx";
import type { DemoStatus } from "../../connection/index.ts";

const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.sizes.space.md};
  padding: ${({ theme }) => `${theme.sizes.space.lg} 0`};
`;

const Check = styled.label`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.sizes.space.xs};
  font-size: ${({ theme }) => theme.fonts.size.xs};
  color: ${({ theme }) => theme.palette.textSecondary};
  cursor: pointer;
  & input { accent-color: ${({ theme }) => theme.palette.primary}; }
`;

const Spacer = styled.div`
  flex: 1;
`;

const Error = styled.span`
  font-size: ${({ theme }) => theme.fonts.size.xs};
  color: ${({ theme }) => theme.palette.statusContradictory};
`;

export function DemoToolbar({ demo, hasIncident, busy, live, error, onSimulate, onReset }: {
  demo: DemoStatus | null;
  hasIncident: boolean;
  busy: string | null;
  live: boolean;
  error: string | null;
  onSimulate: (redteam: boolean) => void;
  onReset: () => void;
}) {
  const [redteam, setRedteam] = useState(false);
  const running = !!demo?.simulating;
  return (
    <Bar id="demo">
      <Overline>Demo controls</Overline>
      <Button $variant="ghost" $size="sm" disabled={!hasIncident || running || !!busy} onClick={() => onSimulate(redteam)}>
        <Icon name="play" size="sm" /> {running ? `Simulating${demo?.redteam ? " + red team" : ""}…` : "Simulate responders"}
      </Button>
      <Check>
        <input type="checkbox" checked={redteam} onChange={(e) => setRedteam(e.target.checked)} disabled={running} />
        Include red team
      </Check>
      <Button $variant="ghost" $size="sm" disabled={running || !!busy} onClick={onReset}>
        <Icon name="refresh" size="sm" /> Reset demo
      </Button>
      {error && <Error>{error}</Error>}
      <Spacer />
      <Chip><Icon name="clock" size="sm" /> Business clock {demo?.businessClock ?? "—"} PT</Chip>
      <Chip><Icon name="message" size="sm" /> SMS {demo?.sms ?? "off"}</Chip>
      <Chip><StatusDot $status={live ? "confirmed" : "unavailable"} /> {live ? "Live" : "Reconnecting"}</Chip>
    </Bar>
  );
}
