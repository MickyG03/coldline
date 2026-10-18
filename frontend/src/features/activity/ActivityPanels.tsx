import { useEffect, useRef } from "react";
import styled from "styled-components";
import { Card } from "../../components/Card.tsx";
import { Icon } from "../../components/Icon.tsx";
import { StatusDot } from "../../components/StatusDot.tsx";
import { useSpeakingWave, Waveform } from "../../components/Waveform.tsx";
import { ConversationBlock, groupConversations } from "./Conversations.tsx";
import { Mono, Muted, Overline, SectionTitle } from "../../components/Text.tsx";
import type { Alert, BusEvent, Incident } from "../../connection/index.ts";
import type { LiveCall } from "../../provider/liveCalls.ts";
import { fmtTime } from "../status.ts";

// Below the map: live call transcript, the SMS pager, and the raw audit/event feed.

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: ${({ theme }) => theme.sizes.space.xl};
  margin: ${({ theme }) => `${theme.sizes.space.xl} 0 ${theme.sizes.space.xxxl}`};
`;

const Panel = styled(Card)`
  display: flex;
  flex-direction: column;
  max-height: 520px;
`;

const HeadRight = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.sizes.space.md};
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.sizes.space.md};
  padding: ${({ theme }) => `${theme.sizes.space.lg} ${theme.sizes.space.xl}`};
  border-bottom: ${({ theme }) => theme.border.stroke.thin} solid ${({ theme }) => theme.palette.border};
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => `${theme.sizes.space.md} ${theme.sizes.space.xl}`};
  font-size: ${({ theme }) => theme.fonts.size.xs};
`;

const Turn = styled.div<{ $agent: boolean }>`
  display: grid;
  grid-template-columns: 76px 1fr;
  gap: ${({ theme }) => theme.sizes.space.md};
  padding: ${({ theme }) => `${theme.sizes.space.xs} 0`};
  color: ${({ theme, $agent }) => ($agent ? theme.palette.textSecondary : theme.palette.textPrimary)};
`;


const Entry = styled.div`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: ${({ theme }) => theme.sizes.space.sm};
  padding: ${({ theme }) => `${theme.sizes.space.sm} 0`};
  border-bottom: ${({ theme }) => theme.border.stroke.thin} solid ${({ theme }) => theme.palette.border};
  &:last-child { border-bottom: 0; }
  & > span:first-child { margin-top: 6px; }
`;

const Empty = styled(Muted)`
  display: block;
  padding: ${({ theme }) => `${theme.sizes.space.lg} 0`};
`;

const ALERT_DOT = { sent: "confirmed", simulated: "unknown", failed: "unavailable" } as const;

function Transcript({ incident, live, calls }: { incident: Incident | null; live: boolean; calls: LiveCall[] }) {
  const body = useRef<HTMLDivElement>(null);
  // Saved lines for the request on screen, then any pharmacy call still on the line: its request
  // doesn't exist until intake finishes, so its turns live only in the call stream until then.
  const intake = calls.filter((c) => c.role === "pharmacy" && !c.endedAt)
    .flatMap((c) => c.lines.map((l) => ({ ...l, caller: "pharmacy", facilityId: null })));
  const lines = intake.length ? intake : incident?.transcript ?? [];
  const names = new Map(incident?.facilities.map((f) => [f.facility.id, f.facility.name]) ?? []);
  const conversations = groupConversations(lines, names, incident?.pharmacy.name ?? "Pharmacy");
  const last = lines[lines.length - 1];
  const activeKey = last ? conversations.find((c) => c.lines.includes(last))?.key : undefined;
  const wave = useSpeakingWave(lines.length, last?.speaker ?? null, live);
  useEffect(() => {
    // Keep the newest turn in view without scrolling the page.
    if (body.current) body.current.scrollTop = body.current.scrollHeight;
  }, [lines.length]);
  return (
    <Panel>
      <Head>
        <SectionTitle>Live transcript</SectionTitle>
        <HeadRight>
          {live && <Waveform state={wave.state} tone={wave.tone} bars={10} height={18} />}
          <Overline>{conversations.length} {conversations.length === 1 ? "call" : "calls"} · {lines.length} turns</Overline>
        </HeadRight>
      </Head>
      <Body ref={body}>
        {!lines.length && <Empty>Calls appear here as they happen: the pharmacy's report, then coordinators (or simulated responders).</Empty>}
        {conversations.map((c) => <ConversationBlock key={c.key} c={c} active={live && c.key === activeKey} />)}
      </Body>
    </Panel>
  );
}

function Pager({ alerts }: { alerts: Alert[] }) {
  return (
    <Panel>
      <Head>
        <SectionTitle>Pager</SectionTitle>
        <Icon name="bell" size="sm" />
      </Head>
      <Body>
        {!alerts.length && <Empty>SMS alerts to coordinators and staff show up here.</Empty>}
        {[...alerts].reverse().map((a) => (
          <Entry key={a.id}>
            <StatusDot $status={ALERT_DOT[a.status]} />
            <div>
              <div>Alert {a.status} · {a.recipient}</div>
              <Muted>{fmtTime(a.at)}{a.to ? ` · ${a.to}` : ""}{a.detail ? ` · ${a.detail}` : ""}</Muted>
            </div>
          </Entry>
        ))}
      </Body>
    </Panel>
  );
}

const describe = (e: BusEvent) => {
  const p = e.payload as Record<string, any>;
  switch (e.type) {
    case "facility.status_changed": return `${p.facilityId}: ${p.from ?? "—"} → ${p.to}`;
    case "incident.updated": return `request ${p.incident?.status}`;
    case "incident.opened": return `request opened (${p.incident?.totalUnits} units)`;
    case "response.judged": return `${p.facilityId} judged by Jev: ${p.response?.status}`;
    case "decision.made": return `${p.decision?.decision} by ${p.decision?.decidedBy}`;
    case "transcript.line": return `${p.caller}: ${String(p.text).slice(0, 60)}`;
    case "caller.routed": return `incoming call: ${p.label ?? p.role}`;
    case "caller.refused": return `refused call from an unregistered number`;
    case "call.ended": return `${p.role} call ended (${p.reason})`;
    case "alert.sent": return `${p.status} alert to ${p.recipient}`;
    case "demo.status": return p.simulating ? "simulation started" : `simulation finished${p.error ? `: ${p.error}` : ""}`;
    default: return e.type;
  }
};

function Activity({ events }: { events: BusEvent[] }) {
  const shown = events.filter((e) => e.type !== "transcript.line");
  return (
    <Panel>
      <Head>
        <SectionTitle>Audit stream</SectionTitle>
        <Icon name="shield" size="sm" />
      </Head>
      <Body>
        {!shown.length && <Empty>Every state change is written to the audit log and streamed here.</Empty>}
        {shown.map((e) => (
          <Entry key={e.auditId}>
            <Mono>#{e.auditId}</Mono>
            <div>
              <div>{describe(e)}</div>
              <Muted>{fmtTime(e.at)} · {e.type}</Muted>
            </div>
          </Entry>
        ))}
      </Body>
    </Panel>
  );
}

export function ActivityPanels({ incident, events, live, calls }: {
  incident: Incident | null; events: BusEvent[]; live: boolean; calls: LiveCall[];
}) {
  return (
    <Grid>
      <Transcript incident={incident} live={live} calls={calls} />
      <Pager alerts={incident?.alerts ?? []} />
      <Activity events={events} />
    </Grid>
  );
}
