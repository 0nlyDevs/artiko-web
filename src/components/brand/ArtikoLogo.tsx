// The ARTIKO wordmark: rounded "artik" letters with a coral dot on the i and a
// six-petal flower for the o. Source files live in public/brand.

const PETALS = [0, 60, 120, 180, 240, 300];

type LogoProps = {
  height?: number;
  // "ink" for light backgrounds, "light" for dark ones.
  tone?: "ink" | "light";
  className?: string;
};

export function ArtikoLogo({ height = 28, tone = "ink", className }: LogoProps) {
  const stroke = tone === "ink" ? "#2A1C1A" : "#FBF0E4";
  return (
    <svg viewBox="-6 -8 600 156" height={height} width={(height * 600) / 156} className={className} aria-hidden="true">
      <g fill="none" stroke={stroke} strokeWidth="20" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="60" cy="80" r="36" />
        <path d="M96 44 V116" />
        <path d="M150 44 V116 M150 84 C150 58 170 48 196 52" />
        <path d="M248 20 V96 C248 112 258 118 276 116 M226 52 H278" />
        <path d="M316 44 V116" />
        <path d="M368 12 V116 M426 46 L368 88 M394 72 L430 116" />
      </g>
      <circle cx="316" cy="18" r="12" fill="#C8553D" />
      <ArtikoFlower cx={508} cy={80} size={52} />
    </svg>
  );
}

// The flower alone, as used for the app icon. size is the petal length.
export function ArtikoFlower({ cx, cy, size }: { cx: number; cy: number; size: number }) {
  return (
    <g className="artiko-flower" style={{ transformOrigin: `${cx}px ${cy}px` }}>
      <g fill="#C8553D">
        {PETALS.map((angle) => (
          <ellipse key={angle} cx={cx} cy={cy - size / 2} rx={size * 0.26} ry={size / 2} transform={`rotate(${angle} ${cx} ${cy})`} />
        ))}
      </g>
      <circle cx={cx} cy={cy} r={size * 0.2} fill="#FBF0E4" />
    </g>
  );
}
