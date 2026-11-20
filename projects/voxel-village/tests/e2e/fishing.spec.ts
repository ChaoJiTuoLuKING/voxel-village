import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { PerspectiveCamera, Vector3 } from 'three';
const output = path.resolve('projects/voxel-village/outputs/2026-11-14-lake-interaction-v2');
const panel = (page: Page) => page.getByRole('region', { name: '钓鱼操作' });
async function enter(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.locator('canvas')).toHaveAttribute('data-scene-ready', 'true', {
    timeout: 60000,
  });
  await page.getByRole('button', { name: '钓鱼', exact: true }).click();
  await expect(panel(page)).toHaveAttribute('data-stage', 'ready');
  await expect
    .poll(async () => Number(await page.locator('canvas').getAttribute('data-distance')))
    .toBeLessThan(29);
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-settled', 'true');
}
async function cast(page: Page) {
  await page.getByRole('button', { name: '甩竿', exact: true }).click();
  await expect(panel(page)).toHaveAttribute('data-stage', 'waiting', { timeout: 10000 });
}
async function catchFish(page: Page, capture: boolean) {
  await cast(page);
  if (capture) await page.screenshot({ path: path.join(output, '02-waiting.png') });
  await expect(panel(page)).toHaveAttribute('data-stage', 'bite', { timeout: 15000 });
  await page.getByRole('button', { name: '提竿', exact: true }).click();
  await expect(panel(page)).toHaveAttribute('data-stage', 'fighting');
  let tookShot = false;
  const end = Date.now() + 60000;
  while ((await panel(page).getAttribute('data-stage')) === 'fighting' && Date.now() < end) {
    const rushing = (await panel(page).getAttribute('data-surge')) === 'true';
    const tension = Number(
      await page.getByRole('progressbar', { name: '鱼线拉力' }).getAttribute('value'),
    );
    if (!rushing && tension < 0.75)
      await page.getByRole('button', { name: '收线', exact: true }).click();
    if (capture && rushing && !tookShot) {
      await page.screenshot({ path: path.join(output, '03-fighting.png') });
      tookShot = true;
    }
    await page.waitForTimeout(650);
  }
  await expect(panel(page)).toHaveAttribute('data-stage', 'landable');
  await page.getByRole('button', { name: '起鱼', exact: true }).click();
  await expect(panel(page)).toHaveAttribute('data-stage', 'caught', { timeout: 10000 });
  if (capture) await page.screenshot({ path: path.join(output, '04-caught.png') });
}

test('casts, reacts to a bite, manages tension, lands, releases and keeps a fish', async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await enter(page);
  await page.screenshot({ path: path.join(output, '01-ready.png') });
  await catchFish(page, true);
  await page.getByRole('button', { name: '放回湖里' }).click();
  await expect(panel(page)).toHaveAttribute('data-stage', 'ready', { timeout: 10000 });
  await catchFish(page, false);
  await page.getByRole('button', { name: '收鱼', exact: true }).click();
  await expect(panel(page)).toHaveAttribute('data-stage', 'ready', { timeout: 10000 });
  await expect(page.locator('.fishing-top')).toContainText('鱼篓 1');
  await page.getByRole('button', { name: '退出钓鱼' }).click();
  await expect(panel(page)).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: '场景控制' })).toBeVisible();
  await expect
    .poll(async () => Number(await page.locator('canvas').getAttribute('data-distance')))
    .toBeGreaterThan(175);
  await expect(page.locator('canvas')).toHaveAttribute('data-camera-settled', 'true');
  expect(errors).toEqual([]);
});

test('pause, missed bites, retry, lost focus, Escape and portrait touch controls', async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.setViewportSize({ width: 390, height: 844 });
  const touch = await page.context().newCDPSession(page);
  await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await enter(page);
  await page.screenshot({ path: path.join(output, '05-mobile.png') });
  const position = (await page.locator('canvas').getAttribute('data-camera-position'))!
    .split(',')
    .map(Number);
  const camera = new PerspectiveCamera(50, 390 / 844, 0.1, 2300);
  camera.position.set(position[0], position[1], position[2]);
  camera.lookAt(-38, 4.8, 52.2);
  camera.updateMatrixWorld();
  for (const x of [-2.8, 2.8])
    for (const z of [4.5, 8]) {
      const p = new Vector3(-38 + x, 3.2, 49.4 + z).project(camera);
      expect((p.x + 1) * 195).toBeGreaterThan(15);
      expect((p.x + 1) * 195).toBeLessThan(375);
      expect((1 - p.y) * 422).toBeGreaterThan(80);
      expect((1 - p.y) * 422).toBeLessThan(620);
    }
  const castButton = page.getByRole('button', { name: '甩竿', exact: true });
  const rect = (await castButton.boundingBox())!;
  const contact = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [contact] });
  await page.waitForTimeout(500);
  await expect(panel(page)).toHaveAttribute('data-stage', 'ready');
  await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(panel(page)).toHaveAttribute('data-stage', 'ready');
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [contact] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(panel(page)).toHaveAttribute('data-stage', 'waiting', { timeout: 10000 });
  await touch.detach();
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await page.waitForTimeout(600);
  const time = await page.locator('canvas').getAttribute('data-animation-time');
  await page.waitForTimeout(1800);
  await expect(panel(page)).toHaveAttribute('data-stage', 'waiting');
  expect(await page.locator('canvas').getAttribute('data-animation-time')).toBe(time);
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await expect(panel(page)).toHaveAttribute('data-stage', 'escaped', { timeout: 20000 });
  await page.getByRole('button', { name: '再来', exact: true }).click();
  await expect(panel(page)).toHaveAttribute('data-stage', 'ready');
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect
    .poll(async () => Number(await page.locator('canvas').getAttribute('data-distance')))
    .toBeLessThan(17);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(async () => Number(await page.locator('canvas').getAttribute('data-distance')))
    .toBeGreaterThan(27);
  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveCount(0);
  await page.getByRole('button', { name: '钓鱼', exact: true }).click();
  await expect(panel(page)).toHaveAttribute('data-stage', 'ready');
});

