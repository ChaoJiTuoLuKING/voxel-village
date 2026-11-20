import { useEffect, useRef, useState } from 'react';
import type { SceneFactory, SceneHandle } from '@visual/scene-kit';

/** Factory identity is stable: changing it intentionally destroys/recreates a scene. */
export function useScene(factory: SceneFactory) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState({
    ready: false,
    progress: 0,
    label: '准备场景…',
    error: '',
  });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const controller = new AbortController();
    let handle: SceneHandle | undefined;
    setStatus({ ready: false, progress: 0, label: '准备场景…', error: '' });
    const onError = (error: Error) => {
      if (!controller.signal.aborted)
        setStatus((s) => ({ ...s, ready: false, error: error.message }));
    };
    void Promise.resolve()
      .then(() => {
        controller.signal.throwIfAborted();
        return factory(canvas, {
          signal: controller.signal,
          onError,
          onProgress: (label, progress) => {
            if (!controller.signal.aborted) setStatus((s) => ({ ...s, label, progress }));
          },
        });
      })
      .then((scene) => {
        if (controller.signal.aborted) scene.dispose();
        else {
          handle = scene;
          setStatus((s) => ({ ...s, ready: !s.error, progress: 100 }));
        }
      })
      .catch(onError);
    return () => {
      controller.abort();
      handle?.dispose();
    };
  }, [factory]);
  return { canvasRef, ...status };
}
