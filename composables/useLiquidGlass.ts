export function useLiquidGlass() {
  const glassStyles = {
    default: {
      background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.6) 100%)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.6)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
    },
    light: {
      background: 'linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.5) 100%)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.4)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)'
    },
    dark: {
      background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.7) 100%)',
      backdropFilter: 'blur(32px)',
      WebkitBackdropFilter: 'blur(32px)',
      border: '1px solid rgba(255, 255, 255, 0.6)',
      boxShadow: '0 16px 48px rgba(0, 0, 0, 0.15)'
    }
  }

  const getGlassStyle = (variant: 'default' | 'light' | 'dark' = 'default') => {
    return glassStyles[variant]
  }

  const getGlassClass = (variant: 'default' | 'light' | 'dark' = 'default') => {
    const classes = {
      default: 'bg-glass-bg backdrop-blur-xl border-glass-border shadow-glass',
      light: 'bg-glass-bg-light backdrop-blur-lg border-glass-border-light shadow-glass-light',
      dark: 'bg-glass-bg-dark backdrop-blur-3xl border-glass-border shadow-glass-strong'
    }
    return classes[variant]
  }

  return {
    glassStyles,
    getGlassStyle,
    getGlassClass
  }
}
