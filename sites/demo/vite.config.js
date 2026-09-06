import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  // The demo consumes the library the same way an installed app would, by
  // package name. The alias points that at the local build so `npm run
  // dev:demo` reflects working-tree changes without a publish or link step.
  resolve: {
    alias: {
      '@cmunns/guidepost': root + 'dist/index.js',
    },
  },
  build: { outDir: 'dist', emptyOutDir: true },
  // Bind IPv4 explicitly: the Playwright config (and CI) reach the preview
  // server at 127.0.0.1, and Vite otherwise binds ::1 only on this machine.
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
});
