// Icons for the artist pages and the unlock sheet (Seat 2: Discovery mockup).
type P = { size?: number };
const S = (size: number, sw: number, children: React.ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

export const IcLock = ({ size = 16 }: P) => S(size, 2.4, <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>);
export const IcPin = ({ size = 13 }: P) => S(size, 2.4, <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>);
export const IcChat = ({ size = 22 }: P) => S(size, 2, <path d="M4 5h16v11H9l-5 4z" />);
export const IcFull = ({ size = 16 }: P) => S(size, 2.2, <><path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" /><path d="M10 9v6l5-3z" fill="currentColor" /></>);
export const IcPic = ({ size = 16 }: P) => S(size, 2.2, <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></>);
export const IcTalk = ({ size = 16 }: P) => S(size, 2.2, <path d="M4 5h16v11H9l-5 4z" />);
export const IcPaper = ({ size = 16 }: P) => S(size, 2.2, <path d="M5 4h11v16H7a2 2 0 0 1-2-2zM16 8h3v10a2 2 0 0 1-2 2M8 8h5M8 12h5M8 16h3" />);
export const IcSpark = ({ size = 16 }: P) => S(size, 2.2, <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></>);
export const IcCheck = ({ size = 16 }: P) => S(size, 2.6, <path d="M5 12.5l4.5 4.5L19 7.5" />);
export const IcComment = ({ size = 14 }: P) => S(size, 2, <path d="M21 12a8 8 0 0 1-11.8 7L3 21l2-5.6A8 8 0 1 1 21 12z" />);
export const IcCamera = ({ size = 15 }: P) => S(size, 2, <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>);
export const IcSpeaker = ({ size = 15 }: P) => S(size, 2, <path d="M4 10v4h4l5 4V6L8 10zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />);
export const IcTranslate = ({ size = 13 }: P) => S(size, 2.2, <path d="M4 5h9M8.5 3v2M6 5c0 4 3 7 6 8M11 5c0 3-2.5 6.5-6 8M13 21l4-9 4 9M14.5 18h5" />);
