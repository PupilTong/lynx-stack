// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
import {
  type ElementOperation,
  type flushElementTreeEndpoint,
} from '@lynx-js/web-constants';
import type { Rpc } from '@lynx-js/web-worker-rpc';
import type { RuntimePropertyOnElement } from '../../types/RuntimePropertyOnElement.js';

export function registerFlushElementTreeHandler(
  mainThreadRpc: Rpc,
  endpoint: typeof flushElementTreeEndpoint,
  onCommit: (info: {
    pipelineId: string | undefined;
    timingFlags: string[];
  }) => void,
  markTimingInternal: (
    timingKey: string,
    pipelineId?: string,
    timeStamp?: number,
  ) => void,
  decodeOperation: (operations: ElementOperation[]) => void,
) {
  const uniqueIdToElement: WeakRef<
    HTMLElement & RuntimePropertyOnElement
  >[] = [];
  mainThreadRpc.registerHandler(
    endpoint,
    (options, timingFlags, opeartions) => {
      const { pipelineOptions } = options;
      const pipelineId = pipelineOptions?.pipelineID;
      markTimingInternal('dispatch_start', pipelineId);
      markTimingInternal('layout_start', pipelineId);
      markTimingInternal('ui_operation_flush_start', pipelineId);
      decodeOperation(opeartions);
      markTimingInternal('ui_operation_flush_end', pipelineId);
      markTimingInternal('layout_end', pipelineId);
      markTimingInternal('dispatch_end', pipelineId);
      onCommit({
        pipelineId,
        timingFlags,
      });
    },
  );
  return { uniqueIdToElement };
}
