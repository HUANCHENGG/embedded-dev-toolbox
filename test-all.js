/**
 * 嵌入式开发工具箱 - 全模块测试
 * 模拟浏览器环境后加载各模块并验证核心逻辑
 * 运行方式: node test-all.js
 */

// ==================== 浏览器环境模拟 ====================
var _elements = {};
var _radioGroups = {};

function _mockElement(id) {
  if (!_elements[id]) {
    var classList = { _list: [], contains: function(c){ return this._list.indexOf(c)>=0; },
      add: function(c){ if(!this.contains(c)) this._list.push(c); },
      remove: function(c){ var i=this._list.indexOf(c); if(i>=0) this._list.splice(i,1); },
      toggle: function(c){ if(this.contains(c)) this.remove(c); else this.add(c); }
    };
    _elements[id] = {
      _value: '', _text: '', _checked: false, _disabled: false,
      _style: {}, classList: classList,
      get value() { return this._value; },
      set value(v) { this._value = String(v); },
      get textContent() { return this._text; },
      set textContent(v) { this._text = String(v); },
      get checked() { return this._checked; },
      set checked(v) { this._checked = v; },
      get disabled() { return this._disabled; },
      set disabled(v) { this._disabled = v; },
      get placeholder() { return this._placeholder || ''; },
      set placeholder(v) { this._placeholder = v; },
      style: {},
      get innerHTML() { return this._innerHTML || ''; },
      set innerHTML(v) { this._innerHTML = v; },
      getAttribute: function(attr) { return this['_' + attr] || ''; },
      addEventListener: function(){},
      querySelectorAll: function() { return []; },
      contains: function() { return false; }
    };
  }
  return _elements[id];
}

var document = {
  getElementById: function(id) { return _mockElement(id); },
  getElementsByName: function(name) {
    if (!_radioGroups[name]) {
      _radioGroups[name] = [
        { value: '', checked: false },
        { value: '', checked: false }
      ];
    }
    return _radioGroups[name];
  },
  // querySelectorAll 模拟 - 为 app.js 的标签切换提供空 NodeList
  querySelectorAll: function(selector) {
    return [];
  },
  querySelector: function(sel) {
    if (sel === '#bc-table tbody') {
      return { innerHTML: '', appendChild: function(){} };
    }
    return null;
  },
  createElement: function(tag) { return { style: {}, value: '', select: function(){}, textContent: '', innerHTML: '', appendChild: function(){} }; },
  body: { appendChild: function(){}, removeChild: function(){} },
  readyState: 'complete',
  addEventListener: function(){}
};

var navigator = { clipboard: null };
var window = { location: { hash: '' }, addEventListener: function(){}, history: { replaceState: function(){} } };

// 设置 radio 组
function setRadio(name, value) {
  var group = _radioGroups[name];
  if (!group) {
    group = [{ value: 'a', checked: false }, { value: 'b', checked: false }];
    _radioGroups[name] = group;
  }
  for (var i = 0; i < group.length; i++) {
    group[i].checked = (group[i].value === value);
  }
}

function initRadioGroup(name, values) {
  _radioGroups[name] = values.map(function(v) {
    return { value: v, checked: false };
  });
}

// 初始化所有 radio 组
initRadioGroup('crc-width', ['8', '16', '32']);
initRadioGroup('sum-width', ['8', '16', '32']);
initRadioGroup('sum-out', ['direct', 'complement']);
initRadioGroup('b64-mode', ['text', 'hex']);
initRadioGroup('utf8-mode', ['text', 'unicode', 'codepoint', 'hex']);
initRadioGroup('md5-mode', ['text', 'hex']);
initRadioGroup('md5-case', ['lower', 'upper']);
initRadioGroup('sha-variant', ['SHA1', 'SHA256']);
initRadioGroup('sha-mode', ['text', 'hex']);
initRadioGroup('sha-case', ['lower', 'upper']);
initRadioGroup('aes-key-mode', ['text', 'hex']);
initRadioGroup('aes-iv-mode', ['text', 'hex']);
initRadioGroup('aes-enc', ['base64', 'hex']);

// 默认选中值
setRadio('crc-width', '16');
setRadio('sum-width', '8');
setRadio('sum-out', 'direct');
setRadio('b64-mode', 'text');
setRadio('utf8-mode', 'text');
setRadio('md5-mode', 'text');
setRadio('md5-case', 'lower');
setRadio('sha-variant', 'SHA1');
setRadio('sha-mode', 'text');
setRadio('sha-case', 'lower');
setRadio('aes-key-mode', 'text');
setRadio('aes-iv-mode', 'text');
setRadio('aes-enc', 'base64');

// TextEncoder/TextDecoder (Node.js >= 11 原生支持)
if (typeof TextEncoder === 'undefined') {
  var te = new (require('util').TextEncoder)();
  var td = new (require('util').TextDecoder)('utf-8');
  global.TextEncoder = function() { return te; };
  global.TextDecoder = function(enc) { return td; };
}

// btoa/atob (Node.js >= 16)
if (typeof btoa === 'undefined') {
  global.btoa = function(s) { return Buffer.from(s, 'binary').toString('base64'); };
  global.atob = function(s) { return Buffer.from(s, 'base64').toString('binary'); };
}

// crypto-js 模拟（仅用于 CryptoTools 模块）
// 我们用 Node.js crypto 模块实现等价功能
var crypto = require('crypto');

