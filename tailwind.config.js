/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        glg: {
          50: '#eef2f8',
          100: '#d7e1ef',
          400: '#c9971c',
          gold: '#c9971c',
          'gold-dark': '#9c6312',
          600: '#0a2e6e',
          700: '#00205b',
          800: '#001740'
        }
      }
    }
  },
  plugins: []
}
