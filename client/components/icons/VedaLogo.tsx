export function VedaLogo({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="VedaAI"
    >
      <rect x="2" y="2" width="36" height="36" rx="10" fill="#1A1A1A" />
      <path
        d="M11 13 L20 28 L29 13"
        stroke="#FFFFFF"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
