import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Handle SPA routing - fallback to index.html for all routes
    historyApiFallback: true,
  },
  preview: {
    // Also handle for preview mode
    historyApiFallback: true,
  },
})
