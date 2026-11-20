import { expect, it, vi } from 'vitest';
import { createVillageStore } from '../src/state/villageStore';
it('does not notify React about unchanged snapshots, and removes command subscribers', () => {
  const store = createVillageStore(),
    stateListener = vi.fn(),
    commandListener = vi.fn();
  store.subscribe(stateListener);
  const detach = store.onCommand(commandListener);
  store.set({ paused: false });
  expect(stateListener).not.toHaveBeenCalled();
  store.set({ paused: true });
  expect(stateListener).toHaveBeenCalledOnce();
  store.dispatch({ type: 'pause' });
  detach();
  store.dispatch({ type: 'pause' });
  expect(commandListener).toHaveBeenCalledOnce();
});
