/**
 * 公共工具函数
 * 提供 Hex 解析、字节数组转换、防抖、剪贴板操作等基础功能
 */
const Utils = {
  /**
   * 解析 Hex 字符串为 Uint8Array
   * 支持格式：01 02 03 / 010203 / 0x01,0x02,0x03 / 01,02,03
   * @param {string} str 输入字符串
   * @returns {Uint8Array|null} 字节数组，解析失败返回 null
   */
  parseHexString: function(str) {
    if (!str || !str.trim()) return null;
    // 清理：移除 0x 前缀，统一分隔符为空格
    var s = str.trim().replace(/0x/gi, '').replace(/[,;|\t\n\r]+/g, ' ').trim();
    // 如果没有空格且长度为偶数，按每两个字符切分
    if (s.indexOf(' ') === -1 && s.length % 2 === 0) {
      var parts = [];
      for (var i = 0; i < s.length; i += 2) {
        parts.push(s.substring(i, i + 2));
      }
      s = parts.join(' ');
    }
    var tokens = s.split(/\s+/).filter(function(t) { return t.length > 0; });
    var bytes = [];
    for (var j = 0; j < tokens.length; j++) {
      var t = tokens[j];
      // 如果token长度>2且为偶数，按两个字符再切分
      if (t.length > 2 && t.length % 2 === 0) {
        for (var k = 0; k < t.length; k += 2) {
          var val = parseInt(t.substring(k, k + 2), 16);
          if (isNaN(val)) return null;
          bytes.push(val);
        }
      } else {
        var val2 = parseInt(t, 16);
        if (isNaN(val2)) return null;
        bytes.push(val2);
      }
    }
    if (bytes.length === 0) return null;
    return new Uint8Array(bytes);
  },

  /**
   * 字节数组转 Hex 字符串
   * @param {Uint8Array} bytes
   * @param {string} sep 分隔符，默认空格
   * @returns {string}
   */
  bytesToHex: function(bytes, sep) {
    if (sep === undefined) sep = ' ';
    var result = [];
    for (var i = 0; i < bytes.length; i++) {
      result.push(('0' + bytes[i].toString(16).toUpperCase()).slice(-2));
    }
    return result.join(sep);
  },

  /**
   * 格式化单个数值为指定宽度的 Hex 字符串
   * @param {number} value 数值
   * @param {number} width 字节数（1=2位，2=4位，4=8位）
   * @returns {string}
   */
  formatHex: function(value, width) {
    var hex = value.toString(16).toUpperCase();
    var padLen = width * 2;
    while (hex.length < padLen) hex = '0' + hex;
    return hex;
  },

  /**
   * 防抖函数
   * @param {Function} fn 目标函数
   * @param {number} delay 延迟毫秒数
   * @returns {Function}
   */
  debounce: function(fn, delay) {
    if (delay === undefined) delay = 300;
    var timer;
    return function() {
      var args = arguments;
      var ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function() { fn.apply(ctx, args); }, delay);
    };
  },

  /**
   * 复制元素文本内容到剪贴板
   * @param {string} elementId 元素ID
   */
  copy: function(elementId) {
    var el = document.getElementById(elementId);
    if (!el) return;
    var text = el.textContent || el.innerText;
    Utils._copyText(text);
  },

  /**
   * 复制 textarea 的值到剪贴板
   * @param {string} elementId textarea元素ID
   */
  copyTextArea: function(elementId) {
    var el = document.getElementById(elementId);
    if (!el) return;
    Utils._copyText(el.value);
  },

  /** 内部复制方法，兼容新旧API */
  _copyText: function(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        Utils._showCopyTip();
      });
    } else {
      // 兼容方案：临时 textarea
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      Utils._showCopyTip();
    }
  },

  /** 显示复制成功提示 */
  _showCopyTip: function() {
    var tip = document.getElementById('copy-tip');
    if (!tip) {
      tip = document.createElement('div');
      tip.id = 'copy-tip';
      tip.textContent = '已复制';
      tip.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);' +
        'background:#10b981;color:#fff;padding:8px 20px;border-radius:6px;font-size:14px;' +
        'z-index:9999;transition:opacity 0.3s;pointer-events:none;';
      document.body.appendChild(tip);
    }
    tip.style.opacity = '1';
    setTimeout(function() { tip.style.opacity = '0'; }, 1200);
  },

  /**
   * 获取指定 name 的 radio 按钮选中值
   * @param {string} name radio name
   * @returns {string}
   */
  getRadioValue: function(name) {
    var radios = document.getElementsByName(name);
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].checked) return radios[i].value;
    }
    return '';
  },

  /**
   * 设置指定 name 的 radio 按钮选中值
   * @param {string} name radio name
   * @param {string} value 目标值
   */
  setRadioValue: function(name, value) {
    var radios = document.getElementsByName(name);
    for (var i = 0; i < radios.length; i++) {
      radios[i].checked = (radios[i].value === value);
    }
  }
};
