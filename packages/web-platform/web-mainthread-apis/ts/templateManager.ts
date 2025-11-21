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
  getTemplate(
    entryName: string,
  ): LynxTemplate {
    const template = this.cache.get(entryName);
    if (!template) {
      throw new Error(`template not found for entry: ${entryName}`);
    }
    return template;
  }
  getElementTemplate(
    entryName: string,
    templateId: string,
  ): ElementTemplateData[] | undefined {
    const template = this.cache.get(entryName);
    if (!template) {
      throw new Error(`template not found for entry: ${entryName}`);
    }
    return template.elementTemplate[templateId];
  }
  getCustomSection(
    entryName: string,
    sectionKey: string,
  ): CustomSectionInstance | undefined {
    const template = this.cache.get(entryName);
    if (!template) {
      throw new Error(`template not found for entry: ${entryName}`);
    }
    return template.customSections[sectionKey];
  }
  getLepusCodeUrl(
    entryName: string,
    key: string,
  ): string | undefined {
    const template = this.cache.get(entryName);
    if (!template) {
      throw new Error(`template not found for entry: ${entryName}`);
    }
    return template.lepusCode[key];
  }
  getPageConfig(
    entryName: string,
  ): any {
    const template = this.cache.get(entryName);
    if (!template) {
      throw new Error(`template not found for entry: ${entryName}`);
    }
    return template.pageConfig;
  }
}

export const templateManager = new TemplateManager();
export type { TemplateManager };
