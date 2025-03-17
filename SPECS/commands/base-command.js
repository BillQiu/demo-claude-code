/**
 * 基础命令类
 *
 * 所有命令的基类，提供通用方法和属性。
 */

/**
 * 基础命令类
 */
class BaseCommand {
  /**
   * 创建命令实例
   * @param {Object} options - 选项
   * @param {Object} options.config - 配置管理器
   * @param {Object} options.logger - 日志记录器
   * @param {Object} options.api - API客户端
   * @param {Object} options.auth - 认证管理器
   * @param {Object} options.errorHandler - 错误处理器
   */
  constructor(options = {}) {
    // 命令元数据
    this.name = "";
    this.description = "";
    this.aliases = [];
    this.usage = "";
    this.examples = [];
    this.options = [];
    this.group = "";
    this.requiresAuth = false;

    // 依赖项
    this.config = options.config;
    this.logger = options.logger;
    this.api = options.api;
    this.auth = options.auth;
    this.errorHandler = options.errorHandler;
  }

  /**
   * 执行命令
   * @param {Array<string>} args - 命令参数
   * @param {Object} options - 命令选项
   * @param {string} subcommand - 子命令
   * @returns {Promise<*>} - 执行结果
   */
  async execute(args, options, subcommand) {
    // 子类必须实现此方法
    throw new Error("Command.execute() method not implemented");
  }

  /**
   * 解析布尔值选项
   * @param {Object} options - 命令选项
   * @param {string} name - 选项名称
   * @param {boolean} defaultValue - 默认值
   * @returns {boolean} - 解析结果
   */
  getBooleanOption(options, name, defaultValue = false) {
    if (options[name] === undefined) {
      return defaultValue;
    }

    if (typeof options[name] === "boolean") {
      return options[name];
    }

    const value = String(options[name]).toLowerCase();
    return value === "true" || value === "yes" || value === "1";
  }

  /**
   * 解析数字选项
   * @param {Object} options - 命令选项
   * @param {string} name - 选项名称
   * @param {number} defaultValue - 默认值
   * @returns {number} - 解析结果
   */
  getNumberOption(options, name, defaultValue = 0) {
    if (options[name] === undefined) {
      return defaultValue;
    }

    const value = Number(options[name]);
    return isNaN(value) ? defaultValue : value;
  }

  /**
   * 解析字符串选项
   * @param {Object} options - 命令选项
   * @param {string} name - 选项名称
   * @param {string} defaultValue - 默认值
   * @returns {string} - 解析结果
   */
  getStringOption(options, name, defaultValue = "") {
    return options[name] !== undefined ? String(options[name]) : defaultValue;
  }

  /**
   * 验证必填参数
   * @param {Array<string>} args - 命令参数
   * @param {number} count - 必填参数数量
   * @param {string} message - 错误消息
   */
  validateRequiredArgs(args, count, message) {
    if (args.length < count) {
      if (this.errorHandler) {
        throw this.errorHandler.createValidationError(
          message || `此命令需要至少 ${count} 个参数`,
          { args, requiredCount: count }
        );
      }

      throw new Error(message || `此命令需要至少 ${count} 个参数`);
    }
  }

  /**
   * 验证必填选项
   * @param {Object} options - 命令选项
   * @param {Array<string>} requiredOptions - 必填选项数组
   * @param {string} message - 错误消息
   */
  validateRequiredOptions(options, requiredOptions, message) {
    const missing = requiredOptions.filter(
      (option) => options[option] === undefined
    );

    if (missing.length > 0) {
      if (this.errorHandler) {
        throw this.errorHandler.createValidationError(
          message || `缺少必填选项: ${missing.join(", ")}`,
          { options, missing }
        );
      }

      throw new Error(message || `缺少必填选项: ${missing.join(", ")}`);
    }
  }

