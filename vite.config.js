import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createApiMiddleware } from './server/apiHandler.js';
import { mandiPrices } from './server/mandi.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const farmwiseApiPlugin = () => ({
    name: 'farmwise-gemini-api',
    configureServer(server) {
      server.middlewares.use(createApiMiddleware(() => env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''));
    },
    configurePreviewServer(server) {
      server.middlewares.use(createApiMiddleware(() => env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''));
    }
  });

  return {
    plugins: [react(), mandiPrices(), farmwiseApiPlugin()],
  };
});
