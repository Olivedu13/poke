import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    passWithNoTests: false,
    exclude: ['server/**', 'node_modules/**'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'html'],
      all: true,
      include: ['components/battle/**', 'components/metagame/**', 'store/**', 'services/**'],
      exclude: ['**/node_modules/**', 'dist/**', 'server/**']
    }
  }
});
