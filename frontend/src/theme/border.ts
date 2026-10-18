// Border radius, stroke widths and shadows.
export const border = {
  radius: {
    none: "0",
    sm: "4px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    xxl: "20px",
    pill: "999px",
  },
  stroke: {
    thin: "1px",
    medium: "1.5px",
    thick: "2px",
  },
  shadow: {
    soft: "0 1px 2px rgba(30, 42, 31, 0.04), 0 4px 16px rgba(30, 42, 31, 0.05)",
    marker: "0 2px 8px rgba(30, 42, 31, 0.12)",
  },
} as const;
