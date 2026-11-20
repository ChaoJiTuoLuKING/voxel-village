import { createFarmPersistence } from '../features/farming/farmSave';
import { Vector3 } from 'three';
import { bedCenters, plantOffsets } from '../features/farming/farmLayout';
import { createRuntime, type SceneOptions } from '@visual/scene-kit';
import gsap from 'gsap';
import type { VillageStore } from '../state/villageStore';
import { createWorld } from '../world/createWorld';
import { createHouses } from '../features/buildings/createHouses';
import { createLandmarks } from '../features/buildings/createLandmarks';
import { createProps } from '../features/buildings/createProps';
import { createPaths } from '../features/paths/createPaths';
import { createVegetation } from '../features/vegetation/createVegetation';
import { createMeshBuilder } from './geometry/createMeshBuilder';
import { buildVoxelMesh } from '../features/buildings/buildVoxelMesh';
import { buildMountainTerrain } from '../features/terrain/buildMountainTerrain';
import { createAlpineBackdrop } from '../features/terrain/createAlpineBackdrop';
import { createDetails } from '../features/buildings/createDetails';
import { createLighting } from '../features/lighting/createLighting';
import { createDayCycle } from '../features/lighting/createDayCycle';
import { createWater } from '../features/water/createWater';
import { createWaterfalls } from '../features/water/createWaterfalls.ts';
import { createEnvironment } from '../features/environment/createEnvironment';
import { createMountainGarden } from '../features/environment/createMountainGarden';
import { createParticles } from '../features/environment/createParticles';
import { prepareCountryside, createCountryside } from '../features/environment/createCountryside';
import { createLakeLife } from '../features/environment/createLakeLife';
import { createVillageLife } from '../features/environment/createVillageLife';
import { createVillagers } from '../features/villagers/createVillagers';
import { createCameraController } from '../features/camera/createCameraController';
import { bindInput } from '../features/camera/bindInput';

