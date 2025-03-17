/**
 * 认证管理模块
 *
 * 负责API密钥的存储、验证和管理。
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

/**
 * 认证管理器类
 */
class AuthManager {
  /**
   * 创建认证管理器实例
   * @param {Object} options - 选项
   * @param {string} options.configPath - 配置路径
   * @param {Object} options.logger - 日志记录器
   * @param {Object} options.errorHandler - 错误处理器
   */
  constructor(options = {}) {
    this.configPath =
      options.configPath || path.join(os.homedir(), ".claude-cli");
    this.keysPath = path.join(this.configPath, "keys.json");
    this.logger = options.logger;
    this.errorHandler = options.errorHandler;
    this.currentKey = null;
    this.encryptionKey = this._getEncryptionKey();

    // 确保配置目录存在
    this._ensureDirectoryExists(this.configPath);
  }

  /**
   * 获取加密密钥
   * @private
   * @returns {Buffer} - 加密密钥
   */
  _getEncryptionKey() {
    // 使用与计算机相关的唯一标识符作为密钥的基础
    const machineId = this._getMachineId();
    return crypto.createHash("sha256").update(machineId).digest();
  }

  /**
   * 获取机器ID
   * @private
   * @returns {string} - 机器ID
   */
  _getMachineId() {
    // 组合多个系统特定值以创建相对唯一的标识符
    return [
      os.hostname(),
      os.platform(),
      os.arch(),
      os.cpus()[0].model,
      os.userInfo().username,
    ].join("|");
  }

  /**
   * 确保目录存在
   * @private
   * @param {string} directory - 目录路径
   */
  _ensureDirectoryExists(directory) {
    if (!fs.existsSync(directory)) {
      try {
        fs.mkdirSync(directory, { recursive: true });
        if (this.logger) {
          this.logger.debug(`创建目录: ${directory}`);
        }
      } catch (error) {
        if (this.logger) {
          this.logger.error(`创建目录失败: ${error.message}`);
        }
        throw error;
      }
    }
  }

