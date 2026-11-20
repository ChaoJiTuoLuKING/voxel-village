import { describe, expect, it } from 'vitest';
import { createFishingState } from '../src/features/environment/fishingState';

function advance(game: ReturnType<typeof createFishingState>, seconds: number) {
  for (let t = 0; t < seconds; t += 1 / 60) game.step(1 / 60);
}
function cast(game: ReturnType<typeof createFishingState>) {
  game.action('enter');
  game.action('cast');
  advance(game, 2.5);
  expect(game.stage).toBe('waiting');
}
function hook(game: ReturnType<typeof createFishingState>) {
  cast(game);
  for (let i = 0; i < 600 && game.stage !== 'bite'; i++) game.step(1 / 60);
  expect(game.stage).toBe('bite');
  game.action('hook');
  expect(game.stage).toBe('fighting');
}
function catchFish(game: ReturnType<typeof createFishingState>) {
  hook(game);
  for (let i = 0; i < 2400 && game.stage === 'fighting'; i++) {
    const state = game.snapshot();
    if (i % 48 === 0 && !state.surge && state.tension < 0.75) game.action('reel');
    game.step(1 / 60);
  }
  expect(game.stage).toBe('landable');
  game.action('land');
  advance(game, 2.3);
  expect(game.stage).toBe('caught');
}
describe('fishing interaction', () => {
  it('requires a cast, bite and managed line tension before landing; releases and keeps fish', () => {
    const game = createFishingState();
    game.action('land');
    expect(game.stage).toBe('off');
    catchFish(game);
    game.action('free');
    advance(game, 2.3);
    expect(game.stage).toBe('ready');
    expect(game.snapshot().kept).toBe(0);
    catchFish(game);
    game.action('keep');
    game.action('keep');
    advance(game, 2.3);
    expect(game.snapshot().kept).toBe(1);
    expect(game.stage).toBe('ready');
  });
  it('handles early, missed and over-strained hooks, with retry', () => {
    const early = createFishingState();
    cast(early);
    early.action('hook');
    expect(early.stage).toBe('escaped');
    early.action('retry');
    expect(early.stage).toBe('ready');
    const missed = createFishingState();
    cast(missed);
    advance(missed, 12);
    expect(missed.stage).toBe('escaped');
    const strained = createFishingState();
    hook(strained);
    for (let i = 0; i < 900; i++) {
      strained.action('reel');
      strained.step(1 / 60);
    }
    expect(strained.stage).toBe('escaped');
  });
  it('pauses simulation and each click only winds one short segment', () => {
    const game = createFishingState();
    hook(game);
    game.action('reel');
    const before = game.snapshot();
    game.step(0);
    expect(game.snapshot()).toEqual(before);
    advance(game, 0.5);
    expect(game.snapshot().reeling).toBe(false);
    const distance = game.snapshot().distance;
    advance(game, 0.5);
    expect(game.snapshot().distance).toBeGreaterThan(distance);
    expect(game.snapshot().reelCount).toBe(1);
    game.action('reel');
    game.action('cancel');
    expect(game.snapshot().reeling).toBe(false);
    game.action('exit');
    game.action('reel');
    expect(game.stage).toBe('off');
  });
});

it('clears the previous catch message when starting another cast', () => {
  const game = createFishingState();
  catchFish(game);
  game.action('free');
  advance(game, 2.3);
  expect(game.snapshot().message).not.toBe('');
  game.action('cast');
  expect(game.snapshot().message).toBe('');
});

it('restores a landed fish after refresh, credits it only once and keeps shared statistics after sale', async () => {
  const { createFarmState } = await import('../src/features/farming/farmState');
  const account = createFarmState();
  const bind = () => {
    const game = createFishingState();
    game.bindLedger({
      read: () => account.fishingSnapshot(),
      sync() {},
      land() {
        account.landFish();
      },
      resolve: (keep) => account.resolveFish(keep),
    });
    return game;
  };
  const original = bind();
  catchFish(original);
  expect(account.fishingSnapshot().pending).toBe(true);
  const resumed = bind();
  resumed.action('enter');
  expect(resumed.stage).toBe('caught');
  resumed.action('keep');
  resumed.action('keep');
  const afterKeep = bind();
  afterKeep.action('enter');
  expect(afterKeep.stage).toBe('ready');
  expect(afterKeep.snapshot()).toMatchObject({ kept: 1, caughtTotal: 1, keptTotal: 1, coins: 60 });
  account.action({ kind: 'enter' });
  account.action({ kind: 'sell', crop: 'fish' });
  expect(afterKeep.snapshot()).toMatchObject({ kept: 0, caughtTotal: 1, keptTotal: 1, coins: 84 });
});
