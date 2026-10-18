import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { Card } from "../../components/Card.tsx";
import { Icon } from "../../components/Icon.tsx";
import { StatusDot } from "../../components/StatusDot.tsx";
import { Mono, Muted, Overline } from "../../components/Text.tsx";
import type { LiveCall } from "../../provider/liveCalls.ts";

// Incoming-call indicator: one card per real phone call on the line, with its transcript as it happens.

const Stack = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.sizes.space.lg};
  margin-bottom: ${({ theme }) => theme.sizes.space.xl};
`;

const CallCard = styled(Card)<{ $ended: boolean }>`
  border-color: ${({ theme, $ended }) => ($ended ? theme.palette.border : theme.palette.statusCalling)};
  background: ${({ theme, $ended }) => ($ended ? theme.palette.surfaceMuted : theme.palette.surface)};
  opacity: ${({ $ended }) => ($ended ? 0.75 : 1)};
  transition: opacity 0.4s ease, border-color 0.4s ease;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.sizes.space.md};
  padding: ${({ theme }) => `${theme.sizes.space.lg} ${theme.sizes.space.xl}`};
  border-bottom: ${({ theme }) => theme.border.stroke.thin} solid ${({ theme }) => theme.palette.border};
`;

const Who = styled.div`
  flex: 1;
  min-width: 0;
  font-weight: ${({ theme }) => theme.fonts.weight.medium};
`;

const Lines = styled.div`
  max-height: 180px;
  overflow-y: auto;
  padding: ${({ theme }) => `${theme.sizes.space.md} ${theme.sizes.space.xl}`};
  font-size: ${({ theme }) => theme.fonts.size.sm};
`;

const Line = styled.div<{ $agent: boolean }>`
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: ${({ theme }) => theme.sizes.space.md};
  padding: ${({ theme }) => `${theme.sizes.space.xs} 0`};
  color: ${({ theme, $agent }) => ($agent ? theme.palette.textSecondary : theme.palette.textPrimary)};
`;

const Speaker = styled(Mono)<{ $agent: boolean }>`
  color: ${({ theme, $agent }) => ($agent ? theme.palette.primary : theme.palette.textMuted)};
`;

const elapsed = (from: string, to: number) => {
  const s = Math.max(0, Math.floor((to - new Date(from).getTime()) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function Call({ call, now }: { call: LiveCall; now: number }) {
  const body = useRef<HTMLDivElement>(null);
  const ended = !!call.endedAt;
  useEffect(() => {
    if (body.current) body.current.scrollTop = body.current.scrollHeight;
  }, [call.lines.length]);
  return (
    <CallCard $ended={ended}>
      <Head>
        <StatusDot $status={ended ? "unknown" : "calling"} $size={8} />
        <Icon name="phone" size="sm" />
        <Who>
          {ended ? "Call ended" : "Incoming call"} · {call.label}
        </Who>
        <Overline>{call.role}</Overline>
        <Mono>{elapsed(call.startedAt, call.endedAt ? new Date(call.endedAt).getTime() : now)}</Mono>
      </Head>
      <Lines ref={body}>
        {!call.lines.length && <Muted>Connected. Waiting for the first words…</Muted>}
        {call.lines.map((l, i) => (
          <Line key={i} $agent={l.speaker === "agent"}>
            <Speaker $agent={l.speaker === "agent"}>{l.speaker === "agent" ? "coldline" : call.role}</Speaker>
            <span>{l.text}</span>
          </Line>
        ))}
      </Lines>
    </CallCard>
  );
}

export function LiveCallBanner({ calls }: { calls: LiveCall[] }) {
  const [now, setNow] = useState(Date.now());
  const active = calls.some((c) => !c.endedAt);
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  if (!calls.length) return null;
  return (
    <Stack aria-live="polite">
      {calls.map((c) => <Call key={c.callId} call={c} now={now} />)}
    </Stack>
  );
}
