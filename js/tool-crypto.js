/**
 * 哈希/加密工具模块
 * 包含：MD5、SHA-1/SHA-256、AES加密解密
 * 依赖外部库：crypto-js (CDN加载)
 */
var CryptoTools = (function() {

  /**
   * 将输入文本或Hex转为 crypto-js WordArray
   * @param {string} input 输入字符串
   * @param {string} mode 'text' 或 'hex'
   * @returns {CryptoJS.lib.WordArray}
   */
  function toWordArray(input, mode) {
    if (mode === 'hex') {
      var bytes = Utils.parseHexString(input);
      if (!bytes) throw new Error('无效的Hex数据');
      return CryptoJS.enc.Hex.parse(Utils.bytesToHex(bytes, ''));
    }
    return CryptoJS.enc.Utf8.parse(input);
  }

  /**
   * 将 Hex 字符串（可能带空格分隔）转为 crypto-js WordArray
   * @param {string} hex 输入的 Hex 字符串（带或不带空格分隔）
   * @returns {CryptoJS.lib.WordArray}
   */
  function hexToWordArray(hex) {
    var bytes = Utils.parseHexString(hex);
    if (!bytes) throw new Error('无效的Hex数据');
    return CryptoJS.enc.Hex.parse(Utils.bytesToHex(bytes, ''));
  }

  /**
   * 将纯 Hex 字符串（无空格）直接转为 crypto-js WordArray
   * @param {string} pureHex 不带空格分隔的纯 Hex 字符串
   * @returns {CryptoJS.lib.WordArray}
   */
  function pureHexToWordArray(pureHex) {
    // 清理空格后直接让 crypto-js 解析
    var cleaned = pureHex.replace(/\s/g, '');
    return CryptoJS.enc.Hex.parse(cleaned);
  }

  return {
    // ==================== MD5 ====================
    calcMD5: function() {
      var input = document.getElementById('md5-input').value;
      if (!input) {
        document.getElementById('md5-result').textContent = '-';
        document.getElementById('md5-segment').textContent = '-';
        return;
      }

      try {
        var mode = Utils.getRadioValue('md5-mode');
        var upper = Utils.getRadioValue('md5-case') === 'upper';
        var data;
        if (mode === 'hex') {
          data = hexToWordArray(input);
        } else {
          data = CryptoJS.enc.Utf8.parse(input);
        }
        var hash = CryptoJS.MD5(data);
        var hex = upper ? hash.toString().toUpperCase() : hash.toString();

        document.getElementById('md5-result').textContent = hex;

        // 分段显示：每8字符一组
        var segments = [];
        for (var i = 0; i < hex.length; i += 8) {
          segments.push(hex.substring(i, i + 8));
        }
        document.getElementById('md5-segment').textContent = segments.join(' - ');
      } catch (e) {
        document.getElementById('md5-result').textContent = '错误：' + e.message;
        document.getElementById('md5-segment').textContent = '-';
      }
    },

    clearMD5: function() {
      document.getElementById('md5-input').value = '';
      document.getElementById('md5-result').textContent = '-';
      document.getElementById('md5-segment').textContent = '-';
    },

    // ==================== SHA ====================
    calcSHA: function() {
      var input = document.getElementById('sha-input').value;
      if (!input) {
        document.getElementById('sha-result').textContent = '-';
        return;
      }

      try {
        var variant = Utils.getRadioValue('sha-variant');
        var mode = Utils.getRadioValue('sha-mode');
        var upper = Utils.getRadioValue('sha-case') === 'upper';
        var data;
        if (mode === 'hex') {
          data = hexToWordArray(input);
        } else {
          data = CryptoJS.enc.Utf8.parse(input);
        }
        var hash;

        if (variant === 'SHA1') {
          hash = CryptoJS.SHA1(data);
        } else {
          hash = CryptoJS.SHA256(data);
        }

        var hex = upper ? hash.toString().toUpperCase() : hash.toString();

        // 分段显示
        var segments = [];
        for (var i = 0; i < hex.length; i += 8) {
          segments.push(hex.substring(i, i + 8));
        }
        document.getElementById('sha-result').textContent = segments.join(' ');
      } catch (e) {
        document.getElementById('sha-result').textContent = '错误：' + e.message;
      }
    },

    clearSHA: function() {
      document.getElementById('sha-input').value = '';
      document.getElementById('sha-result').textContent = '-';
    },

    // ==================== AES ====================
    /** AES模式切换时，ECB模式禁用IV输入 */
    onAESModeChange: function() {
      var mode = document.getElementById('aes-mode').value;
      var ivEl = document.getElementById('aes-iv');
      if (mode === 'ECB') {
        ivEl.disabled = true;
        ivEl.value = '';
        ivEl.placeholder = 'ECB模式无需IV';
        ivEl.style.background = '#f3f4f6';
      } else {
        ivEl.disabled = false;
        ivEl.placeholder = '输入IV';
        ivEl.style.background = '#fff';
      }
    },

    aesEncrypt: function() {
      var input = document.getElementById('aes-input').value;
      if (!input) {
        document.getElementById('aes-output').value = '错误：请输入明文';
        return;
      }

      try {
        var opts = _getAESOptions();
        var keyWA = _parseAESKey(opts.key, opts.keyMode, opts.bits);
        var dataWA = CryptoJS.enc.Utf8.parse(input);

        var params = {
          mode: opts.modeObj,
          padding: opts.padObj
        };

        if (opts.mode !== 'ECB') {
          params.iv = _parseAESIV(opts.iv, opts.ivMode);
        }

        var encrypted = CryptoJS.AES.encrypt(dataWA, keyWA, params);

        if (opts.enc === 'hex') {
          document.getElementById('aes-output').value = encrypted.ciphertext.toString();
        } else {
          document.getElementById('aes-output').value = encrypted.toString();
        }
      } catch (e) {
        document.getElementById('aes-output').value = '加密失败：' + e.message;
      }
    },

    aesDecrypt: function() {
      var input = document.getElementById('aes-input').value;
      if (!input) {
        document.getElementById('aes-output').value = '错误：请输入密文';
        return;
      }

      try {
        var opts = _getAESOptions();
        var keyWA = _parseAESKey(opts.key, opts.keyMode, opts.bits);

        var params = {
          mode: opts.modeObj,
          padding: opts.padObj
        };

        if (opts.mode !== 'ECB') {
          params.iv = _parseAESIV(opts.iv, opts.ivMode);
        }

        var decrypted;
        if (opts.enc === 'hex') {
          // Hex密文需要构造 CipherParams
          var cipherWA = CryptoJS.enc.Hex.parse(input);
          var cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: cipherWA });
          decrypted = CryptoJS.AES.decrypt(cipherParams, keyWA, params);
        } else {
          decrypted = CryptoJS.AES.decrypt(input, keyWA, params);
        }

        var text = decrypted.toString(CryptoJS.enc.Utf8);
        if (!text) {
          document.getElementById('aes-output').value = '解密失败：密钥或参数错误';
        } else {
          document.getElementById('aes-output').value = text;
        }
      } catch (e) {
        document.getElementById('aes-output').value = '解密失败：' + e.message;
      }
    },

    clearAES: function() {
      document.getElementById('aes-input').value = '';
      document.getElementById('aes-key').value = '';
      document.getElementById('aes-iv').value = '';
      document.getElementById('aes-output').value = '';
    }
  };

  // ==================== AES 内部辅助函数 ====================

  /** 获取 AES 所有配置参数 */
  function _getAESOptions() {
    var mode = document.getElementById('aes-mode').value;
    var pad = document.getElementById('aes-pad').value;
    return {
      key: document.getElementById('aes-key').value,
      keyMode: Utils.getRadioValue('aes-key-mode'),
      iv: document.getElementById('aes-iv').value,
      ivMode: Utils.getRadioValue('aes-iv-mode'),
      mode: mode,
      modeObj: _modeObj(mode),
      bits: parseInt(document.getElementById('aes-bits').value),
      pad: pad,
      padObj: _padObj(pad),
      enc: Utils.getRadioValue('aes-enc')
    };
  }

  /** 将模式字符串映射到 crypto-js 模式对象 */
  function _modeObj(mode) {
    switch (mode) {
      case 'ECB': return CryptoJS.mode.ECB;
      case 'CBC': return CryptoJS.mode.CBC;
      case 'CTR': return CryptoJS.mode.CTR;
      case 'CFB': return CryptoJS.mode.CFB;
      default:    return CryptoJS.mode.CBC;
    }
  }

  /** 将填充字符串映射到 crypto-js 填充对象 */
  function _padObj(pad) {
    switch (pad) {
      case 'Pkcs7':       return CryptoJS.pad.Pkcs7;
      case 'ZeroPadding': return CryptoJS.pad.ZeroPadding;
      case 'NoPadding':   return CryptoJS.pad.NoPadding;
      default:            return CryptoJS.pad.Pkcs7;
    }
  }

  /** 解析密钥并截取到指定长度 */
  function _parseAESKey(key, mode, bits) {
    if (!key) throw new Error('请输入密钥');
    var bytes = bits / 8; // 16/24/32
    var keyWA;

    if (mode === 'hex') {
      var hexBytes = Utils.parseHexString(key);
      if (!hexBytes) throw new Error('无效的Hex密钥');
      keyWA = CryptoJS.enc.Hex.parse(Utils.bytesToHex(hexBytes, ''));
    } else {
      keyWA = CryptoJS.enc.Utf8.parse(key);
    }

    // 截取或补齐到目标长度
    var sigBytes = keyWA.sigBytes;
    if (sigBytes > bytes) {
      keyWA = CryptoJS.lib.WordArray.create(keyWA.words.slice(0, bytes / 4), bytes);
    } else if (sigBytes < bytes) {
      // 不足时用0补齐
      var words = keyWA.words.slice();
      while (words.length < bytes / 4) words.push(0);
      keyWA = CryptoJS.lib.WordArray.create(words, bytes);
    }

    return keyWA;
  }

  /** 解析IV */
  function _parseAESIV(iv, mode) {
    if (!iv) return CryptoJS.enc.Utf8.parse(''); // 空IV
    if (mode === 'hex') {
      var hexBytes = Utils.parseHexString(iv);
      if (!hexBytes) throw new Error('无效的Hex IV');
      return CryptoJS.enc.Hex.parse(Utils.bytesToHex(hexBytes, ''));
    }
    return CryptoJS.enc.Utf8.parse(iv);
  }
})();
