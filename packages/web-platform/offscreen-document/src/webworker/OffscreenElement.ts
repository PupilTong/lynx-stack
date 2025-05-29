// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
import {
  appendOperation,
  insertBeforeOperation,
  removeAttributeOperation,
  removeOperation,
  removeStyleDeclarationPropertyOperation,
  replaceWithOperation,
  setAttributeOperation,
  setStyleDeclarationPropertyOperation,
} from './ElementOperation.js';
import {
  enableEvent,
  growOperation,
  operations,
  operationsOfffset,
  uniqueIdToElement,
  type OffscreenDocumentBase,
} from './OffscreenDocument.js';
import { OffscreenEventTarget } from './OffscreenEvent.js';

export const ancestorDocument = Symbol('ancestorDocument');
export const attributes = Symbol('attributes');
export const children = Symbol('children');
export const innerHTML = Symbol('innerHTML');
export const uniqueId = Symbol('uniqueId');
export const parentElement = Symbol('parentElement');
export const eventTarget = Symbol('eventTarget');
export const style = Symbol('style');

export interface OffscreenCSSStyleDeclaration {
  setProperty(
    property: string,
    value: string,
    priority?: 'important' | undefined | '',
  ): void;
  removeProperty(property: string): void;
}
interface OffscreenElementData {
  [attributes]: Map<string, string>;
  [children]: OffscreenElementData[];
  [ancestorDocument]: OffscreenDocumentBase;
  [uniqueId]: number;
  [parentElement]: OffscreenElementData | null;
  [innerHTML]: string;
  [eventTarget]: EventTarget;
  localName: string;
}
export interface OffscreenElement extends OffscreenElementData {
  readonly localName: string;
  readonly tagName: string;
  readonly firstElementChild: OffscreenElement | null;
  readonly lastElementChild: OffscreenElement | null;
  readonly nextElementSibling: OffscreenElement | null;
  readonly parentElement: OffscreenElement | null;
  readonly style: OffscreenCSSStyleDeclaration;
  setAttribute(
    qualifiedName: string,
    value: string,
  ): void;
  getAttribute(qualifiedName: string): string | null;
  removeAttribute(qualifiedName: string): void;
  getAttributeNames(): string[];
  remove(): void;
  append(...nodes: OffscreenElement[]): void;
  appendChild(
    node: OffscreenElement,
  ): OffscreenElement;
  replaceWith(...nodes: OffscreenElement[]): void;
  insertBefore(
    newNode: OffscreenElement,
    refNode: OffscreenElement | null,
  ): OffscreenElement;
  removeChild(child: OffscreenElement | null): OffscreenElement;
  cloneNode(deep?: boolean): OffscreenElement;
  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean,
  ): void;
  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean,
  ): void;
  toJSON(): {
    ssrID: number;
  };
}

function setAttribute<T extends OffscreenElementData>(
  this: T,
  qualifiedName: string,
  value: string,
): void {
  this[attributes].set(qualifiedName, value);
  let newOffset = setAttributeOperation(
    this[ancestorDocument][operations],
    this[ancestorDocument][operationsOfffset],
    this[uniqueId],
    qualifiedName,
    value,
  );
  if (newOffset === 0) {
    this[ancestorDocument][growOperation]();
    newOffset = setAttributeOperation(
      this[ancestorDocument][operations],
      this[ancestorDocument][operationsOfffset],
      this[uniqueId],
      qualifiedName,
      value,
    );
  }
  this[ancestorDocument][operationsOfffset] = newOffset;
}

function getAttribute<T extends OffscreenElementData>(
  this: T,
  qualifiedName: string,
): string | null {
  return this[attributes].get(qualifiedName) ?? null;
}

function removeAttribute<T extends OffscreenElementData>(
  this: T,
  qualifiedName: string,
): void {
  this[attributes].delete(qualifiedName);
  let newOffset = removeAttributeOperation(
    this[ancestorDocument][operations],
    this[ancestorDocument][operationsOfffset],
    this[uniqueId],
    qualifiedName,
  );
  if (newOffset === 0) {
    this[ancestorDocument][growOperation]();
    newOffset = removeAttributeOperation(
      this[ancestorDocument][operations],
      this[ancestorDocument][operationsOfffset],
      this[uniqueId],
      qualifiedName,
    );
  }
  this[ancestorDocument][operationsOfffset] = newOffset;
}

function _remove<T extends OffscreenElementData>(element: T): void {
  if (element[parentElement]) {
    const currentIdx = element[parentElement][children].indexOf(
      element as OffscreenElementData,
    );
    element[parentElement][children].splice(currentIdx, 1);
    element[parentElement] = null;
  }
}
function append<T extends OffscreenElementData>(
  this: T,
  ...nodes: OffscreenElementData[]
): void {
  for (const node of nodes) {
    _remove(node);
    node[parentElement] = this as OffscreenElementData;
  }
  this[children].push(...nodes);
  const nodeUids = nodes.map(node => node[uniqueId] | 0);
  let newOffset = appendOperation(
    this[ancestorDocument][operations],
    this[ancestorDocument][operationsOfffset],
    this[uniqueId],
    nodeUids,
  );
  if (newOffset === 0) {
    this[ancestorDocument][growOperation]();
    newOffset = appendOperation(
      this[ancestorDocument][operations],
      this[ancestorDocument][operationsOfffset],
      this[uniqueId],
      nodeUids,
    );
  }
  this[ancestorDocument][operationsOfffset] = newOffset;
}

