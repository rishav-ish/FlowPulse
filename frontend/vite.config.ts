import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path must be './' for Wails desktop app
  base: './',
  build: {
    // Generate sourcemaps for better debugging
    sourcemap: true,
    // Ensure proper asset paths for Wails
    assetsDir: 'assets',
    // Make sure the output is optimized for Wails
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  // Ensure CSP compliance for Wails
  server: {
    strictPort: true,
    port: 5173,
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
})
