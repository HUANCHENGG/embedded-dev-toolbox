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
    }, 200)
  };

  /** HTML 转义 */
  function _escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
})();
