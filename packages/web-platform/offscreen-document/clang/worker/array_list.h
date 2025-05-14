#ifndef ARRAYLIST_H
#define ARRAYLIST_H
#include <stdlib.h>
#include <assert.h>
#include <stdint.h>

#define True 1
#define False 0

struct ArrayList;

typedef struct {
  int32_t count;
  void** items;
  int32_t size;
} ArrayList;

int32_t index_of(ArrayList* list, const void* item);
int32_t grow(ArrayList* list, int32_t increaseSize);
void push(ArrayList *list, void **items, int32_t count);
void splice(ArrayList* list, int32_t index, int32_t count, void** items, int32_t itemCount, void (*deleteItemCallback)(void *, int32_t));
void free_array_list(ArrayList* list);
ArrayList* create_array_list();
#endif