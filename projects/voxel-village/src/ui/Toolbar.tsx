import { useSyncExternalStore } from 'react';
import type { CameraMode, VillageStore } from '../state/villageStore';
import { FarmPanel } from './FarmPanel';
import { FishingPanel } from './FishingPanel';
import { cameraPresets } from '../features/camera/presets';

const modes: [CameraMode, string][] = [
  ['explore', '自由视角'],
  ['free', '环视'],
  ['walk', '漫游'],
  ['tour', '导览'],
  ['opening', '开场'],
];
export function Toolbar({ store }: { store: VillageStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  if (state.farm)
    return (
      <>
        <FarmPanel store={store} state={state.farm} paused={state.paused} />
        {state.hover && (
          <div className="hover-label glass" style={{ left: state.hover.x, top: state.hover.y }}>
            {state.hover.name}
          </div>
        )}
      </>
    );
  if (state.fishing)
    return <FishingPanel store={store} state={state.fishing} paused={state.paused} />;
  if (state.hidden)
    return (
      <button className="button show-ui glass" onClick={() => store.dispatch({ type: 'hide' })}>
        显示界面
      </button>
    );
  return (
    <>
      {state.tip && <div className="tip glass">{state.tip}</div>}
      {state.hover && (
        <div className="hover-label glass" style={{ left: state.hover.x, top: state.hover.y }}>
          {state.hover.name}
        </div>
      )}
      {state.focus && (
        <aside className="focus-card glass" aria-label="村民信息">
          <b>{state.focus.name}</b>
          <span>{state.focus.action}</span>
          {state.focus.name === '青菜婶' && (
            <button
              className="button"
              onClick={() => store.dispatch({ type: 'farm', action: { kind: 'enter' } })}
            >
              照料菜地
            </button>
          )}
          {state.focus.name === '老江' && (
            <button
              className="button"
              onClick={() => store.dispatch({ type: 'fishing', action: 'enter' })}
            >
              一起钓鱼
            </button>
          )}
          <button
            className="button"
            aria-label="关闭村民信息"
            onClick={() => store.dispatch({ type: 'close' })}
          >
            ✕
          </button>
        </aside>
      )}
      {state.mode === 'explore' && (
        <section className="free-camera-panel glass" aria-label="自由视角控制">
          <select
            className="camera-location"
            aria-label="选择观察位置"
            defaultValue=""
            onChange={(event) => {
              store.dispatch({ type: 'shot', index: Number(event.currentTarget.value) });
              event.currentTarget.value = '';
            }}
          >
            <option value="" disabled>
              选择观察位置
            </option>
            {cameraPresets.map((preset, index) => (
              <option key={preset.name} value={index}>
                {preset.name}
              </option>
            ))}
          </select>
          <div className="camera-actions">
            <button
              className="button"
              onClick={() => store.dispatch({ type: 'zoom', factor: 0.7 })}
            >
              ＋ 放大
            </button>
            <button
              className="button"
              onClick={() => store.dispatch({ type: 'zoom', factor: 1 / 0.7 })}
            >
              − 缩小
            </button>
            <button
              className="button"
              onClick={() => store.dispatch({ type: 'elevate', amount: 5 })}
            >
              升高
            </button>
            <button
              className="button"
              onClick={() => store.dispatch({ type: 'elevate', amount: -5 })}
            >
              降低
            </button>
            <button className="button" onClick={() => store.dispatch({ type: 'shot', index: 0 })}>
              全景
            </button>
          </div>
          <p className="desktop-camera-hint">
            拖拽旋转 · 右键平移 · 滚轮缩放
            <br />
            WASD 移动 · Q/E 升降 · Shift 加速
          </p>
          <p className="touch-camera-hint">单指旋转 · 双指缩放和平移</p>
        </section>
      )}
      <nav className="toolbar glass" aria-label="场景控制">
        <button
          className="button"
          onClick={() => store.dispatch({ type: 'farm', action: { kind: 'enter' } })}
        >
          菜地
        </button>
        <button
          className="button"
          onClick={() => store.dispatch({ type: 'fishing', action: 'enter' })}
        >
          钓鱼
        </button>
        {modes.map(([value, label]) => (
          <button
            key={value}
            className="button"
            aria-pressed={state.mode === value}
            onClick={() => store.dispatch({ type: 'mode', value })}
          >
            {label}
          </button>
        ))}
        <button className="button" onClick={() => store.dispatch({ type: 'shot' })}>
          视角
        </button>
        <button
          className="button"
          aria-pressed={state.paused}
          onClick={() => store.dispatch({ type: 'pause' })}
        >
          {state.paused ? '继续' : '暂停'}
        </button>
        <button
          className="button"
          aria-pressed={state.dusk}
          onClick={() => store.dispatch({ type: 'day' })}
        >
          昼/暮
        </button>
        <button className="button" onClick={() => store.dispatch({ type: 'reset' })}>
          重置
        </button>
        <button className="button" onClick={() => store.dispatch({ type: 'hide' })}>
          隐藏界面
        </button>
      </nav>
    </>
  );
}
