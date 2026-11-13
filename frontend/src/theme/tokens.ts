/**
 * The one source of colours, radii and breakpoints for MUI and Tailwind. Colours are OKLCH
 * (perceptually even steps; MUI reads them natively — `nativeColor` in theme/index.ts).
 */
export const TOKENS = {
  breakpoints: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
  /** Controls (inputs, chips) · menus and popovers · cards and dialogs. Buttons are pills. */
  radius: { sm: 10, md: 14, lg: 18 },
  layout: { sidebarWidth: 240, railWidth: 80, topBarHeight: 64 },
  /** Max content widths (Tailwind `max-w-*`). `page` = every signed-in page (set once in AppLayout). */
  containers: { page: 1536 },
  colors: {
    /**
     * "Hearth" (project decision, 2026-11-13): a warm cream ground, a forest-green primary, amber
     * as the second accent, warm hairlines — a home, not an office. Dark mode is the same
     * family on a deep green-black ground.
     */
    light: {
      primary: {
        main: 'oklch(43.8% 0.074 167.8)',
        light: 'oklch(72.0% 0.080 165.0)',
        dark: 'oklch(36.3% 0.062 165.5)',
        contrastText: 'oklch(99.4% 0.006 84.6)',
      },
      secondary: {
        main: 'oklch(68.1% 0.130 72.5)',
        light: 'oklch(80.0% 0.100 78.0)',
        dark: 'oklch(56.0% 0.120 70.0)',
        contrastText: 'oklch(27.2% 0.020 163.0)',
      },
      error: {
        main: 'oklch(50.1% 0.178 28.7)',
        light: 'oklch(66.8% 0.155 25.4)',
        dark: 'oklch(42.0% 0.147 28.1)',
        contrastText: 'oklch(100.0% 0.000 0)',
      },
      success: {
        main: 'oklch(47.0% 0.100 160.0)',
        light: 'oklch(94.0% 0.013 159.9)',
        dark: 'oklch(38.0% 0.080 160.0)',
        contrastText: 'oklch(100.0% 0.000 0)',
      },
      background: { default: 'oklch(96.0% 0.012 79.8)', paper: 'oklch(99.4% 0.006 84.6)' },
      text: {
        primary: 'oklch(27.2% 0.020 163.0)',
        secondary: 'oklch(47.0% 0.023 163.9)',
        disabled: 'oklch(63.0% 0.018 150.0)',
      },
      divider: 'oklch(90.1% 0.020 77.3)',
      /** Warm shadows (a touch of umber), so cards sit on the cream like paper, not like glass. */
      shadow: { soft: 'oklch(35% 0.04 70 / 0.07)', strong: 'oklch(35% 0.05 70 / 0.22)' },
      badge: {
        activeBackground: 'oklch(94.0% 0.013 159.9)',
        activeText: 'oklch(40.0% 0.070 167.0)',
        neutralBackground: 'oklch(93.3% 0.017 79.3)',
        neutralText: 'oklch(47.0% 0.023 163.9)',
      },
      /**
       * Status badges (`StatusBadge`): a soft fill, a dot and the word — the text ≥ 6:1 on its
       * fill. Success = done / active, warning = waiting, info = planned, danger = refused,
       * neutral = ended.
       */
      status: {
        successBackground: 'oklch(94.0% 0.030 160)',
        successText: 'oklch(40.0% 0.085 162)',
        successDot: 'oklch(60.0% 0.140 160)',
        warningBackground: 'oklch(95.5% 0.045 85)',
        warningText: 'oklch(45.0% 0.100 62)',
        warningDot: 'oklch(72.0% 0.150 68)',
        infoBackground: 'oklch(95.0% 0.025 225)',
        infoText: 'oklch(43.0% 0.075 225)',
        infoDot: 'oklch(60.0% 0.110 225)',
        dangerBackground: 'oklch(95.0% 0.028 25)',
        dangerText: 'oklch(46.0% 0.160 27)',
        dangerDot: 'oklch(62.0% 0.190 27)',
        neutralBackground: 'oklch(93.3% 0.017 79.3)',
        neutralText: 'oklch(45.0% 0.020 120)',
        neutralDot: 'oklch(70.0% 0.020 95)',
      },
      /** Forest, amber, clay, olive, teal, plum, slate, moss — cream initials ≥ 5:1 on each. */
      avatar: {
        c1: 'oklch(43.8% 0.074 167.8)',
        c2: 'oklch(52.0% 0.120 65.0)',
        c3: 'oklch(50.0% 0.120 35.0)',
        c4: 'oklch(48.0% 0.090 120.0)',
        c5: 'oklch(48.0% 0.080 200.0)',
        c6: 'oklch(45.0% 0.110 330.0)',
        c7: 'oklch(45.0% 0.040 250.0)',
        c8: 'oklch(42.0% 0.070 150.0)',
        text: 'oklch(99.4% 0.006 84.6)',
      },
      /**
       * Chart series in fixed order — validated categorical palette (CVD ΔE ≥ 8 between neighbours);
       * slots 3–5 sit under 3:1 on white, so charts carry labels, a legend and a table view.
       */
      chart: {
        c1: 'oklch(57.5% 0.163 255.5)',
        c2: 'oklch(67.1% 0.175 40.6)',
        c3: 'oklch(66.9% 0.141 162.1)',
        c4: 'oklch(76.4% 0.161 75.1)',
        c5: 'oklch(71.6% 0.141 357.4)',
        c6: 'oklch(52.9% 0.180 142.5)',
        c7: 'oklch(43.3% 0.167 283.6)',
        c8: 'oklch(62.3% 0.191 24.9)',
      },
      /** The sidebar sits on the same cream as the page; the active item is a solid forest pill. */
      sidebar: {
        background: 'oklch(96.0% 0.012 79.8)',
        text: 'oklch(27.2% 0.020 163.0)',
        hover: 'oklch(93.3% 0.017 79.3)',
        active: 'oklch(43.8% 0.074 167.8)',
        activeText: 'oklch(99.4% 0.006 84.6)',
        indicator: 'oklch(43.8% 0.074 167.8)',
        border: 'oklch(90.1% 0.020 77.3)',
        title: 'oklch(27.2% 0.020 163.0)',
      },
      /** The site footer: a deep forest band, the same in both schemes (it is dark by design). */
      footer: {
        background: 'oklch(23.0% 0.030 165.0)',
        text: 'oklch(97.0% 0.010 84.0)',
        muted: 'oklch(78.0% 0.020 150.0)',
        line: 'oklch(32.0% 0.030 165.0)',
        tile: 'oklch(29.0% 0.030 165.0)',
        accent: 'oklch(86.0% 0.065 164.0)',
      },
    },
    dark: {
      primary: {
        main: 'oklch(78.0% 0.090 165.0)',
        light: 'oklch(86.0% 0.065 164.0)',
        dark: 'oklch(68.0% 0.095 166.0)',
        contrastText: 'oklch(21.0% 0.014 160.0)',
      },
      secondary: {
        main: 'oklch(80.0% 0.110 76.0)',
        light: 'oklch(88.0% 0.080 80.0)',
        dark: 'oklch(70.0% 0.120 72.0)',
        contrastText: 'oklch(21.0% 0.014 160.0)',
      },
      error: {
        main: 'oklch(83.4% 0.068 22.0)',
        light: 'oklch(92.2% 0.030 22.8)',
        dark: 'oklch(66.8% 0.155 25.4)',
        contrastText: 'oklch(23.4% 0.078 27.6)',
      },
      success: {
        main: 'oklch(80.7% 0.097 156.1)',
        light: 'oklch(31.6% 0.054 157.5)',
        dark: 'oklch(70.1% 0.109 157.0)',
        contrastText: 'oklch(23.6% 0.041 156.6)',
      },
      background: { default: 'oklch(21.0% 0.014 160.0)', paper: 'oklch(25.5% 0.016 160.0)' },
      text: {
        primary: 'oklch(95.0% 0.012 82.0)',
        secondary: 'oklch(78.0% 0.016 100.0)',
        disabled: 'oklch(62.0% 0.016 120.0)',
      },
      divider: 'oklch(34.0% 0.020 160.0)',
      shadow: { soft: 'oklch(0% 0 0 / 0.3)', strong: 'oklch(0% 0 0 / 0.5)' },
      badge: {
        activeBackground: 'oklch(32.0% 0.040 165.0)',
        activeText: 'oklch(88.0% 0.080 165.0)',
        neutralBackground: 'oklch(30.0% 0.016 140.0)',
        neutralText: 'oklch(80.0% 0.016 100.0)',
      },
      status: {
        successBackground: 'oklch(32% 0.05 157)',
        successText: 'oklch(86% 0.09 156)',
        successDot: 'oklch(75% 0.13 156)',
        warningBackground: 'oklch(33% 0.05 70)',
        warningText: 'oklch(88% 0.1 82)',
        warningDot: 'oklch(80% 0.14 75)',
        infoBackground: 'oklch(33% 0.045 225)',
        infoText: 'oklch(87% 0.06 220)',
        infoDot: 'oklch(74% 0.1 225)',
        dangerBackground: 'oklch(32% 0.06 25)',
        dangerText: 'oklch(86% 0.07 22)',
        dangerDot: 'oklch(72% 0.15 25)',
        neutralBackground: 'oklch(30% 0.016 140)',
        neutralText: 'oklch(82% 0.016 100)',
        neutralDot: 'oklch(65% 0.02 100)',
      },
      avatar: {
        c1: 'oklch(43.8% 0.074 167.8)',
        c2: 'oklch(52.0% 0.120 65.0)',
        c3: 'oklch(50.0% 0.120 35.0)',
        c4: 'oklch(48.0% 0.090 120.0)',
        c5: 'oklch(48.0% 0.080 200.0)',
        c6: 'oklch(45.0% 0.110 330.0)',
        c7: 'oklch(45.0% 0.040 250.0)',
        c8: 'oklch(42.0% 0.070 150.0)',
        text: 'oklch(99.4% 0.006 84.6)',
      },
      chart: {
        c1: 'oklch(62.2% 0.161 255.1)',
        c2: 'oklch(62.2% 0.173 40.1)',
        c3: 'oklch(62.1% 0.128 163.1)',
        c4: 'oklch(67.0% 0.143 73.2)',
        c5: 'oklch(62.2% 0.171 0.8)',
        c6: 'oklch(52.9% 0.180 142.5)',
        c7: 'oklch(67.0% 0.145 286.8)',
        c8: 'oklch(66.9% 0.159 22.3)',
      },
      sidebar: {
        background: 'oklch(21.0% 0.014 160.0)',
        text: 'oklch(78.0% 0.016 100.0)',
        hover: 'oklch(27.0% 0.018 160.0)',
        active: 'oklch(78.0% 0.090 165.0)',
        activeText: 'oklch(21.0% 0.014 160.0)',
        indicator: 'oklch(78.0% 0.090 165.0)',
        border: 'oklch(30.0% 0.018 160.0)',
        title: 'oklch(95.0% 0.012 82.0)',
      },
      footer: {
        background: 'oklch(17.0% 0.022 160.0)',
        text: 'oklch(97.0% 0.010 84.0)',
        muted: 'oklch(76.0% 0.020 150.0)',
        line: 'oklch(27.0% 0.025 162.0)',
        tile: 'oklch(23.0% 0.025 162.0)',
        accent: 'oklch(86.0% 0.065 164.0)',
      },
    },
  },
} as const;

export type ColorScheme = keyof typeof TOKENS.colors;
