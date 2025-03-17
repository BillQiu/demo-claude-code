/**
 * 聊天命令
 *
 * 用于与Claude进行交互式对话。
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const BaseCommand = require("../base-command");

/**
 * 聊天命令类
 */
class ChatCommand extends BaseCommand {
  /**
   * 创建命令实例
   * @param {Object} options - 选项
   */
  constructor(options) {
    super(options);

    this.name = "chat";
    this.description = "与Claude进行交互式对话";
    this.aliases = ["c"];
    this.usage = "claude-cli chat [选项] [初始提示]";
    this.examples = [
      "claude-cli chat",
      'claude-cli chat "请解释量子计算的基本原理"',
      "claude-cli chat --model claude-3-opus-20240229",
      "claude-cli chat --temperature 0.7 --max-tokens 1000",
    ];
    this.options = [
      {
        flags: "--model <model>",
        description: "使用的模型",
        default: "claude-3-sonnet-20240229",
      },
      {
        flags: "--temperature <temperature>",
        description: "温度 (0.0-1.0)",
        default: "0.7",
      },
      {
        flags: "--max-tokens <max-tokens>",
        description: "最大生成令牌数",
        default: "4000",
      },
      {
        flags: "--system <system>",
        description: "系统提示",
      },
      {
        flags: "--file <file>",
        description: "上传文件路径",
      },
      {
        flags: "--session <session>",
        description: "会话ID (用于继续之前的会话)",
      },
      {
        flags: "--save <save>",
        description: "保存会话到文件",
      },
      {
        flags: "--stream",
        description: "使用流式响应",
      },
    ];
    this.group = "对话";
    this.requiresAuth = true;

    // 会话历史
    this.history = [];

    // 会话ID
    this.sessionId = null;

    // 系统提示
    this.systemPrompt = null;

    // 上传的文件IDs
    this.fileIds = [];
  }

  /**
   * 执行命令
   * @param {Array<string>} args - 命令参数
   * @param {Object} options - 命令选项
   * @returns {Promise<void>}
   */
  async execute(args, options) {
    try {
      // 解析选项
      const model = this.getStringOption(
        options,
        "model",
        this.config.get("model") || "claude-3-sonnet-20240229"
      );
      const temperature = this.getNumberOption(
        options,
        "temperature",
        this.config.get("temperature") || 0.7
      );
      const maxTokens = this.getNumberOption(
        options,
        "max-tokens",
        this.config.get("maxTokens") || 4000
      );
      const useStream = this.getBooleanOption(
        options,
        "stream",
        this.config.get("stream") || true
      );

      // 会话ID
      this.sessionId = this.getStringOption(options, "session", null);

      // 系统提示
      this.systemPrompt = this.getStringOption(
        options,
        "system",
        this.config.get("systemPrompt") || null
      );

      // 保存会话路径
      const savePath = this.getStringOption(options, "save", null);

      // 文件路径
      const filePath = this.getStringOption(options, "file", null);

      // 如果指定了会话ID，加载历史会话
      if (this.sessionId) {
        await this._loadSession(this.sessionId);
      } else {
        // 生成新的会话ID
        this.sessionId = `session_${Date.now()}`;
      }

      // 如果指定了文件，上传文件
      if (filePath) {
        await this._uploadFile(filePath);
      }

      // 初始提示
      const initialPrompt = args.join(" ").trim();

      if (initialPrompt) {
        await this._sendMessage(initialPrompt, {
          model,
          temperature,
          maxTokens,
          useStream,
        });
      }

      // 开始交互式会话
      await this._startInteractiveSession({
        model,
        temperature,
        maxTokens,
        useStream,
      });

      // 如果指定了保存路径，保存会话
      if (savePath) {
        await this._saveSession(savePath);
      }
    } catch (error) {
      if (this.logger) {
        this.logger.error(`聊天命令执行失败: ${error.message}`);
      }

      if (this.errorHandler) {
        this.errorHandler.handleError(error);
      } else {
        throw error;
      }
    }
  }

  /**
   * 加载会话
   * @private
   * @param {string} sessionId - 会话ID
   */
  async _loadSession(sessionId) {
    try {
      const sessionDir = path.join(
        this.config.get("sessionsPath") ||
          path.join(this.config.configPath, "sessions")
      );
      const sessionFile = path.join(sessionDir, `${sessionId}.json`);

      if (!fs.existsSync(sessionFile)) {
        if (this.logger) {
          this.logger.warn(`会话文件不存在: ${sessionFile}`);
        }

        if (this.errorHandler) {
          throw this.errorHandler.createCommandError(
            `会话文件不存在: ${sessionId}`,
            { sessionId, sessionFile }
          );
        }

        throw new Error(`会话文件不存在: ${sessionId}`);
      }

      const sessionData = JSON.parse(fs.readFileSync(sessionFile, "utf8"));

      this.history = sessionData.messages || [];
      this.systemPrompt = sessionData.systemPrompt || this.systemPrompt;
      this.fileIds = sessionData.fileIds || [];

      if (this.logger) {
        this.logger.info(
          `已加载会话: ${sessionId} (${this.history.length} 条消息)`
        );
      }

      // 打印会话历史的最后几条消息
      const lastMessages = this.history.slice(-4); // 最后2轮对话（4条消息）

      console.log("\n=== 会话历史 ===");

      for (const message of lastMessages) {
        const role = message.role === "user" ? "用户" : "Claude";
        const content =
          typeof message.content === "string"
            ? message.content
            : message.content[0]?.text || "";

        console.log(`\n${role}: ${content}`);
      }

      console.log("\n=== 新对话 ===\n");
    } catch (error) {
      if (this.logger) {
        this.logger.error(`加载会话失败: ${error.message}`);
      }

      if (this.errorHandler) {
        throw this.errorHandler.createCommandError(
          `加载会话失败: ${error.message}`,
          { sessionId }
        );
      }

      throw error;
    }
  }