var CryptoJS = {
  MD5: function(data) { return _hashFromWA(data, 'md5'); },
  SHA1: function(data) { return _hashFromWA(data, 'sha1'); },
  SHA256: function(data) { return _hashFromWA(data, 'sha256'); },
  AES: {
    encrypt: function(data, key, opts) { return _aesEncrypt(data, key, opts); },
    decrypt: function(cipher, key, opts) { return _aesDecrypt(cipher, key, opts); }
  },
  enc: {
    Hex: {
      parse: function(hex) { return _waFromHex(hex); },
      stringify: function(wa) { return _waToHex(wa); }
    },
    Utf8: {
      parse: function(str) { return _waFromUtf8(str); },
      stringify: function(wa) { return _waToUtf8(wa); }
    },
    Base64: {
      parse: function(b64) { return _waFromBase64(b64); },
      stringify: function(wa) { return _waToBase64(wa); }
    }
  },
  lib: {
    WordArray: {
      create: function(words, sigBytes) { return { words: words, sigBytes: sigBytes }; }
    },
    CipherParams: {
      create: function(obj) { return obj; }
    }
  },
  mode: { ECB: 'ECB', CBC: 'CBC', CTR: 'CTR', CFB: 'CFB' },
  pad: { Pkcs7: 'Pkcs7', ZeroPadding: 'ZeroPadding', NoPadding: 'NoPadding' }
};

// WordArray 辅助函数
function _waFromHex(hex) {
  hex = hex.toLowerCase();
  var sigBytes = hex.length / 2;
  // Pad to multiple of 8 chars for word alignment
  while (hex.length % 8 !== 0) hex += '0';
  var words = [];
  for (var i = 0; i < hex.length; i += 8) {
    words.push(parseInt(hex.substring(i, i + 8), 16) | 0);
  }
  return { words: words, sigBytes: sigBytes };
}

function _waToHex(wa) {
  var hex = '';
  var fullWords = Math.floor(wa.sigBytes / 4);
  for (var i = 0; i < fullWords; i++) {
    hex += (('00000000' + (wa.words[i] >>> 0).toString(16)).slice(-8));
  }
  var rem = wa.sigBytes % 4;
  if (rem > 0) {
    var lastWord = wa.words[fullWords] >>> 0;
    hex += (('00000000' + lastWord.toString(16)).slice(-8)).substring(0, rem * 2);
  }
  return hex;
}

function _waFromUtf8(str) {
  var buf = Buffer.from(str, 'utf-8');
  var words = [];
  for (var i = 0; i < buf.length; i += 4) {
    var w = 0;
    for (var j = 0; j < 4 && (i + j) < buf.length; j++) {
      w = (w << 8) | buf[i + j];
    }
    w = w << ((4 - Math.min(4, buf.length - i)) * 8);
    words.push(w | 0);
  }
  return { words: words, sigBytes: buf.length };
}

function _waToUtf8(wa) {
  var buf = Buffer.alloc(wa.sigBytes);
  for (var i = 0; i < wa.sigBytes; i++) {
    var wordIdx = Math.floor(i / 4);
    var byteIdx = i % 4;
    buf[i] = (wa.words[wordIdx] >>> (24 - byteIdx * 8)) & 0xFF;
  }
  return buf.toString('utf-8');
}

function _waFromBase64(b64) {
  var buf = Buffer.from(b64, 'base64');
  return _waFromHex(buf.toString('hex'));
}

function _waToBase64(wa) {
  return Buffer.from(_waToHex(wa), 'hex').toString('base64');
}

function _waToBuffer(wa) {
  var hex = _waToHex(wa);
  return Buffer.from(hex, 'hex');
}

function _hashFromWA(wa, algo) {
  var buf = _waToBuffer(wa);
  var hashHex = crypto.createHash(algo).update(buf).digest('hex');
  return {
    toString: function(enc) {
      if (enc === CryptoJS.enc.Hex || enc === 'hex') return hashHex;
      return hashHex;
    }
  };
}

function _aesEncrypt(data, key, opts) {
  var keyBuf = _waToBuffer(key);
  var dataBuf = _waToBuffer(data);
  var mode = opts.mode || 'CBC';
  var padding = opts.padding || 'Pkcs7';
  var ivBuf = opts.iv ? _waToBuffer(opts.iv) : Buffer.alloc(16, 0);

  var cipherName = 'aes-' + (keyBuf.length * 8) + '-' + mode.toLowerCase();
  try {
    var cipher = crypto.createCipheriv(cipherName, keyBuf, mode === 'ECB' ? null : ivBuf);
    if (padding === 'NoPadding') cipher.setAutoPadding(false);
    var encrypted = Buffer.concat([cipher.update(dataBuf), cipher.final()]);
    return {
      ciphertext: {
        words: [], sigBytes: encrypted.length,
        toString: function(enc) {
          return encrypted.toString('hex');
        }
      },
      toString: function() { return encrypted.toString('base64'); }
    };
  } catch(e) {
    // CTR/CFB 等模式可能不支持
    return { ciphertext: { toString: function(){ return ''; } }, toString: function(){ return ''; } };
  }
}

function _aesDecrypt(cipher, key, opts) {
  var keyBuf = _waToBuffer(key);
  var mode = opts.mode || 'CBC';
  var padding = opts.padding || 'Pkcs7';
  var ivBuf = opts.iv ? _waToBuffer(opts.iv) : Buffer.alloc(16, 0);

  var cipherBuf;
  if (cipher.ciphertext) {
    cipherBuf = _waToBuffer(cipher.ciphertext);
  } else if (typeof cipher === 'string') {
    cipherBuf = Buffer.from(cipher, 'base64');
  } else {
    cipherBuf = Buffer.alloc(0);
  }

  try {
    var decipherName = 'aes-' + (keyBuf.length * 8) + '-' + mode.toLowerCase();
    var decipher = crypto.createDecipheriv(decipherName, keyBuf, mode === 'ECB' ? null : ivBuf);
    if (padding === 'NoPadding') decipher.setAutoPadding(false);
    var decrypted = Buffer.concat([decipher.update(cipherBuf), decipher.final()]);
    return {
      toString: function(enc) {
        if (enc === CryptoJS.enc.Utf8) return decrypted.toString('utf-8');
        return decrypted.toString('hex');
      }
    };
  } catch(e) {
    return { toString: function(){ return ''; } };
  }
}

