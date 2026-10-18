import { createGlobalStyle, keyframes } from "styled-components";
import { border } from "./border.ts";
import { fonts } from "./fonts.ts";
import { icons } from "./icons.ts";
import { palette } from "./palette.ts";
import { sizes } from "./sizes.ts";

// coldline-light: the botanical light theme.
export const coldlineLight = { palette, fonts, sizes, border, icons } as const;

export type Theme = typeof coldlineLight;
export type StatusKey = "unknown" | "calling" | "confirmed" | "conditional" | "unavailable" | "contradictory" | "incomplete";

/** Status -> theme color (incomplete reads as "needs confirmation": muted ochre). */
export const statusColor = (theme: Theme, status: StatusKey) => ({
  unknown: theme.palette.statusUnknown,
  calling: theme.palette.statusCalling,
  confirmed: theme.palette.statusConfirmed,
  conditional: theme.palette.statusConditional,
  unavailable: theme.palette.statusUnavailable,
  contradictory: theme.palette.statusContradictory,
  incomplete: theme.palette.statusConditional,
}[status]);

export const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 currentColor; opacity: 1; }
  70% { box-shadow: 0 0 0 8px transparent; opacity: 0.7; }
  100% { box-shadow: 0 0 0 0 transparent; opacity: 1; }
`;

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { min-height: 100%; margin: 0; }
  body {
    background: ${({ theme }) => theme.palette.background};
    color: ${({ theme }) => theme.palette.textPrimary};
    font-family: ${({ theme }) => theme.fonts.family.base};
    font-size: ${({ theme }) => theme.fonts.size.md};
    line-height: ${({ theme }) => theme.fonts.lineHeight.normal};
    -webkit-font-smoothing: antialiased;
  }
  button, input, select { font: inherit; color: inherit; }
`;
