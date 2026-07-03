// Tailwind v4 uses CSS configuration instead of ts configuration. Let us write a standard ES module export to satisfy bundlers.
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
      fontSize: {
        'xs': '12px',
        'sm': '14px',
        'base': '16px',
        'lg': '18px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '30px',
      },
      spacing: {
        // 8px grid (default tailwind spacing already does this, but keeping it standard)
      },
      borderRadius: {
        'lg': '12px',
        'md': '8px',
        'sm': '4px',
        DEFAULT: '12px',
      },
      boxShadow: {
        'card': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      },
      colors: {
        primary: {
          DEFAULT: '#1E40AF', // Royal Blue
          light: '#3B82F6',
          dark: '#1E3A8A',
        },
        secondary: {
          DEFAULT: '#F97316', // Orange
          light: '#FB923C',
          dark: '#C2410C',
        },
        accent: {
          DEFAULT: '#F97316', // Orange
        },
        sidebar: {
          DEFAULT: '#172554', // Dark Blue
          hover: '#1E3A8A',
        },
        background: '#F3F4F6', // Very Light Gray
        card: '#FFFFFF', // White
        hover: '#EFF6FF', // Soft Blue
        success: '#16A34A', // Green
        warning: '#D97706', // Amber
        danger: '#DC2626', // Red
      },
      transitionDuration: {
        DEFAULT: '150ms',
      }
    },
  },
  plugins: [],
};
