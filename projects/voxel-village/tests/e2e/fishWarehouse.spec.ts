import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
const out = path.resolve('projects/voxel-village/outputs/2026-11-15-shared-warehouse');
const fish = (page: Page) => page.getByRole('region', { name: '钓鱼操作' });
const farm = (page: Page) => page.getByRole('region', { name: '菜地操作' });
async function load(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.locator('canvas')).toHaveAttribute('data-scene-ready', 'true', {
    timeout: 60000,
  });
}
async function catchFish(page: Page) {
  await page.getByRole('button', { name: '甩竿', exact: true }).click();
  await expect(fish(page)).toHaveAttribute('data-stage', 'bite', { timeout: 15000 });
  await page.getByRole('button', { name: '提竿', exact: true }).click();
  const end = Date.now() + 65000;
  while ((await fish(page).getAttribute('data-stage')) === 'fighting' && Date.now() < end) {
    const surge = (await fish(page).getAttribute('data-surge')) === 'true';
    const tension = Number(
      await page.getByRole('progressbar', { name: '鱼线拉力' }).getAttribute('value'),
    );
    if (!surge && tension < 0.75)
      await page.getByRole('button', { name: '收线', exact: true }).click();
    await page.waitForTimeout(650);
  }
  await expect(fish(page)).toHaveAttribute('data-stage', 'landable');
  await page.getByRole('button', { name: '起鱼', exact: true }).click();
  await expect(fish(page)).toHaveAttribute('data-stage', 'caught');
}
test('lands a fish, reloads the pending catch, keeps it once, sells it and buys seeds with the shared coins', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await load(page);
  await page.getByRole('button', { name: '钓鱼', exact: true }).click();
  await catchFish(page);
  await expect(page.locator('[data-fish-caught]')).toHaveText('1');
  await load(page);
  await page.getByRole('button', { name: '钓鱼', exact: true }).click();
  await expect(fish(page)).toHaveAttribute('data-stage', 'caught');
  await expect(page.locator('[data-fish-caught]')).toHaveText('1');
  await page.screenshot({ path: path.join(out, '01-restored-catch.png') });
  await page.getByRole('button', { name: '收鱼', exact: true }).click();
  await load(page);
  await page.getByRole('button', { name: '钓鱼', exact: true }).click();
  await expect(fish(page)).toHaveAttribute('data-stage', 'ready');
  await expect(page.locator('[data-fish-stock]')).toHaveText('1');
  await page.getByRole('button', { name: '仓库 · 卖鱼', exact: true }).click();
  await expect(farm(page)).toHaveAttribute('data-view', 'warehouse');
  await expect(page.locator('[data-warehouse-fish]')).toHaveText('1');
  await expect(page.locator('canvas')).toHaveAttribute('data-distance', '17.0');
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-settled', 'true');
  await page.screenshot({ path: path.join(out, '02-shared-warehouse.png') });
  await page.getByRole('button', { name: '卖出一条湖鱼', exact: true }).click();
  await expect(page.locator('[data-coins]')).toHaveText('84');
  await expect(page.getByRole('button', { name: '卖出一条湖鱼', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '种子商店', exact: true }).click();
  await page.getByRole('button', { name: '购买萝卜种子', exact: true }).click();
  await expect(page.locator('[data-coins]')).toHaveText('72');
  await load(page);
  await page.getByRole('button', { name: '菜地', exact: true }).click();
  await expect(page.locator('[data-coins]')).toHaveText('72');
  await expect(page.locator('[data-seeds="radish"]')).toHaveText('×3');
  await page.getByRole('button', { name: '退出菜地', exact: true }).click();
  await page.getByRole('button', { name: '钓鱼', exact: true }).click();
  await expect(page.locator('[data-fishing-coins]')).toHaveText('72');
  await expect(page.locator('[data-fish-stock]')).toHaveText('0');
  await expect(page.locator('[data-fish-caught]')).toHaveText('1');
  expect(errors).toEqual([]);
});

test('field, warehouse and shop keep identical shell, tabs and footer positions on every viewport', async ({
  page,
}) => {
  await load(page);
  await page.getByRole('button', { name: '菜地', exact: true }).click();
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
    [844, 390],
    [390, 667],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(1000);
    let baseline: { x: number; y: number; width: number; height: number }[] | undefined;
    for (const name of ['田地', '仓库', '种子商店', '田地']) {
      await page.getByRole('button', { name, exact: true }).click();
      const boxes = await Promise.all(
        [farm(page), page.locator('.farm-tabs'), page.locator('.farm-save')].map(
          async (el) => (await el.boundingBox())!,
        ),
      );
      if (!baseline) baseline = boxes;
      for (let i = 0; i < boxes.length; i++)
        for (const key of ['x', 'y', 'width', 'height'] as const)
          expect(
            Math.abs(boxes[i]![key] - baseline[i]![key]),
            `${width}x${height} ${name} ${key}`,
          ).toBeLessThan(0.6);
      expect(boxes[0]!.y).toBeGreaterThanOrEqual(0);
      expect(boxes[0]!.y + boxes[0]!.height).toBeLessThanOrEqual(height);
      if (height !== 667) {
        await page.screenshot({ path: path.join(out, `${width}x${height}-${name}.png`) });
        expect(
          await page.locator('.farm-page').evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        ).toBe(true);
      }
    }
    await page.getByRole('button', { name: '浇水', exact: true }).click();
    expect((await farm(page).boundingBox())!.height).toBeCloseTo(baseline![0]!.height, 1);
    await page.getByRole('button', { name: '播种', exact: true }).click();
  }
});
