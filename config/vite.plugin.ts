import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: 'svg-link-exporter/src/plugin/main.ts',
      formats: ['iife'],
      name: 'SvgLinkExporterPlugin',
      fileName: () => 'code.js',
    },
    minify: false,
    outDir: 'svg-link-exporter/dist',
    target: 'es2020',
  },
});
