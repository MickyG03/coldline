import styled, { css } from "styled-components";
import { Icon } from "../../components/Icon.tsx";
import { Mono, Overline } from "../../components/Text.tsx";
import type { TranscriptLine } from "../../connection/index.ts";

// Live transcript as one block per call: who was on the line, then the exchange as chat bubbles
// (Coldline on the left, the caller on the right). Calls that overlapped stay readable.

type Line = Pick<TranscriptLine, "caller" | "facilityId" | "speaker" | "text" | "at">;

export interface Conversation {
  key: string;
  title: string;
  role: string;
  simulated: boolean;
  lines: Line[];
}

const SIMULATED = /^(staff\d+|redteam)$/;

/** Group lines by caller, in order of each call's first line. */
export function groupConversations(lines: Line[], names: Map<string, string>, pharmacyName: string): Conversation[] {
  const byKey = new Map<string, Conversation>();
  for (const l of lines) {
    const key = l.caller === "pharmacy" ? "pharmacy" : `${l.caller}:${l.facilityId ?? ""}`;
    let c = byKey.get(key);
    if (!c) {
      const simulated = SIMULATED.test(l.caller);
      c = {
        key,
        title: l.caller === "pharmacy" ? pharmacyName : names.get(l.facilityId ?? "") ?? "Backup site",
        role: l.caller === "pharmacy" ? "pharmacy" : l.caller === "redteam" ? "red team" : "coordinator",
        simulated,
        lines: [],
      };
      byKey.set(key, c);
    }
    c.lines.push(l);
  }
  return [...byKey.values()];
}

const Block = styled.section<{ $active: boolean }>`
  padding: ${({ theme }) => `${theme.sizes.space.md} 0 ${theme.sizes.space.lg}`};
  border-bottom: ${({ theme }) => theme.border.stroke.thin} solid ${({ theme }) => theme.palette.border};
  &:last-child { border-bottom: 0; }
  ${({ $active, theme }) => $active && css`
    & > header > span:first-child { background: ${theme.palette.primarySoft}; color: ${theme.palette.onPrimarySoft}; }
  `}
`;

const BlockHead = styled.header`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.sizes.space.md};
  margin-bottom: ${({ theme }) => theme.sizes.space.md};
`;

const Badge = styled.span`
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.border.radius.pill};
  background: ${({ theme }) => theme.palette.panel};
  color: ${({ theme }) => theme.palette.textSecondary};
  transition: background 0.3s ease, color 0.3s ease;
`;

const Names = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Title = styled.div`
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: ${({ theme }) => theme.fonts.size.sm};
  font-weight: ${({ theme }) => theme.fonts.weight.medium};
  color: ${({ theme }) => theme.palette.textPrimary};
`;

const Turns = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.sizes.space.xs};
`;

const Bubble = styled.div<{ $agent: boolean; $first: boolean }>`
  max-width: 86%;
  padding: ${({ theme }) => `${theme.sizes.space.xs} ${theme.sizes.space.md}`};
  font-size: ${({ theme }) => theme.fonts.size.xs};
  line-height: ${({ theme }) => theme.fonts.lineHeight.normal};
  border-radius: ${({ theme }) => theme.border.radius.lg};
  ${({ $agent, theme }) => ($agent
    ? css`
      align-self: flex-start;
      background: ${theme.palette.primaryTint};
      color: ${theme.palette.textPrimary};
      border-bottom-left-radius: ${theme.border.radius.sm};
    `
    : css`
      align-self: flex-end;
      background: ${theme.palette.surface};
      color: ${theme.palette.textPrimary};
      border: ${theme.border.stroke.thin} solid ${theme.palette.border};
      border-bottom-right-radius: ${theme.border.radius.sm};
    `)}
  ${({ $first, theme }) => $first && css`margin-top: ${theme.sizes.space.xs};`}
`;

const Who = styled(Mono)<{ $agent: boolean }>`
  align-self: ${({ $agent }) => ($agent ? "flex-start" : "flex-end")};
  margin-top: ${({ theme }) => theme.sizes.space.xs};
  font-size: ${({ theme }) => theme.fonts.size.xxs};
  color: ${({ theme, $agent }) => ($agent ? theme.palette.primary : theme.palette.textMuted)};
`;

export function ConversationBlock({ c, active }: { c: Conversation; active: boolean }) {
  return (
    <Block $active={active}>
      <BlockHead>
        <Badge><Icon name={c.role === "pharmacy" ? "building" : "phone"} size="sm" /></Badge>
        <Names>
          <Title title={c.title}>{c.title}</Title>
          <Overline>{c.role}{c.simulated ? " · simulated" : ""}</Overline>
        </Names>
        <Mono>{c.lines.length}</Mono>
      </BlockHead>
      <Turns>
        {c.lines.map((l, i) => {
          const agent = l.speaker === "agent";
          const newSpeaker = i === 0 || c.lines[i - 1].speaker !== l.speaker;
          return (
            <Turn key={i} agent={agent} label={newSpeaker ? (agent ? "coldline" : c.role) : null} text={l.text} />
          );
        })}
      </Turns>
    </Block>
  );
}

function Turn({ agent, label, text }: { agent: boolean; label: string | null; text: string }) {
  return (
    <>
      {label && <Who $agent={agent}>{label}</Who>}
      <Bubble $agent={agent} $first={!!label}>{text}</Bubble>
    </>
  );
}
