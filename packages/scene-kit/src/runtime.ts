import {
  ACESFilmicToneMapping,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';
import { Lifetime } from './lifetime';
import { disposeObjectTree } from './dispose';

export interface SceneHandle {
  dispose(): void;
}
export interface SceneOptions {
  signal: AbortSignal;
  onProgress: (label: string, progress: number) => void;
  onError: (error: Error) => void;
}
export type SceneFactory = (
  canvas: HTMLCanvasElement,
  options: SceneOptions,
) => SceneHandle | Promise<SceneHandle>;

export interface RuntimeConfig {
  maxPixelRatio?: number;
  fov?: number;
  near?: number;
  far?: number;
  exposure?: number;
}

export function createRuntime(
  canvas: HTMLCanvasElement,
  options: SceneOptions,
  config: RuntimeConfig = {},
) {
  options.signal.throwIfAborted();
  const lifetime = new Lifetime();
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });
  const scene = new Scene();
  const camera = new PerspectiveCamera(
    config.fov ?? 50,
    1,
    config.near ?? 0.15,
    config.far ?? 1000,
  );
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = config.exposure ?? 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  const size = {
    width: 1,
    height: 1,
    pixelRatio: Math.min(window.devicePixelRatio || 1, config.maxPixelRatio ?? 1.5),
  };
  const resizeCallbacks = new Set<() => void>();
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    size.width = Math.max(1, rect.width);
    size.height = Math.max(1, rect.height);
    renderer.setPixelRatio(size.pixelRatio);
    renderer.setSize(size.width, size.height, false);
    camera.aspect = size.width / size.height;
    camera.updateProjectionMatrix();
    resizeCallbacks.forEach((callback) => callback());
  };
  lifetime.defer(() => {
    disposeObjectTree(scene);
    renderer.dispose();
    // React may recreate a factory on the same connected canvas (HMR/props).
    // Losing that context would also break the next renderer using this canvas.
    if (!canvas.isConnected) renderer.forceContextLoss();
  });
  lifetime.listen(canvas, 'webglcontextlost', (event) => {
    event.preventDefault();
    options.onError(new Error('图形上下文已丢失，请重新载入场景。'));
    lifetime.dispose();
  });
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  lifetime.defer(() => observer.disconnect());
  options.signal.addEventListener('abort', lifetime.dispose, { once: true });
  lifetime.defer(() => options.signal.removeEventListener('abort', lifetime.dispose));
  resize();

  const stage = async (label: string, progress: number) => {
    lifetime.signal.throwIfAborted();
    options.onProgress(label, progress);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    lifetime.signal.throwIfAborted();
  };
  const start = (update: (delta: number, elapsed: number, frame: number) => void) => {
    let request = 0,
      previous = 0,
      elapsed = 0,
      frame = 0;
    const tick = (now: number) => {
      if (lifetime.disposed) return;
      const delta = previous ? Math.min(0.05, (now - previous) / 1000) : 0;
      previous = now;
      try {
        elapsed += delta;
        update(delta, elapsed, ++frame);
      } catch (error) {
        options.onError(error instanceof Error ? error : new Error(String(error)));
        lifetime.dispose();
        return;
      }
      request = requestAnimationFrame(tick);
    };
    const visibility = () => {
      cancelAnimationFrame(request);
      previous = 0;
      if (!document.hidden && !lifetime.disposed) request = requestAnimationFrame(tick);
    };
    lifetime.listen(document, 'visibilitychange', visibility);
    lifetime.defer(() => cancelAnimationFrame(request));
    visibility();
  };
  return {
    renderer,
    scene,
    camera,
    lifetime,
    size,
    stage,
    start,
    onResize: (callback: () => void) => {
      resizeCallbacks.add(callback);
      callback();
    },
    setPixelRatio: (value: number) => {
      size.pixelRatio = value;
      resize();
    },
    dispose: lifetime.dispose,
  };
}
export type SceneRuntime = ReturnType<typeof createRuntime>;
