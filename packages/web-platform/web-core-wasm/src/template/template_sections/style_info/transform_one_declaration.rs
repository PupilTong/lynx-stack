/*
 * Copyright 2025 The Lynx Authors. All rights reserved.
 * Licensed under the Apache License Version 2.0 that can be found in the
 * LICENSE file in the root directory of this source tree.
*/
use super::decoded_style_info::FlattenedStyleInfo;
use super::raw_style_info::{DeclarationBlock, Rule, RuleType};
use crate::css_tokenizer::token_types::{COLON_TOKEN, IDENT_TOKEN, SEMICOLON_TOKEN};
use crate::css_tokenizer::tokenize::Parser;
use crate::style_transformer::ParsedDeclaration;
use crate::style_transformer::StyleTransformer;
use std::{borrow::Cow, collections::HashMap};

pub(crate) fn transform_one_declaration(
  declarations: &DeclarationBlock,
) -> (Vec<ParsedDeclaration>, Vec<ParsedDeclaration>) {
  let mut transformer = StyleTransformer::new();
  for declaration in declarations.declarations.iter() {
    // Feed property name
    transformer.on_token(IDENT_TOKEN, declaration.property_name.as_str());
    // Feed colon
    transformer.on_token(COLON_TOKEN, ":");
    // Feed property value tokens
    for token in declaration.value_token_list.iter() {
      transformer.on_token(token.token_type, token.value.as_str());
    }
    // Feed semicolon
    transformer.on_token(SEMICOLON_TOKEN, ";");
  }
  (
    transformer.transformed_styles,
    transformer.transformed_direct_kids_styles,
  )
}

pub fn generate_style_sheet(
  flattened_style_info: &FlattenedStyleInfo,
  output_capacity_hints: (usize, usize),
  enable_remove_css_scope: bool,
  entry_name: Option<&str>,
) -> (String, String) {
  let (css_content_capacity, font_face_capacity) = output_capacity_hints;
  let mut css_content_buffer: String = String::with_capacity(css_content_capacity);
  let mut font_face_buffer: String = String::with_capacity(font_face_capacity);
  // the font face should be placed at the head of the css content, therefore we use a separate buffer
  let mut font_face_buffer: String = String::with_capacity(256);
  for (css_id, style_sheet) in flattened_style_info.css_id_to_style_sheet.iter() {
    for style_rule in style_sheet.rules.iter() {
      match style_rule.rule_type {
        RuleType::Declaration => {}
        RuleType::FontFace => {
          font_face_buffer.push_str("@font-face {");
          font_face_buffer.push_str("}\n");
        }
        RuleType::KeyFrames => {}
        _ => {
          panic!("Unsupported rule type in generate_style_sheet");
        }
      }
    }
  }
  (css_content_buffer, font_face_buffer)
}
