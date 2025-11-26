use crate::css_tokenizer::tokenize;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use wasm_bindgen::prelude::*;

/**
 * key: cssId
 * value: StyleSheet
 */
#[derive(Deserialize)]
#[cfg_attr(feature = "encode", derive(Serialize))]
#[cfg_attr(feature = "encode", wasm_bindgen)]
pub(crate) struct StyleInfo {
  pub(super) css_id_to_style_sheet: HashMap<i32, StyleSheet>,
  pub(super) style_content_str_size_hint: usize,
}

#[derive(Deserialize)]
#[cfg_attr(feature = "encode", derive(Serialize, Default))]
pub(crate) struct StyleSheet {
  pub(super) imports: Vec<i32>,
  pub(super) rules: Vec<Rule>,
}

#[derive(Deserialize)]
#[cfg_attr(feature = "encode", derive(Serialize))]
#[cfg_attr(feature = "encode", wasm_bindgen)]
pub(super) struct Rule {
  pub(super) rule_type: RuleType,
  pub(super) prelude: RulePrelude,
  pub(super) declaration_block: DeclarationBlock,
  pub(super) nested_rules: Vec<Rule>,
}

#[derive(Deserialize, PartialEq)]
#[cfg_attr(feature = "encode", derive(Serialize))]
pub(super) enum RuleType {
  Declaration = 1_isize,
  FontFace = 2_isize,
  KeyFrames = 3_isize,
}

#[derive(Deserialize)]
#[cfg_attr(feature = "encode", derive(Serialize))]
#[cfg_attr(feature = "encode", wasm_bindgen)]
/**
 * Either SelectorList or KeyFramesPrelude
 * Depending on the RuleType
 * If it is SelectorList, then selectors is a list of Selector
 * If it is KeyFramesPrelude, then selectors has only one selector which is Prelude text, its simple_selectors is empty
 * If the parent is FontFace, then selectors is empty
 */
pub(super) struct RulePrelude {
  pub(super) selectors: Vec<Selector>,
}

#[derive(Deserialize)]
#[cfg_attr(feature = "encode", derive(Serialize))]
#[cfg_attr(feature = "encode", wasm_bindgen)]
pub(super) struct Selector {
  pub(super) simple_selectors: Vec<OneSimpleSelector>,
}

#[derive(Deserialize, PartialEq)]
#[cfg_attr(feature = "encode", derive(Serialize))]
pub(super) struct OneSimpleSelector {
  pub(super) section_type: OneSimpleSelectorType,
  pub(super) value: String,
}

#[derive(Deserialize, PartialEq)]
#[cfg_attr(feature = "encode", derive(Serialize))]
/**
 * All possible OneSimpleSelector types
 */
pub(super) enum OneSimpleSelectorType {
  ClassSelector = 1_isize,
  IdSelector = 2_isize,
  AttributeSelector = 3_isize,
  TypeSelector = 4_isize,
  Combinator = 5_isize,
  PseudoClassSelector = 6_isize,
  PseudoElementSelector = 7_isize,
  UniversalSelector = 8_isize,
  UnknownText = 9_isize,
}

#[derive(Deserialize)]
#[cfg_attr(feature = "encode", derive(Serialize))]
struct Prelude {
  prelude_type: i32,
}

#[derive(Deserialize)]
#[cfg_attr(feature = "encode", derive(Serialize))]
pub(super) struct DeclarationBlock {
  pub(super) declarations: Vec<Declaration>,
}

#[derive(Deserialize)]
#[cfg_attr(feature = "encode", derive(Serialize))]
#[cfg_attr(feature = "encode", wasm_bindgen)]
pub(super) struct Declaration {
  pub(super) property_name: String,
  pub(super) value_token_list: Vec<ValueToken>,
}

#[derive(Deserialize)]
#[cfg_attr(feature = "encode", derive(Serialize))]
pub(super) struct ValueToken {
  pub(super) token_type: u8,
  pub(super) value: String,
}

#[cfg(feature = "encode")]
#[cfg_attr(feature = "encode", wasm_bindgen)]
impl StyleInfo {
  #[cfg_attr(feature = "encode", wasm_bindgen(constructor))]
  pub fn new() -> Self {
    Self {
      css_id_to_style_sheet: HashMap::new(),
      style_content_str_size_hint: 0,
    }
  }

  /**
   * Appends an import to the stylesheet identified by `css_id`.
   * If the stylesheet does not exist, it is created.
   * @param css_id - The ID of the CSS file.
   * @param import_css_id - The ID of the imported CSS file.
   */
  #[cfg_attr(feature = "encode", wasm_bindgen)]
  pub fn append_import(&mut self, css_id: i32, import_css_id: i32) {
    // if css_id not exist, create a new StyleSheet
    let style_sheet = self.css_id_to_style_sheet.entry(css_id).or_default();
    style_sheet.imports.push(import_css_id);
  }

  /**
   * Pushes a rule to the stylesheet identified by `css_id`.
   * If the stylesheet does not exist, it is created.
   * @param css_id - The ID of the CSS file.
   * @param rule - The rule to append.
   */
  #[cfg_attr(feature = "encode", wasm_bindgen)]
  pub fn push_rule(&mut self, css_id: i32, rule: Rule) {
    let style_sheet = self.css_id_to_style_sheet.entry(css_id).or_default();
    style_sheet.rules.push(rule);
  }

