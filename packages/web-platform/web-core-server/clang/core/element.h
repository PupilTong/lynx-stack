#ifndef ELEMENT_H
#define ELEMENT_H
#include <stdlib.h>
#include <stdio.h>
#include <assert.h>
#include <stdint.h>
#include "utils.h"
#include "array_list.h"

struct Element {
  int32_t unique_id;
  int32_t ref_by_JS;
  char* tagName;
  struct Element* parent_element;
  ArrayList* children;
  ArrayList* attribute_names;
  ArrayList* attribute_values;
};

typedef struct Element Element;
Element* create_element(char* tagName);
void append(Element* thisElement, Element** children, int32_t count);
void replace_with(Element* element, Element** children, int32_t count);
void insert_before(Element* parent, Element* new_element, Element* refElement);
void remove_child(Element* parent, Element* child);
Element* get_parent_element(Element* element);
Element* get_first_element_child(Element* element);
Element* get_last_element_child(Element* element);
Element* get_next_element_sibling(Element* element);
void set_attribute(Element* element, char* attribute_name, char* attribute_value);
void remove_attribute(Element* element, char* attribute_name);
int32_t get_inner_HTML(Element* element, char* buffer, int32_t remaining_size);
#endif