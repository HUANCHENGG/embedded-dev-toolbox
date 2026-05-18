/**
 * 时间戳工具模块
 * 包含：当前时间戳实时显示、时间戳↔日期互转、时间戳差值计算
 */
var TimestampTools = (function() {

  var liveTimer = null;

  /**
   * 格式化日期为 YYYY-MM-DD HH:mm:ss
   * @param {Date} date
   * @returns {string}
   */
  function formatDateTime(date) {
    var y = date.getFullYear();
    var m = ('0' + (date.getMonth() + 1)).slice(-2);
    var d = ('0' + date.getDate()).slice(-2);
    var h = ('0' + date.getHours()).slice(-2);
    var min = ('0' + date.getMinutes()).slice(-2);
    var s = ('0' + date.getSeconds()).slice(-2);
    return y + '-' + m + '-' + d + ' ' + h + ':' + min + ':' + s;
  }

  /**
   * 格式化 UTC 日期
   * @param {Date} date
   * @returns {string}
   */
  function formatUTC(date) {
    return date.toUTCString();
  }

  /**
   * 将毫秒差值转为可读的天/时/分/秒
   * @param {number} ms 毫秒差值（正数）
   * @returns {string}
   */
  function formatDuration(ms) {
    var totalSec = Math.floor(ms / 1000);
    var days = Math.floor(totalSec / 86400);
    var hours = Math.floor((totalSec % 86400) / 3600);
    var minutes = Math.floor((totalSec % 3600) / 60);
    var seconds = totalSec % 60;

    var parts = [];
    if (days > 0) parts.push(days + ' 天');
    if (hours > 0) parts.push(hours + ' 小时');
    if (minutes > 0) parts.push(minutes + ' 分钟');
    parts.push(seconds + ' 秒');
    return parts.join(' ');
  }

  /** 更新实时时间戳显示 */
  function updateLive() {
    var now = new Date();
    var sec = Math.floor(now.getTime() / 1000);
    var ms = now.getTime();

    var secEl = document.getElementById('ts-live-sec');
    var msEl = document.getElementById('ts-live-ms');
    var utcEl = document.getElementById('ts-live-utc');
    var localEl = document.getElementById('ts-live-local');
    var isoEl = document.getElementById('ts-live-iso');

    if (secEl) secEl.textContent = sec;
    if (msEl) msEl.textContent = ms;
    if (utcEl) utcEl.textContent = formatUTC(now);
    if (localEl) localEl.textContent = formatDateTime(now);
    if (isoEl) isoEl.textContent = now.toISOString();
  }

  /** 启动实时更新 */
  function startLive() {
    if (liveTimer) return;
    updateLive();
    liveTimer = setInterval(updateLive, 1000);
  }

  /** 停止实时更新 */
  function stopLive() {
    if (liveTimer) {
      clearInterval(liveTimer);
      liveTimer = null;
    }
  }

  // 页面加载后自动启动（由 app.js 切换到 timestamp 分类时触发）
  // 也可以在页面可见时启动
  document.addEventListener('DOMContentLoaded', function() {
    // 检查当前是否在时间戳分类
    var tsContent = document.querySelector('.category-content[data-category="timestamp"]');
    if (tsContent && tsContent.classList.contains('active')) {
      startLive();
    }
  });

  return {
    /** 启动/停止实时显示（由标签切换调用） */
    startLive: startLive,
    stopLive: stopLive,

    // ==================== 时间戳 → 日期 ====================
    tsToDate: function() {
      var input = document.getElementById('ts-to-date-input').value.trim();
      if (!input) {
        document.getElementById('ts-to-date-result').textContent = '请输入时间戳';
        return;
      }

      var ts = parseInt(input, 10);
      if (isNaN(ts)) {
        document.getElementById('ts-to-date-result').textContent = '错误：请输入有效的数字时间戳';
        return;
      }

      var unit = Utils.getRadioValue('ts-unit');
      var msValue = (unit === 's') ? ts * 1000 : ts;
      var date = new Date(msValue);

      if (isNaN(date.getTime())) {
        document.getElementById('ts-to-date-result').textContent = '错误：无效的时间戳';
        return;
      }

      var lines = [];
      lines.push('本地时间：' + formatDateTime(date));
      lines.push('UTC 时间：' + formatUTC(date));
      lines.push('ISO 8601：' + date.toISOString());
      lines.push('时间戳(秒)：' + Math.floor(msValue / 1000));
      lines.push('时间戳(毫秒)：' + msValue);

      document.getElementById('ts-to-date-result').textContent = lines.join('\n');
    },

    /** 填入当前时间戳 */
    fillNowTs: function() {
      var unit = Utils.getRadioValue('ts-unit');
      var now = Date.now();
      document.getElementById('ts-to-date-input').value = (unit === 's') ? Math.floor(now / 1000) : now;
    },

    // ==================== 日期 → 时间戳 ====================
    dateToTs: function() {
      var input = document.getElementById('ts-date-input').value.trim();
      if (!input) {
        document.getElementById('ts-from-date-result').textContent = '请输入日期时间';
        return;
      }

      // 尝试解析多种格式
      var date = new Date(input);

      // 如果标准解析失败，尝试 YYYY-MM-DD HH:mm:ss 格式
      if (isNaN(date.getTime())) {
        var match = input.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
        if (match) {
          date = new Date(
            parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]),
            parseInt(match[4]), parseInt(match[5]), parseInt(match[6])
          );
        }
      }

      // 尝试只有日期没有时间的格式
      if (isNaN(date.getTime())) {
        var match2 = input.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
        if (match2) {
          date = new Date(parseInt(match2[1]), parseInt(match2[2]) - 1, parseInt(match2[3]));
        }
      }

      if (isNaN(date.getTime())) {
        document.getElementById('ts-from-date-result').textContent = '错误：无法解析日期，请使用格式 YYYY-MM-DD HH:mm:ss';
        return;
      }

      var ms = date.getTime();
      var sec = Math.floor(ms / 1000);

      var lines = [];
      lines.push('时间戳(秒)：' + sec);
      lines.push('时间戳(毫秒)：' + ms);
      lines.push('解析为本地时间：' + formatDateTime(date));
      lines.push('ISO 8601：' + date.toISOString());

      document.getElementById('ts-from-date-result').textContent = lines.join('\n');
    },

    /** 填入当前日期时间 */
    fillNowDate: function() {
      document.getElementById('ts-date-input').value = formatDateTime(new Date());
    },

    /** 清空转换区 */
    clearConvert: function() {
      document.getElementById('ts-to-date-input').value = '';
      document.getElementById('ts-to-date-result').textContent = '-';
      document.getElementById('ts-date-input').value = '';
      document.getElementById('ts-from-date-result').textContent = '-';
    },

    // ==================== 时间戳差值计算 ====================
    calcDiff: function() {
      var startStr = document.getElementById('ts-calc-start').value.trim();
      var endStr = document.getElementById('ts-calc-end').value.trim();

      if (!startStr || !endStr) {
        document.getElementById('ts-calc-result').textContent = '请输入开始和结束时间戳';
        return;
      }

      var start = parseInt(startStr, 10);
      var end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end)) {
        document.getElementById('ts-calc-result').textContent = '错误：请输入有效的数字时间戳';
        return;
      }

      var unit = Utils.getRadioValue('ts-calc-unit');
      var startMs = (unit === 's') ? start * 1000 : start;
      var endMs = (unit === 's') ? end * 1000 : end;

      var diffMs = Math.abs(endMs - startMs);
      var diffSec = Math.floor(diffMs / 1000);
      var direction = (endMs >= startMs) ? '（结束 > 开始）' : '（开始 > 结束）';

      var lines = [];
      lines.push('时间差：' + formatDuration(diffMs) + ' ' + direction);
      lines.push('相差秒数：' + diffSec + ' 秒');
      lines.push('相差毫秒：' + diffMs + ' 毫秒');
      lines.push('');
      lines.push('开始：' + formatDateTime(new Date(startMs)));
      lines.push('结束：' + formatDateTime(new Date(endMs)));

      document.getElementById('ts-calc-result').textContent = lines.join('\n');
    },

    /** 清空计算区 */
    clearCalc: function() {
      document.getElementById('ts-calc-start').value = '';
      document.getElementById('ts-calc-end').value = '';
      document.getElementById('ts-calc-result').textContent = '-';
    }
  };
})();