  /**
   * Encodes the StyleInfo into a Uint8Array using bincode serialization.
   * @returns A Uint8Array containing the serialized StyleInfo.
   */
  #[cfg_attr(feature = "encode", wasm_bindgen)]
  pub fn encode(&self) -> js_sys::Uint8Array {
    let serialized = bincode::serde::encode_to_vec(self, bincode::config::standard()).unwrap();
    js_sys::Uint8Array::from(serialized.as_slice())
  }
}

#[cfg_attr(feature = "encode", wasm_bindgen)]
impl Rule {
  /**
   * Creates a new Rule with the specified type.
   * @param rule_type - The type of the rule (e.g., "StyleRule", "FontFaceRule", "KeyframesRule").
   */
  #[cfg_attr(feature = "encode", wasm_bindgen(constructor))]
  pub fn new(rule_type: String) -> Rule {
    let rule_type_enum = match rule_type.as_str() {
      "StyleRule" => RuleType::Declaration,
      "FontFaceRule" => RuleType::FontFace,
      "KeyframesRule" => RuleType::KeyFrames,
      _ => panic!("Unknown rule type: {rule_type}"),
    };
    Rule {
      rule_type: rule_type_enum,
      prelude: RulePrelude { selectors: vec![] },
      declaration_block: DeclarationBlock {
        declarations: vec![],
      },
      nested_rules: vec![],
    }
  }

  /**
   * Sets the prelude for the rule.
   * @param prelude - The prelude to set (SelectorList or KeyFramesPrelude).
   */
  #[cfg_attr(feature = "encode", wasm_bindgen)]
  pub fn set_prelude(&mut self, prelude: RulePrelude) {
    self.prelude = prelude;
  }

  /**
   * Pushes a declaration to the rule's declaration block.
   * @param declaration - The declaration to add.
   */
  #[cfg_attr(feature = "encode", wasm_bindgen)]
  pub fn push_declaration(&mut self, declaration: Declaration) {
    self.declaration_block.declarations.push(declaration);
  }

  /**
   * Pushes a nested rule to the rule.
   * @param rule - The nested rule to add.
   */
  #[cfg_attr(feature = "encode", wasm_bindgen)]
  pub fn push_rule_children(&mut self, rule: Rule) {
    self.nested_rules.push(rule);
  }
}

#[cfg_attr(feature = "encode", wasm_bindgen)]
impl RulePrelude {
  #[cfg_attr(feature = "encode", wasm_bindgen(constructor))]
  pub fn new() -> Self {
    Self { selectors: vec![] }
  }

  /**
   * Pushes a selector to the list.
   * @param selector - The selector to add.
   */
  #[cfg_attr(feature = "encode", wasm_bindgen)]
  pub fn push_selector(&mut self, selector: Selector) {
    self.selectors.push(selector);
  }
}

#[cfg_attr(feature = "encode", wasm_bindgen)]
impl Selector {
  #[cfg_attr(feature = "encode", wasm_bindgen(constructor))]
  pub fn new() -> Self {
    Self {
      simple_selectors: vec![],
    }
  }

  /**
   * Pushes a selector section to the selector.
   * @param selector_type - The type of the selector section (e.g., "ClassSelector", "IdSelector").
   * @param value - The value of the selector section.
   */
  #[cfg_attr(feature = "encode", wasm_bindgen)]
  pub fn push_one_selector_section(&mut self, selector_type: String, value: String) {
    let selector_section_type = match selector_type.as_str() {
      "ClassSelector" => OneSimpleSelectorType::ClassSelector,
      "IdSelector" => OneSimpleSelectorType::IdSelector,
      "AttributeSelector" => OneSimpleSelectorType::AttributeSelector,
      "TypeSelector" => OneSimpleSelectorType::TypeSelector,
      "Combinator" => OneSimpleSelectorType::Combinator,
      "PseudoClassSelector" => OneSimpleSelectorType::PseudoClassSelector,
      "PseudoElementSelector" => OneSimpleSelectorType::PseudoElementSelector,
      "UniversalSelector" => OneSimpleSelectorType::UniversalSelector,
      "UnknownText" => OneSimpleSelectorType::UnknownText,
      _ => panic!("Unknown selector section type: {selector_type}"),
    };
    let selector_section = OneSimpleSelector {
      section_type: selector_section_type,
      value,
    };
    self.simple_selectors.push(selector_section);
  }
}

#[cfg(feature = "encode")]
struct DeclarationParser {
  value: String,
  value_token_list: Vec<ValueToken>,
}

#[cfg(feature = "encode")]
impl tokenize::Parser for DeclarationParser {
  fn on_token(&mut self, token_type: u8, token_value: &str) {
    let value_token = ValueToken {
      token_type,
      value: token_value.to_string(),
    };
    self.value_token_list.push(value_token);
  }
}

#[cfg(feature = "encode")]
impl DeclarationParser {
  fn take_token_list(&mut self) -> Vec<ValueToken> {
    std::mem::take(&mut self.value_token_list)
  }
}

#[cfg(feature = "encode")]
#[cfg_attr(feature = "encode", wasm_bindgen)]
impl Declaration {
  /**
   * Creates a new Declaration.
   * The value is tokenized upon creation.
   * @param property - The property name.
   * @param value - The property value.
   */
  #[cfg_attr(feature = "encode", wasm_bindgen(constructor))]
  pub fn new(property_name: String, value: String) -> Self {
    let value_token_list = {
      let mut parser = DeclarationParser {
        value: value.clone(),
        value_token_list: vec![],
      };
      tokenize::tokenize(&value, &mut parser);
      parser.take_token_list()
    };
    //take the value_token_list from parser
    Self {
      property_name,
      value_token_list,
    }
  }
}