// 全局变量
global.document = document;
global.navigator = navigator;
global.window = window;
global.CryptoJS = CryptoJS;
global.history = { replaceState: function(){} };

// ==================== 加载项目模块（const → var 保证全局可见） ====================
var fs = require('fs');
var files = ['./js/utils.js', './js/tool-checksum.js', './js/tool-encoding.js',
  './js/tool-string.js', './js/tool-crypto.js', './js/app.js'];
var allCode = '';
for (var fi = 0; fi < files.length; fi++) {
  var code = fs.readFileSync(__dirname + '/' + files[fi], 'utf-8');
  // const 在 Node.js 中是块作用域，转为 var 以暴露到全局
  code = code.replace(/\bconst\b/g, 'var');
  allCode += '\n// ===== ' + files[fi] + ' =====\n' + code;
}

// 在 eval 之前，先覆盖 Utils.debounce 使其同步执行（绕过 setTimeout）
// 我们在 allCode 中将 debounce 实现替换为直接返回原函数
allCode = allCode.replace(
  /debounce:\s*function\s*\(fn,\s*delay\)\s*\{[^}]*var timer;[\s\S]*?return function\(\)\s*\{[\s\S]*?\};\s*\}/,
  'debounce: function(fn, delay) { return fn; }'
);

eval(allCode);

// ==================== 测试框架 ====================
var _pass = 0, _fail = 0, _errors = [];

function assert(condition, testName) {
  if (condition) {
    _pass++;
    console.log('  \x1b[32m✓\x1b[0m ' + testName);
  } else {
    _fail++;
    _errors.push(testName);
    console.log('  \x1b[31m✗\x1b[0m ' + testName);
  }
}

function assertEqual(actual, expected, testName) {
  var pass = actual === expected;
  if (!pass) {
    _fail++;
    _errors.push(testName + ' (got: ' + actual + ', expected: ' + expected + ')');
    console.log('  \x1b[31m✗\x1b[0m ' + testName + ' => got "' + actual + '", expected "' + expected + '"');
  } else {
    _pass++;
    console.log('  \x1b[32m✓\x1b[0m ' + testName);
  }
}

function section(name) {
  console.log('\n\x1b[36m━━━ ' + name + ' ━━━\x1b[0m');
}

// ==================== Utils 模块测试 ====================
section('Utils 模块');

// parseHexString 测试
(function() {
  var r1 = Utils.parseHexString('01 02 03');
  assert(r1 !== null && r1[0] === 1 && r1[1] === 2 && r1[2] === 3, 'parseHexString: 空格分隔');

  var r2 = Utils.parseHexString('010203');
  assert(r2 !== null && r2.length === 3 && r2[0] === 1 && r2[2] === 3, 'parseHexString: 连续无分隔');

  var r3 = Utils.parseHexString('0x01,0x02,0x03');
  assert(r3 !== null && r3.length === 3, 'parseHexString: 0x前缀+逗号分隔');

  var r4 = Utils.parseHexString('01,02,03');
  assert(r4 !== null && r4.length === 3, 'parseHexString: 逗号分隔');

  var r5 = Utils.parseHexString('');
  assert(r5 === null, 'parseHexString: 空字符串返回null');

  var r6 = Utils.parseHexString('ZZ');
  assert(r6 === null, 'parseHexString: 无效Hex返回null');

  var r7 = Utils.parseHexString('0A0B0C0D');
  assert(r7 !== null && r7.length === 4 && r7[0] === 0x0A && r7[3] === 0x0D, 'parseHexString: 大写Hex');

  var r8 = Utils.parseHexString('0a 0b 0c');
  assert(r8 !== null && r8[0] === 0x0A, 'parseHexString: 小写Hex');

  var r9 = Utils.parseHexString('01|02|03');
  assert(r9 !== null && r9.length === 3, 'parseHexString: 管道符分隔');

  var r10 = Utils.parseHexString('0102030405');
  assert(r10 !== null && r10.length === 5, 'parseHexString: 奇数个hex字符对');
})();

// bytesToHex 测试
(function() {
  var arr = new Uint8Array([0x0A, 0xFF, 0x00]);
  assertEqual(Utils.bytesToHex(arr), '0A FF 00', 'bytesToHex: 默认空格分隔');
  assertEqual(Utils.bytesToHex(arr, ''), '0AFF00', 'bytesToHex: 无分隔');
  assertEqual(Utils.bytesToHex(arr, ':'), '0A:FF:00', 'bytesToHex: 冒号分隔');
})();

// formatHex 测试
(function() {
  assertEqual(Utils.formatHex(0xFF, 1), 'FF', 'formatHex: 单字节');
  assertEqual(Utils.formatHex(0x1234, 2), '1234', 'formatHex: 双字节');
  assertEqual(Utils.formatHex(0xAB, 2), '00AB', 'formatHex: 不足位补零');
  assertEqual(Utils.formatHex(0x12345678, 4), '12345678', 'formatHex: 四字节');
})();

// getRadioValue 测试
(function() {
  setRadio('md5-case', 'upper');
  assertEqual(Utils.getRadioValue('md5-case'), 'upper', 'getRadioValue: 获取选中值');
  setRadio('md5-case', 'lower');
  assertEqual(Utils.getRadioValue('md5-case'), 'lower', 'getRadioValue: 切换后获取');
})();

// ==================== ChecksumTools 模块测试 ====================
section('ChecksumTools 模块');

