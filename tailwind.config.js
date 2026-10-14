/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        twitch: '#9146FF',
        darkBg: '#0e0e10',
        darkCard: '#1f1f23',
        darkHover: '#2f2f35',
      },
    },
  },
  plugins: [],
};
