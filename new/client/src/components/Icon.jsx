// Clean line icons (gold-friendly) used instead of emoji. Pass the old emoji or a name.
const P = {
  home: 'M3 10.5 12 3l9 7.5M5 9v11h5v-6h4v6h5V9',
  cap: 'M2 9l10-5 10 5-10 5-10-5zM6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6',
  users: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.15a3.5 3.5 0 0 1 0 6.7',
  folder: 'M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z',
  check: 'M4 4h16v16H4zM8 12.5l2.5 2.5L16 9.5',
  pen: 'M14 4h-8.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V10M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z',
  video: 'M3 7.5A1.5 1.5 0 0 1 4.5 6h10A1.5 1.5 0 0 1 16 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 3 16.5zM16 10.5l5-3v9l-5-3',
  chat: 'M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z',
  pin: 'M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  list: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4M12 15v2',
  user: 'M20 21v-1.5a4.5 4.5 0 0 0-4.5-4.5h-7A4.5 4.5 0 0 0 4 19.5V21M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  logout: 'M15 4h3.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H15M10 16l-4-4 4-4M6 12h10',
  bell: 'M18 9a6 6 0 0 0-12 0c0 7-3 8.5-3 8.5h18S18 16 18 9M13.7 21a2 2 0 0 1-3.4 0',
  clip: 'M9 4h6v3H9zM15 5.5h2.5A1.5 1.5 0 0 1 19 7v12.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19.5V7a1.5 1.5 0 0 1 1.5-1.5H9M9 12h6M9 16h4',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z',
  phone: 'M7 2.5h10A1.5 1.5 0 0 1 18.5 4v16a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V4A1.5 1.5 0 0 1 7 2.5zM11 18h2',
  code: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z M9 12l2 2 4-4',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  rocket: 'M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M14 4c3-1 6-1 6-1s0 3-1 6l-7 7-5-5zM9 15l-2-2M15 9a1 1 0 1 0 0-.01',
  alert: 'M12 3l10 18H2zM12 10v5M12 18h.01',
  inbox: 'M3 13l2.5-8h13L21 13v6.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5zM3 13h5l1.5 3h5L16 13h5',
};
const BY_EMOJI = {
  0x1F3E0: 'home', 0x1F393: 'cap', 0x1F465: 'users', 0x1F4C1: 'folder', 0x2705: 'check', 0x1F4DD: 'pen',
  0x1F4F9: 'video', 0x1F4AC: 'chat', 0x1F4CC: 'pin', 0x1F9FE: 'list', 0x1F510: 'lock', 0x1F464: 'user',
  0x21A9: 'logout', 0x1F514: 'bell', 0x1F4CB: 'clip', 0x1F552: 'clock', 0x2B50: 'star', 0x1F4E5: 'inbox', 0x23F3: 'clock', 0x26A0: 'alert',
};

export default function Icon({ e, size = 18 }) {
  const name = P[e] ? e : BY_EMOJI[(Array.from(String(e || ''))[0] || '').codePointAt(0)];
  if (!name) return <>{e}</>;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block' }}>
      <path d={P[name]} />
    </svg>
  );
}