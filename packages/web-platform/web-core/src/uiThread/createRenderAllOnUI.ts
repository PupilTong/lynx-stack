import {
  type StartMainThreadContextConfig,
  type RpcCallType,
  type updateDataEndpoint,
  lynxUniqueIdAttribute,
} from '@lynx-js/web-constants';
import type { MainThreadRuntime } from '@lynx-js/web-mainthread-apis';
import { Rpc } from '@lynx-js/web-worker-rpc';

const {
  prepareMainThreadAPIs,
} = await import('@lynx-js/web-mainthread-apis');

export function createRenderAllOnUI(
  mainToBackgroundRpc: Rpc,
  shadowRoot: ShadowRoot,
  isSSR: boolean,
  markTimingInternal: (
    timingKey: string,
    pipelineId?: string,
    timeStamp?: number,
  ) => void,
  callbacks: {
    onError?: () => void;
  },
) {
  if (!globalThis.module) {
    Object.assign(globalThis, { module: {} });
  }
  const { startMainThread } = prepareMainThreadAPIs(
    mainToBackgroundRpc,
    shadowRoot,
    document.createElement.bind(document),
    () => {},
    markTimingInternal,
    () => {
      callbacks.onError?.();
    },
  );
  let runtime!: MainThreadRuntime;
  const start = async (configs: StartMainThreadContextConfig) => {
    if (isSSR) {
      // the node 1 is the root element <page>, therefore the 0 is just a placeholder
      const lynxUniqueIdToElement: WeakRef<HTMLElement>[] = [
        new WeakRef<HTMLElement>(shadowRoot.firstElementChild as HTMLElement),
      ];
      const allLynxElements = shadowRoot.querySelectorAll<HTMLElement>(
        `[${lynxUniqueIdAttribute}]`,
      );
      const length = allLynxElements.length;
      for (let ii = 0; ii < length; ii++) {
        const element = allLynxElements[ii]!;
        lynxUniqueIdToElement.push(new WeakRef<HTMLElement>(element));
      }
      runtime = await startMainThread(configs, { lynxUniqueIdToElement });
    } else {
      runtime = await startMainThread(configs);
    }
  };
  const updateDataMainThread: RpcCallType<typeof updateDataEndpoint> = async (
    ...args
  ) => {
    runtime.updatePage?.(...args);
  };
  return {
    start,
    updateDataMainThread,
  };
}
