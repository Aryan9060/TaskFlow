// Hand-drawn style icon set, inspired by the Streamline "Freehand" look:
// wobbly strokes, round caps, slightly imperfect geometry. Each entry is the
// inner markup of a 24x24 stroke-based SVG using currentColor.
const ICONS = {
  home: (
    <>
      <path d="M4.5 11.2 12 4.2l7.6 6.8" />
      <path d="M6.5 10v9.5h11V10" />
      <path d="M10 19.5v-5h4.2v5" />
    </>
  ),
  tasks: (
    <>
      <path d="M4.5 6.3h9.5" />
      <path d="M4.7 12h9.3" />
      <path d="M4.6 17.8h9.4" />
      <path d="m16.4 5.3 1.4 1.5 2.6-3" />
      <path d="m16.5 11.2 1.4 1.4 2.5-2.9" />
      <path d="m16.4 17 1.5 1.5 2.5-2.8" />
    </>
  ),
  assignment: (
    <>
      <path d="M6.2 4.5h11.4v15.2H6.2z" />
      <path d="M9.3 4.3a2.8 2.8 0 0 1 5.4 0" />
      <path d="M8.8 9.5h6.4" />
      <path d="M8.8 13h6.3" />
    </>
  ),
  book: (
    <>
      <path d="M4.3 5.2c2.8-1.5 5.6-1.4 7.7.2 2.1-1.6 4.9-1.7 7.7-.2v13.6c-2.8-1.5-5.6-1.4-7.7.2-2.1-1.6-4.9-1.7-7.7-.2z" />
      <path d="M12 5.4v13.4" />
    </>
  ),
  cap: (
    <>
      <path d="m2.5 9.8 9.4-4.6 9.6 4.6-9.6 4.5z" />
      <path d="M6.3 12v4.6c0 1.3 11.4 1.4 11.4 0V12" />
      <path d="M21.5 10v4.8" />
    </>
  ),
  calendar: (
    <>
      <path d="M3.4 5.4h17.2v15.3H3.4z" />
      <path d="M3.2 9.9h17.5" />
      <path d="M8 3v4" />
      <path d="M16 3.2V7" />
    </>
  ),
  clock: (
    <>
      <path d="M12 3.6a8.4 8.5 0 1 0 .1 0z" />
      <path d="M12 7.6V12l3.7 2.3" />
    </>
  ),
  chart: (
    <>
      <path d="M4.2 3.8v16.4h16.3" />
      <path d="M7.6 19.7v-5.4" />
      <path d="M11.9 19.8V9.3" />
      <path d="M16.2 19.7v-7.6" />
    </>
  ),
  user: (
    <>
      <path d="M12 4.4a3.6 3.7 0 1 0 .1 0z" />
      <path d="M5.2 20c.4-3.8 3.2-5.3 6.8-5.3s6.4 1.5 6.8 5.3" />
    </>
  ),
  gear: (
    <>
      <path d="M12 8.7a3.3 3.3 0 1 0 .1 0z" />
      <path d="M12 3.2v2.6" />
      <path d="M12 17.9v2.7" />
      <path d="M3.3 12h2.6" />
      <path d="M18 12h2.7" />
      <path d="m5.9 5.9 1.8 1.8" />
      <path d="m16.3 16.3 1.8 1.8" />
      <path d="m18 5.9-1.8 1.8" />
      <path d="m7.7 16.3-1.8 1.8" />
    </>
  ),
  logout: (
    <>
      <path d="M13.8 4.3H6v15.4h7.8" />
      <path d="M10 12h10.5" />
      <path d="m17.2 8.4 3.6 3.6-3.7 3.6" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  bell: (
    <>
      <path d="M12 3.8c-3.4 0-4.9 2.8-4.9 5.8v3.9l-1.9 2.8H19l-2-2.8V9.6c0-3-1.4-5.8-5-5.8z" />
      <path d="M10.2 19.4a2 2 0 0 0 3.6 0" />
    </>
  ),
  trophy: (
    <>
      <path d="M7.6 4h8.7v5.2a4.3 4.4 0 0 1-8.7 0z" />
      <path d="M7.7 5.3H5v1.8a3 3 0 0 0 2.8 3" />
      <path d="M16.3 5.3H19v1.8a3 3 0 0 1-2.7 3" />
      <path d="M12 13.4v3.2" />
      <path d="M9.2 20h5.6v-3H9.2z" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v9.8" />
      <path d="m7.6 10.2 4.4 4.3 4.4-4.4" />
      <path d="M5 18.4h14" />
    </>
  ),
  edit: (
    <>
      <path d="m4.6 19.2 1-4 9.8-9.7a2.1 2.1 0 0 1 3 3l-9.8 9.8z" />
      <path d="m14 6.6 3 3" />
    </>
  ),
  trash: (
    <>
      <path d="M5 6.8h14" />
      <path d="M9.2 6.6V5a1 1 0 0 1 1-1h3.6a1 1 0 0 1 1 1v1.6" />
      <path d="m6.8 6.9 1 12.7h8.4l1-12.7" />
      <path d="M10.3 10.5v6.6" />
      <path d="M13.7 10.5v6.6" />
    </>
  ),
  archive: (
    <>
      <path d="M4 4.5h16v4.2H4z" />
      <path d="M5.8 8.7v10.6h12.4V8.7" />
      <path d="M10 13.6h4" />
    </>
  ),
  play: <path d="M8 5.4 19 12 8 18.6z" />,
  pause: (
    <>
      <path d="M9 5.2v13.6" />
      <path d="M15 5.2v13.6" />
    </>
  ),
  check: <path d="m4.8 12.6 5 5L19.2 6.4" />,
  alert: (
    <>
      <path d="M12 3.8 21 19.5H3z" />
      <path d="M12 9.8v4" />
      <path d="M12 16.4v.4" />
    </>
  ),
  flame: (
    <>
      <path d="M12 2.8c3 3.8 5.5 5.6 5.5 9.5a5.6 5.7 0 1 1-11.1 0C6.4 8.4 9 6.6 12 2.8z" />
      <path d="M12 9.2c1.2 1.6 2.3 2.3 2.3 3.9a2.4 2.4 0 1 1-4.7 0c0-1.6 1.1-2.3 2.4-3.9z" />
    </>
  ),
  flag: (
    <>
      <path d="M6 20.2V4" />
      <path d="M6 4.8c4-2 8 2.4 12 .4v8c-4 2-8-2.4-12-.4" />
    </>
  ),
  refresh: (
    <>
      <path d="M19.8 8.2a8.4 8.4 0 0 0-14.7-2" />
      <path d="m4.4 3.6.4 4.2 4-.6" />
      <path d="M4.2 15.8a8.4 8.4 0 0 0 14.7 2" />
      <path d="m19.6 20.4-.4-4.2-4 .6" />
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3.4c-4.9 0-8.6 3.5-8.6 7.8 0 3.7 2.9 5.8 5.4 5.8 1.3 0 1.8-.7 1.8-1.5 0-.6-.4-1.1-.4-1.8 0-1 .8-1.7 1.9-1.7h1.3c3 0 5.5-2 5.5-4.4 0-2.5-2.9-4.2-6.9-4.2z" />
      <path d="M7.7 7.7h.01" />
      <path d="M11.2 6.4h.01" />
      <path d="M15 7.5h.01" />
      <path d="M17 10.8h.01" />
    </>
  ),
  chevronLeft: <path d="M14.4 5.1 8 12l6.4 6.9" />,
  chevronRight: <path d="M9.6 5.1 16 12l-6.4 6.9" />,
}

// Renders a hand-drawn stroke icon by name. All icons inherit the parent's
// text color via currentColor.
export default function Icon({ name, size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICONS[name] || ICONS.alert}
    </svg>
  )
}
