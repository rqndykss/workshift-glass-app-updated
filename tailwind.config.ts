import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        accent: '#D9534F',
        ink: '#1D1D1F',
        mist: '#F5F5F7',
      },
      boxShadow: {
        glass: '0 18px 60px rgba(25, 28, 38, 0.10)',
        soft: '0 10px 30px rgba(25, 28, 38, 0.07)',
      },
    },
  },
  plugins: [],
}
export default config
