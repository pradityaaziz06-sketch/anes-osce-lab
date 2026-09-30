'use client';
import type { Attempt } from '@/lib/types';

export function TrendChart({ attempts }: { attempts: Attempt[] }) {
  const pts = attempts.slice(-12);
  const W = 640, H = 220, L = 34, R = 12, T = 12, B = 26;
  const x = (i: number) => (pts.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (pts.length - 1));
  const y = (v: number) => T + ((100 - v) * (H - T - B)) / 100;
  const line = pts.map((a, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(a.final).toFixed(1)}`).join(' ');
  const summary = pts.map((a, i) => `attempt ${i + 1}: ${a.final}`).join(', ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Score trend. ${summary}`}>
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke="rgba(255,255,255,.08)" />
          <text x={L - 8} y={y(g) + 4} textAnchor="end" fontSize="11" fill="#94A3B8">{g}</text>
        </g>
      ))}
      <line x1={L} x2={W - R} y1={y(60)} y2={y(60)} stroke="#F9A8D4" strokeOpacity=".5" strokeDasharray="4 4" />
      <path d={`${line} L${x(pts.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`} fill="url(#area)" opacity=".5" />
      <defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#22D3EE" stopOpacity=".35" /><stop offset="1" stopColor="#22D3EE" stopOpacity="0" /></linearGradient></defs>
      <path d={line} fill="none" stroke="#22D3EE" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((a, i) => (
        <g key={a.id}>
          <circle cx={x(i)} cy={y(a.final)} r="4.5" fill="#050914" stroke={a.mode === 'exam' ? '#F9A8D4' : '#22D3EE'} strokeWidth="2.5" />
          <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#94A3B8">{i + 1}</text>
        </g>
      ))}
    </svg>
  );
}