test('returns to the actual camera when entering fishing from the opening or walking', async ({
  page,
}) => {
  await page.goto('./');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene-ready', 'true', { timeout: 60000 });
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-opening-progress')))
    .toBeGreaterThan(0.01);
  for (const mode of ['opening', 'walk']) {
    if (mode === 'walk') {
      await page.getByRole('button', { name: '漫游', exact: true }).click();
      await expect(canvas).toHaveAttribute('data-camera', 'walk');
      await page.waitForTimeout(1200);
    }
    await page.getByRole('button', { name: '暂停', exact: true }).click();
    await page.waitForTimeout(500);
    const before = (await canvas.getAttribute('data-camera-position'))!.split(',').map(Number);
    await page.getByRole('button', { name: '钓鱼', exact: true }).click();
    await expect(panel(page)).toHaveAttribute('data-stage', 'ready');
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-distance')))
      .toBeLessThan(17);
    await expect(canvas).toHaveAttribute('data-camera-settled', 'true');
    await page.getByRole('button', { name: '退出钓鱼' }).click();
    await expect
      .poll(
        async () => {
          const after = (await canvas.getAttribute('data-camera-position'))!.split(',').map(Number);
          return Math.hypot(...after.map((value, i) => value - before[i]));
        },
        { timeout: 15000 },
      )
      .toBeLessThan(mode === 'walk' ? 0.8 : 0.4);
  }
});

test('click launches a complete casting motion and the round action button springs back', async ({
  page,
}) => {
  await enter(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const button = page.getByRole('button', { name: '甩竿', exact: true });
  await button.click();
  await expect(panel(page)).toHaveAttribute('data-stage', 'casting');
  const round = page.locator('.fishing-round');
  await expect
    .poll(
      () =>
        round.evaluate((e) => {
          const m = new DOMMatrix(getComputedStyle(e).transform);
          return Math.abs(m.a - 1) + Math.abs(m.d - 1) + Math.abs(m.f);
        }),
      { intervals: [20] },
    )
    .toBeGreaterThan(0.03);
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(output, 'cast-01-backswing.png') });
  await page.waitForTimeout(360);
  await page.screenshot({ path: path.join(output, 'cast-02-release.png') });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(output, 'cast-03-flight.png') });
  await expect
    .poll(() =>
      round.evaluate((e) => {
        const m = new DOMMatrix(getComputedStyle(e).transform);
        return Math.abs(m.a - 1) + Math.abs(m.d - 1) + Math.abs(m.f);
      }),
    )
    .toBeLessThan(0.001);
  await expect(panel(page)).toHaveAttribute('data-stage', 'waiting');
  await expect(panel(page)).toHaveAttribute('data-stage', 'bite', { timeout: 15000 });
  await page.getByRole('button', { name: '提竿', exact: true }).click();
  const reel = page.getByRole('button', { name: '收线', exact: true });
  const r = (await reel.boundingBox())!;
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.down();
  const before = await panel(page).getAttribute('data-reel-count');
  await page.waitForTimeout(700);
  expect(await panel(page).getAttribute('data-reel-count')).toBe(before);
  await page.mouse.up();
  await expect(panel(page)).toHaveAttribute('data-reel-count', String(Number(before) + 1));
  await page.waitForTimeout(500);
  await reel.click();
  await expect(panel(page)).toHaveAttribute('data-reel-count', String(Number(before) + 2));
});

test('reserves the fishing pier through pause and releases it on exit and Escape', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await enter(page);
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-fishing-pier-reserved', 'true');
  await expect(canvas).toHaveAttribute('data-fishing-pier-visitors', '0');
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await page.getByRole('button', { name: '退出钓鱼', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-fishing-pier-reserved', 'false');
  await page.getByRole('button', { name: '钓鱼', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-fishing-pier-reserved', 'true');
  await expect(canvas).toHaveAttribute('data-fishing-pier-visitors', '0');
  await page.keyboard.press('Escape');
  await expect(canvas).toHaveAttribute('data-fishing-pier-reserved', 'false');
  await page.getByRole('button', { name: '钓鱼', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-camera-settled', 'true');
  await page.getByRole('button', { name: '甩竿', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-fishing-pier-visitors', '0');
  await page.screenshot({
    path: path.resolve('projects/voxel-village/outputs/2026-11-15-fishing-pier/01-clear-pier.png'),
  });
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});
