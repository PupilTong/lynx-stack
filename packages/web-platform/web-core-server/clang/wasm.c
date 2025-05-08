#include <stdio.h>
#include <emscripten/emscripten.h>
#include "wasm.h"

EMSCRIPTEN_KEEPALIVE
Element* JS_CreateElement(char* tag_name) {
  fflush(stdout);
  return create_element(tag_name);
}

EMSCRIPTEN_KEEPALIVE
void JS_Append(Element* parent_element, Element** children, int32_t children_length) {
  append(parent_element, children, children_length);
  free(children);
}

EMSCRIPTEN_KEEPALIVE
int32_t JS_GetInnerHTML(Element* element, char* buffer, size_t buffer_length) {
  uint32_t used_size = get_inner_HTML(element, buffer, buffer_length - 1);
  return used_size;
}
