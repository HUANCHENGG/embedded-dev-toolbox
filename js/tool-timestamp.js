/**
 * 时间戳工具模块
 * 包含：当前时间戳实时显示、时间戳↔日期互转、时间戳差值计算、世界时间
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

  /**
   * 显示转换结果区域的错误信息
   * @param {string} wrapId 结果容器元素 ID
   * @param {string} prefix 各行 span ID 前缀
   * @param {string} msg 错误提示文本
   */
  function showCvtError(wrapId, prefix, msg) {
    var wrap = document.getElementById(wrapId);
    wrap.style.display = '';
    var suffixes = (prefix === 'ts-cvt-')
      ? ['local','utc','iso','sec','ms']
      : ['sec','ms','local','iso'];
    suffixes.forEach(function(s, i) {
      document.getElementById(prefix + s).textContent = (i === 0) ? msg : '-';
    });
  }

  // ==================== 世界时间 ====================

  /**
   * 世界时钟城市列表
   * 新增客户或城市在此数组加一行即可，tz 为 IANA 时区名
   * （可查 https://en.wikipedia.org/wiki/List_of_tz_database_time_zones）
   * client 为 true 表示客户所在地，界面上会带 ★ 标记
   * 数组顺序即显示顺序：本地在前，客户其次，其余主要城市在后
   */
  var WORLD_ZONES = [
    { tz: 'Asia/Shanghai',       name: '中国（本地）', client: false },
    { tz: 'America/Bogota',      name: '哥伦比亚',     client: true  },
    { tz: 'Europe/Rome',         name: '意大利',       client: true  },
    { tz: 'America/New_York',    name: '美国东部',     client: false },
    { tz: 'America/Los_Angeles', name: '美国西部',     client: false },
    { tz: 'Europe/London',       name: '英国',         client: false },
    { tz: 'Europe/Berlin',       name: '德国',         client: false },
    { tz: 'Asia/Dubai',          name: '迪拜',         client: false },
    { tz: 'Asia/Kolkata',        name: '印度',         client: false },
    { tz: 'Asia/Tokyo',          name: '日本',         client: false },
    { tz: 'Australia/Sydney',    name: '悉尼',         client: false }
  ];

  /** 各时区 Intl 格式化器缓存，避免每秒刷新时重复创建（创建开销远大于格式化） */
  var _zoneFmtCache = {};

  /**
   * 获取（并缓存）指定时区的日期时间格式化器
   * @param {string} tz IANA 时区名，如 'America/Bogota'
   * @returns {Intl.DateTimeFormat}
   */
  function getZoneFmt(tz) {
    if (!_zoneFmtCache[tz]) {
      _zoneFmtCache[tz] = new Intl.DateTimeFormat('zh-CN', {
        timeZone: tz,
        month: '2-digit', day: '2-digit', weekday: 'short',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hourCycle: 'h23'
      });
    }
    return _zoneFmtCache[tz];
  }

  /**
   * 计算某时区相对 UTC 的偏移分钟数
   * 原理：把同一时刻分别按目标时区和 UTC 展开成"挂钟时间"字符串再相减，
   * 差值即偏移量。夏令时由时区库自动体现（如意大利夏 UTC+2 / 冬 UTC+1）
   * @param {string} tz IANA 时区名
   * @param {Date} date 参考时刻（偏移随夏令时变化，必须带参考时刻）
   * @returns {number} 偏移分钟数，东区为正（如上海 480，波哥大 -300）
   */
  function zoneOffsetMinutes(tz, date) {
    var loc = new Date(date.toLocaleString('en-US', { timeZone: tz }));
    var utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    return Math.round((loc.getTime() - utc.getTime()) / 60000);
  }

  /**
   * 将偏移分钟数格式化为 UTC+8 / UTC-5 / UTC+5:30 形式
   * @param {number} minutes 偏移分钟数
   * @returns {string}
   */
  function formatOffset(minutes) {
    var sign = minutes < 0 ? '-' : '+';
    var abs = Math.abs(minutes);
    var h = Math.floor(abs / 60);
    var m = abs % 60;
    return 'UTC' + sign + h + (m ? ':' + ('0' + m).slice(-2) : '');
  }

  /**
   * 计算某时区在指定时刻的完整显示信息
   * @param {string} tz IANA 时区名
   * @param {number} ms Unix 毫秒时间戳
   * @returns {{time: string, hour: number, offset: string, status: string, statusClass: string}}
   *          time 如 '07-20 周一 10:51:00'；status 为联系时段建议
   */
  function getZoneDisplay(tz, ms) {
    var date = new Date(ms);
    var parts = getZoneFmt(tz).formatToParts(date);
    var p = {};
    for (var i = 0; i < parts.length; i++) {
      p[parts[i].type] = parts[i].value;
    }
    var hour = parseInt(p.hour, 10) % 24;

    // 按当地小时数给出联系建议：9-18 工作时间，7-22 清醒时段，其余深夜
    var status, statusClass;
    if (hour >= 9 && hour < 18) {
      status = '● 工作时间';
      statusClass = 'ts-world-work';
    } else if (hour >= 7 && hour < 22) {
      status = '○ 清醒时段';
      statusClass = 'ts-world-awake';
    } else {
      status = '✗ 深夜';
      statusClass = 'ts-world-night';
    }

    return {
      time: p.month + '-' + p.day + ' ' + p.weekday + ' ' + p.hour + ':' + p.minute + ':' + p.second,
      hour: hour,
      offset: formatOffset(zoneOffsetMinutes(tz, date)),
      status: status,
      statusClass: statusClass
    };
  }

  /** 渲染世界时钟列表（每秒由 updateLive 调用刷新） */
  function renderWorldClock() {
    var wrap = document.getElementById('ts-world-list');
    if (!wrap) return;

    var now = Date.now();
    var html = '';
    for (var i = 0; i < WORLD_ZONES.length; i++) {
      var zone = WORLD_ZONES[i];
      var info = getZoneDisplay(zone.tz, now);
      html += '<div class="ts-live-row">' +
        '<span class="ts-live-label">' + (zone.client ? '★ ' : '') + zone.name + '</span>' +
        '<span class="ts-live-value">' + info.time + '</span>' +
        '<span class="ts-world-offset">' + info.offset + '</span>' +
        '<span class="ts-world-status ' + info.statusClass + '">' + info.status + '</span>' +
        '</div>';
    }
    wrap.innerHTML = html;
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

    // 世界时钟与当前时间戳共用同一个每秒定时器
    renderWorldClock();
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

    /** 世界时钟：计算指定时区在指定时刻的显示信息（导出供测试） */
    getZoneDisplay: getZoneDisplay,
    /** 世界时钟：手动触发一次渲染 */
    renderWorldClock: renderWorldClock,

    // ==================== 时间戳 → 日期 ====================
    tsToDate: function() {
      var input = document.getElementById('ts-to-date-input').value.trim();
      if (!input) {
        showCvtError('ts-to-date-result', 'ts-cvt-', '请输入时间戳');
        return;
      }

      var ts = parseInt(input, 10);
      if (isNaN(ts)) {
        showCvtError('ts-to-date-result', 'ts-cvt-', '错误：请输入有效的数字时间戳');
        return;
      }

      var unit = Utils.getRadioValue('ts-unit');
      var msValue = (unit === 's') ? ts * 1000 : ts;
      var date = new Date(msValue);

      if (isNaN(date.getTime())) {
        showCvtError('ts-to-date-result', 'ts-cvt-', '错误：无效的时间戳');
        return;
      }

      var resultWrap = document.getElementById('ts-to-date-result');
      resultWrap.style.display = '';
      document.getElementById('ts-cvt-local').textContent = formatDateTime(date);
      document.getElementById('ts-cvt-utc').textContent = formatUTC(date);
      document.getElementById('ts-cvt-iso').textContent = date.toISOString();
      document.getElementById('ts-cvt-sec').textContent = Math.floor(msValue / 1000);
      document.getElementById('ts-cvt-ms').textContent = msValue;
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
        showCvtError('ts-from-date-result', 'ts-cvt2-', '请输入日期时间');
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
        showCvtError('ts-from-date-result', 'ts-cvt2-', '错误：无法解析日期，请使用格式 YYYY-MM-DD HH:mm:ss');
        return;
      }

      var ms = date.getTime();
      var sec = Math.floor(ms / 1000);

      var resultWrap = document.getElementById('ts-from-date-result');
      resultWrap.style.display = '';
      document.getElementById('ts-cvt2-sec').textContent = sec;
      document.getElementById('ts-cvt2-ms').textContent = ms;
      document.getElementById('ts-cvt2-local').textContent = formatDateTime(date);
      document.getElementById('ts-cvt2-iso').textContent = date.toISOString();
    },

    /** 填入当前日期时间 */
    fillNowDate: function() {
      document.getElementById('ts-date-input').value = formatDateTime(new Date());
    },

    /** 清空转换区 */
    clearConvert: function() {
      document.getElementById('ts-to-date-input').value = '';
      document.getElementById('ts-date-input').value = '';
      var wrap1 = document.getElementById('ts-to-date-result');
      wrap1.style.display = 'none';
      ['ts-cvt-local','ts-cvt-utc','ts-cvt-iso','ts-cvt-sec','ts-cvt-ms'].forEach(function(id) {
        document.getElementById(id).textContent = '-';
      });
      var wrap2 = document.getElementById('ts-from-date-result');
      wrap2.style.display = 'none';
      ['ts-cvt2-sec','ts-cvt2-ms','ts-cvt2-local','ts-cvt2-iso'].forEach(function(id) {
        document.getElementById(id).textContent = '-';
      });
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
