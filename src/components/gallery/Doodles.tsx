// Hand-drawn wall doodles, drawn as inline SVG so they stay sharp at any zoom.

const ink = {
  fill: "none",
  stroke: "#111",
  strokeWidth: 3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const salt = { fontFamily: "var(--font-salt), cursive", fill: "#111" };

export function Starburst({ label, width = 128 }: { label: string; width?: number }) {
  const points: string[] = [];
  const spikes = 14;
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const jitter = i % 4 === 0 ? 6 : i % 3 === 0 ? -4 : 0;
    const r = i % 2 === 0 ? 58 + jitter : 38;
    points.push(`${64 + Math.cos(a) * r},${54 + Math.sin(a) * r * 0.86}`);
  }
  return (
    <svg viewBox="0 0 128 108" width={width} aria-hidden="true">
      <polygon points={points.join(" ")} {...ink} />
      <polygon points={points.join(" ")} {...ink} strokeWidth={1.2} transform="translate(3 4)" />
      <text x="64" y="64" textAnchor="middle" fontSize="24" transform="rotate(-8 64 54)" style={salt}>
        {label}
      </text>
    </svg>
  );
}

export function Bubble({ label, width = 150, icon = false }: { label: string; width?: number; icon?: boolean }) {
  return (
    <svg viewBox="0 0 150 110" width={width} aria-hidden="true">
      <path d="M22 12 C60 4 118 6 136 18 C150 30 146 62 130 70 C110 80 80 78 66 78 L54 100 L52 76 C30 76 10 70 6 52 C2 34 6 18 22 12 Z" {...ink} />
      <path d="M26 16 C62 9 116 11 132 22" {...ink} strokeWidth={1.2} />
      {icon && (
        <g {...ink} strokeWidth={2.2}>
          <rect x="18" y="30" width="22" height="20" rx="3" />
          <path d="M18 37 H40 M24 26 V33 M34 26 V33" />
        </g>
      )}
      <text x={icon ? 88 : 72} y="48" textAnchor="middle" fontSize={icon ? 11.5 : 14} transform="rotate(4 75 45)" style={salt}>
        {label}
      </text>
    </svg>
  );
}

export function CurvedArrow({ width = 104 }: { width?: number }) {
  return (
    <svg viewBox="0 0 104 76" width={width} aria-hidden="true">
      <path d="M14 70 C12 40 30 24 62 24 L60 8 L98 32 L62 56 L62 40 C40 40 26 48 14 70 Z" fill="#111" stroke="#111" strokeWidth={2} strokeLinejoin="round" />
      <path d="M4 66 C2 54 6 44 12 36" {...ink} strokeWidth={1.4} />
    </svg>
  );
}

export function HatchedArrow({ width = 120, flip = false }: { width?: number; flip?: boolean }) {
  return (
    <svg viewBox="0 0 120 72" width={width} aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M6 10 C40 14 66 30 86 44 L92 30 L114 64 L76 66 L84 54 C64 42 38 30 4 24 Z" {...ink} />
      {[16, 28, 40, 52, 64, 76].map((x) => (
        <path key={x} d={`M${x} ${14 + x * 0.18} L${x - 6} ${28 + x * 0.22}`} {...ink} strokeWidth={2} />
      ))}
    </svg>
  );
}

export function Crown({ width = 80 }: { width?: number }) {
  return (
    <svg viewBox="0 0 80 80" width={width} aria-hidden="true">
      <path d="M10 62 L6 22 L26 42 L40 12 L54 42 L74 22 L70 62 C50 70 30 70 10 62 Z" {...ink} />
      <path d="M12 66 C30 74 52 74 68 66" {...ink} strokeWidth={1.4} />
      <circle cx="6" cy="18" r="5" {...ink} />
      <circle cx="40" cy="9" r="5" {...ink} />
      <circle cx="74" cy="18" r="5" {...ink} />
    </svg>
  );
}

export function PaletteBrush({ width = 128 }: { width?: number }) {
  return (
    <svg viewBox="0 0 128 86" width={width} aria-hidden="true">
      <path d="M40 6 C70 4 84 26 72 40 C64 48 74 58 66 70 C56 84 18 84 8 62 C-2 40 10 8 40 6 Z" {...ink} />
      {[
        [26, 24],
        [46, 18],
        [20, 46],
        [34, 64],
      ].map(([x, y]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="7" ry="6" fill="#111" />
      ))}
      <ellipse cx="54" cy="58" rx="6" ry="5" {...ink} />
      <path d="M70 60 L118 22 C124 18 126 24 122 28 L76 66 Z" {...ink} />
      <path d="M62 62 C66 58 72 60 74 64 C72 72 64 76 58 74 C62 70 60 66 62 62 Z" fill="#111" />
    </svg>
  );
}

