interface EmblemProps {
  size?: number;
  className?: string;
}

/**
 * Original World-Cup-2026-inspired emblem.
 *
 * Design concept: a pointed shield/crest with a diagonal tricolour sweep
 * (Canada red · Mexico green · USA blue) framed by a gold border.
 * Inside sits a bold "26" in cream, with a stylised football pentagon
 * accent above it and a small trophy-cup silhouette below.
 * Pure inline SVG — no external assets, no copyrighted artwork.
 */
export function Emblem({ size = 28, className }: EmblemProps) {
  // The SVG viewport is always 40 × 48 (width × height, shield proportions).
  // We scale via width/height props so every usage stays crisp.
  const w = 40;
  const h = 48;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${w} ${h}`}
      width={size * (w / h)}
      height={size}
      className={className}
      aria-label="Mundial 26 emblem"
      role="img"
    >
      {/* ── Definitions ─────────────────────────────────────────── */}
      <defs>
        {/* Shield clip-path: rounded top corners, sharp pointed bottom */}
        <clipPath id="emblem-shield-clip">
          <path d="M4,0 H36 Q40,0 40,4 V28 Q40,36 20,48 Q0,36 0,28 V4 Q0,0 4,0 Z" />
        </clipPath>

        {/* Diagonal tricolour: three equal slanted bands */}
        <linearGradient id="emblem-tri" x1="0" y1="0" x2="1" y2="0">
          {/* Canada red — left third */}
          <stop offset="0%"   stopColor="#DD352B" />
          <stop offset="33.3%" stopColor="#DD352B" />
          {/* Mexico green — middle third */}
          <stop offset="33.3%" stopColor="#0E8A4A" />
          <stop offset="66.6%" stopColor="#0E8A4A" />
          {/* USA blue — right third */}
          <stop offset="66.6%" stopColor="#2C5BD6" />
          <stop offset="100%" stopColor="#2C5BD6" />
        </linearGradient>
      </defs>

      {/* ── Gold border shield ───────────────────────────────────── */}
      <path
        d="M4,0 H36 Q40,0 40,4 V28 Q40,36 20,48 Q0,36 0,28 V4 Q0,0 4,0 Z"
        fill="#C6932F"
      />

      {/* ── Tricolour fill (inset 2 px) ──────────────────────────── */}
      <path
        d="M6,2 H34 Q38,2 38,6 V28 Q38,34.5 20,45.5 Q2,34.5 2,28 V6 Q2,2 6,2 Z"
        fill="url(#emblem-tri)"
        clipPath="url(#emblem-shield-clip)"
      />

      {/* ── Diagonal gold slash dividers between the colour bands ── */}
      {/* These run at ~60° to echo the energy of a striking football */}
      <g clipPath="url(#emblem-shield-clip)" opacity="0.55">
        <line x1="11" y1="2"  x2="3"  y2="46" stroke="#C6932F" strokeWidth="1.2" />
        <line x1="27" y1="2"  x2="19" y2="46" stroke="#C6932F" strokeWidth="1.2" />
      </g>

      {/* ── Football pentagon accent (top-centre) ───────────────── */}
      {/* A tiny stylised ball: circle + five curved lines */}
      <g transform="translate(20,10)">
        <circle r="5" fill="none" stroke="#F0ECE1" strokeWidth="1" opacity="0.9" />
        {/* Central pentagon */}
        <polygon
          points="0,-2.5 2.38,-0.77 1.47,2.02 -1.47,2.02 -2.38,-0.77"
          fill="#F0ECE1"
          opacity="0.9"
        />
        {/* Five seams radiating outward */}
        <line x1="0"    y1="-2.5" x2="0"    y2="-5"   stroke="#F0ECE1" strokeWidth="0.7" opacity="0.7" />
        <line x1="2.38" y1="-0.77" x2="4.76" y2="-1.54" stroke="#F0ECE1" strokeWidth="0.7" opacity="0.7" />
        <line x1="1.47" y1="2.02"  x2="2.94" y2="4.04"  stroke="#F0ECE1" strokeWidth="0.7" opacity="0.7" />
        <line x1="-1.47" y1="2.02" x2="-2.94" y2="4.04" stroke="#F0ECE1" strokeWidth="0.7" opacity="0.7" />
        <line x1="-2.38" y1="-0.77" x2="-4.76" y2="-1.54" stroke="#F0ECE1" strokeWidth="0.7" opacity="0.7" />
      </g>

      {/* ── Bold "26" wordmark ───────────────────────────────────── */}
      <text
        x="20"
        y="33"
        textAnchor="middle"
        fontFamily="'Rajdhani', sans-serif"
        fontWeight="700"
        fontSize="13"
        fill="#F0ECE1"
        letterSpacing="-0.5"
      >
        26
      </text>

      {/* ── Mini trophy cup silhouette (bottom-centre) ──────────── */}
      <g transform="translate(20,40)" fill="#C6932F" opacity="0.95">
        {/* Cup body */}
        <path d="M-3.5,-4 Q-4,0 -2,2 L-1.5,3 H1.5 L2,2 Q4,0 3.5,-4 Z" />
        {/* Stem */}
        <rect x="-1" y="3" width="2" height="2" rx="0.3" />
        {/* Base */}
        <rect x="-2.5" y="5" width="5" height="1" rx="0.4" />
        {/* Handles */}
        <path d="M-3.5,-3 Q-5.5,-3 -5.5,-1 Q-5.5,1 -3.5,1" fill="none" stroke="#C6932F" strokeWidth="1" />
        <path d="M3.5,-3 Q5.5,-3 5.5,-1 Q5.5,1 3.5,1"   fill="none" stroke="#C6932F" strokeWidth="1" />
      </g>
    </svg>
  );
}
