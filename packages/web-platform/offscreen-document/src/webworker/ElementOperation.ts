// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { OperationType } from '../types/ElementOperation.js';

export const createElementOperation = /* @__PURE__ */ (
  buf: Uint16Array,
  offset: number,
  uid: number,
  tag: string,
): number => {
  const tagLength = tag.length;
  const requiredLength = 3 + tagLength;
  if (buf.length < offset + requiredLength) {
    return 0;
  } else {
    buf[offset++] = OperationType.CreateElement;
    buf[offset++] = uid;
    const tagLength = tag.length;
    buf[offset++] = tagLength;
    for (let i = 0; i < tagLength; i++) {
      buf[offset++] = tag.charCodeAt(i);
    }
    return offset | 0;
  }
};

export const setAttributeOperation = /* @__PURE__ */ (
  buf: Uint16Array,
  offset: number,
  uid: number,
  key: string,
  value: string,
): number => {
  const keyLength = key.length;
  const valueLength = value.length;
  const requiredLength = 4 + keyLength + valueLength;
  if (buf.length < offset + requiredLength) {
    return 0;
  } else {
    buf[offset++] = OperationType.SetAttribute;
    buf[offset++] = uid;
    buf[offset++] = keyLength;
    for (let i = 0; i < keyLength; i++) {
      buf[offset++] = key.charCodeAt(i);
    }
    buf[offset++] = valueLength;
    for (let i = 0; i < valueLength; i++) {
      buf[offset++] = value.charCodeAt(i);
    }
    return offset | 0;
  }
};
export const removeAttributeOperation = /* @__PURE__ */ (
  buf: Uint16Array,
  offset: number,
  uid: number,
  key: string,
): number => {
  const keyLength = key.length;
  const requiredLength = 3 + keyLength;
  if (buf.length < offset + requiredLength) {
    return 0;
  } else {
    buf[offset++] = OperationType.RemoveAttribute;
    buf[offset++] = uid;
    buf[offset++] = keyLength;
    for (let i = 0; i < keyLength; i++) {
      buf[offset++] = key.charCodeAt(i);
    }
    return offset | 0;
  }
};
export const appendOperation = /* @__PURE__ */ (
  buf: Uint16Array,
  offset: number,
  uid: number,
  childUids: number[],
): number => {
  const childCount = childUids.length;
  const requiredLength = 3 + childCount;
  if (buf.length < offset + requiredLength) {
    return 0;
  } else {
    buf[offset++] = OperationType.Append;
    buf[offset++] = uid;
    buf[offset++] = childCount;
    for (let i = 0; i < childCount; i++) {
      buf[offset++] = childUids[i]!;
    }
    return offset | 0;
  }
};

export const removeOperation = /* @__PURE__ */ (
  buf: Uint16Array,
  offset: number,
  uid: number,
): number => {
  if (buf.length < offset + 2) {
    return 0;
  } else {
    buf[offset++] = OperationType.Remove;
    buf[offset++] = uid;
    return offset | 0;
  }
};

export const insertBeforeOperation = /* @__PURE__ */ (
  buf: Uint16Array,
  offset: number,
  uid: number,
  cid: number,
  ref: number,
): number => {
  if (buf.length < offset + 4) {
    return 0;
  } else {
    buf[offset++] = OperationType.InsertBefore;
    buf[offset++] = uid;
    buf[offset++] = cid;
    buf[offset++] = ref;
    return offset | 0;
  }
};

export const replaceWithOperation = /* @__PURE__ */ (
  buf: Uint16Array,
  offset: number,
  uid: number,
  newUids: number[],
): number => {
  const newCount = newUids.length;
  const requiredLength = 3 + newCount;
  if (buf.length < offset + requiredLength) {
    return 0;
  } else {
    buf[offset++] = OperationType.ReplaceWith;
    buf[offset++] = uid;
    buf[offset++] = newCount;
    for (let i = 0; i < newCount; i++) {
      buf[offset++] = newUids[i]!;
    }
    return offset | 0;
  }
};

export const enableEventOperation = /* @__PURE__ */ (
  buf: Uint16Array,
  offset: number,
  uid: number,
  eventType: string,
): number => {
  const eventTypeLength = eventType.length;
  const requiredLength = 3 + eventTypeLength;
  if (buf.length < offset + requiredLength) {
    return 0;
  } else {
    buf[offset++] = OperationType.EnableEvent;
    buf[offset++] = uid;
    buf[offset++] = eventTypeLength;
    for (let i = 0; i < eventTypeLength; i++) {
      buf[offset++] = eventType.charCodeAt(i);
    }
    return offset | 0;
  }
};

export const removeChildOperation = /* @__PURE__ */ (
  buf: Uint16Array,
  offset: number,
  uid: number,
  cid: number,
): number => {
  if (buf.length < offset + 3) {
    return 0;
  } else {
    buf[offset++] = OperationType.RemoveChild;
    buf[offset++] = uid;
    buf[offset++] = cid;
    return offset | 0;
  }
};
export const setStyleDeclarationPropertyOperation = /* @__PURE__ */ (
  buf: Uint16Array,
  offset: number,
  uid: number,
  property: string,
  value: string,
  priority: number,
): number => {
  const propertyLength = property.length;
  const valueLength = value.length;
  const requiredLength = 5 + propertyLength + valueLength;
  if (buf.length < offset + requiredLength) {
    return 0;
  } else {
    buf[offset++] = OperationType.StyleDeclarationSetProperty;
    buf[offset++] = uid;
    buf[offset++] = propertyLength;
    for (let i = 0; i < propertyLength; i++) {
      buf[offset++] = property.charCodeAt(i);
    }
    buf[offset++] = valueLength;
    for (let i = 0; i < valueLength; i++) {
      buf[offset++] = value.charCodeAt(i);
    }
    buf[offset++] = priority;
    return offset | 0;
  }
};
export const removeStyleDeclarationPropertyOperation = /* @__PURE__ */ (
  buf: Uint16Array,
  offset: number,
  uid: number,
  property: string,
): number => {
  const propertyLength = property.length;
  const requiredLength = 3 + propertyLength;
  if (buf.length < offset + requiredLength) {
    return 0;
  } else {
    buf[offset++] = OperationType.StyleDeclarationRemoveProperty;
    buf[offset++] = uid;
    buf[offset++] = propertyLength;
    for (let i = 0; i < propertyLength; i++) {
      buf[offset++] = property.charCodeAt(i);
    }
    return offset | 0;
  }
};
export const setInnerHTMLOperation = /* @__PURE__ */ (
  buf: Uint16Array,
  offset: number,
  uid: number,
  text: string,
): number => {
  const textLength = text.length;
  const requiredLength = 3 + textLength;
  if (buf.length < offset + requiredLength) {
    return 0;
  } else {
    buf[offset++] = OperationType.SetInnerHTML;
    buf[offset++] = uid;
    buf[offset++] = textLength;
    for (let i = 0; i < textLength; i++) {
      buf[offset++] = text.charCodeAt(i);
    }
    return offset | 0;
  }
};

export const endOperation = /* @__PURE__ */ (
  buf: Uint16Array,
  offset: number,
): number => {
  if (buf.length < offset + 2) {
    return 0;
  } else {
    buf[offset++] = OperationType.End;
    buf[offset++] = 0; // this is a placeholder
    return offset | 0;
  }
};
