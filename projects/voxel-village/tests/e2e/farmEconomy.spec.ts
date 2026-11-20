import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
const output = path.resolve('projects/voxel-village/outputs/2026-11-15-farm-economy');
const panel = (p: Page) => p.getByRole('region', { name: '菜地操作' });
const bed = (p: Page) => p.getByRole('button', { name: '第1畦', exact: true });
async function enter(p: Page) {
  await p.goto('./');
  await expect(p.locator('canvas')).toHaveAttribute('data-scene-ready', 'true', { timeout: 60000 });
  await p.getByRole('button', { name: '菜地', exact: true }).click();
  await expect(p.locator('canvas')).toHaveAttribute('data-distance', '17.0');
  await expect(p.locator('canvas')).toHaveAttribute('data-camera-settled', 'true');
}
async function clickPlot(p: Page, item = 1) {
  const points = JSON.parse((await p.locator('canvas').getAttribute('data-farm-targets'))!);
  await p.mouse.click(points[0][item].x, points[0][item].y);
}
async function finish(p: Page) {
  await expect(panel(p)).toHaveAttribute('data-busy', 'false');
}

test('harvest, sell, buy and replant survive real page reloads with offline growth and no duplicate starter gifts', async ({
  page,
}) => {
  test.setTimeout(150000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await enter(page);
  await expect(page.locator('[data-coins]')).toHaveText('60');
  await expect(page.locator('[data-seeds="radish"]')).toHaveText('×2');
  await page.screenshot({ path: path.join(output, '01-field-wallet.png') });
  await clickPlot(page);
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await expect(bed(page)).toHaveAttribute('data-stage', 'seeding');
  await enter(page);
  await expect(bed(page)).toHaveAttribute('data-stage', 'empty');
  await expect(page.locator('[data-seeds="radish"]')).toHaveText('×2');
  await clickPlot(page);
  await finish(page);
  await expect(page.locator('[data-seeds="radish"]')).toHaveText('×1');
  await page.getByRole('button', { name: '浇水', exact: true }).click();
  await clickPlot(page);
  await finish(page);
  await page.goto('about:blank');
  await page.waitForTimeout(16000);
  await enter(page);
  await expect(bed(page)).toHaveAttribute('data-stage', 'thirsty');
  await expect(panel(page)).toHaveAttribute('data-growth', '0.5');
  await page.getByRole('button', { name: '浇水', exact: true }).click();
  await clickPlot(page);
  await finish(page);
  await page.goto('about:blank');
  await page.waitForTimeout(16000);
  await enter(page);
  await expect(bed(page)).toHaveAttribute('data-stage', 'ready');
  await page.getByRole('button', { name: '收菜', exact: true }).click();
  await clickPlot(page, 2);
  await finish(page);
  await enter(page);
  await expect(bed(page)).toHaveAttribute('data-picked', '2');
  await expect(page.locator('[data-crop="radish"]')).toHaveText('1');
  await page.getByRole('button', { name: '仓库', exact: true }).click();
  await expect(panel(page)).toHaveAttribute('data-view', 'warehouse');
  await page.screenshot({ path: path.join(output, '02-warehouse.png') });
  await page.getByRole('button', { name: '卖出一个萝卜', exact: true }).click();
  await expect(page.locator('[data-coins]')).toHaveText('66');
  await expect(page.getByRole('button', { name: '卖出一个萝卜', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '种子商店', exact: true }).click();
  await page.getByRole('button', { name: '购买萝卜种子', exact: true }).click();
  await expect(page.locator('[data-coins]')).toHaveText('54');
  await page.screenshot({ path: path.join(output, '03-seed-shop.png') });
  await enter(page);
  await expect(page.locator('[data-coins]')).toHaveText('54');
  await expect(page.locator('[data-seeds="radish"]')).toHaveText('×2');
  await expect(page.locator('[data-crop="radish"]')).toHaveText('0');
  await expect(bed(page)).toHaveAttribute('data-picked', '2');
  await page.getByRole('button', { name: '收菜', exact: true }).click();
  for (const item of [0, 1]) {
    await clickPlot(page, item);
    await finish(page);
  }
  await expect(bed(page)).toHaveAttribute('data-stage', 'empty');
  await page.getByRole('button', { name: '播种', exact: true }).click();
  await clickPlot(page);
  await finish(page);
  await expect(page.locator('[data-seeds="radish"]')).toHaveText('×1');
  await enter(page);
  await expect(bed(page)).toHaveAttribute('data-stage', 'thirsty');
  await expect(page.locator('[data-seeds="radish"]')).toHaveText('×1');
  await expect(page.locator('[data-crop="radish"]')).toHaveText('2');
  await page.getByRole('button', { name: '种子商店', exact: true }).click();
  await page.getByRole('button', { name: '购买南瓜种子', exact: true }).click();
  await expect(page.locator('[data-coins]')).toHaveText('22');
  await expect(page.getByRole('button', { name: '购买南瓜种子', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '购买番茄种子', exact: true }).click();
  await expect(page.locator('[data-coins]')).toHaveText('2');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(output, '04-shop-portrait.png') });
  for (const button of await panel(page).getByRole('button').all()) {
    const r = (await button.boundingBox())!;
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + r.width).toBeLessThanOrEqual(390);
    expect(r.y + r.height).toBeLessThanOrEqual(844);
  }
  await page.getByRole('button', { name: '仓库', exact: true }).click();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(1200);
  expect(await panel(page).evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
  for (const button of await panel(page).getByRole('button').all()) {
    const bounds = (await button.boundingBox())!;
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(844);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(390);
  }
  await page.screenshot({ path: path.join(output, '05-warehouse-landscape.png') });
  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveAttribute('data-view', 'field');
  await expect(page.locator('[data-crop="radish"]')).toHaveText('2');
  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('reports disabled storage instead of claiming that transactions are saved', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await enter(page);
  await expect(page.locator('.farm-save')).toHaveAttribute('data-saved', 'false');
  await expect(page.locator('.farm-save')).toContainText('未保存');
  await page.getByRole('button', { name: '种子商店', exact: true }).click();
  await page.getByRole('button', { name: '购买萝卜种子', exact: true }).click();
  await expect(page.locator('[data-coins]')).toHaveText('48');
  await expect(page.locator('.farm-save')).toHaveAttribute('data-saved', 'false');
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveAttribute('data-view', 'field');
  await page.getByRole('button', { name: '仓库', exact: true }).click();
  await expect(panel(page)).toHaveAttribute('data-view', 'warehouse');
  await page.getByRole('button', { name: '重试保存', exact: true }).click();
  await expect(page.locator('.farm-save')).toHaveAttribute('data-saved', 'false');
});
