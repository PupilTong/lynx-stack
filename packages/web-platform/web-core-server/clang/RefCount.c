#include "RefCount.h"


RefCount* createRefCount(void* obj, void (*freeCallback)(void* obj)) {
    RefCount* refCount = (RefCount*)malloc(sizeof(RefCount));
    ASSERT(refCount != NULL, "createRefCount: malloc failed");
    refCount->count = 1; // Initialize reference count to 1
    refCount->obj = obj;
    refCount->freeCallback = freeCallback;
    return refCount;
}

/**
 * Decrement the reference count of the object.
 * return the current reference count.
 */
int decRefCount(RefCount* refCount) {
    if (refCount == NULL) {
        return 0; // Invalid reference count
    }
    refCount->count--;
    if (refCount->count == 0) {
      refCount->freeCallback(refCount->obj);
    }
    int weakCount = decRefCount(refCount);
    if (weakCount != 0) {
        return refCount->count; // Return the current reference count
    }
    return 0;
}

int decWeakCount(RefCount* refCount) {
    if (refCount == NULL) {
        return 0; // Invalid reference count
    }
    refCount->weakCount--;
    if (refCount->weakCount == 0) {
      free(refCount);
      return 0; // Successfully freed
    }
    return refCount->weakCount; // Return the current reference count
}

/**
 * Increment the reference count of the object.
 * return the current reference count.
 */
int incRefCount(RefCount* refCount) {
    if (refCount == NULL) {
        return 0; // Invalid reference count
    }
    refCount->count++;
    refCount->weakCount++;
    return refCount->count; // Return the current reference count
}

int incWeakCount(RefCount* refCount) {
    if (refCount == NULL) {
        return 0; // Invalid reference count
    }
    refCount->weakCount++;
    return refCount->weakCount; // Return the current reference count
}