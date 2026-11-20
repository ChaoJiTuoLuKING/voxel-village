import { useCallback, useMemo, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useScene } from '@visual/react-scene';
import type { SceneFactory } from '@visual/scene-kit';
import { createVillageStore } from '../state/villageStore';
import { Toolbar } from '../ui/Toolbar';
import './styles.css';

gsap.registerPlugin(useGSAP);

function Village({ version }: { version: number }) {
  const store = useMemo(createVillageStore, [version]);
  const root = useRef<HTMLElement>(null);
  const factory = useCallback<SceneFactory>(
    async (canvas, options) => {
      const { createVillageScene } = await import('../scene/createVillageScene');
      options.signal.throwIfAborted();
      return createVillageScene(canvas, options, store);
    },
    [store],
  );
  const { canvasRef, ready, label, progress, error } = useScene(factory);
  useGSAP(
    () => {
      if (!ready) return;
      const media = gsap.matchMedia();
      media.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.toolbar', { y: 18, autoAlpha: 0, duration: 0.55, ease: 'power2.out' });
      });
      return () => media.revert();
    },
    { scope: root, dependencies: [ready], revertOnUpdate: true },
  );
  return (
    <main ref={root} className="village-app">
      <canvas
        ref={canvasRef}
        className="scene-canvas"
        aria-label="可交互的体素山谷村庄"
        tabIndex={0}
      />
      {ready && <Toolbar store={store} />}
      {!ready && (
        <div className="loading" role={error ? 'alert' : 'status'}>
          <div>{error ? `场景加载失败：${error}` : label}</div>
          {!error && <progress aria-label="村庄生成进度" max={100} value={progress} />}
          {error && (
            <button className="button" onClick={() => window.location.reload()}>
              重新载入
            </button>
          )}
        </div>
      )}
    </main>
  );
}

export default function App() {
  const [version, setVersion] = useState(0);
  // Available only in development for lifecycle verification, never in production UI.
  return (
    <>
      <Village version={version} />
      {import.meta.env.DEV && (
        <button
          className="reload-scene"
          aria-label="重新创建场景"
          onClick={() => setVersion((value) => value + 1)}
        >
          ↻
        </button>
      )}
    </>
  );
}
