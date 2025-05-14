import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const napi = require('./dist/offscreen-dom-napi.node');

export function createElement(tagName) {
  const ptr = napi.createElement(tagName);
  return {
    ptr,
  };
}

export function append(parent, ...child) {
  const children = new BigUint64Array(child.map(c => c.ptr));
  napi.append(parent.ptr, children);
}

export function getInnerHTML(element) {
  const buffer = new ArrayBuffer(655360);
  napi.getInnerHTML(element.ptr, buffer);
  const decoder = new TextDecoder('utf-8');
  const htmlString = decoder.decode(buffer);
  return htmlString;
}

let start, end, root, sum;

import * as js from './OffscreenNode.js';

import init from './dist/offscreen-dom-wasm.js';
const wasmImpl = await init();
// console.log('wasmImpl', wasmImpl);
const wasm = {
  createElement(tagName) {
    const ptr = wasmImpl._JS_CreateElement(wasmImpl.stringToNewUTF8(tagName));
    return {
      ptr,
    };
  },
  append(parent, ...child) {
    const children = wasmImpl._malloc(4 * child.length);
    wasmImpl.HEAPU32.set(child.map(c => c.ptr), children / 4);
    wasmImpl._JS_Append(parent.ptr, children, child.length);
    wasmImpl._free(children);
  },
  getInnerHTML(element) {
    const buffer = wasmImpl._malloc(655360);
    const usedSize = wasmImpl._JS_GetInnerHTML(element.ptr, buffer, 655360);
    const htmlString = wasmImpl.UTF8ToString(buffer);
    wasmImpl._free(buffer);
    return htmlString;
  },
};

sum = 0;
for (let j = 0; j < 10; j++) {
  start = performance.now();
  root = js.createElement('div');
  for (let i = 0; i < 10000; i++) {
    const child = js.createElement('div');
    js.append(root, child);
  }
  const html2 = js.getInnerHTML(root);
  end = performance.now();
  sum += end - start;
}
console.log('js-avg:', sum / 10, 'ms');

sum = 0;
for (let j = 0; j < 10; j++) {
  start = performance.now();
  root = createElement('div');
  // console.log('root', root);
  for (let i = 0; i < 10000; i++) {
    const child = createElement('div');
    append(root, child);
  }
  const html = getInnerHTML(root);
  end = performance.now();
  sum += end - start;
}
console.log('napi-avg:', sum / 10, 'ms');

sum = 0;
for (let j = 0; j < 10; j++) {
  start = performance.now();
  root = wasm.createElement('div');
  for (let i = 0; i < 10000; i++) {
    const child = wasm.createElement('div');
    wasm.append(root, child);
  }
  const html = wasm.getInnerHTML(root);
  end = performance.now();
  sum += end - start;
}
console.log('wasm-avg:', sum / 10, 'ms');
