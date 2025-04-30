#ifndef LINKEDLIST_H
#define LINKEDLIST_H
#include <stdlib.h>
#include "utils.h"

struct LinkedListElement;
struct LinkedList;

typedef struct LinkedListElement {
    struct LinkedListElement* prev; 
    struct LinkedListElement* next; 
    void* item;
} LinkedListElement;
typedef struct {
    struct LinkedListElement* head;
    struct LinkedListElement* tail;
    int count;
} LinkedList;

LinkedList* initLinkedList();
int freeLinkedList(LinkedList* array);
int pushLinkedList(LinkedList* array, void* item);
int indexOfLinkedListItem(LinkedList* array, void* item);
void* getLinkedListItem(LinkedList* array, int index);
int setArrayItem(LinkedList* array, int index, void* item);
void* removeLinkedListItem(LinkedList* array, void* item);
int spliceLinkedListItems(LinkedList* array, int index, int removeLength, void** items, int count);
#endif