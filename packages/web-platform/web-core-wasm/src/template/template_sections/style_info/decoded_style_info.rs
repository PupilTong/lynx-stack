/*
 * Copyright 2025 The Lynx Authors. All rights reserved.
 * Licensed under the Apache License Version 2.0 that can be found in the
 * LICENSE file in the root directory of this source tree.
*/

use super::flattened_style_info::FlattenedStyleInfo;
use super::raw_style_info::{Rule, RulePrelude, RuleType};
use crate::style_transformer::{Generator, ParsedDeclaration};
use crate::template::template_sections::style_info::decoded_style_info;
use crate::template::template_sections::style_info::raw_style_info::{
  Declaration, DeclarationBlock, OneSimpleSelector, OneSimpleSelectorType,
};
use std::collections::HashMap;
use std::fmt::format;
use wasm_bindgen::prelude::*;

type CssOgClassSelectorNameToDeclarationsMap = HashMap<String, String>;
type CssOgCssIdToClassSelectorNameToDeclarationsMap =
  HashMap<i32, CssOgClassSelectorNameToDeclarationsMap>;

#[cfg_attr(feature = "encode", wasm_bindgen)] // for testing purpose
struct DecodedStyleInfo {
  style_content: String,
  // the font face should be placed at the head of the css content, therefore we use a separate buffer
  font_face_content: String,
  css_og_cssid_to_class_selector_name_to_declarations_map:
    Option<CssOgCssIdToClassSelectorNameToDeclarationsMap>,
  config_enable_css_selector: bool,
  config_remove_css_scope: bool,
  processing_css_id: i32,
  current_processing_prelude: Option<RulePrelude>,
  put_declaration_into_css_og_map: bool,
  entry_name: Option<String>,
}

impl DecodedStyleInfo {
  fn new(
    flattened_style_info: FlattenedStyleInfo,
    entry_name: Option<String>,
    config_enable_css_selector: bool,
    config_remove_css_scope: bool,
  ) -> Self {
    let mut decoded_style_info = DecodedStyleInfo {
      style_content: String::with_capacity(flattened_style_info.style_content_str_size_hint),
      font_face_content: String::with_capacity(256),
      css_og_cssid_to_class_selector_name_to_declarations_map: if config_enable_css_selector {
        Some(HashMap::new())
      } else {
        None
      },
      entry_name,
      current_processing_prelude: None,
      config_enable_css_selector,
      config_remove_css_scope,
    };
    decoded_style_info.decode(flattened_style_info);
    decoded_style_info
  }

  fn decode(&mut self, flattened_style_info: FlattenedStyleInfo) {
    for (css_id, style_sheet) in flattened_style_info.css_id_to_style_sheet.into_iter() {
      for style_rule in style_sheet.rules.into_iter() {
        match style_rule.rule_type {
          RuleType::Declaration => {
            // handle selectors
            for mut selector in style_rule.prelude.selectors.into_iter() {
              /*
               1. for :root selector section, we should transform it to [lynx-tag="page"] and move it to the start of the current compound selector
               2. for ::placeholder selector section, we should transform it to ::part(placeholder)::placeholder
               3. for type selector section, we should transform it to [lynx-tag="type"]
               4 if enableCSSSelector is false:
                 4.1 if the current selector has only one class selector, we extract the class selector name and use it to map to the declarations in css_og_cssid_to_class_selector_name_to_declarations_map
                     the declarations should be tranformed by calling transform_one_declaration function.
                     the current selector should be skipped in following phases.
               5 if enableRemoveCSSScope is false, we should add a [{constants::LYNX_CSS_ID_ATTRIBUTE}="{imported_by_css_id}"] to the front of the current compound selector
               6 if the self.entryName is Some, we should add a [{constants::LYNX_CSS_ENTRY_NAME_ATTRIBUTE}="{entry_name}"] to the front of the current compound selector
                   otherwise, we should add a :not({constants::LYNX_CSS_ENTRY_NAME_ATTRIBUTE}) just before the first pseudo class or pseudo element in the current compound selector
              */
              for mut index in 0..selector.simple_selectors.len() {
                let simple_selector = &mut selector.simple_selectors[index];
                if simple_selector.section_type == OneSimpleSelectorType::PseudoClassSelector
                  && simple_selector.value == "root"
                {
                  // transform :root to [lynx-tag="page"]
                  simple_selector.section_type = OneSimpleSelectorType::AttributeSelector;
                  simple_selector.value =
                    format!("[{}=\"page\"]", crate::constants::LYNX_TAG_ATTRIBUTE);
                  // find the position to insert
                  let mut compond_selector_start_index = index;
                  while compond_selector_start_index > 0 {
                    let prev_simple_selector =
                      &selector.simple_selectors[compond_selector_start_index - 1];
                    if prev_simple_selector.section_type == OneSimpleSelectorType::Combinator {
                      break;
                    }
                    compond_selector_start_index -= 1;
                  }
                  // move the current simple selector to the compond selector start index
                  let root_simple_selector = selector.simple_selectors.remove(index);
                  selector
                    .simple_selectors
                    .insert(compond_selector_start_index, root_simple_selector);
                } else if simple_selector.section_type
                  == OneSimpleSelectorType::PseudoElementSelector
                  && simple_selector.value == "placeholder"
                {
                  // transform ::placeholder to ::part(placeholder)::placeholder
                  selector.simple_selectors.insert(
                    index,
                    OneSimpleSelector {
                      section_type: OneSimpleSelectorType::PseudoElementSelector,
                      value: "::part(placeholder)".to_string(),
                    },
                  );
                  index += 1; // skip the newly inserted simple selector
                } else if simple_selector.section_type == OneSimpleSelectorType::TypeSelector {
                  // transform type selector to [lynx-tag="type"]
                  simple_selector.section_type = OneSimpleSelectorType::AttributeSelector;
                  simple_selector.value = format!(
                    "[{}=\"{}\"]",
                    crate::constants::LYNX_TAG_ATTRIBUTE,
                    simple_selector.value
                  );
                }
              }
            }
          }
          RuleType::FontFace => {
            self.font_face_content.push_str("@font-face");
            self.generate_one_declaration_block(style_rule.declaration_block);
            self.font_face_content.push_str("");
          }
          RuleType::KeyFrames => {
            self.font_face_content.push_str("@keyframes");
            self.font_face_content.push_str(" {\n");
            for nested_rule in style_rule.nested_rules.into_iter() {
              if nested_rule.rule_type == RuleType::Declaration {
                self.generate_one_declaration_block(nested_rule.declaration_block);
              } else {
                panic!("Unsupported nested rule type in KeyFrames");
              }
            }
          }
          _ => {
            panic!("Unsupported rule type in generate_style_sheet");
          }
        }
      }
    }
  }
  fn generate_one_declaration_block(&mut self, declarations: DeclarationBlock) {}
}

impl Generator for DecodedStyleInfo {
  fn push_transform_kids_style(&mut self, declaration: ParsedDeclaration) {}
  fn push_transformed_style(&mut self, declaration: ParsedDeclaration) {}
}
