/**
 * 字符串处理工具模块
 * 包含：字符数统计、字节数统计、字符串长度计算
 * 所有工具均为实时统计（输入即出结果，使用防抖）
 */
var StringTools = (function() {

  // CJK 统一汉字 + 扩展A + 兼容汉字
  var RE_CHINESE = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;
  var RE_ENGLISH = /[a-zA-Z]/;
  var RE_DIGIT   = /[0-9]/;
  var RE_PUNCT   = /[!-/:-@\[-`{-~\u2000-\u206f\u2e00-\u2e7f\u3000-\u303f\uff00-\uffef]/;
  var RE_SPACE   = /\s/;

  /** 判断字符属于哪个类别 */
  function charCategory(ch) {
    if (RE_CHINESE.test(ch)) return 'cn';
    if (RE_ENGLISH.test(ch)) return 'en';
    if (RE_DIGIT.test(ch)) return 'digit';
    if (RE_SPACE.test(ch)) return 'space';
    if (RE_PUNCT.test(ch)) return 'punct';
    return 'other';
  }

  /** 计算显示宽度：全角=2，半角=1 */
  function displayWidth(ch) {
    var code = ch.codePointAt(0);
    // CJK汉字、全角标点、全角字符
    if (code > 0x7F) return 2;
    return 1;
  }

  return {
    // ==================== 字符数统计 ====================
    countChars: Utils.debounce(function() {
      var input = document.getElementById('charcount-input').value;
      var stats = { total: 0, cn: 0, en: 0, digit: 0, punct: 0, space: 0, other: 0 };

      for (var ch of input) {
        stats.total++;
        var cat = charCategory(ch);
        stats[cat]++;
      }

      document.getElementById('cc-total').textContent = stats.total;
      document.getElementById('cc-cn').textContent = stats.cn;
      document.getElementById('cc-en').textContent = stats.en;
      document.getElementById('cc-digit').textContent = stats.digit;
      document.getElementById('cc-punct').textContent = stats.punct;
      document.getElementById('cc-space').textContent = stats.space;
      document.getElementById('cc-other').textContent = stats.other;
    }, 200),

    // ==================== 字节数统计 ====================
    countBytes: Utils.debounce(function() {
      var input = document.getElementById('bytecount-input').value;
      var encoder = new TextEncoder();
      var utf8Bytes = encoder.encode(input);
      var asciiBytes = input.length; // ASCII下每个字符1字节（非ASCII字符可能超过）

      document.getElementById('bc-utf8').textContent = utf8Bytes.length;
      document.getElementById('bc-ascii').textContent = asciiBytes;

      // 逐字符分析表格（最多100字符）
      var tbody = document.querySelector('#bc-table tbody');
      tbody.innerHTML = '';
      var limit = Math.min(input.length, 100);

      var i = 0;
      var count = 0;
      while (i < input.length && count < limit) {
        var ch = input[i];
        var cp = ch.codePointAt(0);
        var chBytes = encoder.encode(ch);

        var tr = document.createElement('tr');
        // 显示字符（特殊字符用转义）
        var display = ch;
        if (cp < 32) display = '\\x' + ('0' + cp.toString(16)).slice(-2);
        else if (cp === 32) display = '(空格)';

        tr.innerHTML =
          '<td>' + _escapeHTML(display) + '</td>' +
          '<td>U+' + ('0000' + cp.toString(16).toUpperCase()).slice(-4) + '</td>' +
          '<td>' + chBytes.length + ' 字节</td>' +
          '<td>' + Utils.bytesToHex(chBytes) + '</td>';
        tbody.appendChild(tr);

        // 处理 surrogate pair（emoji等占两个UTF-16码元的字符）
        i += (cp > 0xFFFF) ? 2 : 1;
        count++;
      }
    }, 200),

    // ==================== 字符串长度计算 ====================
    calcLength: Utils.debounce(function() {
      var input = document.getElementById('strlen-input').value;
      var encoder = new TextEncoder();

      // 字符长度（正确处理 surrogate pair）
      var charLen = 0;
      for (var ch of input) { charLen++; }

      var byteLen = encoder.encode(input).length;
      var width = 0;
      for (var ch2 of input) { width += displayWidth(ch2); }

      document.getElementById('sl-char').textContent = charLen;
      document.getElementById('sl-byte').textContent = byteLen;
      document.getElementById('sl-width').textContent = width;
    }, 200),

    // ==================== 大小写转换 ====================
    caseConvert: function(mode) {
      var input = document.getElementById('caseconv-input').value;
      if (!input) {
        document.getElementById('caseconv-output').value = '';
        return;
      }

      var result = '';
      switch (mode) {
        case 'upper':
          result = input.toUpperCase();
          break;
        case 'lower':
          result = input.toLowerCase();
          break;
        case 'capitalize':
          // 每个单词首字母大写
          result = input.replace(/\b[a-z]/g, function(c) { return c.toUpperCase(); });
          break;
        case 'uncapitalize':
          // 每个单词首字母小写
          result = input.replace(/\b[A-Z]/g, function(c) { return c.toLowerCase(); });
          break;
        case 'sentence':
          // 句子首字母大写：在 .!?: 后的第一个字母大写
          result = input.toLowerCase().replace(/(^|[.!?:]\s*)([a-z])/g, function(m, p1, p2) {
            return p1 + p2.toUpperCase();
          });
          break;
        case 'title':
          // 标题大小写 (APA Style)
          var minorWords = ['a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor',
            'on', 'at', 'to', 'by', 'in', 'of', 'up', 'as', 'so', 'yet', 'off',
            'if', 'per', 'via', 'out'];
          var words = input.toLowerCase().split(/(\s+)/);
          for (var i = 0; i < words.length; i++) {
            var w = words[i];
            if (/^\s+$/.test(w)) continue; // 保留空白
            // 第一个和最后一个实际单词始终大写
            var isFirst = true, isLast = true;
            for (var j = 0; j < i; j++) { if (!/^\s+$/.test(words[j])) { isFirst = false; break; } }
            for (var k = i + 1; k < words.length; k++) { if (!/^\s+$/.test(words[k])) { isLast = false; break; } }
            if (isFirst || isLast || minorWords.indexOf(w) === -1) {
              words[i] = w.charAt(0).toUpperCase() + w.slice(1);
            }
          }
          result = words.join('');
          break;
        // 格式转换
        case 'space2underscore':
          result = input.replace(/ /g, '_');
          break;
        case 'space2hyphen':
          result = input.replace(/ /g, '-');
          break;
        case 'underscore2camel':
          // 下划线和空格转驼峰
          result = input.replace(/[_\s]+([a-zA-Z])/g, function(m, c) { return c.toUpperCase(); });
          break;
        case 'camel2underscore':
          result = input.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
          break;
        case 'camel2space':
          result = input.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
          break;
        case 'underscore2hyphen':
          result = input.replace(/_/g, '-');
          break;
        case 'hyphen2underscore':
          result = input.replace(/-/g, '_');
          break;
        case 'underscore2space':
          result = input.replace(/_/g, ' ');
          break;
        case 'underscore2dot':
          result = input.replace(/_/g, '.');
          break;
        case 'dot2underscore':
          result = input.replace(/\./g, '_');
          break;
        case 'space2newline':
          result = input.replace(/ /g, '\n');
          break;
        case 'newline2space':
          result = input.replace(/[\r\n]+/g, ' ');
          break;
        case 'clearSymbols':
          result = input.replace(/[^a-zA-Z0-9\u4e00-\u9fff\s]/g, '');
          break;
        case 'clearSpaces':
          result = input.replace(/ /g, '');
          break;
        case 'clearNewlines':
          result = input.replace(/[\r\n]+/g, '');
          break;
        default:
          result = input;
      }

      document.getElementById('caseconv-output').value = result;
    },

    clearCaseConv: function() {
      document.getElementById('caseconv-input').value = '';
      document.getElementById('caseconv-output').value = '';
    }
  };

  /** HTML 转义 */
  function _escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();
