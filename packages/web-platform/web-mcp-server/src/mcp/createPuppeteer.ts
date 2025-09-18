import puppeteer from 'puppeteer';
import {
  JSON_TEMPLATE_BASE,
  WEB_PROJECT_BASE,
  MOCKED_URL_BASE,
} from '../../constants.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..'); // we bundle the code to dist/mcp
const browser = await puppeteer.launch({ headless: true });
export async function createPuppeteerPage(templateJsonPath: string) {
  const jsonLocation = path.dirname(templateJsonPath);
  const page = await browser.newPage();
  page.setRequestInterception(true);
  page.on('request', async (interceptedRequest) => {
    if (interceptedRequest.isInterceptResolutionHandled()) return;
    try {
      if (interceptedRequest.url().startsWith(WEB_PROJECT_BASE)) {
        const requestUrl = new URL(interceptedRequest.url());
        const fileCandidate = path.join(
          projectRoot,
          'dist',
          requestUrl.pathname,
        );
        const fileContent = await fs.readFile(fileCandidate);
        interceptedRequest.respond({
          status: 200,
          body: fileContent,
          headers: {
            'Access-Control-Allow-Origin': '*',
          },
        });
        return;
      }
      if (interceptedRequest.url().startsWith(MOCKED_URL_BASE)) {
        const requestUrl = new URL(interceptedRequest.url());
        const fileCandidate = path.join(
          jsonLocation,
          requestUrl.pathname.replace(new URL(JSON_TEMPLATE_BASE).pathname, ''),
        );
        const fileContent = await fs.readFile(fileCandidate);
        interceptedRequest.respond({
          status: 200,
          body: fileContent,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': fileCandidate.endsWith('.json')
              ? 'application/json'
              : undefined,
          },
        });
        return;
      }
    } catch {
    }
    interceptedRequest.continue();
  });
  await page.goto(
    WEB_PROJECT_BASE + `index.html?casename=${path.basename(templateJsonPath)}`,
  );
  // Wait for the lynx-view element to be present
  await page.waitForSelector(`lynx-view >>> [lynx-tag="page"]`);
  return page;
}
