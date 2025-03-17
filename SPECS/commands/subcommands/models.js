/**
 * 模型命令
 *
 * 用于查询和显示可用的Claude模型。
 */

const BaseCommand = require("../base-command");

/**
 * 模型命令类
 */
class ModelsCommand extends BaseCommand {
  /**
   * 创建命令实例
   * @param {Object} options - 选项
   */
  constructor(options) {
    super(options);

    this.name = "models";
    this.description = "查询可用的Claude模型";
    this.aliases = ["model"];
    this.usage = "claude-cli models [选项]";
    this.examples = ["claude-cli models", "claude-cli models --details"];
    this.options = [
      {
        flags: "--details",
        description: "显示详细信息",
      },
    ];
    this.group = "基本";
    this.requiresAuth = true;
  }

  /**
   * 执行命令
   * @param {Array<string>} args - 命令参数
   * @param {Object} options - 命令选项
   * @returns {Promise<string>} - 执行结果
   */
  async execute(args, options) {
    try {
      const showDetails = this.getBooleanOption(options, "details", false);

      // 获取模型列表
      const response = await this.api.listModels();

      if (!response || !response.models || !Array.isArray(response.models)) {
        return "无法获取模型列表或API返回格式不正确";
      }

      const models = response.models;

      if (models.length === 0) {
        return "没有可用的模型";
      }

      if (showDetails) {
        return this._formatDetailedModelInfo(models);
      } else {
        return this._formatSimpleModelInfo(models);
      }
    } catch (error) {
      if (this.logger) {
        this.logger.error(`模型命令执行失败: ${error.message}`);
      }

      if (this.errorHandler) {
        this.errorHandler.handleError(error);
      } else {
        throw error;
      }
    }
  }

  /**
   * 格式化简单模型信息
   * @private
   * @param {Array<Object>} models - 模型列表
   * @returns {string} - 格式化后的模型信息
   */
  _formatSimpleModelInfo(models) {
    // 排序模型，最新的排在前面
    models.sort((a, b) => {
      // Claude-3系列优先于Claude-2系列
      if (a.name.includes("claude-3") && !b.name.includes("claude-3")) {
        return -1;
      }
      if (!a.name.includes("claude-3") && b.name.includes("claude-3")) {
        return 1;
      }

      // 根据发布日期排序
      if (a.created && b.created) {
        return new Date(b.created) - new Date(a.created);
      }

      return a.name.localeCompare(b.name);
    });

    // 格式化为表格
    const rows = [["模型名称", "描述", "最大上下文"]];

    for (const model of models) {
      const maxContextWindow = model.context_window
        ? `${Math.round(model.context_window / 1000)}K`
        : "N/A";

      rows.push([model.name, model.description || "无描述", maxContextWindow]);
    }

    return this.formatTable(rows);
  }

  /**
   * 格式化详细模型信息
   * @private
   * @param {Array<Object>} models - 模型列表
   * @returns {string} - 格式化后的详细模型信息
   */
  _formatDetailedModelInfo(models) {
    // 排序模型，最新的排在前面
    models.sort((a, b) => {
      // Claude-3系列优先于Claude-2系列
      if (a.name.includes("claude-3") && !b.name.includes("claude-3")) {
        return -1;
      }
      if (!a.name.includes("claude-3") && b.name.includes("claude-3")) {
        return 1;
      }

      // 根据发布日期排序
      if (a.created && b.created) {
        return new Date(b.created) - new Date(a.created);
      }

      return a.name.localeCompare(b.name);
    });

    // 构建详细信息
    let result = "";

    for (const model of models) {
      result += `\n模型: ${model.name}\n`;
      result += `描述: ${model.description || "无描述"}\n`;

      if (model.context_window) {
        result += `最大上下文: ${Math.round(
          model.context_window / 1000
        )}K 令牌\n`;
      }

      if (model.created) {
        const createdDate = new Date(model.created * 1000).toLocaleString();
        result += `发布日期: ${createdDate}\n`;
      }

      if (model.capabilities) {
        result += "能力:\n";
        for (const capability of model.capabilities) {
          result += `  • ${capability}\n`;
        }
      }

      result += "-------------------------------------------\n";
    }

    return result;
  }
}

module.exports = ModelsCommand;
