import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    // The viewer tests render thousands of messages in jsdom: 3 s on a fast PC, over the 5 s default on a shared CI runner.
    testTimeout: 20000,
  },
});
