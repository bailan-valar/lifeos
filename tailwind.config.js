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
        /* Legacy glass tokens — 保留兼容，新代码优先使用 liquid-glass-* */
        'glass-bg': 'rgba(255, 255, 255, 0.7)',
        'glass-bg-light': 'rgba(255, 255, 255, 0.5)',
        'glass-bg-dark': 'rgba(255, 255, 255, 0.85)',
        'glass-border': 'rgba(255, 255, 255, 0.6)',
        'glass-border-light': 'rgba(255, 255, 255, 0.4)',
        'glass-shadow': 'rgba(0, 0, 0, 0.1)',
        'glass-shadow-light': 'rgba(0, 0, 0, 0.05)',
        /* iOS 26 Liquid Glass 专用色板 */
        'liquid': {
          'bg': 'rgba(255, 255, 255, 0.15)',
          'bg-thick': 'rgba(255, 255, 255, 0.22)',
          'bg-thin': 'rgba(255, 255, 255, 0.10)',
          'bg-dark': 'rgba(30, 30, 30, 0.35)',
          'bg-dark-thick': 'rgba(30, 30, 30, 0.50)',
          'border': 'rgba(255, 255, 255, 0.20)',
          'border-strong': 'rgba(255, 255, 255, 0.30)',
          'border-dark': 'rgba(255, 255, 255, 0.12)',
          'highlight': 'rgba(255, 255, 255, 0.25)',
          'highlight-strong': 'rgba(255, 255, 255, 0.40)',
          'shadow': 'rgba(0, 0, 0, 0.12)',
          'shadow-strong': 'rgba(0, 0, 0, 0.20)',
          'refraction': 'rgba(255, 255, 255, 0.18)',
        },
      },
      backdropBlur: {
        'xs': '2px',
        '2xl': '24px',
        '3xl': '32px',
        '4xl': '40px',
        '5xl': '48px',
      },
      boxShadow: {
        /* Legacy glass shadows — 保留兼容 */
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
        'glass-light': '0 4px 16px rgba(0, 0, 0, 0.05)',
        'glass-strong': '0 16px 48px rgba(0, 0, 0, 0.15)',
        'inner-glass': 'inset 0 2px 8px rgba(255, 255, 255, 0.5)',
        /* iOS 26 Liquid Glass 专用阴影 */
        'liquid': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'liquid-light': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'liquid-strong': '0 16px 48px rgba(0, 0, 0, 0.18)',
        'liquid-elevated': '0 20px 60px rgba(0, 0, 0, 0.15)',
        'liquid-nav': 'inset 0 1px 1px rgba(255, 255, 255, 0.3), 0 -4px 20px rgba(0, 0, 0, 0.08)',
        'liquid-sheet': 'inset 0 1px 1px rgba(255, 255, 255, 0.3), 0 -8px 32px rgba(0, 0, 0, 0.12)',
        'liquid-inset': 'inset 0 1px 1px rgba(255, 255, 255, 0.25), inset 0 -1px 1px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        'ios': '20px',
        'ios-lg': '24px',
        'ios-xl': '32px',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.6) 100%)',
        'glass-gradient-dark': 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
        'glass-gradient-light': 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.5) 100%)',
        'liquid-refraction': 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.25) 0%, transparent 60%)',
        'liquid-shimmer': 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.2) 0%, transparent 50%)',
      },
      animation: {
        'liquid-shimmer': 'liquid-glass-shimmer 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        'liquid-glass-shimmer': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)', opacity: '0.5' },
          '50%': { transform: 'translate(5%, 5%) scale(1.1)', opacity: '0.8' },
        },
        'shimmer': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
}
