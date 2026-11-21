// Hand-drawn wall doodles, drawn as inline SVG so they stay sharp at any zoom.

const ink = {
  fill: "none",
  stroke: "#111",
  strokeWidth: 3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  // Lets CSS draw every stroke on with stroke-dashoffset from 1 to 0.
  pathLength: 1,
};

const salt = { fontFamily: "var(--font-salt), cursive", fill: "#111" };

// Longer words in other languages shrink to the width the English label was drawn for.
const fit = (size: number, label: string, chars: number) => size * Math.min(1, chars / label.length);

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
      <text x={icon ? 88 : 72} y="48" textAnchor="middle" fontSize={fit(icon ? 11.5 : 14, label, icon ? 11 : 9)} transform="rotate(4 75 45)" style={salt}>
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
      <text x="50" y="36" textAnchor="middle" fontSize={fit(16, label, 7)} style={salt}>
        {label}
      </text>
    </svg>
  );
}

// Small illustrations for the features wall, one per feature. Parts with a
// class name are animated by globals.css once the wall is in view.
export function FeatureIcon({ name, width = 120 }: { name: string; width?: number }) {
  switch (name) {
    case "scan":
      return (
        <svg viewBox="0 0 120 120" width={width} aria-hidden="true" className="fi fi-scan">
          <rect x="34" y="8" width="52" height="96" rx="9" {...ink} />
          <path d="M54 16 H66" {...ink} strokeWidth={2} />
          <rect x="42" y="26" width="36" height="52" rx="2" {...ink} strokeWidth={2} />
          <path d="M46 70 L56 56 L62 63 L68 54 L76 70" {...ink} strokeWidth={2} />
          <circle cx="52" cy="38" r="4" {...ink} strokeWidth={2} />
          <path className="fi-beam" d="M38 46 H82" stroke="#e5574a" strokeWidth={3} strokeLinecap="round" />
          <path d="M8 30 V18 C8 14 10 12 14 12 H24 M112 30 V18 C112 14 110 12 106 12 H96 M8 82 V94 C8 98 10 100 14 100 H24 M112 82 V94 C112 98 110 100 106 100 H96" {...ink} />
        </svg>
      );
    case "museum":
      return (
        <svg viewBox="0 0 120 120" width={width} aria-hidden="true" className="fi fi-museum">
          <path d="M14 106 V52 C14 26 34 10 60 10 C86 10 106 26 106 52 V106 Z" {...ink} />
          <path d="M44 106 V72 C44 62 52 56 60 56 C68 56 76 62 76 72 V106" {...ink} />
          <path className="fi-door" d="M47 106 V73 C47 65 53 60 60 60 C67 60 73 65 73 73 V106 Z" fill="#e5574a" />
          <path d="M4 106 H116" {...ink} />
          <path d="M60 24 L64 34 L74 34 L66 40 L69 50 L60 44 L51 50 L54 40 L46 34 L56 34 Z" {...ink} strokeWidth={2} />
        </svg>
      );
    case "vote":
      return (
        <svg viewBox="0 0 120 120" width={width} aria-hidden="true" className="fi fi-vote">
          <path d="M18 60 H102 L96 110 H24 Z" {...ink} />
          <path d="M40 60 H80" stroke="#111" strokeWidth={6} strokeLinecap="round" />
          <g className="fi-ballot">
            <rect x="44" y="14" width="32" height="40" rx="2" {...ink} fill="#fff" />
            <path d="M51 34 L58 41 L70 26" stroke="#e5574a" strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <text x="60" y="94" textAnchor="middle" fontSize="18" style={salt}>
            +1
          </text>
        </svg>
      );
    case "fame":
      return (
        <svg viewBox="0 0 120 120" width={width} aria-hidden="true" className="fi fi-fame">
          <path d="M8 110 V78 H40 V110 M40 110 V54 H80 V110 M80 110 V88 H112 V110 Z" {...ink} />
          <text x="60" y="88" textAnchor="middle" fontSize="20" style={salt}>
            1
          </text>
          <text x="24" y="100" textAnchor="middle" fontSize="15" style={salt}>
            2
          </text>
          <text x="96" y="104" textAnchor="middle" fontSize="13" style={salt}>
            3
          </text>
          <g className="fi-crown">
            <path d="M44 44 L40 18 L52 30 L60 10 L68 30 L80 18 L76 44 Z" fill="#e5574a" stroke="#111" strokeWidth={2.5} strokeLinejoin="round" />
          </g>
        </svg>
      );
    case "learn":
      return (
        <svg viewBox="0 0 120 120" width={width} aria-hidden="true" className="fi fi-learn">
          <path d="M30 112 C22 92 18 76 24 62 C28 54 36 56 38 64 L40 70 V24 C40 16 52 16 52 24 V56 V18 C52 10 64 10 64 18 V56 V22 C64 14 76 14 76 22 V58 V32 C76 24 88 24 88 32 V76 C88 96 80 104 76 112" {...ink} />
          <path className="fi-trail" d="M8 30 C20 10 38 6 50 4 M94 8 C106 14 112 26 112 40" stroke="#e5574a" strokeWidth={3} strokeDasharray="2 7" fill="none" strokeLinecap="round" />
          <circle className="fi-dot" cx="112" cy="40" r="5" fill="#e5574a" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 120 120" width={width} aria-hidden="true" className="fi fi-protect">
          <path d="M60 6 L104 22 V56 C104 84 86 102 60 114 C34 102 16 84 16 56 V22 Z" {...ink} />
          <path d="M60 18 L92 30 V56 C92 76 80 90 60 100 Z" fill="#111" />
          <path className="fi-check" d="M38 58 L54 74 L84 40" stroke="#e5574a" strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
        </svg>
      );
  }
}
