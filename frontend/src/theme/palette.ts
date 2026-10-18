// All colors. Components never use raw hex values; they read these through the theme.
export const palette = {
  background: "#F7F8FA",
  surface: "#FFFFFF",
  textPrimary: "#111827",
  textSecondary: "#4B5563",
  textMuted: "#9CA3AF",
  border: "#E5E7EB",
  primary: "#0E7CC2",
  primaryHover: "#0B649D",

  // Facility pin / status colors
  statusUnknown: "#9CA3AF",
  statusCalling: "#0E7CC2",
  statusConfirmed: "#16A34A",
  statusConditional: "#D97706",
  statusUnavailable: "#DC2626",
} as const;
