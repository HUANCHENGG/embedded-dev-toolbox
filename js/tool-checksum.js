/**
 * 数据校验工具模块
 * 包含：BCC/XOR异或校验、CRC校验（支持8/16/32位及自定义参数）、累加和Checksum
 */
var ChecksumTools = (function() {

  // ==================== CRC 预置变体参数表 ====================
  var CRC_PRESETS = {
    'CRC-8':           { width: 8,  poly: 0x07,       init: 0x00,     refin: false, refout: false, xorout: 0x00 },
    'CRC-8/MAXIM':     { width: 8,  poly: 0x31,       init: 0x00,     refin: true,  refout: true,  xorout: 0x00 },
    'CRC-16/IBM':      { width: 16, poly: 0x8005,     init: 0x0000,   refin: true,  refout: true,  xorout: 0x0000 },
    'CRC-16/MODBUS':   { width: 16, poly: 0x8005,     init: 0xFFFF,   refin: true,  refout: true,  xorout: 0x0000 },
    'CRC-16/CCITT':    { width: 16, poly: 0x1021,     init: 0xFFFF,   refin: false, refout: false, xorout: 0x0000 },
    'CRC-16/CCITT-FALSE': { width: 16, poly: 0x1021,  init: 0xFFFF,   refin: false, refout: false, xorout: 0x0000 },
    'CRC-16/XMODEM':   { width: 16, poly: 0x1021,     init: 0x0000,   refin: false, refout: false, xorout: 0x0000 },
    'CRC-32':          { width: 32, poly: 0x04C11DB7, init: 0xFFFFFFFF, refin: true,  refout: false, xorout: 0xFFFFFFFF }
  };

  // CRC 查找表缓存
  var crcTableCache = {};

  /**
   * 位反转函数：将 value 的低 width 位反转
   * 使用 >>> 0 确保返回无符号整数，兼容 32 位
   * @param {number} value 原始值
   * @param {number} width 位宽
   * @returns {number} 反转后的值（无符号）
   */
  function reflect(value, width) {
    var result = 0;
    for (var i = 0; i < width; i++) {
      if (value & (1 << i)) {
        result |= (1 << (width - 1 - i)) >>> 0;
      }
    }
    return result >>> 0;
  }

  /**
   * 生成 CRC 左移查找表（256项），用于 RefIn=false
   * @param {number} width 位宽
   * @param {number} poly 多项式（正常形式）
   * @returns {Uint32Array} 查找表
   */
  function generateCRCTable(width, poly) {
    var cacheKey = 'L_' + width + '_' + poly;
    if (crcTableCache[cacheKey]) return crcTableCache[cacheKey];

    var table = new Uint32Array(256);
    var mask = (width === 32) ? 0xFFFFFFFF : ((1 << width) - 1);

    for (var i = 0; i < 256; i++) {
      var crc = (i << (width - 8)) >>> 0;
      for (var j = 0; j < 8; j++) {
        if (crc & (1 << (width - 1))) {
          crc = (((crc << 1) ^ poly) & mask) >>> 0;
        } else {
          crc = ((crc << 1) & mask) >>> 0;
        }
      }
      table[i] = crc >>> 0;
    }

    crcTableCache[cacheKey] = table;
    return table;
  }

  /**
   * 生成 CRC 右移查找表（256项），用于 RefIn=true
   * 右移算法：c = i，每次右移1位，LSB与 poly bit0 比较
   * @param {number} width 位宽
   * @param {number} poly 多项式（需已反射）
   * @returns {Uint32Array} 查找表
   */
  function generateReflectedCRCTable(width, poly) {
    var cacheKey = 'R_' + width + '_' + poly;
    if (crcTableCache[cacheKey]) return crcTableCache[cacheKey];

    var table = new Uint32Array(256);
    for (var i = 0; i < 256; i++) {
      var c = i >>> 0;
      for (var j = 0; j < 8; j++) {
        if (c & 1) {
          c = ((c >>> 1) ^ poly) >>> 0;
        } else {
          c = (c >>> 1) >>> 0;
        }
      }
      table[i] = c >>> 0;
    }

    crcTableCache[cacheKey] = table;
    return table;
  }

  /**
   * 通用 CRC 计算函数
   * RefIn=false: 左移查表法（MSB优先），refout 时在末尾额外反转
   * RefIn=true:  右移查表法（LSB优先），查表前 crc 已满足，无需额外反射
   * @param {Uint8Array} data 输入数据
   * @param {object} params {width, poly, init, refin, refout, xorout}
   * @returns {number} CRC 计算结果
   */
  function calcCRC(data, params) {
    var width = params.width;
    var mask = (width === 32) ? 0xFFFFFFFF : ((1 << width) - 1);
    var crc = (params.init & mask) >>> 0;

    if (params.refin) {
      // 右移法：多项式先反射，生成右移查找表
      var rPoly = reflect(params.poly, width);
      var table = generateReflectedCRCTable(width, rPoly);
      for (var i = 0; i < data.length; i++) {
        var idx = ((crc ^ data[i]) & 0xFF) >>> 0;
        crc = ((crc >>> 8) ^ table[idx]) >>> 0;
      }
    } else {
      // 左移法：使用正常多项式的左移表
      var table2 = generateCRCTable(width, params.poly);
      for (var i2 = 0; i2 < data.length; i2++) {
        var idx2 = (((crc >>> (width - 8)) ^ data[i2]) & 0xFF) >>> 0;
        crc = (((crc << 8) ^ table2[idx2]) & mask) >>> 0;
      }
    }

    // RefOut: 仅 refin=false 时需要反转；refin=true 时右移法输出已满足定义
    if (params.refout && !params.refin) {
      crc = reflect(crc, width);
    }

    // XOR Out
    crc = (crc ^ params.xorout) & mask;

    return crc >>> 0;
  }

  // ==================== BCC / XOR 校验 ====================
  return {
    /** 计算 BCC/XOR 校验 */
    calcBCC: function() {
      var input = document.getElementById('bcc-input').value;
      var bytes = Utils.parseHexString(input);
      if (!bytes) {
        document.getElementById('bcc-result').textContent = '错误：请输入有效的Hex数据';
        document.getElementById('bcc-process').textContent = '-';
        return;
      }
      // 逐字节异或
      var result = bytes[0];
      var steps = '0x' + ('0' + bytes[0].toString(16).toUpperCase()).slice(-2);
      for (var i = 1; i < bytes.length; i++) {
        result ^= bytes[i];
        steps += '  XOR  0x' + ('0' + bytes[i].toString(16).toUpperCase()).slice(-2) +
                 '  =  0x' + ('0' + result.toString(16).toUpperCase()).slice(-2);
      }
      document.getElementById('bcc-result').textContent =
        '0x' + ('0' + result.toString(16).toUpperCase()).slice(-2);
      document.getElementById('bcc-process').textContent = steps;
    },

    clearBCC: function() {
      document.getElementById('bcc-input').value = '';
      document.getElementById('bcc-result').textContent = '-';
      document.getElementById('bcc-process').textContent = '-';
    },

    fillBCCExample: function() {
      document.getElementById('bcc-input').value = '0x01 0x02 0x03 0x04 0x05';
    },

    // ==================== CRC 校验 ====================
    /** CRC 变体下拉切换时，显示/隐藏自定义参数区 */
    onCRCVariantChange: function() {
      var variant = document.getElementById('crc-variant').value;
      var customDiv = document.getElementById('crc-custom-params');
      if (variant === 'custom') {
        customDiv.classList.remove('hidden');
      } else {
        customDiv.classList.add('hidden');
      }
    },

    /** 计算 CRC */
    calcCRC: function() {
      var input = document.getElementById('crc-input').value;
      var bytes = Utils.parseHexString(input);
      if (!bytes) {
        document.getElementById('crc-result').textContent = '错误：请输入有效的Hex数据';
        return;
      }

      var variant = document.getElementById('crc-variant').value;
      var params;

      if (variant === 'custom') {
        // 从自定义参数区读取
        var width = parseInt(Utils.getRadioValue('crc-width'));
        var polyStr = document.getElementById('crc-poly').value.trim();
        var initStr = document.getElementById('crc-init').value.trim();
        var xoroutStr = document.getElementById('crc-xorout').value.trim();

        if (!polyStr || !initStr || !xoroutStr) {
          document.getElementById('crc-result').textContent = '错误：请填写所有CRC参数';
          return;
        }

        params = {
          width: width,
          poly: parseInt(polyStr, 16),
          init: parseInt(initStr, 16),
          refin: document.getElementById('crc-refin').checked,
          refout: document.getElementById('crc-refout').checked,
          xorout: parseInt(xoroutStr, 16)
        };

        if (isNaN(params.poly) || isNaN(params.init) || isNaN(params.xorout)) {
          document.getElementById('crc-result').textContent = '错误：参数必须为有效的Hex值';
          return;
        }
      } else {
        params = CRC_PRESETS[variant];
      }

      var result = calcCRC(bytes, params);
      var hex = Utils.formatHex(result, params.width / 8);
      document.getElementById('crc-result').textContent = '0x' + hex + '  (' + hex + ')';
    },

    clearCRC: function() {
      document.getElementById('crc-input').value = '';
      document.getElementById('crc-result').textContent = '-';
    },

    fillCRCExample: function() {
      // 标准测试向量 "123456789"
      document.getElementById('crc-input').value = '31 32 33 34 35 36 37 38 39';
    },

    // ==================== 累加和 Checksum ====================
    calcSum: function() {
      var input = document.getElementById('sum-input').value;
      var bytes = Utils.parseHexString(input);
      if (!bytes) {
        document.getElementById('sum-result').textContent = '错误：请输入有效的Hex数据';
        return;
      }

      var width = parseInt(Utils.getRadioValue('sum-width'));
      var outMode = Utils.getRadioValue('sum-out');
      var carryWrap = document.getElementById('sum-carry').checked;
      var sum = 0;
      var mask, byteWidth;

      if (width === 8) {
        byteWidth = 1;
        mask = 0xFF;
      } else if (width === 16) {
        byteWidth = 2;
        mask = 0xFFFF;
      } else {
        byteWidth = 4;
        mask = 0xFFFFFFFF;
      }

      // 按指定字节宽度累加
      for (var i = 0; i < bytes.length; i += byteWidth) {
        var val = 0;
        // 大端序组合
        for (var j = 0; j < byteWidth && (i + j) < bytes.length; j++) {
          val = (val << 8) | bytes[i + j];
        }
        // 如果字节数不够（尾部不足），高位补0
        if (j < byteWidth) {
          val = val << ((byteWidth - j) * 8);
        }
        sum += val;

        if (carryWrap) {
          // 进位回卷：溢出部分加回低位
          while (sum > mask) {
            sum = (sum & mask) + (sum >>> (width === 32 ? 32 : width));
          }
        }
      }

      sum = sum & mask;

      // 取反+1（补码）
      if (outMode === 'complement') {
        sum = ((~sum) & mask) >>> 0;
      }

      var hex = Utils.formatHex(sum, byteWidth);
      document.getElementById('sum-result').textContent = '0x' + hex + '  (' + hex + ')';
    },

    clearSum: function() {
      document.getElementById('sum-input').value = '';
      document.getElementById('sum-result').textContent = '-';
    },

    fillSumExample: function() {
      document.getElementById('sum-input').value = '01 02 03 04 05 06 07 08';
    }
  };
})();
