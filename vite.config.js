import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  // Settings for `npm test` (Vitest). jsdom gives tests a fake browser page.
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
  },
})
