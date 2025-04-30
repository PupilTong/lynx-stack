#ifndef UTILS_H
#define UTILS_H

#define True 1
#define False 0

// /**
//  * typically a lynx view will create about 100 elements before first paint
//  */
// #define INIT_ELEMENTLIST_SIZE 128

void init();
void throw(char* msg);
void ASSERT(int ptr, char* msg);
#endif