import { lakeFish } from '../features/farming/fishInventory';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { VillageStore } from '../state/villageStore';
import type {
  FishingAction,
  FishingSnapshot,
  FishingStage,
} from '../features/environment/fishingState';

gsap.registerPlugin(useGSAP);
const hints: Record<FishingStage, [string, string]> = {
  off: ['', ''],
  ready: ['选一处水面，甩一竿', '点选落点，再点击甩竿'],
  casting: ['甩出去了', '后摆 · 前甩 · 放线'],
  waiting: ['等浮漂明显下沉', '轻点是在试探，别急着提竿'],
  bite: ['咬钩了！', '现在提竿'],
  fighting: ['一下一下，慢慢收', '点一次收一段 · 停点就能缓力'],
  landable: ['鱼到岸边了', '把它提出水面吧'],
  landing: ['稳稳提起来', '小鱼正在出水'],
  caught: ['钓到一条湖鱼', `收进共用仓库，可卖 ${lakeFish.sellPrice} 金币；也可以放生`],
  releasing: ['回到湖里吧', '小鱼游走了'],
  keeping: ['已存入仓库', '收获已记录，准备再来一竿'],
  escaped: ['让它溜走了', '下一次，冲刺时先停一停'],
};
const actions: Partial<Record<FishingStage, [FishingAction, string]>> = {
  ready: ['cast', '甩竿'],
  waiting: ['hook', '提竿'],
  bite: ['hook', '提竿'],
  fighting: ['reel', '收线'],
  landable: ['land', '起鱼'],
  caught: ['keep', '收鱼'],
  escaped: ['retry', '再来'],
};
function ActionIcon({ stage }: { stage: FishingStage }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width="30"
      height="30"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {stage === 'fighting' ? (
        <>
          <circle cx="19" cy="20" r="10" />
          <circle cx="19" cy="20" r="4" />
          <path d="M19 20 30 28h5M19 10V5M9 20H4" />
        </>
      ) : stage === 'caught' || stage === 'landable' ? (
        <>
          <path d="M7 20c8-13 21-10 27 0-6 10-19 13-27 0ZM7 20 2 12v16l5-8" />
          <circle cx="27" cy="18" r="1" />
          <path d="m16 12 5 7-5 9" />
        </>
      ) : (
        <>
          <path d="m7 34 15-27q5-4 9 1M15 22l-5-3M30 8v16q0 8-6 8-5 0-5-5v-3l3 3" />
        </>
      )}
    </svg>
  );
}
export function FishingPanel({
  store,
  state,
  paused,
}: {
  store: VillageStore;
  state: FishingSnapshot;
  paused: boolean;
}) {
  const root = useRef<HTMLElement>(null),
    button = useRef<HTMLButtonElement>(null);
  const { contextSafe } = useGSAP({ scope: root });
  const [title, hint] = hints[state.stage];
  const current = actions[state.stage];
  const send = (action: FishingAction) => store.dispatch({ type: 'fishing', action });
  const activate = contextSafe(() => {
    if (paused || !current || !button.current) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.fromTo(
      button.current,
      { scaleX: reduce ? 1 : 1.13, scaleY: reduce ? 1 : 0.82, y: reduce ? 0 : 4 },
      {
        scaleX: 1,
        scaleY: 1,
        y: 0,
        duration: reduce ? 0 : 0.65,
        ease: 'elastic.out(1, 0.32)',
        overwrite: true,
      },
    );
    send(current[0]);
  });
  const openWarehouse = () => {
    send('exit');
    store.dispatch({ type: 'farm', action: { kind: 'enter' } });
    store.dispatch({ type: 'farm', action: { kind: 'view', view: 'warehouse' } });
  };
  const fighting = state.stage === 'fighting';
  return (
    <>
      <div className="fishing-top glass">
        <span>
          西岸 · 老江{' '}
          <small>
            金币 <b data-fishing-coins>{state.coins}</b> · 鱼篓 <b data-fish-stock>{state.kept}</b>
          </small>
        </span>
        <div>
          <button className="button" onClick={() => store.dispatch({ type: 'pause' })}>
            {paused ? '继续' : '暂停'}
          </button>
          <button className="button" onClick={() => send('exit')}>
            退出钓鱼
          </button>
        </div>
      </div>
      <section
        ref={root}
        className="fishing-panel glass"
        aria-label="钓鱼操作"
        data-stage={state.stage}
        data-surge={state.surge}
        data-reel-count={state.reelCount}
      >
        <div className="fishing-copy">
          <div className="fishing-status" aria-live="polite">
            <strong>
              {paused ? '已暂停' : fighting && state.surge ? '鱼在冲刺，先停一停' : title}
            </strong>
          </div>
          <p>{state.message || hint}</p>
          {fighting && (
            <div className="fishing-meters">
              <div className={`fishing-meter ${state.tension > 0.78 ? 'danger' : ''}`}>
                <span>{state.tension > 0.78 ? '太紧了，停一下' : '鱼线拉力'}</span>
                <progress aria-label="鱼线拉力" max={1} value={state.tension} />
              </div>
              <div className="fishing-meter">
                <span>离岸距离</span>
                <progress aria-label="离岸距离" max={1.15} value={state.distance} />
              </div>
            </div>
          )}
          {state.stage === 'caught' && (
            <button
              className="button fishing-release"
              disabled={paused}
              onClick={() => send('free')}
            >
              放回湖里 ↗
            </button>
          )}
          <div className="fishing-inventory">
            <span>
              累计钓获 <b data-fish-caught>{state.caughtTotal}</b> · 已留 {state.keptTotal} · 放生{' '}
              {state.releasedTotal}
            </span>
            <button
              className="button"
              onClick={openWarehouse}
              disabled={!['ready', 'caught', 'escaped'].includes(state.stage)}
            >
              仓库 · 卖鱼
            </button>
          </div>
          <small className="fishing-key-hint">{state.saveStatus || '点按操作 · 空格也可以'}</small>
        </div>
        <div className={`fishing-action-orbit ${fighting && state.tension > 0.78 ? 'danger' : ''}`}>
          <svg className="fishing-action-ring" viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="56" className="ring-track" />
            <circle
              cx="60"
              cy="60"
              r="56"
              className="ring-value"
              strokeDasharray="351.86"
              strokeDashoffset={
                351.86 * (1 - (fighting ? state.tension : state.stage === 'bite' ? 1 : 0))
              }
            />
          </svg>
          <button
            ref={button}
            className={`button fishing-round ${state.stage === 'bite' ? 'bite' : ''}`}
            disabled={paused || !current}
            onClick={activate}
            aria-label={current?.[1] ?? '进行中'}
            onKeyDown={(event) => {
              if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault();
                if (!event.repeat) activate();
              }
            }}
            onKeyUp={(event) => {
              if (event.key === ' ' || event.key === 'Enter') event.preventDefault();
            }}
          >
            <ActionIcon stage={state.stage} />
            <span>{current?.[1] ?? '…'}</span>
          </button>
        </div>
      </section>
    </>
  );
}
