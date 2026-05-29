/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: {
          50: '#faf7f2',
          100: '#f4ede0',
          200: '#e8d9bf',
          300: '#d9bf95',
          400: '#c69e63',
          500: '#a37b3f',
          600: '#7a5a2b',
          700: '#583f1f',
          800: '#3a2a18',
          900: '#241910',
        },
        alpine: {
          50: '#eef6fa',
          100: '#d3eaf3',
          200: '#9fd0e2',
          300: '#6cb6d1',
          400: '#4099b9',
          500: '#286b88',
          600: '#1f5670',
          700: '#194256',
          800: '#142e3c',
          900: '#0c1c25',
        },
        rust: {
          50: '#fbf1ec',
          100: '#f5dccc',
          400: '#df7a4a',
          500: '#c45a2c',
          600: '#9f4321',
          700: '#7c3215',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
