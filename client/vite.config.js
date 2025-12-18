import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    proxy: {
      // Proxy all requests starting with /api to the Node.js backend
      '/api': {
        target: 'http://localhost:3500', 
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:3500',
        changeOrigin: true,
        secure: false,
      }
    },
    port: 3000 // React dev server runs on 3000 by default
  }
})
