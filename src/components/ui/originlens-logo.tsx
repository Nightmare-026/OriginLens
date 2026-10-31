interface OriginLensLogoProps {
  size?: number;
  className?: string;
  id?: string;
}

/**
 * OriginLens Custom Cryptographic Vector Logo
 *
 * Domain Symbolism:
 * 1. Outer Provenance Ring: Cryptographic verification ring with nodal hashes.
 * 2. Inner Optical Aperture: Hexagonal camera lens iris blades (the "Lens" metaphor).
 * 3. Core Focal Seal: Central cryptographic integrity pupil and cross-hair focus.
 * 4. Gradient: High-contrast Sky Blue (#0ea5e9) to Emerald Green (#10b981).
 */
export function OriginLensLogo({ size = 38, className = '', id }: OriginLensLogoProps) {
  const gradientId = id ? `ol-logo-grad-${id}` : 'ol-logo-gradient';
  const glowId = id ? `ol-logo-glow-${id}` : 'ol-logo-glow';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`originlens-logo-svg ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="50%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>

        <linearGradient id={`${gradientId}-accent`} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0ea5e9" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Outer Subtle Shadow Layer */}
      <circle cx="50" cy="50" r="46" fill="#ffffff" filter={`url(#${glowId})`} />

      {/* Outer Cryptographic Provenance Track */}
      <circle
        cx="50"
        cy="50"
        r="44"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.5"
        strokeDasharray="4 3"
        strokeOpacity="0.75"
      />

      {/* Solid Precision Boundary Ring */}
      <circle
        cx="50"
        cy="50"
        r="38"
        stroke={`url(#${gradientId})`}
        strokeWidth="2"
      />

      {/* 8 Cryptographic Verification Nodes on Outer Ring */}
      <circle cx="50" cy="6" r="2.5" fill="#0ea5e9" />
      <circle cx="81.1" cy="18.9" r="2.5" fill="#0284c7" />
      <circle cx="94" cy="50" r="2.5" fill="#0ea5e9" />
      <circle cx="81.1" cy="81.1" r="2.5" fill="#10b981" />
      <circle cx="50" cy="94" r="2.5" fill="#10b981" />
      <circle cx="18.9" cy="81.1" r="2.5" fill="#059669" />
      <circle cx="6" cy="50" r="2.5" fill="#0284c7" />
      <circle cx="18.9" cy="18.9" r="2.5" fill="#0ea5e9" />

      {/* Optical Camera Aperture Blades (Hexagonal Iris) */}
      <g stroke={`url(#${gradientId})`} strokeWidth="1.75" strokeLinecap="round" opacity="0.9">
        {/* Blade 1 */}
        <line x1="32" y1="20" x2="68" y2="30" />
        {/* Blade 2 */}
        <line x1="68" y1="30" x2="80" y2="62" />
        {/* Blade 3 */}
        <line x1="80" y1="62" x2="55" y2="84" />
        {/* Blade 4 */}
        <line x1="55" y1="84" x2="22" y2="70" />
        {/* Blade 5 */}
        <line x1="22" y1="70" x2="20" y2="38" />
        {/* Blade 6 */}
        <line x1="20" y1="38" x2="52" y2="16" />
      </g>

      {/* Central Provenance Shield & Core Iris */}
      <circle
        cx="50"
        cy="50"
        r="19"
        fill={`url(#${gradientId})`}
        fillOpacity="0.12"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.2"
      />

      {/* Center Cryptographic Keyhole / Shield Mark */}
      <path
        d="M50 38 L59 42 V50 C59 56 55 60 50 63 C45 60 41 56 41 50 V42 Z"
        fill={`url(#${gradientId})`}
      />

      {/* Inner Verification Checkmark */}
      <path
        d="M46 50.5 L48.8 53.3 L54 47.5"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
