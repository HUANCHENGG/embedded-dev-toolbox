/**
 * 主入口脚本
 * 负责：标签页切换（一级/二级联动）、Hash路由、localStorage记忆、初始化
 */
(function() {
  'use strict';

  var STORAGE_KEY = 'devtool_last_tab';

  /** 初始化入口 */
  function init() {
    bindCategoryTabs();
    bindSubTabs();
    restoreFromHashOrStorage();
    bindHashChange();
    // AES 模式初始化
    if (typeof CryptoTools !== 'undefined' && CryptoTools.onAESModeChange) {
      CryptoTools.onAESModeChange();
    }
  }

  /** 绑定一级分类标签点击事件 */
  function bindCategoryTabs() {
    var tabs = document.querySelectorAll('#categoryTabs .category-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function() {
        var category = this.getAttribute('data-category');
        switchCategory(category);
      });
    }
  }

  /** 绑定二级工具子标签点击事件 */
  function bindSubTabs() {
    var allSubTabs = document.querySelectorAll('.sub-tab');
    for (var i = 0; i < allSubTabs.length; i++) {
      allSubTabs[i].addEventListener('click', function() {
        var tool = this.getAttribute('data-tool');
        switchTool(this.parentElement, tool);
      });
    }
  }

  /**
   * 切换一级分类
   * @param {string} category 分类名称
   * @param {string} [tool] 可选的二级工具名称
   */
  function switchCategory(category, tool) {
    // 更新一级标签激活状态
    var tabs = document.querySelectorAll('#categoryTabs .category-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].getAttribute('data-category') === category);
    }

    // 更新分类内容区
    var contents = document.querySelectorAll('.category-content');
    for (var j = 0; j < contents.length; j++) {
      contents[j].classList.toggle('active', contents[j].getAttribute('data-category') === category);
    }

    // 如果指定了工具名，切换到该二级工具
    if (tool) {
      var subTabs = document.getElementById('subTabs-' + category);
      if (subTabs) {
        switchTool(subTabs, tool);
      }
    }

    // 时间戳实时更新控制
    if (typeof TimestampTools !== 'undefined') {
      if (category === 'timestamp') {
        TimestampTools.startLive();
      } else {
        TimestampTools.stopLive();
      }
    }

    // 保存到 localStorage
    saveState(category, tool || getDefaultTool(category));
    // 更新 Hash
    updateHash(category, tool || getDefaultTool(category));
  }

  /**
   * 切换二级工具
   * @param {HTMLElement} subTabsContainer 二级标签容器
   * @param {string} tool 工具名称
   */
  function switchTool(subTabsContainer, tool) {
    // 更新子标签激活状态
    var tabs = subTabsContainer.querySelectorAll('.sub-tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tool') === tool);
    }

    // 找到对应的分类内容区，更新工具面板显示
    var categoryContent = subTabsContainer.parentElement;
    var panels = categoryContent.querySelectorAll('.tool-panel');
    for (var j = 0; j < panels.length; j++) {
      panels[j].classList.toggle('active', panels[j].getAttribute('data-tool') === tool);
    }

    // 保存和更新Hash
    var category = categoryContent.getAttribute('data-category');
    saveState(category, tool);
    updateHash(category, tool);
  }

  /** 获取每个分类的默认工具名 */
  function getDefaultTool(category) {
    var defaults = { checksum: 'bcc', encoding: 'hexconv', string: 'charcount', crypto: 'md5', timestamp: 'ts-current', rsa: 'rsa-keygen' };
    return defaults[category] || '';
  }

  /** 保存当前状态到 localStorage */
  function saveState(category, tool) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ category: category, tool: tool }));
    } catch (e) { /* 忽略 */ }
  }

  /** 从 localStorage 恢复状态 */
  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* 忽略 */ }
    return null;
  }

  /** 更新 URL Hash */
  function updateHash(category, tool) {
    var hash = '#' + (tool || category);
    if (window.location.hash !== hash) {
      history.replaceState(null, '', hash);
    }
  }

  /** 根据 Hash 或 localStorage 恢复 */
  function restoreFromHashOrStorage() {
    var hash = window.location.hash.replace('#', '');
    if (hash) {
      // 尝试从 hash 匹配工具名
      var found = findCategoryByTool(hash);
      if (found) {
        switchCategory(found.category, found.tool);
        return;
      }
    }
    // 从 localStorage 恢复
    var state = loadState();
    if (state && state.category) {
      switchCategory(state.category, state.tool);
    }
  }

  /** 根据工具名找到所属分类 */
  function findCategoryByTool(toolName) {
    var map = {
      'bcc': 'checksum', 'crc': 'checksum', 'sum': 'checksum',
      'hexconv': 'encoding', 'baseconv': 'encoding', 'base64': 'encoding', 'utf8': 'encoding',
      'charcount': 'string', 'bytecount': 'string', 'strlen': 'string', 'caseconv': 'string',
      'md5': 'crypto', 'sha': 'crypto', 'aes': 'crypto',
      'ts-current': 'timestamp', 'ts-convert': 'timestamp', 'ts-calc': 'timestamp',
      'rsa-keygen': 'rsa', 'rsa-encrypt': 'rsa', 'rsa-sign': 'rsa'
    };
    if (map[toolName]) {
      return { category: map[toolName], tool: toolName };
    }
    // 尝试匹配分类名
    var cats = ['checksum', 'encoding', 'string', 'crypto', 'timestamp', 'rsa'];
    if (cats.indexOf(toolName) >= 0) {
      return { category: toolName, tool: getDefaultTool(toolName) };
    }
    return null;
  }

  /** 监听 Hash 变化 */
  function bindHashChange() {
    window.addEventListener('hashchange', function() {
      var hash = window.location.hash.replace('#', '');
      if (hash) {
        var found = findCategoryByTool(hash);
        if (found) {
          switchCategory(found.category, found.tool);
        }
      }
    });
  }

  // DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
