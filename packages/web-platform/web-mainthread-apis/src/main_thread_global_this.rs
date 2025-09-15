// Copyright 2023 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

use std::collections::{HashMap, HashSet};

use wasm_bindgen::{closure::Closure, prelude::wasm_bindgen, JsValue};

#[derive(Clone)]
pub struct EventHandlerInfo {
    r#type: String,
    handler: JsValue,
}

pub struct EventHandlerMap {
    capture: Option<EventHandlerInfo>,
    bind: Option<EventHandlerInfo>,
}

pub struct LynxRuntimeInfo {
    event_handler_map: HashMap<String, EventHandlerMap>,
}

#[wasm_bindgen]
pub struct MainThreadGlobalThisContext {
    unique_id_inc: u32,
    tag_map: HashMap<String, String>,
    lynx_unique_id_to_element: Vec<JsValue>,
    document: web_sys::Document,
    timing_flags: Vec<String>,
    exposure_changed_elements: HashSet<u32>,
    exposure_related_attributes: HashSet<String>,
    element_to_runtime_info_map: HashMap<u32, LynxRuntimeInfo>,
}

#[wasm_bindgen]
impl MainThreadGlobalThisContext {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        let window = web_sys::window().expect("no global `window` exists");
        let document = window.document().expect("should have a document on window");
        let mut exposure_related_attributes = HashSet::new();
        exposure_related_attributes.insert("exposure-id".to_string());
        exposure_related_attributes.insert("exposure-area".to_string());
        exposure_related_attributes.insert("exposure-screen-margin-top".to_string());
        exposure_related_attributes.insert("exposure-screen-margin-right".to_string());
        exposure_related_attributes.insert("exposure-screen-margin-bottom".to_string());
        exposure_related_attributes.insert("exposure-screen-margin-left".to_string());
        exposure_related_attributes.insert("exposure-ui-margin-top".to_string());
        exposure_related_attributes.insert("exposure-ui-margin-right".to_string());
        exposure_related_attributes.insert("exposure-ui-margin-bottom".to_string());
        exposure_related_attributes.insert("exposure-ui-margin-left".to_string());

        Self {
            unique_id_inc: 1,
            tag_map: HashMap::new(),
            lynx_unique_id_to_element: Vec::new(),
            document,
            timing_flags: Vec::new(),
            exposure_changed_elements: HashSet::new(),
            exposure_related_attributes,
            element_to_runtime_info_map: HashMap::new(),
        }
    }
}


#[wasm_bindgen]
pub fn __get_event(
    context: &MainThreadGlobalThisContext,
    element: &web_sys::Element,
    event_name: &str,
    event_type: &str,
) -> JsValue {
    let unique_id = __get_element_unique_id(context, element);
    let event_name = event_name.to_lowercase();
    let is_capture = event_type.starts_with("capture");

    if let Some(runtime_info) = context.element_to_runtime_info_map.get(&unique_id) {
        if let Some(event_handler_map) = runtime_info.event_handler_map.get(&event_name) {
            let handler_info = if is_capture {
                &event_handler_map.capture
            } else {
                &event_handler_map.bind
            };
            if let Some(info) = handler_info {
                return info.handler.clone();
            }
        }
    }
    JsValue::UNDEFINED
}

#[wasm_bindgen]
pub fn __set_events(
    context: &mut MainThreadGlobalThisContext,
    element: &web_sys::Element,
    listeners: &JsValue,
) {
    if let Ok(listeners_array) = js_sys::Array::try_from(listeners) {
        for listener in listeners_array.iter() {
            if let Ok(listener_obj) = js_sys::Object::try_from(&listener) {
                let event_type = js_sys::Reflect::get(listener_obj, &"type".into())
                    .unwrap_or(JsValue::UNDEFINED)
                    .as_string()
                    .unwrap_or_default();
                let event_name = js_sys::Reflect::get(listener_obj, &"name".into())
                    .unwrap_or(JsValue::UNDEFINED)
                    .as_string()
                    .unwrap_or_default();
                let event_handler = js_sys::Reflect::get(listener_obj, &"function".into())
                    .unwrap_or(JsValue::UNDEFINED);

                __add_event(context, element, &event_type, &event_name, &event_handler);
            }
        }
    }
}

