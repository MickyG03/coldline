// All colors. Components never use raw hex values; they read these through the theme.
// Coldline light: cream paper, sage greens, hairline dividers.
export const palette = {
  background: "#F7F6F0",
  surface: "#FFFFFF",
  surfaceMuted: "#FBFAF5",
  panel: "#F1F3EA",
  textPrimary: "#1E2A1F",
  textSecondary: "#5A6658",
  textMuted: "#99A195",
  border: "#E4E5DA",
  borderStrong: "#D3D7C8",

  primary: "#5E8A4A",
  primaryHover: "#4C7339",
  primarySoft: "#DDEBCB",
  primarySoftHover: "#D0E3B9",
  primaryTint: "#EEF4E4",
  onPrimarySoft: "#2E4625",

  // Facility pin / status colors (muted to sit in the palette)
  statusUnknown: "#B4B9AD",
  statusCalling: "#6E9EA0",
  statusConfirmed: "#6B9A55",
  statusConditional: "#C29A4E",
  statusUnavailable: "#C27A6C",
  statusContradictory: "#B0605A",

  // Map
  mapLand: "#ECEFE3",
  mapPark: "#D9E5CA",
  mapWater: "#C9DDD8",
  mapRoad: "#FFFFFF",
  mapRoadMajor: "#F6F4EC",
  mapLabel: "#8C9587",
  route: "#5E8A4A",
} as const;
