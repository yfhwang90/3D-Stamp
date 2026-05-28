/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      screens: {
        laptop: '1440px',
        desktop: '1728px',
        wide: '1920px',
        ultrawide: '2560px',
      },
      maxWidth: {
        app: '90rem',
        'app-lg': '96rem',
        'app-xl': '104rem',
        'app-ultra': '108rem',
      },
      spacing: {
        'app-gutter': 'clamp(0.5rem, 1.25vw, 1.25rem)',
        'app-gap': 'clamp(0.75rem, 1.5vw, 1.25rem)',
      },
      colors: {
        paper: '#f4eee4',
        parchment: '#efe4d5',
        ink: '#4d2f2a',
        'faded-red': '#b95e4d',
        'faded-blue': '#6f8695',
        'warm-gray': '#8a7d73',
      },
      fontFamily: {
        display: ['"Baskerville"', '"Times New Roman"', 'serif'],
        body: ['"Georgia"', '"Times New Roman"', 'serif'],
      },
      boxShadow: {
        paper: '0 20px 40px rgba(79, 53, 35, 0.18)',
        panel: '0 16px 28px rgba(64, 44, 31, 0.14)',
      },
    },
  },
  plugins: [],
}
