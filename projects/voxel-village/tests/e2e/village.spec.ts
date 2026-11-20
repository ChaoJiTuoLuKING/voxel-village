import { test, expect, type Page } from '@playwright/test';

async function ready(page: Page) {
  await expect(page.locator('canvas')).toHaveAttribute('data-scene-ready', 'true', {
    timeout: 60_000,
  });
  await expect(page.getByRole('navigation', { name: '场景控制' })).toBeVisible();
  await expect
    .poll(() => page.locator('canvas').getAttribute('data-animation-time'), { timeout: 30_000 })
    .not.toBe('0.00');
}
test('renders offline from local dependencies, preserves controls and resizes', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.route('**/*', (route) =>
    new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort(),
  );
  await page.goto('./');
  await ready(page);
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-houses', '30');
  await expect(canvas).toHaveAttribute('data-villagers', '39');
  await expect(canvas).toHaveAttribute('data-boats', '5');
  await expect(canvas).toHaveAttribute('data-farms', '6');
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await expect(page.getByRole('button', { name: '继续', exact: true })).toBeVisible();
  // Wait for an observed render while paused, then check simulation time stays fixed.
  await page.waitForTimeout(700);
  const pausedTime = await canvas.getAttribute('data-animation-time');
  await page.waitForTimeout(700);
  expect(await canvas.getAttribute('data-animation-time')).toBe(pausedTime);
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await expect.poll(() => canvas.getAttribute('data-animation-time')).not.toBe(pausedTime);
  await page.getByRole('button', { name: '导览', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-camera', 'tour');
  await page.mouse.move(800, 400);
  await page.mouse.wheel(0, 150);
  await expect(canvas).toHaveAttribute('data-camera', 'free');
  await page.getByRole('button', { name: '漫游', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-camera', 'walk');
  const before = await canvas.getAttribute('data-camera-position');
  await page.keyboard.down('w');
  await page.waitForTimeout(800);
  await page.keyboard.up('w');
  await expect.poll(() => canvas.getAttribute('data-camera-position')).not.toBe(before);
  await page.keyboard.press('Escape');
  await expect(canvas).toHaveAttribute('data-camera', 'free');
  await page.getByRole('button', { name: '昼/暮', exact: true }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-dusk')), { timeout: 15_000 })
    .toBeGreaterThan(0.95);
  await page.getByRole('button', { name: '隐藏界面', exact: true }).click();
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await page.getByRole('button', { name: '显示界面', exact: true }).click();
  await page.getByRole('button', { name: '视角', exact: true }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-distance')), { timeout: 15_000 })
    .toBeLessThan(100);
  await page.getByRole('button', { name: '重置', exact: true }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-distance')), { timeout: 15_000 })
    .toBeGreaterThan(120);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => canvas.evaluate((element) => element.getBoundingClientRect().width))
    .toBe(390);
  await expect(page.getByRole('button', { name: '环视', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('survives repeated React remounts without duplicate canvases, commands or WebGL errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' || /Too many active WebGL contexts/.test(message.text()))
      errors.push(message.text());
  });
  await page.goto('./');
  await ready(page);
  for (let index = 0; index < 3; index++) {
    await page.getByRole('button', { name: '重新创建场景' }).click();
    await ready(page);
    await expect(page.locator('canvas')).toHaveCount(1);
    await page.keyboard.press('p');
    await expect(page.getByRole('button', { name: '继续', exact: true })).toBeVisible();
    await page.keyboard.press('p');
    await expect(page.getByRole('button', { name: '暂停', exact: true })).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('opening descends continuously, pauses, hands off and replays', async ({ page }) => {
  await page.goto('./');
  await ready(page);
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-camera', 'opening');
  const start = (await canvas.getAttribute('data-camera-position'))!.split(',').map(Number);
  expect(start[2]).toBeGreaterThan(160);
  expect(start[1]).toBeGreaterThan(190);
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await page.waitForTimeout(600);
  const paused = await canvas.getAttribute('data-opening-progress');
  await page.waitForTimeout(600);
  expect(await canvas.getAttribute('data-opening-progress')).toBe(paused);
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-opening-progress')), {
      timeout: 40_000,
    })
    .toBeGreaterThan(0.5);
  const lakePass = (await canvas.getAttribute('data-camera-position'))!.split(',').map(Number);
  expect(lakePass[2]).toBeGreaterThan(75);
  expect(lakePass[2]).toBeLessThan(140);
  expect(lakePass[1]).toBeLessThan(130);
  await expect(canvas).toHaveAttribute('data-camera', 'free', { timeout: 60000 });
  await expect(canvas).toHaveAttribute('data-opening-progress', '1.000');
  const endpoint = (await canvas.getAttribute('data-camera-position'))!.split(',').map(Number);
  expect(endpoint[2]).toBeLessThan(20);
  expect(Number(await canvas.getAttribute('data-look-elevation'))).toBeGreaterThan(15);
  await page.waitForTimeout(500);
  expect((await canvas.getAttribute('data-camera-position'))!.split(',').map(Number)).toEqual(
    endpoint,
  );
  await page.getByRole('button', { name: '开场', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-camera', 'opening');
  await page.waitForTimeout(600);
  const before = (await canvas.getAttribute('data-camera-position'))!.split(',').map(Number);
  await page.keyboard.press('Escape');
  await expect(canvas).toHaveAttribute('data-camera', 'free');
  const after = (await canvas.getAttribute('data-camera-position'))!.split(',').map(Number);
  expect(Math.hypot(...after.map((value, i) => value - before[i]))).toBeLessThan(3);
  await page.getByRole('button', { name: '开场', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-camera', 'opening');
  await page.mouse.move(800, 400);
  await page.mouse.down();
  await page.mouse.move(830, 405);
  await page.mouse.up();
  await expect(canvas).toHaveAttribute('data-camera', 'free');
});

test('reduced motion starts with the settled valley view', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await ready(page);
  await expect(page.locator('canvas')).toHaveAttribute('data-camera', 'free');
});

test('waterfall view renders moving water and freezes its visible flow when paused', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('./');
  await ready(page);
  await page.getByRole('button', { name: '自由视角', exact: true }).click();
  await page.getByRole('combobox', { name: '选择观察位置' }).selectOption({ label: '林间瀑布' });
  await page.waitForTimeout(2500);
  // Fixed crop of the middle water curtain, excluding the nearby moving birds and props.
  const clip = { x: 855, y: 345, width: 45, height: 95 };
  const flowing = await page.screenshot({ clip });
  await page.waitForTimeout(500);
  expect((await page.screenshot({ clip })).equals(flowing)).toBe(false);
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await page.waitForTimeout(700);
  const paused = await page.screenshot({ clip });
  await page.waitForTimeout(500);
  expect((await page.screenshot({ clip })).equals(paused)).toBe(true);
  await page.getByRole('button', { name: '昼/暮', exact: true }).click();
  await expect
    .poll(async () => Number(await page.locator('canvas').getAttribute('data-dusk')))
    .toBeGreaterThan(0.95);
  expect(errors).toEqual([]);
});

test('free viewpoint supports close detail, wide views, rotation, movement and visible controls', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('./');
  await ready(page);
  const canvas = page.locator('canvas');
  await page.getByRole('button', { name: '自由视角', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-camera', 'explore');
  await expect(page.getByRole('region', { name: '自由视角控制' })).toBeVisible();
  await page.getByRole('combobox', { name: '选择观察位置' }).selectOption({ label: '东岸垂钓' });
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-distance')))
    .toBeLessThan(36);
  // Explicit controls work even when a trackpad/browser does not forward the wheel.
  for (let k = 0; k < 6; k++)
    await page.getByRole('button', { name: '＋ 放大', exact: true }).click();
  await expect.poll(async () => Number(await canvas.getAttribute('data-distance'))).toBeLessThan(5);
  for (let k = 0; k < 14; k++)
    await page.getByRole('button', { name: '− 缩小', exact: true }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-distance')))
    .toBeGreaterThan(350);
  await page.getByRole('button', { name: '全景', exact: true }).click();
  await expect
    .poll(async () => Math.abs(Number(await canvas.getAttribute('data-distance')) - 176))
    .toBeLessThan(0.2);
  const before = await canvas.getAttribute('data-camera-position');
  await page.mouse.move(800, 350);
  await page.mouse.down();
  await page.mouse.move(1050, 400, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => canvas.getAttribute('data-camera-position')).not.toBe(before);
  await page.waitForTimeout(700);
  const rotated = await canvas.getAttribute('data-camera-position');
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(1000, 320, { steps: 6 });
  await page.mouse.up({ button: 'right' });
  await expect.poll(() => canvas.getAttribute('data-camera-position')).not.toBe(rotated);
  await page.waitForTimeout(700);
  const height = Number((await canvas.getAttribute('data-camera-position'))!.split(',')[1]);
  await page.keyboard.down('e');
  await page.waitForTimeout(700);
  await page.keyboard.up('e');
  await expect
    .poll(async () => Number((await canvas.getAttribute('data-camera-position'))!.split(',')[1]))
    .toBeGreaterThan(height + 3);
  await page.waitForTimeout(500);
  const moved = await canvas.getAttribute('data-camera-position');
  await page.keyboard.down('w');
  await page.waitForTimeout(600);
  await page.keyboard.up('w');
  await expect.poll(() => canvas.getAttribute('data-camera-position')).not.toBe(moved);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: '＋ 放大', exact: true })).toBeInViewport();
  await expect(page.getByRole('button', { name: '全景', exact: true })).toBeInViewport();
  await expect(canvas).toHaveAttribute('data-camera', 'explore');
  expect(errors).toEqual([]);
});

test('mountain viewpoints look upward and keep that pitch when dragging or leaving exploration', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await ready(page);
  const canvas = page.locator('canvas');
  await page.getByRole('button', { name: '自由视角', exact: true }).click();
  for (const label of ['仰望群峰', '瀑底仰望']) {
    await page.getByRole('combobox', { name: '选择观察位置' }).selectOption({ label });
    await expect
      .poll(async () => Number(await canvas.getAttribute('data-look-elevation')))
      .toBeGreaterThan(15);
    await expect(canvas).toHaveAttribute('data-distance', label === '仰望群峰' ? '232.0' : '119.0');
    await expect(canvas).toHaveAttribute('data-camera-settled', 'true');
  }
  const before = Number(await canvas.getAttribute('data-look-elevation'));
  // A small horizontal drag used to snap the pitch back to a downward-only clamp.
  await page.mouse.move(780, 400);
  await page.mouse.down();
  await page.mouse.move(790, 400, { steps: 3 });
  await page.mouse.up();
  await page.waitForTimeout(1200);
  expect(Number(await canvas.getAttribute('data-look-elevation'))).toBeGreaterThan(before - 1);
  await page.mouse.down();
  await page.mouse.move(790, 380, { steps: 3 });
  await page.mouse.up();
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-look-elevation')))
    .toBeGreaterThan(before + 2);
  await expect(canvas).toHaveAttribute('data-camera-settled', 'true');
  const position = await canvas.getAttribute('data-camera-position');
  await page.keyboard.press('Escape');
  await expect(canvas).toHaveAttribute('data-camera', 'free');
  expect(await canvas.getAttribute('data-camera-position')).toBe(position);
  expect(Number(await canvas.getAttribute('data-look-elevation'))).toBeGreaterThan(15);
});
