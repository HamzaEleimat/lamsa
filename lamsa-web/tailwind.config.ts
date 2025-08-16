import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // CSS Variables from design system
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        
        // Direct Lamsa brand colors for convenience
        lamsa: {
          primary: '#4A3643',      // Deep plum
          'primary-hover': '#3E2B36', // 10% darker
          'primary-active': '#352029', // 15% darker
          secondary: '#CC8899',    // Dusty pink
          'secondary-hover': '#B8758A', // 10% darker
          'secondary-active': '#A6677C', // 15% darker
          tertiary: '#D4A5A5',     // Soft rose
          'tertiary-hover': '#C49494', // 10% darker
          'tertiary-active': '#B88383', // 15% darker
          surface: '#F5E6E6',      // Cream blush
          background: '#FAF7F6',   // Warm white
        },
        
        // Semantic colors
        success: {
          DEFAULT: 'hsl(var(--success))',
          light: '#E8F5E8',
          dark: '#2E7D32',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          light: '#FFF3E0',
          dark: '#F57C00',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          light: '#E3F2FD',
          dark: '#1976D2',
        },
        error: {
          DEFAULT: 'hsl(var(--destructive))',
          light: '#FFEBEE',
          dark: '#D32F2F',
        },
        
        // Text colors
        text: {
          primary: '#2D1B28',
          secondary: '#6B5D65',
          tertiary: '#8A7B83',
          inverse: '#FFFFFF',
        },
        
        // Gray scale (warm-tinted)
        gray: {
          50: '#FAF8F7',
          100: '#F5F2F1',
          200: '#E8E2E0',
          300: '#D1C7C4',
          400: '#A69BA3',
          500: '#7A6F76',
          600: '#6B5D65',
          700: '#4A3F45',
          800: '#2D1B28',
          900: '#1A0F15',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        arabic: ['Cairo', 'Noto Sans Arabic', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Source Code Pro', 'monospace'],
      },
      fontSize: {
        xs: ['12px', { lineHeight: '1.4' }],
        sm: ['14px', { lineHeight: '1.5' }],
        base: ['16px', { lineHeight: '1.5' }],
        lg: ['18px', { lineHeight: '1.5' }],
        xl: ['20px', { lineHeight: '1.4' }],
        '2xl': ['24px', { lineHeight: '1.3' }],
        '3xl': ['30px', { lineHeight: '1.3' }],
        '4xl': ['36px', { lineHeight: '1.25' }],
        '5xl': ['48px', { lineHeight: '1.2' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      boxShadow: {
        'lamsa-sm': '0 1px 2px rgba(45, 27, 40, 0.1)',
        'lamsa': '0 2px 4px rgba(45, 27, 40, 0.1)',
        'lamsa-md': '0 4px 8px rgba(45, 27, 40, 0.12)',
        'lamsa-lg': '0 8px 16px rgba(45, 27, 40, 0.15)',
        'lamsa-xl': '0 12px 24px rgba(45, 27, 40, 0.2)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    require('tailwindcss-rtl'),
  ],
};

export default config;