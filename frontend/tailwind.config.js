/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-page': '#F8FAFC',
        'bg-surface': '#FFFFFF',
        'border-subtle': '#E5E7EB',
        'text-primary': '#111827',
        'text-secondary': '#475569',
        'text-muted': '#64748B',
        'accent-primary': '#3B82F6',
        'accent-secondary': '#6366F1',
        'success': '#10B981',
        'danger': '#EF4444',
        'warning': '#F59E0B',
        'info': '#0EA5E9',
      },
      fontFamily: {
        sans: [
          'Pretendard Variable',
          'var(--font-inter)',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          'Helvetica Neue',
          'Segoe UI',
          'Apple SD Gothic Neo',
          'Noto Sans KR',
          'Malgun Gothic',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'sans-serif',
        ],
      },
      borderRadius: {
        'card': '0.75rem',
        'chip': '9999px',
        'input': '0.625rem',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
}
