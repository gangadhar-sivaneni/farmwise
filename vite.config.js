import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mandiPrices } from './server/mandi.js';

export default defineConfig({
  plugins: [react(), mandiPrices()],
});
