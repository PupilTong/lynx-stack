// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import {
  createElementOperation,
  enableEventOperation,
  endOperation,
} from './ElementOperation.js';
import {
  createOffscreenElement,
  eventTarget,
  uniqueId,
  type OffscreenElement,
} from './OffscreenElement.js';
import {
  eventPhase,
  OffscreenEvent,
  propagationStopped,
} from './OffscreenEvent.js';

export const operations = Symbol('operations');
export const enableEvent = Symbol('enableEvent');
export const getElementByUniqueId = Symbol('getElementByUniqueId');
export const onEvent = Symbol('onEvent');
export const operationsOfffset = Symbol('operationsOfffset');
export const growOperation = Symbol('growOperation');
export const uniqueIdToElement = Symbol('uniqueIdToElement');

export interface OffscreenDocumentBase {
  [operations]: Uint16Array;
  [operationsOfffset]: number;
  [growOperation]: () => void;
  [uniqueIdToElement]: WeakRef<OffscreenElement>[];
  [enableEvent]: (eventType: string, uid: number) => void;
  [onEvent]: (
    eventType: string,
    targetUniqueId: number,
    bubbles: boolean,
    otherProperties: Parameters<typeof structuredClone>[0],
  ) => void;
  createElement(tagName: string): OffscreenElement;
  commit(): void;
}

export type OffscreenDocument = OffscreenDocumentBase & OffscreenElement;

export function createOffscreenDocument(
  onCommit: (operations: ArrayBuffer) => void,
): OffscreenDocument {
  let currentSize = 32 * 1024 * 2; // 32 * 1024 uint16, 64KB
  let growed = false;
  let buf = new ArrayBuffer(currentSize << 1);
  const document: OffscreenDocumentBase = {
    [operations]: new Uint16Array(buf),
    [uniqueIdToElement]: [],
    commit() {
      let newOffset = endOperation(this[operations], this[operationsOfffset]);
      if (newOffset === 0) {
        this[growOperation]();
        newOffset = endOperation(this[operations], this[operationsOfffset]);
      }
      this[operationsOfffset] = newOffset;
      onCommit(buf);
      if (!growed) {
        // shrink
        currentSize >>= 1;
      }
      buf = new ArrayBuffer(currentSize << 1);
      this[operations] = new Uint16Array(buf);
      this[operationsOfffset] = 0;
      growed = false;
    },
    [operationsOfffset]: 0,
    [growOperation]() {
      growed = true;
      currentSize <<= 1;
      buf = buf.transfer(currentSize << 1);
      this[operations] = new Uint16Array(buf);
      debugger;
    },
    createElement: function(tagName: string): OffscreenElement {
      const element = createOffscreenElement(tagName, document);
      let newOffset = createElementOperation(
        this[operations],
        this[operationsOfffset],
        element[uniqueId],
        tagName,
      );
      if (newOffset === 0) {
        this[growOperation]();
        newOffset = createElementOperation(
          this[operations],
          this[operationsOfffset],
          element[uniqueId],
          tagName,
        );
      }
      this[operationsOfffset] = newOffset;
      return element;
    },
    [enableEvent]: function(eventType: string, uid: number): void {
      let newOffset = enableEventOperation(
        this[operations],
        this[operationsOfffset],
        uid,
        eventType,
      );
      if (newOffset === 0) {
        this[growOperation]();
        newOffset = enableEventOperation(
          this[operations],
          this[operationsOfffset],
          uid,
          eventType,
        );
      }
      this[operationsOfffset] = newOffset;
    },
    [onEvent]: function(
      eventType: string,
      targetUniqueId: number,
      bubbles: boolean,
      otherProperties: Parameters<typeof structuredClone>[0],
    ): void {
      const target = this[uniqueIdToElement][targetUniqueId]?.deref();
      if (target) {
        const bubblePath: OffscreenElement[] = [];
        let tempTarget: OffscreenElement = target;
        while (tempTarget.parentElement) {
          bubblePath.push(tempTarget.parentElement);
          tempTarget = tempTarget.parentElement;
        }
        const event = new OffscreenEvent(eventType, target);
        Object.assign(event, otherProperties);
        // capture phase
        event[eventPhase] = Event.CAPTURING_PHASE;
        for (let ii = bubblePath.length - 1; ii >= 0; ii--) {
          const currentPhaseTarget = bubblePath[ii]!;
          currentPhaseTarget[eventTarget].dispatchEvent(
            event as unknown as Event,
          );
          if (event[propagationStopped]) {
            return;
          }
        }
        // target phase
        event[eventPhase] = Event.AT_TARGET;
        target[eventTarget].dispatchEvent(event as unknown as Event);
        // bubble phase
        if (bubbles) {
          event[eventPhase] = Event.BUBBLING_PHASE;
          for (const currentPhaseTarget of bubblePath) {
            currentPhaseTarget[eventTarget].dispatchEvent(
              event as unknown as Event,
            );
            if (event[propagationStopped]) {
              return;
            }
          }
        }
      }
    },
  };
  /**
   * the reason we push two WeakRef<OffscreenElement>(document) is that
   * the first one is a placeholder for skip the uniqueId 0,
   */
  // @ts-expect-error
  document[uniqueIdToElement].push(new WeakRef<OffscreenElement>(document)); // this is never used, but we need to keep it for uniqueId 0
  const element = createOffscreenElement('', document);
  const finalDocument = Object.assign(element, document) as
    & OffscreenDocument
    & OffscreenElement;
  document[uniqueIdToElement].push(
    new WeakRef<OffscreenElement>(finalDocument),
  );
  return finalDocument;
}
