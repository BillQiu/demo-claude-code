/**
 * 日志记录器
 *
 * 提供一个统一的接口来记录应用程序日志，支持多个日志级别和输出目标。
 */

const util = require("util");
const fs = require("fs");
const path = require("path");
const os = require("os");

// 日志级别定义
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4,
};

// 日志级别颜色（用于终端输出）
const LEVEL_COLORS = {
  error: "\x1b[31m", // 红色
  warn: "\x1b[33m", // 黄色
  info: "\x1b[36m", // 青色
  debug: "\x1b[32m", // 绿色
  trace: "\x1b[90m", // 灰色
  reset: "\x1b[0m", // 重置
};

/**
 * 日志记录器类
 */
class Logger {
  /**
   * 构造函数
   * @param {string} level - 日志级别 ('error', 'warn', 'info', 'debug', 'trace')
   * @param {Object} options - 其他选项
   */
  constructor(level = "info", options = {}) {
    this.level = LOG_LEVELS[level.toLowerCase()] || LOG_LEVELS.info;
    this.options = {
      timestamp: true,
      colorize: true,
      logToFile: false,
      logDir: path.join(os.homedir(), ".claude-cli", "logs"),
      logFilename: "claude-cli.log",
      maxLogFileSize: 10 * 1024 * 1024, // 10MB
      ...options,
    };

    // 日志文件流
    this.fileStream = null;

    // 初始化文件日志（如果启用）
    if (this.options.logToFile) {
      this._initFileLogging();
    }
  }

  /**
   * 初始化文件日志
   * @private
   */
  _initFileLogging() {
    try {
      // 确保日志目录存在
      if (!fs.existsSync(this.options.logDir)) {
        fs.mkdirSync(this.options.logDir, { recursive: true });
      }

      const logFilePath = path.join(
        this.options.logDir,
        this.options.logFilename
      );

      // 创建可写流
      this.fileStream = fs.createWriteStream(logFilePath, { flags: "a" });

      // 处理可写流错误
      this.fileStream.on("error", (error) => {
        console.error(`Error writing to log file: ${error.message}`);
        this.fileStream = null;
      });
    } catch (error) {
      console.error(`Failed to initialize file logging: ${error.message}`);
    }
  }

  /**
   * 关闭日志记录器
   */
  close() {
    if (this.fileStream) {
      this.fileStream.end();
      this.fileStream = null;
    }
  }

  /**
   * 格式化日志消息
   * @private
   * @param {string} level - 日志级别
   * @param {string} message - 日志消息
   * @param {boolean} includeColor - 是否包含颜色
   * @returns {string} - 格式化后的日志消息
   */
  _formatMessage(level, message, includeColor = false) {
    const parts = [];

    // 时间戳
    if (this.options.timestamp) {
      parts.push(new Date().toISOString());
    }

    // 日志级别
    if (includeColor && this.options.colorize) {
      parts.push(
        `${LEVEL_COLORS[level]}${level.toUpperCase()}${LEVEL_COLORS.reset}`
      );
    } else {
      parts.push(level.toUpperCase());
    }

    // 日志消息
    parts.push(message);

    return parts.join(" ");
  }

  /**
   * 写入日志
   * @private
   * @param {string} level - 日志级别
   * @param {Array<any>} args - 日志参数
   */
  _log(level, ...args) {
    // 检查日志级别是否应该被记录
    if (LOG_LEVELS[level] > this.level) {
      return;
    }

    // 格式化消息
    const message = util.format(...args);

    // 控制台输出
    const consoleOutput = this._formatMessage(level, message, true);

    // 选择适当的控制台方法
    if (level === "error") {
      console.error(consoleOutput);
    } else if (level === "warn") {
      console.warn(consoleOutput);
    } else {
      console.log(consoleOutput);
    }

    // 文件输出
    if (this.fileStream) {
      const fileOutput = this._formatMessage(level, message, false);
      this.fileStream.write(`${fileOutput}\n`);
    }
  }

  /**
   * 记录错误级别日志
   * @param {...any} args - 日志参数
   */
  error(...args) {
    this._log("error", ...args);
  }

  /**
   * 记录警告级别日志
   * @param {...any} args - 日志参数
   */
  warn(...args) {
    this._log("warn", ...args);
  }

  /**
   * 记录信息级别日志
   * @param {...any} args - 日志参数
   */
  info(...args) {
    this._log("info", ...args);
  }

  /**
   * 记录调试级别日志
   * @param {...any} args - 日志参数
   */
  debug(...args) {
    this._log("debug", ...args);
  }

  /**
   * 记录跟踪级别日志
   * @param {...any} args - 日志参数
   */
  trace(...args) {
    this._log("trace", ...args);
  }

  /**
   * 设置日志级别
   * @param {string} level - 日志级别
   */
  setLevel(level) {
    this.level = LOG_LEVELS[level.toLowerCase()] || this.level;
  }
}

module.exports = Logger;
