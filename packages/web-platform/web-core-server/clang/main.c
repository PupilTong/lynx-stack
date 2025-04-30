#include "main.h"
#include <stdio.h>


int main() {
  init();
  char buffer[65536];
  RefCount* root = createElement("div");
  incRefCount(root);
  for(int ii=0; ii<1000; ii++) {
    RefCount* child = createElement("div");
    incRefCount(child);
    append(root, &child, 1);
  }
  getInnerHTML(root, buffer, sizeof(buffer));
  printf("Hello, World!\n %s", buffer);
  return 0;
}