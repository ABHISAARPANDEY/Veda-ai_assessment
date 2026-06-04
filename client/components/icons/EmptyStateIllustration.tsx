export function EmptyStateIllustration({ size = 260 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 320 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="No assignments yet"
    >
      <circle cx="160" cy="160" r="120" fill="#E8E8E8" />
      <rect x="100" y="80" width="120" height="150" rx="10" fill="#FFFFFF" stroke="#D0D0D0" />
      <rect x="115" y="100" width="50" height="8" rx="2" fill="#1A1A1A" />
      <rect x="115" y="120" width="90" height="4" rx="2" fill="#D0D0D0" />
      <rect x="115" y="132" width="90" height="4" rx="2" fill="#D0D0D0" />
      <rect x="115" y="144" width="70" height="4" rx="2" fill="#D0D0D0" />
      <rect x="115" y="156" width="90" height="4" rx="2" fill="#D0D0D0" />
      <rect x="115" y="168" width="60" height="4" rx="2" fill="#D0D0D0" />
      <circle cx="190" cy="190" r="44" fill="#F5F0FA" stroke="#C9B6E3" strokeWidth="3" />
      <line x1="222" y1="222" x2="250" y2="250" stroke="#C9B6E3" strokeWidth="8" strokeLinecap="round" />
      <line x1="176" y1="176" x2="204" y2="204" stroke="#E03131" strokeWidth="6" strokeLinecap="round" />
      <line x1="204" y1="176" x2="176" y2="204" stroke="#E03131" strokeWidth="6" strokeLinecap="round" />
      <path d="M80 100 Q70 80 90 70" stroke="#1A1A1A" strokeWidth="2" fill="none" />
      <circle cx="80" cy="200" r="4" fill="#1F6BC0" />
      <path d="M240 80 l4 8 l8 -4 l-8 -4 z" fill="#1F6BC0" />
      <rect x="230" y="85" width="40" height="14" rx="4" fill="#FFFFFF" stroke="#D0D0D0" />
    </svg>
  );
}
