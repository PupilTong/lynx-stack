// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { componentIdAttribute, lynxTagAttribute } from '@lynx-js/web-constants';
import {
  runtimeInfo,
  type ComponentAtIndexCallback,
  type ElementThreadElement,
  type EnqueueComponentCallback,
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
  element[runtimeInfo].lynxDataset[key] = value;
}

export function __GetAttributes(
  element: ElementThreadElement,
): Record<string, string | null> {
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
  return element[runtimeInfo].lynxDataset[key];
}

export function __GetDataset(
  element: ElementThreadElement,
): Record<string, any> {
  return element[runtimeInfo].lynxDataset;
}

export function __GetElementConfig(
  element: ElementThreadElement,
) {
  return element[runtimeInfo].componentConfig;
}

export function __GetElementUniqueID(
  element: ElementThreadElement,
): number {
  return element[runtimeInfo].uniqueId;
}

export function __GetID(element: ElementThreadElement): string {
  return element.id;
}

export function __GetTag(element: ElementThreadElement): string {
  return element.getAttribute(lynxTagAttribute)!;
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
  element[runtimeInfo].lynxDataset = dataset;
}

export function __SetID(element: ElementThreadElement, id: string) {
  element.id = id;
}

export function __UpdateComponentID(
  element: ElementThreadElement,
  componentID: string,
) {
  element.setAttribute(componentIdAttribute, componentID);
}

export function __GetConfig(
  element: ElementThreadElement,
) {
  return element[runtimeInfo].componentConfig;
}

export function __UpdateListCallbacks(
  list: ElementThreadElement,
  componentAtIndex: ComponentAtIndexCallback,
  enqueueComponent: EnqueueComponentCallback,
) {
  list[runtimeInfo].componentAtIndex = componentAtIndex;
  list[runtimeInfo].enqueueComponent = enqueueComponent;
}
