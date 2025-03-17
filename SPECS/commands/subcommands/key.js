/**
 * 密钥命令
 *
 * 用于管理Claude API密钥。
 */

const BaseCommand = require("../base-command");

/**
 * 密钥命令类
 */
class KeyCommand extends BaseCommand {
  /**
   * 创建命令实例
   * @param {Object} options - 选项
   */
  constructor(options) {
    super(options);

    this.name = "key";
    this.description = "管理API密钥";
    this.aliases = ["keys", "apikey"];
    this.usage = "claude-cli key <命令> [选项]";
    this.examples = [
      "claude-cli key list",
      "claude-cli key add default sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "claude-cli key set default",
      "claude-cli key remove default",
    ];
    this.group = "认证";
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
        case "add":
          return this._addKey(args);
        case "set":
          return this._setKey(args);
        case "remove":
          return this._removeKey(args);
        case "list":
          return this._listKeys();
        default:
          // 没有指定子命令，显示帮助信息
          return this._showHelp();
      }
    } catch (error) {
      if (this.logger) {
        this.logger.error(`密钥命令执行失败: ${error.message}`);
      }

      if (this.errorHandler) {
        this.errorHandler.handleError(error);
      } else {
        throw error;
      }
    }
  }

  /**
   * 添加密钥
   * @private
   * @param {Array<string>} args - 命令参数
   * @returns {string} - 执行结果
   */
  _addKey(args) {
    this.validateRequiredArgs(args, 2, "请指定密钥名称和API密钥");

    const name = args[0];
    const apiKey = args[1];

    this.auth.addKey(name, apiKey, true);

    if (this.logger) {
      this.logger.info(`添加密钥: ${name}`);
    }

    return `已添加密钥: ${name}，并设置为当前密钥`;
  }

  /**
   * 设置当前密钥
   * @private
   * @param {Array<string>} args - 命令参数
   * @returns {string} - 执行结果
   */
  _setKey(args) {
    this.validateRequiredArgs(args, 1, "请指定要设置为当前密钥的名称");

    const name = args[0];

    this.auth.setCurrentKey(name);

    if (this.logger) {
      this.logger.info(`设置当前密钥: ${name}`);
    }

    return `已设置当前密钥: ${name}`;
  }

  /**
   * 移除密钥
   * @private
   * @param {Array<string>} args - 命令参数
   * @returns {string} - 执行结果
   */
  _removeKey(args) {
    this.validateRequiredArgs(args, 1, "请指定要移除的密钥名称");

    const name = args[0];

    const result = this.auth.removeKey(name);

    if (!result) {
      return `密钥不存在: ${name}`;
    }

    if (this.logger) {
      this.logger.info(`移除密钥: ${name}`);
    }

    return `已移除密钥: ${name}`;
  }

  /**
   * 列出所有密钥
   * @private
   * @returns {string} - 密钥列表
   */
  _listKeys() {
    const keysInfo = this.auth.listKeys();
    const currentKey = keysInfo.current;

    if (Object.keys(keysInfo.keys).length === 0) {
      return "没有存储的API密钥\n\n要添加密钥，请使用:\n  claude-cli key add <name> <api-key>";
    }

    // 格式化为表格
    const rows = [["名称", "创建日期", "当前"]];

    for (const [name, info] of Object.entries(keysInfo.keys)) {
      const current = name === currentKey ? "是" : "";
      const createdAt = new Date(info.createdAt).toLocaleString();

      rows.push([name, createdAt, current]);
    }

    if (this.logger) {
      this.logger.debug(
        `列出所有密钥，共 ${Object.keys(keysInfo.keys).length} 个`
      );
    }

    return this.formatTable(rows);
  }

  /**
   * 显示帮助信息
   * @private
   * @returns {string} - 帮助信息
   */
  _showHelp() {
    let help = "密钥命令 - 管理API密钥\n\n";
    help += "用法:\n";
    help += "  claude-cli key list               列出所有密钥\n";
    help += "  claude-cli key add <name> <key>   添加新密钥\n";
    help += "  claude-cli key set <name>         设置当前密钥\n";
    help += "  claude-cli key remove <name>      移除密钥\n";

    help += "\n示例:\n";
    help +=
      "  claude-cli key add default sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n";
    help += "  claude-cli key set default\n";

    return help;
  }
}

module.exports = KeyCommand;
