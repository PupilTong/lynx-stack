import {
  nextSibling,
  operations,
  prevSibling,
  uniqueIdAttribute,
} from '../common/constants.js';
import { OperationType } from '../common/ElementOperation.js';
import type { OffscreenDocument } from './OffscreenDocument.js';

export class OffscreenElement {
  private _parent: OffscreenElement | null = null;

  private _firstChild: OffscreenElement | null = null;
  private _lastchild: OffscreenElement | null = null;
  [prevSibling]: OffscreenElement | null = null;
  [nextSibling]: OffscreenElement | null = null;

  private readonly _attributes: Record<string, string> = {};

  constructor(
    public readonly tagName: string,
    private document: OffscreenDocument,
  ) {
  }

  get children(): OffscreenElement[] {
    return this.children.slice();
  }

  get parentElement(): OffscreenElement | null {
    return this._parent;
  }

  get firstElementChild(): OffscreenElement | null {
    return this._firstChild;
  }

  get lastElementChild(): OffscreenElement | null {
    return this._lastchild;
  }

  get id(): string {
    return this._attributes['id'] ?? '';
  }
  set id(value: string) {
    this._attributes['id'] = value;
    this.setAttribute('id', value);
  }

  setAttribute(qualifiedName: string, value: string): void {
    this._attributes[qualifiedName] = value;
    this.document[operations].push({
      type: OperationType.SetAttribute,
      uid: this._attributes[uniqueIdAttribute]!,
      key: qualifiedName,
      value,
    });
  }

  getAttribute(qualifiedName: string): string | null {
    return this._attributes[qualifiedName] ?? null;
  }

  removeAttribute(qualifiedName: string): void {
    delete this._attributes[qualifiedName];
    this.document[operations].push({
      type: OperationType.RemoveAttribute,
      uid: this._attributes[uniqueIdAttribute]!,
      key: qualifiedName,
    });
  }

  append(...nodes: (OffscreenElement)[]): void {
    this.document[operations].push({
      type: OperationType.Append,
      uid: this._attributes[uniqueIdAttribute]!,
      cid: nodes.map(node => node._attributes[uniqueIdAttribute]!),
    });
    for (const node of nodes) {
      node.remove();
      node[prevSibling] = this._lastchild;
      if (this._lastchild) {
        this._lastchild[nextSibling] = node;
      }
      node._parent = this;
      if (!this._firstChild) {
        this._firstChild = node;
      }
      if (!this._lastchild) {
        this._lastchild = node;
      }
    }
  }

  replaceWith(...nodes: (OffscreenElement)[]): void {
    this.document[operations].push({
      type: OperationType.ReplaceWith,
      uid: this._attributes[uniqueIdAttribute]!,
      nid: nodes.map(node => node._attributes[uniqueIdAttribute]!),
    });
  }

  getAttributeNames(): string[] {
    return Object.keys(this._attributes);
  }
  remove(): void {
    if (this._parent) {
      this.document[operations].push({
        type: OperationType.Remove,
        uid: this._attributes[uniqueIdAttribute]!,
      });
      if (this._parent._firstChild === this) {
        this._parent._firstChild = this[nextSibling];
      }
      if (this._parent._lastchild === this) {
        this._parent._lastchild = null;
      }
      if (this[prevSibling]) {
        this[prevSibling][nextSibling] = this[nextSibling];
      }
      if (this[nextSibling]) {
        this[nextSibling][prevSibling] = this[prevSibling];
      }
      this[prevSibling] = null;
      this[nextSibling] = null;
      this._parent = null;
    }
  }
}