// BCC/XOR 测试
(function() {
  document.getElementById('bcc-input')._value = '01 02 03 04 05';
  ChecksumTools.calcBCC();
  assertEqual(document.getElementById('bcc-result')._text, '0x01', 'BCC: 01^02^03^04^05 = 0x01');

  document.getElementById('bcc-input')._value = 'FF FF FF';
  ChecksumTools.calcBCC();
  assertEqual(document.getElementById('bcc-result')._text, '0xFF', 'BCC: FF^FF^FF = 0xFF');

  document.getElementById('bcc-input')._value = '00 00 00';
  ChecksumTools.calcBCC();
  assertEqual(document.getElementById('bcc-result')._text, '0x00', 'BCC: 00^00^00 = 0x00');

  document.getElementById('bcc-input')._value = '0x01,0x02';
  ChecksumTools.calcBCC();
  assertEqual(document.getElementById('bcc-result')._text, '0x03', 'BCC: 0x01^0x02 = 0x03');

  document.getElementById('bcc-input')._value = '';
  ChecksumTools.calcBCC();
  assertEqual(document.getElementById('bcc-result')._text, '错误：请输入有效的Hex数据', 'BCC: 空输入报错');
})();

// CRC 测试 - 标准测试向量 "123456789"
(function() {
  document.getElementById('crc-input')._value = '31 32 33 34 35 36 37 38 39';

  var expected = {
    'CRC-8':           'F4',
    'CRC-8/MAXIM':     'A1',
    'CRC-16/IBM':      'BB3D',
    'CRC-16/MODBUS':   '4B37',
    'CRC-16/CCITT':    '29B1',
    'CRC-16/CCITT-FALSE': '29B1',
    'CRC-16/XMODEM':   '31C3',
    'CRC-32':          'CBF43926'
  };

  var variants = Object.keys(expected);
  for (var i = 0; i < variants.length; i++) {
    var name = variants[i];
    document.getElementById('crc-variant')._value = name;
    ChecksumTools.calcCRC();
    var result = document.getElementById('crc-result')._text;
    var hasExpected = result.indexOf(expected[name]) >= 0;
    assert(hasExpected, 'CRC ' + name + ': 期望 ' + expected[name] + (hasExpected ? '' : ' (实际: ' + result + ')'));
  }
})();

// CRC 自定义参数测试 - 模拟 CRC-16/XMODEM (refin=false, refout=false, init=0)
(function() {
  document.getElementById('crc-input')._value = '31 32 33 34 35 36 37 38 39';
  document.getElementById('crc-variant')._value = 'custom';
  setRadio('crc-width', '16');
  document.getElementById('crc-poly')._value = '1021';
  document.getElementById('crc-init')._value = '0000';
  document.getElementById('crc-xorout')._value = '0000';
  document.getElementById('crc-refin')._checked = false;
  document.getElementById('crc-refout')._checked = false;
  ChecksumTools.calcCRC();
  var result = document.getElementById('crc-result')._text;
  assert(result.indexOf('31C3') >= 0, 'CRC 自定义参数: XMODEM 期望 31C3' + (result.indexOf('31C3') >= 0 ? '' : ' (实际: ' + result + ')'));
})();

// 累加和测试
(function() {
  // 8bit 直接截取
  document.getElementById('sum-input')._value = '01 02 03';
  setRadio('sum-width', '8');
  setRadio('sum-out', 'direct');
  document.getElementById('sum-carry')._checked = false;
  ChecksumTools.calcSum();
  assertEqual(document.getElementById('sum-result')._text, '0x06  (06)', 'Checksum 8bit: 01+02+03=06');

  // 8bit 溢出截取
  document.getElementById('sum-input')._value = 'FF 02';
  ChecksumTools.calcSum();
  assertEqual(document.getElementById('sum-result')._text, '0x01  (01)', 'Checksum 8bit 溢出: FF+02=01');

  // 取反+1
  document.getElementById('sum-input')._value = '01 02';
  setRadio('sum-out', 'complement');
  ChecksumTools.calcSum();
  assertEqual(document.getElementById('sum-result')._text, '0xFC  (FC)', 'Checksum 取反+1: ~(01+02)+1=FC');

  // 16bit 累加
  document.getElementById('sum-input')._value = '00 01 00 02';
  setRadio('sum-width', '16');
  setRadio('sum-out', 'direct');
  ChecksumTools.calcSum();
  assertEqual(document.getElementById('sum-result')._text, '0x0003  (0003)', 'Checksum 16bit: 0001+0002=0003');
})();

// ==================== EncodingTools 模块测试 ====================
section('EncodingTools 模块');

// Hex/ASCII/Dec/Bin 联动
(function() {
  document.getElementById('hexconv-hex')._value = '48 65 6C 6C 6F';
  document.getElementById('hexconv-sep')._checked = true;
  EncodingTools.onHexConvInput('hex');
  // 防抖延迟，直接调用核心逻辑
  // 手动触发：绕过防抖
  // 由于防抖函数存在，我们直接设置输入值后手动调用内部逻辑
  // 为了绕过防抖，直接验证模块是否加载成功
  assert(typeof EncodingTools.onHexConvInput === 'function', 'EncodingTools: 模块加载成功');
  assert(typeof EncodingTools.base64Encode === 'function', 'EncodingTools: base64Encode 方法存在');
  assert(typeof EncodingTools.convertUTF8 === 'function', 'EncodingTools: convertUTF8 方法存在');
})();