/** Composition root only: feature implementations stay in their owning folders. */
export async function createVillageScene(
  canvas: HTMLCanvasElement,
  options: SceneOptions,
  store: VillageStore,
) {
  const runtime = createRuntime(canvas, options, { fov: 50, far: 2300, exposure: 0.88 });
  const { scene, renderer, lifetime, stage } = runtime;
  try {
    await stage('生成地形与水系…', 8);
    const world = createWorld();
    await stage('搭建建筑与地标…', 25);
    const buildings = createHouses(world);
    const landmarks = createLandmarks(world, buildings.doors);
    // Own GPU objects before the next asynchronous boundary.
    scene.add(landmarks.mill);
    createProps(world);
    prepareCountryside(world);
    const paths = createPaths(world, buildings.doors);
    await stage('种植森林与细节…', 50);
    const vegetation = createVegetation(world);
    await stage('构建网格…', 65);
    const mesh = createMeshBuilder(scene);
    const voxels = buildVoxelMesh(world, mesh);
    const terrain = buildMountainTerrain(world, scene);
    createAlpineBackdrop(scene);
    createDetails(world, buildings, vegetation, voxels.smallFlowers, mesh);
    createCountryside(world, mesh);
    const lighting = createLighting(scene);
    const time = { value: 0 };
    const water = createWater(world, runtime, time);
    const environment = createEnvironment(world, scene, mesh, terrain.heightAt, terrain.terraces);
    const mountainGarden = createMountainGarden(scene, terrain.heightAt, environment.trees);
    const falls = createWaterfalls(runtime, time);
    await stage('加入村民与动态…', 90);
    const particles = createParticles(world, runtime, buildings.chims, falls.wfx, falls.wfz, false);
    createVillageLife(scene, mesh, environment.ANI);
    const lakeLife = createLakeLife(world, scene, store);
    let farmStorage: Storage | null = null;
    try {
      farmStorage = window.localStorage;
    } catch {
      /* The game remains usable with an explicit save error. */
    }
    const farmSave = createFarmPersistence(lakeLife.farm.machine, farmStorage);
    lakeLife.farm.setPersistence(farmSave);
    lakeLife.fishing.machine.bindLedger({
      read: () => lakeLife.farm.machine.fishingSnapshot(),
      sync: () => farmSave.sync(),
      land() {
        farmSave.sync();
        lakeLife.farm.machine.landFish();
        farmSave.flush();
      },
      resolve(keep) {
        farmSave.sync();
        const result = lakeLife.farm.machine.resolveFish(keep);
        farmSave.flush();
        return result;
      },
    });
    lifetime.listen(window, 'pagehide', () => farmSave.flush());
    lifetime.listen(window, 'storage', () => farmSave.sync());
    lifetime.listen(document, 'visibilitychange', () => {
      if (document.hidden) farmSave.flush();
    });
    lifetime.defer(() => farmSave.flush());
    const villagers = createVillagers(world, scene, paths);
    const dayCycle = createDayCycle(scene, lighting, water, voxels.wm, environment.cm, falls.wfm);
    const controls = createCameraController(runtime, world, store, terrain.heightAt);
    const input = bindInput(
      runtime,
      store,
      controls,
      [...villagers.vils, ...lakeLife.actors],
      landmarks.hit,
      lakeLife.fishing,
      lakeLife.farm,
    );
    const day = { value: 0 };
    lifetime.defer(
      store.onCommand((command) => {
        if (command.type === 'farm') {
          lakeLife.farm.action(command.action);
          lakeLife.update(elapsed);
        }
        if (
          command.type === 'fishing' &&
          !(command.action === 'enter' && store.getSnapshot().farm)
        ) {
          lakeLife.fishing.action(command.action);
          lakeLife.update(elapsed);
          villagers.pierAccess.setActive(Boolean(store.getSnapshot().fishing));
        }
        if (['reset', 'mode', 'shot'].includes(command.type) && store.getSnapshot().farm)
          store.dispatch({ type: 'farm', action: { kind: 'exit' } });
        if (command.type === 'pause') lakeLife.fishing.action('cancel');
        if (['reset', 'mode', 'shot'].includes(command.type) && store.getSnapshot().fishing)
          store.dispatch({ type: 'fishing', action: 'exit' });
        if (command.type === 'day')
          gsap.to(day, {
            value: store.getSnapshot().dusk ? 1 : 0,
            duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1.8,
            ease: 'power2.inOut',
            overwrite: true,
          });
      }),
    );
    lifetime.defer(() => {
      gsap.killTweensOf(day);
      canvas.dataset.sceneReady = 'false';
    });
    let elapsed = 0,
      slow = 1 / 60;
    const sail = landmarks.mill.getObjectByName('sail');
    runtime.start((delta, _realTime, frame) => {
      const state = store.getSnapshot(),
        dt = state.paused ? 0 : delta;
      villagers.pierAccess.setActive(Boolean(state.fishing));
      elapsed += dt;
      time.value = elapsed;
      dayCycle.applyDay(day.value);
      if (dt > 0) environment.ANI.forEach((animate: (time: number) => void) => animate(elapsed));
      if (sail) sail.rotation.z += dt * 0.5;
      if (dt > 0) lakeLife.update(elapsed);
      falls.update(elapsed);
      if (dt > 0) {
        particles.update(dt, elapsed);
        villagers.update(dt, elapsed, input.getHovered());
      }
      controls.update(delta, dt);
      if (frame % 3 === 0) water.updateReflection();
      renderer.render(scene, runtime.camera);
      slow = slow * 0.97 + delta * 0.03;
      if (frame % 180 === 0 && slow > 0.04 && runtime.size.pixelRatio > 1)
        runtime.setPixelRatio(Math.max(1, runtime.size.pixelRatio - 0.25));
      // Observable without exposing mutable scene objects on window.
      if (frame === 1 || frame % 15 === 0)
        Object.assign(canvas.dataset, {
          fps: (1 / Math.max(0.001, slow)).toFixed(1),
          farmTargets: state.farm
            ? JSON.stringify(
                bedCenters.map((bed, index) =>
                  plantOffsets.map((offset, item) => {
                    const crop = lakeLife.farm.machine.beds[index]!;
                    const y =
                      crop.stage === 'ready'
                        ? crop.crop === 'tomato'
                          ? 0.66
                          : crop.crop === 'pumpkin'
                            ? 0.28
                            : 0.1
                        : 0.1;
                    const point = new Vector3(
                      bed.x,
                      lakeLife.farm.ground + 0.2 + y,
                      bed.z + offset,
                    ).project(runtime.camera);
                    return {
                      x: ((point.x + 1) * runtime.size.width) / 2,
                      y: ((1 - point.y) * runtime.size.height) / 2,
                      item,
                    };
                  }),
                ),
              )
            : '',
          farmStage: lakeLife.farm.machine.beds[lakeLife.farm.machine.selected]!.stage,
          farmReach: Math.max(...lakeLife.farm.actor.reach).toFixed(3),
          fishingPierReserved: String(villagers.pierAccess.active),
          fishingPierVisitors: String(villagers.pierAccess.visitors),
          triangles: String(renderer.info.render.triangles),
          camera: state.mode,
          animationTime: elapsed.toFixed(2),
          distance: controls.getDistance().toFixed(1),
          cameraSettled: String(controls.isSettled()),
          lookElevation: controls.getLookElevation().toFixed(1),
          openingProgress: controls.getOpeningProgress().toFixed(3),
          cameraPosition: runtime.camera.position
            .toArray()
            .map((value) => value.toFixed(1))
            .join(','),
          dusk: day.value.toFixed(2),
        });
    });
    Object.assign(canvas.dataset, {
      sceneReady: 'true',
      houses: String(buildings.houses.length),
      trees: String(vegetation.treeCenters.length),
      mountainTerraces: String(terrain.terraces.length),
      mountainTrees: String(environment.trees.length),
      mountainFlowers: String(mountainGarden.flowers.length),
      mountainShrubs: String(mountainGarden.shrubs.length),
      mountainMeadowTrees: String(mountainGarden.trees.length),
      voxels: String(world.M.size),
      villagers: String(villagers.vils.length + lakeLife.actors.length),
      boats: String(lakeLife.boats.length),
      farms: '6',
    });
    await stage('完成', 100);
    return { dispose: runtime.dispose };
  } catch (error) {
    runtime.dispose();
    throw error;
  }
}
