// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
import type { Cloneable, LynxCrossThreadEvent } from '@lynx-js/web-constants';
import {
  runtimeInfo,
  type ElementThreadElement,
} from '../elementAPI/ElementThreadElement.js';

export function createCrossThreadEvent(domEvent: Event): LynxCrossThreadEvent {
  const targetElement = domEvent.target as ElementThreadElement;
  const currentTargetElement = domEvent
    .currentTarget! as ElementThreadElement;
  const type = domEvent.type;
  const params: Cloneable = {};
  if (type.match(/^transition/)) {
    Object.assign(params, {
      'animation_type': 'keyframe-animation',
      'animation_name': (domEvent as TransitionEvent).propertyName,
      new_animator: true, // we support the new_animator only
    });
  } else if (type.match(/animation/)) {
    Object.assign(params, {
      'animation_type': 'keyframe-animation',
      'animation_name': (domEvent as AnimationEvent).animationName,
      new_animator: true, // we support the new_animator only
    });
  }
  return {
    type,
    timestamp: domEvent.timeStamp,
    target: {
      id: targetElement.id,
      dataset: targetElement[runtimeInfo].lynxDataset,
      uniqueId: targetElement[runtimeInfo].uniqueId,
    },
    currentTarget: {
      id: currentTargetElement.id,
      dataset: currentTargetElement[runtimeInfo].lynxDataset,
      uniqueId: targetElement[runtimeInfo].uniqueId,
    },
    // @ts-expect-error
    detail: domEvent.detail ?? {},
    params,
  };
}
