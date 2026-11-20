import { describe, expect, it, vi } from 'vitest';
import { Lifetime } from './lifetime';

describe('scene lifetime', () => {
  it('removes listeners and runs cleanup in reverse order exactly once', () => {
    const lifetime = new Lifetime(),
      target = new EventTarget(),
      listener = vi.fn(),
      order: number[] = [];
    lifetime.listen(target, 'change', listener);
    lifetime.defer(() => order.push(1));
    lifetime.defer(() => order.push(2));
    target.dispatchEvent(new Event('change'));
    lifetime.dispose();
    lifetime.dispose();
    target.dispatchEvent(new Event('change'));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(order).toEqual([2, 1]);
    expect(lifetime.signal.aborted).toBe(true);
    const late = vi.fn();
    lifetime.defer(late);
    expect(late).toHaveBeenCalledOnce();
  });
  it('continues releasing remaining resources when one cleanup fails', () => {
    const lifetime = new Lifetime(),
      release = vi.fn();
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    lifetime.defer(release);
    lifetime.defer(() => {
      throw new Error('faulty resource');
    });
    lifetime.dispose();
    expect(release).toHaveBeenCalledOnce();
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
  });
});
