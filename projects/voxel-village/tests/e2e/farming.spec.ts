import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
const output = path.resolve('projects/voxel-village/outputs/2026-11-15-farming-mouse');
const panel = (page: Page) => page.getByRole('region', { name: '菜地操作' });
const bed = (page: Page, i: number) =>
  page.getByRole('button', { name: `第${i + 1}畦`, exact: true });
async function enter(page: Page, reduce = true) {
  await page.emulateMedia({ reducedMotion: reduce ? 'reduce' : 'no-preference' });
  await page.goto('./');
  await expect(page.locator('canvas')).toHaveAttribute('data-scene-ready', 'true', {
    timeout: 60000,
  });
  await page.getByRole('button', { name: '菜地', exact: true }).click();
  await expect(page.locator('canvas')).toHaveAttribute('data-distance', '17.0');
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-settled', 'true');
  await expect(page.locator('canvas')).not.toHaveAttribute('data-farm-targets', '');
}
async function location(page: Page, index: number, item = 1) {
  const targets = JSON.parse((await page.locator('canvas').getAttribute('data-farm-targets'))!);
  return targets[index][item] as { x: number; y: number };
}
async function clickField(page: Page, index: number, item = 1) {
  const p = await location(page, index, item);
  await page.mouse.click(p.x, p.y);
}
async function finish(page: Page) {
  await expect(panel(page)).toHaveAttribute('data-busy', 'false');
}

test('mouse tools plant, water and harvest all three crops out of order without duplicated inventory', async ({
  page,
}) => {
  test.setTimeout(140000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await enter(page);
  await page.screenshot({ path: path.join(output, '01-tools-and-soil.png') });
  for (const [i, name] of ['萝卜', '番茄', '南瓜'].entries()) {
    await page.getByRole('button', { name: `${name}种子`, exact: true }).click();
    await expect(bed(page, i)).toHaveAttribute('data-stage', 'empty');
    const p = await location(page, i);
    await page.mouse.move(p.x, p.y);
    await expect(page.locator('.hover-label')).toContainText('点击播种');
    expect(await page.locator('canvas').evaluate((el) => el.style.cursor)).toContain(
      'data:image/svg+xml',
    );
    await clickField(page, i);
    await finish(page);
    await expect(bed(page, i)).toHaveAttribute('data-stage', 'thirsty');
  }
  await page.getByRole('button', { name: '浇水', exact: true }).click();
  for (let i = 0; i < 3; i++) {
    await clickField(page, i);
    if (i === 0) {
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(output, '02-water-at-pointer.png') });
    }
    await finish(page);
    await expect(bed(page, i)).toHaveAttribute('data-stage', 'growing');
  }
  await page.screenshot({ path: path.join(output, '03-seedlings.png') });
  for (let i = 0; i < 3; i++) {
    await expect(bed(page, i)).toHaveAttribute('data-stage', 'thirsty', { timeout: 35000 });
    await clickField(page, i);
    await finish(page);
  }
  await expect(bed(page, 2)).toHaveAttribute('data-stage', 'ready', { timeout: 35000 });
  await page.getByRole('button', { name: '收菜', exact: true }).click();
  await page.mouse.move(20, 500);
  await page.screenshot({ path: path.join(output, '04-mature-crops.png') });
  for (const [i, crop] of ['radish', 'tomato', 'pumpkin'].entries()) {
    for (const [n, item] of [2, 0, 1].entries()) {
      await clickField(page, i, item);
      if (crop === 'pumpkin' && n === 0) {
        await page.waitForTimeout(380);
        await page.screenshot({ path: path.join(output, '05-pumpkin-to-basket.png') });
      }
      await finish(page);
      await expect(page.locator(`[data-crop="${crop}"]`)).toHaveText(String(n + 1));
      await expect(bed(page, i)).toHaveAttribute(
        'data-picked',
        [2, 0, 1].slice(0, n + 1).join(','),
      );
    }
  }
  await page.screenshot({ path: path.join(output, '06-baskets.png') });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '菜地', exact: true }).click();
  for (const crop of ['radish', 'tomato', 'pumpkin'])
    await expect(page.locator(`[data-crop="${crop}"]`)).toHaveText('3');
  expect(errors).toEqual([]);
});

test('mouse targeting rejects wrong tools, repeated clicks, drag and cancelled touch; pause and responsive layouts work', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await enter(page, false);
  await page.getByRole('button', { name: '浇水', exact: true }).click();
  expect(
    await page
      .getByRole('button', { name: '浇水', exact: true })
      .evaluate((el) => getComputedStyle(el).transform),
  ).not.toBe('none');
  await clickField(page, 0);
  await expect(panel(page).getByRole('status')).toContainText('先播种');
  await expect(bed(page, 0)).toHaveAttribute('data-stage', 'empty');
  await page.getByRole('button', { name: '播种', exact: true }).click();
  const p = await location(page, 0);
  await page.mouse.click(p.x, p.y, { button: 'right' });
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x + 30, p.y);
  await page.mouse.up();
  const touch = await page.context().newCDPSession(page);
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: p.x, y: p.y, id: 7 }],
  });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await touch.detach();
  await expect(bed(page, 0)).toHaveAttribute('data-stage', 'empty');
  await page.mouse.dblclick(p.x, p.y);
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await expect(bed(page, 0)).toHaveAttribute('data-stage', 'seeding');
  await page.waitForTimeout(950);
  await expect(bed(page, 0)).toHaveAttribute('data-stage', 'seeding');
  await page.getByRole('button', { name: '退出菜地', exact: true }).click();
  await page.getByRole('button', { name: '菜地', exact: true }).click();
  await expect(bed(page, 0)).toHaveAttribute('data-stage', 'empty');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-settled', 'true');
  await page.waitForTimeout(800);
  await clickField(page, 2);
  await finish(page);
  await expect(bed(page, 2)).toHaveAttribute('data-stage', 'thirsty');
  await page.screenshot({ path: path.join(output, '07-portrait.png') });
  for (const b of await panel(page).getByRole('button').all()) {
    const bounds = (await b.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: '浇水', exact: true }).click();
  await clickField(page, 2);
  await finish(page);
  await expect(bed(page, 2)).toHaveAttribute('data-stage', 'growing');
  for (const button of await panel(page).getByRole('button').all()) {
    const bounds = (await button.boundingBox())!;
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(844);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(390);
  }
  await page.screenshot({ path: path.join(output, '08-landscape.png') });
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('button', { name: '继续', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await page.locator('canvas').evaluate((el) => el.style.cursor)).toBe('grab');
  await page.getByRole('button', { name: '钓鱼', exact: true }).click();
  await expect(page.getByRole('region', { name: '钓鱼操作' })).toBeVisible();
  expect(errors).toEqual([]);
});
