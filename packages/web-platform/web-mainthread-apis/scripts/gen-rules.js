/**
 * replace values of the property
 * if one value is not listed, it will be ignored and kept as is.
 * This rules are used to convert the values of the properties to the browser valid values.
 */
const replaceRules = {
  display: {
    linear: [
      ['--lynx-display-toggle', 'var(--lynx-display-linear)'],
      ['--lynx-display', 'linear'],
      ['display', 'flex'],
    ],
    flex: [
      ['--lynx-display-toggle', 'var(--lynx-display-flex)'],
      ['--lynx-display', 'flex'],
      ['display', 'flex'],
    ],
  },
  direction: {
    'lynx-rtl': [['direction', 'rtl']],
  },
  'linear-orientation': {
    none: [],
    horizontal: [
      ['--lynx-linear-orientation', 'horizontal'],
      [
        '--lynx-linear-orientation-toggle',
        'var(--lynx-linear-orientation-horizontal)',
      ],
    ],
    'horizontal-reverse': [
      ['--lynx-linear-orientation', 'horizontal-reverse'],
      [
        '--lynx-linear-orientation-toggle',
        'var(--lynx-linear-orientation-horizontal-reverse)',
      ],
    ],
    vertical: [
      ['--lynx-linear-orientation', 'vertical'],
      [
        '--lynx-linear-orientation-toggle',
        'var(--lynx-linear-orientation-vertical)',
      ],
    ],
    'vertical-reverse': [
      ['--lynx-linear-orientation', 'vertical-reverse'],
      [
        '--lynx-linear-orientation-toggle',
        'var(--lynx-linear-orientation-vertical-reverse)',
      ],
    ],
  },
  'linear-direction': {
    none: [],
    row: [
      ['--lynx-linear-orientation', 'horizontal'],
      [
        '--lynx-linear-orientation-toggle',
        'var(--lynx-linear-orientation-horizontal)',
      ],
    ],
    'row-reverse': [
      ['--lynx-linear-orientation', 'horizontal-reverse'],
      [
        '--lynx-linear-orientation-toggle',
        'var(--lynx-linear-orientation-horizontal-reverse)',
      ],
    ],
    column: [
      ['--lynx-linear-orientation', 'vertical'],
      [
        '--lynx-linear-orientation-toggle',
        'var(--lynx-linear-orientation-vertical)',
      ],
    ],
    'column-reverse': [
      ['--lynx-linear-orientation', 'vertical-reverse'],
      [
        '--lynx-linear-orientation-toggle',
        'var(--lynx-linear-orientation-vertical-reverse)',
      ],
    ],
  },
  'linear-gravity': {
    none: [],
    top: [
      ['--justify-content-column', 'flex-start'],
      ['--justify-content-column-reverse', 'flex-end'],
      ['--justify-content-row', 'flex-start'],
      ['--justify-content-row-reverse', 'flex-start'],
    ],
    bottom: [
      ['--justify-content-column', 'flex-end'],
      ['--justify-content-column-reverse', 'flex-start'],
      ['--justify-content-row', 'flex-start'],
      ['--justify-content-row-reverse', 'flex-start'],
    ],
    left: [
      ['--justify-content-column', 'flex-start'],
      ['--justify-content-column-reverse', 'flex-start'],
      ['--justify-content-row', 'flex-start'],
      ['--justify-content-row-reverse', 'flex-end'],
    ],
    right: [
      ['--justify-content-column', 'flex-start'],
      ['--justify-content-column-reverse', 'flex-start'],
      ['--justify-content-row', 'flex-end'],
      ['--justify-content-row-reverse', 'flex-start'],
    ],
    'center-vertical': [
      ['--justify-content-column', 'center'],
      ['--justify-content-column-reverse', 'center'],
      ['--justify-content-row', 'flex-start'],
      ['--justify-content-row-reverse', 'flex-start'],
    ],
    'center-horizontal': [
      ['--justify-content-column', 'flex-start'],
      ['--justify-content-column-reverse', 'flex-start'],
      ['--justify-content-row', 'center'],
      ['--justify-content-row-reverse', 'center'],
    ],
    start: [
      ['--justify-content-column', 'flex-start'],
      ['--justify-content-column-reverse', 'flex-start'],
      ['--justify-content-row', 'flex-start'],
      ['--justify-content-row-reverse', 'flex-start'],
    ],
    end: [
      ['--justify-content-column', 'flex-end'],
      ['--justify-content-column-reverse', 'flex-end'],
      ['--justify-content-row', 'flex-end'],
      ['--justify-content-row-reverse', 'flex-end'],
    ],
    center: [
      ['--justify-content-column', 'center'],
      ['--justify-content-column-reverse', 'center'],
      ['--justify-content-row', 'center'],
      ['--justify-content-row-reverse', 'center'],
    ],
    'space-between': [
      ['--justify-content-column', 'space-between'],
      ['--justify-content-column-reverse', 'space-between'],
      ['--justify-content-row', 'space-between'],
      ['--justify-content-row-reverse', 'space-between'],
    ],
  },
  'linear-cross-gravity': {
    none: [],
    start: [['align-items', 'start']],
    end: [['align-items', 'end']],
    center: [['align-items', 'center']],
    stretch: [['align-items', 'stretch']],
  },
  'linear-layout-gravity': {
    none: [
      ['--align-self-row', 'auto'],
      ['--align-self-column', 'auto'],
    ],
    stretch: [
      ['--align-self-row', 'stretch'],
      ['--align-self-column', 'stretch'],
    ],
    top: [
      ['--align-self-row', 'start'],
      ['--align-self-column', 'auto'],
    ],
    bottom: [
      ['--align-self-row', 'end'],
      ['--align-self-column', 'auto'],
    ],
    left: [
      ['--align-self-row', 'auto'],
      ['--align-self-column', 'start'],
    ],
    right: [
      ['--align-self-row', 'auto'],
      ['--align-self-column', 'end'],
    ],
    start: [
      ['--align-self-row', 'start'],
      ['--align-self-column', 'start'],
    ],
    end: [
      ['--align-self-row', 'end'],
      ['--align-self-column', 'end'],
    ],
    center: [
      ['--align-self-row', 'center'],
      ['--align-self-column', 'center'],
    ],
    'center-vertical': [
      ['--align-self-row', 'center'],
      ['--align-self-column', 'start'],
    ],
    'center-horizontal': [
      ['--align-self-row', 'start'],
      ['--align-self-column', 'center'],
    ],
    'fill-vertical': [
      ['--align-self-row', 'stretch'],
      ['--align-self-column', 'auto'],
    ],
    'fill-horizontal': [
      ['--align-self-row', 'auto'],
      ['--align-self-column', 'stretch'],
    ],
  },
  'justify-content': {
    left: [],
    right: [],
    start: [
      ['justify-content', 'flex-start'],
    ],
    end: [
      ['justify-content', 'flex-end'],
    ],
  },
};
/**
 * replace the property name
 * if the property is not listed, it will be ignored and kept as is.
 * This rules are used to convert the property name to the browser valid property name.
 */
