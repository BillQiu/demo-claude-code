#!/usr/bin/env node

/**
 * Claude CLI入口脚本
 *
 * 负责启动CLI应用程序并处理命令行参数。
 */

const path = require("path");
const fs = require("fs");

// 检查Node.js版本
const nodeVersion = process.versions.node;
const majorVersion = parseInt(nodeVersion.split(".")[0], 10);

if (majorVersion < 16) {
  console.error(`错误: Claude CLI需要Node.js 16.0.0或更高版本`);
  console.error(`当前版本: ${nodeVersion}`);
  console.error(`请更新您的Node.js版本: https://nodejs.org/`);
  process.exit(1);
}

// 引入主程序
try {
  require("../index.js");
} catch (error) {
  console.error(`启动Claude CLI时发生错误:`);
  console.error(error.message);

  if (error.code === "MODULE_NOT_FOUND") {
    console.error(`\n尝试重新安装依赖项:`);
    console.error(`  npm install`);
  }

  process.exit(1);
}
