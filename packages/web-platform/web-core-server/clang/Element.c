#include "Element.h"

int incId = 1;
void freeElement(Element* element);
void removeFromParent(RefCount* elementRefCount);

void freeElement(Element* element) {
    if (element->children) {
        LinkedListElement* current = element->children->head;
        while (current) {
            RefCount* kid = (RefCount*)current->item;
            if (kid) {
                int currentCount = decRefCount(kid);
                if (currentCount == 0) {
                    current->item = NULL;
                }
            }
            current = current->next;
        }
        freeLinkedList(element->children);
        element->children = NULL;
    }
    decWeakCount(element->parentRefCount);
    // We never clean the globalElementList
    // because we don't want to change the uniqueId of the element
    // and we don't want to change the index of the element
    free(element);
}

RefCount* createElement(char* tagName) {
    int uniqueId = incId;
    incId++;
    Element* element = (Element*)malloc(sizeof(Element));
    if (element == NULL) {
        throw("createElement: malloc failed");
    }
    element->uniqueId = uniqueId;
    element->children = NULL;
    element->parentRefCount = NULL;
    element->tagName = tagName;
    element->attributeName = NULL;
    element->attributeValue = NULL;
    RefCount* refCount = createRefCount(element, (void (*)(void *))freeElement);
}

void append(RefCount* thisElementRefCount, RefCount** children, int count) {
    ASSERT(thisElementRefCount != NULL, "append: the input thisElementRefCount is NULL");
    Element* thisElement = (Element*)thisElementRefCount->obj;
    ASSERT(thisElement != NULL, "append: empty RefCount");
    if (thisElement->children == NULL) {
        thisElement->children = initLinkedList(count);
    }
    for (int ii = 0; ii < count; ii++) {
        RefCount* kidRefCount = children[ii];
        ASSERT(kidRefCount != NULL, "append: the input chilren array has a NULL element");

        // incRefCount first to avoid the Element be freed on removeFromParent
        incRefCount(kidRefCount);
        Element* kidElement = (Element*)kidRefCount->obj;
        ASSERT(kidElement != NULL, "append: kidRefCount has a NULL obj");
        RefCount* parentRefCount = kidElement->parentRefCount;
        if (parentRefCount) {
            removeFromParent(kidRefCount);
        }
        pushLinkedList(thisElement->children, kidRefCount);
        kidElement->parentRefCount = thisElementRefCount;
        incWeakCount(thisElementRefCount);
    }
}


void replaceWith(RefCount* elementRefCount, RefCount** children, int count) {
    ASSERT(elementRefCount != NULL, "replaceWith: the input elementRefCount is NULL");
    Element* element = (Element*)elementRefCount->obj;
    ASSERT(element != NULL, "replaceWith: empty RefCount");
    RefCount* parentRef = element->parentRefCount;
    if (parentRef) {
        Element* parent = (Element*)parentRef->obj;
        ASSERT(parent != NULL, "replaceWith: empty RefCount");
        for(int ii = 0; ii < count; ii++) {
            RefCount* kidRefCount = children[ii];
            ASSERT(kidRefCount != NULL, "replaceWith: the input chilren array has a NULL RefCount");
            Element* kidElement = (Element*)kidRefCount->obj;
            ASSERT(kidElement != NULL, "replaceWith: RefCount has a NULL obj");
            incRefCount(kidRefCount);
            kidElement->parentRefCount = parentRef;
            incWeakCount(parentRef);
            
        }
        int currentIndex = indexOfLinkedListItem(parent->children, elementRefCount);
        ASSERT(currentIndex >= 0, "replaceWith: the element have parent, but not in the parent's children");
        spliceLinkedListItems(parent->children, currentIndex, 1, (void**)children, count);
        decRefCount(elementRefCount);
        element->parentRefCount = NULL;
        decWeakCount(parentRef);
    }
}

void removeFromParent(RefCount* elementRefCount) {
    Element* element = (Element*)elementRefCount->obj;
    ASSERT(element != NULL, "removeFromParent: empty RefCount");
    if (element->parentRefCount) {
        Element* parent = (Element*)element->parentRefCount->obj;
        if (parent) {
            ASSERT(parent != NULL, "removeFromParent: empty parent RefCount");
            removeLinkedListItem(parent->children, elementRefCount);
            decRefCount(elementRefCount);
        }
        decWeakCount(element->parentRefCount);
        element->parentRefCount = NULL;
    }
}

RefCount* insertBefore(RefCount* parentRefCount, RefCount* newElementRefCount, RefCount* refElementRefCount) {
    ASSERT(parentRefCount != NULL, "insertBefore: the input parentRefCount is NULL");
    Element* parent = (Element*)parentRefCount->obj;
    ASSERT(parent != NULL, "insertBefore: empty parent RefCount");
    incRefCount(newElementRefCount);
    removeFromParent(newElementRefCount);
    Element* newElement = (Element*)newElementRefCount->obj;
    ASSERT(newElement != NULL, "insertBefore: empty newElement RefCount");
    if (newElementRefCount) {
        int refIndex = indexOfLinkedListItem(parent->children, refElementRefCount);
        if (refIndex >=0) {
            newElement->parentRefCount = parentRefCount;
            incWeakCount(parentRefCount);
            spliceLinkedListItems(parent->children, refIndex, 0, (void**)&newElementRefCount, 1);
        } else {
            decRefCount(newElementRefCount);
        }
    } else {
        newElement->parentRefCount = parentRefCount;
        incWeakCount(parentRefCount);
        pushLinkedList(parent->children, newElementRefCount);
    }
    return newElementRefCount;
}

