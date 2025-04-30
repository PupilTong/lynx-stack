#include "utils.h"

#include <stdio.h>

void init() {
}

void throw(char* msg) {
  printf("%s", msg);
}

void ASSERT(int ptr, char* msg) {
  if (!ptr) {
    throw(msg);
  }
}