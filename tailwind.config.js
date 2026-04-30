/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        'ios-blue': 'rgb(0, 122, 255)',
        'ios-green': 'rgb(52, 199, 89)',
        'ios-red': 'rgb(255, 59, 48)',
        'ios-yellow': 'rgb(255, 204, 0)',
        'ios-orange': 'rgb(255, 149, 0)',
        'ios-purple': 'rgb(175, 82, 222)',
        'ios-pink': 'rgb(255, 45, 85)',
        'ios-indigo': 'rgb(94, 92, 230)',
        'ios-teal': 'rgb(89, 173, 196)',
        'ios-gray': 'rgb(142, 142, 147)',
        'ios-gray2': 'rgb(99, 99, 102)',
        'ios-gray3': 'rgb(72, 72, 74)',
        'ios-gray4': 'rgb(58, 58, 60)',
        'ios-gray5': 'rgb(44, 44, 46)',
        'ios-gray6': 'rgb(28, 28, 30)',
      },
    },
  },
  plugins: [],
}
