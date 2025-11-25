/*
 * Copyright 2025 The Lynx Authors. All rights reserved.
 * Licensed under the Apache License Version 2.0 that can be found in the
 * LICENSE file in the root directory of this source tree.
*/
use super::transformer::StyleTransformer;
use super::ParsedDeclaration;
use crate::css_tokenizer::token_types::{COLON_TOKEN, IDENT_TOKEN, SEMICOLON_TOKEN};
use crate::css_tokenizer::tokenize::Parser;

pub(crate) fn transform_declarations_block(
  declarations: Vec<(&str, &[(u8, &str)])>,
) -> (Vec<ParsedDeclaration>, Vec<ParsedDeclaration>) {
  let mut transformer = StyleTransformer::new();
  for (property_name, property_value) in declarations {
    // Feed property name
    transformer.on_token(IDENT_TOKEN, property_name);
    // Feed colon
    transformer.on_token(COLON_TOKEN, ":");
    // Feed property value tokens
    for (token_type, token_value) in property_value {
      transformer.on_token(*token_type, token_value);
    }
    // Feed semicolon
    transformer.on_token(SEMICOLON_TOKEN, ";");
  }
  (
    transformer.transformed_styles,
    transformer.transformed_direct_kids_styles,
  )
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::css_tokenizer::token_types::*;

  #[test]
  fn test_transform_declarations_block_basic() {
    let tokens = vec![(IDENT_TOKEN, "red")];
    let declarations = vec![("color", tokens.as_slice())];
    let (styles, kids) = transform_declarations_block(declarations);
    assert_eq!(styles.len(), 4);
    // color: red -> --lynx-text-bg-color: initial; -webkit-background-clip: initial; background-clip: initial; color: red;
    assert_eq!(styles[0].property_name, "--lynx-text-bg-color");
    assert_eq!(styles[0].property_value, "initial");
    assert_eq!(styles[3].property_name, "color");
    assert_eq!(styles[3].property_value, "red");
    assert!(kids.is_empty());
  }

  #[test]
  fn test_transform_declarations_block_multiple() {
    let width_tokens = vec![(DIMENSION_TOKEN, "100px")];
    let height_tokens = vec![(DIMENSION_TOKEN, "200px")];
    let declarations = vec![
      ("width", width_tokens.as_slice()),
      ("height", height_tokens.as_slice()),
    ];
    let (styles, kids) = transform_declarations_block(declarations);
    assert_eq!(styles.len(), 2);
    assert_eq!(styles[0].property_name, "width");
    assert_eq!(styles[0].property_value, "100px");
    assert_eq!(styles[1].property_name, "height");
    assert_eq!(styles[1].property_value, "200px");
    assert!(kids.is_empty());
  }

  #[test]
  fn test_transform_declarations_block_rename() {
    let tokens = vec![(IDENT_TOKEN, "row")];
    let declarations = vec![("flex-direction", tokens.as_slice())];
    let (styles, kids) = transform_declarations_block(declarations);
    assert_eq!(styles.len(), 1);
    assert_eq!(styles[0].property_name, "--flex-direction");
    assert_eq!(styles[0].property_value, "row");
    assert!(kids.is_empty());
  }

  #[test]
  fn test_transform_declarations_block_replace() {
    let tokens = vec![(IDENT_TOKEN, "linear")];
    let declarations = vec![("display", tokens.as_slice())];
    let (styles, kids) = transform_declarations_block(declarations);
    assert_eq!(styles.len(), 3);
    assert_eq!(styles[0].property_name, "--lynx-display-toggle");
    assert_eq!(styles[0].property_value, "var(--lynx-display-linear)");
    assert_eq!(styles[1].property_name, "--lynx-display");
    assert_eq!(styles[1].property_value, "linear");
    assert_eq!(styles[2].property_name, "display");
    assert_eq!(styles[2].property_value, "flex");
    assert!(kids.is_empty());
  }

  #[test]
  fn test_transform_declarations_block_color_gradient() {
    let tokens = vec![
      (FUNCTION_TOKEN, "linear-gradient("),
      (IDENT_TOKEN, "red"),
      (COMMA_TOKEN, ","),
      (IDENT_TOKEN, "blue"),
      (RIGHT_PARENTHESES_TOKEN, ")"),
    ];
    let declarations = vec![("color", tokens.as_slice())];
    let (styles, kids) = transform_declarations_block(declarations);
    assert_eq!(styles.len(), 4);
    assert_eq!(styles[0].property_name, "color");
    assert_eq!(styles[0].property_value, "transparent");
    assert_eq!(styles[3].property_name, "--lynx-text-bg-color");
    assert_eq!(styles[3].property_value, "linear-gradient(red,blue)");
    assert!(kids.is_empty());
  }

  #[test]
  fn test_transform_declarations_block_flex() {
    let tokens = vec![(NUMBER_TOKEN, "1")];
    let declarations = vec![("flex", tokens.as_slice())];
    let (styles, kids) = transform_declarations_block(declarations);
    assert_eq!(styles.len(), 3);
    assert_eq!(styles[0].property_name, "--flex-grow");
    assert_eq!(styles[0].property_value, "1");
    assert_eq!(styles[1].property_name, "--flex-shrink");
    assert_eq!(styles[1].property_value, "1");
    assert_eq!(styles[2].property_name, "--flex-basis");
    assert_eq!(styles[2].property_value, "0%");
    assert!(kids.is_empty());
  }

  #[test]
  fn test_transform_declarations_block_linear_weight() {
    let tokens = vec![(NUMBER_TOKEN, "1")];
    let declarations = vec![("linear-weight", tokens.as_slice())];
    let (styles, kids) = transform_declarations_block(declarations);
    assert_eq!(styles.len(), 2);
    assert_eq!(styles[0].property_name, "--lynx-linear-weight");
    assert_eq!(styles[0].property_value, "1");
    assert_eq!(styles[1].property_name, "--lynx-linear-weight-basis");
    assert_eq!(styles[1].property_value, "0");
    assert!(kids.is_empty());
  }

  #[test]
  fn test_transform_declarations_block_linear_weight_sum() {
    let tokens = vec![(NUMBER_TOKEN, "1")];
    let declarations = vec![("linear-weight-sum", tokens.as_slice())];
    let (styles, kids) = transform_declarations_block(declarations);
    assert_eq!(styles.len(), 1);
    assert_eq!(styles[0].property_name, "linear-weight-sum");
    assert_eq!(styles[0].property_value, "1");
    assert_eq!(kids.len(), 1);
    assert_eq!(kids[0].property_name, "--lynx-linear-weight-sum");
    assert_eq!(kids[0].property_value, "1");
  }

  #[test]
  fn test_transform_declarations_block_important() {
    let tokens = vec![
      (IDENT_TOKEN, "red"),
      (WHITESPACE_TOKEN, " "),
      (DELIM_TOKEN, "!"),
      (IDENT_TOKEN, "important"),
    ];
    let declarations = vec![("color", tokens.as_slice())];
    let (styles, kids) = transform_declarations_block(declarations);
    assert_eq!(styles.len(), 4);
    assert_eq!(styles[3].property_name, "color");
    assert_eq!(styles[3].property_value, "red");
    assert!(styles[3].is_important);
    assert!(kids.is_empty());
  }

  #[test]
  fn test_transform_declarations_block_rpx() {
    let tokens = vec![(DIMENSION_TOKEN, "100rpx")];
    let declarations = vec![("width", tokens.as_slice())];
    let (styles, kids) = transform_declarations_block(declarations);
    assert_eq!(styles.len(), 1);
    assert_eq!(styles[0].property_name, "width");
    assert_eq!(styles[0].property_value, "calc(100 * var(--rpx-unit))");
    assert!(kids.is_empty());
  }
}
