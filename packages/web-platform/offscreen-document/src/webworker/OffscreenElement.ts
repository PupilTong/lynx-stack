// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
import {
  enableEvent,
  operations,
  type OffscreenDocument,
} from './OffscreenDocument.js';
import { OperationType } from '../types/ElementOperation.js';

export const ancestorDocument = Symbol('ancestorDocument');
export const attributes = Symbol('attributes');
export const children = Symbol('children');
export const innerHTML = Symbol('innerHTML');
export const uniqueId = Symbol('uniqueId');
export const parentElement = Symbol('parentElement');
export const eventTarget = Symbol('eventTarget');

interface OffscreenElementData {
  [attributes]: Map<string, string>;
  [children]: OffscreenElementData[];
  [ancestorDocument]: OffscreenDocument;
  [uniqueId]: number;
  [parentElement]: OffscreenElementData | null;
  [innerHTML]: string;
  [eventTarget]: EventTarget;
  localName: string;
}

function getTagName(this: OffscreenElementData): string {
  return this.localName.toUpperCase();
}

function getId(this: OffscreenElementData): string {
  return this[attributes].get('id') ?? '';
}

function setId(this: OffscreenElementData, value: string): void {
  setAttribute.call(this, 'id', value);
}

function getFirstElementChild(
  this: OffscreenElementData,
): OffscreenElementData | null {
  return this[children][0] ?? null;
}

function getLastElementChild(
  this: OffscreenElementData,
): OffscreenElementData | null {
  return this[children][this[children].length - 1] ?? null;
}

function getNextElementSibling(
  this: OffscreenElementData,
): OffscreenElementData | null {
  const parent = this[parentElement];
  if (parent) {
    const nextElementSiblingIndex = parent[children].indexOf(this);
    if (nextElementSiblingIndex >= 0) {
      return parent[children][nextElementSiblingIndex + 1] || null;
    }
  }
  return null;
}

function setAttribute(
  this: OffscreenElementData,
  qualifiedName: string,
  value: string,
) {
  this[attributes].set(qualifiedName, value);
  this[ancestorDocument][operations].push({
    type: OperationType.SetAttribute,
    uid: this[uniqueId],
    key: qualifiedName,
    value,
  });
}

function getAttribute(
  this: OffscreenElementData,
  qualifiedName: string,
): string | null {
  return this[attributes].get(qualifiedName) ?? null;
}

function removeAttribute(
  this: OffscreenElementData,
  qualifiedName: string,
): void {
  this[attributes].delete(qualifiedName);
  this[ancestorDocument][operations].push({
    type: OperationType.RemoveAttribute,
    uid: this[uniqueId],
    key: qualifiedName,
  });
}

function _remove(element: OffscreenElementData): void {
  if (element[parentElement]) {
    const currentIdx = element[parentElement][children].indexOf(element);
    element[parentElement][children].splice(currentIdx, 1);
    element[parentElement] = null;
  }
}
function append(
  this: OffscreenElementData,
  ...nodes: OffscreenElementData[]
): void {
  this[ancestorDocument][operations].push({
    type: OperationType.Append,
    uid: this[uniqueId],
    cid: nodes.map(node => node[uniqueId]),
  });
  for (const node of nodes) {
    _remove(node);
    node[parentElement] = this;
  }
  this[children].push(...nodes);
}
function replaceWith(
  this: OffscreenElementData,
  ...nodes: (OffscreenElementData)[]
): void {
  this[ancestorDocument][operations].push({
    type: OperationType.ReplaceWith,
    uid: this[uniqueId],
    nid: nodes.map(node => node[uniqueId]),
  });
  if (this[parentElement]) {
    const parent = this[parentElement];
    this[parentElement] = null;
    const currentIdx = parent[children].indexOf(this);
    parent[children].splice(currentIdx, 1, ...nodes);
    for (const node of nodes) {
      node[parentElement] = parent;
    }
  }
}

function getAttributeNames(this: OffscreenElementData): string[] {
  return [...this[attributes].keys()];
}

function remove(this: OffscreenElementData): void {
  this[ancestorDocument][operations].push({
    type: OperationType.Remove,
    uid: this[uniqueId],
  });
  _remove(this);
}

function insertBefore(
  this: OffscreenElementData,
  newNode: OffscreenElementData,
  refNode: OffscreenElementData | null,
): OffscreenElementData {
  _remove(newNode);
  if (refNode) {
    const refNodeIndex = this[children].indexOf(refNode);
    if (refNodeIndex >= 0) {
      newNode[parentElement] = this;
      this[children].splice(refNodeIndex, 0, newNode);
    }
  } else {
    newNode[parentElement] = this;
    this[children].push(newNode);
  }

  this[ancestorDocument][operations].push({
    type: OperationType.InsertBefore,
    uid: this[uniqueId],
    cid: newNode[uniqueId],
    ref: refNode?.[uniqueId],
  });
  return newNode;
}

function removeChild(
  this: OffscreenElementData,
  child: OffscreenElementData | null,
): OffscreenElementData {
  if (!child) {
    throw new DOMException(
      'The node to be removed is not a child of this node.',
      'NotFoundError',
    );
  }
  if (child[parentElement] !== this) {
    throw new DOMException(
      'The node to be removed is not a child of this node.',
      'NotFoundError',
    );
  }
  this[ancestorDocument][operations].push({
    type: OperationType.RemoveChild,
    uid: this[uniqueId],
    cid: child![uniqueId],
  });
  _remove(child);
  return child;
}

function addEventListener(
  this: OffscreenElementData,
  type: string,
  callback: EventListenerOrEventListenerObject | null,
  options?: AddEventListenerOptions | boolean,
): void {
  this[ancestorDocument][enableEvent](type, this[uniqueId]);
  this[eventTarget].addEventListener(type, callback, options);
}

export function createOffscreenElement(
  localName: string,
  elementUniqueId: number,
  ancestor: OffscreenDocument,
) {
  const element: OffscreenElementData = {
    [attributes]: new Map(),
    [children]: [],
    [ancestorDocument]: ancestor,
    [uniqueId]: elementUniqueId,
    [parentElement]: null,
    [innerHTML]: '',
    [eventTarget]: new EventTarget(),
    localName,
  };
}
