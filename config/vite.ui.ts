import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  root: 'svg-link-exporter/src/ui',
  plugins: [viteSingleFile()],
  build: {
    emptyOutDir: false,
    outDir: resolve(__dirname, '../svg-link-exporter/dist'),
    rollupOptions: {
      input: resolve(__dirname, '../svg-link-exporter/src/ui/ui.html'),
    },
  },
});
