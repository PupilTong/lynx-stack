#include "handle_declaration.h";

uint16_t* get_replaced_declaration_str(uint16_t* declaration_name, int32_t declaration_name_length, uint16_t* declaration_value, int32_t declaration_value_length) {
  void* value_trie = get_trie_value(replace_rule_trie, declaration_name, declaration_name_length);
  if (value_trie != NULL) {
    return get_trie_value(value_trie, declaration_value, declaration_value_length);
  }
}


uint16_t* get_rename_rules(uint16_t* declaration_name, int32_t declaration_name_length) {
  return get_trie_value(rename_rule_trie, declaration_name, declaration_name_length);
}

