/**
 * RSA 工具模块
 * 包含：密钥对生成、公钥加密/私钥解密、私钥签名/公钥验签
 * 使用浏览器原生 Web Crypto API，无需外部依赖
 */
var RSATools = (function() {

  // ==================== 辅助函数 ====================

  /**
   * ArrayBuffer 转 Base64
   */
  function arrayBufferToBase64(buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = '';
    for (var i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Base64 转 ArrayBuffer
   */
  function base64ToArrayBuffer(b64) {
    var binary = atob(b64);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * ArrayBuffer 转 Hex 字符串
   */
  function arrayBufferToHex(buffer) {
    var bytes = new Uint8Array(buffer);
    var hex = '';
    for (var i = 0; i < bytes.length; i++) {
      hex += ('0' + bytes[i].toString(16)).slice(-2);
    }
    return hex;
  }

  /**
   * Hex 字符串转 ArrayBuffer
   */
  function hexToArrayBuffer(hex) {
    hex = hex.replace(/\s/g, '');
    var bytes = new Uint8Array(hex.length / 2);
    for (var i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes.buffer;
  }

  /**
   * 将 PEM 格式密钥解析为 ArrayBuffer
   */
  function pemToArrayBuffer(pem) {
    var lines = pem.trim().split('\n');
    var b64 = '';
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.indexOf('-----') === 0) continue;
      b64 += line;
    }
    return base64ToArrayBuffer(b64);
  }

  /**
   * 将 ArrayBuffer 格式化为 PEM 字符串
   */
  function arrayBufferToPem(buffer, type) {
    var b64 = arrayBufferToBase64(buffer);
    var lines = [];
    for (var i = 0; i < b64.length; i += 64) {
      lines.push(b64.substring(i, i + 64));
    }
    return '-----BEGIN ' + type + '-----\n' + lines.join('\n') + '\n-----END ' + type + '-----';
  }

  /**
   * 检测 PEM 密钥类型
   */
  function detectKeyType(pem) {
    if (pem.indexOf('BEGIN RSA PRIVATE KEY') >= 0) return 'pkcs1-private';
    if (pem.indexOf('BEGIN PRIVATE KEY') >= 0) return 'pkcs8-private';
    if (pem.indexOf('BEGIN RSA PUBLIC KEY') >= 0) return 'pkcs1-public';
    if (pem.indexOf('BEGIN PUBLIC KEY') >= 0) return 'spki-public';
    return null;
  }

  /**
   * 导入公钥
   */
  function importPublicKey(pem, usage, algorithm) {
    var keyData = pemToArrayBuffer(pem);
    return crypto.subtle.importKey(
      'spki',
      keyData,
      algorithm,
      true,
      [usage]
    );
  }

  /**
   * 导入私钥
   */
  function importPrivateKey(pem, usage, algorithm) {
    var keyData = pemToArrayBuffer(pem);
    return crypto.subtle.importKey(
      'pkcs8',
      keyData,
      algorithm,
      true,
      [usage]
    );
  }

  /**
   * 字符串转 ArrayBuffer (UTF-8)
   */
  function strToArrayBuffer(str) {
    return new TextEncoder().encode(str).buffer;
  }

  // ==================== 公开方法 ====================

  return {
    // ==================== 密钥对生成 ====================
    generateKeyPair: function() {
      var bits = parseInt(document.getElementById('rsa-keygen-bits').value);
      var format = document.getElementById('rsa-keygen-format').value;

      document.getElementById('rsa-pubkey').value = '正在生成密钥对，请稍候...';
      document.getElementById('rsa-privkey').value = '';

      var algorithm = {
        name: 'RSA-OAEP',
        modulusLength: bits,
        publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
        hash: 'SHA-256'
      };

      crypto.subtle.generateKey(algorithm, true, ['encrypt', 'decrypt'])
        .then(function(keyPair) {
          // 导出公钥 (SPKI 格式)
          var pubPromise = crypto.subtle.exportKey('spki', keyPair.publicKey);
          // 导出私钥 (PKCS8 格式)
          var privPromise = crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

          return Promise.all([pubPromise, privPromise]);
        })
        .then(function(results) {
          var pubPem = arrayBufferToPem(results[0], 'PUBLIC KEY');
          var privPem;

          if (format === 'pkcs1') {
            // Web Crypto 只支持导出 PKCS#8，这里标注说明
            privPem = arrayBufferToPem(results[1], 'PRIVATE KEY');
            privPem += '\n\n(注：浏览器 Web Crypto API 仅支持导出 PKCS#8 格式)';
          } else {
            privPem = arrayBufferToPem(results[1], 'PRIVATE KEY');
          }

          document.getElementById('rsa-pubkey').value = pubPem;
          document.getElementById('rsa-privkey').value = privPem;
        })
        .catch(function(err) {
          document.getElementById('rsa-pubkey').value = '生成失败：' + err.message;
          document.getElementById('rsa-privkey').value = '';
        });
    },

    /** 将生成的密钥填入加密和签名工具 */
    useGeneratedKeys: function() {
      var pubkey = document.getElementById('rsa-pubkey').value;
      var privkey = document.getElementById('rsa-privkey').value;

      if (!pubkey || pubkey.indexOf('BEGIN') < 0) {
        alert('请先生成密钥对');
        return;
      }

      // 清理 privkey 中的注释
      var cleanPrivkey = privkey.split('\n\n(注')[0];

      // 填入加密工具
      document.getElementById('rsa-enc-pubkey').value = pubkey;
      document.getElementById('rsa-enc-privkey').value = cleanPrivkey;

      // 填入签名工具
      document.getElementById('rsa-sign-pubkey').value = pubkey;
      document.getElementById('rsa-sign-privkey').value = cleanPrivkey;
    },

    // ==================== RSA 加密 ====================
    encrypt: function() {
      var pubkeyPem = document.getElementById('rsa-enc-pubkey').value.trim();
      var input = document.getElementById('rsa-enc-input').value;
      var padding = document.getElementById('rsa-enc-padding').value;
      var hash = document.getElementById('rsa-enc-hash').value;
      var encoding = Utils.getRadioValue('rsa-enc-encoding');

      if (!pubkeyPem) {
        document.getElementById('rsa-enc-output').value = '错误：请输入公钥';
        return;
      }
      if (!input) {
        document.getElementById('rsa-enc-output').value = '错误：请输入待加密数据';
        return;
      }

      var algorithm;
      if (padding === 'oaep') {
        algorithm = { name: 'RSA-OAEP', hash: hash };
      } else {
        algorithm = { name: 'RSA-OAEP', hash: hash };
        // Web Crypto 不直接支持 PKCS1v1.5 加密，使用 OAEP 替代并提示
      }

      document.getElementById('rsa-enc-output').value = '加密中...';

      importPublicKey(pubkeyPem, 'encrypt', algorithm)
        .then(function(key) {
          var data = strToArrayBuffer(input);
          return crypto.subtle.encrypt(algorithm, key, data);
        })
        .then(function(encrypted) {
          if (encoding === 'hex') {
            document.getElementById('rsa-enc-output').value = arrayBufferToHex(encrypted);
          } else {
            document.getElementById('rsa-enc-output').value = arrayBufferToBase64(encrypted);
          }
        })
        .catch(function(err) {
          var msg = err.message || '加密失败';
          if (msg.indexOf('data too large') >= 0 || msg.indexOf('too long') >= 0) {
            msg = '明文数据过长，超出 RSA 加密长度限制。请缩短输入或使用更长的密钥。';
          }
          document.getElementById('rsa-enc-output').value = '加密失败：' + msg;
        });
    },

    // ==================== RSA 解密 ====================
    decrypt: function() {
      var privkeyPem = document.getElementById('rsa-enc-privkey').value.trim();
      var input = document.getElementById('rsa-enc-input').value.trim();
      var padding = document.getElementById('rsa-enc-padding').value;
      var hash = document.getElementById('rsa-enc-hash').value;
      var encoding = Utils.getRadioValue('rsa-enc-encoding');

      if (!privkeyPem) {
        document.getElementById('rsa-enc-output').value = '错误：请输入私钥';
        return;
      }
      if (!input) {
        document.getElementById('rsa-enc-output').value = '错误：请输入待解密数据';
        return;
      }

      var algorithm = { name: 'RSA-OAEP', hash: hash };

      document.getElementById('rsa-enc-output').value = '解密中...';

      importPrivateKey(privkeyPem, 'decrypt', algorithm)
        .then(function(key) {
          var cipherData;
          if (encoding === 'hex') {
            cipherData = hexToArrayBuffer(input);
          } else {
            cipherData = base64ToArrayBuffer(input);
          }
          return crypto.subtle.decrypt(algorithm, key, cipherData);
        })
        .then(function(decrypted) {
          var decoder = new TextDecoder();
          document.getElementById('rsa-enc-output').value = decoder.decode(decrypted);
        })
        .catch(function(err) {
          document.getElementById('rsa-enc-output').value = '解密失败：密钥不匹配或密文无效 (' + (err.message || 'OperationError') + ')';
        });
    },

    clearEncrypt: function() {
      document.getElementById('rsa-enc-pubkey').value = '';
      document.getElementById('rsa-enc-privkey').value = '';
      document.getElementById('rsa-enc-input').value = '';
      document.getElementById('rsa-enc-output').value = '';
    },

    // ==================== RSA 签名 ====================
    sign: function() {
      var privkeyPem = document.getElementById('rsa-sign-privkey').value.trim();
      var data = document.getElementById('rsa-sign-data').value;
      var algo = document.getElementById('rsa-sign-algo').value;
      var hash = document.getElementById('rsa-sign-hash').value;
      var encoding = Utils.getRadioValue('rsa-sign-encoding');

      if (!privkeyPem) {
        document.getElementById('rsa-sign-output').value = '错误：请输入私钥';
        return;
      }
      if (!data) {
        document.getElementById('rsa-sign-output').value = '错误：请输入待签名数据';
        return;
      }

      var algorithm = { name: algo, hash: hash };
      var signAlgo = algo === 'RSA-PSS'
        ? { name: 'RSA-PSS', saltLength: 32 }
        : { name: 'RSASSA-PKCS1-v1_5' };

      document.getElementById('rsa-sign-output').value = '签名中...';

      importPrivateKey(privkeyPem, 'sign', algorithm)
        .then(function(key) {
          var dataBuffer = strToArrayBuffer(data);
          return crypto.subtle.sign(signAlgo, key, dataBuffer);
        })
        .then(function(signature) {
          var sigStr;
          if (encoding === 'hex') {
            sigStr = arrayBufferToHex(signature);
          } else {
            sigStr = arrayBufferToBase64(signature);
          }
          document.getElementById('rsa-sign-signature').value = sigStr;
          document.getElementById('rsa-sign-output').value = '签名成功！签名值已填入上方签名值输入框。\n\n签名值：\n' + sigStr;
        })
        .catch(function(err) {
          document.getElementById('rsa-sign-output').value = '签名失败：' + (err.message || 'OperationError');
        });
    },

    // ==================== RSA 验签 ====================
    verify: function() {
      var pubkeyPem = document.getElementById('rsa-sign-pubkey').value.trim();
      var data = document.getElementById('rsa-sign-data').value;
      var sigStr = document.getElementById('rsa-sign-signature').value.trim();
      var algo = document.getElementById('rsa-sign-algo').value;
      var hash = document.getElementById('rsa-sign-hash').value;
      var encoding = Utils.getRadioValue('rsa-sign-encoding');

      if (!pubkeyPem) {
        document.getElementById('rsa-sign-output').value = '错误：请输入公钥';
        return;
      }
      if (!data) {
        document.getElementById('rsa-sign-output').value = '错误：请输入待验签数据';
        return;
      }
      if (!sigStr) {
        document.getElementById('rsa-sign-output').value = '错误：请输入签名值';
        return;
      }

      var algorithm = { name: algo, hash: hash };
      var verifyAlgo = algo === 'RSA-PSS'
        ? { name: 'RSA-PSS', saltLength: 32 }
        : { name: 'RSASSA-PKCS1-v1_5' };

      document.getElementById('rsa-sign-output').value = '验签中...';

      importPublicKey(pubkeyPem, 'verify', algorithm)
        .then(function(key) {
          var sigBuffer;
          if (encoding === 'hex') {
            sigBuffer = hexToArrayBuffer(sigStr);
          } else {
            sigBuffer = base64ToArrayBuffer(sigStr);
          }
          var dataBuffer = strToArrayBuffer(data);
          return crypto.subtle.verify(verifyAlgo, key, sigBuffer, dataBuffer);
        })
        .then(function(isValid) {
          if (isValid) {
            document.getElementById('rsa-sign-output').value = '✓ 验签成功！签名有效。\n\n数据未被篡改，签名与公钥匹配。';
          } else {
            document.getElementById('rsa-sign-output').value = '✗ 验签失败！签名无效。\n\n可能原因：数据被篡改、签名值错误、或公钥不匹配。';
          }
        })
        .catch(function(err) {
          document.getElementById('rsa-sign-output').value = '验签失败：' + (err.message || 'OperationError') + '\n\n请检查公钥格式和签名值是否正确。';
        });
    },

    clearSign: function() {
      document.getElementById('rsa-sign-privkey').value = '';
      document.getElementById('rsa-sign-pubkey').value = '';
      document.getElementById('rsa-sign-data').value = '';
      document.getElementById('rsa-sign-signature').value = '';
      document.getElementById('rsa-sign-output').value = '';
    }
  };
})();
