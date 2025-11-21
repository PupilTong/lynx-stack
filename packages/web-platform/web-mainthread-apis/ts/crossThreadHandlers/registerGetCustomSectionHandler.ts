// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
import {
  getCustomSectionsEndpoint,
  type MainThreadLynx,
  type Rpc,
} from '@lynx-js/web-constants';

export function registerGetCustomSectionHandler(
  rpc: Rpc,
  lynx: MainThreadLynx,
): void {
  rpc.registerHandler(
    getCustomSectionsEndpoint,
    (key) => {
      return lynx.getCustomSectionSync(key);
    },
  );
}
