import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
  define: {
    __API_URL__: JSON.stringify(process.env.NODE_ENV === 'production' 
      ? process.env.VITE_SERVER_URL || 'https://server-production-d7dd.up.railway.app'
      : 'http://localhost:3001'
    ),
  },
})
