// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
import {
  parentComponentUniqueIdAttribute,
  publicComponentEventEndpoint,
  publishEventEndpoint,
  type LynxCrossThreadEvent,
  type LynxEventType,
} from '@lynx-js/web-constants';
import {
  runtimeInfo,
  type ElementThreadElement,
} from '../ElementThreadElement.js';
import { createCrossThreadEvent } from '../../utils/createCrossThreadEvent.js';
import type { Rpc } from '../../../../web-worker-rpc/src/Rpc.js';

export function createEventFunctions(config: {
  backgroundRpc: Rpc;
  getElementByUniqueId: (uniqueId: number) => ElementThreadElement | undefined;
}) {
  const { backgroundRpc, getElementByUniqueId } = config;
  const btsHandler = (event: Event) => {
    const currentTarget = event.currentTarget as ElementThreadElement;
    const isCapture = event.eventPhase === Event.CAPTURING_PHASE;
    const hname = isCapture
      ? currentTarget[runtimeInfo].eventHandlerMap[event.type]?.capture?.handler
      : currentTarget[runtimeInfo].eventHandlerMap[event.type]?.bind?.handler;
    if (hname) {
      const crossThreadEvent = createCrossThreadEvent(event);
      const parentComponent = getElementByUniqueId(
        currentTarget[runtimeInfo].parentComponentUniqueId,
      )!;
      const componentId = parentComponent[runtimeInfo].lynxTagName === 'page'
        ? ''
        : '';
      if (componentId) {
        backgroundRpc.invoke(publicComponentEventEndpoint, [
          componentId,
          hname,
          crossThreadEvent,
        ]);
      } else {
        backgroundRpc.invoke(publishEventEndpoint, [
          hname,
          crossThreadEvent,
        ]);
      }
    }
  };
  const btsCatchHandler = (event: Event) => {
    btsHandler(event);
    event.stopPropagation();
  };
  function __AddEvent(
    element: ElementThreadElement,
    eventType: LynxEventType,
    eventName: string,
    newEventHandler: string | undefined // | ((ev: LynxCrossThreadEvent) => void) | undefined,
    ,
  ) {
    const isCatch = eventType === 'catchEvent' || eventType === 'capture-catch';
    const isCapture = eventType.startsWith('capture');
    const currentHandler = isCapture
      ? element[runtimeInfo].eventHandlerMap[eventName]?.capture
      : element[runtimeInfo].eventHandlerMap[eventName]?.bind;
    const currentRegisteredHandler = isCatch ? btsCatchHandler : btsHandler;
    if (currentHandler) {
      if (!newEventHandler) {
        /**
         * remove handler
         */
        element.removeEventListener(eventName, currentRegisteredHandler, {
          capture: isCapture,
        });
      }
    } else {
      /**
       * append new handler
       */
      if (newEventHandler) {
        element.addEventListener(eventName, currentRegisteredHandler, {
          capture: isCapture,
        });
      }
    }
    if (newEventHandler) {
      const info = {
        type: eventType,
        handler: newEventHandler,
      };
      if (isCapture) {
        element[runtimeInfo].eventHandlerMap[eventName]!.capture = info;
      } else {
        element[runtimeInfo].eventHandlerMap[eventName]!.bind = info;
      }
    }
  }

  function __GetEvent(
    element: ElementThreadElement,
    eventName: string,
    eventType: LynxEventType,
  ): string | ((ev: LynxCrossThreadEvent) => void) | undefined {
    eventName = eventName.toLowerCase();
    const isCapture = eventType.startsWith('capture');
    const handler = isCapture
      ? element[runtimeInfo].eventHandlerMap[eventName]?.capture
      : element[runtimeInfo].eventHandlerMap[eventName]?.bind;
    return handler?.handler;
  }

  function __GetEvents(element: ElementThreadElement): {
    type: LynxEventType;
    name: string;
    function: string | ((ev: Event) => void) | undefined;
  }[] {
    const eventHandlerMap = element[runtimeInfo].eventHandlerMap;
    const eventInfos: {
      type: LynxEventType;
      name: string;
      function: string | ((ev: Event) => void) | undefined;
    }[] = [];
    for (const [lynxEventName, info] of Object.entries(eventHandlerMap)) {
      for (const atomInfo of [info.bind, info.capture]) {
        for (const [type, handler] of Object.values(atomInfo)) {
          if (handler) {
            eventInfos.push({
              type: type as LynxEventType,
              name: lynxEventName,
              function: handler,
            });
          }
        }
      }
    }
    return eventInfos;
  }

  function __SetEvents(
    element: ElementThreadElement,
    listeners: {
      type: LynxEventType;
      name: string;
      function: string | undefined; // ((ev: LynxCrossThreadEvent) => void) | undefined;
    }[],
  ) {
    for (
      const { type: eventType, name: lynxEventName, function: eventHandler }
        of listeners
    ) {
      __AddEvent(element, eventType, lynxEventName, eventHandler);
    }
  }
  return {
    __AddEvent,
    __GetEvent,
    __GetEvents,
    __SetEvents,
  };
}
