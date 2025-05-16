import { test, expect } from './coverage-fixture.js';
import type { Page } from '@playwright/test';

const wait = async (ms: number) => {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

const diffScreenShot = async (
  page: Page,
  caseName: string,
  subcaseName: string,
  label: string = 'index',
  screenshotOptions?: Parameters<
    ReturnType<typeof expect<Page>>['toHaveScreenshot']
  >[0],
) => {
  await expect(page).toHaveScreenshot([
    `${caseName}`,
    `${subcaseName}`,
    `${label}.png`,
  ], {
    maxDiffPixelRatio: 0,
    fullPage: true,
    animations: 'allow',
    ...screenshotOptions,
  });
};

const goto = async (
  page: Page,
  testname: string,
  hasDir?: boolean,
) => {
  let url = `/fp-only?casename=${testname}`;
  if (hasDir) {
    url += '&hasdir=true';
  }
  await page.goto(url, {
    waitUntil: 'load',
  });
  await page.evaluate(() => document.fonts.ready);
};

test.describe('SSR no Javascript tests', () => {
  test('basic-pink-rect', async ({ page }, { title }) => {
    await goto(page, title);
    await wait(100);
    const target = await page.locator('#target');
    await expect(target).toHaveCSS('height', '100px');
    await expect(target).toHaveCSS('width', '100px');
    await expect(target).toHaveCSS('background-color', 'rgb(255, 192, 203)');
  });
  test('basic-class-selector', async ({ page }, { title }) => {
    await goto(page, title);
    await wait(100);
    const computedStyle = await page.locator('#target').evaluate((dom) => {
      const style = getComputedStyle(dom);
      const height = style.height;
      const width = style.width;
      const backgroundColor = style.backgroundColor;
      return {
        height,
        width,
        backgroundColor,
      };
    });
    expect(computedStyle.height).toBe('100px');
    expect(computedStyle.width).toBe('100px');
    expect(computedStyle.backgroundColor).toBe('rgb(255, 192, 203)');
  });
});
