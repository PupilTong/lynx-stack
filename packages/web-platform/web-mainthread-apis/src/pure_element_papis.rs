// use wasm_bindgen::prelude::*;
// use web_sys::{Element, Node, HtmlElement};
// use js_sys::{Object, JSON};
// use crate::constants::*;

// // __AppendElement
// pub fn append_element(parent: &Element, child: &Node) -> Result<Node, JsValue> {
//     parent.append_child(child)
// }

// // __ElementIsEqual
// pub fn element_is_equal(left: &Element, right: &Element) -> bool {
//     left == right
// }

// // __FirstElement
// pub fn first_element(element: &Element) -> Option<Element> {
//     element.first_element_child()
// }

// // __GetChildren
// pub fn get_children(element: &Element) -> Vec<Element> {
//     let children = element.children();
//     let mut result = Vec::new();
//     for i in 0..children.length() {
//         if let Some(child) = children.item(i) {
//             result.push(child);
//         }
//     }
//     result
// }

// // __GetParent
// pub fn get_parent(element: &Element) -> Option<Element> {
//     element.parent_element()
// }

// // __InsertElementBefore
// pub fn insert_element_before(parent: &Element, child: &Node, ref_node: Option<&Node>) -> Result<Node, JsValue> {
//     parent.insert_before(child, ref_node)
// }

// // __LastElement
// pub fn last_element(element: &Element) -> Option<Element> {
//     element.last_element_child()
// }

// // __NextElement
// pub fn next_element(element: &Element) -> Option<Element> {
//     element.next_element_sibling()
// }

// // __RemoveElement
// pub fn remove_element(parent: &Element, child: &Node) -> Result<Node, JsValue> {
//     parent.remove_child(child)
// }

// // __ReplaceElement
// pub fn replace_element(new_element: &Element, old_element: &Element) -> Result<Node, JsValue> {
//     if let Some(parent) = old_element.parent_element() {
//         parent.replace_child(new_element, old_element)
//     } else {
//         Err(JsValue::from_str("old_element has no parent"))
//     }
// }

// // __ReplaceElements
// pub fn replace_elements(parent: &Element, new_children: &[&Element], old_children: &[&Element]) -> Result<(), JsValue> {
//     if old_children.is_empty() {
//         for child in new_children {
//             parent.append_child(child)?;
//         }
//     } else {
//         for i in 1..old_children.len() {
//             parent.remove_child(old_children[i])?;
//         }
//         parent.replace_child(new_children[0], old_children[0])?;
//         for i in 1..new_children.len() {
//             parent.insert_before(new_children[i], old_children[0].next_sibling().as_ref())?;
//         }
//     }
//     Ok(())
// }

// // __AddConfig
// pub fn add_config(element: &Element, key: &JsValue, value: &JsValue) -> Result<(), JsValue> {
//     let current_config = get_element_config(element)?;
//     js_sys::Reflect::set(&current_config, key, value)?;
//     set_config(element, &current_config.into())
// }

// // __AddDataset
// pub fn add_dataset(element: &Element, key: &JsValue, value: &JsValue) -> Result<(), JsValue> {
//     let current_dataset = get_dataset(element)?;
//     let new_dataset = js_sys::Object::new();
//     js_sys::Reflect::set(&new_dataset, key, value)?;
//     let merged_dataset = js_sys::Object::assign(&current_dataset, &new_dataset);
//     set_dataset(element, &merged_dataset)
// }

// // __GetDataset
// pub fn get_dataset(element: &Element) -> Result<js_sys::Object, JsValue> {
//     let dataset_string = element.get_attribute(LYNX_DATASET_ATTRIBUTE).unwrap_or_default();
//     if dataset_string.is_empty() {
//         Ok(js_sys::Object::new())
//     } else {
//         let decoded = js_sys::decode_uri_component(&dataset_string)?;
//         JSON::parse(&decoded.as_string().unwrap_or_default()).map(|v| v.into())
//     }
// }

// // __GetDataByKey
// pub fn get_data_by_key(element: &Element, key: &JsValue) -> Result<JsValue, JsValue> {
//     let dataset = get_dataset(element)?;
//     js_sys::Reflect::get(&dataset, key)
// }

// // __GetAttributes
// pub fn get_attributes(element: &Element) -> js_sys::Object {
//     let attributes = element.attributes();
//     let result = js_sys::Object::new();
//     for i in 0..attributes.length() {
//         if let Some(attr) = attributes.item(i) {
//             js_sys::Reflect::set(&result, &JsValue::from_str(&attr.name()), &JsValue::from_str(&attr.value()));
//         }
//     }
//     result
// }

