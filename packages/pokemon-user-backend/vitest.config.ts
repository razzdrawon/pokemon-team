import { defineConfig } from 'vitest/config';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig({
  test: {
    globals: true,
    root: __dirname,
  },
  plugins: [nxViteTsPaths()], // Vitest reads this file, not vite.config.ts — needs its own alias plugin
});
