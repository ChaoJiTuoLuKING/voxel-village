/** Every listener, timer and animation belongs to one scene lifetime. */
export class Lifetime {
  readonly controller = new AbortController();
  private cleanups: (() => void)[] = [];
  get signal() {
    return this.controller.signal;
  }
  get disposed() {
    return this.signal.aborted;
  }

  defer(cleanup: () => void) {
    if (this.disposed) cleanup();
    else this.cleanups.push(cleanup);
    return cleanup;
  }

  listen<K extends keyof WindowEventMap>(
    target: Window,
    event: K,
    listener: (event: WindowEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void;
  listen<K extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    event: K,
    listener: (event: HTMLElementEventMap[K]) => void,
    options?: AddEventListenerOptions,
  ): void;
  listen(
    target: EventTarget,
    event: string,
    listener: EventListener,
    options?: AddEventListenerOptions,
  ): void;
  listen(
    target: EventTarget,
    event: string,
    listener: EventListener,
    options: AddEventListenerOptions = {},
  ) {
    target.addEventListener(event, listener, { ...options, signal: this.signal });
  }

  dispose = () => {
    if (this.disposed) return;
    this.controller.abort();
    const errors: unknown[] = [];
    for (const cleanup of this.cleanups.splice(0).reverse()) {
      try {
        cleanup();
      } catch (error) {
        errors.push(error);
      }
    }
    if (errors.length) console.error('Scene cleanup failed', new AggregateError(errors));
  };
}