  /**
   * 加密API密钥
   * @private
   * @param {string} apiKey - API密钥
   * @returns {string} - 加密后的API密钥
   */
  _encryptApiKey(apiKey) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        "aes-256-cbc",
        this.encryptionKey,
        iv
      );
      let encrypted = cipher.update(apiKey, "utf8", "hex");
      encrypted += cipher.final("hex");
      return `${iv.toString("hex")}:${encrypted}`;
    } catch (error) {
      if (this.logger) {
        this.logger.error(`加密API密钥失败: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 解密API密钥
   * @private
   * @param {string} encryptedApiKey - 加密后的API密钥
   * @returns {string} - 解密后的API密钥
   */
  _decryptApiKey(encryptedApiKey) {
    try {
      const [ivHex, encryptedHex] = encryptedApiKey.split(":");
      const iv = Buffer.from(ivHex, "hex");
      const decipher = crypto.createDecipheriv(
        "aes-256-cbc",
        this.encryptionKey,
        iv
      );
      let decrypted = decipher.update(encryptedHex, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (error) {
      if (this.logger) {
        this.logger.error(`解密API密钥失败: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 加载API密钥
   * @private
   * @returns {Object} - 存储的API密钥
   */
  _loadKeys() {
    try {
      if (!fs.existsSync(this.keysPath)) {
        if (this.logger) {
          this.logger.debug(`密钥文件不存在，创建新的: ${this.keysPath}`);
        }
        return { keys: {} };
      }

      const data = fs.readFileSync(this.keysPath, "utf8");
      return JSON.parse(data);
    } catch (error) {
      if (this.logger) {
        this.logger.error(`加载API密钥失败: ${error.message}`);
      }

      if (this.errorHandler) {
        throw this.errorHandler.createConfigurationError(
          `加载API密钥失败: ${error.message}`,
          { path: this.keysPath }
        );
      }

      throw error;
    }
  }

  /**
   * 保存API密钥
   * @private
   * @param {Object} keys - API密钥对象
   */
  _saveKeys(keys) {
    try {
      const data = JSON.stringify(keys, null, 2);
      fs.writeFileSync(this.keysPath, data, "utf8");

      if (this.logger) {
        this.logger.debug(`已保存API密钥到: ${this.keysPath}`);
      }
    } catch (error) {
      if (this.logger) {
        this.logger.error(`保存API密钥失败: ${error.message}`);
      }

      if (this.errorHandler) {
        throw this.errorHandler.createConfigurationError(
          `保存API密钥失败: ${error.message}`,
          { path: this.keysPath }
        );
      }

      throw error;
    }
  }

  /**
   * 添加API密钥
   * @param {string} name - 密钥名称
   * @param {string} apiKey - API密钥
   * @param {boolean} setAsCurrent - 是否设置为当前密钥
   */
  addKey(name, apiKey, setAsCurrent = true) {
    if (!name || !apiKey) {
      if (this.errorHandler) {
        throw this.errorHandler.createValidationError("名称和API密钥不能为空");
      } else {
        throw new Error("名称和API密钥不能为空");
      }
    }

    // 验证API密钥格式
    if (!this._validateApiKey(apiKey)) {
      if (this.errorHandler) {
        throw this.errorHandler.createValidationError("无效的API密钥格式");
      } else {
        throw new Error("无效的API密钥格式");
      }
    }

    const keys = this._loadKeys();
    const encryptedKey = this._encryptApiKey(apiKey);

    keys.keys[name] = {
      key: encryptedKey,
      createdAt: new Date().toISOString(),
    };

    if (setAsCurrent || !keys.current) {
      keys.current = name;
      this.currentKey = apiKey;
    }

    this._saveKeys(keys);

    if (this.logger) {
      this.logger.info(`已添加API密钥: ${name}`);
    }

    return true;
  }

  /**
   * 移除API密钥
   * @param {string} name - 密钥名称
   */
  removeKey(name) {
    const keys = this._loadKeys();

    if (!keys.keys[name]) {
      if (this.logger) {
        this.logger.warn(`API密钥不存在: ${name}`);
      }
      return false;
    }

    delete keys.keys[name];

    // 如果删除的是当前密钥，重置当前密钥
    if (keys.current === name) {
      const remainingKeys = Object.keys(keys.keys);
      keys.current = remainingKeys.length > 0 ? remainingKeys[0] : null;
      this.currentKey = null;

      if (keys.current) {
        this.currentKey = this._decryptApiKey(keys.keys[keys.current].key);
      }
    }

    this._saveKeys(keys);

    if (this.logger) {
      this.logger.info(`已移除API密钥: ${name}`);
    }

    return true;
  }

  /**
   * 获取当前API密钥
   * @returns {string|null} - 当前API密钥
   */
  getCurrentKey() {
    // 如果已经有当前密钥，直接返回
    if (this.currentKey) {
      return this.currentKey;
    }

    const keys = this._loadKeys();

    if (!keys.current || !keys.keys[keys.current]) {
      if (this.logger) {
        this.logger.warn("未设置当前API密钥");
      }
      return null;
    }

    try {
      this.currentKey = this._decryptApiKey(keys.keys[keys.current].key);
      return this.currentKey;
    } catch (error) {
      if (this.logger) {
        this.logger.error(`获取当前API密钥失败: ${error.message}`);
      }

      if (this.errorHandler) {
        throw this.errorHandler.createAuthenticationError(
          "获取当前API密钥失败",
          { name: keys.current }
        );
      }

      throw error;
    }
  }

  /**
   * 设置当前API密钥
   * @param {string} name - 密钥名称
   */
  setCurrentKey(name) {
    const keys = this._loadKeys();

    if (!keys.keys[name]) {
      if (this.logger) {
        this.logger.warn(`API密钥不存在: ${name}`);
      }

      if (this.errorHandler) {
        throw this.errorHandler.createValidationError(
          `API密钥不存在: ${name}`,
          { availableKeys: Object.keys(keys.keys) }
        );
      }

      throw new Error(`API密钥不存在: ${name}`);
    }

    keys.current = name;
    this._saveKeys(keys);

    // 更新当前密钥缓存
    this.currentKey = this._decryptApiKey(keys.keys[name].key);

    if (this.logger) {
      this.logger.info(`已设置当前API密钥: ${name}`);
    }

    return true;
  }

  /**
   * 列出所有API密钥
   * @returns {Object} - 密钥列表
   */
  listKeys() {
    const keys = this._loadKeys();
    const result = {
      current: keys.current,
      keys: {},
    };

    // 不返回加密的密钥内容，只返回元数据
    for (const name in keys.keys) {
      result.keys[name] = {
        createdAt: keys.keys[name].createdAt,
        isCurrent: name === keys.current,
      };
    }

    return result;
  }

  /**
   * 验证API密钥
   * @param {string} apiKey - 要验证的API密钥
   * @returns {boolean} - 是否有效
   */
  _validateApiKey(apiKey) {
    // 基本格式验证：Anthropic API密钥通常以"sk-"开头，后跟一组字符
    return (
      typeof apiKey === "string" &&
      apiKey.startsWith("sk-") &&
      apiKey.length > 10
    );
  }

  /**
   * 验证当前API密钥是否有效
   * @returns {boolean} - 是否有效
   */
  hasValidKey() {
    try {
      const key = this.getCurrentKey();
      return key !== null && this._validateApiKey(key);
    } catch (error) {
      if (this.logger) {
        this.logger.error(`验证API密钥失败: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * 从环境变量中获取API密钥
   * @param {Array<string>} envVars - 环境变量名数组
   * @returns {string|null} - API密钥
   */
  getKeyFromEnvironment(envVars = ["ANTHROPIC_API_KEY", "CLAUDE_API_KEY"]) {
    for (const envVar of envVars) {
      const apiKey = process.env[envVar];
      if (apiKey && this._validateApiKey(apiKey)) {
        if (this.logger) {
          this.logger.debug(`从环境变量 ${envVar} 获取API密钥`);
        }
        return apiKey;
      }
    }

    return null;
  }

  /**
   * 获取API密钥（优先使用存储的密钥，然后尝试环境变量）
   * @returns {string|null} - API密钥
   */
  getApiKey() {
    // 先尝试获取当前存储的密钥
    const storedKey = this.getCurrentKey();
    if (storedKey) {
      return storedKey;
    }

    // 然后尝试从环境变量获取
    const envKey = this.getKeyFromEnvironment();
    if (envKey) {
      return envKey;
    }

    if (this.logger) {
      this.logger.warn("未找到有效的API密钥");
    }

    return null;
  }
}

module.exports = AuthManager;
