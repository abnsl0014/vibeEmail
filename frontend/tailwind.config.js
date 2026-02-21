/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        overlay: {
          bg: 'rgba(26, 26, 26, 0.85)',
          border: 'rgba(255, 255, 255, 0.1)',
        },
      },
      animation: {
        'slide-up': 'slideUp 200ms ease-out',
        'expand-up': 'expandUp 300ms ease-out',
        'fade-in': 'fadeIn 200ms ease-out',
        'pulse-dot': 'pulseDot 1.4s ease-in-out infinite',
        'bar-bounce': 'barBounce 0.6s ease-in-out infinite alternate',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        expandUp: {
          '0%': { maxHeight: '56px', borderRadius: '9999px' },
          '100%': { maxHeight: '500px', borderRadius: '16px' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseDot: {
          '0%, 80%, 100%': { opacity: '0.3', transform: 'scale(0.8)' },
          '40%': { opacity: '1', transform: 'scale(1)' },
        },
        barBounce: {
          '0%': { transform: 'scaleY(0.3)' },
          '100%': { transform: 'scaleY(1)' },
        },
      },
      backdropBlur: {
        '20': '20px',
      },
    },
  },
  plugins: [],
}