#[wasm_bindgen]
pub fn __create_element(
    context: &mut MainThreadGlobalThisContext,
    tag: &str,
    parent_component_unique_id: u32,
) -> web_sys::Element {
    let unique_id = context.unique_id_inc;
    context.unique_id_inc += 1;

    let html_tag = context.tag_map.get(tag).map_or(tag, |s| s.as_str());

    let element = context.document.create_element(html_tag).unwrap();

    let weak_ref = js_sys::WeakRef::new(&element.clone().into());
    context.lynx_unique_id_to_element.push(weak_ref.into());

    element.set_attribute("lynx-tag", tag).unwrap();
    element
        .set_attribute("lynx-unique-id", &unique_id.to_string())
        .unwrap();
    element
        .set_attribute(
            "parent-component-unique-id",
            &parent_component_unique_id.to_string(),
        )
        .unwrap();

    element
}

#[wasm_bindgen]
pub fn __remove_element(_: &MainThreadGlobalThisContext, element: &web_sys::Element) {
    if let Some(parent) = element.parent_element() {
        parent.remove_child(element).unwrap();
    }
}

#[wasm_bindgen]
pub fn __first_element(_: &MainThreadGlobalThisContext, element: &web_sys::Element) -> Option<web_sys::Element> {
    element.first_element_child()
}

#[wasm_bindgen]
pub fn __last_element(_: &MainThreadGlobalThisContext, element: &web_sys::Element) -> Option<web_sys::Element> {
    element.last_element_child()
}

#[wasm_bindgen]
pub fn __next_element(_: &MainThreadGlobalThisContext, element: &web_sys::Element) -> Option<web_sys::Element> {
    element.next_element_sibling()
}

#[wasm_bindgen]
pub fn __get_children(_: &MainThreadGlobalThisContext, element: &web_sys::Element) -> js_sys::Array {
    element.children().into()
}

#[wasm_bindgen]
pub fn __get_parent(_: &MainThreadGlobalThisContext, element: &web_sys::Element) -> Option<web_sys::Element> {
    element.parent_element()
}

#[wasm_bindgen]
pub fn __add_event(
    context: &mut MainThreadGlobalThisContext,
    element: &web_sys::Element,
    event_type: &str,
    event_name: &str,
    new_event_handler: &JsValue,
) {
    let unique_id = __get_element_unique_id(context, element);
    let event_name = event_name.to_lowercase();
    let is_capture = event_type.starts_with("capture");

    let runtime_info = context
        .element_to_runtime_info_map
        .entry(unique_id)
        .or_insert(LynxRuntimeInfo {
            event_handler_map: HashMap::new(),
        });

    let event_handler_map = runtime_info
        .event_handler_map
        .entry(event_name.clone())
        .or_insert(EventHandlerMap {
            capture: None,
            bind: None,
        });

    let current_handler_info = if is_capture {
        &mut event_handler_map.capture
    } else {
        &mut event_handler_map.bind
    };

    if new_event_handler.is_null() {
        if let Some(_handler_info) = current_handler_info.take() {
            // TODO: remove event listener
        }
    } else {
        let info = EventHandlerInfo {
            r#type: event_type.to_string(),
            handler: new_event_handler.clone(),
        };

        let closure = Closure::wrap(Box::new(move |_event: web_sys::Event| {
            // TODO: Implement the common handler logic here
        }) as Box<dyn FnMut(_)>);

        element
            .add_event_listener_with_callback(&event_name, closure.as_ref().unchecked_ref())
            .unwrap();
        closure.forget();

        *current_handler_info = Some(info);
    }
}

#[wasm_bindgen]
pub fn __set_attribute(
    context: &mut MainThreadGlobalThisContext,
    element: &web_sys::Element,
    key: &str,
    value: &JsValue,
) {
    if value.is_null() {
        element.remove_attribute(key).unwrap();
    } else {
        element
            .set_attribute(key, &value.as_string().unwrap_or_default())
            .unwrap();
    }

    if key == "__lynx_timing_flag" && !value.is_null() {
        if let Some(value_str) = value.as_string() {
            context.timing_flags.push(value_str);
        }
    }

    if context.exposure_related_attributes.contains(key) {
        let unique_id = __get_element_unique_id(context, element);
        context.exposure_changed_elements.insert(unique_id);
    }
}

#[wasm_bindgen]
pub fn __get_tag(_: &MainThreadGlobalThisContext, element: &web_sys::Element) -> String {
    element.tag_name()
}

