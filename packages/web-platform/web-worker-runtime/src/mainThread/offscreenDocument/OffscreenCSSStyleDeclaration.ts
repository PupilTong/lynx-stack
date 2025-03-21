import { OperationType } from '@lynx-js/web-constants';
import type { OffscreenElement } from './OffscreenElement.js';
import { operations } from './OffscreenDocument.js';

export class OffscreenCSSStyleDeclaration {
  private readonly parent: OffscreenElement;

  constructor(parent: OffscreenElement) {
    this.parent = parent;
  }

  setProperty(
    property: string,
    value: string,
    priority?: 'important' | undefined | '',
  ): void {
    this.parent._document[operations].push({
      type: OperationType['StyleDeclarationSetProperty'],
      uid: this.parent._uniqueId,
      property,
      value: value,
      priority: priority,
    });
  }

  removeProperty(property: string): void {
    this.parent._document[operations].push({
      type: OperationType['StyleDeclarationRemoveProperty'],
      uid: this.parent._uniqueId,
      property,
    });
  }
}
