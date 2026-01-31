/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        rust: {
          50: '#fef3f2',
          100: '#fee4e2',
          200: '#ffcdc8',
          300: '#fda9a1',
          400: '#fa776b',
          500: '#f04d3c',
          600: '#de3020',
          700: '#cd2417',
          800: '#a02018',
          900: '#84211a',
          950: '#480d09',
        },
        dark: {
          50: '#f6f6f6',
          100: '#e7e7e7',
          200: '#d1d1d1',
          300: '#b0b0b0',
          400: '#888888',
          500: '#6d6d6d',
          600: '#5d5d5d',
          700: '#4f4f4f',
          800: '#454545',
          900: '#3d3d3d',
          950: '#1a1a1a',
        }
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
