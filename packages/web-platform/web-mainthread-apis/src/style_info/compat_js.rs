use wasm_bindgen::JsCast;

use crate::style_info::{CSSRule, OneDeclaration, OneInfo, OneSelectorList, StyleInfo};

pub fn from_js_array(style_info_js: &js_sys::Array) -> StyleInfo {
  let mut style_info: StyleInfo = Vec::new();
  for i in 0..style_info_js.length() {
    let one_style_info_key_and_value = style_info_js.get(i).dyn_into::<js_sys::Array>().unwrap();
    let css_id = one_style_info_key_and_value.get(0).as_f64().unwrap() as usize;
    let one_style_info_js = one_style_info_key_and_value.get(1);
    // Convert the JS object to a Rust struct
    // Assuming one_style_info_js is an object with properties `content`, `rules`, and `imports`
    // Now handle the imports, it's an array of numbers, we can convert it to a Vec<usize>
    let imports_js = js_sys::Reflect::get(&one_style_info_js, &"imports".into())
      .unwrap()
      .dyn_into::<js_sys::Array>()
      .unwrap();
    let imports: Vec<usize> = imports_js
      .iter()
      .map(|x| x.as_f64().unwrap() as usize)
      .collect();
    // Handle the content, it's an array of strings, we can convert it to a Vec<Vec<u16>>
    let content_js = js_sys::Reflect::get(&one_style_info_js, &"content".into())
      .unwrap()
      .dyn_into::<js_sys::Array>()
      .unwrap();
    let content = from_js_str_array(&content_js);
    // Handle the rules, it's an array of objects, we can convert it to a Vec<CSSRule>
    let rules_js = js_sys::Reflect::get(&one_style_info_js, &"rules".into())
      .unwrap()
      .dyn_into::<js_sys::Array>()
      .unwrap();
    let mut rules: Vec<CSSRule> = Vec::new();
    for rule_js in rules_js.iter() {
      // handle the selectors, it's an array of selector
      // a selector in JS is an array of selectorLists
      // a selectorList is an array of 4*n array of strings
      let selectors_js = js_sys::Reflect::get(&rule_js, &"sel".into())
        .unwrap()
        .dyn_into::<js_sys::Array>()
        .unwrap();
      let mut selectors: Vec<OneSelectorList> = Vec::new(); // .a .b, .c
      for selector_list_val in selectors_js.iter() {
        let selector_list_js = selector_list_val.dyn_into::<js_sys::Array>().unwrap();
        let mut selector_lists: OneSelectorList = Vec::new(); // [['.a'], [''], [''], [' '], ['.b'], [''], [''], ['']]
        let mut ii = 0;
        while ii + 3 < selector_list_js.length() {
          let plain_selectors = from_js_str_array(
            &selector_list_js
              .get(ii)
              .dyn_into::<js_sys::Array>()
              .unwrap(),
          );
          let pseudo_class_selectors = from_js_str_array(
            &selector_list_js
              .get(ii + 1)
              .dyn_into::<js_sys::Array>()
              .unwrap(),
          );
          let pseudo_element_selectors = from_js_str_array(
            &selector_list_js
              .get(ii + 2)
              .dyn_into::<js_sys::Array>()
              .unwrap(),
          );
          let combinator = from_js_str_array(
            &selector_list_js
              .get(ii + 3)
              .dyn_into::<js_sys::Array>()
              .unwrap(),
          );
          selector_lists.push((
            plain_selectors,
            pseudo_class_selectors,
            pseudo_element_selectors,
            combinator,
          ));
          ii += 4;
        }
        selectors.push(selector_lists);
      }

      let declarations_js = js_sys::Reflect::get(&rule_js, &"decl".into())
        .unwrap()
        .dyn_into::<js_sys::Array>()
        .unwrap();
      let mut declarations: Vec<OneDeclaration> = Vec::new();
      for decl_js in declarations_js.iter() {
        let decl_js_array = decl_js.dyn_into::<js_sys::Array>().unwrap();
        let property = decl_js_array
          .get(0)
          .as_string()
          .unwrap()
          .encode_utf16()
          .collect::<Vec<u16>>();
        let value = decl_js_array
          .get(1)
          .as_string()
          .unwrap()
          .encode_utf16()
          .collect::<Vec<u16>>();
        declarations.push((property, value));
      }
      rules.push(CSSRule {
        selectors,
        declarations,
      });
    }

    style_info.push((
      css_id,
      OneInfo {
        imports,
        content,
        rules,
      },
    ));
  }
  style_info
}

fn from_js_str_array(js_str_array: &js_sys::Array) -> Vec<Vec<u16>> {
  js_str_array
    .iter()
    .map(|x| {
      let js_str = x.dyn_into::<js_sys::JsString>().unwrap();
      js_str
        .as_string()
        .unwrap()
        .encode_utf16()
        .collect::<Vec<u16>>()
    })
    .collect()
}
