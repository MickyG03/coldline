import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import styled from "styled-components";
import { Icon } from "../../components/Icon.tsx";
import { StatusDot } from "../../components/StatusDot.tsx";
import { Mono, Overline } from "../../components/Text.tsx";
import { useSpeakingWave, Waveform } from "../../components/Waveform.tsx";
import type { LiveCall } from "../../provider/liveCalls.ts";

// Live calls as a notification stack in the lower right. Collapsed, the newest call sits in front
// and older ones peek out behind it; click to fan the stack out (and again, or Collapse, to fold it).

const CARD_H = 116;
const GAP = 10;
const PEEK = 10;
const spring = { type: "spring", stiffness: 420, damping: 34 } as const;

const Dock = styled.div`
  position: fixed;
  right: ${({ theme }) => theme.sizes.space.xl};
  bottom: ${({ theme }) => theme.sizes.space.xl};
  z-index: 50;
  width: 368px;
  height: ${CARD_H}px;
  pointer-events: none;
`;

const Header = styled(motion.div)<{ $bottom: number }>`
  position: absolute;
  bottom: ${({ $bottom }) => $bottom}px;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `0 ${theme.sizes.space.xs}`};
`;

const Collapse = styled.button`
  pointer-events: auto;
  border: ${({ theme }) => theme.border.stroke.thin} solid ${({ theme }) => theme.palette.border};
  border-radius: ${({ theme }) => theme.border.radius.pill};
  background: ${({ theme }) => theme.palette.surface};
  padding: ${({ theme }) => `${theme.sizes.space.xs} ${theme.sizes.space.md}`};
  font-size: ${({ theme }) => theme.fonts.size.xs};
  color: ${({ theme }) => theme.palette.textSecondary};
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.border.shadow.soft};
  &:hover { color: ${({ theme }) => theme.palette.textPrimary}; }
`;

const Card = styled(motion.div)<{ $ended: boolean; $z: number }>`
  position: absolute;
  z-index: ${({ $z }) => $z};
  left: 0;
  right: 0;
  bottom: 0;
  height: ${CARD_H}px;
  display: grid;
  grid-template-rows: auto auto 1fr;
  gap: ${({ theme }) => theme.sizes.space.sm};
  padding: ${({ theme }) => `${theme.sizes.space.md} ${theme.sizes.space.lg}`};
  border-radius: ${({ theme }) => theme.border.radius.xl};
  border: ${({ theme }) => theme.border.stroke.thin} solid
    ${({ theme, $ended }) => ($ended ? theme.palette.border : theme.palette.primarySoft)};
  background: ${({ theme }) => theme.palette.surface};
  box-shadow: 0 1px 2px rgba(30, 42, 31, 0.06), 0 10px 30px rgba(30, 42, 31, 0.12);
  transform-origin: 50% 100%;
  cursor: pointer;
  pointer-events: auto;
  overflow: hidden;
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.sizes.space.sm};
  min-width: 0;
  color: ${({ theme }) => theme.palette.textMuted};
`;

const Name = styled.div`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: ${({ theme }) => theme.fonts.size.sm};
  font-weight: ${({ theme }) => theme.fonts.weight.medium};
  color: ${({ theme }) => theme.palette.textPrimary};
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.sizes.space.md};
`;

const Speaking = styled(Mono)`
  flex: 1;
  font-size: ${({ theme }) => theme.fonts.size.xs};
  color: ${({ theme }) => theme.palette.textMuted};
`;

const LastLine = styled.div`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: ${({ theme }) => theme.fonts.size.xs};
  line-height: ${({ theme }) => theme.fonts.lineHeight.normal};
  color: ${({ theme }) => theme.palette.textSecondary};
  & b { font-weight: ${({ theme }) => theme.fonts.weight.medium}; color: ${({ theme }) => theme.palette.primary}; }
`;

const elapsed = (from: string, to: number) => {
  const s = Math.max(0, Math.floor((to - new Date(from).getTime()) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

function CallCard({ call, index, count, open, now, onToggle }: {
  call: LiveCall; index: number; count: number; open: boolean; now: number; onToggle: () => void;
}) {
  const ended = !!call.endedAt;
  const last = call.lines.at(-1) ?? null;
  const wave = useSpeakingWave(call.lines.length, last?.speaker ?? null, !ended);
  const who = (speaker: "agent" | "caller") => (speaker === "agent" ? "coldline" : call.role);

  const animate = open
    ? { y: -index * (CARD_H + GAP), scale: 1, opacity: 1 }
    : { y: -index * PEEK, scale: 1 - index * 0.05, opacity: index < 3 ? 1 - index * 0.15 : 0 };

  return (
    <Card
      $ended={ended}
      layout
      initial={{ y: 40, scale: 0.92, opacity: 0 }}
      animate={animate}
      exit={{ x: 80, opacity: 0, transition: { duration: 0.25 } }}
      transition={spring}
      $z={count - index}
      onClick={onToggle}
      title={open ? "Click to collapse" : count > 1 ? "Click to expand" : undefined}
    >
      <Top>
        <StatusDot $status={ended ? "unknown" : "calling"} $size={8} />
        <Icon name={ended ? "check" : "phone"} size="sm" />
        <Name>{call.label}</Name>
        <Mono>{elapsed(call.startedAt, call.endedAt ? new Date(call.endedAt).getTime() : now)}</Mono>
      </Top>
      <Meta>
        <Waveform state={wave.state} tone={wave.tone} bars={10} height={16} />
        <Speaking>
          {ended ? "call ended" : wave.state === "speaking" ? `${who(wave.tone)} speaking` : "listening…"}
        </Speaking>
        <Overline>{call.role}</Overline>
      </Meta>
      <LastLine>
        {last ? <><b>{who(last.speaker)}</b> {last.text}</> : "Connected. Waiting for the first words…"}
      </LastLine>
    </Card>
  );
}

export function LiveCallBanner({ calls }: { calls: LiveCall[] }) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const active = calls.some((c) => !c.endedAt);
  const stack = [...calls].reverse(); // newest in front

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  useEffect(() => {
    if (calls.length < 2) setOpen(false);
  }, [calls.length]);

  return (
    <Dock aria-live="polite">
      <AnimatePresence>
        {open && (
          <Header
            key="header"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={spring}
            $bottom={stack.length * (CARD_H + GAP)}
          >
            <Overline>Live calls · {stack.length}</Overline>
            <Collapse onClick={() => setOpen(false)}>Collapse</Collapse>
          </Header>
        )}
        {stack.map((c, i) => (
          <CallCard key={c.callId} call={c} index={i} count={stack.length} open={open} now={now}
            onToggle={() => stack.length > 1 && setOpen((o) => !o)} />
        ))}
      </AnimatePresence>
    </Dock>
  );
}
