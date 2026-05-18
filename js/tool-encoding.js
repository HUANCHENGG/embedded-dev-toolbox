/**
 * 编码转换工具模块
 * 包含：Hex/ASCII/十进制/二进制互转、Base64编解码、UTF-8/Unicode转换
 */
var EncodingTools = (function() {

  // 防抖版本的 Hex 转换函数
  var debouncedHexConvert = Utils.debounce(function(source) {
    _doHexConvert(source);
  }, 200);

  /**
   * Hex/ASCII/Dec/Bin 四框联动核心逻辑
   * @param {string} source 触发源：'hex'/'ascii'/'dec'/'bin'
   */
  function _doHexConvert(source) {
    var hexEl = document.getElementById('hexconv-hex');
    var asciiEl = document.getElementById('hexconv-ascii');
    var decEl = document.getElementById('hexconv-dec');
    var binEl = document.getElementById('hexconv-bin');
    var addSep = document.getElementById('hexconv-sep').checked;
    var sep = addSep ? ' ' : '';

    var bytes = null;

    try {
      if (source === 'hex') {
        bytes = Utils.parseHexString(hexEl.value);
      } else if (source === 'ascii') {
        var str = asciiEl.value;
        if (!str) { _clearExcept(hexEl, asciiEl, decEl, binEl, 'ascii'); return; }
        bytes = new Uint8Array(str.length);
        for (var i = 0; i < str.length; i++) {
          bytes[i] = str.charCodeAt(i) & 0xFF;
        }
      } else if (source === 'dec') {
        var parts = decEl.value.trim().split(/[\s,]+/).filter(function(t){return t;});
        if (parts.length === 0) return;
        bytes = new Uint8Array(parts.length);
        for (var j = 0; j < parts.length; j++) {
          var val = parseInt(parts[j], 10);
          if (isNaN(val) || val < 0 || val > 255) {
            _showDecError(decEl); return;
          }
          bytes[j] = val;
        }
      } else if (source === 'bin') {
        var binParts = binEl.value.trim().split(/[\s,]+/).filter(function(t){return t;});
        if (binParts.length === 0) return;
        bytes = new Uint8Array(binParts.length);
        for (var k = 0; k < binParts.length; k++) {
          var bval = parseInt(binParts[k], 2);
          if (isNaN(bval) || bval < 0 || bval > 255) {
            _showBinError(binEl); return;
          }
          bytes[k] = bval;
        }
      }
    } catch (e) {
      return;
    }

    if (!bytes || bytes.length === 0) return;

    // 填充其他三个框
    if (source !== 'hex')   hexEl.value   = Utils.bytesToHex(bytes, sep);
    if (source !== 'ascii') {
      var ascii = '';
      for (var a = 0; a < bytes.length; a++) {
        ascii += (bytes[a] >= 32 && bytes[a] < 127) ? String.fromCharCode(bytes[a]) : '.';
      }
      asciiEl.value = ascii;
    }
    if (source !== 'dec') {
      var decs = [];
      for (var d = 0; d < bytes.length; d++) decs.push(bytes[d].toString());
      decEl.value = decs.join(sep);
    }
    if (source !== 'bin') {
      var bins = [];
      for (var b = 0; b < bytes.length; b++) {
        bins.push(('00000000' + bytes[b].toString(2)).slice(-8));
      }
      binEl.value = bins.join(sep);
    }
  }

  function _clearExcept(hexEl, asciiEl, decEl, binEl, source) {
    if (source !== 'hex') hexEl.value = '';
    if (source !== 'ascii') asciiEl.value = '';
    if (source !== 'dec') decEl.value = '';
    if (source !== 'bin') binEl.value = '';
  }

  function _showDecError(el) { el.style.borderColor = '#ef4444'; setTimeout(function(){ el.style.borderColor=''; }, 1500); }
  function _showBinError(el) { el.style.borderColor = '#ef4444'; setTimeout(function(){ el.style.borderColor=''; }, 1500); }

  // ==================== Base64 编解码 ====================

  /**
   * 将 Uint8Array 转为 Base64 字符串
   * @param {Uint8Array} bytes
   * @returns {string}
   */
  function bytesToBase64(bytes) {
    var binary = '';
    for (var i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * 将 Base64 字符串解码为 Uint8Array
   * @param {string} b64
   * @returns {Uint8Array}
   */
  function base64ToBytes(b64) {
    var binary = atob(b64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  return {
    /** 输入联动入口（由 HTML oninput 触发） */
    onHexConvInput: function(source) {
      debouncedHexConvert(source);
    },

    clearHexConv: function() {
      document.getElementById('hexconv-hex').value = '';
      document.getElementById('hexconv-ascii').value = '';
      document.getElementById('hexconv-dec').value = '';
      document.getElementById('hexconv-bin').value = '';
    },

    // ==================== Base64 ====================
    base64Encode: function() {
      var input = document.getElementById('b64-input').value;
      var mode = Utils.getRadioValue('b64-mode');
      var urlSafe = document.getElementById('b64-url').checked;
      var output;

      if (!input) {
        document.getElementById('b64-output').value = '';
        return;
      }

      try {
        if (mode === 'hex') {
          var bytes = Utils.parseHexString(input);
          if (!bytes) {
            document.getElementById('b64-output').value = '错误：无效的Hex数据';
            return;
          }
          output = bytesToBase64(bytes);
        } else {
          // 文本模式：先转UTF-8字节再Base64
          var encoder = new TextEncoder();
          var utf8Bytes = encoder.encode(input);
          output = bytesToBase64(utf8Bytes);
        }

        if (urlSafe) {
          output = output.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        }

        document.getElementById('b64-output').value = output;
      } catch (e) {
        document.getElementById('b64-output').value = '错误：' + e.message;
      }
    },

    base64Decode: function() {
      var input = document.getElementById('b64-input').value.trim();
      var urlSafe = document.getElementById('b64-url').checked;
      var mode = Utils.getRadioValue('b64-mode');

      if (!input) {
        document.getElementById('b64-output').value = '';
        return;
      }

      try {
        if (urlSafe) {
          input = input.replace(/-/g, '+').replace(/_/g, '/');
          // 补齐 padding
          while (input.length % 4 !== 0) input += '=';
        }

        var bytes = base64ToBytes(input);

        if (mode === 'hex') {
          document.getElementById('b64-output').value = Utils.bytesToHex(bytes);
        } else {
          var decoder = new TextDecoder('utf-8');
          document.getElementById('b64-output').value = decoder.decode(bytes);
        }
      } catch (e) {
        document.getElementById('b64-output').value = '错误：解码失败，输入可能不是有效的Base64';
      }
    },

    clearBase64: function() {
      document.getElementById('b64-input').value = '';
      document.getElementById('b64-output').value = '';
    },

    // ==================== 进制转换 ====================
    /** 进制转换核心 */
    baseConvert: function() {
      var input = document.getElementById('baseconv-input').value.trim();
      if (!input) {
        _clearBaseConvResults();
        return;
      }

      var fromBase = _getBaseValue('baseconv-from', 'baseconv-from-custom');
      var toBase = _getBaseValue('baseconv-to', 'baseconv-to-custom');

      if (!fromBase || !toBase) {
        document.getElementById('baseconv-result').textContent = '错误：进制必须在 2-36 之间';
        return;
      }

      try {
        // 清理输入：移除前缀和空格
        var cleaned = input.replace(/\s/g, '');
        cleaned = cleaned.replace(/^0[xX]/, ''); // 移除 0x
        cleaned = cleaned.replace(/^0[oO]/, ''); // 移除 0o
        cleaned = cleaned.replace(/^0[bB]/, ''); // 移除 0b

        // 使用 BigInt 支持大数转换
        var decValue = _parseBigInt(cleaned, fromBase);
        if (decValue === null) {
          document.getElementById('baseconv-result').textContent = '错误：输入包含无效字符（对于' + fromBase + '进制）';
          _clearBaseConvResults();
          return;
        }

        var result = _bigIntToBase(decValue, toBase).toUpperCase();
        document.getElementById('baseconv-result').textContent = result;

        // 同时显示所有常用进制
        document.getElementById('bc-bin').textContent = _bigIntToBase(decValue, 2);
        document.getElementById('bc-oct').textContent = _bigIntToBase(decValue, 8);
        document.getElementById('bc-dec').textContent = _bigIntToBase(decValue, 10);
        document.getElementById('bc-hex2').textContent = _bigIntToBase(decValue, 16).toUpperCase();
      } catch (e) {
        document.getElementById('baseconv-result').textContent = '错误：' + e.message;
        _clearBaseConvResults();
      }
    },

    /** 清空进制转换 */
    clearBaseConv: function() {
      document.getElementById('baseconv-input').value = '';
      document.getElementById('baseconv-result').textContent = '-';
      _clearBaseConvResults();
    },

    /** 交换源进制和目标进制 */
    swapBase: function() {
      var fromEl = document.getElementById('baseconv-from');
      var toEl = document.getElementById('baseconv-to');
      var tmp = fromEl.value;
      fromEl.value = toEl.value;
      toEl.value = tmp;

      // 同步自定义值
      var fromCustom = document.getElementById('baseconv-from-custom');
      var toCustom = document.getElementById('baseconv-to-custom');
      var tmpC = fromCustom.value;
      fromCustom.value = toCustom.value;
      toCustom.value = tmpC;

      _updateCustomRowVisibility();
      EncodingTools.baseConvert();
    },

    /** 进制选择变化时的处理 */
    onBaseSelectChange: function() {
      _updateCustomRowVisibility();
    },

    // ==================== UTF-8 / Unicode ====================
    convertUTF8: function() {
      var input = document.getElementById('utf8-input').value;
      var mode = Utils.getRadioValue('utf8-mode');

      if (!input) {
        _clearUTF8Results();
        return;
      }

      try {
        var codePoints = []; // Unicode码点数组

        if (mode === 'text') {
          // 文本 -> 码点
          for (var ch of input) {
            codePoints.push(ch.codePointAt(0));
          }
        } else if (mode === 'unicode') {
          // \uXXXX \uXXXXXXXX 格式
          var matches = input.match(/\\u([0-9a-fA-F]{4,8})/g);
          if (!matches) { _showUTF8Error('未找到 \\uXXXX 格式'); return; }
          for (var m = 0; m < matches.length; m++) {
            codePoints.push(parseInt(matches[m].substring(2), 16));
          }
        } else if (mode === 'codepoint') {
          // U+XXXX 格式
          var matches2 = input.match(/U\+([0-9a-fA-F]{4,6})/gi);
          if (!matches2) { _showUTF8Error('未找到 U+XXXX 格式'); return; }
          for (var n = 0; n < matches2.length; n++) {
            codePoints.push(parseInt(matches2[n].substring(2), 16));
          }
        } else if (mode === 'hex') {
          // Hex字节序列 -> 解码为文本 -> 码点
          var bytes = Utils.parseHexString(input);
          if (!bytes) { _showUTF8Error('无效的Hex数据'); return; }
          var decoder = new TextDecoder('utf-8');
          var decoded = decoder.decode(bytes);
          for (var ch2 of decoded) {
            codePoints.push(ch2.codePointAt(0));
          }
        }

        // 渲染结果
        _renderUTF8Results(codePoints);

      } catch (e) {
        _showUTF8Error('转换失败：' + e.message);
      }
    },

    clearUTF8: function() {
      document.getElementById('utf8-input').value = '';
      _clearUTF8Results();
    }
  };

  /** 渲染 UTF-8 转换结果 */
  function _renderUTF8Results(codePoints) {
    var hexParts = [];
    var cpParts = [];
    var decParts = [];
    var htmlParts = [];
    var textParts = [];

    for (var i = 0; i < codePoints.length; i++) {
      var cp = codePoints[i];
      // 计算 UTF-8 字节序列
      var encoder = new TextEncoder();
      var ch = String.fromCodePoint(cp);
      var utf8Bytes = encoder.encode(ch);
      hexParts.push(Utils.bytesToHex(utf8Bytes));

      var hexStr = cp.toString(16).toUpperCase();
      // 补零宽度：至少4位，超过0xFFFF时取实际位数
      var padLen = hexStr.length > 4 ? hexStr.length : 4;
      cpParts.push('U+' + ('0000' + hexStr).slice(-padLen));
      decParts.push(cp.toString());
      htmlParts.push('&#' + cp + ';');
      textParts.push(ch);
    }

    document.getElementById('utf8-hex').textContent = hexParts.join(' ');
    document.getElementById('utf8-codepoint').textContent = cpParts.join(' ');
    document.getElementById('utf8-decimal').textContent = decParts.join(' ');
    document.getElementById('utf8-html').textContent = htmlParts.join('');
    document.getElementById('utf8-text').textContent = textParts.join('');
  }

  function _clearUTF8Results() {
    document.getElementById('utf8-hex').textContent = '-';
    document.getElementById('utf8-codepoint').textContent = '-';
    document.getElementById('utf8-decimal').textContent = '-';
    document.getElementById('utf8-html').textContent = '-';
    document.getElementById('utf8-text').textContent = '-';
  }

  function _showUTF8Error(msg) {
    document.getElementById('utf8-hex').textContent = '错误：' + msg;
    document.getElementById('utf8-codepoint').textContent = '-';
    document.getElementById('utf8-decimal').textContent = '-';
    document.getElementById('utf8-html').textContent = '-';
    document.getElementById('utf8-text').textContent = '-';
  }

  // ==================== 进制转换内部辅助函数 ====================

  /** 获取进制值（处理自定义进制） */
  function _getBaseValue(selectId, customId) {
    var el = document.getElementById(selectId);
    if (el.value === 'custom') {
      var val = parseInt(document.getElementById(customId).value, 10);
      if (isNaN(val) || val < 2 || val > 36) return null;
      return val;
    }
    return parseInt(el.value, 10);
  }

  /** 显示/隐藏自定义进制输入行 */
  function _updateCustomRowVisibility() {
    var fromEl = document.getElementById('baseconv-from');
    var toEl = document.getElementById('baseconv-to');
    var row = document.getElementById('baseconv-custom-row');
    if (fromEl.value === 'custom' || toEl.value === 'custom') {
      row.style.display = '';
    } else {
      row.style.display = 'none';
    }
  }

  /**
   * 将字符串按指定进制解析为 BigInt
   * @param {string} str 输入字符串
   * @param {number} base 进制 (2-36)
   * @returns {BigInt|null}
   */
  function _parseBigInt(str, base) {
    if (!str) return null;
    var chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    var result = 0n;
    var bigBase = BigInt(base);
    var negative = false;

    if (str[0] === '-') {
      negative = true;
      str = str.substring(1);
    }

    for (var i = 0; i < str.length; i++) {
      var ch = str[i].toLowerCase();
      var digit = chars.indexOf(ch);
      if (digit === -1 || digit >= base) return null;
      result = result * bigBase + BigInt(digit);
    }

    return negative ? -result : result;
  }

  /**
   * 将 BigInt 转为指定进制字符串
   * @param {BigInt} value
   * @param {number} base 进制 (2-36)
   * @returns {string}
   */
  function _bigIntToBase(value, base) {
    if (value === 0n) return '0';
    var chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    var bigBase = BigInt(base);
    var negative = value < 0n;
    if (negative) value = -value;

    var result = '';
    while (value > 0n) {
      result = chars[Number(value % bigBase)] + result;
      value = value / bigBase;
    }

    return negative ? '-' + result : result;
  }

  /** 清空进制转换所有进制对照结果 */
  function _clearBaseConvResults() {
    document.getElementById('bc-bin').textContent = '-';
    document.getElementById('bc-oct').textContent = '-';
    document.getElementById('bc-dec').textContent = '-';
    document.getElementById('bc-hex2').textContent = '-';
  }

  // 绑定进制选择器变化事件
  document.addEventListener('DOMContentLoaded', function() {
    var fromEl = document.getElementById('baseconv-from');
    var toEl = document.getElementById('baseconv-to');
    if (fromEl) fromEl.addEventListener('change', _updateCustomRowVisibility);
    if (toEl) toEl.addEventListener('change', _updateCustomRowVisibility);
  });
})();
