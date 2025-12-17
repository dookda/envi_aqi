import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Set base URL for production deployment
  base: process.env.NODE_ENV === 'production' ? '/env/' : '/',

  build: {
    // Output directory
    outDir: 'dist',

    // Generate source maps for debugging
    sourcemap: false,

    // Customize asset file names
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },

  server: {
    port: 5173,
    host: true,
  },
})