  /**
   * 获取命令帮助信息
   * @returns {string} - 帮助信息
   */
  getHelp() {
    let help = "";

    // 命令名称和描述
    help += `${this.name} - ${this.description}\n\n`;

    // 用法
    if (this.usage) {
      help += `用法: ${this.usage}\n\n`;
    }

    // 别名
    if (this.aliases && this.aliases.length > 0) {
      help += `别名: ${this.aliases.join(", ")}\n\n`;
    }

    // 选项
    if (this.options && this.options.length > 0) {
      help += "选项:\n";

      // 寻找最长的选项，用于对齐
      const maxOptionLength = Math.max(
        ...this.options.map((option) => option.flags.length)
      );

      // 显示每个选项
      for (const option of this.options) {
        const padding = " ".repeat(maxOptionLength - option.flags.length + 2);
        help += `  ${option.flags}${padding}${option.description}\n`;

        if (option.default !== undefined) {
          help += `${" ".repeat(maxOptionLength + 4)}默认值: ${
            option.default
          }\n`;
        }
      }

      help += "\n";
    }

    // 示例
    if (this.examples && this.examples.length > 0) {
      help += "示例:\n";

      for (const example of this.examples) {
        help += `  ${example}\n`;
      }
    }

    return help;
  }

  /**
   * 打印表格
   * @param {Array<Array<string>>} rows - 表格数据
   * @param {Object} options - 选项
   * @param {boolean} options.header - 是否包含表头
   * @param {string} options.style - 表格样式
   * @returns {string} - 格式化后的表格字符串
   */
  formatTable(rows, { header = true, style = "compact" } = {}) {
    if (!rows || rows.length === 0) {
      return "";
    }

    // 获取列宽
    const columnWidths = [];

    for (const row of rows) {
      for (let i = 0; i < row.length; i++) {
        const cellWidth = String(row[i]).length;
        if (!columnWidths[i] || cellWidth > columnWidths[i]) {
          columnWidths[i] = cellWidth;
        }
      }
    }

    // 生成表格
    let result = "";
    const headerRow = header ? rows[0] : null;
    const dataRows = header ? rows.slice(1) : rows;

    // 打印表头
    if (header) {
      result += this._formatTableRow(headerRow, columnWidths, style);

      // 打印分隔线
      if (style === "compact" || style === "grid") {
        result += "+";
        for (const width of columnWidths) {
          result += "-".repeat(width + 2) + "+";
        }
        result += "\n";
      }
    }

    // 打印数据行
    for (const row of dataRows) {
      result += this._formatTableRow(row, columnWidths, style);
    }

    return result;
  }

  /**
   * 格式化表格行
   * @private
   * @param {Array<string>} row - 行数据
   * @param {Array<number>} columnWidths - 列宽数组
   * @param {string} style - 表格样式
   * @returns {string} - 格式化后的行字符串
   */
  _formatTableRow(row, columnWidths, style) {
    let result = "";

    if (style === "grid" || style === "compact") {
      result += "|";
    }

    for (let i = 0; i < row.length; i++) {
      const cell = String(row[i]);
      const padding = " ".repeat(columnWidths[i] - cell.length);

      if (style === "grid" || style === "compact") {
        result += ` ${cell}${padding} |`;
      } else {
        result += cell + padding + "  ";
      }
    }

    result += "\n";
    return result;
  }

  /**
   * 格式化列表
   * @param {Array<string>} items - 列表项
   * @param {string} bullet - 列表符号
   * @returns {string} - 格式化后的列表
   */
  formatList(items, bullet = "•") {
    if (!items || items.length === 0) {
      return "";
    }

    return items.map((item) => `${bullet} ${item}`).join("\n");
  }

  /**
   * 格式化错误消息
   * @param {Error} error - 错误对象
   * @returns {string} - 格式化后的错误消息
   */
  formatError(error) {
    if (!error) {
      return "";
    }

    if (error.code) {
      return `错误 [${error.code}]: ${error.message}`;
    }

    return `错误: ${error.message}`;
  }
}

module.exports = BaseCommand;
