/**
 * TopoBackdrop — a very faint topographic contour-line backdrop rendered
 * behind the entire app at low opacity. Echoes the alpine / contour-line
 * motif used in dividers and the hero artwork without competing with
 * page content. Lives in App.tsx fixed at -z-10 with opacity ~0.025.
 */
export function TopoBackdrop() {
  return (
    <svg
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      className="block h-full w-full"
      aria-hidden="true"
    >
      <g fill="none" stroke="#286b88" strokeWidth="1">
        <path d="M0 140 C 240 100, 480 180, 720 130 S 1200 90, 1440 150" />
        <path d="M0 220 C 260 180, 520 260, 760 210 S 1220 170, 1440 240" />
        <path d="M0 300 C 220 260, 500 350, 740 290 S 1200 260, 1440 320" />
        <path d="M0 380 C 280 340, 540 430, 780 370 S 1240 340, 1440 410" />
        <path d="M0 460 C 240 420, 520 510, 760 450 S 1220 420, 1440 480" />
        <path d="M0 540 C 260 500, 520 590, 780 530 S 1240 500, 1440 570" />
        <path d="M0 620 C 220 580, 500 670, 740 610 S 1200 580, 1440 650" />
        <path d="M0 700 C 280 660, 540 750, 780 690 S 1240 660, 1440 730" />
        <path d="M0 780 C 240 740, 500 830, 740 770 S 1220 740, 1440 810" />
        <path d="M0 860 C 260 820, 520 910, 760 850 S 1240 820, 1440 880" />
      </g>
    </svg>
  );
}
