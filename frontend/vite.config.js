import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/src': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',   // Must be this, not just `true`
    port: 5173,
    strictPort: true,
    // Dev proxy: forward /pdf requests to the host nginx (so browser -> vite -> nginx -> pdf_service)
    // This avoids requiring port 80 to be publicly reachable from the developer machine.
    proxy: {
      '/pdf': {
        target: 'http://127.0.0.1',
        changeOrigin: true,
        secure: false,
      }
    },
  },
  build: {
    // Increase warning threshold to a slightly larger chunk size
    chunkSizeWarningLimit: 700,
  // Use default Rollup/Vite chunking. Removed manualChunks to avoid
  // custom chunking issues during ESM initialization in production bundles.
  }
})
