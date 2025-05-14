#include "element.h"
int32_t incId = 1;
void freeElement(Element* element);
void remove_from_parent(Element* this_element, int32_t parent_index);

/**
 * frees the element's following properties:
 * - attribute_names but not the strings
 * - attribute_values and the strings
 * - style_properties but not the strings
 * - style_values and the strings
 * - innerHTML 
 */
void freeElement(Element* element) {
    if (element == NULL || element ->ref_by_JS == True || element->parent_element != NULL) {
        return;
    }
    for (int32_t ii = 0; ii < element->attribute_names->count; ii++) {
        Element* kid = element->children->items[ii];
        kid->parent_element = NULL;
        freeElement(kid);
    }
    if (element->children) {
        free_array_list(element->children);
    }
    if (element->attribute_names) {
        free_array_list(element->attribute_names);
    }
    if (element->attribute_values) {
        free_array_list(element->attribute_values);
    }
    if (element->style_properties) {
        free_array_list(element->style_properties);
    }
    if (element->style_values) {
        free_array_list(element->style_values);
    }
    if (element->style_is_important) {
        free_array_list(element->style_is_important);
    }
    if (element->innerHTML) {
        free(element->innerHTML);
    }
    free(element);
}

void remove_from_parent(Element* this_element, int32_t parent_index) {
    Element* parent_element = this_element->parent_element;
    if (parent_element) {
        if (parent_index == -1) {
            int32_t current_index = index_of(parent_element->children, this_element);
            assert(("remove_from_parent: the input this_element is not in the parent", current_index >= 0));
            splice(parent_element->children, current_index, 1, NULL, 0, NULL);
        } else {
            Element* removeCandidate = parent_element->children->items[parent_index];
            assert(("remove_from_parent: the input this_element is not in the parent", removeCandidate == this_element));
            parent_element->children->items[parent_index] = NULL;
            parent_element->children->count--;
        }
        this_element->parent_element = NULL;
        if (this_element->ref_by_JS == False) {
            freeElement(this_element);
        }
    }
}

void release_by_JS(Element* element) {
    assert(("release_by_JS: the input element is NULL", element != NULL));
    if (element->ref_by_JS == True) {
        element->ref_by_JS = False;
        freeElement(element);
    }
}

void mark_held_by_JS(Element* element) {
    assert(("mark_held_by_JS: the input element is NULL", element != NULL));
    element->ref_by_JS = True;
}


Element* create_element(const char* tagName) {
    int32_t unique_id = incId;
    incId++;
    Element* element = (Element*)malloc(sizeof(Element));
    assert(("create_element: malloc failed", element != NULL));
    element->unique_id = unique_id;
    element->ref_by_JS = True;
    element->children = NULL;
    element->parent_element = NULL;
    element->tagName = tagName;
    element->attribute_names = NULL;
    element->attribute_values = NULL;
    element->children = NULL;
    element->attribute_names = NULL;
    element->attribute_values = NULL;
    element->style_properties = NULL;
    element->style_values = NULL;
    element->style_is_important = NULL;
    element->innerHTML = NULL;
    return element;
}

int32_t get_unique_id(Element* this_element) {
    assert(("get_unique_id: the input this_element is NULL", this_element != NULL));
    return this_element->unique_id;
}

void append(Element* this_element, Element** children, int32_t count) {
    assert(("append: the input this_element is NULL", this_element != NULL));
    if (this_element->children == NULL) {
        this_element->children = create_array_list();
    }
    for (int32_t ii = 0; ii < count; ii++) {
        Element* kid_element = children[ii];
        if (kid_element->parent_element) {
            remove_from_parent(kid_element, -1);
        }
        kid_element->parent_element = this_element;
    }
    push(this_element->children, (void**)children, count);
}

void remove_this(Element* this_element) {
    assert(("remove: the input this_element is NULL", this_element != NULL));
    remove_from_parent(this_element, -1);
}


void replace_with(Element* this_element, Element** children, int32_t count) {
    assert(("replace_with: the input this_element is NULL", this_element != NULL));
    Element* parent_element = this_element->parent_element;
    if (parent_element) {
        this_element->parent_element = NULL;
        int32_t current_index = index_of(parent_element->children, this_element);
        assert(("replace_with: the input this_element is not in the parent", current_index >= 0));
        splice(parent_element->children, current_index, 1, (void**)children, count, (void (*)(void *, int32_t))remove_from_parent);
        for (int32_t ii = 0; ii < count; ii++) {
            Element* kid_element = children[ii];
            if (kid_element->parent_element) {
                remove_from_parent(kid_element, -1);
            }
            kid_element->parent_element = parent_element;
        }
    }
}

void insert_before(Element* this_element, Element* new_element, Element* refElement) {
    remove_from_parent(new_element, -1);
    if (this_element->children == NULL) {
        this_element->children = create_array_list();
    }
    if (refElement) {
        int32_t refElementIndex = index_of(this_element->children, refElement);
        if (refElementIndex >= 0) {
            new_element->parent_element = this_element;
            splice(this_element->children, refElementIndex, 0, (void**)&new_element, 1, (void (*)(void *, int32_t))remove_from_parent);
        }
    } else {
        // append to the end
        new_element->parent_element = this_element;
        push(this_element->children, (void**)&new_element, 1);
    }
}

