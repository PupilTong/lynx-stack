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
  Declaration, DeclarationBlock, OneSimpleSelector, OneSimpleSelectorType, Selector,
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
  entry_name: Option<String>,
  css_og_current_processing_css_id: Option<i32>,
  css_og_current_processing_class_selector_names: Option<Vec<String>>,
  css_og_have_complex_selector: bool,
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
      config_enable_css_selector,
      config_remove_css_scope,
      css_og_current_processing_css_id: None,
      css_og_current_processing_class_selector_names: None,
      css_og_have_complex_selector: false,
    };
    decoded_style_info.decode(flattened_style_info);
    decoded_style_info
  }

  fn decode(&mut self, flattened_style_info: FlattenedStyleInfo) {
    for (css_id, style_sheet) in flattened_style_info.css_id_to_style_sheet.into_iter() {
      for mut style_rule in style_sheet.rules.into_iter() {
        match style_rule.rule_type {
          RuleType::Declaration => {
            if !self.config_enable_css_selector {
              self.css_og_have_complex_selector = false;
              self.css_og_current_processing_css_id = Some(css_id);
              self.css_og_current_processing_class_selector_names = Some(Vec::new());
            }
            // handle selectors
            for selector in style_rule.prelude.selector_list.iter_mut() {
              /*
               1. for :root selector section, we should transform it to [lynx-tag="page"] and move it to the start of the current compound selector
               2. for ::placeholder selector section, we should transform it to ::part(placeholder)::placeholder
               3. for type selector section, we should transform it to [lynx-tag="type"]
               4 if enableCSSSelector is false:
                 4.1 if the current selector has only one class selector, we extract the class selector name and use it to map to the declarations in css_og_cssid_to_class_selector_name_to_declarations_map
                     the declarations should be tranformed by calling transform_one_declaration function.
                     the current selector should be skipped in following phases.
               5 if the self.entryName is Some, we should add a [{constants::LYNX_CSS_ENTRY_NAME_ATTRIBUTE}="{entry_name}"] to the last compound selector just before the first pseudo class or pseudo element
                   otherwise, we should add a :not({constants::LYNX_CSS_ENTRY_NAME_ATTRIBUTE}) just before the first pseudo class or pseudo element in the current compound selector
               6 if enableRemoveCSSScope is false, we should add a [{constants::LYNX_CSS_ID_ATTRIBUTE}="{imported_by_css_id}"] to the last compound selector just before the first pseudo class or pseudo element
              */
              // process rule 4
              if !self.config_enable_css_selector {
                if selector.simple_selectors.len() == 1
                  && selector.simple_selectors[0].selector_type
                    == OneSimpleSelectorType::ClassSelector
                {
                  self
                    .css_og_current_processing_class_selector_names
                    .as_mut()
                    .unwrap()
                    .push(selector.simple_selectors[0].value.clone());
                  continue;
                } else {
                  self.css_og_have_complex_selector = true;
                }
              }
              let mut the_index_of_last_compound_selector = 0;
              let mut index = 0;
              while index < selector.simple_selectors.len() {
                let simple_selector = &mut selector.simple_selectors[index];
                if simple_selector.selector_type == OneSimpleSelectorType::PseudoClassSelector
                  && simple_selector.value == "root"
                {
                  // transform :root to [lynx-tag="page"]
                  simple_selector.selector_type = OneSimpleSelectorType::AttributeSelector;
                  simple_selector.value =
                    format!("{}=\"page\"", crate::constants::LYNX_TAG_ATTRIBUTE);
                  // find the position to insert
                  let mut compond_selector_start_index = index;
                  while compond_selector_start_index > 0 {
                    let prev_simple_selector =
                      &selector.simple_selectors[compond_selector_start_index - 1];
                    if prev_simple_selector.selector_type == OneSimpleSelectorType::Combinator {
                      break;
                    }
                    compond_selector_start_index -= 1;
                  }
                  // move the current simple selector to the compond selector start index
                  let root_simple_selector = selector.simple_selectors.remove(index);
                  selector
                    .simple_selectors
                    .insert(compond_selector_start_index, root_simple_selector);
                } else if simple_selector.selector_type
                  == OneSimpleSelectorType::PseudoElementSelector
                  && simple_selector.value == "placeholder"
                {
                  // transform ::placeholder to ::part(placeholder)::placeholder
                  selector.simple_selectors.insert(
                    index,
                    OneSimpleSelector {
                      selector_type: OneSimpleSelectorType::PseudoElementSelector,
                      value: "part(placeholder)".to_string(),
                    },
                  );
                  index += 1; // skip the newly inserted simple selector
                } else if simple_selector.selector_type == OneSimpleSelectorType::TypeSelector {
                  // transform type selector to [lynx-tag="type"]
                  let simple_selector = &mut selector.simple_selectors[index];
                  simple_selector.selector_type = OneSimpleSelectorType::AttributeSelector;
                  simple_selector.value = format!(
                    "{}=\"{}\"",
                    crate::constants::LYNX_TAG_ATTRIBUTE,
                    simple_selector.value
                  );
                }
                if matches!(
                  selector.simple_selectors[index].selector_type,
                  OneSimpleSelectorType::ClassSelector
                    | OneSimpleSelectorType::IdSelector
                    | OneSimpleSelectorType::AttributeSelector
                    | OneSimpleSelectorType::TypeSelector
                    | OneSimpleSelectorType::UniversalSelector
                ) {
                  the_index_of_last_compound_selector = index + 1;
                }
                index += 1;
              }
              // rule 5
              if let Some(entry_name) = &self.entry_name {
                selector.simple_selectors.insert(
                  the_index_of_last_compound_selector,
                  OneSimpleSelector {
                    selector_type: OneSimpleSelectorType::AttributeSelector,
                    value: format!(
                      "{}=\"{}\"",
                      crate::constants::LYNX_ENTRY_NAME_ATTRIBUTE,
                      entry_name
                    ),
                  },
                );
              } else {
                selector.simple_selectors.insert(
                  the_index_of_last_compound_selector,
                  OneSimpleSelector {
                    selector_type: OneSimpleSelectorType::PseudoClassSelector,
                    value: format!("not({})", crate::constants::LYNX_ENTRY_NAME_ATTRIBUTE),
                  },
                );
              }
              // for rule 6, we should copy selectors and add the css id attribute selector
              if !self.config_remove_css_scope {
                let mut buf_before_insertion = String::new();
                let mut buf_after_insertion = String::new();
                DecodedStyleInfo::generate_simple_selector_list(
                  &mut buf_before_insertion,
                  &selector.simple_selectors[0..the_index_of_last_compound_selector],
                );
                DecodedStyleInfo::generate_simple_selector_list(
                  &mut buf_after_insertion,
                  &selector.simple_selectors[the_index_of_last_compound_selector..],
                );
                for imported_by_css_id in style_sheet.imported_by.iter() {
                  self.style_content.push_str(&buf_before_insertion);
                  // insert the css id attribute selector
                  self.style_content.push('[');
                  self
                    .style_content
                    .push_str(crate::constants::CSS_ID_ATTRIBUTE);
                  self.style_content.push_str("=\"");
                  self.style_content.push_str(&imported_by_css_id.to_string());
                  self.style_content.push_str("\"]");
                  self.style_content.push_str(&buf_after_insertion);
                }
              } else {
                // just generate the selector as is
                DecodedStyleInfo::generate_simple_selector_list(
                  &mut self.style_content,
                  &selector.simple_selectors,
                );
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
  fn generate_simple_selector_list(buf: &mut String, selector_list: &[OneSimpleSelector]) {
    for selector in selector_list.iter() {
      match selector.selector_type {
        OneSimpleSelectorType::TypeSelector => {
          buf.push_str(&selector.value);
        }
        OneSimpleSelectorType::ClassSelector => {
          buf.push('.');
          buf.push_str(&selector.value);
        }
        OneSimpleSelectorType::IdSelector => {
          buf.push('#');
          buf.push_str(&selector.value);
        }
        OneSimpleSelectorType::AttributeSelector => {
          buf.push('[');
          buf.push_str(&selector.value);
          buf.push(']');
        }
        OneSimpleSelectorType::PseudoClassSelector => {
          buf.push(':');
          buf.push_str(&selector.value);
        }
        OneSimpleSelectorType::PseudoElementSelector => {
          buf.push_str("::");
          buf.push_str(&selector.value);
        }
        OneSimpleSelectorType::UniversalSelector => {
          buf.push('*');
        }
        OneSimpleSelectorType::Combinator => {
          buf.push(' ');
          buf.push_str(&selector.value);
          buf.push(' ');
        }
        OneSimpleSelectorType::UnknownText => {
          buf.push_str(&selector.value);
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