function appendChild<T extends OffscreenElementData>(this: T, node: T): T {
  _remove(node);
  node[parentElement] = this;
  this[children].push(node);
  let newOffset = appendOperation(
    this[ancestorDocument][operations],
    this[ancestorDocument][operationsOfffset],
    this[uniqueId],
    [node[uniqueId] | 0],
  );
  if (newOffset === 0) {
    this[ancestorDocument][growOperation]();
    newOffset = appendOperation(
      this[ancestorDocument][operations],
      this[ancestorDocument][operationsOfffset],
      this[uniqueId],
      [node[uniqueId] | 0],
    );
  }
  this[ancestorDocument][operationsOfffset] = newOffset;
  return node;
}
function replaceWith<T extends OffscreenElementData>(
  this: T,
  ...nodes: (OffscreenElementData)[]
): void {
  if (this[parentElement]) {
    const parent = this[parentElement];
    this[parentElement] = null;
    const currentIdx = parent[children].indexOf(this as OffscreenElementData);
    parent[children].splice(currentIdx, 1, ...nodes);
    for (const node of nodes) {
      node[parentElement] = parent;
    }
  }
  const nodeUids = nodes.map(node => node[uniqueId] | 0);
  let newOffset = replaceWithOperation(
    this[ancestorDocument][operations],
    this[ancestorDocument][operationsOfffset],
    this[uniqueId],
    nodeUids,
  );
  if (newOffset === 0) {
    this[ancestorDocument][growOperation]();
    newOffset = replaceWithOperation(
      this[ancestorDocument][operations],
      this[ancestorDocument][operationsOfffset],
      this[uniqueId],
      nodeUids,
    );
  }
  this[ancestorDocument][operationsOfffset] = newOffset;
}

function getAttributeNames<T extends OffscreenElementData>(this: T): string[] {
  return [...this[attributes].keys()];
}

function remove<T extends OffscreenElementData>(this: T): void {
  _remove(this);
  let newOffset = removeOperation(
    this[ancestorDocument][operations],
    this[ancestorDocument][operationsOfffset],
    this[uniqueId],
  );
  if (newOffset === 0) {
    this[ancestorDocument][growOperation]();
    newOffset = removeOperation(
      this[ancestorDocument][operations],
      this[ancestorDocument][operationsOfffset],
      this[uniqueId],
    );
  }
  this[ancestorDocument][operationsOfffset] = newOffset;
}

function insertBefore<T extends OffscreenElementData>(
  this: T,
  newNode: T,
  refNode: T | null,
): T {
  _remove(newNode);
  if (refNode) {
    const refNodeIndex = this[children].indexOf(refNode);
    if (refNodeIndex >= 0) {
      newNode[parentElement] = this as T;
      this[children].splice(refNodeIndex, 0, newNode);
    }
  } else {
    newNode[parentElement] = this as T;
    this[children].push(newNode);
  }
  const refNodeUniqueId = refNode?.[uniqueId] || 0;
  let newOffset = insertBeforeOperation(
    this[ancestorDocument][operations],
    this[ancestorDocument][operationsOfffset],
    this[uniqueId],
    newNode[uniqueId],
    refNodeUniqueId,
  );
  if (newOffset === 0) {
    this[ancestorDocument][growOperation]();
    newOffset = insertBeforeOperation(
      this[ancestorDocument][operations],
      this[ancestorDocument][operationsOfffset],
      this[uniqueId],
      newNode[uniqueId],
      refNodeUniqueId,
    );
  }
  this[ancestorDocument][operationsOfffset] = newOffset;
  return newNode;
}

function removeChild<T extends OffscreenElementData>(
  this: T,
  child: T | null,
): T {
  if (!child) {
    throw new DOMException(
      'The node to be removed is not a child of this node.',
      'NotFoundError',
    );
  }
  if (child[parentElement] !== (this as T)) {
    throw new DOMException(
      'The node to be removed is not a child of this node.',
      'NotFoundError',
    );
  }
  let newOffset = removeOperation(
    this[ancestorDocument][operations],
    this[ancestorDocument][operationsOfffset],
    this[uniqueId],
  );
  if (newOffset === 0) {
    this[ancestorDocument][growOperation]();
    newOffset = removeOperation(
      this[ancestorDocument][operations],
      this[ancestorDocument][operationsOfffset],
      this[uniqueId],
    );
  }
  this[ancestorDocument][operationsOfffset] = newOffset;
  _remove(child);
  return child;
}

function addEventListener<T extends OffscreenElementData>(
  this: T,
  type: string,
  callback: EventListenerOrEventListenerObject | null,
  options?: AddEventListenerOptions | boolean,
): void {
  this[ancestorDocument][enableEvent](type, this[uniqueId]);
  this[eventTarget].addEventListener(type, callback, options);
}

