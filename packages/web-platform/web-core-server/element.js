var Module = (() => {
  var _scriptName = import.meta.url;

  return (
    async function(moduleArg = {}) {
      var moduleRtn;

      var Module = moduleArg;
      var readyPromiseResolve, readyPromiseReject;
      var readyPromise = new Promise((resolve, reject) => {
        readyPromiseResolve = resolve;
        readyPromiseReject = reject;
      });
      var ENVIRONMENT_IS_WEB = typeof window == 'object';
      var ENVIRONMENT_IS_WORKER = typeof WorkerGlobalScope != 'undefined';
      var ENVIRONMENT_IS_NODE = typeof process == 'object'
        && typeof process.versions == 'object'
        && typeof process.versions.node == 'string'
        && process.type != 'renderer';
      if (ENVIRONMENT_IS_NODE) {
        const { createRequire } = await import('module');
        var require = createRequire(import.meta.url);
      }
      var arguments_ = [];
      var thisProgram = './this.program';
      var quit_ = (status, toThrow) => {
        throw toThrow;
      };
      var scriptDirectory = '';
      function locateFile(path) {
        if (Module['locateFile']) {
          return Module['locateFile'](path, scriptDirectory);
        }
        return scriptDirectory + path;
      }
      var readAsync, readBinary;
      if (ENVIRONMENT_IS_NODE) {
        var fs = require('fs');
        var nodePath = require('path');
        if (!import.meta.url.startsWith('data:')) {
          scriptDirectory =
            nodePath.dirname(require('url').fileURLToPath(import.meta.url))
            + '/';
        }
        readBinary = filename => {
          filename = isFileURI(filename) ? new URL(filename) : filename;
          var ret = fs.readFileSync(filename);
          return ret;
        };
        readAsync = async (filename, binary = true) => {
          filename = isFileURI(filename) ? new URL(filename) : filename;
          var ret = fs.readFileSync(filename, binary ? undefined : 'utf8');
          return ret;
        };
        if (process.argv.length > 1) {
          thisProgram = process.argv[1].replace(/\\/g, '/');
        }
        arguments_ = process.argv.slice(2);
        quit_ = (status, toThrow) => {
          process.exitCode = status;
          throw toThrow;
        };
      } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
        if (ENVIRONMENT_IS_WORKER) scriptDirectory = self.location.href;
        else if (typeof document != 'undefined' && document.currentScript) {
          scriptDirectory = document.currentScript.src;
        }
        if (_scriptName) scriptDirectory = _scriptName;
        if (scriptDirectory.startsWith('blob:')) scriptDirectory = '';
        else {scriptDirectory = scriptDirectory.slice(
            0,
            scriptDirectory.replace(/[?#].*/, '').lastIndexOf('/') + 1,
          );}
        {
          if (ENVIRONMENT_IS_WORKER) {
            readBinary = url => {
              var xhr = new XMLHttpRequest();
              xhr.open('GET', url, false);
              xhr.responseType = 'arraybuffer';
              xhr.send(null);
              return new Uint8Array(xhr.response);
            };
          }
          readAsync = async url => {
            if (isFileURI(url)) {
              return new Promise((resolve, reject) => {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.responseType = 'arraybuffer';
                xhr.onload = () => {
                  if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
                    resolve(xhr.response);
                    return;
                  }
                  reject(xhr.status);
                };
                xhr.onerror = reject;
                xhr.send(null);
              });
            }
            var response = await fetch(url, { credentials: 'same-origin' });
            if (response.ok) return response.arrayBuffer();
            throw new Error(response.status + ' : ' + response.url);
          };
        }
      } else {}
      var out = console.log.bind(console);
      var err = console.error.bind(console);
      var wasmBinary;
      var wasmMemory;
      var ABORT = false;
      var HEAP8,
        HEAPU8,
        HEAP16,
        HEAPU16,
        HEAP32,
        HEAPU32,
        HEAPF32,
        HEAP64,
        HEAPU64,
        HEAPF64;
      var runtimeInitialized = false;
      var isFileURI = filename => filename.startsWith('file://');
      function updateMemoryViews() {
        var b = wasmMemory.buffer;
        HEAP8 = new Int8Array(b);
        HEAP16 = new Int16Array(b);
        HEAPU8 = new Uint8Array(b);
        HEAPU16 = new Uint16Array(b);
        HEAP32 = new Int32Array(b);
        Module['HEAPU32'] = HEAPU32 = new Uint32Array(b);
        HEAPF32 = new Float32Array(b);
        HEAPF64 = new Float64Array(b);
        HEAP64 = new BigInt64Array(b);
        HEAPU64 = new BigUint64Array(b);
      }
      function initMemory() {
        if (Module['wasmMemory']) wasmMemory = Module['wasmMemory'];
        else {
          var INITIAL_MEMORY = Module['INITIAL_MEMORY'] || 16777216;
          wasmMemory = new WebAssembly.Memory({
            initial: INITIAL_MEMORY / 65536,
            maximum: INITIAL_MEMORY / 65536,
          });
        }
        updateMemoryViews();
      }
      function preRun() {
        if (Module['preRun']) {
          if (typeof Module['preRun'] == 'function') {
            Module['preRun'] = [Module['preRun']];
          }
          while (Module['preRun'].length) addOnPreRun(Module['preRun'].shift());
        }
        callRuntimeCallbacks(onPreRuns);
      }
      function initRuntime() {
        runtimeInitialized = true;
        wasmExports['o']();
      }
      function postRun() {
        if (Module['postRun']) {
          if (typeof Module['postRun'] == 'function') {
            Module['postRun'] = [Module['postRun']];
          }
          while (Module['postRun'].length) {
            addOnPostRun(Module['postRun'].shift());
          }
        }
        callRuntimeCallbacks(onPostRuns);
      }
      var runDependencies = 0;
      var dependenciesFulfilled = null;
      function addRunDependency(id) {
        runDependencies++;
        Module['monitorRunDependencies']?.(runDependencies);
      }
      function removeRunDependency(id) {
        runDependencies--;
        Module['monitorRunDependencies']?.(runDependencies);
        if (runDependencies == 0) {
          if (dependenciesFulfilled) {
            var callback = dependenciesFulfilled;
            dependenciesFulfilled = null;
            callback();
          }
        }
      }
      function abort(what) {
        Module['onAbort']?.(what);
        what = 'Aborted(' + what + ')';
        err(what);
        ABORT = true;
        what += '. Build with -sASSERTIONS for more info.';
        var e = new WebAssembly.RuntimeError(what);
        readyPromiseReject(e);
        throw e;
      }
      var wasmBinaryFile;
      function findWasmBinary() {
        if (Module['locateFile']) return locateFile('element.wasm');
        return new URL('element.wasm', import.meta.url).href;
      }
      function getBinarySync(file) {
        if (file == wasmBinaryFile && wasmBinary) {
          return new Uint8Array(wasmBinary);
        }
        if (readBinary) return readBinary(file);
        throw 'both async and sync fetching of the wasm failed';
      }
      async function getWasmBinary(binaryFile) {
        if (!wasmBinary) {
          try {
            var response = await readAsync(binaryFile);
            return new Uint8Array(response);
          } catch {}
        }
        return getBinarySync(binaryFile);
      }
      async function instantiateArrayBuffer(binaryFile, imports) {
        try {
          var binary = await getWasmBinary(binaryFile);
          var instance = await WebAssembly.instantiate(binary, imports);
          return instance;
        } catch (reason) {
          err(`failed to asynchronously prepare wasm: ${reason}`);
          abort(reason);
        }
      }
      async function instantiateAsync(binary, binaryFile, imports) {
        if (
          !binary && typeof WebAssembly.instantiateStreaming == 'function'
          && !isFileURI(binaryFile) && !ENVIRONMENT_IS_NODE
        ) {
          try {
            var response = fetch(binaryFile, { credentials: 'same-origin' });
            var instantiationResult = await WebAssembly.instantiateStreaming(
              response,
              imports,
            );
            return instantiationResult;
          } catch (reason) {
            err(`wasm streaming compile failed: ${reason}`);
            err('falling back to ArrayBuffer instantiation');
          }
        }
        return instantiateArrayBuffer(binaryFile, imports);
      }
      function getWasmImports() {
        return { a: wasmImports };
      }
      async function createWasm() {
        function receiveInstance(instance, module) {
          wasmExports = instance.exports;
          removeRunDependency('wasm-instantiate');
          return wasmExports;
        }
        addRunDependency('wasm-instantiate');
        function receiveInstantiationResult(result) {
          return receiveInstance(result['instance']);
        }
        var info = getWasmImports();
        if (Module['instantiateWasm']) {
          return new Promise((resolve, reject) => {
            Module['instantiateWasm'](info, (mod, inst) => {
              resolve(receiveInstance(mod, inst));
            });
          });
        }
        wasmBinaryFile ??= findWasmBinary();
        try {
          var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info);
          var exports = receiveInstantiationResult(result);
          return exports;
        } catch (e) {
          readyPromiseReject(e);
          return Promise.reject(e);
        }
      }
      class ExitStatus {
        name = 'ExitStatus';
        constructor(status) {
          this.message = `Program terminated with exit(${status})`;
          this.status = status;
        }
      }
      var callRuntimeCallbacks = callbacks => {
        while (callbacks.length > 0) callbacks.shift()(Module);
      };
      var onPostRuns = [];
      var addOnPostRun = cb => onPostRuns.push(cb);
      var onPreRuns = [];
      var addOnPreRun = cb => onPreRuns.push(cb);
      var noExitRuntime = true;
      var stackRestore = val => __emscripten_stack_restore(val);
      var stackSave = () => _emscripten_stack_get_current();
      var UTF8Decoder = typeof TextDecoder != 'undefined'
        ? new TextDecoder()
        : undefined;
      var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead = NaN) => {
        var endIdx = idx + maxBytesToRead;
        var endPtr = idx;
        while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;
        if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
          return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
        }
        var str = '';
        while (idx < endPtr) {
          var u0 = heapOrArray[idx++];
          if (!(u0 & 128)) {
            str += String.fromCharCode(u0);
            continue;
          }
          var u1 = heapOrArray[idx++] & 63;
          if ((u0 & 224) == 192) {
            str += String.fromCharCode((u0 & 31) << 6 | u1);
            continue;
          }
          var u2 = heapOrArray[idx++] & 63;
          if ((u0 & 240) == 224) u0 = (u0 & 15) << 12 | u1 << 6 | u2;
          else {u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6
              | heapOrArray[idx++] & 63;}
          if (u0 < 65536) str += String.fromCharCode(u0);
          else {
            var ch = u0 - 65536;
            str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
          }
        }
        return str;
      };
      var UTF8ToString = (ptr, maxBytesToRead) =>
        ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : '';
      var ___assert_fail = (condition, filename, line, func) =>
        abort(
          `Assertion failed: ${UTF8ToString(condition)}, at: `
            + [
              filename ? UTF8ToString(filename) : 'unknown filename',
              line,
              func ? UTF8ToString(func) : 'unknown function',
            ],
        );
      var __abort_js = () => abort('');
      var embindRepr = v => {
        if (v === null) return 'null';
        var t = typeof v;
        if (t === 'object' || t === 'array' || t === 'function') {
          return v.toString();
        } else return '' + v;
      };
      var embind_init_charCodes = () => {
        var codes = new Array(256);
        for (var i = 0; i < 256; ++i) codes[i] = String.fromCharCode(i);
        embind_charCodes = codes;
      };
      var embind_charCodes;
      var readLatin1String = ptr => {
        var ret = '';
        var c = ptr;
        while (HEAPU8[c]) ret += embind_charCodes[HEAPU8[c++]];
        return ret;
      };
      var awaitingDependencies = {};
      var registeredTypes = {};
      var typeDependencies = {};
      var BindingError = Module['BindingError'] = class BindingError
        extends Error
      {
        constructor(message) {
          super(message);
          this.name = 'BindingError';
        }
      };
      var throwBindingError = message => {
        throw new BindingError(message);
      };
      function sharedRegisterType(rawType, registeredInstance, options = {}) {
        var name = registeredInstance.name;
        if (!rawType) {
          throwBindingError(
            `type "${name}" must have a positive integer typeid pointer`,
          );
        }
        if (registeredTypes.hasOwnProperty(rawType)) {
          if (options.ignoreDuplicateRegistrations) {
            return;
          } else throwBindingError(`Cannot register type '${name}' twice`);
        }
        registeredTypes[rawType] = registeredInstance;
        delete typeDependencies[rawType];
        if (awaitingDependencies.hasOwnProperty(rawType)) {
          var callbacks = awaitingDependencies[rawType];
          delete awaitingDependencies[rawType];
          callbacks.forEach(cb => cb());
        }
      }
      function registerType(rawType, registeredInstance, options = {}) {
        return sharedRegisterType(rawType, registeredInstance, options);
      }
      var integerReadValueFromPointer = (name, width, signed) => {
        switch (width) {
          case 1:
            return signed
              ? pointer => HEAP8[pointer]
              : pointer => HEAPU8[pointer];
          case 2:
            return signed
              ? pointer => HEAP16[pointer >> 1]
              : pointer => HEAPU16[pointer >> 1];
          case 4:
            return signed
              ? pointer => HEAP32[pointer >> 2]
              : pointer => HEAPU32[pointer >> 2];
          case 8:
            return signed
              ? pointer => HEAP64[pointer >> 3]
              : pointer => HEAPU64[pointer >> 3];
          default:
            throw new TypeError(`invalid integer width (${width}): ${name}`);
        }
      };
      var __embind_register_bigint = (
        primitiveType,
        name,
        size,
        minRange,
        maxRange,
      ) => {
        name = readLatin1String(name);
        var isUnsignedType = name.indexOf('u') != -1;
        if (isUnsignedType) maxRange = (1n << 64n) - 1n;
        registerType(primitiveType, {
          name,
          fromWireType: value => value,
          toWireType: function(destructors, value) {
            if (typeof value != 'bigint' && typeof value != 'number') {
              throw new TypeError(
                `Cannot convert "${embindRepr(value)}" to ${this.name}`,
              );
            }
            if (typeof value == 'number') value = BigInt(value);
            return value;
          },
          argPackAdvance: GenericWireTypeSize,
          readValueFromPointer: integerReadValueFromPointer(
            name,
            size,
            !isUnsignedType,
          ),
          destructorFunction: null,
        });
      };
      var GenericWireTypeSize = 8;
      var __embind_register_bool = (rawType, name, trueValue, falseValue) => {
        name = readLatin1String(name);
        registerType(rawType, {
          name,
          fromWireType: function(wt) {
            return !!wt;
          },
          toWireType: function(destructors, o) {
            return o ? trueValue : falseValue;
          },
          argPackAdvance: GenericWireTypeSize,
          readValueFromPointer: function(pointer) {
            return this['fromWireType'](HEAPU8[pointer]);
          },
          destructorFunction: null,
        });
      };
      var emval_freelist = [];
      var emval_handles = [];
      var __emval_decref = handle => {
        if (handle > 9 && 0 === --emval_handles[handle + 1]) {
          emval_handles[handle] = undefined;
          emval_freelist.push(handle);
        }
      };
      var count_emval_handles = () =>
        emval_handles.length / 2 - 5 - emval_freelist.length;
      var init_emval = () => {
        emval_handles.push(0, 1, undefined, 1, null, 1, true, 1, false, 1);
        Module['count_emval_handles'] = count_emval_handles;
      };
      var Emval = {
        toValue: handle => {
          if (!handle) {
            throwBindingError(`Cannot use deleted val. handle = ${handle}`);
          }
          return emval_handles[handle];
        },
        toHandle: value => {
          switch (value) {
            case undefined:
              return 2;
            case null:
              return 4;
            case true:
              return 6;
            case false:
              return 8;
            default: {
              const handle = emval_freelist.pop() || emval_handles.length;
              emval_handles[handle] = value;
              emval_handles[handle + 1] = 1;
              return handle;
            }
          }
        },
      };
      function readPointer(pointer) {
        return this['fromWireType'](HEAPU32[pointer >> 2]);
      }
      var EmValType = {
        name: 'emscripten::val',
        fromWireType: handle => {
          var rv = Emval.toValue(handle);
          __emval_decref(handle);
          return rv;
        },
        toWireType: (destructors, value) => Emval.toHandle(value),
        argPackAdvance: GenericWireTypeSize,
        readValueFromPointer: readPointer,
        destructorFunction: null,
      };
      var __embind_register_emval = rawType => registerType(rawType, EmValType);
      var floatReadValueFromPointer = (name, width) => {
        switch (width) {
          case 4:
            return function(pointer) {
              return this['fromWireType'](HEAPF32[pointer >> 2]);
            };
          case 8:
            return function(pointer) {
              return this['fromWireType'](HEAPF64[pointer >> 3]);
            };
          default:
            throw new TypeError(`invalid float width (${width}): ${name}`);
        }
      };
      var __embind_register_float = (rawType, name, size) => {
        name = readLatin1String(name);
        registerType(rawType, {
          name,
          fromWireType: value => value,
          toWireType: (destructors, value) => value,
          argPackAdvance: GenericWireTypeSize,
          readValueFromPointer: floatReadValueFromPointer(name, size),
          destructorFunction: null,
        });
      };
      var __embind_register_integer = (
        primitiveType,
        name,
        size,
        minRange,
        maxRange,
      ) => {
        name = readLatin1String(name);
        if (maxRange === -1) maxRange = 4294967295;
        var fromWireType = value => value;
        if (minRange === 0) {
          var bitshift = 32 - 8 * size;
          fromWireType = value => value << bitshift >>> bitshift;
        }
        var isUnsignedType = name.includes('unsigned');
        var checkAssertions = (value, toTypeName) => {};
        var toWireType;
        if (isUnsignedType) {
          toWireType = function(destructors, value) {
            checkAssertions(value, this.name);
            return value >>> 0;
          };
        } else {toWireType = function(destructors, value) {
            checkAssertions(value, this.name);
            return value;
          };}
        registerType(primitiveType, {
          name,
          fromWireType,
          toWireType,
          argPackAdvance: GenericWireTypeSize,
          readValueFromPointer: integerReadValueFromPointer(
            name,
            size,
            minRange !== 0,
          ),
          destructorFunction: null,
        });
      };
      var __embind_register_memory_view = (rawType, dataTypeIndex, name) => {
        var typeMapping = [
          Int8Array,
          Uint8Array,
          Int16Array,
          Uint16Array,
          Int32Array,
          Uint32Array,
          Float32Array,
          Float64Array,
          BigInt64Array,
          BigUint64Array,
        ];
        var TA = typeMapping[dataTypeIndex];
        function decodeMemoryView(handle) {
          var size = HEAPU32[handle >> 2];
          var data = HEAPU32[handle + 4 >> 2];
          return new TA(HEAP8.buffer, data, size);
        }
        name = readLatin1String(name);
        registerType(rawType, {
          name,
          fromWireType: decodeMemoryView,
          argPackAdvance: GenericWireTypeSize,
          readValueFromPointer: decodeMemoryView,
        }, { ignoreDuplicateRegistrations: true });
      };
      var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
        if (!(maxBytesToWrite > 0)) return 0;
        var startIdx = outIdx;
        var endIdx = outIdx + maxBytesToWrite - 1;
        for (var i = 0; i < str.length; ++i) {
          var u = str.charCodeAt(i);
          if (u >= 55296 && u <= 57343) {
            var u1 = str.charCodeAt(++i);
            u = 65536 + ((u & 1023) << 10) | u1 & 1023;
          }
          if (u <= 127) {
            if (outIdx >= endIdx) break;
            heap[outIdx++] = u;
          } else if (u <= 2047) {
            if (outIdx + 1 >= endIdx) break;
            heap[outIdx++] = 192 | u >> 6;
            heap[outIdx++] = 128 | u & 63;
          } else if (u <= 65535) {
            if (outIdx + 2 >= endIdx) break;
            heap[outIdx++] = 224 | u >> 12;
            heap[outIdx++] = 128 | u >> 6 & 63;
            heap[outIdx++] = 128 | u & 63;
          } else {
            if (outIdx + 3 >= endIdx) break;
            heap[outIdx++] = 240 | u >> 18;
            heap[outIdx++] = 128 | u >> 12 & 63;
            heap[outIdx++] = 128 | u >> 6 & 63;
            heap[outIdx++] = 128 | u & 63;
          }
        }
        heap[outIdx] = 0;
        return outIdx - startIdx;
      };
      var stringToUTF8 = (str, outPtr, maxBytesToWrite) =>
        stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
      var lengthBytesUTF8 = str => {
        var len = 0;
        for (var i = 0; i < str.length; ++i) {
          var c = str.charCodeAt(i);
          if (c <= 127) len++;
          else if (c <= 2047) len += 2;
          else if (c >= 55296 && c <= 57343) {
            len += 4;
            ++i;
          } else len += 3;
        }
        return len;
      };
      var __embind_register_std_string = (rawType, name) => {
        name = readLatin1String(name);
        var stdStringIsUTF8 = true;
        registerType(rawType, {
          name,
          fromWireType(value) {
            var length = HEAPU32[value >> 2];
            var payload = value + 4;
            var str;
            if (stdStringIsUTF8) {
              var decodeStartPtr = payload;
              for (var i = 0; i <= length; ++i) {
                var currentBytePtr = payload + i;
                if (i == length || HEAPU8[currentBytePtr] == 0) {
                  var maxRead = currentBytePtr - decodeStartPtr;
                  var stringSegment = UTF8ToString(decodeStartPtr, maxRead);
                  if (str === undefined) str = stringSegment;
                  else {
                    str += String.fromCharCode(0);
                    str += stringSegment;
                  }
                  decodeStartPtr = currentBytePtr + 1;
                }
              }
            } else {
              var a = new Array(length);
              for (var i = 0; i < length; ++i) {
                a[i] = String.fromCharCode(HEAPU8[payload + i]);
              }
              str = a.join('');
            }
            _free(value);
            return str;
          },
          toWireType(destructors, value) {
            if (value instanceof ArrayBuffer) value = new Uint8Array(value);
            var length;
            var valueIsOfTypeString = typeof value == 'string';
            if (
              !(valueIsOfTypeString
                || ArrayBuffer.isView(value) && value.BYTES_PER_ELEMENT == 1)
            ) throwBindingError('Cannot pass non-string to std::string');
            if (stdStringIsUTF8 && valueIsOfTypeString) {
              length = lengthBytesUTF8(value);
            } else length = value.length;
            var base = _malloc(4 + length + 1);
            var ptr = base + 4;
            HEAPU32[base >> 2] = length;
            if (valueIsOfTypeString) {
              if (stdStringIsUTF8) stringToUTF8(value, ptr, length + 1);
              else {for (var i = 0; i < length; ++i) {
                  var charCode = value.charCodeAt(i);
                  if (charCode > 255) {
                    _free(base);
                    throwBindingError(
                      'String has UTF-16 code units that do not fit in 8 bits',
                    );
                  }
                  HEAPU8[ptr + i] = charCode;
                }}
            } else HEAPU8.set(value, ptr);
            if (destructors !== null) destructors.push(_free, base);
            return base;
          },
          argPackAdvance: GenericWireTypeSize,
          readValueFromPointer: readPointer,
          destructorFunction(ptr) {
            _free(ptr);
          },
        });
      };
      var UTF16Decoder = typeof TextDecoder != 'undefined'
        ? new TextDecoder('utf-16le')
        : undefined;
      var UTF16ToString = (ptr, maxBytesToRead) => {
        var endPtr = ptr;
        var idx = endPtr >> 1;
        var maxIdx = idx + maxBytesToRead / 2;
        while (!(idx >= maxIdx) && HEAPU16[idx]) ++idx;
        endPtr = idx << 1;
        if (endPtr - ptr > 32 && UTF16Decoder) {
          return UTF16Decoder.decode(HEAPU8.subarray(ptr, endPtr));
        }
        var str = '';
        for (var i = 0; !(i >= maxBytesToRead / 2); ++i) {
          var codeUnit = HEAP16[ptr + i * 2 >> 1];
          if (codeUnit == 0) break;
          str += String.fromCharCode(codeUnit);
        }
        return str;
      };
      var stringToUTF16 = (str, outPtr, maxBytesToWrite) => {
        maxBytesToWrite ??= 2147483647;
        if (maxBytesToWrite < 2) return 0;
        maxBytesToWrite -= 2;
        var startPtr = outPtr;
        var numCharsToWrite = maxBytesToWrite < str.length * 2
          ? maxBytesToWrite / 2
          : str.length;
        for (var i = 0; i < numCharsToWrite; ++i) {
          var codeUnit = str.charCodeAt(i);
          HEAP16[outPtr >> 1] = codeUnit;
          outPtr += 2;
        }
        HEAP16[outPtr >> 1] = 0;
        return outPtr - startPtr;
      };
      var lengthBytesUTF16 = str => str.length * 2;
      var UTF32ToString = (ptr, maxBytesToRead) => {
        var i = 0;
        var str = '';
        while (!(i >= maxBytesToRead / 4)) {
          var utf32 = HEAP32[ptr + i * 4 >> 2];
          if (utf32 == 0) break;
          ++i;
          if (utf32 >= 65536) {
            var ch = utf32 - 65536;
            str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023);
          } else str += String.fromCharCode(utf32);
        }
        return str;
      };
      var stringToUTF32 = (str, outPtr, maxBytesToWrite) => {
        maxBytesToWrite ??= 2147483647;
        if (maxBytesToWrite < 4) return 0;
        var startPtr = outPtr;
        var endPtr = startPtr + maxBytesToWrite - 4;
        for (var i = 0; i < str.length; ++i) {
          var codeUnit = str.charCodeAt(i);
          if (codeUnit >= 55296 && codeUnit <= 57343) {
            var trailSurrogate = str.charCodeAt(++i);
            codeUnit = 65536 + ((codeUnit & 1023) << 10)
              | trailSurrogate & 1023;
          }
          HEAP32[outPtr >> 2] = codeUnit;
          outPtr += 4;
          if (outPtr + 4 > endPtr) break;
        }
        HEAP32[outPtr >> 2] = 0;
        return outPtr - startPtr;
      };
      var lengthBytesUTF32 = str => {
        var len = 0;
        for (var i = 0; i < str.length; ++i) {
          var codeUnit = str.charCodeAt(i);
          if (codeUnit >= 55296 && codeUnit <= 57343) ++i;
          len += 4;
        }
        return len;
      };
      var __embind_register_std_wstring = (rawType, charSize, name) => {
        name = readLatin1String(name);
        var decodeString, encodeString, readCharAt, lengthBytesUTF;
        if (charSize === 2) {
          decodeString = UTF16ToString;
          encodeString = stringToUTF16;
          lengthBytesUTF = lengthBytesUTF16;
          readCharAt = pointer => HEAPU16[pointer >> 1];
        } else if (charSize === 4) {
          decodeString = UTF32ToString;
          encodeString = stringToUTF32;
          lengthBytesUTF = lengthBytesUTF32;
          readCharAt = pointer => HEAPU32[pointer >> 2];
        }
        registerType(rawType, {
          name,
          fromWireType: value => {
            var length = HEAPU32[value >> 2];
            var str;
            var decodeStartPtr = value + 4;
            for (var i = 0; i <= length; ++i) {
              var currentBytePtr = value + 4 + i * charSize;
              if (i == length || readCharAt(currentBytePtr) == 0) {
                var maxReadBytes = currentBytePtr - decodeStartPtr;
                var stringSegment = decodeString(decodeStartPtr, maxReadBytes);
                if (str === undefined) str = stringSegment;
                else {
                  str += String.fromCharCode(0);
                  str += stringSegment;
                }
                decodeStartPtr = currentBytePtr + charSize;
              }
            }
            _free(value);
            return str;
          },
          toWireType: (destructors, value) => {
            if (!(typeof value == 'string')) {
              throwBindingError(
                `Cannot pass non-string to C++ string type ${name}`,
              );
            }
            var length = lengthBytesUTF(value);
            var ptr = _malloc(4 + length + charSize);
            HEAPU32[ptr >> 2] = length / charSize;
            encodeString(value, ptr + 4, length + charSize);
            if (destructors !== null) destructors.push(_free, ptr);
            return ptr;
          },
          argPackAdvance: GenericWireTypeSize,
          readValueFromPointer: readPointer,
          destructorFunction(ptr) {
            _free(ptr);
          },
        });
      };
      var __embind_register_void = (rawType, name) => {
        name = readLatin1String(name);
        registerType(rawType, {
          isVoid: true,
          name,
          argPackAdvance: 0,
          fromWireType: () => undefined,
          toWireType: (destructors, o) => undefined,
        });
      };
      var abortOnCannotGrowMemory = requestedSize => {
        abort('OOM');
      };
      var _emscripten_resize_heap = requestedSize => {
        var oldSize = HEAPU8.length;
        requestedSize >>>= 0;
        abortOnCannotGrowMemory(requestedSize);
      };
      var printCharBuffers = [null, [], []];
      var printChar = (stream, curr) => {
        var buffer = printCharBuffers[stream];
        if (curr === 0 || curr === 10) {
          (stream === 1 ? out : err)(UTF8ArrayToString(buffer));
          buffer.length = 0;
        } else buffer.push(curr);
      };
      var _fd_write = (fd, iov, iovcnt, pnum) => {
        var num = 0;
        for (var i = 0; i < iovcnt; i++) {
          var ptr = HEAPU32[iov >> 2];
          var len = HEAPU32[iov + 4 >> 2];
          iov += 8;
          for (var j = 0; j < len; j++) printChar(fd, HEAPU8[ptr + j]);
          num += len;
        }
        HEAPU32[pnum >> 2] = num;
        return 0;
      };
      var getCFunc = ident => {
        var func = Module['_' + ident];
        return func;
      };
      var writeArrayToMemory = (array, buffer) => {
        HEAP8.set(array, buffer);
      };
      var stackAlloc = sz => __emscripten_stack_alloc(sz);
      var stringToUTF8OnStack = str => {
        var size = lengthBytesUTF8(str) + 1;
        var ret = stackAlloc(size);
        stringToUTF8(str, ret, size);
        return ret;
      };
      var ccall = (ident, returnType, argTypes, args, opts) => {
        var toC = {
          string: str => {
            var ret = 0;
            if (str !== null && str !== undefined && str !== 0) {
              ret = stringToUTF8OnStack(str);
            }
            return ret;
          },
          array: arr => {
            var ret = stackAlloc(arr.length);
            writeArrayToMemory(arr, ret);
            return ret;
          },
        };
        function convertReturnValue(ret) {
          if (returnType === 'string') return UTF8ToString(ret);
          if (returnType === 'boolean') return Boolean(ret);
          return ret;
        }
        var func = getCFunc(ident);
        var cArgs = [];
        var stack = 0;
        if (args) {
          for (var i = 0; i < args.length; i++) {
            var converter = toC[argTypes[i]];
            if (converter) {
              if (stack === 0) stack = stackSave();
              cArgs[i] = converter(args[i]);
            } else cArgs[i] = args[i];
          }
        }
        var ret = func(...cArgs);
        function onDone(ret) {
          if (stack !== 0) stackRestore(stack);
          return convertReturnValue(ret);
        }
        ret = onDone(ret);
        return ret;
      };
      var stringToNewUTF8 = str => {
        var size = lengthBytesUTF8(str) + 1;
        var ret = _malloc(size);
        if (ret) stringToUTF8(str, ret, size);
        return ret;
      };
      embind_init_charCodes();
      init_emval();
      {
        initMemory();
        if (Module['noExitRuntime']) noExitRuntime = Module['noExitRuntime'];
        if (Module['print']) out = Module['print'];
        if (Module['printErr']) err = Module['printErr'];
        if (Module['wasmBinary']) wasmBinary = Module['wasmBinary'];
        if (Module['arguments']) arguments_ = Module['arguments'];
        if (Module['thisProgram']) thisProgram = Module['thisProgram'];
      }
      Module['ccall'] = ccall;
      Module['UTF8ToString'] = UTF8ToString;
      Module['stringToNewUTF8'] = stringToNewUTF8;
      var wasmImports = {
        b: ___assert_fail,
        l: __abort_js,
        g: __embind_register_bigint,
        j: __embind_register_bool,
        n: __embind_register_emval,
        f: __embind_register_float,
        d: __embind_register_integer,
        c: __embind_register_memory_view,
        i: __embind_register_std_string,
        e: __embind_register_std_wstring,
        k: __embind_register_void,
        m: _emscripten_resize_heap,
        h: _fd_write,
        a: wasmMemory,
      };
      var wasmExports = await createWasm();
      var ___wasm_call_ctors = wasmExports['o'];
      var _free = Module['_free'] = wasmExports['q'];
      var _malloc = Module['_malloc'] = wasmExports['r'];
      var _create_element = Module['_create_element'] = wasmExports['s'];
      var _append = Module['_append'] = wasmExports['t'];
      var _replace_with = Module['_replace_with'] = wasmExports['u'];
      var _insert_before = Module['_insert_before'] = wasmExports['v'];
      var _remove_child = Module['_remove_child'] = wasmExports['w'];
      var _get_parent_element = Module['_get_parent_element'] =
        wasmExports['x'];
      var _get_first_element_child = Module['_get_first_element_child'] =
        wasmExports['y'];
      var _get_last_element_child = Module['_get_last_element_child'] =
        wasmExports['z'];
      var _get_next_element_sibling = Module['_get_next_element_sibling'] =
        wasmExports['A'];
      var _set_attribute = Module['_set_attribute'] = wasmExports['B'];
      var _remove_attribute = Module['_remove_attribute'] = wasmExports['C'];
      var _get_inner_HTML = Module['_get_inner_HTML'] = wasmExports['D'];
      var _hello_world = Module['_hello_world'] = wasmExports['E'];
      var __emscripten_stack_restore = wasmExports['F'];
      var __emscripten_stack_alloc = wasmExports['G'];
      var _emscripten_stack_get_current = wasmExports['H'];
      function run() {
        if (runDependencies > 0) {
          dependenciesFulfilled = run;
          return;
        }
        preRun();
        if (runDependencies > 0) {
          dependenciesFulfilled = run;
          return;
        }
        function doRun() {
          Module['calledRun'] = true;
          if (ABORT) return;
          initRuntime();
          readyPromiseResolve(Module);
          Module['onRuntimeInitialized']?.();
          postRun();
        }
        if (Module['setStatus']) {
          Module['setStatus']('Running...');
          setTimeout(() => {
            setTimeout(() => Module['setStatus'](''), 1);
            doRun();
          }, 1);
        } else doRun();
      }
      function preInit() {
        if (Module['preInit']) {
          if (typeof Module['preInit'] == 'function') {
            Module['preInit'] = [Module['preInit']];
          }
          while (Module['preInit'].length > 0) Module['preInit'].shift()();
        }
      }
      preInit();
      run();
      moduleRtn = readyPromise;

      return moduleRtn;
    }
  );
})();
export default Module;