const renameRules = {
  'flex-direction': '--flex-direction',
  'flex-wrap': '--flex-wrap',
  'flex-grow': '--flex-grow',
  'flex-shrink': '--flex-shrink',
  'flex-basis': '--flex-basis',
  'list-main-axis-gap': '--list-main-axis-gap',
  'list-cross-axis-gap': '--list-cross-axis-gap',
};
const aCode = 'a'.charCodeAt(0);
const zCode = 'z'.charCodeAt(0);
const ACode = 'A'.charCodeAt(0);
const ZCode = 'Z'.charCodeAt(0);

function createTrie() {
  const trie = {
    nodes: [],
  };
  function set(key, value) {
    for (let ii = 0; ii < key.length; ii++) {
      if (trie.nodes[ii] === undefined) {
        trie.nodes[ii] = {
          char_map: 0,
          char_index_to_values: new Array(27).fill(undefined),
        };
      }
      const node = trie.nodes[ii];
      const charCode = key.charCodeAt(ii);
      const charIndex = charCode >= aCode && charCode <= zCode
        ? charCode - aCode
        : (
          charCode >= ACode && charCode <= ZCode ? charCode - ACode : 26
        );
      node.char_map |= 1 << charIndex;
      if (ii === key.length - 1) {
        node.char_index_to_values[charIndex] = value;
        node.debug_key_name = key;
      }
    }
  }
  function get(key) {
    for (let ii = 0; ii < key.length; ii++) {
      const node = trie.nodes[ii];
      const charCode = key.charCodeAt(ii);
      const charIndex = charCode >= aCode && charCode <= zCode
        ? charCode - aCode
        : (
          charCode >= ACode && charCode <= ZCode ? charCode - ACode : 26
        );
      if (node === undefined) {
        return undefined;
      }
      const is_continue = node.char_map & (1 << charIndex);
      if (!is_continue) {
        return undefined;
      }
      if (ii === key.length - 1) {
        return node.char_index_to_values[charIndex];
      }
    }
  }
  return Object.assign(trie, {
    set,
    get,
  });
}

