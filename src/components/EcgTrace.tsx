/** Decorative animated ECG line. Purely visual. */
export function EcgTrace({ className = '', color = '#22D3EE', slow = false }: { className?: string; color?: string; slow?: boolean }) {
  const d = 'M0 40 H60 L70 40 L78 18 L88 62 L98 40 H150 L160 40 L166 32 L172 40 H240 L250 40 L258 14 L268 66 L278 40 H330 L340 40 L346 33 L352 40 H420 L430 40 L438 18 L448 62 L458 40 H510 L520 40 L526 32 L532 40 H600';
  return (
    <svg viewBox="0 0 600 80" preserveAspectRatio="none" className={className} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeOpacity=".18" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1000} className="ecg-line" style={slow ? { animationDuration: '5s' } : undefined} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
