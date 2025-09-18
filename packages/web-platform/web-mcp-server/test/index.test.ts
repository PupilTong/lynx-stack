import { expect, test } from '@rstest/core';
import { createPuppeteerPage } from '../src/mcp/createPuppeteer.js';

test('simple screenshot', async () => {
  const page = await createPuppeteerPage(
    '/home/haoyang/lynx/lynx-stack/examples/react/dist/main.web.bundle',
  );
  const data = await page.screenshot({ fullPage: true, encoding: 'binary' });
  await expect().toMatchFileSnapshot('./snapshots/simple.txt');
});
