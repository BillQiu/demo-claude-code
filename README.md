# Claude CLI 反向工程项目
[此文章](https://ghuntley.com/tradecraft/)的过程复现

## 项目概述

本项目记录了我使用 Claude 3.7 Sonnet 对 Anthropic 未开源的 Claude CLI 工具进行反向工程的过程。通过与 Claude 的交互，我成功地从编译后的 CLI.js 文件中提取了应用程序的结构和功能，并创建了一个清晰、模块化的规范。

## 反向工程过程

### 初始提示词

以下是我向 Claude 提供的初始提示词，开始反向工程过程：
- user
   ```
   CLI.js is a commonjs typescript application which has been compiled with webpack.
   The symbols have been stripped.
   Inspect the source code thoroughly (extra thinking) but skip the SentrySDK source code.
   Create a specification library of features of the application.
   Convert the source code into human readable.
   Keep going until you are done!
   ```

- assistant
   ```
   think
   我需要分析一个名为CLI.js的CommonJS TypeScript应用程序，该应用已经通过webpack编译，并且符号已被剥离。我的任务是:
   1. 彻底检查源代码（需要深入思考）
   2. 跳过SentrySDK源代码部分
   3. 创建应用程序功能的规范库
   4. 将源代码转换为人类可读的形式

   首先，我需要找到并检查CLI.js文件。让我开始搜索这个文件。

   我将使用codebase_search工具来查找CLI.js文件。
   ```

    *具体过程省略，最后得到一个标准化结构设计的命令行工具，包含模块设计。*


   ```
   结论
   CLI.js是一个功能丰富的命令行工具，用于与Claude AI服务进行交互。它提供了一套全面的功能，包括命令行参数处理、API通信、配置管理、认证、错误处理和日志记录。该工具采用模块化设计，使用TypeScript确保类型安全，并集成了Sentry进行错误跟踪和监控。
   尽管原始代码已经被编译和压缩，但通过分析可以看出它是一个结构良好的应用程序，遵循现代      JavaScript/TypeScript开发实践，并提供了丰富的功能集来支持各种使用场景。
   ```

### 项目设计提示词

- user
   ```
   Now deobfuscate the application.
   Split the application into separate files per domain in the SPECS folder.
   Provide an overview of the directory structure before starting deobfuscation.
   Skip the SENTRYSDK.
   ```
- assistant
   *具体结果省略，最后得到代码设计，包含在SPECS文件夹中*

## 结论
- 对于没有开源的软件，通过反编译的方式，可以得到一个大致的代码设计。
- 如何基于 prompt 工程，与大模型交互，获得自己想要的结果。