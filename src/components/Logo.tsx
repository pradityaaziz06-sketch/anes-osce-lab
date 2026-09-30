export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="lm" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22D3EE" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="#0A1128" />
      <rect x="2" y="2" width="60" height="60" rx="16" fill="none" stroke="url(#lm)" strokeWidth="2" />
      <path d="M8 35h13l5-13 9 25 6-17 3 5h12" fill="none" stroke="url(#lm)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="50" cy="16" r="3.5" fill="#F9A8D4" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <LogoMark />
      <span className="leading-tight">
        <span className="block font-display text-[15px] font-bold tracking-wide">ANES OSCE LAB</span>
        {!compact && <span className="block text-[10px] font-semibold tracking-[0.2em] text-blush">TIARA BUNDA EDITION</span>}
      </span>
    </span>
  );
}