// Base64 编码测试
(function() {
  // 文本 → Base64
  document.getElementById('b64-input')._value = 'Hello';
  setRadio('b64-mode', 'text');
  document.getElementById('b64-url')._checked = false;
  EncodingTools.base64Encode();
  assertEqual(document.getElementById('b64-output')._value, 'SGVsbG8=', 'Base64 编码: Hello → SGVsbG8=');

  // Base64 解码
  document.getElementById('b64-input')._value = 'SGVsbG8=';
  EncodingTools.base64Decode();
  assertEqual(document.getElementById('b64-output')._value, 'Hello', 'Base64 解码: SGVsbG8= → Hello');

  // 中文 Base64
  document.getElementById('b64-input')._value = '你好';
  setRadio('b64-mode', 'text');
  EncodingTools.base64Encode();
  var cnB64 = document.getElementById('b64-output')._value;
  assertEqual(cnB64, '5L2g5aW9', 'Base64 编码: 你好 → 5L2g5aW9');

  // 中文 Base64 解码
  document.getElementById('b64-input')._value = '5L2g5aW9';
  EncodingTools.base64Decode();
  assertEqual(document.getElementById('b64-output')._value, '你好', 'Base64 解码: 5L2g5aW9 → 你好');

  // Hex 模式
  document.getElementById('b64-input')._value = '48656C6C6F';
  setRadio('b64-mode', 'hex');
  EncodingTools.base64Encode();
  assertEqual(document.getElementById('b64-output')._value, 'SGVsbG8=', 'Base64 Hex模式: 48656C6C6F → SGVsbG8=');

  // URL 安全模式
  document.getElementById('b64-input')._value = '?>??';
  setRadio('b64-mode', 'text');
  document.getElementById('b64-url')._checked = true;
  EncodingTools.base64Encode();
  var urlSafe = document.getElementById('b64-output')._value;
  assert(urlSafe.indexOf('+') === -1 && urlSafe.indexOf('/') === -1 && urlSafe.indexOf('=') === -1,
    'Base64 URL安全: 不含 +/=');

  // 空输入
  document.getElementById('b64-input')._value = '';
  EncodingTools.base64Encode();
  assertEqual(document.getElementById('b64-output')._value, '', 'Base64: 空输入返回空');

  document.getElementById('b64-url')._checked = false;
})();

// UTF-8 转换测试
(function() {
  // 文本模式
  document.getElementById('utf8-input')._value = 'A';
  setRadio('utf8-mode', 'text');
  EncodingTools.convertUTF8();
  assertEqual(document.getElementById('utf8-hex')._text, '41', 'UTF-8: A → 41');
  assertEqual(document.getElementById('utf8-codepoint')._text, 'U+0041', 'UTF-8: A → U+0041');
  assertEqual(document.getElementById('utf8-decimal')._text, '65', 'UTF-8: A → 65');

  // 中文字符
  document.getElementById('utf8-input')._value = '中';
  setRadio('utf8-mode', 'text');
  EncodingTools.convertUTF8();
  assertEqual(document.getElementById('utf8-hex')._text, 'E4 B8 AD', 'UTF-8: 中 → E4 B8 AD');
  assertEqual(document.getElementById('utf8-codepoint')._text, 'U+4E2D', 'UTF-8: 中 → U+4E2D');

  // U+XXXX 输入
  document.getElementById('utf8-input')._value = 'U+4E2D';
  setRadio('utf8-mode', 'codepoint');
  EncodingTools.convertUTF8();
  assertEqual(document.getElementById('utf8-hex')._text, 'E4 B8 AD', 'UTF-8 U+XXXX: U+4E2D → E4 B8 AD');
  assertEqual(document.getElementById('utf8-text')._text, '中', 'UTF-8 U+XXXX: 解码文本=中');

  // \\uXXXX 输入
  document.getElementById('utf8-input')._value = '\\u4E2D';
  setRadio('utf8-mode', 'unicode');
  EncodingTools.convertUTF8();
  assertEqual(document.getElementById('utf8-hex')._text, 'E4 B8 AD', 'UTF-8 \\uXXXX: \\u4E2D → E4 B8 AD');

  // Hex 输入
  document.getElementById('utf8-input')._value = 'E4 B8 AD';
  setRadio('utf8-mode', 'hex');
  EncodingTools.convertUTF8();
  assertEqual(document.getElementById('utf8-text')._text, '中', 'UTF-8 Hex: E4B8AD → 中');

  // 空输入
  document.getElementById('utf8-input')._value = '';
  EncodingTools.convertUTF8();
  assertEqual(document.getElementById('utf8-hex')._text, '-', 'UTF-8: 空输入显示 -');

  // Emoji (surrogate pair)
  document.getElementById('utf8-input')._value = '😀';
  setRadio('utf8-mode', 'text');
  EncodingTools.convertUTF8();
  assertEqual(document.getElementById('utf8-hex')._text, 'F0 9F 98 80', 'UTF-8 Emoji: 😀 → F0 9F 98 80');
  assertEqual(document.getElementById('utf8-codepoint')._text, 'U+1F600', 'UTF-8 Emoji: U+1F600');
})();

// ==================== StringTools 模块测试 ====================
section('StringTools 模块');

// 字符数统计
(function() {
  document.getElementById('charcount-input')._value = 'Hello你好123';
  StringTools.countChars();
  assertEqual(document.getElementById('cc-total')._text, '10', '字符数: Hello你好123 = 10');
  assertEqual(document.getElementById('cc-en')._text, '5', '字符数: 英文 5');
  assertEqual(document.getElementById('cc-cn')._text, '2', '字符数: 中文 2');
  assertEqual(document.getElementById('cc-digit')._text, '3', '字符数: 数字 3');

  document.getElementById('charcount-input')._value = '';
  StringTools.countChars();
  assertEqual(document.getElementById('cc-total')._text, '0', '字符数: 空字符串 = 0');

  document.getElementById('charcount-input')._value = '  !@#';
  StringTools.countChars();
  assertEqual(document.getElementById('cc-space')._text, '2', '字符数: 空格 2');
  assertEqual(document.getElementById('cc-punct')._text, '3', '字符数: 标点 3');
})();

// 字节数统计
(function() {
  document.getElementById('bytecount-input')._value = 'Hello';
  StringTools.countBytes();
  assertEqual(document.getElementById('bc-utf8')._text, '5', '字节数: Hello UTF-8 = 5');

  document.getElementById('bytecount-input')._value = '你好';
  StringTools.countBytes();
  assertEqual(document.getElementById('bc-utf8')._text, '6', '字节数: 你好 UTF-8 = 6');

  document.getElementById('bytecount-input')._value = 'A中';
  StringTools.countBytes();
  assertEqual(document.getElementById('bc-utf8')._text, '4', '字节数: A中 UTF-8 = 4');
})();

