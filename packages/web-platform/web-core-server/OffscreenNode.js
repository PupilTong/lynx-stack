// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the

import { get } from "http";

// LICENSE file in the root directory of this source tree.
export const uniqueId = Symbol('uniqueId');
export const ancestorDocument = Symbol('ancestorDocument');
export class OffscreenNode extends EventTarget {
    _parentElement = null;
    _children = [];
    attributes = {};
    /**
     * @private
     */
    [uniqueId];
    constructor(tagName, elementUniqueId) {
        super();
        this.tagName = tagName;
        this[uniqueId] = elementUniqueId;
    }
    get children() {
        return this._children.slice();
    }
    get parentElement() {
        return this._parentElement;
    }
    get parentNode() {
        return this._parentElement;
    }
    get firstElementChild() {
        return this._children[0] ?? null;
    }
    get lastElementChild() {
        return this._children[this._children.length - 1] ?? null;
    }
    get nextElementSibling() {
        const parent = this._parentElement;
        if (parent) {
            const nextElementSiblingIndex = parent._children.indexOf(this);
            if (nextElementSiblingIndex >= 0) {
                return parent._children[nextElementSiblingIndex + 1] || null;
            }
        }
        return null;
    }
    append(...nodes) {
        for (const node of nodes) {
            node._remove();
            node._parentElement = this;
        }
        this._children.push(...nodes);
    }
    replaceWith(...nodes) {
        if (this._parentElement) {
            const parent = this._parentElement;
            this._parentElement = null;
            const currentIdx = parent._children.indexOf(this);
            parent._children.splice(currentIdx, 1, ...nodes);
            for (const node of nodes) {
                node._parentElement = parent;
            }
        }
    }
    _remove() {
        if (this._parentElement) {
            const currentIdx = this._parentElement._children.indexOf(this);
            this._parentElement._children.splice(currentIdx, 1);
            this._parentElement = null;
        }
    }
    insertBefore(newNode, refNode) {
        newNode._remove();
        if (refNode) {
            const refNodeIndex = this._children.indexOf(refNode);
            if (refNodeIndex >= 0) {
                newNode._parentElement = this;
                this._children.splice(refNodeIndex, 0, newNode);
            }
        }
        else {
            newNode._parentElement = this;
            this._children.push(newNode);
        }
        return newNode;
    }
    removeChild(child) {
        if (!child) {
            throw new DOMException('The node to be removed is not a child of this node.', 'NotFoundError');
        }
        if (child._parentElement !== this) {
            throw new DOMException('The node to be removed is not a child of this node.', 'NotFoundError');
        }
        child._remove();
        return child;
    }
}

let incId = 1;
export function createElement(tagName) {
    return new OffscreenNode(tagName, incId++);
}

export function append(parent, ...child) {
    parent.append(...child);
}

function getInnerHTMLImpl(buffer, element) {
    buffer.push(`<${element.tagName}`);
    for (const [key, value] of Object.entries(element.attributes)) {
        buffer.push(` ${key}="${value}"`);
    }
    buffer.push('>');
    for (const child of element.children) {
        getInnerHTMLImpl(buffer, child);
    }
    buffer.push(`</${element.tagName}>`);
}

export function getInnerHTML(element) {
    const buffer = [];
    getInnerHTMLImpl(buffer, element);
    return buffer.join('');
}
