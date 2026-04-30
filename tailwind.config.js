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
        'glass-bg': 'rgba(255, 255, 255, 0.7)',
        'glass-bg-light': 'rgba(255, 255, 255, 0.5)',
        'glass-bg-dark': 'rgba(255, 255, 255, 0.85)',
        'glass-border': 'rgba(255, 255, 255, 0.6)',
        'glass-border-light': 'rgba(255, 255, 255, 0.4)',
        'glass-shadow': 'rgba(0, 0, 0, 0.1)',
        'glass-shadow-light': 'rgba(0, 0, 0, 0.05)',
      },
      backdropBlur: {
        'xs': '2px',
        '3xl': '32px',
        '4xl': '40px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
        'glass-light': '0 4px 16px rgba(0, 0, 0, 0.05)',
        'glass-strong': '0 16px 48px rgba(0, 0, 0, 0.15)',
        'inner-glass': 'inset 0 2px 8px rgba(255, 255, 255, 0.5)',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.6) 100%)',
        'glass-gradient-dark': 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
        'glass-gradient-light': 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.5) 100%)',
      },
    },
  },
  plugins: [],
}
