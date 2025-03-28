// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { createRpcEndpoint } from '@lynx-js/web-worker-rpc';
import type {
  ExposureWorkerEvent,
  LynxCrossThreadEvent,
} from './types/EventType.js';
import type { Cloneable, CloneableObject } from './types/Cloneable.js';
import type { MainThreadStartConfigs } from './types/MainThreadStartConfigs.js';
import type { LynxLifecycleEvent } from './types/LynxLifecycleEvent.js';
import type { IdentifierType, InvokeCallbackRes } from './types/NativeApp.js';
import type { LynxTemplate } from './types/LynxModule.js';
import type { NapiModulesMap } from './types/NapiModules.js';
import type { NativeModulesMap } from './types/NativeModules.js';
import type { ElementOperation } from '@lynx-js/offscreen-document';
import type { FlushElementTreeOptions } from './types/FlushElementTreeOptions.js';

export const postExposureEndpoint = createRpcEndpoint<
  [{ exposures: ExposureWorkerEvent[]; disExposures: ExposureWorkerEvent[] }],
  void
>(
  '__postExposure',
  false,
  false,
);

export const publicComponentEventEndpoint = createRpcEndpoint<
  [string, string, LynxCrossThreadEvent],
  void
>('publicComponentEvent', false, false);

export const publishEventEndpoint = createRpcEndpoint<
  [string, LynxCrossThreadEvent],
  void
>('publishEvent', false, false);

export const postOffscreenEventEndpoint = createRpcEndpoint<
  [
    eventType: string,
    targetUniqueId: number,
    bubbles: boolean,
    Parameters<typeof structuredClone>[0],
  ],
  void
>('postOffscreenEventEndpoint', false, false);

export const switchExposureServiceEndpoint = createRpcEndpoint<
  [boolean, boolean],
  void
>(
  'switchExposureServiceEndpoint',
  false,
  false,
);

export const mainThreadStartEndpoint = createRpcEndpoint<
  [MainThreadStartConfigs],
  void
>('mainThreadStart', false, false);

export const updateDataEndpoint = createRpcEndpoint<
  [Cloneable, Record<string, string>],
  void
>('updateData', false, true);

export const sendGlobalEventEndpoint = createRpcEndpoint<
  [string, Cloneable[] | undefined],
  void
>('sendGlobalEventEndpoint', false, false);

export const disposeEndpoint = createRpcEndpoint<
  [],
  void
>('dispose', false, true);

export const postTimingResult = createRpcEndpoint<
  [
    pipelineId: string | undefined,
    updateTimingStamps: Record<string, number>,
    timingFlags: string[],
    setupTimingStamps: Record<string, number> | undefined,
  ],
  void
>('postTimingResult', false, false);

export const uiThreadFpReadyEndpoint = createRpcEndpoint<[], void>(
  'uiThreadFpReady',
  false,
  false,
);

export const onLifecycleEventEndpoint = createRpcEndpoint<
  [LynxLifecycleEvent],
  void
>(
  '__OnLifecycleEvent',
  false,
  false,
);

export const BackgroundThreadStartEndpoint = createRpcEndpoint<[
  {
    initData: unknown;
    globalProps: unknown;
    template: LynxTemplate;
    cardType: string;
    customSections: Record<string, Cloneable>;
    nativeModulesMap: NativeModulesMap;
    napiModulesMap: NapiModulesMap;
  },
], void>('start', false, true);

/**
 * Error message, info
 */
export const reportErrorEndpoint = createRpcEndpoint<
  [string, unknown],
  void
>('reportError', false, false);

export const flushElementTreeEndpoint = createRpcEndpoint<
  [
    operations: ElementOperation[],
    FlushElementTreeOptions,
    timingFlags: string[],
  ],
  void
>('flushElementTree', false, false);

export const mainThreadChunkReadyEndpoint = createRpcEndpoint<
  [],
  void
>('mainThreadChunkReady', false, false);

export const postTimingInfoFromMainThread = createRpcEndpoint<
  [
    timingKey: string,
    pipelineId: string | undefined,
    timeStamp: number,
  ],
  void
>('postTimingInfoFromMainThread', false, false);

export const callLepusMethodEndpoint = createRpcEndpoint<
  [name: string, data: unknown],
  void
>('callLepusMethod', false, true);

export const invokeUIMethodEndpoint = createRpcEndpoint<
  [
    type: IdentifierType,
    identifier: string,
    component_id: string,
    method: string,
    params: object,
    root_unique_id: number | undefined,
  ],
  InvokeCallbackRes
>('__invokeUIMethod', false, true);

export const setNativePropsEndpoint = createRpcEndpoint<
  [
    type: IdentifierType,
    identifier: string,
    component_id: string,
    first_only: boolean,
    native_props: object,
    root_unique_id: number | undefined,
  ],
  void
>('__setNativeProps', false, true);

export const nativeModulesCallEndpoint = createRpcEndpoint<
  [name: string, data: Cloneable, moduleName: string],
  any
>('nativeModulesCall', false, true);

export const napiModulesCallEndpoint = createRpcEndpoint<
  [name: string, data: Cloneable, moduleName: string],
  any
>('napiModulesCall', false, true, true);

export const getCustomSectionsEndpoint = createRpcEndpoint<
  [string],
  Cloneable
>('getCustomSections', false, true);

export const postTimingInfoFromBackgroundThread = createRpcEndpoint<
  [
    timingKey: string,
    pipelineId: string | undefined,
    timeStamp: number,
  ],
  void
>('postTimingInfoFromBackgroundThread', false, false);

export const triggerComponentEventEndpoint = createRpcEndpoint<
  [
    id: string,
    params: {
      eventDetail: CloneableObject;
      eventOption: CloneableObject;
      componentId: string;
    },
  ],
  void
>('__triggerComponentEvent', false, false);

export const selectComponentEndpoint = createRpcEndpoint<
  [
    componentId: string,
    idSelector: string,
    single: boolean,
  ],
  void
>('__selectComponent', false, true);