#[wasm_bindgen]
pub fn __get_classes(_: &MainThreadGlobalThisContext, element: &web_sys::Element) -> String {
    element.class_name()
}

#[wasm_bindgen]
pub fn __set_classes(_: &MainThreadGlobalThisContext, element: &web_sys::Element, classes: &str) {
    element.set_class_name(classes);
}

#[wasm_bindgen]
pub fn __create_view(
    context: &mut MainThreadGlobalThisContext,
    parent_component_unique_id: u32,
) -> web_sys::Element {
    __create_element(context, "view", parent_component_unique_id)
}

#[wasm_bindgen]
pub fn __create_text(
    context: &mut MainThreadGlobalThisContext,
    parent_component_unique_id: u32,
) -> web_sys::Element {
    __create_element(context, "text", parent_component_unique_id)
}

#[wasm_bindgen]
pub fn __create_raw_text(context: &mut MainThreadGlobalThisContext, text: &str) -> web_sys::Element {
    let element = __create_element(context, "raw-text", 0);
    element.set_attribute("text", text).unwrap();
    element
}

#[wasm_bindgen]
pub fn __create_image(
    context: &mut MainThreadGlobalThisContext,
    parent_component_unique_id: u32,
) -> web_sys::Element {
    __create_element(context, "image", parent_component_unique_id)
}

#[wasm_bindgen]
pub fn __create_scroll_view(
    context: &mut MainThreadGlobalThisContext,
    parent_component_unique_id: u32,
) -> web_sys::Element {
    __create_element(context, "scroll-view", parent_component_unique_id)
}

#[wasm_bindgen]
pub fn __create_wrapper_element(
    context: &mut MainThreadGlobalThisContext,
    parent_component_unique_id: u32,
) -> web_sys::Element {
    __create_element(context, "lynx-wrapper", parent_component_unique_id)
}

#[wasm_bindgen]
pub fn __create_page(
    context: &mut MainThreadGlobalThisContext,
    component_id: &str,
    css_id: &str,
) -> web_sys::Element {
    let page = __create_element(context, "page", 0);
    page.set_attribute("part", "page").unwrap();
    page.set_attribute("css-id", css_id).unwrap();
    page.set_attribute("parent-component-unique-id", "0")
        .unwrap();
    page.set_attribute("component-id", component_id).unwrap();
    // __mark_template_element(&page);
    page
}

#[wasm_bindgen]
pub fn __create_list(
    context: &mut MainThreadGlobalThisContext,
    parent_component_unique_id: u32,
) -> web_sys::Element {
    __create_element(context, "list", parent_component_unique_id)
}

#[wasm_bindgen]
pub fn __swap_element(_: &MainThreadGlobalThisContext, child_a: &web_sys::Element, child_b: &web_sys::Element) {
    let parent_a = child_a.parent_element();
    let parent_b = child_b.parent_element();

    if let (Some(parent_a), Some(parent_b)) = (parent_a, parent_b) {
        let sibling_a = child_a.next_element_sibling();
        let sibling_b = child_b.next_element_sibling();

        parent_b.insert_before(child_a, sibling_b.as_ref()).unwrap();
        parent_a.insert_before(child_b, sibling_a.as_ref()).unwrap();
    }
}

#[wasm_bindgen]
pub fn __insert_element_before(_: &MainThreadGlobalThisContext, parent: &web_sys::Element, child: &web_sys::Element, anchor: &web_sys::Element) {
    parent.insert_before(child, Some(anchor)).unwrap();
}

#[wasm_bindgen]
pub fn __replace_elements(_: &MainThreadGlobalThisContext, parent: &web_sys::Element, new_children: &JsValue, old_children: &JsValue) {
    if let (Ok(new_children_array), Ok(old_children_array)) = (
        js_sys::Array::try_from(new_children),
        js_sys::Array::try_from(old_children),
    ) {
        for old_child in old_children_array.iter() {
            if let Ok(old_child_element) = old_child.dyn_into::<web_sys::Element>() {
                parent.remove_child(&old_child_element).unwrap();
            }
        }

        for new_child in new_children_array.iter() {
            if let Ok(new_child_element) = new_child.dyn_into::<web_sys::Element>() {
                parent.append_child(&new_child_element).unwrap();
            }
        }
    }
}