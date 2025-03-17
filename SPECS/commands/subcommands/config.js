/**
 * 配置命令
 *
 * 用于管理应用程序配置。
 */

const BaseCommand = require("../base-command");

/**
 * 配置命令类
 */
class ConfigCommand extends BaseCommand {
  /**
   * 创建命令实例
   * @param {Object} options - 选项
   */
  constructor(options) {
    super(options);

    this.name = "config";
    this.description = "管理应用程序配置";
    this.aliases = ["conf", "cfg"];
    this.usage = "claude-cli config <命令> [选项]";
    this.examples = [
      "claude-cli config list",
      "claude-cli config get model",
      "claude-cli config set model claude-3-opus-20240229",
      "claude-cli config reset",
    ];
    this.group = "配置";
    this.requiresAuth = false;
  }

  /**
   * 执行命令
   * @param {Array<string>} args - 命令参数
   * @param {Object} options - 命令选项
   * @param {string} subcommand - 子命令
   * @returns {Promise<string>} - 执行结果
   */
  async execute(args, options, subcommand) {
    try {
      // 处理子命令
      switch (subcommand) {
        case "get":
          return this._getConfig(args);
        case "set":
          return this._setConfig(args);
        case "list":
          return this._listConfig();
        case "reset":
          return this._resetConfig();
        default:
          // 没有指定子命令，显示帮助信息
          return this._showHelp();
      }
    } catch (error) {
      if (this.logger) {
        this.logger.error(`配置命令执行失败: ${error.message}`);
      }

      if (this.errorHandler) {
        this.errorHandler.handleError(error);
      } else {
        throw error;
      }
    }
  }

  /**
   * 获取配置值
   * @private
   * @param {Array<string>} args - 命令参数
   * @returns {string} - 配置值
   */
  _getConfig(args) {
    this.validateRequiredArgs(args, 1, "请指定要获取的配置项");

    const key = args[0];
    const value = this.config.get(key);

    if (value === undefined) {
      if (this.logger) {
        this.logger.warn(`配置项不存在: ${key}`);
      }

      return `配置项不存在: ${key}`;
    }

    if (this.logger) {
      this.logger.debug(`获取配置项: ${key} = ${JSON.stringify(value)}`);
    }

    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }

    return String(value);
  }

  /**
   * 设置配置值
   * @private
   * @param {Array<string>} args - 命令参数
   * @returns {string} - 执行结果
   */
  _setConfig(args) {
    this.validateRequiredArgs(args, 2, "请指定要设置的配置项和值");

    const key = args[0];
    let value = args[1];

    // 尝试解析值
    try {
      // 如果是布尔值
      if (value.toLowerCase() === "true") {
        value = true;
      } else if (value.toLowerCase() === "false") {
        value = false;
      } else if (!isNaN(Number(value))) {
        // 如果是数字
        value = Number(value);
      }
    } catch (error) {
      // 忽略解析错误，保持原值
    }

    this.config.set(key, value);

    if (this.logger) {
      this.logger.info(`设置配置项: ${key} = ${JSON.stringify(value)}`);
    }

    return `已设置 ${key} = ${JSON.stringify(value)}`;
  }

  /**
   * 列出所有配置
   * @private
   * @returns {string} - 配置列表
   */
  _listConfig() {
    const config = this.config.getAll();
    const rows = [["配置项", "值"]];

    for (const [key, value] of Object.entries(config)) {
      rows.push([key, JSON.stringify(value)]);
    }

    if (this.logger) {
      this.logger.debug(`列出所有配置项，共 ${Object.keys(config).length} 项`);
    }

    return this.formatTable(rows);
  }

  /**
   * 重置配置
   * @private
   * @returns {string} - 执行结果
   */
  _resetConfig() {
    this.config.reset();

    if (this.logger) {
      this.logger.info("重置所有配置项");
    }

    return "已重置所有配置项";
  }

  /**
   * 显示帮助信息
   * @private
   * @returns {string} - 帮助信息
   */
  _showHelp() {
    let help = "配置命令 - 管理应用程序配置\n\n";
    help += "用法:\n";
    help += "  claude-cli config list              列出所有配置项\n";
    help += "  claude-cli config get <key>         获取配置项的值\n";
    help += "  claude-cli config set <key> <value> 设置配置项的值\n";
    help += "  claude-cli config reset             重置所有配置项\n";

    help += "\n可用配置项:\n";
    help += "  model           默认模型名称\n";
    help += "  temperature     生成温度 (0.0-1.0)\n";
    help += "  maxTokens       最大生成令牌数\n";
    help += "  timeout         API请求超时时间（毫秒）\n";
    help += "  apiUrl          API基础URL\n";
    help += "  systemPrompt    默认系统提示\n";
    help += "  stream          是否使用流式响应\n";
    help += "  logLevel        日志级别（error, warn, info, debug, trace）\n";
    help += "  sessionsPath    会话保存路径\n";

    return help;
  }
}

module.exports = ConfigCommand;