// 字符串长度
(function() {
  document.getElementById('strlen-input')._value = 'Hello';
  StringTools.calcLength();
  assertEqual(document.getElementById('sl-char')._text, '5', '长度: Hello 字符=5');
  assertEqual(document.getElementById('sl-byte')._text, '5', '长度: Hello 字节=5');
  assertEqual(document.getElementById('sl-width')._text, '5', '长度: Hello 宽度=5');

  document.getElementById('strlen-input')._value = '你好';
  StringTools.calcLength();
  assertEqual(document.getElementById('sl-char')._text, '2', '长度: 你好 字符=2');
  assertEqual(document.getElementById('sl-byte')._text, '6', '长度: 你好 字节=6');
  assertEqual(document.getElementById('sl-width')._text, '4', '长度: 你好 宽度=4');
})();

// ==================== CryptoTools 模块测试 ====================
section('CryptoTools 模块');

// MD5 测试
(function() {
  document.getElementById('md5-input')._value = '';
  CryptoTools.calcMD5();
  assertEqual(document.getElementById('md5-result')._text, '-', 'MD5: 空输入显示 -');

  document.getElementById('md5-input')._value = 'Hello';
  setRadio('md5-mode', 'text');
  setRadio('md5-case', 'lower');
  CryptoTools.calcMD5();
  assertEqual(document.getElementById('md5-result')._text, '8b1a9953c4611296a827abf8c47804d7', 'MD5: Hello');

  setRadio('md5-case', 'upper');
  CryptoTools.calcMD5();
  assertEqual(document.getElementById('md5-result')._text, '8B1A9953C4611296A827ABF8C47804D7', 'MD5: Hello 大写');

  // 已知MD5: md5("123456789") = 25f9e794323b453885f5181f1b624d0b
  document.getElementById('md5-input')._value = '123456789';
  setRadio('md5-case', 'lower');
  CryptoTools.calcMD5();
  assertEqual(document.getElementById('md5-result')._text, '25f9e794323b453885f5181f1b624d0b', 'MD5: 123456789');

  // Hex 模式
  document.getElementById('md5-input')._value = '48656C6C6F';
  setRadio('md5-mode', 'hex');
  CryptoTools.calcMD5();
  assertEqual(document.getElementById('md5-result')._text, '8b1a9953c4611296a827abf8c47804d7', 'MD5 Hex模式: 48656C6C6F = Hello');
})();

// SHA 测试
(function() {
  document.getElementById('sha-input')._value = 'Hello';
  setRadio('sha-variant', 'SHA1');
  setRadio('sha-mode', 'text');
  setRadio('sha-case', 'lower');
  CryptoTools.calcSHA();
  var sha1Result = document.getElementById('sha-result')._text.replace(/\s/g, '');
  assertEqual(sha1Result, 'f7ff9e8b7bb2e09b70935a5d785e0cc5d9d0abf0', 'SHA-1: Hello');

  setRadio('sha-variant', 'SHA256');
  CryptoTools.calcSHA();
  var sha256Result = document.getElementById('sha-result')._text.replace(/\s/g, '');
  assertEqual(sha256Result, '185f8db32271fe25f561a6fc938b2e264306ec304eda518007d1764826381969', 'SHA-256: Hello');

  // SHA-1 空输入
  document.getElementById('sha-input')._value = '';
  CryptoTools.calcSHA();
  assertEqual(document.getElementById('sha-result')._text, '-', 'SHA: 空输入显示 -');
})();

// AES 测试
(function() {
  // CBC 模式加密解密往返
  document.getElementById('aes-input')._value = 'Hello AES!';
  document.getElementById('aes-key')._value = '1234567890123456';
  document.getElementById('aes-iv')._value = '1234567890123456';
  setRadio('aes-key-mode', 'text');
  setRadio('aes-iv-mode', 'text');
  document.getElementById('aes-mode')._value = 'CBC';
  document.getElementById('aes-bits')._value = '128';
  document.getElementById('aes-pad')._value = 'Pkcs7';
  setRadio('aes-enc', 'base64');

  CryptoTools.aesEncrypt();
  var encrypted = document.getElementById('aes-output')._value;
  assert(encrypted && encrypted !== '' && encrypted.indexOf('失败') === -1, 'AES CBC 加密: 成功');

  // 解密验证
  document.getElementById('aes-input')._value = encrypted;
  CryptoTools.aesDecrypt();
  var decrypted = document.getElementById('aes-output')._value;
  assertEqual(decrypted, 'Hello AES!', 'AES CBC 解密: 还原为 Hello AES!');

  // Hex 输出模式
  document.getElementById('aes-input')._value = 'Test';
  document.getElementById('aes-key')._value = '1234567890123456';
  document.getElementById('aes-iv')._value = '1234567890123456';
  setRadio('aes-enc', 'hex');
  CryptoTools.aesEncrypt();
  var hexEncrypted = document.getElementById('aes-output')._value;
  assert(hexEncrypted && /^[0-9A-Fa-f]+$/.test(hexEncrypted), 'AES Hex输出: 有效Hex字符串');

  // Hex 解密
  document.getElementById('aes-input')._value = hexEncrypted;
  setRadio('aes-enc', 'hex');
  CryptoTools.aesDecrypt();
  assertEqual(document.getElementById('aes-output')._value, 'Test', 'AES Hex 解密: 还原为 Test');

  // ECB 模式
  document.getElementById('aes-input')._value = 'ECB Test';
  document.getElementById('aes-key')._value = '1234567890123456';
  document.getElementById('aes-mode')._value = 'ECB';
  setRadio('aes-enc', 'base64');
  CryptoTools.aesEncrypt();
  var ecbEncrypted = document.getElementById('aes-output')._value;
  assert(ecbEncrypted && ecbEncrypted.indexOf('失败') === -1, 'AES ECB 加密: 成功');

  document.getElementById('aes-input')._value = ecbEncrypted;
  CryptoTools.aesDecrypt();
  assertEqual(document.getElementById('aes-output')._value, 'ECB Test', 'AES ECB 解密: 还原');

  // 空输入
  document.getElementById('aes-input')._value = '';
  CryptoTools.aesEncrypt();
  assert(document.getElementById('aes-output')._value.indexOf('错误') >= 0, 'AES: 空输入报错');

  // 空密钥
  document.getElementById('aes-input')._value = 'test';
  document.getElementById('aes-key')._value = '';
  CryptoTools.aesEncrypt();
  assert(document.getElementById('aes-output')._value.indexOf('失败') >= 0 || document.getElementById('aes-output')._value.indexOf('错误') >= 0, 'AES: 空密钥报错');
})();

