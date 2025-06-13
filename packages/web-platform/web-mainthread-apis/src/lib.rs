use wasm_bindgen::prelude::*;

pub mod css;

// #[wasm_bindgen]
// pub fn greet(name: &str) -> String {
//     format!("Hello, {} from WebAssembly!", name)
// }

// // Example of how to use browser's alert
// #[wasm_bindgen]
// extern "C" {
//     #[wasm_bindgen(js_namespace = window)]
//     fn alert(s: &str);

//     // Declare the C function `add`
//     // Make sure the types match the C function signature (int -> i32)
//     fn add(a: i32, b: i32) -> i32;
// }

// #[wasm_bindgen]
// pub fn greet_with_alert(name: &str) {
//     let greeting = greet(name);
//     alert(&greeting);
// }

// New function to call the C `add` function
// #[wasm_bindgen]
// pub fn add_numbers(a: i32, b: i32) -> i32 {
//     // Safety: Calling C functions is unsafe because Rust can't guarantee
//     // their memory safety or that they uphold Rust's invariants.
//     // unsafe {
//         add(a, b)
//     // }
// }

/**
accept a raw uint16 ptr from JS
*/
#[wasm_bindgen]
pub fn accept_raw_uint16_ptr(ptr: *const u16, len: usize, on_token: &js_sys::Function) -> Vec<u16> {
  // Safety: We assume the pointer is valid and points to a slice of u16
  // of length `len`. This is a contract with the JavaScript side.
  unsafe {
    let slice = core::slice::from_raw_parts(ptr, len);
    let str_u16 = slice.to_vec(); // Convert the slice to a Vec<u16>

    // Define a wrapper function for the callback
    let callback = |token_type: u16, start: usize, end: usize| {
      let _ = on_token.call3(
        &JsValue::NULL,
        &JsValue::from(token_type),
        &JsValue::from(start),
        &JsValue::from(end),
      );
    };

    // Call the tokenize function with our data and callback
    css::tokenize::tokenize(&str_u16, &callback);

    // Return the Vec<u16> as requested by the function signature
    str_u16
  }
}
