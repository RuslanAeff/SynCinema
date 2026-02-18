import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      // Proxy configuration for Google Drive CORS bypass
      proxy: {
        '/api/gdrive': {
          target: 'https://drive.google.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/gdrive/, ''),
          configure: (proxy) => {
            proxy.on('proxyRes', (proxyRes) => {
              // Add CORS headers to response
              proxyRes.headers['Access-Control-Allow-Origin'] = '*';
              proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
              proxyRes.headers['Access-Control-Allow-Headers'] = '*';
            });
          }
        }
      }
    },
    plugins: [react()],
    esbuild: {
      pure: mode === 'production' ? ['console.log'] : [],
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          detached: path.resolve(__dirname, 'detached.html'),
        },
      },
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
