use js_sys::Uint16Array;
use wasm_bindgen::prelude::*;

mod engine;
mod parser;
mod style_info;
mod transformer;
mod utils;
// lifted from the `console_log` example
/**
accept a raw uint16 ptr from JS
*/
#[wasm_bindgen]
pub fn transform_raw_u16_inline_style_ptr(ptr: *const u16, len: usize) {
  // Safety: We assume the pointer is valid and points to a slice of u16
  // of length `len`. This is a contract with the JavaScript side.
  unsafe {
    let slice = core::slice::from_raw_parts(ptr, len);
    // Call the tokenize function with our data and callback
    let (transformed_inline_style, _) =
      transformer::transformer::transform_inline_style_string(&slice);
    if !transformed_inline_style.is_empty() {
      let ptr = transformed_inline_style.as_ptr();
      on_transformed(ptr, transformed_inline_style.len());
    }
  }
}

#[wasm_bindgen]
pub fn transform_raw_u16_inline_style_ptr_parsed(
  source_ptr: *const u16,
  source_len: usize,
  declaration_position_arr_ptr: *const usize,
  declaration_position_arr_len: usize,
) {
  // Safety: We assume the pointer is valid and points to a slice of u16
  // of length `source_len` and `declaration_position_arr_len`.
  unsafe {
    let source_slice = core::slice::from_raw_parts(source_ptr, source_len);
    let declaration_position_arr_slice =
      core::slice::from_raw_parts(declaration_position_arr_ptr, declaration_position_arr_len);
    let (transformed_inline_style, transformed_children_styles) =
      transformer::transformer::transform_parsed_style_string(
        source_slice,
        declaration_position_arr_slice,
      );

    if !transformed_inline_style.is_empty() {
      let ptr = transformed_inline_style.as_ptr();
      on_transformed(ptr, transformed_inline_style.len());
    }
    if !transformed_children_styles.is_empty() {
      let ptr = transformed_children_styles.as_ptr();
      on_extra_children_style(ptr, transformed_children_styles.len());
    }
  }
}

#[wasm_bindgen]
pub fn malloc(size: usize) -> *mut u8 {
  // Allocate memory on the heap
  let layout = std::alloc::Layout::from_size_align(size, 8).unwrap();
  unsafe { std::alloc::alloc(layout) }
}

#[wasm_bindgen]
pub fn free(ptr: *mut u8, size: usize) {
  // Free the allocated memory
  // We need to reconstruct the Layout that was used for allocation.
  // Assuming align is 1 as used in malloc.
  let layout = std::alloc::Layout::from_size_align(size, 8).unwrap();
  unsafe { std::alloc::dealloc(ptr, layout) }
}

#[wasm_bindgen(
  inline_js = "export function on_transformed(ptr, len) { globalThis._on_transformed_callback(ptr, len); }"
)]
extern "C" {
  fn on_transformed(ptr: *const u16, len: usize);
}
#[wasm_bindgen(
  inline_js = "export function on_extra_children_style(ptr, len) { globalThis._on_extra_children_style_callback(ptr, len); }"
)]
extern "C" {
  fn on_extra_children_style(ptr: *const u16, len: usize);
}

#[wasm_bindgen]
pub fn transform_js_style_info_to_rust_bincode(
  style_info_js: &js_sys::Array,
) -> js_sys::Uint8Array {
  let style_info = style_info::compat_js::from_js_array(style_info_js);
  let serialized = bincode::encode_to_vec(&style_info, bincode::config::standard()).unwrap();
  js_sys::Uint8Array::from(serialized.as_slice())
}

#[wasm_bindgen]
pub fn hydrate_style_info_from_bincode(data: &[u8]) {
  let style_info: style_info::StyleInfo =
    bincode::decode_from_slice(data, bincode::config::standard())
      .unwrap()
      .0;
}

#[wasm_bindgen]
pub fn gen_css_content_from_js_style_info(style_info_js: &js_sys::Array) -> js_sys::Uint16Array {
  let style_info = style_info::compat_js::from_js_array(style_info_js);
  let page_config = engine::PageConfig {
    enable_remove_css_scope: true,
    enable_css_selector: true,
  }; // This can be set based on your needs

  let css_content_str_u16 = style_info::generate_style_info(&style_info, &page_config);
  js_sys::Uint16Array::from(css_content_str_u16.as_slice())
}
