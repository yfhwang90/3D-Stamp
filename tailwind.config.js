/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
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

