#include "main.h"
#include <stdio.h>


int main() {
  init();
  char buffer[65536];
  Element* root = create_element("div");
  for(int ii=0; ii<1000; ii++) {
    Element* child = create_element("div");
    append(root, &child, 1);
  }
  get_inner_HTML(root, buffer, sizeof(buffer));
  printf("Hello, World!\n %s", buffer);
  return 0;
}