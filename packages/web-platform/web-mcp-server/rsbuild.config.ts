import { defineConfig } from '@rsbuild/core';
import path from 'path';
import { fileURLToPath } from 'url';
import { WEB_PROJECT_BASE } from './constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  source: {
    entry: {
      index: path.join(__dirname, 'src', 'web', 'index.ts'),
    },
  },
  output: {
    target: 'web',
    distPath: {
      root: path.join(__dirname, 'dist', 'web'),
    },
    filenameHash: false,
    polyfill: 'off',
    overrideBrowserslist: ['last 1 Chrome versions'],
    assetPrefix: WEB_PROJECT_BASE,
  },
  performance: {
    chunkSplit: {
      strategy: 'all-in-one',
    },
  },
});