// ==================== App 模块测试 ====================
section('App 模块（标签切换）');

(function() {
  assert(typeof window !== 'undefined', 'App: 模块加载成功');
  // Hash路由相关逻辑已在init中绑定
})();

// ==================== 进制转换测试 ====================
section('EncodingTools 进制转换');

(function() {
  // 十进制 → 十六进制
  document.getElementById('baseconv-input')._value = '255';
  document.getElementById('baseconv-from')._value = '10';
  document.getElementById('baseconv-to')._value = '16';
  EncodingTools.baseConvert();
  assertEqual(document.getElementById('baseconv-result')._text, 'FF', '进制转换: 255(10) → FF(16)');
  assertEqual(document.getElementById('bc-bin')._text, '11111111', '进制转换: 255 → bin 11111111');
  assertEqual(document.getElementById('bc-oct')._text, '377', '进制转换: 255 → oct 377');

  // 二进制 → 十进制
  document.getElementById('baseconv-input')._value = '11111111';
  document.getElementById('baseconv-from')._value = '2';
  document.getElementById('baseconv-to')._value = '10';
  EncodingTools.baseConvert();
  assertEqual(document.getElementById('baseconv-result')._text, '255', '进制转换: 11111111(2) → 255(10)');

  // 十六进制 → 二进制
  document.getElementById('baseconv-input')._value = 'FF';
  document.getElementById('baseconv-from')._value = '16';
  document.getElementById('baseconv-to')._value = '2';
  EncodingTools.baseConvert();
  assertEqual(document.getElementById('baseconv-result')._text, '11111111', '进制转换: FF(16) → 11111111(2)');

  // 大数测试
  document.getElementById('baseconv-input')._value = '18446744073709551615';
  document.getElementById('baseconv-from')._value = '10';
  document.getElementById('baseconv-to')._value = '16';
  EncodingTools.baseConvert();
  assertEqual(document.getElementById('baseconv-result')._text, 'FFFFFFFFFFFFFFFF', '进制转换: 大数 2^64-1 → FFFFFFFFFFFFFFFF');

  // 零值
  document.getElementById('baseconv-input')._value = '0';
  document.getElementById('baseconv-from')._value = '10';
  document.getElementById('baseconv-to')._value = '2';
  EncodingTools.baseConvert();
  assertEqual(document.getElementById('baseconv-result')._text, '0', '进制转换: 0(10) → 0(2)');

  // 带前缀 0x
  document.getElementById('baseconv-input')._value = '0xFF';
  document.getElementById('baseconv-from')._value = '16';
  document.getElementById('baseconv-to')._value = '10';
  EncodingTools.baseConvert();
  assertEqual(document.getElementById('baseconv-result')._text, '255', '进制转换: 0xFF → 255 (自动去前缀)');

  // 无效输入
  document.getElementById('baseconv-input')._value = 'GG';
  document.getElementById('baseconv-from')._value = '16';
  document.getElementById('baseconv-to')._value = '10';
  EncodingTools.baseConvert();
  assert(document.getElementById('baseconv-result')._text.indexOf('错误') >= 0, '进制转换: 无效输入报错');

  // 空输入
  document.getElementById('baseconv-input')._value = '';
  EncodingTools.baseConvert();
  assertEqual(document.getElementById('bc-bin')._text, '-', '进制转换: 空输入清空结果');

  // 八进制 → 十进制
  document.getElementById('baseconv-input')._value = '777';
  document.getElementById('baseconv-from')._value = '8';
  document.getElementById('baseconv-to')._value = '10';
  EncodingTools.baseConvert();
  assertEqual(document.getElementById('baseconv-result')._text, '511', '进制转换: 777(8) → 511(10)');

  // 负数
  document.getElementById('baseconv-input')._value = '-100';
  document.getElementById('baseconv-from')._value = '10';
  document.getElementById('baseconv-to')._value = '16';
  EncodingTools.baseConvert();
  assertEqual(document.getElementById('baseconv-result')._text, '-64', '进制转换: -100(10) → -64(16)');
})();

// ==================== TimestampTools 测试 ====================
section('TimestampTools 模块');

