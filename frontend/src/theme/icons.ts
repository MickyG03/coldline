// All icons, as 24x24 stroke paths so they render inline and pick up theme colors.
export const icons = {
  size: {
    sm: "16px",
    md: "20px",
    lg: "24px",
  },
  paths: {
    phone:
      "M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1L6.6 10.8Z",
    pin: "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
    check: "M5 12.5l4.5 4.5L19 7.5",
    close: "M6 6l12 12M18 6 6 18",
    plus: "M12 5v14M5 12h14",
    map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z M9 4v14M15 6v14",
    grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    pulse: "M3 12h4l2-5 4 10 2-5h6",
    sliders: "M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4",
    help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7 M12 17h.01",
    search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z M20 20l-4-4",
    chevronDown: "M6 9l6 6 6-6",
    arrowUpRight: "M7 17 17 7M8 7h9v9",
    box: "M12 3 4 7v10l8 4 8-4V7l-8-4Z M4 7l8 4 8-4M12 11v10",
    snowflake: "M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5",
    clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 7v5l3 2",
    building: "M5 21V5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v16M3 21h18M10 21v-4h4v4M9 8h2M13 8h2M12 10v4M10 12h4",
    bell: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2Z M10 20a2 2 0 0 0 4 0",
    play: "M8 5v14l11-7L8 5Z",
    refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
    shield: "M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6l-7-3Z",
    message: "M4 5h16v11H8l-4 4V5Z",
    van: "M2 7h11v9H2zM13 10h4l3 3v3h-7zM6.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM16.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z M5 11.5h5M7.5 9v5",
  },
} as const;

export type IconName = keyof typeof icons.paths;