export function ScrollStar({ width = 70 }: { width?: number }) {
  return (
    <svg viewBox="0 0 70 110" width={width} aria-hidden="true">
      <path d="M14 8 C30 2 52 4 62 10 L50 92 C40 100 20 100 8 94 Z" {...ink} />
      <path d="M8 94 C4 100 10 106 18 104" {...ink} />
      <path d="M14 8 C8 12 10 20 18 18" {...ink} />
      <path d="M36 34 L40 46 L52 46 L42 54 L46 66 L36 58 L26 66 L30 54 L20 46 L32 46 Z" fill="#111" />
      {[24, 72, 80].map((y) => (
        <path key={y} d={`M18 ${y} L50 ${y - 4}`} {...ink} strokeWidth={1.6} />
      ))}
    </svg>
  );
}

export function FrameHands({ width = 220 }: { width?: number }) {
  return (
    <svg viewBox="0 0 220 210" width={width} aria-hidden="true">
      <rect x="56" y="10" width="110" height="140" rx="4" {...ink} transform="rotate(-6 110 80)" />
      <rect x="68" y="24" width="86" height="112" {...ink} strokeWidth={2} transform="rotate(-6 110 80)" />
      <g transform="rotate(-6 110 80)">
        <ellipse cx="111" cy="66" rx="16" ry="20" fill="#111" />
        <path d="M80 136 C84 104 96 94 111 94 C126 94 138 104 142 136 Z" fill="#111" />
        <path d="M104 62 C108 66 114 66 118 62" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" />
      </g>
      <path d="M40 120 C26 132 20 158 34 182 L70 200 L84 168 C70 160 60 146 62 126 Z" fill="#111" />
      <path d="M180 112 C196 126 202 152 190 176 L156 196 L140 166 C154 158 164 144 160 124 Z" fill="#111" />
      <path d="M58 128 L72 120 M164 120 L150 112" {...ink} />
    </svg>
  );
}

export function Bulb({ width = 84 }: { width?: number }) {
  return (
    <svg viewBox="0 0 84 104" width={width} aria-hidden="true">
      <path d="M42 26 C26 26 18 38 18 50 C18 62 28 66 30 78 L54 78 C56 66 66 62 66 50 C66 38 58 26 42 26 Z" {...ink} />
      <path d="M32 84 H52 M33 90 H51 M36 96 H48" {...ink} />
      <path d="M36 78 L38 56 L42 62 L46 56 L48 78" {...ink} strokeWidth={2} />
      {[
        "M42 4 L42 16",
        "M14 12 L22 22",
        "M70 12 L62 22",
        "M2 40 L12 42",
        "M82 40 L72 42",
      ].map((d) => (
        <path key={d} d={d} {...ink} />
      ))}
    </svg>
  );
}

export function PaintBox({ width = 150 }: { width?: number }) {
  const cells = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const filled = (r + c) % 3 === 0 || (r === 1 && c === 3);
      cells.push(
        <rect key={`${r}-${c}`} x={20 + c * 22} y={22 + r * 18} width="18" height="14" rx="2" {...ink} strokeWidth={2} fill={filled ? "#111" : "none"} />,
      );
    }
  }
  return (
    <svg viewBox="0 0 150 110" width={width} aria-hidden="true">
      <path d="M10 14 L112 6 L118 84 L16 92 Z" {...ink} />
      <g transform="rotate(-4 64 50)">{cells}</g>
      <path d="M100 100 L142 34 C146 28 140 26 136 30 L96 94 Z" {...ink} />
      <path d="M92 96 C96 90 102 92 102 98 C98 106 90 106 86 104 C90 102 90 100 92 96 Z" fill="#111" />
      <path d="M6 8 L2 2 M128 8 L134 2 M140 70 L146 74" {...ink} strokeWidth={2} />
    </svg>
  );
}

export function Hello({ width = 100, label = "HELLO" }: { width?: number; label?: string }) {
  return (
    <svg viewBox="0 0 100 72" width={width} aria-hidden="true">
      <path d="M10 6 H90 C96 6 98 10 98 16 V40 C98 46 94 50 88 50 H48 L30 68 L34 50 H12 C6 50 2 46 2 40 V16 C2 10 4 6 10 6 Z" {...ink} />
      <path d="M14 10 H86" {...ink} strokeWidth={1.2} />
      <text x="50" y="36" textAnchor="middle" fontSize="16" style={salt}>
        {label}
      </text>
    </svg>
  );
}
