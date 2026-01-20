import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      assets: path.resolve(__dirname, './src/assets'),
      components: path.resolve(__dirname, './src/components'),
      context: path.resolve(__dirname, './src/context'),
      examples: path.resolve(__dirname, './src/examples'),
      layouts: path.resolve(__dirname, './src/layouts'),
      pages: path.resolve(__dirname, './src/pages'),
      services: path.resolve(__dirname, './src/services'),
    },
  },
  server: {
    proxy: {
      // Proxy admin API requests to backend server
      '/admin': {
        target: 'http://localhost:3012',
        changeOrigin: true,
      },
      // Proxy project-scoped API requests to backend server
      '/project': {
        target: 'http://localhost:3012',
        changeOrigin: true,
      },
    },
  },
})