RefCount* removeChild(RefCount* parentRefCount, RefCount* childRefCount) {
    ASSERT(parentRefCount != NULL, "removeChild: the input parentRefCount is NULL");
    Element* parent = (Element*)parentRefCount->obj;
    ASSERT(parent != NULL, "removeChild: empty parent RefCount");
    Element* child = (Element*)childRefCount->obj;
    ASSERT(child != NULL, "removeChild: empty child RefCount");
    ASSERT(parentRefCount == child->parentRefCount, "removeChild: the child is not in the parent");
    removeFromParent(childRefCount);
}

/**
 * @note do not forget to inc refCount for the return value
 */
RefCount* getParentElement(RefCount* elementRefCount) {
    ASSERT(elementRefCount != NULL, "getParentElement: the input elementRefCount is NULL");
    Element* element = (Element*)elementRefCount->obj;
    if (element && element->parentRefCount) {
        RefCount* parentRefCount = element->parentRefCount;
        Element* parent = (Element*)parentRefCount->obj;
        if (parent) {
            return parentRefCount;
        } else {
            decWeakCount(parentRefCount);
            element->parentRefCount = NULL;
        }
    }
}

/**
 * @note do not forget to inc refCount for the return value
 */
RefCount* getFirstElementChild(RefCount* elementRefCount) {
    ASSERT(elementRefCount != NULL, "getFirstElementChild: the input elementRefCount is NULL");
    Element* element = (Element*)elementRefCount->obj;
    if (element && element->children) {
        LinkedListElement* firstChild = element->children->head;
        if (firstChild) {
            return (RefCount*)firstChild->item;
        }
    }
    return NULL;
}

/**
 * @note do not forget to inc refCount for the return value
 */
RefCount* getLastElementChild(RefCount* elementRefCount) {
    ASSERT(elementRefCount != NULL, "getLastElementChild: the input elementRefCount is NULL");
    Element* element = (Element*)elementRefCount->obj;
    if (element && element->children) {
        LinkedListElement* lastChild = element->children->tail;
        if (lastChild) {
            return (RefCount*)lastChild->item;
        }
    }
    return NULL;
}

/**
 * @note do not forget to inc refCount for the return value
 */
RefCount* getNextElementSibling(RefCount* elementRefCount) {
    RefCount* parentRefCount = getParentElement(elementRefCount);
    if (parentRefCount) {
        Element* parent = (Element*)parentRefCount->obj;
        int currentIndex = indexOfLinkedListItem(parent->children, elementRefCount);
        if (currentIndex >= 0) {
            RefCount* nextSiblingRefCount = getLinkedListItem(parent->children, currentIndex + 1);
            return nextSiblingRefCount;
        }
    }
    return NULL;
}


/**
 * @note do not free the attributeName and attributeValue
 */
void setAttribute(RefCount* elementRef, char* attributeName, char* attributeValue) {
    ASSERT(elementRef != NULL, "setAttribute: emptyElementRef");
    Element* element = elementRef -> obj;
    ASSERT(element != NULL, "setAttribute: empty element");
    if (element->attributeName == NULL) {
        element->attributeName = initLinkedList(1);
        element->attributeValue = initLinkedList(1);
    }
    pushLinkedList(element->attributeName, attributeName);
    pushLinkedList(element->attributeValue, attributeValue);
}

/**
 * @note free the attributeName and attributeValue
 */
void removeAttribute(RefCount* elementRef, char* attributeName) {
    ASSERT(elementRef != NULL, "removeAttribute: emptyElementRef");
    Element* element = elementRef -> obj;
    ASSERT(element != NULL, "removeAttribute: empty element");
    if (element->attributeName == NULL) {
        return;
    }
    int index = indexOfLinkedListItem(element->attributeName, attributeName);
    if (index >= 0) {
        removeLinkedListItem(element->attributeName, attributeName);
        spliceLinkedListItems(element->attributeValue, index, 1, NULL, 0);
    }
}

int getInnerHTML(RefCount* elementRef, char* buffer, int remainingSize) {
    ASSERT(elementRef != NULL, "getInnerHTML: emptyElementRef");
    Element* element = elementRef -> obj;
    ASSERT(element != NULL, "getInnerHTML: empty element");
    printf("uniqueid:%d\n rem:%d, ", element->uniqueId, remainingSize);
    int usedSize = snprintf(buffer, remainingSize, "<%s>", element->tagName);
    remainingSize -= usedSize;
    if (remainingSize <= 0) {
        return usedSize;
    }

    LinkedListElement* current = element->children->head;
    while (current) {
        RefCount* child = (RefCount*)current->item;
        if (child) {
            Element* childElement = (Element*)child->obj;
            if (childElement) {
                usedSize += getInnerHTML(child, buffer + usedSize, remainingSize);
            }
        }
        current = current->next;
    }
    usedSize += snprintf(buffer + usedSize, remainingSize, "</%s>", element->tagName);
    return usedSize;
}
