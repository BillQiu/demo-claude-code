# Claude CLI

一个功能齐全的命令行工具，用于与Anthropic的Claude API进行交互。

## 功能特点

- 与Claude进行交互式对话
- 管理和存储API密钥
- 上传和处理文件
- 保存和加载对话历史
- 查询可用的Claude模型
- 管理应用程序配置

## 安装

### NPM安装（推荐）

```bash
npm install -g claude-cli
```

### 从源代码安装

```bash
git clone https://github.com/yourusername/claude-cli.git
cd claude-cli
npm install
npm link
```

## 快速入门

1. 添加API密钥：

```bash
claude-cli key add default sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

2. 开始与Claude对话：

```bash
claude-cli chat
```

或者直接提供初始提示：

```bash
claude-cli chat "请解释量子力学的基本原理"
```

## 命令

### 基本命令

- `help`：显示帮助信息
- `models`：查询可用的Claude模型

### 对话命令

- `chat`：与Claude进行交互式对话

### 认证命令

- `key`：管理API密钥
  - `add`：添加新密钥
  - `list`：列出所有密钥
  - `set`：设置当前密钥
  - `remove`：移除密钥

### 配置命令

- `config`：管理应用程序配置
  - `get`：获取配置值
  - `set`：设置配置值
  - `list`：列出所有配置
  - `reset`：重置配置

## 示例

### 使用特定模型和参数进行对话

```bash
claude-cli chat --model claude-3-opus-20240229 --temperature 0.7 --max-tokens 4000
```

### 使用系统提示

```bash
claude-cli chat --system "你是一位历史学家，只回答与历史相关的问题。"
```

### 上传文件并进行对话

```bash
claude-cli chat --file /path/to/document.pdf "请总结这个文档的内容"
```

### 保存会话并继续

```bash
claude-cli chat --save ~/claude-sessions/history1.json
claude-cli chat --session session_1234567890
```

## 配置

Claude CLI会在`~/.claude-cli`目录中存储配置和会话历史。以下是可配置的项目：

- `model`：默认使用的模型
- `temperature`：生成温度 (0.0-1.0)
- `maxTokens`：最大生成令牌数
- `timeout`：API请求超时时间（毫秒）
- `apiUrl`：API基础URL
- `systemPrompt`：默认系统提示
- `stream`：是否使用流式响应
- `logLevel`：日志级别（error, warn, info, debug, trace）

## 开发

### 目录结构

```
.
├── bin/            # 可执行文件
├── commands/       # 命令实现
│   └── subcommands/ # 子命令实现
├── core/           # 核心功能
│   ├── config.js   # 配置管理
│   ├── logger.js   # 日志功能
│   └── error-handler.js # 错误处理
├── api/            # API客户端
└── auth/           # 认证管理
```

### 测试

```bash
npm test
```

### 代码检查

```bash
npm run lint
```

## 许可证

MIT 