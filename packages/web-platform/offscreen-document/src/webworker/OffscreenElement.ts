// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
import {
  OperationType,
  type ElementOperation,
} from '../types/ElementOperation.js';

import { elementPtrSymbol, type ElementModule } from './ElementModule.js';
export const uniqueId = Symbol('uniqueId');
export const tagSymbol = Symbol('tagSymbol');
export const setAttributeSymbol = Symbol('setAttributeSymbol');
export const removeAttributeSymbol = Symbol('removeAttributeSymbol');
export const getAttributeSymbol = Symbol('getAttributeSymbol');
export const getAttributeNamesSymbol = Symbol('getAttributeNamesSymbol');
export const eventTargetSymbol = Symbol('eventTargetSymbol');
export const operationsRefSymbol = Symbol('operationsRefSymbol');
const elementModuleSymbol = Symbol('ElementModule');
const enableEventSymbol = Symbol('enableEvent');
const _style = Symbol('_style');
export class OffscreenElement {
  private [_style]?: {
    setProperty: (
      property: string,
      value: string,
      priority?: 'important' | undefined | '',
    ) => void;
    removeProperty: (property: string) => void;
  };

  [elementPtrSymbol]: number = 0;
  [tagSymbol]: string;
  [eventTargetSymbol]?: EventTarget;
  [elementModuleSymbol]: ElementModule;
  [operationsRefSymbol]: {
    operations: ElementOperation[];
  };
  [enableEventSymbol]: (eventType: string, uid: number) => void;

  public get tagName() {
    return this[tagSymbol].toUpperCase();
  }

  // constructor(tag: '');
  // constructor(tag: string, parentDocument: OffscreenDocument);
  constructor(
    tag: string,
    elementModule: ElementModule,
    operationsRef: {
      operations: ElementOperation[];
    },
    enableEvent: (eventType: string, uid: number) => void,
  ) {
    // if (tag === '') {
    //   // this is a node
    // }
    this[tagSymbol] = tag;
    this[elementModuleSymbol] = elementModule;
    this[operationsRefSymbol] = operationsRef;
    this[enableEventSymbol] = enableEvent;
    this[elementModuleSymbol].createElement(tag, this);
  }

  get style() {
    if (!this[_style]) {
      this[_style] = {
        setProperty: (
          property: string,
          value: string,
          priority?: 'important' | undefined | '',
        ) => {
          this[operationsRefSymbol].operations.push({
            type: OperationType['StyleDeclarationSetProperty'],
            uid: this[uniqueId],
            property,
            value: value,
            priority: priority,
          });
          this[elementModuleSymbol].setStyleProperty(
            this,
            property,
            value,
            !!priority,
          );
        },

        removeProperty: (property: string) => {
          this[operationsRefSymbol].operations.push({
            type: OperationType['StyleDeclarationRemoveProperty'],
            uid: this[uniqueId],
            property,
          });
          this[elementModuleSymbol].removeStyleProperty(this, property);
        },
      };
    }
    return this[_style];
  }

  get id(): string {
    return this[getAttributeSymbol]('id') ?? '';
  }

  set id(value: string) {
    this.setAttribute('id', value);
  }

  get className(): string {
    return this[getAttributeSymbol]('class') ?? '';
  }

  setAttribute(qualifiedName: string, value: string): void {
    this[setAttributeSymbol](qualifiedName, value);
    this[operationsRefSymbol].operations.push({
      type: OperationType.SetAttribute,
      uid: this[uniqueId],
      key: qualifiedName,
      value,
    });
  }

  getAttribute(qualifiedName: string): string | null {
    return this[getAttributeSymbol](qualifiedName) ?? '';
  }

  removeAttribute(qualifiedName: string): void {
    this[removeAttributeSymbol](qualifiedName);
    this[operationsRefSymbol].operations.push({
      type: OperationType.RemoveAttribute,
      uid: this[uniqueId],
      key: qualifiedName,
    });
  }

  append(...nodes: (OffscreenElement)[]): void {
    this[operationsRefSymbol].operations.push({
      type: OperationType.Append,
      uid: this[uniqueId],
      cid: nodes.map(node => node[uniqueId]),
    });
    this[elementModuleSymbol].append(this, ...nodes);
  }

