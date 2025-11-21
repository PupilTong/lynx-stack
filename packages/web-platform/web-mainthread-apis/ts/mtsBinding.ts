// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import {
  type ElementPAPIs,
  type FlushElementTreeOptions,
  type JSRealm,
  type LynxCrossThreadEvent,
  type LynxCrossThreadEventTarget,
  type Rpc,
  type RpcCallType,
  publicComponentEventEndpoint,
  postTimingFlagsEndpoint,
  publishEventEndpoint,
} from '@lynx-js/web-constants';

export class MainThreadJSBinding {
  private mtsGlobalThis: ElementPAPIs | undefined;
  private postPublishEvent?: RpcCallType<typeof publishEventEndpoint>;
  private postPublicComponentEvent?: RpcCallType<
    typeof publicComponentEventEndpoint
  >;
  private postTimingFlags?: RpcCallType<typeof postTimingFlagsEndpoint>;
  private isFp: boolean = true;

  constructor(
    private mtsRealm: JSRealm,
    private backgroundThreadRpc: Rpc,
    private commitDocument: (
      exposureChangedElements: HTMLElement[],
    ) => Promise<void> | void,
  ) {
  }

  #generateTargetObject(
    element: HTMLElement,
  ): LynxCrossThreadEventTarget {
    const uniqueId = this.mtsGlobalThis!.__GetElementUniqueID(element);
    return {
      dataset: this.mtsGlobalThis!.__GetDataset(element) as {
        [key: string]: string;
      },
      id: element.id || null,
      uniqueId,
    };
  }

  setMainThreadInstance(mtsGlobalThis: ElementPAPIs) {
    this.mtsGlobalThis = mtsGlobalThis;
  }
  runWorklet(
    handler: unknown,
    eventObject: LynxCrossThreadEvent,
    target: HTMLElement,
    currentTarget: HTMLElement,
  ) {
    eventObject.target = this.#generateTargetObject(
      target as HTMLElement,
    );
    eventObject.currentTarget = this.#generateTargetObject(
      currentTarget as HTMLElement,
    );
    // @ts-expect-error
    eventObject.target.elementRefptr = target;
    // @ts-expect-error
    eventObject.currentTarget.elementRefptr = currentTarget;
    // @ts-expect-error
    this.mtsRealm.globalWindow.runWorklet?.(handler, [eventObject]);
  }

  publicComponentEvent(
    componentId: string,
    hname: string,
    eventObject: LynxCrossThreadEvent,
    target: HTMLElement,
    currentTarget: HTMLElement,
  ) {
    eventObject.target = this.#generateTargetObject(
      target as HTMLElement,
    );
    eventObject.currentTarget = this.#generateTargetObject(
      currentTarget as HTMLElement,
    );
    if (!this.postPublicComponentEvent) {
      this.postPublicComponentEvent = this.backgroundThreadRpc.createCall(
        publicComponentEventEndpoint,
      );
    }
    this.postPublicComponentEvent(
      componentId,
      hname,
      eventObject,
    );
  }
  publishEvent(
    eventName: string,
    eventObject: LynxCrossThreadEvent,
    target: HTMLElement,
    currentTarget: HTMLElement,
  ) {
    eventObject.target = this.#generateTargetObject(
      target as HTMLElement,
    );
    eventObject.currentTarget = this.#generateTargetObject(
      currentTarget as HTMLElement,
    );
    if (!this.postPublishEvent) {
      this.postPublishEvent = this.backgroundThreadRpc.createCall(
        publishEventEndpoint,
      );
    }
    this.postPublishEvent(eventName, eventObject);
  }

  markTiming(pipelineId: string | undefined, timingKey: string): void {
    this.postTimingFlags();
  }

  async flushElementTree(
    options: FlushElementTreeOptions | undefined,
    timingFlags: string[],
    exposureChangedElementsArray: HTMLElement[],
  ) {
    const pipelineId = options?.pipelineOptions?.pipelineID;
    this.markTiming(pipelineId, 'dispatch_start');
    if (this.isFp) {
      this.isFp = false;
      jsContext.dispatchEvent({
        type: '__OnNativeAppReady',
        data: undefined,
      });
    }
    this.markTiming(pipelineId, 'layout_start');
    this.markTiming(pipelineId, 'ui_operation_flush_start');
    await this.commitDocument(
      exposureChangedElementsArray,
    );
    this.markTiming(pipelineId, 'ui_operation_flush_end');
    this.markTiming(pipelineId, 'layout_end');
    this.markTiming(pipelineId, 'dispatch_end');
    this.flushTiming();
    requestAnimationFrame(() => {
      if (!this.postTimingFlags) {
        this.postTimingFlags = this.backgroundThreadRpc.createCall(
          postTimingFlagsEndpoint,
        );
      }
      this.postTimingFlags(timingFlags, pipelineId);
    });
  }
}
