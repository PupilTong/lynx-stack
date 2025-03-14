// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

export enum OperationType {
  CreateElement = 1,
  SetAttribute = 2,
  RemoveAttribute = 3,
  SetProperty = 4,
  SwapElement = 5,
  Append = 6,
  Remove = 7,
  ReplaceWith = 8,
  SetDatasetProperty = 9,
  InsertBefore = 10,
  RegisterEventHandler = 11,
}

interface ElementOperationBase {
  type: OperationType;
  /**
   * uniqueId
   */
  uid: string;
}

export interface CreateOperation extends ElementOperationBase {
  type: OperationType.CreateElement;
  tag: string;
}

export interface SetAttributeOperation extends ElementOperationBase {
  type: OperationType.SetAttribute;
  key: string;
  value: string | null;
}
export interface RemoveAttributeOperation extends ElementOperationBase {
  type: OperationType.RemoveAttribute;
  key: string;
}

export interface SetPropertyOperation extends ElementOperationBase {
  type: OperationType.SetProperty;
  /**
   * property name
   */
  key: string;
  value: Cloneable;
}

export interface SwapOperation extends ElementOperationBase {
  type: OperationType.SwapElement;
  /**
   * target uniqueId
   */
  tid: number;
}

export interface AppendOperation extends ElementOperationBase {
  type: OperationType.Append;
  /**
   * child uniqueId
   */
  cid: string[];
}

export interface RemoveOperation extends ElementOperationBase {
  type: OperationType.Remove;
}

export interface SetDatasetPropertyOperation extends ElementOperationBase {
  type: OperationType.SetDatasetProperty;
  /**
   * propert name in dataset
   */
  key: string;
  value: Cloneable;
}

export interface InsertBeforeOperation extends ElementOperationBase {
  type: OperationType.InsertBefore;
  /**
   * child uniqueId
   */
  cid: string;
  ref?: number;
}

export interface ReplaceOperation extends ElementOperationBase {
  type: OperationType.ReplaceWith;
  /**
   * the new element's unique id.
   */
  nid: string[];
}

export interface UpdateCssInJsOperation extends ElementOperationBase {
  type: OperationType.UpdateCssInJs;
  classStyleStr: string;
}

export interface SetStylePropertyOperation extends ElementOperationBase {
  type: OperationType.SetStyleProperty;
  key: string;
  value: string | null;
  /**
   * important
   */
  im?: boolean;
}

export interface RegisterEventHandlerOperation extends ElementOperationBase {
  type: OperationType.RegisterEventHandler;
  eventType: LynxEventType;
  /**
   * lynx event name
   */
  ename: string;
  /**
   * If it's a background thread hander, it will have a handler name.
   * If it's a main-thread handler, it will be null
   * If it's going to be removed, it will be undefined
   */
  hname: string | undefined | null;
}

export type ElementOperation =
  | RegisterEventHandlerOperation
  | SetStylePropertyOperation
  | UpdateCssInJsOperation
  | ReplaceOperation
  | InsertBeforeOperation
  | SetDatasetPropertyOperation
  | CreateOperation
  | SetAttributeOperation
  | RemoveAttributeOperation
  | SetPropertyOperation
  | SwapOperation
  | AppendOperation
  | RemoveOperation;
