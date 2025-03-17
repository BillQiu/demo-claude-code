/**
 * 配置管理器
 *
 * 负责加载、验证和提供配置信息。配置可以来自环境变量、配置文件和命令行参数。
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const util = require("util");

// 将fs.readFile转换为Promise版本
const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);
const mkdirAsync = util.promisify(fs.mkdir);

/**
 * 配置管理器类
 */
class ConfigManager {
  /**
   * 构造函数
   * @param {Object} options - 配置选项
   */
  constructor(options = {}) {
    this.options = options;

    // 配置数据
    this.data = {};

    // 默认配置
    this.defaults = {
      apiUrl: "https://api.anthropic.com",
      timeout: 30000,
      maxRetries: 3,
      logLevel: "info",
      configPath: path.join(os.homedir(), ".claude-cli", "config.json"),
    };

    // 配置文件路径
    this.configPath = options.configPath || this.defaults.configPath;

    // 是否已加载配置
    this.loaded = false;
  }

  /**
   * 加载配置
   * @returns {Promise<void>}
   */
  async load() {
    if (this.loaded) {
      return;
    }

    // 从默认配置开始
    this.data = { ...this.defaults };

    // 尝试从配置文件加载
    try {
      await this._loadFromFile();
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.warn(`Warning: Failed to load config file: ${error.message}`);
      }
    }

    // 从环境变量加载
    this._loadFromEnvironment();

    // 标记为已加载
    this.loaded = true;
  }

  /**
   * 从配置文件加载配置
   * @private
   * @returns {Promise<void>}
   */
  async _loadFromFile() {
    const configContent = await readFileAsync(this.configPath, "utf8");
    const fileConfig = JSON.parse(configContent);

    // 合并配置
    this.data = {
      ...this.data,
      ...fileConfig,
    };
  }

  /**
   * 从环境变量加载配置
   * @private
   */
  _loadFromEnvironment() {
    const envPrefix = "CLAUDE_";

    // 环境变量映射
    const envMap = {
      CLAUDE_API_URL: "apiUrl",
      CLAUDE_API_KEY: "apiKey",
      CLAUDE_TIMEOUT: "timeout",
      CLAUDE_MAX_RETRIES: "maxRetries",
      CLAUDE_LOG_LEVEL: "logLevel",
    };

    // 处理已知的环境变量
    for (const [envName, configKey] of Object.entries(envMap)) {
      if (process.env[envName] !== undefined) {
        this.data[configKey] = process.env[envName];

        // 转换数字类型
        if (configKey === "timeout" || configKey === "maxRetries") {
          this.data[configKey] = parseInt(this.data[configKey], 10);
        }
      }
    }

    // 处理其他以CLAUDE_开头的环境变量
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(envPrefix) && !envMap[key]) {
        // 转换环境变量名称为驼峰式
        const configKey = key
          .slice(envPrefix.length)
          .toLowerCase()
          .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

        if (configKey) {
          this.data[configKey] = value;
        }
      }
    }
  }

  /**
   * 保存配置到文件
   * @returns {Promise<void>}
   */
  async save() {
    try {
      // 确保目录存在
      const configDir = path.dirname(this.configPath);
      await mkdirAsync(configDir, { recursive: true });

      // 写入配置文件
      await writeFileAsync(
        this.configPath,
        JSON.stringify(this.data, null, 2),
        "utf8"
      );
    } catch (error) {
      throw new Error(`Failed to save config: ${error.message}`);
    }
  }

  /**
   * 获取配置值
   * @param {string} key - 配置键
   * @param {*} defaultValue - 默认值（如果配置不存在）
   * @returns {*}
   */
  get(key, defaultValue) {
    if (key in this.data) {
      return this.data[key];
    }
    return defaultValue;
  }

  /**
   * 设置配置值
   * @param {string} key - 配置键
   * @param {*} value - 配置值
   */
  set(key, value) {
    this.data[key] = value;
  }

  /**
   * 获取完整的配置对象
   * @returns {Object}
   */
  getAll() {
    return { ...this.data };
  }

  /**
   * 重置配置为默认值
   */
  reset() {
    this.data = { ...this.defaults };
  }
}

module.exports = ConfigManager;
