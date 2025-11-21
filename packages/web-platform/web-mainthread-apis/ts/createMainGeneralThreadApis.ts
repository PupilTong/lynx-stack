// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import {
  dispatchI18nResourceEndpoint,
  getCacheI18nResourcesKey,
  type Cloneable,
  type I18nResources,
  type I18nResourceTranslationOptions,
  type InitI18nResources,
  type JSRealm,
  type LynxCrossThreadContext,
  type MainThreadApis,
  type MainThreadLynx,
  type reportErrorEndpoint,
  type Rpc,
  type RpcCallType,
  type TemplateLoader,
} from '@lynx-js/web-constants';
import { templateManager } from './templateManager.js';
import type { StyleManager } from './StyleManager.js';
import { createQueryComponent } from './crossThreadHandlers/createQueryComponent.js';

export function createMainGeneralThreadApis(
  templateUrl: string,
  mtsRealm: JSRealm,
  styleManager: StyleManager,
  backgroundThreadRpc: Rpc,
  jsContext: LynxCrossThreadContext,
  initI18nResources: InitI18nResources,
  loadTemplate: TemplateLoader,
  reportError: RpcCallType<typeof reportErrorEndpoint>,
  initialI18nResources: (data: InitI18nResources) => I18nResources,
  triggerI18nResourceFallback: (
    options: I18nResourceTranslationOptions,
  ) => void,
): MainThreadApis {
  let release = '';
  const dispatchI18nResource = backgroundThreadRpc.createCall(
    dispatchI18nResourceEndpoint,
  );
  const __LoadLepusChunk: (path: string) => boolean = (path) => {
    try {
      path = templateManager.getLepusCodeUrl(templateUrl, path) ?? path;
      mtsRealm.loadScriptSync(path);
      return true;
    } catch (e) {
      console.error(`failed to load lepus chunk ${path}`, e);
      return false;
    }
  };
  const __QueryComponent = createQueryComponent(
    loadTemplate,
    styleManager,
    backgroundThreadRpc,
    jsContext,
    mtsRealm,
  );
  const i18nResources = initialI18nResources(initI18nResources);
  const _I18nResourceTranslation = (
    options: I18nResourceTranslationOptions,
  ) => {
    const matchedInitI18nResources = i18nResources.data?.find(i =>
      getCacheI18nResourcesKey(i.options)
        === getCacheI18nResourcesKey(options)
    );
    dispatchI18nResource(matchedInitI18nResources?.resource as Cloneable);
    if (matchedInitI18nResources) {
      return matchedInitI18nResources.resource;
    }
    return triggerI18nResourceFallback(options);
  };
  return {
    _I18nResourceTranslation,
    __QueryComponent,
    __LoadLepusChunk,
    _ReportError: (err, _) => reportError(err, _, release),
    _SetSourceMapRelease: (errInfo) => release = errInfo?.release,
    _AddEventListener: () => {},
    __OnLifecycleEvent: (data) => {
      jsContext.dispatchEvent({
        type: '__OnLifecycleEvent',
        data,
      });
    },
    renderPage: undefined,
  };
}
