import initWasm from '../../binary/element.js';
export const elementPtrSymbol = Symbol('elementPtr');
export type RawElementNode = {
  [elementPtrSymbol]: number;
};

export type ElementModule = Awaited<ReturnType<typeof createElementModule>>;

export async function createElementModule() {
  const wasmModule = await initWasm();
  const permanentStringPtrMap = new Map<string, number>();
  const ptrToJSObjectMap = new Map<number, WeakRef<RawElementNode>>();
  const objectGCObserver = new FinalizationRegistry<number>((ptr) => {
    wasmModule._release_by_JS(ptr);
  });
  let innerHTMLBufferSize = 2048 * 1024; // 64KB
  function createRawElementNode<T extends RawElementNode>(
    ptr: number,
  ): T | null {
    if (ptr === 0) {
      return null;
    }
    const node = ptrToJSObjectMap.get(ptr)?.deref();
    if (node) {
      return node as T;
    } else {
      const elementObject: RawElementNode = {
        [elementPtrSymbol]: ptr,
      };
      objectGCObserver.register(elementObject, ptr);
      ptrToJSObjectMap.set(ptr, new WeakRef(elementObject));
      wasmModule._mark_held_by_JS(ptr);
      return elementObject as T;
    }
  }
  function _createPermanentStringPtr(str: string) {
    if (permanentStringPtrMap.has(str)) {
      return permanentStringPtrMap.get(str)!;
    }
    const ptr = wasmModule.stringToNewUTF8(str);
    permanentStringPtrMap.set(str, ptr);
    return ptr;
  }

  function createElement<T extends RawElementNode>(tag: string, mixin: T): T {
    const elementPtr = wasmModule._create_element(
      _createPermanentStringPtr(tag),
    );

    const elementObject: RawElementNode = mixin ?? {
      [elementPtrSymbol]: 0,
    };
    elementObject[elementPtrSymbol] = elementPtr;
    objectGCObserver.register(elementObject, elementPtr);
    ptrToJSObjectMap.set(elementPtr, new WeakRef(elementObject));
    return elementObject as T;
  }

  function getChildren<T extends RawElementNode>(element: T): T[] {
    const childrenArrayPtr = wasmModule._get_children(
      element[elementPtrSymbol],
    ) as number;
    const length = (wasmModule.HEAPU32 as Uint32Array).at(
      childrenArrayPtr,
    ) as number;
    const childPtrArray = [
      ...(wasmModule.HEAPU32 as Uint32Array).subarray(
        childrenArrayPtr + 1,
        childrenArrayPtr + length,
      ).values(),
    ].map(createRawElementNode<T>).filter((e) => e);
    wasmModule._free(childrenArrayPtr);
    return childPtrArray as T[];
  }

  function getParentElement<T extends RawElementNode>(element: T): T | null {
    const parentPtr = wasmModule._get_parent_element(
      element[elementPtrSymbol],
    ) as number;
    return createRawElementNode<T>(parentPtr);
  }

  function getFirstElementChild<T extends RawElementNode>(
    element: T,
  ): T | null {
    const firstChildPtr = wasmModule._get_first_element_child(
      element[elementPtrSymbol],
    ) as number;
    return createRawElementNode<T>(firstChildPtr);
  }

  function getLastElementChild<T extends RawElementNode>(element: T): T | null {
    const lastChildPtr = wasmModule._get_last_element_child(
      element[elementPtrSymbol],
    ) as number;
    return createRawElementNode<T>(lastChildPtr);
  }

  function getNextElementSibling<T extends RawElementNode>(
    element: T,
  ): T | null {
    const nextSiblingPtr = wasmModule._get_next_element_sibling(
      element[elementPtrSymbol],
    ) as number;
    return createRawElementNode<T>(nextSiblingPtr);
  }

  function append<T extends RawElementNode>(parent: T, ...child: T[]) {
    const children = wasmModule._malloc(4 * child.length);
    wasmModule.HEAPU32.set(child.map(c => c[elementPtrSymbol]), children / 4);
    wasmModule._append(parent[elementPtrSymbol], children, child.length);
    wasmModule._free(children);
  }

  function replaceWith<T extends RawElementNode>(element: T, ...child: T[]) {
    const children = wasmModule._malloc(4 * child.length);
    wasmModule.HEAPU32.set(child.map(c => c[elementPtrSymbol]), children / 4);
    wasmModule._replace_with(element[elementPtrSymbol], children, child.length);
    wasmModule._free(children);
  }

  function insertBefore<T extends RawElementNode>(
    parent: T,
    newNode: T,
    refNode: T | null,
  ) {
    const refNodePtr = refNode ? refNode[elementPtrSymbol] : 0;
    wasmModule._insert_before(
      parent[elementPtrSymbol],
      newNode[elementPtrSymbol],
      refNodePtr,
    );
  }

  function removeChild<T extends RawElementNode>(parent: T, child: T) {
    wasmModule._remove_child(parent[elementPtrSymbol], child[elementPtrSymbol]);
  }

  function getUniqueId(element: RawElementNode) {
    return wasmModule._get_unique_id(element[elementPtrSymbol]);
  }

  function remove(element: RawElementNode) {
    const ptr = element[elementPtrSymbol];
    wasmModule._remove_this(ptr);
  }
  function getInnerHTML(element: RawElementNode) {
    const buffer = wasmModule._malloc(innerHTMLBufferSize);
    const usedSize = wasmModule._get_inner_HTML(
      element[elementPtrSymbol],
      buffer,
      innerHTMLBufferSize,
    );
    if (usedSize >= innerHTMLBufferSize) {
      innerHTMLBufferSize *= 2;
      wasmModule._free(buffer);
      return getInnerHTML(element);
    } else {
      const htmlString = wasmModule.UTF8ToString(buffer);
      wasmModule._free(buffer);
      return htmlString;
    }
  }

  function setInnerHTML(element: RawElementNode, htmlString: string) {
    wasmModule._set_inner_HTML(
      element[elementPtrSymbol],
      wasmModule.stringToNewUTF8(htmlString),
    );
  }

  function setAttribute(element: RawElementNode, name: string, value: string) {
    wasmModule._set_attribute(
      element[elementPtrSymbol],
      _createPermanentStringPtr(name),
      wasmModule.stringToNewUTF8(value),
    );
  }

  function removeAttribute(element: RawElementNode, name: string) {
    wasmModule._remove_attribute(
      element[elementPtrSymbol],
      _createPermanentStringPtr(name),
    );
  }

  function getAttribute(element: RawElementNode, name: string) {
    const valuePtr = wasmModule._get_attribute(
      element[elementPtrSymbol],
      _createPermanentStringPtr(name),
    );
    if (valuePtr === 0) {
      return null;
    }
    const value = wasmModule.UTF8ToString(valuePtr);
    return value;
  }

  function getAttributeNames(element: RawElementNode) {
    const namesArrayPtr = wasmModule._get_attribute_names(
      element[elementPtrSymbol],
    ) as number;
    const length = (wasmModule.HEAPU32 as Uint32Array).at(
      namesArrayPtr,
    ) as number;
    const names = [
      ...(wasmModule.HEAPU32 as Uint32Array).subarray(
        namesArrayPtr + 1,
        namesArrayPtr + length,
      ).values(),
    ].map((strPtr) => wasmModule.UTF8ToString(strPtr));
    return names;
  }

  function setStyleProperty(
    element: RawElementNode,
    property: string,
    value: string,
    isImportant: boolean,
  ) {
    wasmModule._set_style_property(
      element[elementPtrSymbol],
      _createPermanentStringPtr(property),
      wasmModule.stringToNewUTF8(value),
      isImportant ? 1 : 0,
    );
  }

  function removeStyleProperty(element: RawElementNode, property: string) {
    wasmModule._remove_style_property(
      element[elementPtrSymbol],
      _createPermanentStringPtr(property),
    );
  }

  return {
    createElement,
    getChildren,
    getParentElement,
    getFirstElementChild,
    getLastElementChild,
    getNextElementSibling,
    append,
    replaceWith,
    insertBefore,
    removeChild,
    getUniqueId,
    remove,
    getInnerHTML,
    setInnerHTML,
    setAttribute,
    removeAttribute,
    getAttribute,
    getAttributeNames,
    setStyleProperty,
    removeStyleProperty,
  };
}
