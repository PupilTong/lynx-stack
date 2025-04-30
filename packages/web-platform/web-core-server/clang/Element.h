#ifndef ELEMENT_H
#define ELEMENT_H
#include <stdlib.h>
#include <stdio.h>
#include "LinkedList.h"
#include "RefCount.h"
#include "utils.h"

typedef struct {
  int uniqueId;
  char* tagName;
  RefCount* parentRefCount;
  /**
   * One dimensional array of children RefCount objects.
   */
  LinkedList* children;
  LinkedList* attributeName;
  LinkedList* attributeValue;
} Element;
RefCount* createElement(char* tagName);
void append(RefCount* thisElementRefCount, RefCount** children, int count);
void replaceWith(RefCount* elementRefCount, RefCount** children, int count);
RefCount* insertBefore(RefCount* parentRefCount, RefCount* newElementRefCount, RefCount* refElementRefCount);
RefCount* removeChild(RefCount* parentRefCount, RefCount* childRefCount);
RefCount* getParentElement(RefCount* elementRefCount);
RefCount* getFirstElementChild(RefCount* elementRefCount);
RefCount* getLastElementChild(RefCount* elementRefCount);
RefCount* getNextElementSibling(RefCount* elementRefCount);
void setAttribute(RefCount* elementRef, char* attributeName, char* attributeValue);
void removeAttribute(RefCount* elementRef, char* attributeName);
int getInnerHTML(RefCount* elementRef, char* buffer, int remainingSize);
#endif