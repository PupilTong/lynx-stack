pub mod compat_js;
use std::collections::HashMap;
use std::u16;

use bincode::{Decode, Encode};
use wasm_bindgen::JsCast;

use crate::{engine::PageConfig, gen_attribute_selector, str_to_u16_slice, style_info};

pub type OneSelector = (
  /*plainSelectors*/ Vec<Vec<u16>>,
  /*pseudoClassSelectors*/ Vec<Vec<u16>>,
  /*pseudoElementSelectors*/ Vec<Vec<u16>>,
  /*combinator*/ Vec<Vec<u16>>,
);

pub type OneSelectorList = Vec<OneSelector>;

pub type OneDeclaration = (/*property*/ Vec<u16>, /*value*/ Vec<u16>);
#[derive(Encode, Decode)]
pub struct CSSRule {
  selectors: Vec<OneSelectorList>,
  declarations: Vec<OneDeclaration>,
}

#[derive(Encode, Decode)]
pub struct OneInfo {
  imports: Vec<usize>,
  content: Vec<Vec<u16>>,
  rules: Vec<CSSRule>,
}

pub type StyleInfo = Vec<(usize, OneInfo)>;

const CSS_ID_ATTRIBUTE: &[u16] = str_to_u16_slice!("lynx-css-id");

fn gen_extra_selectors(css_id: usize, page_config: &PageConfig) -> Vec<u16> {
  if page_config.enable_remove_css_scope {
    return gen_attribute_selector!(CSS_ID_ATTRIBUTE, None);
  } else {
    let css_id_vec = css_id.to_string().encode_utf16().collect::<Vec<u16>>();
    return gen_attribute_selector!(CSS_ID_ATTRIBUTE, Some(&css_id_vec));
  }
}

pub fn generate_style_info(style_info: &StyleInfo, page_config: &PageConfig) -> Vec<u16> {
  let mut css_content: Vec<u16> = Vec::new();
  let mut style_info_map: HashMap<usize, &OneInfo> = HashMap::new();
  for (css_id, one_info) in style_info {
    style_info_map.insert(*css_id, one_info);
  }
  for (css_id, one_info) in style_info {
    gen_css_for_one_style_info(
      css_id,
      one_info,
      page_config,
      &style_info_map,
      &mut css_content,
    );
  }
  css_content
}

pub fn gen_css_for_one_style_info(
  css_id: &usize,
  one_info: &OneInfo,
  page_config: &PageConfig,
  style_info_map: &HashMap<usize, &OneInfo>,
  css_content: &mut Vec<u16>,
) {
  one_info.content.iter().for_each(|content| {
    css_content.extend_from_slice(content);
  });
  for imported_css_id in &one_info.imports {
    if let Some(imported_one_info) = style_info_map.get(imported_css_id) {
      gen_css_for_one_style_info(
        imported_css_id,
        imported_one_info,
        page_config,
        style_info_map,
        css_content,
      );
    }
  }
  for rule in &one_info.rules {
    for jj in 0..rule.selectors.len() {
      let selector_list = &rule.selectors[jj];
      for ii in 0..selector_list.len() {
        let (plain_selectors, pseudo_class_selectors, pseudo_element_selectors, combinator) =
          &selector_list[ii];
        css_content.extend_from_slice(&plain_selectors.concat());
        if ii == selector_list.len() - 1 {
          css_content.extend_from_slice(&gen_extra_selectors(*css_id, page_config));
        }
        css_content.extend_from_slice(&pseudo_class_selectors.concat());
        css_content.extend_from_slice(&pseudo_element_selectors.concat());
        css_content.extend_from_slice(&combinator.concat());
      }
      if jj < selector_list.len() - 1 {
        css_content.push(',' as u16);
      }
    }
    css_content.push('{' as u16);
    for (property, value) in &rule.declarations {
      css_content.extend_from_slice(property);
      css_content.push(':' as u16);
      css_content.extend_from_slice(value);
      css_content.push(';' as u16);
    }
    css_content.push('}' as u16);
  }
}
