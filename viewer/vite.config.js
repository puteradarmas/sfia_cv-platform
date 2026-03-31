import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',     // required for Docker — expose on all interfaces
    port: 5173,
    strictPort: true,

    // Proxy /api calls to parser during development
    // This avoids CORS issues when both run via docker compose
    proxy: {
      '/api': {
        target: 'http://sfia-parser:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },

    // Allow HMR through Docker bridge network
    hmr: {
      host: 'localhost',
      port: 5173,
    },
  },

  // Make API URL injectable at build time for production
  define: {
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || 'http://localhost:8000'),
  },
});
