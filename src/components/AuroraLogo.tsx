interface AuroraLogoProps {
  className?: string;
}

/**
 * Wordmark-led brand lockup. The mark is a confident two-peak silhouette
 * (mountains) with a warm rust horizon wash — reads as "Aurora Outfitters"
 * rather than the previous concentric arcs that scanned as a wifi glyph.
 * Wordmark uses Fraunces with a tighter tracking and italic on "Outfitters"
 * to give it specimen-quality typographic personality.
 */
export default function AuroraLogo({ className }: AuroraLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ''}`}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
        className="h-7 w-7 flex-shrink-0"
      >
        <defs>
          <linearGradient id="aurora-horizon" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#df7a4a" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#df7a4a" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* warm horizon wash behind the peaks */}
        <rect x="2" y="14" width="28" height="10" fill="url(#aurora-horizon)" />
        {/* aurora rays — three hairlines fanning out at varied stroke weights */}
        <g stroke="#286b88" strokeLinecap="round" opacity="0.55">
          <line x1="6"  y1="9"  x2="6"  y2="5"  strokeWidth="1" />
          <line x1="13" y1="6"  x2="13" y2="2"  strokeWidth="1.5" />
          <line x1="20" y1="5"  x2="20" y2="2.5" strokeWidth="2" />
          <line x1="26" y1="8"  x2="26" y2="4.5" strokeWidth="1.5" />
        </g>
        {/* far peak */}
        <path
          d="M2 24 L11 11 L18 20 Z"
          fill="#194256"
          opacity="0.55"
        />
        {/* near peak */}
        <path
          d="M9 24 L19 8 L30 24 Z"
          fill="#194256"
        />
        {/* snowline highlight */}
        <path
          d="M16 13 L19 8 L22 13 L20.5 14.5 L19 13 L17.5 14.5 Z"
          fill="#faf7f2"
        />
        {/* hairline horizon ground */}
        <line x1="2" y1="24" x2="30" y2="24" stroke="#286b88" strokeWidth="0.6" opacity="0.6" />
      </svg>
      <div className="flex flex-col leading-none">
        <span
          className="font-display text-[17px] font-medium text-alpine-900"
          style={{ letterSpacing: '0.02em', fontVariationSettings: '"opsz" 36' }}
        >
          Aurora
        </span>
        <span
          className="font-display text-[10px] italic text-rust-500"
          style={{ letterSpacing: '0.22em', fontVariationSettings: '"opsz" 14' }}
        >
          OUTFITTERS
        </span>
      </div>
    </div>
  );
}
