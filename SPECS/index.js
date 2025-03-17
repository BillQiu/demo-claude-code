#!/usr/bin/env -S node --no-warnings --enable-source-maps

/**
 * Claude CLI - 主入口点
 *
 * 这个文件是Claude CLI应用程序的主入口点，负责初始化应用程序和执行命令。
 */

// 核心组件导入
const ConfigManager = require("./core/config");
const Logger = require("./core/logger");
const ErrorHandler = require("./core/error-handler");
const ApiClient = require("./api/client");
const AuthManager = require("./auth/auth-manager");
const CommandHandler = require("./cli/command-handler");

/**
 * 应用程序主函数
 */
async function main() {
  try {
    // 初始化配置
    const config = new ConfigManager();
    await config.load();

    // 初始化日志记录器
    const logger = new Logger(config.get("logLevel"));
    logger.info("Starting Claude CLI...");

    // 初始化错误处理器
    const errorHandler = new ErrorHandler({
      logger,
      exitOnUncaughtException: true,
    });

    // 设置全局错误处理
    process.on("uncaughtException", (error) =>
      errorHandler.handleUncaughtException(error)
    );
    process.on("unhandledRejection", (reason) =>
      errorHandler.handleUnhandledRejection(reason)
    );

    // 初始化API客户端
    const apiClient = new ApiClient({
      baseUrl: config.get("apiUrl"),
      timeout: config.get("timeout"),
      config: config,
      logger: logger,
    });

    // 初始化认证管理器
    const authManager = new AuthManager({
      config: config,
      logger: logger,
      apiClient: apiClient,
    });

    // 初始化命令处理器
    const commandHandler = new CommandHandler({
      config: config,
      logger: logger,
      apiClient: apiClient,
      authManager: authManager,
    });

    // 解析命令行参数并执行相应的命令
    await commandHandler.parseAndExecute(process.argv);

    logger.info("Claude CLI execution completed.");
  } catch (error) {
    // 捕获并处理主流程中的任何错误
    console.error("Fatal error:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 启动应用程序
if (require.main === module) {
  main().catch((error) => {
    console.error("Unhandled error in main process:", error);
    process.exit(1);
  });
}

module.exports = {
  main,
};
