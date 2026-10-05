import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // moment's bare import and its per-locale files resolve to different
      // physical files (dist/moment.js vs moment.js), so esbuild treats them
      // as separate module instances and moment.locale('es') never sticks.
      // The "with-locales" build is the single file both paths should share.
      moment: 'moment/min/moment-with-locales.js',
    },
  },
});