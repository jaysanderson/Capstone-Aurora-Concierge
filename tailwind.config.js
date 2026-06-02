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
          200: '#eec3a8',
          300: '#e6a684',
          400: '#df7a4a',
          500: '#c45a2c',
          600: '#9f4321',
          700: '#7c3215',
          800: '#5a230d',
          900: '#3a1607',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '4xl': ['2.25rem', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
        '5xl': ['3rem', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
        '6xl': ['3.75rem', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
        '7xl': ['4.5rem', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
        '8xl': ['6rem', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
        '9xl': ['8rem', { lineHeight: '1.05', letterSpacing: '-0.025em' }],
      },
      boxShadow: {
        'aurora':
          '0 1px 1px rgba(36,25,16,0.04), 0 8px 24px -8px rgba(36,25,16,0.08)',
        'aurora-lift':
          '0 2px 2px rgba(36,25,16,0.05), 0 16px 36px -12px rgba(36,25,16,0.14)',
      },
    },
  },
  plugins: [],
};
