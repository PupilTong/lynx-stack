// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import {
  type ElementPAPIs,
  BackgroundThreadStartEndpoint,
  publishEventEndpoint,
  publicComponentEventEndpoint,
  postExposureEndpoint,
  postTimingFlagsEndpoint,
  dispatchCoreContextOnBackgroundEndpoint,
  dispatchJSContextOnMainThreadEndpoint,
  type Rpc,
  type StartMainThreadContextConfig,
  LynxCrossThreadContext,
  type RpcCallType,
  type reportErrorEndpoint,
  switchExposureServiceEndpoint,
  type I18nResourceTranslationOptions,
  getCacheI18nResourcesKey,
  type InitI18nResources,
  type I18nResources,
  dispatchI18nResourceEndpoint,
  type Cloneable,
  type SSRHydrateInfo,
  type SSRDehydrateHooks,
  type JSRealm,
  type MainThreadGlobalThis,
  type TemplateLoader,
  type UpdateDataOptions,
  updateDataEndpoint,
  systemInfo as staticSystemInfo,
} from '@lynx-js/web-constants';
import { registerCallLepusMethodHandler } from './crossThreadHandlers/registerCallLepusMethodHandler.js';
import { registerGetCustomSectionHandler } from './crossThreadHandlers/registerGetCustomSectionHandler.js';
import { createExposureService } from './utils/createExposureService.js';
import { createMainThreadElementApis } from './createMainThreadElementApis.js';
import { MainThreadJSBinding } from './mtsBinding.js';
import { createMainThreadLynx } from './createMainThreadLynx.js';
import { templateManager } from './templateManager.js';
import { createMainGeneralThreadApis } from './createMainGeneralThreadApis.js';

export function prepareMainThreadAPIs(
  backgroundThreadRpc: Rpc,
  rootDom: ShadowRoot,
  mtsRealmPromise: JSRealm | Promise<JSRealm>,
  commitDocument: (
    exposureChangedElements: HTMLElement[],
  ) => Promise<void> | void,
  markTimingInternal: (timingKey: string, pipelineId?: string) => void,
  flushMarkTimingInternal: () => void,
  reportError: RpcCallType<typeof reportErrorEndpoint>,
  triggerI18nResourceFallback: (
    options: I18nResourceTranslationOptions,
  ) => void,
  initialI18nResources: (data: InitI18nResources) => I18nResources,
  loadTemplate: TemplateLoader,
  ssrHooks?: SSRDehydrateHooks,
) {
  const postTimingFlags = backgroundThreadRpc.createCall(
    postTimingFlagsEndpoint,
  );
  const backgroundStart = backgroundThreadRpc.createCall(
    BackgroundThreadStartEndpoint,
  );
  const postExposure = backgroundThreadRpc.createCall(postExposureEndpoint);
  const updateDataBackground = backgroundThreadRpc.createCall(
    updateDataEndpoint,
  );
  markTimingInternal('lepus_execute_start');
  async function startMainThread(
    config: StartMainThreadContextConfig,
    ssrHydrateInfo?: SSRHydrateInfo,
  ): Promise<void> {
    const {
      globalProps,
      templateUrl,
      browserConfig,
      nativeModulesMap,
      napiModulesMap,
      tagMap,
      initI18nResources,
    } = config;
    const mtsRealm = await mtsRealmPromise;
    const pageConfig = templateManager.getPageConfig(templateUrl);
    markTimingInternal('decode_start');
    const jsContext = new LynxCrossThreadContext({
      rpc: backgroundThreadRpc,
      receiveEventEndpoint: dispatchJSContextOnMainThreadEndpoint,
      sendEventEndpoint: dispatchCoreContextOnBackgroundEndpoint,
    });
    const systemInfo = {
      ...staticSystemInfo,
      ...browserConfig,
    };
    const mtsBinding = new MainThreadJSBinding(
      mtsRealm,
      backgroundThreadRpc,
      commitDocument,
    );
    const lynx = createMainThreadLynx(
      templateUrl,
      jsContext,
      globalProps,
      systemInfo,
      mtsBinding,
    );

    const { elementAPIs, styleManager } = createMainThreadElementApis(
      templateUrl,
      rootDom,
      mtsBinding,
      tagMap,
      pageConfig.enableCSSSelector,
      pageConfig.enableRemoveCSSScope,
      pageConfig.defaultDisplayLinear,
      pageConfig.defaultOverflowVisible,
      ssrHydrateInfo,
      ssrHooks,
    );
    const mainThreadGeneralApis = createMainGeneralThreadApis(
      templateUrl,
      mtsRealm,
      styleManager,
      backgroundThreadRpc,
      jsContext,
      initI18nResources,
      loadTemplate,
      reportError,
      initialI18nResources,
      triggerI18nResourceFallback,
    );
    const mtsGlobalThis: MainThreadGlobalThis = Object.assign(
      mtsRealm.globalWindow,
      elementAPIs,
      mainThreadGeneralApis,
      {
        lynx,
        SystemInfo: {
          ...systemInfo,
          ...browserConfig,
        },
        __globalProps: globalProps,
      },
    );
    const template = templateManager.getTemplate(templateUrl);
    Object.defineProperty(mtsRealm.globalWindow, 'renderPage', {
      get() {
        return mtsGlobalThis.renderPage;
      },
      set(v) {
        mtsGlobalThis.renderPage = v;
        queueMicrotask(() => {
          markTimingInternal('data_processor_start');
          let initData = config.initData;
          if (
            pageConfig.enableJSDataProcessor !== true
            && mtsGlobalThis.processData
          ) {
            initData = mtsGlobalThis.processData(config.initData);
          }
          markTimingInternal('data_processor_end');
          registerCallLepusMethodHandler(
            backgroundThreadRpc,
            mtsGlobalThis,
          );
          registerGetCustomSectionHandler(
            backgroundThreadRpc,
            lynx,
          );
          const { switchExposureService } = createExposureService(
            rootDom,
            postExposure,
          );
          backgroundThreadRpc.registerHandler(
            switchExposureServiceEndpoint,
            switchExposureService,
          );
          backgroundStart({
            initData,
            globalProps,
            template,
            nativeModulesMap,
            napiModulesMap,
          });
          if (!ssrHydrateInfo) {
            mtsGlobalThis.renderPage!(initData);
            mtsGlobalThis.__FlushElementTree(undefined, {});
          } else {
            // replay the hydrate event
            for (const event of ssrHydrateInfo.events) {
              const uniqueId = event[0];
              const element = ssrHydrateInfo.lynxUniqueIdToElement[uniqueId]
                ?.deref();
              if (element) {
                mtsGlobalThis.__AddEvent(element, event[1], event[2], event[3]);
              }
            }
            mtsGlobalThis.ssrHydrate?.(ssrHydrateInfo.ssrEncodeData);
          }
        });
      },
      configurable: true,
      enumerable: true,
    });
    markTimingInternal('decode_end');
    await mtsRealm.loadScript(template.lepusCode.root);
    jsContext.__start(); // start the jsContext after the runtime is created
  }
  async function handleUpdatedData(
    newData: Cloneable,
    options: UpdateDataOptions | undefined,
  ) {
    const mtsRealm = await mtsRealmPromise;
    const runtime = mtsRealm.globalWindow as
      & typeof globalThis
      & MainThreadGlobalThis;
    const processedData = runtime.processData
      ? runtime.processData(newData, options?.processorName)
      : newData;
    runtime.updatePage?.(processedData, options);
    return updateDataBackground(processedData, options);
  }
  return { startMainThread, handleUpdatedData };
}
