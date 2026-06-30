/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        glg: {
          50: '#f0f9f4',
          100: '#dbf0e3',
          400: '#f5c518',
          600: '#0f5132',
          700: '#0c4127',
          800: '#0a331f'
        }
      }
    }
  },
  plugins: []
}
