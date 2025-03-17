/**
 * 命令处理器模块
 *
 * 负责解析和执行CLI命令，管理子命令和选项。
 */

const path = require("path");
const fs = require("fs");

/**
 * 命令处理器类
 */
class CommandHandler {
  /**
   * 创建命令处理器实例
   * @param {Object} options - 选项
   * @param {Object} options.config - 配置管理器
   * @param {Object} options.logger - 日志记录器
   * @param {Object} options.api - API客户端
   * @param {Object} options.auth - 认证管理器
   * @param {Object} options.errorHandler - 错误处理器
   */
  constructor(options = {}) {
    this.config = options.config;
    this.logger = options.logger;
    this.api = options.api;
    this.auth = options.auth;
    this.errorHandler = options.errorHandler;
    this.commands = new Map();
    this.aliases = new Map();

    // 注册所有命令
    this._registerCommands();
  }

  /**
   * 注册所有命令
   * @private
   */
  _registerCommands() {
    // 命令目录路径
    const commandsDir = path.join(__dirname, "subcommands");

    try {
      // 确保目录存在
      if (!fs.existsSync(commandsDir)) {
        if (this.logger) {
          this.logger.warn(`命令目录不存在: ${commandsDir}`);
        }
        return;
      }

      // 读取目录中的所有文件
      const files = fs.readdirSync(commandsDir);

      // 过滤出以.js结尾的文件
      const jsFiles = files.filter((file) => file.endsWith(".js"));

      // 加载每个命令
      for (const file of jsFiles) {
        try {
          // 导入命令模块
          const commandPath = path.join(commandsDir, file);
          const CommandClass = require(commandPath);

          // 实例化命令
          const command = new CommandClass({
            config: this.config,
            logger: this.logger,
            api: this.api,
            auth: this.auth,
            errorHandler: this.errorHandler,
          });

          // 注册命令和别名
          this.commands.set(command.name, command);

          if (command.aliases && Array.isArray(command.aliases)) {
            for (const alias of command.aliases) {
              this.aliases.set(alias, command.name);
            }
          }

          if (this.logger) {
            this.logger.debug(`已注册命令: ${command.name}`);
          }
        } catch (error) {
          if (this.logger) {
            this.logger.error(`加载命令失败 ${file}: ${error.message}`);
          }
        }
      }

      if (this.logger) {
        this.logger.debug(
          `已注册 ${this.commands.size} 个命令和 ${this.aliases.size} 个别名`
        );
      }
    } catch (error) {
      if (this.logger) {
        this.logger.error(`注册命令失败: ${error.message}`);
      }

      if (this.errorHandler) {
        throw this.errorHandler.createCommandError(
          `注册命令失败: ${error.message}`,
          { commandsDir }
        );
      }
    }
  }

  /**
   * 获取命令
   * @param {string} name - 命令名称或别名
   * @returns {Object|null} - 命令对象
   */
  getCommand(name) {
    // 直接查找命令
    if (this.commands.has(name)) {
      return this.commands.get(name);
    }

    // 查找别名
    if (this.aliases.has(name)) {
      const commandName = this.aliases.get(name);
      return this.commands.get(commandName);
    }

    return null;
  }

  /**
   * 列出所有命令
   * @returns {Array<Object>} - 命令数组
   */
  listCommands() {
    return Array.from(this.commands.values());
  }

  /**
   * 解析命令行参数
   * @param {Array<string>} args - 命令行参数
   * @returns {Object} - 解析结果
   */
  parseArgs(args) {
    const result = {
      command: null,
      subcommand: null,
      options: {},
      args: [],
    };

    let i = 0;

    // 跳过nodejs和脚本名称
    while (i < args.length && !args[i].startsWith("-")) {
      i++;
    }

    // 解析命令
    if (i < args.length && !args[i].startsWith("-")) {
      result.command = args[i];
      i++;
    }

    // 解析子命令
    if (i < args.length && !args[i].startsWith("-")) {
      result.subcommand = args[i];
      i++;
    }

    // 解析选项和参数
    while (i < args.length) {
      const arg = args[i];

      if (arg.startsWith("--")) {
        // 长选项
        const option = arg.slice(2);

        if (option.includes("=")) {
          // 带值的选项（--option=value）
          const [key, value] = option.split("=", 2);
          result.options[key] = value;
        } else if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
          // 带值的选项（--option value）
          result.options[option] = args[i + 1];
          i++;
        } else {
          // 标志选项（--option）
          result.options[option] = true;
        }
      } else if (arg.startsWith("-")) {
        // 短选项
        const option = arg.slice(1);

        if (option.length === 1) {
          // 单个短选项（-a）
          if (i + 1 < args.length && !args[i + 1].startsWith("-")) {
            // 带值的选项（-a value）
            result.options[option] = args[i + 1];
            i++;
          } else {
            // 标志选项（-a）
            result.options[option] = true;
          }
        } else {
          // 组合短选项（-abc）
          for (const char of option) {
            result.options[char] = true;
          }
        }
      } else {
        // 普通参数
        result.args.push(arg);
      }

      i++;
    }

    return result;
  }

  /**
   * 执行命令
   * @param {Array<string>} args - 命令行参数
   * @returns {Promise<*>} - 命令执行结果
   */
  async execute(args) {
    try {
      const parsedArgs = this.parseArgs(args);

      if (!parsedArgs.command) {
        // 没有指定命令，显示帮助信息
        return this._showHelp();
      }

      const command = this.getCommand(parsedArgs.command);

      if (!command) {
        if (this.logger) {
          this.logger.error(`未知命令: ${parsedArgs.command}`);
        }

        if (this.errorHandler) {
          throw this.errorHandler.createCommandError(
            `未知命令: ${parsedArgs.command}`,
            {
              availableCommands: Array.from(this.commands.keys()),
              availableAliases: Array.from(this.aliases.keys()),
            }
          );
        }

        throw new Error(`未知命令: ${parsedArgs.command}`);
      }

      if (this.logger) {
        this.logger.debug(`执行命令: ${command.name}`);
      }

      // 验证命令所需的API密钥
      if (command.requiresAuth && !this.auth.hasValidKey()) {
        if (this.logger) {
          this.logger.error("此命令需要有效的API密钥");
        }

        if (this.errorHandler) {
          throw this.errorHandler.createAuthenticationError(
            "此命令需要有效的API密钥",
            { command: command.name }
          );
        }

        throw new Error("此命令需要有效的API密钥");
      }

      // 执行命令
      return await command.execute(
        parsedArgs.args,
        parsedArgs.options,
        parsedArgs.subcommand
      );
    } catch (error) {
      if (this.logger) {
        this.logger.error(`命令执行失败: ${error.message}`);
      }

      if (this.errorHandler) {
        this.errorHandler.handleError(error);
      } else {
        throw error;
      }
    }
  }

  /**
   * 显示帮助信息
   * @private
   * @returns {string} - 帮助信息
   */
  _showHelp() {
    const commands = this.listCommands();

    let help = "用法: claude-cli <命令> [选项]\n\n";
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
}

module.exports = CommandHandler;
