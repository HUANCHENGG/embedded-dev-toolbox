/**
 * 工具搜索模块
 * 提供全局工具搜索功能，支持关键词匹配和点击跳转
 */
var ToolSearch = (function() {

  // 工具索引：每个工具的名称、关键词、所属分类和工具ID
  var TOOL_INDEX = [
    // 数据校验
    { name: 'BCC/XOR 异或校验', keywords: ['bcc', 'xor', '异或', '校验', '数据校验'], category: 'checksum', tool: 'bcc' },
    { name: 'CRC 循环冗余校验', keywords: ['crc', '循环冗余', '校验', 'modbus', 'ccitt', 'crc16', 'crc32', 'crc8', '数据校验'], category: 'checksum', tool: 'crc' },
    { name: '累加和 Checksum', keywords: ['累加和', 'checksum', '校验和', 'sum', '数据校验', 'tcp', 'udp'], category: 'checksum', tool: 'sum' },

    // 编码转换
    { name: 'Hex/ASCII/Dec/Bin 互转', keywords: ['hex', 'ascii', '十进制', '二进制', '十六进制', '编码', '转换', '互转'], category: 'encoding', tool: 'hexconv' },
    { name: '进制转换', keywords: ['进制', '二进制', '八进制', '十进制', '十六进制', 'binary', 'octal', 'decimal', 'hexadecimal', '转换', 'base'], category: 'encoding', tool: 'baseconv' },
    { name: 'Base64 编码/解码', keywords: ['base64', '编码', '解码', 'encode', 'decode', 'url'], category: 'encoding', tool: 'base64' },
    { name: 'UTF-8/Unicode 转换', keywords: ['utf8', 'utf-8', 'unicode', '编码', '码点', 'codepoint', 'html实体', '转换'], category: 'encoding', tool: 'utf8' },

    // 字符串处理
    { name: '字符数统计', keywords: ['字符', '统计', '计数', '中文', '英文', '数字', '标点', '字符串'], category: 'string', tool: 'charcount' },
    { name: '字节数统计', keywords: ['字节', '统计', 'byte', 'utf8', 'ascii', '字符串'], category: 'string', tool: 'bytecount' },
    { name: '字符串长度', keywords: ['长度', 'length', '字符串', '宽度', '显示宽度'], category: 'string', tool: 'strlen' },

    // 哈希/加密
    { name: 'MD5 消息摘要', keywords: ['md5', '哈希', 'hash', '摘要', '加密', '散列'], category: 'crypto', tool: 'md5' },
    { name: 'SHA 安全散列', keywords: ['sha', 'sha1', 'sha256', 'sha-1', 'sha-256', '哈希', 'hash', '散列', '加密'], category: 'crypto', tool: 'sha' },
    { name: 'AES 对称加密/解密', keywords: ['aes', '加密', '解密', 'encrypt', 'decrypt', 'cbc', 'ecb', '对称加密', '密钥'], category: 'crypto', tool: 'aes' },

    // 时间戳
    { name: '当前时间戳', keywords: ['时间戳', 'timestamp', 'unix', '当前时间', '实时', 'epoch'], category: 'timestamp', tool: 'ts-current' },
    { name: '时间戳转换', keywords: ['时间戳', 'timestamp', 'unix', '日期', '转换', '互转', 'date', '时间'], category: 'timestamp', tool: 'ts-convert' },
    { name: '时间戳计算', keywords: ['时间戳', 'timestamp', '差值', '计算', '时间差', '间隔'], category: 'timestamp', tool: 'ts-calc' },

    // RSA
    { name: 'RSA 密钥对生成', keywords: ['rsa', '密钥', '公钥', '私钥', '生成', 'key', 'keypair', '非对称', 'pkcs'], category: 'rsa', tool: 'rsa-keygen' },
    { name: 'RSA 加密/解密', keywords: ['rsa', '加密', '解密', '公钥加密', '私钥解密', 'encrypt', 'decrypt', '非对称', 'oaep'], category: 'rsa', tool: 'rsa-encrypt' },
    { name: 'RSA 签名/验签', keywords: ['rsa', '签名', '验签', 'sign', 'verify', '数字签名', '非对称', 'pss', 'pkcs1'], category: 'rsa', tool: 'rsa-sign' }
  ];

  // 分类名称映射
  var CATEGORY_NAMES = {
    'checksum': '数据校验',
    'encoding': '编码转换',
    'string': '字符串处理',
    'crypto': '哈希/加密',
    'timestamp': '时间戳',
    'rsa': 'RSA'
  };

  var searchInput = null;
  var resultsEl = null;
  var hideTimer = null;

  /** 初始化 DOM 引用 */
  function ensureElements() {
    if (!searchInput) searchInput = document.getElementById('toolSearch');
    if (!resultsEl) resultsEl = document.getElementById('searchResults');
  }

  /**
   * 搜索工具
   * @param {string} query 搜索关键词
   * @returns {Array} 匹配的工具列表
   */
  function search(query) {
    if (!query || !query.trim()) return [];
    var q = query.trim().toLowerCase();
    var results = [];

    for (var i = 0; i < TOOL_INDEX.length; i++) {
      var item = TOOL_INDEX[i];
      var score = 0;

      // 匹配工具名称
      if (item.name.toLowerCase().indexOf(q) >= 0) {
        score += 10;
      }

      // 匹配关键词
      for (var j = 0; j < item.keywords.length; j++) {
        if (item.keywords[j].indexOf(q) >= 0) {
          score += 5;
        }
      }

      // 匹配分类名
      var catName = CATEGORY_NAMES[item.category] || '';
      if (catName.toLowerCase().indexOf(q) >= 0) {
        score += 3;
      }

      if (score > 0) {
        results.push({ item: item, score: score });
      }
    }

    // 按分数排序
    results.sort(function(a, b) { return b.score - a.score; });
    return results.map(function(r) { return r.item; });
  }

  /** 渲染搜索结果 */
  function renderResults(items) {
    ensureElements();
    if (!items || items.length === 0) {
      resultsEl.innerHTML = '<div class="search-empty">未找到匹配的工具</div>';
      resultsEl.classList.add('visible');
      return;
    }

    var html = '';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var catLabel = CATEGORY_NAMES[item.category] || item.category;
      html += '<div class="search-item" data-category="' + item.category + '" data-tool="' + item.tool + '">' +
        '<span class="search-item-name">' + item.name + '</span>' +
        '<span class="search-item-cat">' + catLabel + '</span>' +
        '</div>';
    }
    resultsEl.innerHTML = html;
    resultsEl.classList.add('visible');

    // 绑定点击事件
    var items2 = resultsEl.querySelectorAll('.search-item');
    for (var j = 0; j < items2.length; j++) {
      items2[j].addEventListener('click', function() {
        var cat = this.getAttribute('data-category');
        var tool = this.getAttribute('data-tool');
        navigateToTool(cat, tool);
      });
    }
  }

  /** 跳转到指定工具 */
  function navigateToTool(category, tool) {
    ensureElements();
    // 隐藏搜索结果
    resultsEl.classList.remove('visible');
    searchInput.value = '';

    // 使用 hash 跳转，触发 app.js 的路由逻辑
    window.location.hash = '#' + tool;
  }

  /** 隐藏搜索结果 */
  function hideResults() {
    ensureElements();
    hideTimer = setTimeout(function() {
      resultsEl.classList.remove('visible');
    }, 200);
  }

  // 点击页面其他区域关闭搜索结果
  document.addEventListener('click', function(e) {
    ensureElements();
    if (!searchInput.contains(e.target) && !resultsEl.contains(e.target)) {
      resultsEl.classList.remove('visible');
    }
  });

  return {
    /** 输入事件处理 */
    onInput: function() {
      ensureElements();
      var query = searchInput.value;
      if (!query.trim()) {
        resultsEl.classList.remove('visible');
        resultsEl.innerHTML = '';
        return;
      }
      var results = search(query);
      if (results.length === 0 && query.trim()) {
        renderResults([]);
      } else {
        renderResults(results);
      }
    },

    /** 聚焦时如果有内容则显示结果 */
    onFocus: function() {
      ensureElements();
      clearTimeout(hideTimer);
      if (searchInput.value.trim()) {
        ToolSearch.onInput();
      }
    }
  };
})();