void remove_child(Element* this_element, Element* child_element) {
    assert(("remove_child: the input this_element is NULL", this_element != NULL));
    assert(("remove_child: empty child Element", child_element != NULL));
    assert(("remove_child: the child is not in the parent", this_element == child_element->parent_element));
    remove_from_parent(child_element, -1);
}

Element* get_parent_element(Element* this_element) {
    assert(("get_parent_element: the input this_element is NULL", this_element != NULL));
    return this_element->parent_element;
}

Element* get_first_element_child(Element* this_element) {
    assert(("get_first_element_child: the input this_element is NULL", this_element != NULL));
    if (this_element->children && this_element->children->count > 0) {
        Element* firstChild = this_element->children->items[0];
        return firstChild;
    }
    return NULL;
}

Element* get_last_element_child(Element* this_element) {
    assert(("get_last_element_child: the input this_element is NULL", this_element != NULL));
    if (this_element->children && this_element->children->count > 0) {
        Element* lastChild = this_element->children->items[this_element->children->count - 1];
        return lastChild;
    }
    return NULL;
}

/**
 * @note do not forget to inc Element for the return value
 */
Element* get_next_element_sibling(Element* this_element) {
    Element* parent_element = get_parent_element(this_element);
    if (parent_element && parent_element->children) {
        int32_t currentIndex = index_of(parent_element->children, this_element);
        if (currentIndex >= 0 && currentIndex + 1 < parent_element->children->count) {
            Element* nextSibling = parent_element->children->items[currentIndex + 1];
            return nextSibling;
        }
    }
    return NULL;
}

/**
 * @note do free the return value
 * @note do mark_held_by_JS!
 */
int32_t* get_children(Element* this_element) {
    int32_t* ret;
    assert(("get_children: the input this_element is NULL", this_element != NULL));
    if (this_element->children) {
        ret = (int32_t*)malloc((sizeof(int32_t) + 1) * this_element->children->count);
        ret[0] = this_element->children->count; //count
        for (int32_t ii = 0; ii < this_element->children->count; ii++) {
            ret[ii + 1] = (int32_t)this_element->children->items[ii]; // assign the pointer
        }
    } else {
        ret = (int32_t*)malloc(sizeof(int32_t));
        ret[0] = 0; // count = 0;
    }
    return ret;
}

/**
 * @note attribute_name: the attribute name will NOT be freed
 * @note attribute_value: the attribute value will be freed
 */
void set_attribute(Element* this_element, const char* attribute_name, char* attribute_value) {
    assert(("set_attribute: empty this_element", this_element != NULL));
    if (this_element->attribute_names == NULL) {
        this_element->attribute_names = create_array_list();
        this_element->attribute_values = create_array_list();
    }
    int32_t index = index_of(this_element->attribute_names, attribute_name);
    if (index >= 0) {
        // update the attribute
        this_element->attribute_values->items[index] = attribute_value;
        return;
    } else {
        push(this_element->attribute_names, (void**)&attribute_name, 1);
        push(this_element->attribute_values, (void**)&attribute_value, 1);
    }
}

/**
 * @note the attribute_name will NOT be freed
 * @note the attribute_value will be freed
 */
void remove_attribute(Element* this_element, const char* attribute_name) {
    assert(("remove_attribute: empty this_element", this_element != NULL));
    if (this_element->attribute_names == NULL) {
        return;
    }
    int32_t index = index_of(this_element->attribute_names, attribute_name);
    if (index >= 0) {
        free(this_element->attribute_values->items[index]);
        splice(this_element->attribute_names, index, 1, NULL, 0, NULL);
        splice(this_element->attribute_values, index, 1, NULL, 0, NULL);
    }
}

/**
 * @note do not free the return value
 */
const char* get_attribute(Element* this_element, const char* attribute_name) {
    assert(("get_attribute: empty this_element", this_element != NULL));
    if (this_element->attribute_names != NULL) {
        int32_t index = index_of(this_element->attribute_names, attribute_name);
        if (index >= 0) {
            return this_element->attribute_values->items[index];
        }
    }
    return NULL;
}

int32_t* get_attribute_names(Element* this_element) {
    assert(("get_attribute: empty this_element", this_element != NULL));
    if (this_element->attribute_names == NULL) {
        this_element->attribute_names = create_array_list();
        this_element->attribute_values = create_array_list();
    }
    int32_t length = this_element->attribute_names->count;
    int32_t* ret = (int32_t*)malloc((sizeof(int32_t) + 1) * length);
    ret[0] = length; //count
    for (int32_t ii = 0; ii < length; ii++) {
        ret[ii + 1] = (int32_t)this_element->attribute_names->items[ii]; // assign the pointer
    }
    return ret;
}

