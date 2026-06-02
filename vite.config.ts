import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Port 8010 avoids Homestead/nginx often bound to :8000 on the VM.
  const apiProxyTarget =
    env.VITE_API_PROXY_TARGET?.trim() || 'http://127.0.0.1:8010';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: Number(env.VITE_PORT || 5173),
      // Proxy /api/* to Laravel (php artisan serve). Set VITE_API_PROXY_TARGET= to disable.
      proxy: apiProxyTarget
        ? {
            '/api': {
              target: apiProxyTarget,
              changeOrigin: true,
              secure: false,
            },
          }
        : undefined,
    },
  };
});
