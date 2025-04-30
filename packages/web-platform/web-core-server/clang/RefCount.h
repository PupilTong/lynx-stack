#ifndef REFCOUNT_H
#define REFCOUNT_H
#include "utils.h"

#include <stdlib.h>

struct RefCount;

/**
 * ElementcRefCountCount.h
 * This is a simple reference counting implementation for a pointer
 */
typedef struct {
    void* obj;
    int count;
    int weakCount;
    void (*freeCallback)(void *obj);
} RefCount;

RefCount* createRefCount(void* obj, void (*freeCallback)(void* obj));
int decRefCount(RefCount* refCount);
int decWeakCount(RefCount* refCount);
int incRefCount(RefCount* refCount);
int incWeakCount(RefCount* refCount);
#endif