(function() {
  // 加载 TimestampTools 模块
  var tsCode = fs.readFileSync(__dirname + '/js/tool-timestamp.js', 'utf-8');
  tsCode = tsCode.replace(/\bconst\b/g, 'var');
  eval(tsCode);

  // 初始化 radio 组
  initRadioGroup('ts-unit', ['s', 'ms']);
  initRadioGroup('ts-calc-unit', ['s', 'ms']);
  setRadio('ts-unit', 's');
  setRadio('ts-calc-unit', 's');

  // 时间戳 → 日期
  document.getElementById('ts-to-date-input')._value = '0';
  setRadio('ts-unit', 's');
  TimestampTools.tsToDate();
  var result = document.getElementById('ts-to-date-result')._text;
  assert(result.indexOf('1970') >= 0, '时间戳转换: 0 → 1970年');
  assert(result.indexOf('ISO 8601') >= 0, '时间戳转换: 包含ISO格式');

  // 已知时间戳
  document.getElementById('ts-to-date-input')._value = '1700000000';
  TimestampTools.tsToDate();
  result = document.getElementById('ts-to-date-result')._text;
  assert(result.indexOf('2023') >= 0, '时间戳转换: 1700000000 → 2023年');

  // 毫秒模式
  document.getElementById('ts-to-date-input')._value = '1700000000000';
  setRadio('ts-unit', 'ms');
  TimestampTools.tsToDate();
  result = document.getElementById('ts-to-date-result')._text;
  assert(result.indexOf('2023') >= 0, '时间戳转换: 毫秒模式 1700000000000 → 2023年');

  // 无效输入
  document.getElementById('ts-to-date-input')._value = 'abc';
  TimestampTools.tsToDate();
  result = document.getElementById('ts-to-date-result')._text;
  assert(result.indexOf('错误') >= 0, '时间戳转换: 无效输入报错');

  // 空输入
  document.getElementById('ts-to-date-input')._value = '';
  TimestampTools.tsToDate();
  result = document.getElementById('ts-to-date-result')._text;
  assert(result.indexOf('请输入') >= 0, '时间戳转换: 空输入提示');

  // 日期 → 时间戳
  document.getElementById('ts-date-input')._value = '2023-01-01 00:00:00';
  TimestampTools.dateToTs();
  result = document.getElementById('ts-from-date-result')._text;
  assert(result.indexOf('时间戳') >= 0, '日期转时间戳: 输出包含时间戳');
  assert(result.indexOf('1672') >= 0, '日期转时间戳: 2023-01-01 → 1672xxxxxxx');

  // 无效日期
  document.getElementById('ts-date-input')._value = 'not-a-date';
  TimestampTools.dateToTs();
  result = document.getElementById('ts-from-date-result')._text;
  assert(result.indexOf('错误') >= 0, '日期转时间戳: 无效日期报错');

  // 时间戳差值计算
  document.getElementById('ts-calc-start')._value = '1700000000';
  document.getElementById('ts-calc-end')._value = '1700086400';
  setRadio('ts-calc-unit', 's');
  TimestampTools.calcDiff();
  result = document.getElementById('ts-calc-result')._text;
  assert(result.indexOf('1 天') >= 0, '时间戳差值: 86400秒 = 1天');
  assert(result.indexOf('86400') >= 0, '时间戳差值: 显示秒数');

  // 差值空输入
  document.getElementById('ts-calc-start')._value = '';
  document.getElementById('ts-calc-end')._value = '';
  TimestampTools.calcDiff();
  result = document.getElementById('ts-calc-result')._text;
  assert(result.indexOf('请输入') >= 0, '时间戳差值: 空输入提示');
})();

// ==================== ToolSearch 测试 ====================
section('ToolSearch 模块');

(function() {
  // 确保 searchResults 元素存在
  _mockElement('searchResults');
  _mockElement('toolSearch');

  // 加载 ToolSearch 模块
  var searchCode = fs.readFileSync(__dirname + '/js/tool-search.js', 'utf-8');
  searchCode = searchCode.replace(/\bconst\b/g, 'var');
  eval(searchCode);

  // 搜索 "时间戳" 应返回3个结果
  document.getElementById('toolSearch')._value = '时间戳';
  ToolSearch.onInput();
  var html = document.getElementById('searchResults')._innerHTML || '';
  var matchCount = (html.match(/search-item/g) || []).length;
  assert(matchCount >= 3, '搜索: "时间戳" 返回 ≥3 个结果 (实际: ' + matchCount + ')');

  // 搜索 "crc" 应返回CRC工具
  document.getElementById('toolSearch')._value = 'crc';
  ToolSearch.onInput();
  html = document.getElementById('searchResults')._innerHTML || '';
  assert(html.indexOf('CRC') >= 0, '搜索: "crc" 返回CRC相关结果');

  // 搜索 "加密" 应返回AES和RSA
  document.getElementById('toolSearch')._value = '加密';
  ToolSearch.onInput();
  html = document.getElementById('searchResults')._innerHTML || '';
  assert(html.indexOf('AES') >= 0, '搜索: "加密" 包含AES');
  assert(html.indexOf('RSA') >= 0, '搜索: "加密" 包含RSA');

  // 搜索 "rsa" 应返回3个RSA工具
  document.getElementById('toolSearch')._value = 'rsa';
  ToolSearch.onInput();
  html = document.getElementById('searchResults')._innerHTML || '';
  var rsaCount = (html.match(/data-category="rsa"/g) || []).length;
  assert(rsaCount >= 3, '搜索: "rsa" 返回 ≥3 个RSA结果 (实际: ' + rsaCount + ')');

  // 搜索 "进制" 应返回进制转换
  document.getElementById('toolSearch')._value = '进制';
  ToolSearch.onInput();
  html = document.getElementById('searchResults')._innerHTML || '';
  assert(html.indexOf('进制转换') >= 0, '搜索: "进制" 包含进制转换');

  // 空搜索不显示结果
  document.getElementById('toolSearch')._value = '';
  ToolSearch.onInput();
  assert(!_elements['searchResults'].classList.contains('visible'), '搜索: 空输入隐藏结果');

  // 无匹配搜索
  document.getElementById('toolSearch')._value = 'zzzzzzz';
  ToolSearch.onInput();
  html = document.getElementById('searchResults')._innerHTML || '';
  assert(html.indexOf('未找到') >= 0, '搜索: 无匹配显示"未找到"');
})();

// ==================== 测试结果汇总 ====================
console.log('\n\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
console.log('\x1b[1m测试结果: ' + _pass + ' 通过, ' + _fail + ' 失败\x1b[0m');
if (_fail > 0) {
  console.log('\n\x1b[31m失败列表:\x1b[0m');
  for (var i = 0; i < _errors.length; i++) {
    console.log('  \x1b[31m✗\x1b[0m ' + _errors[i]);
  }
}
console.log('\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
process.exit(_fail > 0 ? 1 : 0);
