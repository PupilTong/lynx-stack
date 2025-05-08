#include "element.h"
int32_t incId = 1;
void freeElement(Element* element);
void remove_from_parent(Element* this_element, int32_t parent_index);

void freeElement(Element* element) {
    if (element->children) {
        free_array_list(element->children);
    }
    if (element->attribute_names) {
        free_array_list(element->attribute_names);
    }
    if (element->attribute_values) {
        free_array_list(element->attribute_values);
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
    }
}
Element* create_element(char* tagName) {
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
    element->children = create_array_list();
    element->attribute_names = create_array_list();
    element->attribute_values = create_array_list();
    return element;
}

void append(Element* this_element, Element** children, int32_t count) {
    assert(("append: the input this_element is NULL", this_element != NULL));
    for (int32_t ii = 0; ii < count; ii++) {
        Element* kid_element = children[ii];
        if (kid_element->parent_element) {
            remove_from_parent(kid_element, -1);
        }
        kid_element->parent_element = this_element;
    }
    push(this_element->children, (void**)children, count);
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
    if (parent_element) {
        int32_t currentIndex = index_of(parent_element->children, this_element);
        if (currentIndex >= 0 && currentIndex + 1 < parent_element->children->count) {
            Element* nextSibling = parent_element->children->items[currentIndex + 1];
            return nextSibling;
        }
    }
    return NULL;
}


void set_attribute(Element* this_element, char* attribute_name, char* attribute_value) {
    assert(("set_attribute: empty this_element", this_element != NULL));
    if (this_element->attribute_names == NULL) {
        this_element->attribute_names = create_array_list();
        this_element->attribute_values = create_array_list();
    }
    int32_t index = index_of(this_element->attribute_names, attribute_name);
    if (index >= 0) {
        free(this_element->attribute_values->items[index]);
        // update the attribute
        this_element->attribute_values->items[index] = attribute_value;
        return;
    } else {
        push(this_element->attribute_names, (void**)&attribute_name, 1);
        push(this_element->attribute_values, (void**)&attribute_value, 1);
    }
}


void remove_attribute(Element* this_element, char* attribute_name) {
    assert(("remove_attribute: empty this_element", this_element != NULL));
    int32_t index = index_of(this_element->attribute_names, attribute_name);
    if (index >= 0) {
        free(this_element->attribute_values->items[index]);
        splice(this_element->attribute_names, index, 1, NULL, 0, NULL);
        splice(this_element->attribute_values, index, 1, NULL, 0, NULL);
    }
}

int32_t get_inner_HTML(Element* this_element, char* buffer, int32_t remaining_size) {
    assert(("get_inner_HTML: empty this_element", this_element != NULL));
    int32_t used_size = 0;
    used_size += snprintf(buffer, remaining_size - used_size, "<%s", this_element->tagName);
    if (remaining_size - used_size <=1) {
        return used_size;
    }
    for (int32_t ii = 0; ii < this_element->attribute_names->count; ii++) {
        char* attribute_name = this_element->attribute_names->items[ii];
        char* attribute_value = this_element->attribute_values->items[ii];
        used_size += snprintf(buffer + used_size, remaining_size - used_size, " %s=\"%s\"", attribute_name, attribute_value);
        if (remaining_size - used_size <=1) {
            return used_size;
        }
    }
    used_size += snprintf(buffer + used_size, remaining_size - used_size, ">");
    if (remaining_size - used_size <=1) {
        return used_size;
    }
    for (int32_t ii = 0; ii < this_element->children->count; ii++) {
        Element* child = this_element->children->items[ii];
        if (child) {
            used_size += get_inner_HTML(child, buffer + used_size, remaining_size - used_size);
            if (remaining_size - used_size <=1) {
                return used_size;
            }
        }
    }
    used_size += snprintf(buffer + used_size, remaining_size - used_size, "</%s>", this_element->tagName);
    return used_size;
}
