import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';

export default defineConfig({
  main: {
    build: {
      externalizeDeps: true,
      rollupOptions: {
        external: ['electron'],
        output: {
          format: 'cjs',
        },
      },
    },
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
  },
  preload: {
    build: {
      externalizeDeps: true,
      rollupOptions: {
        external: ['electron'],
        output: {
          format: 'cjs',
        },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
        },
        output: {
          // Inline dynamic imports to avoid CORS issues with file:// protocol
          inlineDynamicImports: true,
        },
      },
      // Disable modulePreload to avoid crossorigin issues in Electron
      modulePreload: false,
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src/renderer'),
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
    optimizeDeps: {
      include: ['d3-force', '@xenova/transformers'],
    },
    worker: {
      format: 'es',
    },
  },
});
