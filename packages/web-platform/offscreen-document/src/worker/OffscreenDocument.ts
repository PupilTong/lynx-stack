import { Rpc } from '@lynx-js/web-worker-rpc';
import { OffscreenElement } from './OffscreenElement.js';
import { operations, uniqueIdAttribute } from '../common/constants.js';
import {
  OperationType,
  type ElementOperation,
} from '../common/ElementOperation.js';

export class OffscreenDocument {
  /**
   * @private
   */
  private _uniqueIdInc = 1;
  /**
   * @private
   */
  private _rpc: Rpc;

  /**
   * @private
   */
  private _uniqueIdToElement: Record<string, WeakRef<OffscreenElement>> = {};

  /**
   * @private
   */
  [operations]: ElementOperation[] = [];

  /**
   * @private
   * @param uniqueId
   * @returns
   */
  _getElementByUniqueId(uniqueId: string): OffscreenElement | undefined {
    return this._uniqueIdToElement[uniqueId]?.deref();
  }

  constructor(port: MessagePort) {
    this._rpc = new Rpc(port, 'offscreendocument');
  }
  createElement(tagName: string): OffscreenElement {
    const uniqueId = (this._uniqueIdInc++).toString();
    const element = new OffscreenElement(tagName, this);
    element.setAttribute(uniqueIdAttribute, uniqueId);
    this[operations].push({
      type: OperationType.CreateElement,
      uid: uniqueId,
      tag: tagName,
    });
    return element;
  }
}
