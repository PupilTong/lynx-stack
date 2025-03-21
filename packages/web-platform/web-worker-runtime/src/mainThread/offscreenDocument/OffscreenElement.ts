import { OperationType } from '@lynx-js/web-constants';
import {
  enableEvent,
  operations,
  type OffscreenDocument,
} from './OffscreenDocument.js';
import { OffscreenCSSStyleDeclaration } from './OffscreenCSSStyleDeclaration.js';

export const prevSibling = Symbol('prevSibling');
export const nextSibling = Symbol('nextSibling');

export class OffscreenElement extends EventTarget {
  private _style?: OffscreenCSSStyleDeclaration;
  private _parent: OffscreenElement | null = null;
  private _firstChild: OffscreenElement | null = null;
  private _lastchild: OffscreenElement | null = null;
  [prevSibling]: OffscreenElement | null = null;
  [nextSibling]: OffscreenElement | null = null;

  private readonly _attributes: Record<string, string> = {};

  /**
   * @private
   */
  readonly _uniqueId: number;

  /**
   * @private
   */
  readonly _document: OffscreenDocument;

  constructor(
    public readonly tagName: string,
    document: OffscreenDocument,
    uniqueId: number,
  ) {
    super();
    this._document = document;
    this._uniqueId = uniqueId;
  }

  get style(): OffscreenCSSStyleDeclaration {
    if (!this._style) {
      this._style = new OffscreenCSSStyleDeclaration(
        this,
      );
    }
    return this._style;
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

  get nextElementSibling(): OffscreenElement | null {
    return this[nextSibling];
  }

  get id(): string {
    return this._attributes['id'] ?? '';
  }

  set id(value: string) {
    this._attributes['id'] = value;
    this.setAttribute('id', value);
  }

  get className(): string {
    return this._attributes['class'] ?? '';
  }

  setAttribute(qualifiedName: string, value: string): void {
    this._attributes[qualifiedName] = value;
    this._document[operations].push({
      type: OperationType.SetAttribute,
      uid: this._uniqueId,
      key: qualifiedName,
      value,
    });
  }

  getAttribute(qualifiedName: string): string | null {
    return this._attributes[qualifiedName] ?? null;
  }

  removeAttribute(qualifiedName: string): void {
    delete this._attributes[qualifiedName];
    this._document[operations].push({
      type: OperationType.RemoveAttribute,
      uid: this._uniqueId,
      key: qualifiedName,
    });
  }

  append(...nodes: (OffscreenElement)[]): void {
    this._document[operations].push({
      type: OperationType.Append,
      uid: this._uniqueId,
      cid: nodes.map(node => node._uniqueId),
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
    this._document[operations].push({
      type: OperationType.ReplaceWith,
      uid: this._uniqueId,
      nid: nodes.map(node => node._uniqueId),
    });
  }

  getAttributeNames(): string[] {
    return Object.keys(this._attributes);
  }

  remove(): void {
    if (this._parent) {
      this._document[operations].push({
        type: OperationType.Remove,
        uid: this._uniqueId,
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

  insertBefore(
    newNode: OffscreenElement,
    refNode: OffscreenElement | null,
  ): OffscreenElement {
    this._document[operations].push({
      type: OperationType.InsertBefore,
      uid: this._uniqueId,
      cid: newNode._uniqueId,
      ref: refNode?._uniqueId,
    });
    newNode.remove();
    if (refNode) {
      newNode[prevSibling] = refNode[prevSibling];
      if (refNode[prevSibling]) {
        refNode[prevSibling][nextSibling] = newNode;
      }
      newNode[nextSibling] = refNode;
      refNode[prevSibling] = newNode;
    } else {
      this.append(newNode);
    }
    return newNode;
  }

  removeChild(child: OffscreenElement | null): OffscreenElement {
    if (!child) {
      throw new DOMException(
        'The node to be removed is not a child of this node.',
        'NotFoundError',
      );
    }
    this._document[operations].push({
      type: OperationType.RemoveChild,
      uid: this._uniqueId,
      cid: child._uniqueId,
    });
    if (child._parent !== this) {
      throw new DOMException(
        'The node to be removed is not a child of this node.',
        'NotFoundError',
      );
    }
    child.remove();
    return child;
  }

  insertAdjacentHTML(
    position: 'beforebegin' | 'afterbegin' | 'beforeend' | 'afterend',
    text: string,
  ) {
    this._document[operations].push({
      type: OperationType.InsertAdjacentHTML,
      position,
      text,
      uid: this._uniqueId,
    });
  }

  // #captureListeners:Record<string, Set<EventListener> | undefined> = {};
  // #normalListeners:Record<string, Set<EventListener> | undefined> = {};

  override addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean,
  ): void {
    this._document[enableEvent](type);
    super.addEventListener(type, callback, options);
  }

  // override addEventListener(type: string, callback: EventListener | null, options?: AddEventListenerOptions): void {
  //   if (!callback)return;
  //   const isCapture = options?.capture;
  //   const isOnce = options?.once;
  //   const targetMap = isCapture ? this.#captureListeners : this.#normalListeners;
  //   if (isOnce) {
  //     const currentCallback = callback;
  //     callback = (ev:Event) => {
  //       currentCallback(ev);
  //       this.removeEventListener(type, callback, options);
  //     }
  //   }
  //   if (!targetMap[type]) {
  //     targetMap[type] = new Set([callback]);
  //     this._document[operations].push({
  //       type: OperationType.EnableEvent,
  //       uid: this._uniqueId,
  //       eventType: type,
  //     })
  //   } else {
  //     targetMap[type].add(callback);
  //   }
  //   super.addEventListener(type, callback, options);
  // }

  // override removeEventListener(type: string, callback: EventListener | null, options?: EventListenerOptions): void {
  //   if (!callback)return;
  //   const isCapture = options?.capture;
  //   const targetMap = isCapture ? this.#captureListeners : this.#normalListeners;
  //   targetMap[type]?.delete(callback);
  //   if (targetMap[type]?.size === 0) {
  //     targetMap[type] = undefined;
  //     this._document[operations].push({
  //       type: OperationType.DisableEvent,
  //       uid: this._uniqueId,
  //       isCapture: isCapture ?? false,
  //       eventType: type,
  //     })
  //   }
  // }
}

export interface OffscreenEvent {
  type: string;
  timestamp: number;
  target: OffscreenElement;
  currentTarget: OffscreenElement;
  detail: Parameters<typeof structuredClone>[0];
  [key: string]: string | number | undefined | null | {};
}