function removeEventListener<T extends OffscreenElementData>(
  this: T,
  type: string,
  callback: EventListenerOrEventListenerObject | null,
  options?: AddEventListenerOptions | boolean,
): void {
  this[eventTarget].removeEventListener(type, callback, options);
}

function cloneNode<T extends OffscreenElementData>(
  this: T,
  deep: boolean = false,
): T {
  const newUniqueId = this[ancestorDocument][uniqueIdToElement].length;
  const clone: T = {
    ...this,
    [attributes]: new Map(this[attributes]),
    [children]: [],
    [ancestorDocument]: this[ancestorDocument],
    [uniqueId]: newUniqueId,
    [parentElement]: null,
    [innerHTML]: this[innerHTML],
  };
  clone[eventTarget] = new OffscreenEventTarget(
    clone as unknown as OffscreenElement,
  );

  if (deep) {
    for (const child of this[children]) {
      const clonedChild = cloneNode.call(child, deep);
      clonedChild[parentElement] = clone;
      clone[children].push(clonedChild);
    }
  }
  this[ancestorDocument][uniqueIdToElement].push(
    new WeakRef<OffscreenElement>(clone as unknown as OffscreenElement),
  );

  return clone;
}

function setProperty<T extends OffscreenElementData>(
  this: T,
  property: string,
  value: string,
  priority?: 'important' | undefined | '',
): void {
  const priorityValue = priority ? 1 : 0;
  let newOffset = setStyleDeclarationPropertyOperation(
    this[ancestorDocument][operations],
    this[ancestorDocument][operationsOfffset],
    this[uniqueId],
    property,
    value,
    priorityValue,
  );
  if (newOffset === 0) {
    this[ancestorDocument][growOperation]();
    newOffset = setStyleDeclarationPropertyOperation(
      this[ancestorDocument][operations],
      this[ancestorDocument][operationsOfffset],
      this[uniqueId],
      property,
      value,
      priorityValue,
    );
  }
  this[ancestorDocument][operationsOfffset] = newOffset;
  const currentStyle = this[attributes].get('style') ?? '';
  this[attributes].set(
    'style',
    currentStyle + `${property}:${value}${priority ? ' !important' : ''};`,
  );
}

function removeProperty<T extends OffscreenElementData>(
  this: T,
  property: string,
): void {
  // only for SSR
  const currentStyle = this[attributes].get('style') ?? '';
  this[attributes].set(
    'style',
    currentStyle + `${property}:inital;`,
  );
  let newOffset = removeStyleDeclarationPropertyOperation(
    this[ancestorDocument][operations],
    this[ancestorDocument][operationsOfffset],
    this[uniqueId],
    property,
  );
  if (newOffset === 0) {
    this[ancestorDocument][growOperation]();
    newOffset = removeStyleDeclarationPropertyOperation(
      this[ancestorDocument][operations],
      this[ancestorDocument][operationsOfffset],
      this[uniqueId],
      property,
    );
  }
  this[ancestorDocument][operationsOfffset] = newOffset;
}

function toJSON<T extends OffscreenElementData>(this: T): { ssrID: number } {
  return {
    ssrID: this[uniqueId],
  };
}

export function createOffscreenElement(
  localName: string,
  ancestor: OffscreenDocumentBase,
): OffscreenElement {
  const newUniqueId = ancestor[uniqueIdToElement].length;

  const elementData: OffscreenElementData = {
    [attributes]: new Map(),
    [children]: [],
    [ancestorDocument]: ancestor,
    [uniqueId]: newUniqueId,
    [parentElement]: null,
    [innerHTML]: '',
    [eventTarget]: new EventTarget(),
    localName,
  };

  const element: OffscreenElement = Object.assign({
    style: {
      setProperty: setProperty.bind(elementData),
      removeProperty: removeProperty.bind(elementData),
    },
    get tagName() {
      return element.localName.toUpperCase();
    },
    get firstElementChild() {
      return element[children][0] as OffscreenElement ?? null;
    },
    get lastElementChild() {
      return element[children][element[children].length - 1] as OffscreenElement
        ?? null;
    },
    get nextElementSibling() {
      const parent = element[parentElement];
      if (parent) {
        const nextElementSiblingIndex = parent[children].indexOf(element);
        return parent[children][nextElementSiblingIndex + 1] as OffscreenElement
          || null;
      }
      return null;
    },
    get parentElement() {
      return element[parentElement] as OffscreenElement | null;
    },
    setAttribute,
    getAttribute,
    removeAttribute,
    getAttributeNames,
    remove,
    append,
    appendChild,
    replaceWith,
    insertBefore,
    removeChild,
    cloneNode,
    addEventListener,
    removeEventListener,
    toJSON,
  }, elementData);

  elementData[eventTarget] = new OffscreenEventTarget(element);

  ancestor[uniqueIdToElement].push(new WeakRef<OffscreenElement>(element));
  return element;
}
