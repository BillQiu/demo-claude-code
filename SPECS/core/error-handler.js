/**
 * 错误处理器
 *
 * 负责处理应用程序中的各种错误，包括异常捕获、格式化和报告。
 */

/**
 * 自定义错误类，用作所有Claude CLI错误的基类
 */
class ClaudeCliError extends Error {
  /**
   * 构造函数
   * @param {string} message - 错误消息
   * @param {string} code - 错误代码
   * @param {Object} data - 附加数据
   */
  constructor(message, code = "UNKNOWN_ERROR", data = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.data = data;

    // 捕获堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * 将错误转换为可读的字符串
   * @returns {string}
   */
  toString() {
    return `${this.name} [${this.code}]: ${this.message}`;
  }

  /**
   * 将错误转换为JSON对象
   * @returns {Object}
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      stack: this.stack,
      data: this.data,
    };
  }
}

/**
 * 网络错误
 */
class NetworkError extends ClaudeCliError {
  constructor(message, data = {}) {
    super(message, "NETWORK_ERROR", data);
  }
}

/**
 * API错误
 */
class ApiError extends ClaudeCliError {
  constructor(message, statusCode, data = {}) {
    super(message, "API_ERROR", { statusCode, ...data });
    this.statusCode = statusCode;
  }
}

/**
 * 认证错误
 */
class AuthenticationError extends ClaudeCliError {
  constructor(message, data = {}) {
    super(message, "AUTHENTICATION_ERROR", data);
  }
}

/**
 * 配置错误
 */
class ConfigurationError extends ClaudeCliError {
  constructor(message, data = {}) {
    super(message, "CONFIGURATION_ERROR", data);
  }
}

/**
 * 输入验证错误
 */
class ValidationError extends ClaudeCliError {
  constructor(message, data = {}) {
    super(message, "VALIDATION_ERROR", data);
  }
}

/**
 * 命令执行错误
 */
class CommandError extends ClaudeCliError {
  constructor(message, data = {}) {
    super(message, "COMMAND_ERROR", data);
  }
}

/**
 * 错误处理器类
 */
class ErrorHandler {
  /**
   * 构造函数
   * @param {Object} options - 选项
   * @param {Object} options.logger - 日志记录器实例
   * @param {boolean} options.exitOnUncaughtException - 是否在未捕获的异常上退出
   */
  constructor(options = {}) {
    this.logger = options.logger || console;
    this.exitOnUncaughtException = options.exitOnUncaughtException !== false;
  }

  /**
   * 处理未捕获的异常
   * @param {Error} error - 错误对象
   */
  handleUncaughtException(error) {
    this.logger.error("Uncaught Exception:");
    this._logError(error);

    if (this.exitOnUncaughtException) {
      process.exit(1);
    }
  }

  /**
   * 处理未处理的Promise拒绝
   * @param {*} reason - 拒绝原因
   * @param {Promise} promise - 被拒绝的Promise
   */
  handleUnhandledRejection(reason, promise) {
    this.logger.error("Unhandled Promise Rejection:");

    if (reason instanceof Error) {
      this._logError(reason);
    } else {
      this.logger.error("Reason:", reason);
    }
  }

  /**
   * 格式化并记录错误
   * @private
   * @param {Error} error - 错误对象
   */
  _logError(error) {
    if (error instanceof ClaudeCliError) {
      this.logger.error(`${error.name} [${error.code}]:`, error.message);

      if (Object.keys(error.data).length > 0) {
        this.logger.error(
          "Additional data:",
          JSON.stringify(error.data, null, 2)
        );
      }
    } else {
      this.logger.error(error.stack || error.toString());
    }
  }

  /**
   * 创建适当类型的错误
   * @param {string} type - 错误类型
   * @param {string} message - 错误消息
   * @param {Object} data - 附加数据
   * @returns {ClaudeCliError} - 错误实例
   */
  createError(type, message, data = {}) {
    switch (type.toLowerCase()) {
      case "network":
        return new NetworkError(message, data);
      case "api":
        return new ApiError(message, data.statusCode, data);
      case "authentication":
        return new AuthenticationError(message, data);
      case "configuration":
        return new ConfigurationError(message, data);
      case "validation":
        return new ValidationError(message, data);
      case "command":
        return new CommandError(message, data);
      default:
        return new ClaudeCliError(message, type.toUpperCase() + "_ERROR", data);
    }
  }

  /**
   * 处理给定的错误
   * @param {Error} error - 错误对象
   * @param {boolean} exit - 是否在处理错误后退出
   * @param {number} exitCode - 退出代码
   */
  handleError(error, exit = false, exitCode = 1) {
    this._logError(error);

    if (exit) {
      process.exit(exitCode);
    }
  }
}

// 导出错误类和处理器
module.exports = ErrorHandler;
module.exports.ClaudeCliError = ClaudeCliError;
module.exports.NetworkError = NetworkError;
module.exports.ApiError = ApiError;
module.exports.AuthenticationError = AuthenticationError;
module.exports.ConfigurationError = ConfigurationError;
module.exports.ValidationError = ValidationError;
module.exports.CommandError = CommandError;
