// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import { type ElementThreadElement } from '../ElementThreadElement.js';

export function __AppendElement(
  parent: ElementThreadElement,
  child: ElementThreadElement,
): void {
  parent.append(child);
}

export function __ElementIsEqual(
  left: ElementThreadElement,
  right: ElementThreadElement,
): boolean {
  return left === right;
}

export function __FirstElement(
  element: ElementThreadElement,
): ElementThreadElement | undefined {
  return element.firstElementChild as ElementThreadElement;
}

export function __GetChildren(
  element: ElementThreadElement,
): ElementThreadElement[] {
  return [...(element.children as unknown as ElementThreadElement[])];
}

export function __GetParent(
  element: ElementThreadElement,
): ElementThreadElement | undefined {
  return element.parentElement as ElementThreadElement | undefined;
}

export function __InsertElementBefore(
  parent: ElementThreadElement,
  child: ElementThreadElement,
  ref: ElementThreadElement | null,
): ElementThreadElement {
  return parent.insertBefore(child, ref) as ElementThreadElement;
}

export function __LastElement(
  element: ElementThreadElement,
): ElementThreadElement | undefined {
  return element.lastElementChild as ElementThreadElement | undefined;
}

export function __NextElement(
  element: ElementThreadElement,
): ElementThreadElement | undefined {
  return element.nextElementSibling as ElementThreadElement | undefined;
}

export function __RemoveElement(
  parent: ElementThreadElement,
  child: ElementThreadElement,
): ElementThreadElement {
  parent.removeChild(child);
  return child;
}

export function __ReplaceElement(
  newElement: ElementThreadElement,
  oldElement: ElementThreadElement,
) {
  oldElement.replaceWith(newElement);
}

export function __ReplaceElements(
  parent: ElementThreadElement,
  newChildren: ElementThreadElement[] | ElementThreadElement,
  oldChildren: ElementThreadElement[] | ElementThreadElement | null | undefined,
) {
  newChildren = Array.isArray(newChildren) ? newChildren : [newChildren];
  if (
    !oldChildren || (Array.isArray(oldChildren) && oldChildren?.length === 0)
  ) {
    parent.append(...newChildren);
  } else {
    oldChildren = Array.isArray(oldChildren) ? oldChildren : [oldChildren];
    for (let ii = 1; ii < oldChildren.length; ii++) {
      __RemoveElement(parent, oldChildren[ii]!);
    }
    const firstOldChildren = oldChildren[0]!;
    firstOldChildren.replaceWith(...newChildren);
  }
}
