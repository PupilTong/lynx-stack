// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { componentIdAttribute } from '@lynx-js/web-constants';
import {
  runtimeInfo,
  type ElementThreadElement,
  // type ComponentAtIndexCallback,
  // type EnqueueComponentCallback,
  // type ListElement,
  // RefCountType,
} from '../ElementThreadElement.js';

export function __AddConfig(
  element: ElementThreadElement,
  type: string,
  value: any,
) {
  element[runtimeInfo].componentConfig[type] = value;
}

export function __AddDataset(
  element: ElementThreadElement,
  key: string,
  value: string | number | Record<string, any>,
): void {
  element[runtimeInfo]._lynxDataset[key] = value;
}

export function __GetAttributes(element: ElementThreadElement) {
  return Object.fromEntries(
    element.getAttributeNames().map((
      attributeName,
    ) => [attributeName, element.getAttribute(attributeName)]),
  );
}

export function __GetComponentID(element: ElementThreadElement): string | null {
  return element.getAttribute(componentIdAttribute);
}

export function __GetDataByKey(
  element: ElementThreadElement,
  key: string,
) {
  return element[runtimeInfo]._lynxDataset[key];
}

export function __GetDataset(
  element: ElementThreadElement,
): Record<string, any> {
  return element[runtimeInfo]._lynxDataset;
}

export function __GetElementConfig(
  element: ElementThreadElement,
) {
  return element[runtimeInfo].componentConfig;
}

export function __GetElementUniqueID(
  element: ElementThreadElement,
): number {
  return element[runtimeInfo].uniqueId ?? -1;
}

export function __GetID(element: ElementThreadElement): string {
  return element.id;
}

export function __GetTag(element: ElementThreadElement): string {
  return element[runtimeInfo].lynxTagName;
}

export function __SetAttribute(
  element: ElementThreadElement,
  key: string,
  value: string | null | undefined,
): void {
  if (value) element.setAttribute(key, value);
  else element.removeAttribute(key);
}

export function __SetConfig(
  element: ElementThreadElement,
  config: Record<string, any>,
): void {
  element[runtimeInfo].componentConfig = config;
}

export function __SetDataset(
  element: ElementThreadElement,
  dataset: Record<string, any>,
): void {
  element[runtimeInfo]._lynxDataset = dataset;
}

export function __SetID(element: ElementThreadElement, id: string) {
  element.id = id;
}

export function __UpdateComponentID(
  element: ElementThreadElement,
  componentID: string,
) {
  __SetAttribute(element, componentIdAttribute, componentID);
}

export function __GetConfig(
  element: ElementThreadElement,
) {
  return element[runtimeInfo].componentConfig;
}

// export function __UpdateListCallbacks(
//   list: ListElement,
//   componentAtIndex: ComponentAtIndexCallback,
//   enqueueComponent: EnqueueComponentCallback,
// ) {
//   list.componentAtIndex = componentAtIndex;
//   list.enqueueComponent = enqueueComponent;
// }
