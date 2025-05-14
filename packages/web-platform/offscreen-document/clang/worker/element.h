#ifndef ELEMENT_H
#define ELEMENT_H
#include <stdlib.h>
#include <stdio.h>
#include <assert.h>
#include <stdint.h>
#include <emscripten/emscripten.h>
#include "array_list.h"

#define True 1
#define False 0

struct Element {
  int32_t unique_id;
  int32_t ref_by_JS;
  const char* tagName;
  struct Element* parent_element;
  ArrayList* children;
  /**
   * The attribute names string is permanently allocated.
   */
  ArrayList* attribute_names;
  /**
   * The attribute values string will be freed when the element is freed.
   */
  ArrayList* attribute_values;
  /**
   * The style properties string is permanently allocated.
   */
  ArrayList* style_properties;
  /**
   * The style values string will be freed when the element is freed.
   */
  ArrayList* style_values;
  /**
   * The style values string will be freed when the element is freed.
   */
  ArrayList* style_is_important;
  /**
   * The innerHTML string will be freed when the element is freed.
   * set innerHTML will free the old innerHTML string.
   * set innerHTML will remove all the children elements.
   */
  char* innerHTML;
};

typedef struct Element Element;
EMSCRIPTEN_KEEPALIVE
void release_by_JS(Element* element);
EMSCRIPTEN_KEEPALIVE
void mark_held_by_JS(Element* element);
EMSCRIPTEN_KEEPALIVE
Element* create_element(const char* tagName);
EMSCRIPTEN_KEEPALIVE
int32_t get_unique_id(Element* element);
EMSCRIPTEN_KEEPALIVE
void append(Element* thisElement, Element** children, int32_t count);
EMSCRIPTEN_KEEPALIVE
void remove_this(Element* element);
EMSCRIPTEN_KEEPALIVE
void replace_with(Element* element, Element** children, int32_t count);
EMSCRIPTEN_KEEPALIVE
void insert_before(Element* parent, Element* new_element, Element* refElement);
EMSCRIPTEN_KEEPALIVE
void remove_child(Element* parent, Element* child);
EMSCRIPTEN_KEEPALIVE
Element* get_parent_element(Element* element);
EMSCRIPTEN_KEEPALIVE
Element* get_first_element_child(Element* element);
EMSCRIPTEN_KEEPALIVE
Element* get_last_element_child(Element* element);
EMSCRIPTEN_KEEPALIVE
Element* get_next_element_sibling(Element* element);
EMSCRIPTEN_KEEPALIVE
int32_t* get_children(Element* element);
EMSCRIPTEN_KEEPALIVE
void set_attribute(Element* element, const char* attribute_name, char* attribute_value);
EMSCRIPTEN_KEEPALIVE
void remove_attribute(Element* element, const char* attribute_name);
EMSCRIPTEN_KEEPALIVE
const char* get_attribute(Element* this_element, const char* attribute_name);
EMSCRIPTEN_KEEPALIVE
int32_t* get_attribute_names(Element* this_element);
EMSCRIPTEN_KEEPALIVE
void set_style_property(Element* element, const char* property_name, char* property_value, int32_t is_important);
EMSCRIPTEN_KEEPALIVE
void remove_style_property(Element* element, const char* property_name);
EMSCRIPTEN_KEEPALIVE
int32_t get_inner_HTML(Element* element, char* buffer, int32_t remaining_size);
EMSCRIPTEN_KEEPALIVE
void set_inner_HTML(Element* element, char* innerHTML);

#endif