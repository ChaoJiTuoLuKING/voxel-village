import { lakeFish } from '../features/farming/fishInventory';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { VillageStore } from '../state/villageStore';
import {
  crops,
  type Crop,
  type FarmAction,
  type FarmSnapshot,
  type FarmStage,
  type FarmTool,
} from '../features/farming/farmState';
gsap.registerPlugin(useGSAP);
const stageNames: Record<FarmStage, string> = {
  empty: '空地',
  seeding: '播种中',
  thirsty: '需要浇水',
  watering: '浇水中',
  growing: '生长中',
  ready: '可以采收',
  harvesting: '采收中',
};
function CropIcon({ crop, size = 26 }: { crop: Crop; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 12c-7-1-8-6-8-6 6-1 8 2 8 6Zm0 0c0-8 7-9 7-9 1 6-3 9-7 9Z" fill="#91ab60" />
      {crop === 'radish' ? (
        <path d="M8 13h16l-2 12-6 6-6-6Z" fill="#efd9b9" />
      ) : crop === 'tomato' ? (
        <circle cx="16" cy="21" r="10" fill="#dc8063" />
      ) : (
        <>
          <ellipse cx="16" cy="21" rx="12" ry="10" fill="#dca54d" />
          <ellipse cx="16" cy="21" rx="5" ry="10" stroke="#b57b37" strokeWidth="1.5" />
        </>
      )}
    </svg>
  );
}
function FishIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 40 32" aria-hidden="true">
      <path d="M8 16 1 8v16l7-8C18 0 32 5 39 16 32 27 18 32 8 16Z" fill="#9cbbb0" />
      <path d="m21 7 5 9-5 9" fill="#75998c" />
      <circle cx="31" cy="13" r="2" fill="#355749" />
    </svg>
  );
}
function ToolIcon({ tool }: { tool: FarmTool }) {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {tool === 'seed' ? (
        <>
          <path d="M8 7h16l-2 22H10Z" fill="#bd8a54" />
          <path d="M8 7h16v5H8Z" fill="#e6cb91" />
          <path
            d="M16 24v-8m0 4c-6 0-6-6-6-6 5 0 6 3 6 6Zm0-2c5 0 6-5 6-5-5 0-6 2-6 5Z"
            stroke="#436b3b"
            strokeWidth="2"
          />
        </>
      ) : tool === 'water' ? (
        <>
          <path d="M7 13h15v13H7Zm15 3 7-5v5l-7 7Z" fill="#659c94" />
          <path d="M8 15C0 14 1 25 8 23M11 13V8h8v5" stroke="#46796e" strokeWidth="3" />
          <path d="m28 20-1 5m4-3-1 5" stroke="#94cbd1" strokeWidth="2" />
        </>
      ) : (
        <>
          <path
            d="M9 27 5 17q-1-4 3-2l3 3V7q0-4 3-2v9-10q3-3 3 1v9-7q3-3 3 1v8-5q4-2 3 2v9l-4 6Z"
            fill="#e2be81"
            stroke="#a77c48"
            strokeWidth="1.3"
          />
        </>
      )}
    </svg>
  );
}
export function FarmPanel({
  store,
  state,
  paused,
}: {
  store: VillageStore;
  state: FarmSnapshot;
  paused: boolean;
}) {
  const root = useRef<HTMLElement>(null);
  const { contextSafe } = useGSAP({ scope: root });
  const bed = state.beds[state.selected]!;
  const send = (action: FarmAction) => store.dispatch({ type: 'farm', action });
  const choose = contextSafe((element: HTMLButtonElement, action: FarmAction) => {
    if ((paused && action.kind !== 'view') || state.busy) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.fromTo(
      element,
      { scaleX: reduce ? 1 : 1.14, scaleY: reduce ? 1 : 0.8, y: reduce ? 0 : 3 },
      {
        scaleX: 1,
        scaleY: 1,
        y: 0,
        duration: reduce ? 0 : 0.65,
        ease: 'elastic.out(1,.3)',
        overwrite: true,
      },
    );
    send(action);
  });
  const tools: { tool: FarmTool; label: string }[] = [
    { tool: 'seed', label: '播种' },
    { tool: 'water', label: '浇水' },
    { tool: 'harvest', label: '收菜' },
  ];
  const hint =
    state.tool === 'seed'
      ? `拿着${crops[state.seed].name}种子，点击田里的空地`
      : state.tool === 'water'
        ? '点击缺水的田畦，水会洒在你点的地方'
        : '点击成熟的作物，一株一株收进菜篮';
  return (
    <>
      <div className="farm-top glass">
        <span>
          小菜园 <small>亲手种点好东西</small>
        </span>
        <div>
          <button className="button" onClick={() => store.dispatch({ type: 'pause' })}>
            {paused ? '继续' : '暂停'}
          </button>
          <button className="button" onClick={() => send({ kind: 'exit' })}>
            退出菜地
          </button>
        </div>
      </div>
      <section
        ref={root}
        className="farm-panel glass farm-direct"
        aria-label="菜地操作"
        data-stage={bed.stage}
        data-selected={state.selected}
        data-tool={state.tool}
        data-view={state.view}
        data-busy={state.busy}
        data-growth={bed.growth}
        onKeyDownCapture={(event) => {
          if (event.repeat && (event.key === ' ' || event.key === 'Enter')) event.preventDefault();
        }}
      >
        <div className="farm-wallet">
          <span className="farm-coin" aria-hidden="true">
            ●
          </span>
          <b data-coins>{state.coins.toLocaleString()}</b>
          <span>金币</span>
          <small>一袋种一畦 · 每畦收三株</small>
        </div>
        <div className="farm-tabs" role="group" aria-label="农场功能">
          {(
            [
              { view: 'field', label: '田地' },
              { view: 'warehouse', label: '仓库' },
              { view: 'shop', label: '种子商店' },
            ] as const
          ).map(({ view, label }) => (
            <button
              key={view}
              className="button"
              aria-pressed={state.view === view}
              disabled={state.busy}
              onClick={(e) => choose(e.currentTarget, { kind: 'view', view })}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="farm-page" key={state.view}>
          {state.view === 'field' ? (
            <>
              <div className="farm-tool-row" role="group" aria-label="选择农具">
                {tools.map(({ tool, label }) => (
                  <button
                    key={tool}
                    className="button farm-round"
                    aria-label={label}
                    aria-pressed={state.tool === tool}
                    disabled={paused || state.busy}
                    onClick={(e) => choose(e.currentTarget, { kind: 'tool', tool })}
                  >
                    <ToolIcon tool={tool} />
                    <span>{label}</span>
                  </button>
                ))}
                <div className="farm-copy">
                  <strong>{paused ? '歇一会儿' : '选农具，再点田地'}</strong>
                  <p>{hint}</p>
                </div>
              </div>
              {state.tool === 'seed' && (
                <div className="farm-seeds" role="group" aria-label="选择种子">
                  {(Object.keys(crops) as Crop[]).map((crop) => (
                    <button
                      key={crop}
                      className="button"
                      aria-label={`${crops[crop].name}种子`}
                      aria-pressed={state.seed === crop}
                      disabled={paused || state.busy}
                      onClick={(e) => choose(e.currentTarget, { kind: 'crop', crop })}
                    >
                      <CropIcon crop={crop} size={19} />
                      {crops[crop].name} <b data-seeds={crop}>×{state.seedStock[crop]}</b>
                    </button>
                  ))}
                </div>
              )}
              <div className="farm-beds" role="group" aria-label="田地状态与键盘操作">
                {state.beds.map((b, i) => (
                  <button
                    key={i}
                    className="farm-bed button"
                    aria-label={`第${i + 1}畦`}
                    aria-pressed={state.selected === i}
                    data-stage={b.stage}
                    data-picked={b.picked.join(',')}
                    title="也可以点击这里，对这畦使用当前农具"
                    disabled={state.busy || paused}
                    onClick={() => send({ kind: 'use', bed: i })}
                  >
                    <CropIcon crop={b.crop} size={22} />
                    <span>
                      第{i + 1}畦 · {b.stage === 'empty' ? '待播种' : crops[b.crop].name}
                      <small>
                        {stageNames[b.stage]}
                        {b.stage === 'growing' ? ` ${Math.round(b.growth * 100)}%` : ''}
                      </small>
                    </span>
                    {b.stage === 'ready' && <i className="farm-ready-dot" />}
                  </button>
                ))}
              </div>
              <div className="farm-basket" aria-label="仓库收获">
                <span>仓库</span>
                {(Object.keys(crops) as Crop[]).map((crop) => (
                  <span key={crop}>
                    <CropIcon crop={crop} size={18} />
                    {crops[crop].name} <b data-crop={crop}>{state.basket[crop]}</b>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div
              className="farm-market"
              aria-label={state.view === 'warehouse' ? '共用仓库' : '种子货架'}
            >
              <div className="farm-market-heading">
                <strong>
                  {state.view === 'warehouse' ? '丰收都在这里' : '买袋种子，种下一季'}
                </strong>
                <small>
                  {state.view === 'warehouse'
                    ? `累计钓获 ${state.fishing.caught} · 已留 ${state.fishing.kept} · 放生 ${state.fishing.released}`
                    : '买好后回田地，选种子再点空地'}
                </small>
              </div>
              {(Object.keys(crops) as Crop[]).map((crop) => (
                <div key={crop} className="farm-market-row">
                  <div className="farm-goods-icon">
                    <CropIcon crop={crop} size={34} />
                  </div>
                  <div className="farm-goods-copy">
                    <b>
                      {crops[crop].name}
                      {state.view === 'shop' ? '种子' : ''}
                    </b>
                    <small>
                      {state.view === 'shop'
                        ? `持有 ${state.seedStock[crop]} 袋 · ${crops[crop].seedPrice} 金币 / 袋`
                        : `库存 ${state.basket[crop]} 个 · ${crops[crop].sellPrice} 金币 / 个`}
                    </small>
                  </div>
                  {state.view === 'shop' ? (
                    <button
                      className="button farm-trade"
                      aria-label={`购买${crops[crop].name}种子`}
                      disabled={paused || state.busy || state.coins < crops[crop].seedPrice}
                      onClick={(e) => choose(e.currentTarget, { kind: 'buy', crop })}
                    >
                      {state.coins < crops[crop].seedPrice ? '金币不足' : '买 1 袋'}
                    </button>
                  ) : (
                    <div className="farm-sell-actions">
                      <button
                        className="button farm-trade"
                        aria-label={`卖出一个${crops[crop].name}`}
                        disabled={paused || state.busy || !state.basket[crop]}
                        onClick={(e) => choose(e.currentTarget, { kind: 'sell', crop })}
                      >
                        卖 1 个
                      </button>
                      <button
                        className="button"
                        aria-label={`卖出全部${crops[crop].name}`}
                        disabled={paused || state.busy || !state.basket[crop]}
                        onClick={(e) => choose(e.currentTarget, { kind: 'sell', crop, all: true })}
                      >
                        全卖
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {state.view === 'warehouse' && (
                <div className="farm-market-row" data-fish-warehouse>
                  <div className="farm-goods-icon">
                    <FishIcon />
                  </div>
                  <div className="farm-goods-copy">
                    <b>湖鱼</b>
                    <small>
                      库存 <span data-warehouse-fish>{state.fishing.stock}</span> 条 ·{' '}
                      {lakeFish.sellPrice} 金币 / 条
                    </small>
                  </div>
                  <div className="farm-sell-actions">
                    <button
                      className="button farm-trade"
                      aria-label="卖出一条湖鱼"
                      disabled={paused || state.busy || !state.fishing.stock}
                      onClick={(e) => choose(e.currentTarget, { kind: 'sell', crop: 'fish' })}
                    >
                      卖 1 条
                    </button>
                    <button
                      className="button"
                      aria-label="卖出全部湖鱼"
                      disabled={paused || state.busy || !state.fishing.stock}
                      onClick={(e) =>
                        choose(e.currentTarget, { kind: 'sell', crop: 'fish', all: true })
                      }
                    >
                      全卖
                    </button>
                  </div>
                </div>
              )}
              {state.view === 'warehouse' && (
                <button
                  className="button farm-sell-all"
                  disabled={
                    paused ||
                    state.busy ||
                    (!Object.values(state.basket).some(Boolean) && !state.fishing.stock)
                  }
                  onClick={(e) => choose(e.currentTarget, { kind: 'sell', crop: 'all' })}
                >
                  全部出售 · +
                  {(Object.keys(crops) as Crop[]).reduce(
                    (sum, crop) => sum + state.basket[crop] * crops[crop].sellPrice,
                    state.fishing.stock * lakeFish.sellPrice,
                  )}{' '}
                  金币
                </button>
              )}
            </div>
          )}
        </div>
        <p className="farm-notice" role="status">
          {paused
            ? '已暂停，继续后再照料'
            : state.notice ||
              (state.view === 'warehouse'
                ? '蔬菜和鱼共用仓库，卖出后金币立即到账'
                : state.view === 'shop'
                  ? '买好的种子会保存在这里，下次回来还能种'
                  : '鼠标指向田地可以查看操作提示')}
        </p>
        <div
          className="farm-save"
          aria-live="polite"
          data-saved={state.saveStatus === '已自动保存'}
        >
          <span>{state.saveStatus || '正在准备存档'}</span>
          {state.saveStatus.startsWith('未保存') && (
            <button className="button" onClick={() => send({ kind: 'retry-save' })}>
              重试保存
            </button>
          )}
          <small>保存在当前浏览器 · 离开后继续生长，缺水会暂停</small>
        </div>
      </section>
    </>
  );
}
