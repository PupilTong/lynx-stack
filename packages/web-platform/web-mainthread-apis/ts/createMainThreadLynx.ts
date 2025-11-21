// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
import type {
  Cloneable,
  LynxContextEventTarget,
  MainThreadLynx,
} from '@lynx-js/web-constants';
import { templateManager } from './templateManager.js';
import type { MainThreadJSBinding } from './mtsBinding.js';

export function createMainThreadLynx(
  templateUrl: string,
  jsContext: LynxContextEventTarget,
  globalProps: Record<string, any>,
  SystemInfo: Record<string, any>,
  mtsBinding: MainThreadJSBinding,
): MainThreadLynx {
  const requestAnimationFrameBrowserImpl = requestAnimationFrame;
  const cancelAnimationFrameBrowserImpl = cancelAnimationFrame;
  const setTimeoutBrowserImpl = setTimeout;
  const clearTimeoutBrowserImpl = clearTimeout;
  const setIntervalBrowserImpl = setInterval;
  const clearIntervalBrowserImpl = clearInterval;
  return {
    getJSContext() {
      return jsContext;
    },
    requestAnimationFrame(cb: FrameRequestCallback) {
      return requestAnimationFrameBrowserImpl(cb);
    },
    cancelAnimationFrame(handler: number) {
      return cancelAnimationFrameBrowserImpl(handler);
    },
    __globalProps: globalProps,
    getCustomSectionSync(key: string) {
      return templateManager.getCustomSection(templateUrl, key) as Cloneable;
    },
    markPipelineTiming(pipelineId: string, timingKey: string) {
      mtsBinding.markTiming(pipelineId, timingKey);
    },
    SystemInfo,
    setTimeout: setTimeoutBrowserImpl,
    clearTimeout: clearTimeoutBrowserImpl,
    setInterval: setIntervalBrowserImpl,
    clearInterval: clearIntervalBrowserImpl,
  };
}
