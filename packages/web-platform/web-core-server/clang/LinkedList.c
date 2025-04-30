#include "LinkedList.h"
LinkedListElement* getLinkedListElement(LinkedList* array, int index);
void deleteLinkedListElement(LinkedList* array, LinkedListElement* element);


LinkedList* initLinkedList() {
    LinkedList* array = (LinkedList*)malloc(sizeof(LinkedList));

}
/**
 * @public
 * @brief Free the array.
 * @param array The array to free.
 * Note: This function will not free the items in the array.
 * If you want to free the items in the array, you need to do it manually.
 * @return True if the array was freed, False if the array was False.
 */
int freeLinkedList(LinkedList* array) {
    if (array) {
        LinkedListElement* current = array->head;
        while (current) {
            LinkedListElement* next = current->next;
            free(current);
            current = next;
        }
        free(array);
    } else {
        return False;
    }
    return True;
}

/**
 * @public
 * @brief Get the index of an item in the array.
 * @param array The array to get the index from.
 */
int indexOfLinkedListItem(LinkedList* array, void* item) {
    if (array == NULL || item == NULL) {
        return -1;
    }
    LinkedListElement* current = array->head;
    int index = 0;
    while (current) {
        if (current->item == item) {
            return index;
        }
        current = current->next;
        index++;
    }
    return -1;
}

/**
 * @public Get a item from the array.
 * @param array The array to get the item from.
 * @param index The index of the item to get.
 * @return The item at the index.
 */
void* getLinkedListItem(LinkedList* array, int index) {
    return getLinkedListElement(array, index)->item;
}

/**
 * @public Set a item in the array.
 * @param array The array to set the item in.
 * @param index The index of the item to set.
 * @param item The item to set.
 * @return True if the item was set, False if the item was not set.
 */
int setArrayItem(LinkedList* array, int index, void* item) {
    LinkedListElement* element = getLinkedListElement(array, index);
    if (element) {
        element->item = item;
        return True;
    }
    return False;
}

/**
 * @public
 * @brief Get an item from the array.
 * @param array The array to get the item from.
 * @param index The index of the item to get.
 * @return The item at the index.
 */
void* removeLinkedListItem(LinkedList* array, void* item) {
    int index = indexOfLinkedListItem(array, item);
    if (index>=0) {
        LinkedListElement* element = getLinkedListElement(array, index);
        deleteLinkedListElement(array, element);
        return item;
    }
    return NULL;
}

/**
 * @public 
 * @brief insert items into the array.
 * @param array The array to insert the item into.
 * @param index The index to insert the item at.
 * @param removeLength items count to be removed
 * @param item items to insert.
 * @param count The number of items to insert.
 * @return the number of items inserted.
 */
int spliceLinkedListItems(LinkedList* array, int index, int removeLength, void** items, int count) {
    LinkedListElement* current = getLinkedListElement(array, index);
    if (current) {
        // remove the items from the array
        for (int ii = 0; ii < removeLength && current; ii++) {
            LinkedListElement* next = current->next;
            deleteLinkedListElement(array, current);
            current = next;
        }
        if (current) {
            // insert LinkedListElements before current
            for(int ii = 0; ii < count; ii++) {
                LinkedListElement* newElement = (LinkedListElement*)malloc(sizeof(LinkedListElement));
                ASSERT(newElement != NULL, "spliceLinkedListItems: malloc failed");
                newElement->prev = current->prev;
                newElement->next = current;
                newElement->item = items[ii];
                if (current->prev) {
                    current->prev->next = newElement;
                } else {
                    array->head = newElement;
                }
                current->prev = newElement;
                array->count++;
            }
            return count;
        } else {
            //push the item to the end of the array
            for (int ii = 0; ii < count; ii++) {
                pushLinkedList(array, items[ii]);
            }
            return count;
        }
    }
    else if (index == array->count && removeLength == 0) {
        // push the item to the end of the array
        for (int ii = 0; ii < count; ii++) {
            pushLinkedList(array, items[ii]);
        }
        return count;
    }
    else {
        throw("spliceLinkedListItems: index out of bounds");
    }
}


 /**
  * @private
  * @brief Get an LinkedListElement from the array.
  * @param array The array to get the item from.
  * @param index The index of the item to get.
  * @return The item at the index.
  */
LinkedListElement* getLinkedListElement(LinkedList* array, int index) {
    if (index < 0 || index >= array->count) {
        return NULL;
    }
    LinkedListElement* current = array->head;
    // if the Index is less than half the size of the array, start from the head
    if (index > array->count / 2) {
        for (int i = 0; i < index; i++) {
            current = current->next;
        }
    }
    else {
        current = array->tail;
        index = array->count - index - 1;
        for (int i = 0; i < index; i++) {
            current = current->prev;
        }
    }
    return current;
}


/**
 * @public
 * @brief Push an item to the array.
 * If the array is full, it will grow the array.
 * If the array is not full, it will add the item to the array.
 * @param array The array to push the item to.
 * @param item The item to push to the array.
 * @return The index of the item in the array
 */
int pushLinkedList(LinkedList* array, void* item) {
    LinkedListElement* tail = array->tail;
    LinkedListElement* newElement = (LinkedListElement*)malloc(sizeof(LinkedListElement));
    ASSERT(newElement != NULL, "pushLinkedList: malloc failed");
    newElement->prev = tail;
    newElement->next = NULL;
    newElement->item = item;
    if (tail == NULL) {
        array->head = newElement;
        array->tail = newElement;
        newElement->prev = NULL;
        newElement->next = NULL;
    } else {
        tail->next = newElement;
        array->tail = newElement;
    }
    array->count++;
    return array->count - 1;
}

/**
 * @private 
 * @brief Delete an LinkedListElement from the array.
 * @param array The array to delete the item from.
 * @param element The element to delete.
 * The element will be removed from the array and freed.
 */
void deleteLinkedListElement(LinkedList* array, LinkedListElement* element) {
    if (!element) {
        return;
    }
    if (element->prev) {
        element->prev->next = element->next;
    }
    if (element->next) {
        element->next->prev = element->prev;
    }
    if (array->head == element) {
        array->head = element->next;
    }
    if (array->tail == element) {
        array->tail = element->prev;
    }
    array->count--;
    free(element);
}