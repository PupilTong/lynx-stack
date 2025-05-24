#include "trie.h"

void* get_trie_value(struct TrieNode* node, uint16_t* source, int32_t length) {
  for(int32_t ii = 0; ii < length; ii++) {
    uint16_t char_code = get_trie_char_code(source[ii]);
    uint32_t char_code_mask = 1 << char_code;
    uint32_t is_continue = node->char_map & char_code_mask;
    if (is_continue == 0) {
      return NULL;
    }
    if (ii == length - 1) {
      return node->values[char_code];
    }
  }
}

