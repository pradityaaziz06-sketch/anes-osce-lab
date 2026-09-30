import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#050914', 900: '#0A1128', 800: '#0F1A3A', 700: '#16264F', 600: '#22366B' },
        med: { DEFAULT: '#3B82F6', soft: '#93C5FD' },
        pulse: { DEFAULT: '#22D3EE', soft: '#A5F3FC' },
        blush: { DEFAULT: '#F9A8D4', soft: '#FBCFE8' },
        ok: '#34D399',
        warn: '#FBBF24',
        bad: '#FB7185',
      },
      fontFamily: {
        display: ['"Sora Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(34,211,238,.35), 0 8px 34px -8px rgba(34,211,238,.45)',
        soft: '0 10px 40px -14px rgba(2,8,30,.9)',
      },
      keyframes: {
        trace: { '0%': { strokeDashoffset: '1000' }, '100%': { strokeDashoffset: '0' } },
        pulseDot: { '0%,100%': { opacity: '1' }, '50%': { opacity: '.35' } },
      },
      animation: {
        trace: 'trace 3.2s linear infinite',
        pulseDot: 'pulseDot 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