const replaceValueRuleTrie = createTrie();
const renameRuleTrie = createTrie();

Object.entries(replaceRules).forEach(([property, valueMap]) => {
  const trie = replaceValueRuleTrie.get(property) ?? createTrie();
  Object.entries(valueMap).forEach(([value, newValue]) => {
    trie.set(
      value,
      newValue.map(([propertyName, propertyValue]) =>
        `${propertyName}:${propertyValue};`
      ).join(''),
    );
  });
  replaceValueRuleTrie.set(property, trie);
});

Object.entries(renameRules).forEach(([oldPropertyName, newPropertyName]) => {
  renameRuleTrie.set(oldPropertyName, newPropertyName);
});

// now confirm the trie is working
if (
  replaceValueRuleTrie.get('display').get('linear')
    !== replaceRules.display.linear.map(([propertyName, propertyValue]) =>
      `${propertyName}:${propertyValue};`
    ).join('')
) {
  throw new Error('Trie is not working');
}

if (renameRuleTrie.get('flex-direction') !== '--flex-direction') {
  throw new Error('Trie is not working');
}
const stringConsts = new Set();
const trieConstants = [];

function genIdentifier(name, prefix) {
  return `${prefix}__${
    name.toLowerCase().replaceAll(')', '_').replaceAll('(', '_').replaceAll(
      '-',
      '_',
    ).replaceAll(' ', '_').replaceAll(':', '_').replaceAll(';', '_')
  }`;
}

function generateTrieIntoClangCode(trie, name) {
  const decl = '{' + trie.nodes.map((node) => {
    const charMapValueDecl = `0x${node.char_map.toString(16)}`;
    const charIndexToValusDecl = node.char_index_to_values.map((value) => {
      if (value === undefined) {
        return 'NULL';
      } else if (typeof value === 'string') {
        const stringName = genIdentifier(value, 'str');
        stringConsts.add(
          `uint16_t ${stringName}[${value.length}] = {${
            [...value]
              .map(char => char.charCodeAt(0))
              .map(charCode => `0x${charCode.toString(16)}`)
              .join(',')
          }};`,
        );
        return `(TrieNode*)${stringName}`; // the rename rule always has one level, the replace rule always has two levels
      } else {
        const subTireNodeName = genIdentifier(
          value.debug_key_name ?? `inc_id_${trieConstants.length}`,
          'trie',
        );
        generateTrieIntoClangCode(value, subTireNodeName);
        return subTireNodeName;
      }
    });
    return `  \n{${charMapValueDecl}, {${charIndexToValusDecl.join(',')}} }`;
  }).join(',\n') + '}';
  trieConstants.push(`TrieNode ${name}[${trie.nodes.length}] = \n${decl};`);
}

generateTrieIntoClangCode(replaceValueRuleTrie, 'rename_rule_trie');
generateTrieIntoClangCode(renameRuleTrie, 'replace_rule_trie');
const finalCode = `
#ifndef __RULES_H__
#define __RULES_H__
#include <stdint.h>
#include <stddef.h>
#include "../clang/lynx-style-transform/trie.h"
${[...stringConsts].join('\n')}
${trieConstants.join('\n')}
#endif

`;
console.log(finalCode);
