// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import {
  type LynxLifecycleEvent,
  type LynxTemplate,
  type PageConfig,
  type ProcessDataCallback,
  type StyleInfo,
  type FlushElementTreeOptions,
  type Cloneable,
  type CssInJsInfo,
  type BrowserConfig,
  lynxUniqueIdAttribute,
  type publishEventEndpoint,
  type publicComponentEventEndpoint,
} from '@lynx-js/web-constants';
import { globalMuteableVars } from '@lynx-js/web-constants';
import { createMainThreadLynx, type MainThreadLynx } from './MainThreadLynx.js';
import { initializeElementCreatingFunction } from './elementAPI/elementCreating/elementCreatingFunctions.js';
import * as attributeAndPropertyApis from './elementAPI/attributeAndProperty/attributeAndPropertyFunctions.js';
import * as domTreeApis from './elementAPI/domTree/domTreeFunctions.js';
import { createEventFunctions } from './elementAPI/event/eventFunctions.js';
import { createStyleFunctions } from './elementAPI/style/styleFunctions.js';
import {
  flattenStyleInfo,
  genCssContent,
  genCssInJsInfo,
  transformToWebCss,
} from './utils/processStyleInfo.js';
import { createAttributeAndPropertyFunctionsWithContext } from './elementAPI/attributeAndProperty/createAttributeAndPropertyFunctionsWithContext.js';
import type { ElementThreadElement } from './elementAPI/ElementThreadElement.js';
import type { CreateCallReturnOf } from '../../web-worker-rpc/src/TypeUtils.js';

export interface MainThreadRuntimeCallbacks {
  mainChunkReady: () => void;
  flushElementTree: (
    options: FlushElementTreeOptions,
    timingFlags: string[],
  ) => void;
  _ReportError: (error: Error, info?: unknown) => void;
  __OnLifecycleEvent: (lynxLifecycleEvents: LynxLifecycleEvent) => void;
  markTiming: (pipelineId: string, timingKey: string) => void;
  publishEvent: CreateCallReturnOf<typeof publishEventEndpoint>;
  publicComponentEvent: CreateCallReturnOf<typeof publicComponentEventEndpoint>;
}

export interface MainThreadConfig {
  pageConfig: PageConfig;
  globalProps: unknown;
  callbacks: MainThreadRuntimeCallbacks;
  styleInfo: StyleInfo;
  customSections: LynxTemplate['customSections'];
  lepusCode: LynxTemplate['lepusCode'];
  browserConfig: BrowserConfig;
  tagMap: Record<string, string>;
  docu: Pick<Document, 'append' | 'createElement'>;
}

export class MainThreadRuntime {
  /**
   * @private
   */
  _uniqueIdToElement: WeakRef<ElementThreadElement>[] = [];
  /**
   * @private
   */
  private _uniqueIdToStyleSheet: WeakRef<HTMLStyleElement>[] = [];
  /**
   * @private
   */
  private readonly _styleRoot: HTMLElement;
  /**
   * @private
   */
  _rootDom: HTMLElement;

  /**
   * @private
   */
  _timingFlags: string[] = [];
  constructor(
    public config: MainThreadConfig,
  ) {
    this.__globalProps = config.globalProps;
    this.lynx = createMainThreadLynx(config, this);
    flattenStyleInfo(this.config.styleInfo);
    transformToWebCss(this.config.styleInfo);
    const cssInJsInfo: CssInJsInfo = this.config.pageConfig.enableCSSSelector
      ? {}
      : genCssInJsInfo(this.config.styleInfo);
    this._styleRoot = this.config.docu.createElement('div');
    this._rootDom = this.config.docu.createElement('div');
    const cardStyleElement = this.config.docu.createElement('style');
    cardStyleElement.insertAdjacentHTML(
      'afterbegin',
      genCssContent(this.config.styleInfo, this.config.pageConfig),
    );
    this._styleRoot.append(cardStyleElement);
    this._rootDom.append(this._styleRoot);
    this.config.docu.append(this._rootDom);
    Object.assign(
      this,
      createAttributeAndPropertyFunctionsWithContext(this),
      attributeAndPropertyApis,
      domTreeApis,
      createEventFunctions(this),
      createStyleFunctions(
        this,
        cssInJsInfo,
      ),
      initializeElementCreatingFunction(this),
    );
    this.__LoadLepusChunk = (path) => {
      try {
        this.lynx.requireModule(path);
        return true;
      } catch {
      }
      return false;
    };
    this._ReportError = this.config.callbacks._ReportError;
    this.__OnLifecycleEvent = this.config.callbacks.__OnLifecycleEvent;
    Object.defineProperty(this, 'renderPage', {
      get: () => {
        return this.#renderPage;
      },
      set: (val: (data: unknown) => void) => {
        this.#renderPage = val;
        queueMicrotask(this.config.callbacks.mainChunkReady);
      },
    });
    for (const nm of globalMuteableVars) {
      Object.defineProperty(this, nm, {
        get: () => {
          return this.__lynxGlobalBindingValues[nm];
        },
        set: (v: any) => {
          this.__lynxGlobalBindingValues[nm] = v;
          this._updateVars?.();
        },
      });
    }
  }
  /**
   * @private
   */
  _getElementByUniqueId(uniqueId: number): HTMLElement | undefined {
    return this._uniqueIdToElement[uniqueId]?.deref();
  }
  _updateCSSInJsStyle(uniqueId: number, newStyles: string) {
    let currentElement = this._uniqueIdToStyleSheet[uniqueId]?.deref();
    if (!currentElement) {
      currentElement = this.config.docu.createElement(
        'style',
      ) as HTMLStyleElement;
      this._uniqueIdToStyleSheet[uniqueId] = new WeakRef(currentElement);
    }
    currentElement.insertAdjacentHTML(
      'afterbegin',
      `[${lynxUniqueIdAttribute}="${uniqueId}"]{${newStyles}}`,
    );
  }

  /**
   * @private
   */
  __lynxGlobalBindingValues: Record<string, any> = {};

  get globalThis() {
    return this;
  }

  lynx: MainThreadLynx;

  NativeModules = undefined;

  __globalProps: unknown;

  processData?: ProcessDataCallback;

  #renderPage?: (data: unknown) => void;

  declare renderPage: (data: unknown) => void;

  _ReportError: (e: Error, info: unknown) => void;

  __OnLifecycleEvent: (lynxLifecycleEvents: LynxLifecycleEvent) => void;

  __LoadLepusChunk: (path: string) => boolean;

  __FlushElementTree = (
    _subTree: unknown,
    options: FlushElementTreeOptions,
  ) => {
    const timingFlags = this._timingFlags;
    this._timingFlags = [];
    this.config.callbacks.flushElementTree(
      options,
      timingFlags,
    );
  };

  updatePage?: (data: Cloneable, options?: Record<string, string>) => void;

  _updateVars?: () => void;
}
