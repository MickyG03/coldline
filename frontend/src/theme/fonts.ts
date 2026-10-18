// Font family, size, line height and weight. Families load from Google Fonts in index.html.
export const fonts = {
  family: {
    base: `"Inter", system-ui, -apple-system, "Segoe UI", sans-serif`,
    mono: `"JetBrains Mono", ui-monospace, monospace`,
  },
  size: {
    xxs: "10px",
    xs: "12px",
    sm: "14px",
    md: "16px",
    lg: "20px",
    xl: "24px",
    xxl: "32px",
    display: "56px",
    numeral: "48px",
  },
  lineHeight: {
    tight: 1.15,
    normal: 1.5,
    relaxed: 1.7,
  },
  weight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  tracking: {
    tight: "-0.03em",
    overline: "0.18em",
  },
} as const;
