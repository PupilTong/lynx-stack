// Copyright 2025 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import type {
  CustomSectionInstance,
  ElementTemplateData,
  LynxTemplate,
} from '@lynx-js/web-constants';

class TemplateManager {
  cache: Map<string, LynxTemplate> = new Map();
  pushTemplateJson(
    templateUrl: string,
    template: LynxTemplate,
  ) {
    this.cache.set(templateUrl, template);
  }
  getElementTemplate(
    entryName: string,
    templateId: string,
  ): ElementTemplateData[] | undefined {
    const template = this.cache.get(entryName);
    if (!template) {
      return undefined;
    }
    return template.elementTemplate[templateId];
  }
  getCustomSection(
    entryName: string,
    sectionKey: string,
  ): CustomSectionInstance | undefined {
    const template = this.cache.get(entryName);
    if (!template) {
      return undefined;
    }
    return template.customSections[sectionKey];
  }
}

export const templateManager = new TemplateManager();
export type { TemplateManager };
