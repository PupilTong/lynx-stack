#include "array_list.h"

int32_t index_of(ArrayList *list, void *item)
{
    assert(("index_of: the input list is NULL",list != NULL));
    if (list->items != NULL)
    {
        for (int32_t ii = 0; ii < list->count; ii++)
        {
            void *currentItem = list->items[ii];
            if (currentItem != NULL && currentItem == item)
            {
                return ii;
            }
        }
    }
    return -1;
}

int32_t grow(ArrayList *list, int32_t increaseSize)
{
    if (list->size < list->count + increaseSize)
    {
        // find the smallest power of 2 that is greater than childrenCount + increaseSize
        int32_t newSize = 1, afterCount = list->count + increaseSize;
        while (newSize < afterCount)
        {
            newSize <<= 1;
        }
        // grow the children array
        void **newChildren = (void **)realloc(list->items, sizeof(void *) * newSize);
        assert(("grow: realloc children failed", newChildren != NULL));
        list->items = newChildren;
        // set the new size
        list->size = newSize;
    }
    return list->size;
}


void push(ArrayList *list, void **items, int32_t count)
{
    assert(("push: the input list is NULL", list != NULL));
    grow(list, count);
    for (int32_t ii = 0; ii < count; ii++)
    {
        void *currentItem = items[ii];
        if (currentItem == NULL)
        {
            continue;
        }
        list->items[list->count] = currentItem;
        list->count++;
    }
}

void splice(ArrayList *list, int32_t index, int32_t deletCount, void **items, int32_t itemCount, void (*deleteItemCallback)(void *, int32_t))
{
    assert(("splice: the input list is NULL", list != NULL));
    assert(("splice: the index is out of range", index >= 0 && index < list->count));
    assert(("splice: the deletCount is out of range", deletCount >= 0 && deletCount <= list->count - index));
    grow(list, itemCount);
    for (int32_t ii = 0; ii < deletCount; ii++)
    {
        void *currentItem = list->items[index + ii];
        if (deleteItemCallback != NULL)
        {
            deleteItemCallback(currentItem, ii);
        }
        list->items[index + ii] = NULL;
    }
    if (itemCount < deletCount)
    {
        // the items are moved to the left
        int32_t moveCount = deletCount - itemCount;
        for (int32_t ii = index + deletCount; ii < list->count; ii++)
        {
            list->items[ii - moveCount] = list->items[ii];
        }
    }
    else if (itemCount > deletCount)
    {
        // the items are moved to the right
        int32_t moveCount = itemCount - deletCount;
        for (int32_t ii = list->count - 1; ii >= index + deletCount; ii--)
        {
            list->items[ii + moveCount] = list->items[ii];
        }
    }
    // insert the new items
    for (int32_t ii = 0; ii < itemCount; ii++)
    {
        void *currentItem = items[ii];
        list->items[index + ii] = currentItem;
    }
    list->count += itemCount - deletCount;
}

void free_array_list(ArrayList *list)
{
    if (list != NULL)
    {
        if (list->items != NULL)
        {
            free(list->items);
        }
        list->count = 0;
        list->size = 0;
        free(list);
    }
}

ArrayList *create_array_list()
{
    ArrayList *list = (ArrayList *)malloc(sizeof(ArrayList));
    list->items = NULL;
    list->count = 0;
    list->size = 0;
    return list;
}