/**
 * @note the property_name will NOT be freed
 * @note the property_value will be freed
 */
void set_style_property(Element* this_element, const char* property_name, char* property_value, int32_t is_important) {
    assert(("set_style_property: empty this_element", this_element != NULL));
    if (this_element->style_properties == NULL) {
        this_element->style_properties = create_array_list();
        this_element->style_values = create_array_list();
        this_element->style_is_important = create_array_list();
    }
    int32_t index = index_of(this_element->style_properties, property_name);
    if (index >= 0) {
        free(this_element->style_values->items[index]);
        // update the style property
        this_element->style_values->items[index] = property_value;
        this_element->style_is_important->items[index] = (void*)is_important;
        return;
    } else {
        push(this_element->style_properties, (void**)&property_name, 1);
        push(this_element->style_values, (void**)&property_value, 1);
        push(this_element->style_is_important, (void**)&is_important, 1);
    }
    
}

/**
 * @note the property_name will NOT be freed
 * @note the property_value will be freed
 */
void remove_style_property(Element* this_element, const char* property_name) {
    assert(("remove_style_property: empty this_element", this_element != NULL));
    if (this_element->style_properties == NULL) {
        return;
    }
    int32_t index = index_of(this_element->style_properties, property_name);
    if (index >= 0) {
        free(this_element->style_values->items[index]);
        splice(this_element->style_properties, index, 1, NULL, 0, NULL);
        splice(this_element->style_values, index, 1, NULL, 0, NULL);
        splice(this_element->style_is_important, index, 1, NULL, 0, NULL);
    }
}

/**
 * @note the innerHTML ownership is transferred to the element
 * @note the innerHTML will be freed when the element is freed
 */
void set_inner_HTML(Element* this_element, char* innerHTML) {
    assert(("set_inner_HTML: empty this_element", this_element != NULL));
    if (this_element->innerHTML) {
        free(this_element->innerHTML);
    }
    this_element->innerHTML = innerHTML;
    // remove all the children elements
    if (this_element->children) {
        for (int32_t ii = 0; ii < this_element->children->count; ii++) {
            Element* child = this_element->children->items[ii];
            child->parent_element = NULL;
            freeElement(child);
        }
        free_array_list(this_element->children);
        this_element->children = NULL;

    }
}

int32_t get_inner_HTML(Element* this_element, char* buffer, int32_t remaining_size) {
    assert(("get_inner_HTML: empty this_element", this_element != NULL));
    int32_t used_size = 0;
    used_size += snprintf(buffer, remaining_size - used_size, "<%s", this_element->tagName);
    if (remaining_size - used_size <=1) {
        return used_size;
    }
    int32_t is_node = used_size == 1; // if the tag name is empty, this_element is a node, we need to skip current tag
    if (is_node) {
        used_size = 0;
        buffer[0] = '\0';
    }
    else if (this_element->attribute_names) {
        for (int32_t ii = 0; ii < this_element->attribute_names->count; ii++) {
            const char* attribute_name = this_element->attribute_names->items[ii];
            const char* attribute_value = this_element->attribute_values->items[ii];
            used_size += snprintf(buffer + used_size, remaining_size - used_size, " %s=\"%s\"", attribute_name, attribute_value);
            if (remaining_size - used_size <=1) {
                return used_size;
            }
        }
        if (this_element->style_properties) {
            used_size += snprintf(buffer + used_size, remaining_size - used_size, " style=\"");
            if (remaining_size - used_size <=1) {
                return used_size;
            }
            for (int32_t ii = 0; ii < this_element->style_properties->count; ii++) {
                const char* property_name = this_element->style_properties->items[ii];
                const char* property_value = this_element->style_values->items[ii];
                int32_t is_important = (int32_t)this_element->style_is_important->items[ii];
                used_size += snprintf(buffer + used_size, remaining_size - used_size, is_important == True ? "%s:%s !important;" : "%s:%s;", property_name, property_value);
                if (remaining_size - used_size <=1) {
                    return used_size;
                }
            }
            used_size += snprintf(buffer + used_size, remaining_size - used_size, "\"");
            if (remaining_size - used_size <=1) {
                return used_size;
            }
        }
        used_size += snprintf(buffer + used_size, remaining_size - used_size, ">");
        if (remaining_size - used_size <=1) {
            return used_size;
        }
    }
    if (this_element->innerHTML) {
        used_size += snprintf(buffer + used_size, remaining_size - used_size, "%s", this_element->innerHTML);
        if (remaining_size - used_size <=1) {
            return used_size;
        }
    } else if (this_element->children) {
        for (int32_t ii = 0; ii < this_element->children->count; ii++) {
            Element* child = this_element->children->items[ii];
            if (child) {
                used_size += get_inner_HTML(child, buffer + used_size, remaining_size - used_size);
                if (remaining_size - used_size <=1) {
                    return used_size;
                }
            }
        }
    }
    if (!is_node) {
        used_size += snprintf(buffer + used_size, remaining_size - used_size, "</%s>", this_element->tagName);
    }
    return used_size;
}