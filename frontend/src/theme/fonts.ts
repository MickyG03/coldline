// Font family, size, line height and weight.
export const fonts = {
  family: {
    base: `"Inter", system-ui, -apple-system, "Segoe UI", sans-serif`,
    mono: `"JetBrains Mono", ui-monospace, monospace`,
  },
  size: {
    xs: "12px",
    sm: "14px",
    md: "16px",
    lg: "20px",
    xl: "24px",
    xxl: "32px",
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;
