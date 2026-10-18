import { createGlobalStyle } from "styled-components";
import { border } from "./border.ts";
import { fonts } from "./fonts.ts";
import { icons } from "./icons.ts";
import { palette } from "./palette.ts";
import { sizes } from "./sizes.ts";

// rook-default: the light theme.
export const rookDefault = { palette, fonts, sizes, border, icons } as const;

export type Theme = typeof rookDefault;

export const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { height: 100%; margin: 0; }
  body {
    background: ${({ theme }) => theme.palette.background};
    color: ${({ theme }) => theme.palette.textPrimary};
    font-family: ${({ theme }) => theme.fonts.family.base};
    font-size: ${({ theme }) => theme.fonts.size.md};
    line-height: ${({ theme }) => theme.fonts.lineHeight.normal};
    -webkit-font-smoothing: antialiased;
  }
`;
