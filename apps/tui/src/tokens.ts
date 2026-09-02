export const color = {
  // Single accent, named by gradient stop (Omarchy colors.toml model).
  // Dark→bright: lo → mid → hi is the in-family teal→green direction.
  accent: {
    hi: "#72CFAA",
    mid: "#3EB489",
    lo: "#2A7D60",
  },
  bg: {
    base: "#191817",
    surface: "#222120",
    elevated: "#2C2B29",
    overlay: "#333230",
    border: "#3A3936",
  },
  text: {
    bright: "#FFFFFF",
    default: "#F0F0F0",
    muted: "#A0A0A0",
    dim: "#505050",
  },
  status: {
    success: "#3EB489",
    error: "#E05C6A",
    warning: "#D4A84B",
    info: "#5B9BD5",
  }
} as const

export const space = {
  1: 1,
  2: 1,
  3: 1,
  4: 2,
  5: 2,
  6: 2,
  8: 2,
  10: 3,
  12: 4,
} as const

export const layout = {
  sidebar: { width: 22 },
  statusbar: { height: 2 }
} as const