  replaceWith(...nodes: (OffscreenElement)[]): void {
    this[operationsRefSymbol].operations.push({
      type: OperationType.ReplaceWith,
      uid: this[uniqueId],
      nid: nodes.map(node => node[uniqueId]),
    });
    return this[elementModuleSymbol].replaceWith(this, ...nodes);
  }

  getAttributeNames(): string[] {
    return this[getAttributeNamesSymbol]();
  }

  remove(): void {
    if (this.parentElement) {
      this[operationsRefSymbol].operations.push({
        type: OperationType.Remove,
        uid: this[uniqueId],
      });
      this[elementModuleSymbol].remove(this);
    }
  }

  insertBefore(
    newNode: OffscreenElement,
    refNode: OffscreenElement | null,
  ): OffscreenElement {
    this[elementModuleSymbol].insertBefore(this, newNode, refNode);
    this[operationsRefSymbol].operations.push({
      type: OperationType.InsertBefore,
      uid: this[uniqueId],
      cid: newNode[uniqueId],
      ref: refNode?.[uniqueId],
    });
    return refNode as OffscreenElement;
  }

  removeChild(child: OffscreenElement | null): OffscreenElement {
    if (!child) {
      throw new DOMException(
        'The node to be removed is not a child of this node.',
        'NotFoundError',
      );
    }
    if (child.parentElement !== this) {
      throw new DOMException(
        'The node to be removed is not a child of this node.',
        'NotFoundError',
      );
    }
    this[elementModuleSymbol].removeChild(this, child);
    this[operationsRefSymbol].operations.push({
      type: OperationType.RemoveChild,
      uid: this[uniqueId],
      cid: child![uniqueId],
    });
    return child;
  }

  set innerHTML(text: string) {
    this[operationsRefSymbol].operations.push({
      type: OperationType.SetInnerHTML,
      text,
      uid: this[uniqueId],
    });
    this[elementModuleSymbol].setInnerHTML(this, text);
  }

  get innerHTML(): string {
    return this[elementModuleSymbol].getInnerHTML(this);
  }

  get children(): OffscreenElement[] {
    return this[elementModuleSymbol].getChildren(this);
  }

  get parentElement(): OffscreenElement | null {
    return this[elementModuleSymbol].getParentElement(this);
  }

  get parentNode(): OffscreenElement | null {
    return this.parentElement;
  }

  get firstElementChild(): OffscreenElement | null {
    return this[elementModuleSymbol].getFirstElementChild(this);
  }

  get lastElementChild(): OffscreenElement | null {
    return this[elementModuleSymbol].getLastElementChild(this);
  }

  get nextElementSibling(): OffscreenElement | null {
    return this[elementModuleSymbol].getNextElementSibling(this);
  }

  #uniqueId: number = 0;
  get [uniqueId](): number {
    if (this.#uniqueId === 0) {
      this.#uniqueId = this[elementModuleSymbol].getUniqueId(this);
    }
    return this.#uniqueId;
  }

  addEventListener(
    ...args: Parameters<EventTarget['addEventListener']>
  ): void {
    const type = args[0];
    this[enableEventSymbol](type, this[uniqueId]);
    if (!this[eventTargetSymbol]) {
      this[eventTargetSymbol] = new EventTarget();
    }
    this[eventTargetSymbol].addEventListener(...args);
  }

  removeEventListener(
    ...args: Parameters<EventTarget['removeEventListener']>
  ): void {
    if (this[eventTargetSymbol]) {
      this[eventTargetSymbol].removeEventListener(...args);
    }
  }

  dispatchEvent(event: Event): boolean {
    if (this[eventTargetSymbol]) {
      return this[eventTargetSymbol].dispatchEvent(event);
    }
    return false;
  }

  [setAttributeSymbol](name: string, value: string): void {
    this[elementModuleSymbol].setAttribute(this, name, value);
  }
  [removeAttributeSymbol](name: string): void {
    this[elementModuleSymbol].removeAttribute(this, name);
  }
  [getAttributeSymbol](name: string): string | null {
    return this[elementModuleSymbol].getAttribute(this, name);
  }
  [getAttributeNamesSymbol](): string[] {
    return this[elementModuleSymbol].getAttributeNames(this);
  }
}
