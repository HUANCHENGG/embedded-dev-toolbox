// CRC 测试脚本 - 在浏览器控制台或 Node.js 中执行
// 输入: "123456789" = 0x31 0x32 0x33 0x34 0x35 0x36 0x37 0x38 0x39

var CRC_PRESETS = {
  'CRC-8':           { width: 8,  poly: 0x07,       init: 0x00,       refin: false, refout: false, xorout: 0x00 },
  'CRC-8/MAXIM':     { width: 8,  poly: 0x31,       init: 0x00,       refin: true,  refout: false, xorout: 0x00 },
  'CRC-16/IBM':      { width: 16, poly: 0x8005,     init: 0x0000,     refin: true,  refout: false, xorout: 0x0000 },
  'CRC-16/MODBUS':   { width: 16, poly: 0x8005,     init: 0xFFFF,     refin: true,  refout: false, xorout: 0x0000 },
  'CRC-16/CCITT':    { width: 16, poly: 0x1021,     init: 0xFFFF,     refin: false, refout: false, xorout: 0x0000 },
  'CRC-16/CCITT-FALSE': { width: 16, poly: 0x1021,  init: 0xFFFF,     refin: false, refout: false, xorout: 0x0000 },
  'CRC-16/XMODEM':   { width: 16, poly: 0x1021,     init: 0x0000,     refin: false, refout: false, xorout: 0x0000 },
  'CRC-32':          { width: 32, poly: 0x04C11DB7,  init: 0xFFFFFFFF, refin: true,  refout: false, xorout: 0xFFFFFFFF }
};

var EXPECTED = {
  'CRC-8':           'F4',
  'CRC-8/MAXIM':     'A1',
  'CRC-16/IBM':      'BB3D',
  'CRC-16/MODBUS':   '4B37',
  'CRC-16/CCITT':    '29B1',
  'CRC-16/CCITT-FALSE': '29B1',
  'CRC-16/XMODEM':   '31C3',
  'CRC-32':          'CBF43926'
};

var data = new Uint8Array([0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39]);

function reflect(value, width) {
  var result = 0;
  for (var i = 0; i < width; i++) {
    if (value & (1 << i)) {
      result |= (1 << (width - 1 - i)) >>> 0;
    }
  }
  return result >>> 0;
}

function generateCRCTable(width, poly) {
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
  return table;
}

function generateReflectedCRCTable(width, poly) {
  // poly 已反射
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
  return table;
}

function calcCRC(data, params) {
  var width = params.width;
  var mask = (width === 32) ? 0xFFFFFFFF : ((1 << width) - 1);
  var crc = (params.init & mask) >>> 0;

  if (params.refin) {
    // 右移法：传入已反射的多项式，生成反射表
    var rPoly = reflect(params.poly, width);
    var table = generateReflectedCRCTable(width, rPoly);
    for (var i = 0; i < data.length; i++) {
      var idx = ((crc ^ data[i]) & 0xFF) >>> 0;
      crc = ((crc >>> 8) ^ table[idx]) >>> 0;
    }
  } else {
    // 左移法
    var table2 = generateCRCTable(width, params.poly);
    for (var i2 = 0; i2 < data.length; i2++) {
      var idx2 = (((crc >>> (width - 8)) ^ data[i2]) & 0xFF) >>> 0;
      crc = (((crc << 8) ^ table2[idx2]) & mask) >>> 0;
    }
  }

  if (params.refout && !params.refin) {
    crc = reflect(crc, width);
  }

  crc = (crc ^ params.xorout) & mask;
  return crc >>> 0;
}

// 运行测试
var pass = 0, fail = 0;
for (var name in CRC_PRESETS) {
  var result = calcCRC(data, CRC_PRESETS[name]);
  var hex = result.toString(16).toUpperCase();
  var padLen = CRC_PRESETS[name].width / 4;
  while (hex.length < padLen) hex = '0' + hex;
  var ok = hex === EXPECTED[name];
  console.log((ok ? '✓' : '✗') + ' ' + name + ': ' + hex + (ok ? '' : ' (expected ' + EXPECTED[name] + ')'));
  if (ok) pass++; else fail++;
}
console.log('\nResult: ' + pass + ' pass, ' + fail + ' fail');
