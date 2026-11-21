// Stroke icons drawn on a 24 px grid; decorative unless given a title by the caller's label.
import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 24, children, strokeWidth = 1.8, ...rest }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: Props) => <Icon {...p}><path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" /></Icon>;
export const IconExplore = (p: Props) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></Icon>;
export const IconTrophy = (p: Props) => <Icon {...p}><path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a3 3 0 0 0 4 3M16 6h4v1a3 3 0 0 1-4 3M12 13v4M8 21h8M9 17h6" /></Icon>;
export const IconSprout = (p: Props) => <Icon {...p}><path d="M12 21V11M12 11c0-4 3-7 8-7 0 5-3 7-8 7zM12 14c0-3-2-5-7-5 0 4 2 5 7 5z" /></Icon>;
export const IconScan = (p: Props) => <Icon {...p}><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><circle cx="12" cy="12" r="3.5" /></Icon>;
export const IconPlus = (p: Props) => <Icon {...p}><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><path d="M12 8v8M8 12h8" /></Icon>;
export const IconAdd = (p: Props) => <Icon {...p}><path d="M12 6v12M6 12h12" /></Icon>;
export const IconHeart = (p: Props) => <Icon {...p}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></Icon>;
export const IconSeal = (p: Props) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></Icon>;
export const IconCheck = (p: Props) => <Icon {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>;
export const IconSearch = (p: Props) => <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Icon>;
export const IconCalendar = (p: Props) => <Icon {...p}><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></Icon>;
export const IconLeft = (p: Props) => <Icon {...p}><path d="m15 6-6 6 6 6" /></Icon>;
export const IconRight = (p: Props) => <Icon {...p}><path d="m9 6 6 6-6 6" /></Icon>;
export const IconClose = (p: Props) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>;
export const IconBack = (p: Props) => <Icon {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></Icon>;
export const IconForward = (p: Props) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Icon>;
export const IconEye = (p: Props) => <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Icon>;
export const IconPin = (p: Props) => <Icon {...p}><path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z" /><circle cx="12" cy="10" r="2.2" /></Icon>;
export const IconMuseum = (p: Props) => <Icon {...p}><path d="M3 9 12 4l9 5v11H3zM8 20v-6h8v6" /></Icon>;
export const IconUpload = (p: Props) => <Icon {...p}><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></Icon>;
export const IconCamera = (p: Props) => <Icon {...p}><path d="M4 7h3l2-3h6l2 3h3v13H4z" /><circle cx="12" cy="13" r="3.5" /></Icon>;
export const IconMail = (p: Props) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></Icon>;
export const IconShare = (p: Props) => <Icon {...p}><path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></Icon>;

/** The heart filled, for a vote already cast. */
export function HeartFilled({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" focusable="false" className={className}>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </svg>
  );
}
