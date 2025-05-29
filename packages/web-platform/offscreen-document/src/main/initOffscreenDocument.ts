// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { OperationType } from '../types/ElementOperation.js';

function emptyHandler() {
  // no-op
}
const otherPropertyNames = [
  'detail',
  'keyCode',
  'charCode',
  'elapsedTime',
  'propertyName',
  'pseudoElement',
  'animationName',
  'touches',
  'targetTouches',
  'changedTouches',
];
const blockList = new Set([
  'isTrusted',
  'target',
  'currentTarget',
  'type',
  'bubbles',
  'window',
  'self',
  'view',
  'srcElement',
  'eventPhase',
]);

function transferToCloneable(value: any): any {
  if (
    typeof value === 'string' || typeof value === 'number'
    || typeof value === 'boolean' || value === null || value === undefined
  ) {
    return value;
  } else if (value[Symbol.iterator]) {
    return [...value].map(transferToCloneable);
  } else if (typeof value === 'object' && !(value instanceof EventTarget)) {
    const obj: Record<string, any> = {};
    for (const key in value) {
      if (!blockList.has(key)) {
        obj[key] = transferToCloneable(value[key]);
      }
    }
    return obj;
  }
}

const getString = /* @__PURE__ */ (
  buf: Uint16Array,
  offset: number,
  length: number,
): string => {
  return String.fromCharCode(...buf.subarray(offset, offset + length));
};

export function initOffscreenDocument(options: {
  shadowRoot: ShadowRoot;
  onEvent: (
    eventType: string,
    targetUniqueId: number,
    bubbles: boolean,
    otherProperties: Parameters<typeof structuredClone>[0],
  ) => void;
}) {
  const { shadowRoot, onEvent } = options;
  const enabledEvents: Set<string> = new Set();
  const uniqueIdToElement: [
    WeakRef<ShadowRoot>,
    ...(WeakRef<HTMLElement> | undefined)[],
  ] = [new WeakRef(shadowRoot)];
  const elementToUniqueId: WeakMap<HTMLElement, number> = new WeakMap();

  function _getElement(
    uniqueId: number,
  ): HTMLElement {
    const element = uniqueIdToElement[uniqueId]?.deref();
    if (element) {
      return element as HTMLElement;
    } else {
      throw new Error(
        `[lynx-web] cannot find element with uniqueId: ${uniqueId}`,
      );
    }
  }

  function _eventHandler(ev: Event) {
    if (
      ev.eventPhase !== Event.CAPTURING_PHASE && ev.currentTarget !== shadowRoot
    ) {
      return;
    }
    const target = ev.target as HTMLElement | null;
    if (target && elementToUniqueId.has(target)) {
      const targetUniqueId = elementToUniqueId.get(target)!;
      const eventType = ev.type;
      const otherProperties: Record<string, unknown> = {};
      for (const propertyName of otherPropertyNames) {
        if (propertyName in ev) {
          // @ts-expect-error
          otherProperties[propertyName] = transferToCloneable(ev[propertyName]);
        }
      }
      onEvent(eventType, targetUniqueId, ev.bubbles, otherProperties);
    }
  }

  function decodeOperation(buf: ArrayBuffer) {
    let offset = -1;
    const {
      CreateElement,
      SetAttribute,
      RemoveAttribute,
      Append,
      Remove,
      InsertBefore,
      ReplaceWith,
      EnableEvent,
      RemoveChild,
      StyleDeclarationSetProperty,
      StyleDeclarationRemoveProperty,
      SetInnerHTML,
      End,
    } = OperationType;
    const operations = new Uint16Array(buf);
    while (operations[offset] !== End) {
      const op = operations[++offset]! | 0;
      const uid = operations[++offset]! | 0;
      if (op === CreateElement) {
        const tagLength = operations[++offset]! | 0;
        const tag = getString(operations, ++offset, tagLength);
        offset += tagLength;
        const element = document.createElement(tag);
        uniqueIdToElement[uid] = new WeakRef(element);
        elementToUniqueId.set(element, uid);
        offset += tagLength;
      } else {
        const target = _getElement(uid);
        switch (op) {
          case SetAttribute:
            {
              const keyLength = operations[++offset]! | 0;
              const key = getString(operations, ++offset, keyLength);
              offset += keyLength;
              const valueLength = operations[++offset]! | 0;
              const value = getString(operations, ++offset, valueLength);
              target.setAttribute(key, value);
            }
            break;
          case RemoveAttribute:
            {
              const keyLength = operations[++offset]! | 0;
              const key = getString(operations, ++offset, keyLength);
              offset += keyLength;
              target.removeAttribute(key);
            }
            break;
          case Append:
            {
              const childrenCount = operations[++offset]! | 0;
              const newChildren: HTMLElement[] = [];
              for (let ii = 0; ii < childrenCount; ii++) {
                const childId = operations[++offset]! | 0;
                const child = _getElement(childId);
                newChildren.push(child);
              }
              target.append(...newChildren);
            }
            break;
          case Remove:
            target.remove();
            break;
          case ReplaceWith:
            const childrenCount = operations[++offset]! | 0;
            const newChildren: HTMLElement[] = [];
            for (let ii = 0; ii < childrenCount; ii++) {
              const childId = operations[++offset]! | 0;
              const child = _getElement(childId);
              newChildren.push(child);
            }
            target.replaceWith(...newChildren);
            break;
          case InsertBefore:
            {
              const cid = operations[++offset]! | 0;
              const refId = operations[++offset]! | 0;
              const kid = _getElement(cid);
              const ref = refId ? _getElement(refId) : null;
              target.insertBefore(kid, ref);
            }
            break;
          case EnableEvent:
            const eventTypeLength = operations[++offset]! | 0;
            const eventType = getString(operations, ++offset, eventTypeLength);
            offset += eventTypeLength;
            target.addEventListener(
              eventType,
              emptyHandler,
              { passive: true },
            );
            if (!enabledEvents.has(eventType)) {
              shadowRoot.addEventListener(
                eventType,
                _eventHandler,
                { passive: true, capture: true },
              );
              enabledEvents.add(eventType);
            }
            break;
          case RemoveChild:
            {
              const cid = operations[++offset]! | 0;
              const kid = _getElement(cid);
              target.removeChild(kid);
            }
            break;
          case StyleDeclarationSetProperty:
            {
              const propertyLength = operations[++offset]! | 0;
              const property = getString(operations, ++offset, propertyLength);
              offset += propertyLength;
              const valueLength = operations[++offset]! | 0;
              const value = getString(operations, ++offset, valueLength);
              offset += valueLength;
              const priority = operations[++offset]! | 0;
              target.style.setProperty(
                property,
                value,
                priority ? '!important' : undefined,
              );
            }
            break;
          case StyleDeclarationRemoveProperty:
            {
              const propertyLength = operations[++offset]! | 0;
              const property = getString(operations, ++offset, propertyLength);
              offset += propertyLength;
              target.style.removeProperty(property);
            }
            break;
          case SetInnerHTML:
            const textLength = operations[++offset]! | 0;
            const text = getString(operations, ++offset, textLength);
            offset += textLength;
            // Note: this is not safe, but we assume the text is sanitized
            // and does not contain any script tags..
            // because this is only used for style content
            target.innerText = text;
            break;
        }
      }
    }
  }

  return {
    decodeOperation,
  };
}