  /**
   * 保存会话
   * @private
   * @param {string} savePath - 保存路径
   */
  async _saveSession(savePath) {
    try {
      const sessionData = {
        id: this.sessionId,
        createdAt: new Date().toISOString(),
        systemPrompt: this.systemPrompt,
        messages: this.history,
        fileIds: this.fileIds,
      };

      const sessionDir = path.dirname(savePath);

      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      fs.writeFileSync(savePath, JSON.stringify(sessionData, null, 2), "utf8");

      if (this.logger) {
        this.logger.info(`已保存会话到: ${savePath}`);
      }

      console.log(`\n会话已保存到: ${savePath}`);
    } catch (error) {
      if (this.logger) {
        this.logger.error(`保存会话失败: ${error.message}`);
      }

      if (this.errorHandler) {
        throw this.errorHandler.createCommandError(
          `保存会话失败: ${error.message}`,
          { savePath }
        );
      }

      throw error;
    }
  }

  /**
   * 上传文件
   * @private
   * @param {string} filePath - 文件路径
   */
  async _uploadFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        if (this.logger) {
          this.logger.error(`文件不存在: ${filePath}`);
        }

        if (this.errorHandler) {
          throw this.errorHandler.createValidationError(
            `文件不存在: ${filePath}`,
            { filePath }
          );
        }

        throw new Error(`文件不存在: ${filePath}`);
      }

      console.log(`正在上传文件: ${filePath}...`);

      const fileResponse = await this.api.uploadFile({
        filePath,
        purpose: "file-extract",
      });

      if (fileResponse && fileResponse.id) {
        this.fileIds.push(fileResponse.id);

        if (this.logger) {
          this.logger.info(`已上传文件: ${filePath} (ID: ${fileResponse.id})`);
        }

        console.log(`文件上传成功 (ID: ${fileResponse.id})`);
      } else {
        throw new Error("文件上传失败，未返回文件ID");
      }
    } catch (error) {
      if (this.logger) {
        this.logger.error(`上传文件失败: ${error.message}`);
      }

      if (this.errorHandler) {
        throw this.errorHandler.createApiError(
          `上传文件失败: ${error.message}`,
          error.status,
          { filePath }
        );
      }

      throw error;
    }
  }

  /**
   * 发送消息
   * @private
   * @param {string} message - 用户消息
   * @param {Object} options - 选项
   * @param {string} options.model - 模型名称
   * @param {number} options.temperature - 温度
   * @param {number} options.maxTokens - 最大令牌数
   * @param {boolean} options.useStream - 是否使用流式响应
   * @returns {Promise<string>} - 响应消息
   */
  async _sendMessage(message, options) {
    try {
      // 添加用户消息到历史
      this.history.push({
        role: "user",
        content: message,
      });

      // 准备请求
      const request = {
        model: options.model,
        messages: this.history.slice(),
        max_tokens: options.maxTokens,
        temperature: options.temperature,
      };

      // 添加系统提示
      if (this.systemPrompt) {
        request.system = this.systemPrompt;
      }

      // 添加文件
      if (this.fileIds.length > 0) {
        request.fileIds = this.fileIds;
      }

      // 发送请求
      if (options.useStream) {
        // 流式响应
        const stream = await this.api.sendMessages({
          ...request,
          stream: true,
        });

        let fullResponse = "";

        // 处理流式响应
        for await (const chunk of stream) {
          const content = chunk.delta?.text || "";
          process.stdout.write(content);
          fullResponse += content;
        }

        console.log("\n"); // 换行

        // 添加助手消息到历史
        this.history.push({
          role: "assistant",
          content: fullResponse,
        });

        return fullResponse;
      } else {
        // 非流式响应
        const response = await this.api.sendMessages(request);

        const content = response.content;
        console.log(`\nClaude: ${content}\n`);

        // 添加助手消息到历史
        this.history.push({
          role: "assistant",
          content,
        });

        return content;
      }
    } catch (error) {
      if (this.logger) {
        this.logger.error(`发送消息失败: ${error.message}`);
      }

      if (this.errorHandler) {
        throw this.errorHandler.createApiError(
          `发送消息失败: ${error.message}`,
          error.status,
          { message }
        );
      }

      throw error;
    }
  }

  /**
   * 启动交互式会话
   * @private
   * @param {Object} options - 选项
   * @param {string} options.model - 模型名称
   * @param {number} options.temperature - 温度
   * @param {number} options.maxTokens - 最大令牌数
   * @param {boolean} options.useStream - 是否使用流式响应
   */
  async _startInteractiveSession(options) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "用户: ",
    });

    console.log(
      `\n开始与 Claude 对话 (模型: ${options.model})。输入 'exit' 或 'quit' 结束对话。\n`
    );

    rl.prompt();

    for await (const line of rl) {
      const message = line.trim();

      if (
        message.toLowerCase() === "exit" ||
        message.toLowerCase() === "quit"
      ) {
        break;
      }

      if (message) {
        console.log(""); // 添加空行

        try {
          await this._sendMessage(message, options);
        } catch (error) {
          console.error(`错误: ${error.message}`);
        }

        console.log(""); // 添加空行
      }

      rl.prompt();
    }

    rl.close();
    console.log("\n会话结束");
  }
}

module.exports = ChatCommand;