// // __GetElementConfig
// pub fn get_element_config(element: &Element) -> Result<JsValue, JsValue> {
//     if let Some(config_string) = element.get_attribute(LYNX_COMPONENT_CONFIG_ATTRIBUTE) {
//         if config_string.is_empty() {
//             return Ok(Object::new().into());
//         }
//         let decoded = js_sys::decode_uri_component(&config_string)?;
//         let parsed = JSON::parse(&decoded.as_string().unwrap_or_default())?;
//         Ok(parsed)
//     } else {
//         Ok(Object::new().into())
//     }
// }

// // __GetElementUniqueID
// pub fn get_element_unique_id(element: &Element) -> Option<String> {
//     element.get_attribute(LYNX_UNIQUE_ID_ATTRIBUTE)
// }

// // __GetID
// pub fn get_id(element: &Element) -> Option<String> {
//     element.get_attribute("id")
// }

// // __SetID
// pub fn set_id(element: &Element, id: &JsValue) {
//     element.set_attribute("id", id);
// }

// // __GetTag
// pub fn get_tag(element: &Element) -> Option<String> {
//     element.get_attribute(LYNX_TAG_ATTRIBUTE)
// }

// // __SetConfig
// pub fn set_config(element: &Element, config: &js_sys::Object) -> Result<(), JsValue> {
//     let stringified = JSON::stringify(config)?;
//     let encoded = js_sys::encode_uri_component(&JsValueingified.as_string().unwrap_or_default());
//     element.set_attribute(LYNX_COMPONENT_CONFIG_ATTRIBUTE, &encoded.as_string().unwrap_or_default())
// }

// // __SetDataset
// pub fn set_dataset(element: &Element, dataset: &js_sys::Object) -> Result<(), JsValue> {
//     let stringified = JSON::stringify(dataset)?;
//     let encoded = js_sys::encode_uri_component(&JsValueingified.as_string().unwrap_or_default());
//     element.set_attribute(LYNX_DATASET_ATTRIBUTE, &encoded.as_string().unwrap_or_default())?;
//     let keys = js_sys::Object::keys(dataset);
//     for i in 0..keys.length() {
//         let key = keys.get(i).as_string().unwrap_or_default();
//         let value = js_sys::Reflect::get(dataset, &keys.get(i))?.as_string().unwrap_or_default();
//         element.set_attribute(&format!("data-{}", key), &value)?;
//     }
//     Ok(())
// }

// // __UpdateComponentID
// pub fn update_component_id(element: &Element, component_id: &JsValue) -> Result<(), JsValue> {
//     element.set_attribute(COMPONENT_ID_ATTRIBUTE, component_id)
// }

// // __GetClasses
// pub fn get_classes(element: &Element) -> Vec<String> {
//     let class_list = element.class_list();
//     let mut result = Vec::new();
//     for i in 0..class_list.length() {
//         if let Some(class) = class_list.item(i) {
//             result.push(class);
//         }
//     }
//     result
// }

// // __UpdateComponentInfo
// pub fn update_component_info(element: &Element, component_id: &JsValue, css_id: &JsValue, name: &JsValue) -> Result<(), JsValue> {
//     update_component_id(element, component_id)?;
//     element.set_attribute(CSS_ID_ATTRIBUTE, css_id)?;
//     element.set_attribute("name", name)?;
//     Ok(())
// }

// // __SetCSSId
// pub fn set_css_id(elements: &[&Element], css_id: &JsValue) -> Result<(), JsValue> {
//     for element in elements {
//         element.set_attribute(CSS_ID_ATTRIBUTE, css_id)?;
//     }
//     Ok(())
// }

// // __SetClasses
// pub fn set_classes(element: &Element, classname: &JsValue) -> Result<(), JsValue> {
//     element.set_attribute("class", classname)
// }

// // __AddInlineStyle
// pub fn add_inline_style(element: &HtmlElement, key: &JsValue, value: &JsValue) -> Result<(), JsValue> {
//     element.style().set_property(key, value)
// }

// // __AddClass
// pub fn add_class(element: &Element, class_name: &JsValue) -> Result<(), JsValue> {
//     element.class_list().add_1(class_name)
// }

// // __SetInlineStyles
// pub fn set_inline_styles(element: &HtmlElement, value: &JsValue) -> Result<(), JsValue> {
//     element.set_attribute("style", value)
// }

// // __MarkTemplateElement
// pub fn mark_template_element(element: &Element) -> Result<(), JsValue> {
//     element.set_attribute(LYNX_ELEMENT_TEMPLATE_MARKER_ATTRIBUTE, "")
// }

// // __MarkPartElement
// pub fn mark_part_element(element: &Element, part_id: &JsValue) -> Result<(), JsValue> {
//     element.set_attribute(LYNX_PART_ID_ATTRIBUTE, part_id)
// }