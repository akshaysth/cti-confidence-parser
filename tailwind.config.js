import tailwindAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // shadcn CSS-variable-based colors
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // WEL tier accent colors - CSS variable based
        tier: {
          certain: 'hsl(var(--tier-certain))',
          'certain-bg': 'hsl(var(--tier-certain-bg))',
          probable: 'hsl(var(--tier-probable))',
          'probable-bg': 'hsl(var(--tier-probable-bg))',
          even: 'hsl(var(--tier-even))',
          'even-bg': 'hsl(var(--tier-even-bg))',
          unlikely: 'hsl(var(--tier-unlikely))',
          'unlikely-bg': 'hsl(var(--tier-unlikely-bg))',
          remote: 'hsl(var(--tier-remote))',
          'remote-bg': 'hsl(var(--tier-remote-bg))',
        },
        // Semantic colors
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        error: 'hsl(var(--error))',
        info: 'hsl(var(--info))',
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'ui-serif', 'serif'],
        meta: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        'slide-in-from-top': {
          from: { transform: 'translateY(-8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-from-bottom': {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'fade-out': 'fade-out 0.15s ease-in',
        'slide-in-from-top': 'slide-in-from-top 0.2s ease-out',
        'slide-in-from-bottom': 'slide-in-from-bottom 0.2s ease-out',
      },
    },
  },
  plugins: [tailwindAnimate],
};
