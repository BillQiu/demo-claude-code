/**
 * 帮助命令
 *
 * 用于显示各个命令的帮助信息。
 */

const BaseCommand = require("../base-command");

/**
 * 帮助命令类
 */
class HelpCommand extends BaseCommand {
  /**
   * 创建命令实例
   * @param {Object} options - 选项
   */
  constructor(options) {
    super(options);

    this.name = "help";
    this.description = "显示命令帮助信息";
    this.aliases = ["h", "?"];
    this.usage = "claude-cli help [命令]";
    this.examples = [
      "claude-cli help",
      "claude-cli help chat",
      "claude-cli help key",
    ];
    this.group = "基本";
    this.requiresAuth = false;
  }

  /**
   * 执行命令
   * @param {Array<string>} args - 命令参数
   * @param {Object} options - 命令选项
   * @returns {Promise<string>} - 帮助信息
   */
  async execute(args, options) {
    try {
      // 如果没有指定命令，显示通用帮助信息
      if (args.length === 0) {
        return this._showGeneralHelp();
      }

      // 获取指定命令的帮助信息
      const commandName = args[0];
      return this._showCommandHelp(commandName);
    } catch (error) {
      if (this.logger) {
        this.logger.error(`帮助命令执行失败: ${error.message}`);
      }

      if (this.errorHandler) {
        this.errorHandler.handleError(error);
      } else {
        throw error;
      }
    }
  }

  /**
   * 显示通用帮助信息
   * @private
   * @returns {string} - 通用帮助信息
   */
  _showGeneralHelp() {
    const commands = this._getCommandHandler().listCommands();

    let help = "Claude CLI - Anthropic Claude API命令行工具\n\n";
    help += "用法: claude-cli <命令> [选项]\n\n";
    help += "可用命令:\n";

    // 找出最长的命令名称，用于对齐
    const maxNameLength = Math.max(...commands.map((cmd) => cmd.name.length));

    // 按照分组排序和分组命令
    const groupedCommands = {};

    for (const command of commands) {
      const group = command.group || "其他";

      if (!groupedCommands[group]) {
        groupedCommands[group] = [];
      }

      groupedCommands[group].push(command);
    }

    // 定义分组顺序
    const groupOrder = ["基本", "对话", "文件", "认证", "配置", "其他"];

    // 按照分组显示命令
    for (const group of groupOrder) {
      if (groupedCommands[group]) {
        help += `\n${group}:\n`;

        for (const command of groupedCommands[group]) {
          const padding = " ".repeat(maxNameLength - command.name.length + 2);
          help += `  ${command.name}${padding}${command.description}\n`;
        }
      }
    }

    // 显示其他未分组的命令
    const otherGroups = Object.keys(groupedCommands).filter(
      (group) => !groupOrder.includes(group)
    );

    for (const group of otherGroups) {
      help += `\n${group}:\n`;

      for (const command of groupedCommands[group]) {
        const padding = " ".repeat(maxNameLength - command.name.length + 2);
        help += `  ${command.name}${padding}${command.description}\n`;
      }
    }

    help += "\n获取命令详细信息，请使用: claude-cli help <命令>";

    return help;
  }

  /**
   * 显示命令帮助信息
   * @private
   * @param {string} commandName - 命令名称
   * @returns {string} - 命令帮助信息
   */
  _showCommandHelp(commandName) {
    const command = this._getCommandHandler().getCommand(commandName);

    if (!command) {
      if (this.logger) {
        this.logger.warn(`未知命令: ${commandName}`);
      }

      return `未知命令: ${commandName}\n\n使用 'claude-cli help' 查看所有可用命令`;
    }

    return command.getHelp();
  }

  /**
   * 获取命令处理器
   * @private
   * @returns {Object} - 命令处理器
   */
  _getCommandHandler() {
    // 获取父对象（CommandHandler）
    const parent = this.getParent();

    if (!parent) {
      if (this.logger) {
        this.logger.error("无法获取命令处理器");
      }

      throw new Error("无法获取命令处理器");
    }

    return parent;
  }

  /**
   * 获取父对象
   * @returns {Object|null} - 父对象
   */
  getParent() {
    return this._parent || null;
  }

  /**
   * 设置父对象
   * @param {Object} parent - 父对象
   */
  setParent(parent) {
    this._parent = parent;
  }
}

module.exports = HelpCommand;
