import { useEffect, useState } from "react";
import styled, { css, keyframes } from "styled-components";

// Audio-style bars for live calls. "speaking" animates tall, staggered bars; "listening" breathes
// gently; "idle" rests flat. Respects prefers-reduced-motion.

export type WaveState = "speaking" | "listening" | "idle";

const bounce = keyframes`
  0%, 100% { transform: scaleY(0.25); }
  50% { transform: scaleY(1); }
`;

const breathe = keyframes`
  0%, 100% { transform: scaleY(0.18); }
  50% { transform: scaleY(0.38); }
`;

// Per-bar timing so the wave never looks like a metronome.
const BARS = [
  { d: 0.9, delay: -0.2 }, { d: 0.7, delay: -0.5 }, { d: 1.1, delay: -0.1 }, { d: 0.8, delay: -0.7 },
  { d: 0.6, delay: -0.3 }, { d: 1.0, delay: -0.6 }, { d: 0.75, delay: -0.4 }, { d: 0.95, delay: -0.8 },
  { d: 0.65, delay: -0.15 }, { d: 0.85, delay: -0.55 }, { d: 1.05, delay: -0.35 }, { d: 0.7, delay: -0.65 },
];

const Wrap = styled.span<{ $height: number }>`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: ${({ $height }) => $height}px;
`;

const Bar = styled.span<{ $state: WaveState; $tone: "agent" | "caller"; $d: number; $delay: number }>`
  display: block;
  width: 3px;
  height: 100%;
  border-radius: ${({ theme }) => theme.border.radius.pill};
  background: ${({ theme, $tone, $state }) =>
    $state === "idle" ? theme.palette.borderStrong : $tone === "agent" ? theme.palette.primary : theme.palette.statusCalling};
  transform: scaleY(0.18);
  transform-origin: center;
  transition: background 0.3s ease;
  ${({ $state, $d, $delay }) => $state === "speaking" && css`
    animation: ${bounce} ${$d}s ease-in-out ${$delay}s infinite;
  `}
  ${({ $state, $d, $delay }) => $state === "listening" && css`
    animation: ${breathe} ${$d * 2.2}s ease-in-out ${$delay}s infinite;
  `}
  @media (prefers-reduced-motion: reduce) {
    animation: none;
    transform: scaleY(${({ $state }) => ($state === "speaking" ? 0.7 : 0.25)});
  }
`;

export function Waveform({ state, tone = "agent", bars = 12, height = 22 }: {
  state: WaveState;
  tone?: "agent" | "caller";
  bars?: number;
  height?: number;
}) {
  return (
    <Wrap $height={height} aria-hidden>
      {BARS.slice(0, bars).map((b, i) => (
        <Bar key={i} $state={state} $tone={tone} $d={b.d} $delay={b.delay} />
      ))}
    </Wrap>
  );
}

/**
 * Wave state for a live transcript: "speaking" for a few seconds after each new turn arrives
 * (tinted by who spoke), then "listening" while the call is live, "idle" once it is over.
 * Keyed on arrival (line count), not server timestamps, so a shifted demo clock doesn't matter.
 */
export function useSpeakingWave(lineCount: number, lastSpeaker: "agent" | "caller" | null, live: boolean, holdMs = 2800) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!live || !lineCount) return;
    setSpeaking(true);
    const id = window.setTimeout(() => setSpeaking(false), holdMs);
    return () => window.clearTimeout(id);
  }, [lineCount, live, holdMs]);

  const state: WaveState = !live ? "idle" : speaking ? "speaking" : "listening";
  return { state, tone: lastSpeaker ?? "agent" } as const;
}
