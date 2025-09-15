use wasm_bindgen::prelude::*;

mod pure_element_papis;
mod constants;
mod main_thread_global_this;

#[wasm_bindgen]
pub fn hello() -> String {
    "hello from wasm!".to_string()
}
