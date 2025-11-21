import { describe, test, expect, beforeEach } from 'vitest';
import { createMainThreadElementApis } from '../ts/createMainThreadElementApis.js';
import { MainThreadJSBinding } from '../ts/mtsBinding.js';
import { JSDOM } from 'jsdom';
import { vi } from 'vitest';
import { beforeAll } from 'vitest';
import { templateManager } from '../ts/templateManager.js';
const { window } = new JSDOM(undefined, { url: 'http://localhost/' });
const document = window.document;
Object.assign(globalThis, { document, window, Window: window.Window });
describe('Element APIs', () => {
  let lynxViewDom: HTMLElement;
  let rootDom: ShadowRoot;
  let elementApis: ReturnType<typeof createMainThreadElementApis>;
  let mtsBinding: MainThreadJSBinding;
  beforeEach(() => {
    vi.resetAllMocks();
    lynxViewDom = document.createElement('div') as unknown as HTMLElement;
    rootDom = lynxViewDom.attachShadow({ mode: 'open' });
    mtsBinding = new MainThreadJSBinding({} as any, {} as any);
    elementApis = createMainThreadElementApis(
      'test',
      rootDom,
      mtsBinding,
      {},
      true,
      true,
      true,
      true,
    );
    mtsBinding.setMainThreadInstance(elementApis);
  });
  test('createElementView', () => {
    const element = elementApis.__CreateElement('view', 0);
    expect(elementApis.__GetTag(element)).toBe('view');
  });
  test('__CreateComponent', () => {
    const ret = elementApis.__CreateComponent(
      0,
      'id',
      0,
      'test_entry',
      'name',
      'path',
      {},
      {},
    );
    elementApis.__UpdateComponentID(ret, 'id');
    expect(elementApis.__GetComponentID(ret)).toBe('id');
    expect(elementApis.__GetAttributeByName(ret, 'name')).toBe('name');
  });

  test('__CreateView', () => {
    const ret = elementApis.__CreateView(0);
    expect(elementApis.__GetTag(ret)).toBe('view');
  });

  test('__CreateScrollView', () => {
    const ret = elementApis.__CreateScrollView(0);
    expect(elementApis.__GetTag(ret)).toBe('scroll-view');
  });

  test('create-scroll-view-with-set-attribute', () => {
    let root = elementApis.__CreatePage('page', 0);
    let ret = elementApis.__CreateScrollView(0);
    elementApis.__SetAttribute(ret, 'scroll-x', true);
    elementApis.__AppendElement(root, ret);
    elementApis.__FlushElementTree();
    expect(elementApis.__GetAttributeByName(ret, 'scroll-x')).toBe('true');
    expect(rootDom.querySelector('scroll-view')?.getAttribute('scroll-x')).toBe(
      'true',
    );
  });

  test('__SetID', () => {
    let root = elementApis.__CreatePage('page', 0);
    let ret = elementApis.__CreateView(0);
    elementApis.__SetID(ret, 'target');
    elementApis.__AppendElement(root, ret);
    elementApis.__FlushElementTree();
    expect(rootDom.querySelector('#target')).not.toBeNull();
  });

  test('__SetID to remove id', () => {
    let root = elementApis.__CreatePage('page', 0);
    let ret = elementApis.__CreateView(0);
    elementApis.__SetID(ret, 'target');
    elementApis.__AppendElement(root, ret);
    elementApis.__FlushElementTree();
    expect(elementApis.__GetAttributeByName(ret, 'id')).toBe('target');
    expect(rootDom.querySelector('#target')).not.toBeNull();
    elementApis.__SetID(ret, null);
    expect(elementApis.__GetAttributeByName(ret, 'id')).toBe(null);
    expect(rootDom.querySelector('#target')).toBeNull();
  });

  test('__CreateText', () => {
    const ret = elementApis.__CreateText(0);
    expect(elementApis.__GetTag(ret)).toBe('text');
  });

  test('__CreateImage', () => {
    const ret = elementApis.__CreateImage(0);
    expect(elementApis.__GetTag(ret)).toBe('image');
  });

  test('__CreateRawText', () => {
    const ret = elementApis.__CreateRawText('content');
    expect(elementApis.__GetTag(ret)).toBe('raw-text');
    expect(elementApis.__GetAttributeByName(ret, 'text')).toBe('content');
  });

  test('__CreateWrapperElement', () => {
    const ret = elementApis.__CreateWrapperElement(0);
    expect(elementApis.__GetTag(ret)).toBe('lynx-wrapper');
  });

  test('__AppendElement-children-count', () => {
    let ret = elementApis.__CreateView(0);
    let child_0 = elementApis.__CreateView(0);
    let child_1 = elementApis.__CreateView(0);
    elementApis.__AppendElement(ret, child_0);
    elementApis.__AppendElement(ret, child_1);
    expect(elementApis.__GetChildren(ret).length).toBe(2);
  });

  test('__AppendElement-__RemoveElement', () => {
    let ret = elementApis.__CreateView(0);
    let child_0 = elementApis.__CreateView(0);
    let child_1 = elementApis.__CreateView(0);
    elementApis.__AppendElement(ret, child_0);
    elementApis.__AppendElement(ret, child_1);
    elementApis.__RemoveElement(ret, child_0);
    expect(elementApis.__GetChildren(ret).length).toBe(1);
  });

  test('__InsertElementBefore', () => {
    let ret = elementApis.__CreateView(0);
    let child_0 = elementApis.__CreateView(0);
    let child_1 = elementApis.__CreateImage(0);
    let child_2 = elementApis.__CreateText(0);
    elementApis.__InsertElementBefore(ret, child_0, null);
    elementApis.__InsertElementBefore(ret, child_1, child_0);
    elementApis.__InsertElementBefore(ret, child_2, child_1);
    const children = elementApis.__GetChildren(ret);
    expect(children.length).toBe(3);
    expect(elementApis.__GetTag(children[0])).toBe('text');
    expect(elementApis.__GetTag(children[1])).toBe('image');
  });

  test('__FirstElement', () => {
    let root = elementApis.__CreateView(0);
    let ret0 = elementApis.__FirstElement(root);
    let child_0 = elementApis.__CreateView(0);
    let child_1 = elementApis.__CreateImage(0);
    let child_2 = elementApis.__CreateText(0);
    elementApis.__InsertElementBefore(root, child_0, null);
    elementApis.__InsertElementBefore(root, child_1, child_0);
    elementApis.__InsertElementBefore(root, child_2, child_1);
    let ret1 = elementApis.__FirstElement(root);
    expect(ret0).toBeFalsy();
    expect(elementApis.__GetTag(ret1!)).toBe('text');
  });

  test('__LastElement', () => {
    let root = elementApis.__CreateView(0);
    let ret0 = elementApis.__LastElement(root);
    let child_0 = elementApis.__CreateView(0);
    let child_1 = elementApis.__CreateImage(0);
    let child_2 = elementApis.__CreateText(0);
    elementApis.__InsertElementBefore(root, child_0, null);
    elementApis.__InsertElementBefore(root, child_1, child_0);
    elementApis.__InsertElementBefore(root, child_2, child_1);
    let ret1 = elementApis.__LastElement(root);
    expect(ret0).toBeFalsy();
    expect(elementApis.__GetTag(ret1!)).toBe('view');
  });

  test('__NextElement', () => {
    let root = elementApis.__CreateView(0);
    let ret0 = elementApis.__NextElement(root);
    let child_0 = elementApis.__CreateView(0);
    let child_1 = elementApis.__CreateImage(0);
    let child_2 = elementApis.__CreateText(0);
    elementApis.__InsertElementBefore(root, child_0, null);
    elementApis.__InsertElementBefore(root, child_1, child_0);
    elementApis.__InsertElementBefore(root, child_2, child_1);
    let ret1 = elementApis.__NextElement(elementApis.__FirstElement(root)!);
    expect(ret0).toBeFalsy();
    expect(elementApis.__GetTag(ret1!)).toBe('image');
  });

  test('__ReplaceElement', () => {
    let root = elementApis.__CreatePage('page', 0);
    let ret0 = elementApis.__NextElement(root);
    let child_0 = elementApis.__CreateView(0);
    let child_1 = elementApis.__CreateImage(0);
    let child_2 = elementApis.__CreateText(0);
    let child_3 = elementApis.__CreateScrollView(0);
    elementApis.__InsertElementBefore(root, child_0, null);
    elementApis.__InsertElementBefore(root, child_1, child_0);
    elementApis.__InsertElementBefore(root, child_2, child_1);
    elementApis.__ReplaceElement(child_3, child_1);
    let ret1 = elementApis.__NextElement(elementApis.__FirstElement(root)!);
    elementApis.__FlushElementTree();
    expect(ret0).toBeFalsy();
    expect(elementApis.__GetTag(ret1!)).toBe('scroll-view');
  });

  test('__SwapElement', () => {
    let root = elementApis.__CreateView(0);
    let ret = root;
    let ret0 = elementApis.__NextElement(root);
    let child_0 = elementApis.__CreateView(0);
    let child_1 = elementApis.__CreateImage(0);
    let child_2 = elementApis.__CreateText(0);
    elementApis.__AppendElement(root, child_0);
    elementApis.__AppendElement(root, child_1);
    elementApis.__AppendElement(root, child_2);
    elementApis.__SwapElement(child_0, child_1);
    const children = elementApis.__GetChildren(ret);
    expect(ret0).toBeFalsy();
    expect(elementApis.__GetTag(children[0])).toBe('image');
    expect(elementApis.__GetTag(children[1])).toBe('view');
  });

  test('__GetParent', () => {
    let root = elementApis.__CreateView(0);
    let ret0 = elementApis.__NextElement(root);
    let child_0 = elementApis.__CreateView(0);
    let child_1 = elementApis.__CreateImage(0);
    let child_2 = elementApis.__CreateText(0);
    elementApis.__AppendElement(root, child_0);
    elementApis.__AppendElement(root, child_1);
    elementApis.__AppendElement(root, child_2);
    let ret1 = elementApis.__GetParent(child_0);
    expect(ret1).toBeTruthy();
  });

  test('__GetChildren', () => {
    let root = elementApis.__CreateView(0);
    let ret0 = elementApis.__NextElement(root);
    let child_0 = elementApis.__CreateView(0);
    let child_1 = elementApis.__CreateImage(0);
    let child_2 = elementApis.__CreateText(0);
    elementApis.__AppendElement(root, child_0);
    elementApis.__AppendElement(root, child_1);
    elementApis.__AppendElement(root, child_2);
    let ret1 = elementApis.__GetChildren(root);
    expect(ret0).toBeFalsy();
    expect(Array.isArray(ret1)).toBe(true);
    expect(ret1?.length).toBe(3);
  });

  test('__ElementIsEqual', () => {
    let node1 = elementApis.__CreateView(0);
    let node2 = elementApis.__CreateView(0);
    let node3 = node1;
    let ret0 = elementApis.__ElementIsEqual(node1, node2);
    let ret1 = elementApis.__ElementIsEqual(node1, node3);
    let ret2 = elementApis.__ElementIsEqual(node1, null);
    expect(ret0).toBe(false);
    expect(ret1).toBe(true);
    expect(ret2).toBe(false);
  });

  test('__GetElementUniqueID', () => {
    let node1 = elementApis.__CreateView(0);
    let node2 = elementApis.__CreateView(0);
    let ret0 = elementApis.__GetElementUniqueID(node1);
    let ret1 = elementApis.__GetElementUniqueID(node2);
    expect(ret0 + 1).toBe(ret1);
  });

  test('__GetAttributes', () => {
    let node1 = elementApis.__CreateText(0);
    elementApis.__SetAttribute(node1, 'test', 'test-value');
    let attr_map = elementApis.__GetAttributes(node1);
    expect(attr_map['test']).toEqual('test-value');
    let page = elementApis.__CreatePage('page', 0);
    elementApis.__AppendElement(page, node1);
    elementApis.__FlushElementTree();
    expect(rootDom.querySelector('[test="test-value"]')).not.toBeNull();
  });

  test('__GetAttributeByName', () => {
    const page = elementApis.__CreatePage('page', 0);
    elementApis.__SetAttribute(page, 'test-attr', 'val');
    elementApis.__FlushElementTree();
    expect(elementApis.__GetAttributeByName(page, 'test-attr')).toBe('val');
    expect(
      rootDom.querySelector('[test-attr="val"]'),
    ).not.toBeNull();
  });

  test('__SetDataset', () => {
    let root = elementApis.__CreatePage('page', 0);
    let node1 = elementApis.__CreateText(0);
    elementApis.__SetDataset(node1, { 'test': 'test-value' });
    let ret_0 = elementApis.__GetDataset(node1);
    elementApis.__AddDataset(node1, 'test1', 'test-value1');
    let ret_2 = elementApis.__GetDataByKey(node1, 'test1');
    elementApis.__AppendElement(root, node1);
    elementApis.__AppendElement(root, node1);
    elementApis.__FlushElementTree();
    expect(ret_0).toEqual({ 'test': 'test-value' });
    expect(ret_2).toBe('test-value1');
    expect(rootDom.querySelector('[data-test="test-value"]')).not.toBeNull();
    expect(rootDom.querySelector('[data-test1="test-value1"]')).not.toBeNull();
  });

  test('__GetClasses', () => {
    let root = elementApis.__CreatePage('page', 0);
    let node1 = elementApis.__CreateText(0);
    elementApis.__AddClass(node1, 'a');
    elementApis.__AddClass(node1, 'b');
    elementApis.__AddClass(node1, 'c');
    let class_1 = elementApis.__GetClasses(node1);
    expect(class_1.length).toBe(3);
    expect(class_1).toStrictEqual(['a', 'b', 'c']);
    elementApis.__AppendElement(root, node1);
    elementApis.__FlushElementTree();
    expect(rootDom.querySelector('[class="a b c"]')).not.toBeNull();
    elementApis.__SetClasses(node1, 'c b a');
    let class_2 = elementApis.__GetClasses(node1);
    elementApis.__FlushElementTree();
    expect(class_2.length).toBe(3);
    expect(class_2).toStrictEqual(['c', 'b', 'a']);
  });

  test('__UpdateComponentID', () => {
    let e1 = elementApis.__CreateComponent(
      0,
      'id1',
      0,
      'test_entry',
      'name',
      'path',
      {},
      {},
    );
    let e2 = elementApis.__CreateComponent(
      0,
      'id2',
      0,
      'test_entry',
      'name',
      'path',
      {},
      {},
    );
    elementApis.__UpdateComponentID(e1, 'id2');
    elementApis.__UpdateComponentID(e2, 'id1');
    expect(elementApis.__GetComponentID(e1)).toBe('id2');
    expect(elementApis.__GetComponentID(e2)).toBe('id1');
  });

  test('__SetInlineStyles', () => {
    const root = elementApis.__CreatePage('page', 0);
    let target = elementApis.__CreateView(0);
    elementApis.__SetID(target, 'target');
    elementApis.__SetInlineStyles(target, undefined);
    elementApis.__SetInlineStyles(target, {
      'margin': '10px',
      'marginTop': '20px',
      'marginLeft': '30px',
      'marginRight': '20px',
      'marginBottom': '10px',
    });
    elementApis.__AppendElement(root, target);
    elementApis.__FlushElementTree();
    const targetDom = rootDom.querySelector('#target') as HTMLElement;
    const targetStyle = targetDom.getAttribute('style');
    expect(targetStyle).toContain('20px');
    expect(targetStyle).toContain('30px');
    expect(targetStyle).toContain('10px');
  });

  test('__GetConfig__AddConfig', () => {
    let root = elementApis.__CreatePage('page', 0);
    elementApis.__AddConfig(root, 'key1', 'value1');
    elementApis.__AddConfig(root, 'key2', 'value2');
    elementApis.__AddConfig(root, 'key3', 'value3');
    elementApis.__FlushElementTree();
    let config = elementApis.__GetConfig(root);
    expect(config['key1']).toBe('value1');
    expect(config['key2']).toBe('value2');
    expect(config['key3']).toBe('value3');
  });

  test('__AddInlineStyle', () => {
    let root = elementApis.__CreatePage('page', 0);
    elementApis.__AddInlineStyle(root, 26, '80px');
    elementApis.__FlushElementTree();
    expect(root.style.height).toBe('80px');
  });

  test('__AddInlineStyle_key_is_name', () => {
    let root = elementApis.__CreatePage('page', 0);
    elementApis.__AddInlineStyle(root, 'height', '80px');
    expect(root.style.height).toBe('80px');
  });

  test('__AddInlineStyle_raw_string', () => {
    let root = elementApis.__CreatePage('page', 0);
    elementApis.__SetInlineStyles(root, 'height:80px');
    elementApis.__FlushElementTree();
    expect(root.style.height).toBe('80px');
  });

  test('complicated_dom_tree_opt', () => {
    let root = elementApis.__CreatePage('page', 0);

    let view_0 = elementApis.__CreateView(0);
    let view_1 = elementApis.__CreateView(0);
    let view_2 = elementApis.__CreateView(0);
    elementApis.__ReplaceElements(root, [view_0, view_1, view_2], null);

    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![0],
        view_0,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![1],
        view_1,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![2],
        view_2,
      ),
    ).toBe(true);
    let view_3 = elementApis.__CreateView(0);
    let view_4 = elementApis.__CreateView(0);
    let view_5 = elementApis.__CreateView(0);
    elementApis.__ReplaceElements(root, [view_3, view_4, view_5], [
      view_0,
      view_1,
      view_2,
    ]);

    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![0],
        view_3,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![1],
        view_4,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![2],
        view_5,
      ),
    ).toBe(true);
    elementApis.__FlushElementTree();

    elementApis.__ReplaceElements(root, [view_0, view_1, view_2], [
      view_3,
      view_4,
      view_5,
    ]);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![0],
        view_0,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![1],
        view_1,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![2],
        view_2,
      ),
    ).toBe(true);
    expect(elementApis.__GetChildren(root)!.length).toBe(3);

    elementApis.__ReplaceElements(root, [view_0, view_1, view_2], [
      view_0,
      view_1,
      view_2,
    ]);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![0],
        view_0,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![1],
        view_1,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![2],
        view_2,
      ),
    ).toBe(true);
    expect(elementApis.__GetChildren(root)!.length).toBe(3);

    elementApis.__ReplaceElements(root, [view_0, view_1, view_2], [
      view_0,
      view_1,
      view_2,
    ]);
    elementApis.__ReplaceElements(root, [view_0, view_1, view_2], [
      view_0,
      view_1,
      view_2,
    ]);
    elementApis.__ReplaceElements(root, [view_0, view_1, view_2], [
      view_0,
      view_1,
      view_2,
    ]);

    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![0],
        view_0,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![1],
        view_1,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![2],
        view_2,
      ),
    ).toBe(true);
    elementApis.__FlushElementTree();
  });

  test('__ReplaceElements', () => {
    let root = elementApis.__CreatePage('page', 0);
    let view_0 = elementApis.__CreateView(0);
    let view_1 = elementApis.__CreateView(0);
    let view_2 = elementApis.__CreateView(0);
    elementApis.__ReplaceElements(root, [view_0, view_1, view_2], null);
    expect(elementApis.__GetChildren(root)!.length).toBe(3);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![0],
        view_0,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![1],
        view_1,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![2],
        view_2,
      ),
    ).toBe(true);
    elementApis.__ReplaceElements(root, [view_2, view_1, view_0], [
      view_0,
      view_1,
      view_2,
    ]);
    expect(elementApis.__GetChildren(root)!.length).toBe(3);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![0],
        view_2,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![1],
        view_1,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![2],
        view_0,
      ),
    ).toBe(true);
    elementApis.__FlushElementTree();
  });

  test('__ReplaceElements_2', () => {
    let res = true;
    let root = elementApis.__CreatePage('page', 0);
    let view_0 = elementApis.__CreateView(0);
    let view_1 = elementApis.__CreateView(0);
    let view_2 = elementApis.__CreateView(0);
    elementApis.__ReplaceElements(root, [view_0, view_1, view_2], null);
    expect(elementApis.__GetChildren(root)!.length).toBe(3);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![0],
        view_0,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![1],
        view_1,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![2],
        view_2,
      ),
    ).toBe(true);
    elementApis.__FlushElementTree();

    let view_3 = elementApis.__CreateView(0);
    let view_4 = elementApis.__CreateView(0);
    elementApis.__ReplaceElements(root, [view_0, view_1, view_3, view_4], [
      view_0,
      view_1,
    ]);
    expect(elementApis.__GetChildren(root)!.length).toBe(5);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![0],
        view_0,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![1],
        view_1,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![2],
        view_3,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![3],
        view_4,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![4],
        view_2,
      ),
    ).toBe(true);
    elementApis.__FlushElementTree();

    let view_5 = elementApis.__CreateView(0);
    elementApis.__ReplaceElements(root, [view_5], null);
    elementApis.__FlushElementTree();
    expect(elementApis.__GetChildren(root)!.length).toBe(6);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![5],
        view_5,
      ),
    ).toBe(true);

    let view_6 = elementApis.__CreateView(0);
    elementApis.__ReplaceElements(root, [view_6], [view_3]);
    elementApis.__FlushElementTree();

    expect(elementApis.__GetChildren(root)!.length).toBe(6);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![2],
        view_6,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![3],
        view_4,
      ),
    ).toBe(true);
  });

  test('__ReplaceElements_3', () => {
    let root = elementApis.__CreatePage('page', 0);
    let view_0 = elementApis.__CreateView(0);
    let view_1 = elementApis.__CreateView(0);
    let view_2 = elementApis.__CreateView(0);
    let view_3 = elementApis.__CreateView(0);
    let view_4 = elementApis.__CreateView(0);
    elementApis.__ReplaceElements(
      root,
      [view_0, view_1, view_2, view_3, view_4],
      null,
    );
    elementApis.__FlushElementTree();
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![0],
        view_0,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![1],
        view_1,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![2],
        view_2,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![3],
        view_3,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![4],
        view_4,
      ),
    ).toBe(true);

    elementApis.__ReplaceElements(root, [view_1, view_0, view_2], [
      view_0,
      view_1,
      view_2,
    ]);
    elementApis.__FlushElementTree();
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![0],
        view_1,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![1],
        view_0,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![2],
        view_2,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![3],
        view_3,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![4],
        view_4,
      ),
    ).toBe(true);

    elementApis.__ReplaceElements(root, [view_1, view_0, view_3, view_2], [
      view_1,
      view_0,
      view_2,
      view_3,
    ]);
    elementApis.__FlushElementTree();
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![0],
        view_1,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![1],
        view_0,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![2],
        view_3,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![3],
        view_2,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![4],
        view_4,
      ),
    ).toBe(true);

    let view_5 = elementApis.__CreateView(0);
    elementApis.__ReplaceElements(root, [view_5], null);
    elementApis.__FlushElementTree();
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)![5],
        view_5,
      ),
    ).toBe(true);

    elementApis.__ReplaceElements(
      root,
      [view_1, view_3, view_2, view_0, view_4],
      [view_1, view_0, view_3, view_2, view_4],
    );
    expect(
      elementApis.__GetChildren(root),
    ).toStrictEqual([
      view_1,
      view_3,
      view_2,
      view_0,
      view_4,
      view_5,
    ]);
  });

  test('with_querySelector', () => {
    let page = elementApis.__CreatePage('0', 0);
    let parent = elementApis.__CreateComponent(
      0,
      'id1',
      0,
      'test_entry',
      'name',
      'path',
      {},
      {},
    );
    elementApis.__AppendElement(page, parent);
    let child_0 = elementApis.__CreateView(0);
    let child_1 = elementApis.__CreateView(0);
    let child_component = elementApis.__CreateComponent(
      elementApis.__GetElementUniqueID(parent),
      'id2',
      0,
      'test_entry',
      'name',
      'path',
      {},
      {},
    );
    let child_2 = elementApis.__CreateView(0);
    elementApis.__AppendElement(parent, child_0);
    elementApis.__AppendElement(parent, child_1);
    elementApis.__AppendElement(parent, child_component);
    elementApis.__AppendElement(child_component, child_2);
    elementApis.__SetID(child_1, 'node_id');
    elementApis.__SetID(child_2, 'node_id_2');

    elementApis.__FlushElementTree();
    let ret_node = rootDom.querySelector('#node_id');
    let ret_id = ret_node?.getAttribute('id');

    let ret_u = rootDom.querySelector('#node_id_u');

    let ret_child = rootDom.querySelector('#node_id_2');
    let ret_child_id = ret_child?.getAttribute('id');

    expect(ret_id).toBe('node_id');
    expect(ret_u).toBe(null);
    expect(ret_child_id).toBe('node_id_2');
  });

  test('__setAttribute_null_value', () => {
    const ret = elementApis.__CreatePage('page', 0);
    elementApis.__SetAttribute(ret, 'test-attr', 'val');
    elementApis.__SetAttribute(ret, 'test-attr', null);
    elementApis.__FlushElementTree();
    expect(rootDom.querySelector('[test-attr="val"]')).toBeNull();
  });

  test('__ReplaceElements should accept not array', () => {
    let root = elementApis.__CreatePage('page', 0);
    let ret0 = elementApis.__NextElement(root);
    let child_0 = elementApis.__CreateView(0);
    let child_1 = elementApis.__CreateImage(0);
    let child_2 = elementApis.__CreateText(0);
    let child_3 = elementApis.__CreateScrollView(0);
    elementApis.__InsertElementBefore(root, child_0, null);
    elementApis.__InsertElementBefore(root, child_1, child_0);
    elementApis.__InsertElementBefore(root, child_2, child_1);
    elementApis.__AppendElement(root, child_3);
    elementApis.__ReplaceElements(
      elementApis.__GetParent(child_3)!,
      child_3,
      child_1,
    );
    elementApis.__FlushElementTree();
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)[0],
        child_2,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)[1],
        child_3,
      ),
    ).toBe(true);
    expect(
      elementApis.__ElementIsEqual(
        elementApis.__GetChildren(root)[2],
        child_0,
      ),
    ).toBe(true);
    let ret1 = elementApis.__NextElement(elementApis.__FirstElement(root)!);
    elementApis.__ReplaceElements(
      elementApis.__GetParent(child_1)!,
      child_1,
      child_1,
    );
    elementApis.__ReplaceElements(
      elementApis.__GetParent(child_1)!,
      child_1,
      child_1,
    );
    expect(ret0).toBeFalsy();
    expect(elementApis.__GetTag(ret1!)).toBe('scroll-view');
  });

  test('create element infer css id from parent component id', () => {
    const root = elementApis.__CreatePage('page', 0);
    const parentComponent = elementApis.__CreateComponent(
      0,
      'id',
      100, // cssid
      'test_entry',
      'name',
      'path',
      {},
      {},
    );
    const parentComponentUniqueId = elementApis.__GetElementUniqueID(
      parentComponent,
    );
    const view = elementApis.__CreateText(parentComponentUniqueId);

    elementApis.__AppendElement(root, view);
    elementApis.__SetID(view, 'target');
    elementApis.__AppendElement(root, parentComponent);
    elementApis.__FlushElementTree();
    expect(rootDom.querySelector('#target')?.getAttribute('l-css-id')).toBe(
      '100',
    );
  });

  test('create element wont infer for cssid 0', () => {
    const root = elementApis.__CreatePage('page', 0);
    const parentComponent = elementApis.__CreateComponent(
      0,
      'id',
      0, // cssid
      'test_entry',
      'name',
      'path',
      {},
      {},
    );
    const parentComponentUniqueId = elementApis.__GetElementUniqueID(
      parentComponent,
    );
    const view = elementApis.__CreateText(parentComponentUniqueId);

    elementApis.__AppendElement(root, view);
    elementApis.__SetID(view, 'target');
    elementApis.__AppendElement(root, parentComponent);
    elementApis.__FlushElementTree();
    expect(rootDom.querySelector('#target')?.hasAttribute('l-css-id')).toBe(
      false,
    );
  });

  test('__GetElementUniqueID for incorrect fiber object', () => {
    const root = elementApis.__CreatePage('page', 0);
    const parentComponent = elementApis.__CreateComponent(
      0,
      'id',
      0, // cssid
      'test_entry',
      'name',
      'path',
      {},
      {},
    );
    const list = elementApis.__CreateList(
      0,
      () => {},
      () => {},
    );
    elementApis.__FlushElementTree();
    const rootId = elementApis.__GetElementUniqueID(root);
    const parentComponentId = elementApis.__GetElementUniqueID(
      parentComponent,
    );
    const listId = elementApis.__GetElementUniqueID(list);
    // @ts-expect-error
    const nul = elementApis.__GetElementUniqueID(null);
    // @ts-expect-error
    const undef = elementApis.__GetElementUniqueID(undefined);
    const randomObject = elementApis.__GetElementUniqueID({} as any);
    expect(rootId).toBeGreaterThanOrEqual(0);
    expect(parentComponentId).toBeGreaterThanOrEqual(0);
    expect(listId).toBeGreaterThanOrEqual(0);
    expect(nul).toBe(-1);
    expect(undef).toBe(-1);
    expect(randomObject).toBe(-1);
  });

  test('__AddInlineStyle_value_number_0', () => {
    const root = elementApis.__CreatePage('page', 0);
    const view = elementApis.__CreateView(0);
    elementApis.__AddInlineStyle(root, 24, 'flex'); // display: flex
    elementApis.__AddInlineStyle(view, 51, 0); // flex-shrink:0;
    elementApis.__SetID(view, 'target');
    elementApis.__AppendElement(root, view);
    elementApis.__FlushElementTree();
    const inlineStyle = rootDom.querySelector('#target')?.getAttribute('style');
    expect(inlineStyle).toContain('flex-shrink');
  });

  test('publicComponentEvent', () => {
    vi.spyOn(mtsBinding, 'publicComponentEvent');
    let page = elementApis.__CreatePage('0', 0);
    let parent = elementApis.__CreateComponent(
      0,
      'id1',
      0,
      'test_entry',
      'name',
      'path',
      {},
      {},
    );
    let parentUid = elementApis.__GetElementUniqueID(parent);
    let child = elementApis.__CreateView(parentUid);
    elementApis.__AppendElement(page, parent);
    elementApis.__AppendElement(parent, child);
    elementApis.__SetID(parent, 'parent_id');
    elementApis.__SetID(child, 'child_id');
    elementApis.__AddEvent(child, 'bindEvent', 'tap', 'hname');
    elementApis.__SetInlineStyles(parent, {
      'display': 'flex',
    });
    elementApis.__SetInlineStyles(child, {
      'width': '100px',
      'height': '100px',
    });
    elementApis.__FlushElementTree();
    rootDom.querySelector('#child_id')?.dispatchEvent(
      new window.Event('click'),
    );
    expect(mtsBinding.publicComponentEvent).toBeCalledTimes(1);
    expect(mtsBinding.publicComponentEvent).toBeCalledWith(
      'id1',
      'hname',
      expect.anything(),
      child,
      child,
    );
  });

  test('__UpdateComponentInfo', () => {
    let ele = elementApis.__CreateComponent(
      0,
      'id1',
      0,
      'test_entry',
      'name1',
      'path',
      {},
      {},
    );
    elementApis.__UpdateComponentInfo(ele, {
      componentID: 'id2',
      cssID: 8,
      name: 'name2',
    });
    const id = elementApis.__GetComponentID(ele);
    const cssID = elementApis.__GetAttributeByName(ele, 'l-css-id');
    const name = elementApis.__GetAttributeByName(ele, 'name');
    expect(id).toBe('id2');
    expect(cssID).toBe('8');
    expect(name).toBe('name2');
  });

  test('__MarkTemplate_and_Get_Parts', () => {
    /*
     * <view template> <!-- grand parent template -->
     *   <view part>
     *    <view template> <!-- target template -->
     *     <view> <!-- normal node -->
     *       <view part id="target"> <!-- target part -->
     *        <view template> <!-- sub template -->
     *         <view part> <!-- sub part, should be able to "get part" from the target -->
     *         </view>
     *       </view>
     *      </view>
     *     </view>
     *   </view>
     * </view>
     */
    const root = elementApis.__CreatePage('page', 0);
    const grandParentTemplate = elementApis.__CreateView(0);
    elementApis.__MarkTemplateElement(grandParentTemplate);
    let view = elementApis.__CreateView(0);
    elementApis.__MarkPartElement(view, 'grandParentPart');
    elementApis.__AppendElement(grandParentTemplate, view);
    const targetTemplate = elementApis.__CreateView(0);
    elementApis.__MarkTemplateElement(targetTemplate);
    elementApis.__AppendElement(view, targetTemplate);
    view = elementApis.__CreateView(0);
    elementApis.__AppendElement(targetTemplate, view);
    const targetPart = elementApis.__CreateView(0);
    elementApis.__MarkPartElement(targetPart, 'targetPart');
    elementApis.__AppendElement(view, targetPart);
    const subTemplate = elementApis.__CreateView(0);
    elementApis.__MarkTemplateElement(subTemplate);
    elementApis.__AppendElement(targetPart, subTemplate);
    const subPart = elementApis.__CreateView(0);
    elementApis.__MarkPartElement(subPart, 'subPart');
    elementApis.__AppendElement(subTemplate, subPart);
    elementApis.__FlushElementTree();
    const targetPartLength = Object.keys(
      elementApis.__GetTemplateParts(targetTemplate)!,
    ).length;
    const targetPartExist =
      elementApis.__GetTemplateParts(targetTemplate)!['targetPart']
        === targetPart;
    expect(targetPartLength).toBe(1);
    expect(targetPartExist).toBe(true);
  });

  describe('__ElementFromBinary', () => {
    beforeAll(() => {
      templateManager.pushTemplateJson('test', {
        'styleInfo': {},
        'lepusCode': {
          'root': '',
        },
        'manifest': {
          '/app-service.js': '',
        },
        'customSections': {},
        'cardType': 'react',
        'appType': 'card',
        'pageConfig': {
          enableCSSSelector: true,
          enableRemoveCSSScope: true,
          defaultDisplayLinear: true,
          defaultOverflowVisible: true,
          enableJSDataProcessor: true,
        },
        'elementTemplate': {
          'test-template': [
            {
              'id': 'id-1',
              'type': 'view',
              'class': [
                'class1',
                'class2',
              ],
              'idSelector': 'template-view',
              'attributes': {
                'attr1': 'value1',
              },
              'builtinAttributes': {},
              'children': [
                {
                  'id': 'id-2',
                  'type': 'text',
                  'class': [],
                  'idSelector': '',
                  'attributes': {
                    'value': 'Hello from template',
                  },
                  'builtinAttributes': {
                    'dirtyID': 'id-2',
                  },
                  'children': [],
                  'events': [],
                },
              ],
              'events': [
                {
                  'type': 'bindEvent',
                  'name': 'tap',
                  'value': 'templateTap',
                },
              ],
              'dataset': {
                'customdata': 'customdata',
              },
            },
          ],
        },
      });
    });
    test('should create a basic element from template', () => {
      const element = elementApis.__ElementFromBinary('test-template', 0)[0];
      expect(elementApis.__GetTag(element)).toBe('view');
    });

    test('should apply attributes from template', () => {
      const element = elementApis.__ElementFromBinary('test-template', 0)[0];
      const attrs = elementApis.__GetAttributes(element);
      expect(attrs.attr1).toBe('value1');
    });

    test('should apply classes from template', () => {
      const element = elementApis.__ElementFromBinary('test-template', 0)[0];
      const classes = elementApis.__GetClasses(element);
      expect(classes).toEqual(['class1', 'class2']);
    });

    test('should apply id from template', () => {
      const element = elementApis.__ElementFromBinary('test-template', 0)[0];
      const id = elementApis.__GetID(element);
      expect(id).toBe('id-1');
    });

    test('should create child elements from template', () => {
      const element = elementApis.__ElementFromBinary('test-template', 0)[0];
      const child = elementApis.__FirstElement(element);
      expect(elementApis.__GetTag(child!)).toBe('text');
      expect(elementApis.__GetAttributeByName(child!, 'value')).toBe(
        'Hello from template',
      );
    });

    test('should apply events from template', () => {
      const element = elementApis.__ElementFromBinary('test-template', 0)[0];
      const events = elementApis.__GetEvents(element);
      expect(events!.length).toBe(1);
      expect(events![0].name).toBe('tap');
      expect(events![0].type).toBe('bindEvent');
    });

    test('should mark part element', () => {
      const element = elementApis.__ElementFromBinary('test-template', 0)[0];
      const child = elementApis.__FirstElement(element);
      const parts = elementApis.__GetTemplateParts(element);
      expect(Object.keys(parts!).length).toBe(1);
      expect(parts!['id-2']).toBe(child);
    });

    test('should apply dataset from template', () => {
      const element = elementApis.__ElementFromBinary('test-template', 0)[0];
      expect(elementApis.__GetDataByKey(element, 'customdata')).toBe(
        'customdata',
      );
    });
  });
});
