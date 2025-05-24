import init from './binary/tokenizer.js';
import { tokenize } from '/root/repos/csstree/lib/tokenizer/index.js';

const tokenizer = await init();

const source =
  'height:300px; width:100px 200px !important; --var: #111111; color: red; background-image: url("https://example.com/image.png");';
globalThis._source = source;
const sourcePtr = tokenizer._malloc((source.length + 1) * 2);
tokenizer.stringToUTF16(source, sourcePtr, (source.length + 1) * 2);
// @ts-expect-error
globalThis._tokenizer_on_declaration_callback = (
  declarationPropertyStart,
  declarationPropertyEnd,
  declarationValueStart,
  declarationValueEnd,
  important,
) => {
  const declaration = source.substring(
    declarationPropertyStart,
    declarationPropertyEnd,
  );
  const value = source.substring(declarationValueStart, declarationValueEnd);
  console.log('on_deca', `"${declaration}"`, `"${value}"`, important);
};
tokenizer._tokenize(sourcePtr, source.length);
// @ts-expect-error
globalThis._tokenizer_on_token_callback = null;
tokenizer._free(sourcePtr);

// tokenize(source, (type, start, end) => {
//   const token = source.substring(start, end);
//   console.log(type, token);
// })
