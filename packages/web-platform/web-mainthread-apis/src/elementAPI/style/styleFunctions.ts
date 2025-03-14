// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
import {
  runtimeInfo,
  type ElementThreadElement,
} from '../ElementThreadElement.js';
import {
  cssIdAttribute,
  type CssInJsInfo,
  type PageConfig,
  type UpdateCssInJsStyleByUniqueId,
} from '@lynx-js/web-constants';
import hyphenateStyleName from 'hyphenate-style-name';
import { queryCSSProperty } from './cssPropertyMap.js';
import { decodeCssInJs } from '../../utils/decodeCssInJs.js';
import {
  transformInlineStyleString,
  transfromParsedStyles,
} from './transformInlineStyle.js';

export function createStyleFunctions(options: {
  pageConfig: PageConfig;
  updateCssInJs: UpdateCssInJsStyleByUniqueId;
  cssInJsInfo: CssInJsInfo;
}) {
  const { pageConfig, cssInJsInfo, updateCssInJs } = options;
  function __AddClass(
    element: ElementThreadElement,
    className: string,
  ) {
    const newClassName = ((element.className ?? '') + ' ' + className)
      .trim();
    element.setAttribute('class', newClassName);
    if (!pageConfig.enableCSSSelector) {
      const newStyleStr = decodeCssInJs(
        newClassName,
        cssInJsInfo,
        element[runtimeInfo].cssId,
      );
      updateCssInJs(
        element[runtimeInfo].uniqueId,
        newStyleStr,
      );
    }
  }
  function __SetClasses(
    element: ElementThreadElement,
    classNames: string | null,
  ): void {
    classNames
      ? element.setAttribute('class', classNames)
      : element.removeAttribute('class');
    if (!pageConfig.enableCSSSelector) {
      const newStyleStr = decodeCssInJs(
        classNames ?? '',
        cssInJsInfo,
        element[runtimeInfo].cssId,
      );
      updateCssInJs(
        element[runtimeInfo].uniqueId,
        newStyleStr ?? '',
      );
    }
  }

  function __GetClasses(element: ElementThreadElement) {
    return (element.className ?? '').split(' ').filter(e => e);
  }
  function __AddInlineStyle(
    element: ElementThreadElement,
    key: number | string,
    value: string | undefined,
  ): void {
    const lynxStyleInfo = queryCSSProperty(Number(key));
    if (!value) {
      element.style.setProperty(lynxStyleInfo.dashName, null);
      return;
    }
    const { transformedStyle } = transfromParsedStyles([[
      lynxStyleInfo.dashName,
      value,
    ]]);
    for (const [property, value] of transformedStyle) {
      element.style.setProperty(property, value);
    }
  }

  function __SetInlineStyles(
    element: ElementThreadElement,
    value: string | Record<string, string> | undefined,
  ) {
    if (!value) return;
    const { transformedStyle } = typeof value === 'string'
      ? transformInlineStyleString(value)
      : transfromParsedStyles(
        Object.entries(value).map(([k, value]) => [
          hyphenateStyleName(k),
          value,
        ]),
      );
    const transformedStyleStr = transformedStyle.map((
      [property, value],
    ) => `${property}:${value};`).join('');
    element.setAttribute('style', transformedStyleStr);
  }

  function __SetCSSId(
    elements: (ElementThreadElement)[],
    cssId: string | number,
  ) {
    cssId = cssId.toString();
    for (const element of elements) {
      element.setAttribute(cssIdAttribute, cssId);
      if (!pageConfig.enableCSSSelector) {
        const cls = element.getAttribute('class');
        cls && __SetClasses(element, cls);
      }
    }
  }

  return {
    __AddClass,
    __SetClasses,
    __GetClasses,
    __AddInlineStyle,
    __SetInlineStyles,
    __SetCSSId,
  };
}
