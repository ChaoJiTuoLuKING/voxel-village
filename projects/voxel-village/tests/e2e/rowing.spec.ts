import { test, expect } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';
import path from 'node:path';
import { sampleRowingRoute } from '../../src/features/environment/rowingRoute';

test('selects and follows a boat in world coordinates; rowing remains visible from both sides', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-scene-ready', 'true', { timeout: 60000 });
  await page.getByRole('button', { name: '自由视角', exact: true }).click();
  await page.getByRole('combobox', { name: '选择观察位置' }).selectOption({ label: '湖上泛舟' });
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-distance')))
    .toBeLessThan(57);
  await expect(canvas).toHaveAttribute('data-camera-settled', 'true');
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await page.waitForTimeout(500);
  const time = Number(await canvas.getAttribute('data-animation-time'));
  const position = (await canvas.getAttribute('data-camera-position'))!.split(',').map(Number);
  const view = page.viewportSize()!;
  const camera = new PerspectiveCamera(50, view.width / view.height, 0.1, 2300);
  camera.position.set(position[0], position[1], position[2]);
  camera.lookAt(13, 5, 65);
  camera.updateMatrixWorld();
  const boat = sampleRowingRoute(time, 1);
  const target = new Vector3(
    boat.x + Math.cos(boat.heading),
    5.7,
    boat.z - Math.sin(boat.heading),
  ).project(camera);
  await page.mouse.click(((target.x + 1) / 2) * view.width, ((1 - target.y) / 2) * view.height);
  await expect(page.getByRole('complementary', { name: '村民信息' })).toContainText('小荷');
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-distance')))
    .toBeLessThan(14);
  await expect(canvas).toHaveAttribute('data-camera-settled', 'true');
  const focused = (await canvas.getAttribute('data-camera-position'))!.split(',').map(Number);
  expect(Math.hypot(focused[0] - boat.x, focused[2] - boat.z)).toBeLessThan(15);
  await page.getByRole('button', { name: '放大', exact: false }).click();
  await page.waitForTimeout(1400);
  await page.screenshot({
    path: path.resolve('projects/voxel-village/outputs/2026-11-14-lake-interaction/06-rowing.png'),
  });
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await page.waitForTimeout(1800);
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await page.mouse.move(800, 350);
  await page.mouse.down();
  await page.mouse.move(1000, 350, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(1400);
  await page.screenshot({
    path: path.resolve(
      'projects/voxel-village/outputs/2026-11-14-lake-interaction/07-rowing-side.png',
    ),
  });
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await expect
    .poll(
      async () => {
        const t = Number(await canvas.getAttribute('data-animation-time'));
        const p = ((t * 2.15 + 2) / (2 * Math.PI)) % 1;
        return p > 0.15 && p < 0.24;
      },
      { timeout: 12000, intervals: [80] },
    )
    .toBe(true);
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await page.getByRole('button', { name: '缩小', exact: false }).click();
  await page.keyboard.press('h');
  await page.waitForTimeout(1400);
  await page.screenshot({
    path: path.resolve(
      'projects/voxel-village/outputs/2026-11-14-lake-interaction/08-oars-in-water.png',
    ),
  });
});
