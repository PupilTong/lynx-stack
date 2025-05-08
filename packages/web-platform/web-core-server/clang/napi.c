#include "napi.h"


static Element* convert_to_element(napi_env env, napi_value bigint_uint64) {
  napi_status status;
  Element* element = NULL;
  bool lossless = 0;
  status = napi_get_value_bigint_uint64(env, bigint_uint64, (uint64_t*)&element, &lossless);
  assert(status == napi_ok);
  assert(("convert_to_element: the input bigint_uint64 is not a valid pointer", lossless == 1));
  return element;
}

static napi_value convert_to_bigint_uint64(napi_env env, Element* element) {
  napi_status status;
  napi_value bigint_uint64_js_value;
  status = napi_create_bigint_uint64(env, (uint64_t)element, &bigint_uint64_js_value);
  assert(status == napi_ok);
  return bigint_uint64_js_value;
}

static Element** convert_to_element_array(napi_env env, napi_value bigint_uint64_typedarray, size_t* children_length) {
  napi_status status;
  napi_typedarray_type typedarray_type;
  size_t byte_offset = 0;
  void* data = NULL;
  napi_value arraybuffer = NULL;
  status = napi_get_typedarray_info(env, bigint_uint64_typedarray, &typedarray_type, children_length, &data, &arraybuffer, &byte_offset);
  assert(status == napi_ok);
  assert((typedarray_type == napi_biguint64_array, "this input children must be a biguint64 array"));
  return (Element**)data;
}

/**
 * ```typescript
 * declare function createElement(tagName: string): Element;
 * ```
 */
static napi_value JS_CreateElement(napi_env env, napi_callback_info info) {
  napi_status status;
  size_t argc_length = 1;
  napi_value argv[1];
  status = napi_get_cb_info(env, info, &argc_length, argv, NULL, NULL);
  assert(status == napi_ok);
  size_t tag_name_max_size = 64;
  size_t tag_name_copied_length = 0;
  char* tag_name = malloc(sizeof(char) * tag_name_max_size);
  status = napi_get_value_string_utf8(env, argv[0], tag_name, tag_name_max_size, &tag_name_copied_length);
  assert(status == napi_ok);
  // assert(("JS_CreateElement: the input tag_name is too long", tag_name_max_size <= tag_name_copied_length));
  Element* element = create_element(tag_name);
  napi_value element_raw_ptr_js_value = convert_to_bigint_uint64(env, element);
  return element_raw_ptr_js_value;
}

/**
 * ```typescript
 * declare function append(parentElement: Element, children: TypedArray): Element;
 * ```
 */
static napi_value JS_Append(napi_env env, napi_callback_info info) {
  napi_status status;
  size_t argc_length = 2;
  napi_value argv[2];
  status = napi_get_cb_info(env, info, &argc_length, argv, NULL, NULL);
  assert(status == napi_ok);
  assert(("JS_Append: the input argc_length is not 2", argc_length >= 2));
  napi_value parent_element_js_value = argv[0];
  napi_value children_js_value = argv[1];
  int32_t children_length = 0;
  Element* parent_element = convert_to_element(env, parent_element_js_value);
  Element** chilren = convert_to_element_array(env, children_js_value, (size_t*)&children_length);
  append(parent_element, chilren, children_length);
  return NULL;
}

static napi_value JS_getInnerHTML(napi_env env, napi_callback_info info) {
  napi_status status;
  size_t argc_length = 2;
  napi_value argv[2];
  status = napi_get_cb_info(env, info, &argc_length, argv, NULL, NULL);
  assert(status == napi_ok);
  assert(("get_inner_HTML: the input argc_length is not 2", argc_length >= 2));
  napi_value element_js_value = argv[0], buffer_js_value = argv[1];
  Element* element = convert_to_element(env, element_js_value);
  char* buffer = NULL;
  size_t buffer_length = 0;
  status = napi_get_arraybuffer_info(env, buffer_js_value, (void**)&buffer, &buffer_length);
  assert(status == napi_ok);
  get_inner_HTML(element, buffer, buffer_length);
  return NULL;
  
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_status status;
  napi_property_descriptor descriptors[] = {
    { "createElement", NULL, JS_CreateElement, NULL, NULL, NULL, napi_writable | napi_configurable, NULL },
    { "append", NULL, JS_Append, NULL, NULL, NULL, napi_writable | napi_configurable, NULL },
    { "getInnerHTML", NULL, JS_getInnerHTML, NULL, NULL, NULL, napi_writable | napi_configurable, NULL }
  };
  status = napi_define_properties(env, exports, sizeof(descriptors) / sizeof(descriptors[0]), descriptors);
  assert(status == napi_ok);
  return exports;
}


NAPI_MODULE(offscreen_dom, Init)