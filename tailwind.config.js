/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        kid: ['Fredoka', 'sans-serif'],
        display: ['Fraunces', 'serif'],
      },
      colors: {
        sand: {
          50: 'hsl(45 100% 98%)',
          100: 'hsl(43 85% 94%)',
          200: 'hsl(40 75% 87%)',
          300: 'hsl(38 65% 75%)',
          400: 'hsl(35 55% 60%)',
          500: 'hsl(32 50% 45%)',
          600: 'hsl(30 45% 35%)',
          700: 'hsl(28 40% 25%)',
          800: 'hsl(25 35% 18%)',
          900: 'hsl(22 30% 12%)',
        },
        coral: {
          50: 'hsl(15 100% 97%)',
          100: 'hsl(14 95% 92%)',
          200: 'hsl(12 90% 85%)',
          300: 'hsl(10 85% 75%)',
          400: 'hsl(8 80% 65%)',
          500: 'hsl(6 75% 55%)',
          600: 'hsl(4 70% 48%)',
          700: 'hsl(2 65% 40%)',
        },
        ocean: {
          50: 'hsl(195 100% 97%)',
          100: 'hsl(195 90% 92%)',
          200: 'hsl(195 85% 82%)',
          300: 'hsl(195 80% 68%)',
          400: 'hsl(195 75% 52%)',
          500: 'hsl(195 80% 42%)',
          600: 'hsl(195 85% 32%)',
          700: 'hsl(195 90% 24%)',
        },
        forest: {
          50: 'hsl(160 70% 96%)',
          100: 'hsl(160 65% 90%)',
          200: 'hsl(160 60% 78%)',
          300: 'hsl(160 55% 62%)',
          400: 'hsl(160 55% 48%)',
          500: 'hsl(160 60% 38%)',
          600: 'hsl(160 65% 28%)',
        },
      },
      borderRadius: {
        'soft': '1.5rem',
        'round': '2rem',
        'bento': '2.5rem',
      },
      boxShadow: {
        'glow': '0 0 40px -10px',
        'float': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        'bento': '0 32px 64px -12px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'reveal-up': 'reveal-up 0.6s ease-out forwards',
        'reveal-scale': 'reveal-scale 0.5s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'stamp-in': 'stamp-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        'reveal-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'reveal-scale': {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(229, 115, 115, 0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(229, 115, 115, 0)' },
        },
        'stamp-in': {
          '0%': { opacity: '0', transform: 'rotate(-20deg) scale(1.5)' },
          '60%': { opacity: '1', transform: 'rotate(5deg) scale(0.95)' },
          '100%': { opacity: '1', transform: 'rotate(-5deg) scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
