// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
import {
  flushElementTreeEndpoint,
  postOffscreenEventtEndpoint,
  type PageConfig,
} from '@lynx-js/web-constants';
import type { Rpc } from '@lynx-js/web-worker-rpc';
import { initOffscreenDocument } from '@lynx-js/offscreen-document/main';

export function registerFlushElementTreeHandler(
  mainThreadRpc: Rpc,
  options: {
    rootDom: HTMLElement;
  },
  onCommit: (info: {
    pipelineId: string | undefined;
    timingFlags: string[];
    isFP: boolean;
  }) => void,
  markTimingInternal: (
    timingKey: string,
    pipelineId?: string,
    timeStamp?: number,
  ) => void,
) {
  const {
    rootDom,
  } = options;
  const onEvent = mainThreadRpc.createCall(postOffscreenEventtEndpoint);
  const { decodeOperation } = initOffscreenDocument({
    shadowRoot: rootDom,
    onEvent,
  });
  mainThreadRpc.registerHandler(
    flushElementTreeEndpoint,
    (operations, options, timingFlags) => {
      const { pipelineOptions } = options;
      const pipelineId = pipelineOptions?.pipelineID;
      markTimingInternal('dispatch_start', pipelineId);
      markTimingInternal('layout_start', pipelineId);
      markTimingInternal('ui_operation_flush_start', pipelineId);
      decodeOperation(operations);
      markTimingInternal('ui_operation_flush_end', pipelineId);
      markTimingInternal('layout_end', pipelineId);
      markTimingInternal('dispatch_end', pipelineId);
      onCommit({
        pipelineId,
        timingFlags,
      });
    },
  );
  return { uniqueIdToElement, uniqueIdToCssInJsRule };
}
