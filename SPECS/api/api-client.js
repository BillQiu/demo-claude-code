/**
 * API客户端模块
 *
 * 负责与Claude API通信，处理请求、响应和错误。提供了一系列方法来与不同的API端点交互。
 */

const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const utils = require("../core/utils");

/**
 * API客户端类
 */
class ApiClient {
  /**
   * 创建API客户端实例
   * @param {Object} options - 选项
   * @param {string} options.apiKey - API密钥
   * @param {string} options.apiUrl - API基础URL
   * @param {number} options.timeout - 请求超时时间（毫秒）
   * @param {number} options.maxRetries - 最大重试次数
   * @param {Object} options.logger - 日志记录器
   * @param {Object} options.errorHandler - 错误处理器
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey;
    this.apiUrl = options.apiUrl || "https://api.anthropic.com";
    this.timeout = options.timeout || 120000; // 默认2分钟超时
    this.maxRetries = options.maxRetries || 3;
    this.logger = options.logger;
    this.errorHandler = options.errorHandler;

    // 初始化HTTP客户端
    this.client = axios.create({
      baseURL: this.apiUrl,
      timeout: this.timeout,
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
    });

    // 添加请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        if (this.logger) {
          this.logger.debug(
            `API请求: ${config.method.toUpperCase()} ${config.url}`
          );
        }
        return config;
      },
      (error) => {
        if (this.logger) {
          this.logger.error(`API请求错误: ${error.message}`);
        }
        return Promise.reject(error);
      }
    );

    // 添加响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        if (this.logger) {
          this.logger.debug(
            `API响应: ${response.status} ${response.statusText}`
          );
        }
        return response;
      },
      (error) => {
        if (this.logger) {
          if (error.response) {
            this.logger.error(
              `API响应错误: ${error.response.status} ${error.response.statusText}`
            );
            this.logger.debug(
              `API响应错误详情: ${JSON.stringify(error.response.data)}`
            );
          } else if (error.request) {
            this.logger.error(`API请求错误: 无响应`);
          } else {
            this.logger.error(`API错误: ${error.message}`);
          }
        }
        return Promise.reject(this._handleError(error));
      }
    );
  }

  /**
   * 处理API错误
   * @private
   * @param {Error} error - 错误对象
   * @returns {Error} - 处理后的错误对象
   */
  _handleError(error) {
    if (this.errorHandler) {
      if (error.response) {
        // 服务器返回错误响应
        return this.errorHandler.createApiError(
          error.response.data.error?.message || error.message,
          error.response.status,
          error.response.data
        );
      } else if (error.request) {
        // 请求未收到响应
        return this.errorHandler.createNetworkError("请求未收到响应", {
          request: error.request,
          config: error.config,
        });
      }
    }

    return error;
  }

  /**
   * 发送请求到API
   * @private
   * @param {Object} options - 请求选项
   * @param {string} options.method - HTTP方法
   * @param {string} options.endpoint - API端点
   * @param {Object} options.data - 请求数据
   * @param {Object} options.headers - 请求头
   * @param {boolean} options.stream - 是否流式请求
   * @returns {Promise<Object>} - 响应数据
   */
  async _request({ method, endpoint, data, headers = {}, stream = false }) {
    const requestConfig = {
      method,
      url: endpoint,
      headers: { ...headers },
      responseType: stream ? "stream" : "json",
    };

    if (data) {
      requestConfig.data = data;
    }

    return utils.retry(
      async () => {
        try {
          const response = await this.client(requestConfig);
          return response.data;
        } catch (error) {
          if (this.logger) {
            this.logger.error(`API请求失败: ${error.message}`);
          }
          throw error;
        }
      },
      {
        retries: this.maxRetries,
        retryDelay: 1000,
        onRetry: (error, attempt) => {
          if (this.logger) {
            this.logger.warn(
              `重试API请求 (${attempt}/${this.maxRetries}): ${error.message}`
            );
          }
        },
      }
    );
  }

  /**
   * 发送消息到模型
   * @param {Object} options - 选项
   * @param {string} options.model - 模型名称
   * @param {Array<Object>} options.messages - 消息数组
   * @param {number} options.maxTokens - 最大令牌数
   * @param {number} options.temperature - 温度
   * @param {boolean} options.stream - 是否流式响应
   * @returns {Promise<Object>} - 响应数据
   */
  async sendMessages(options) {
    const payload = {
      model: options.model,
      messages: options.messages,
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature,
    };

    return this._request({
      method: "post",
      endpoint: "/v1/messages",
      data: payload,
      stream: options.stream,
    });
  }

  /**
   * 发送对话到模型
   * @param {Object} options - 选项
   * @param {string} options.model - 模型名称
   * @param {string} options.prompt - 提示文本
   * @param {number} options.maxTokens - 最大令牌数
   * @param {number} options.temperature - 温度
   * @param {boolean} options.stream - 是否流式响应
   * @returns {Promise<Object>} - 响应数据
   */
  async sendCompletion(options) {
    const payload = {
      model: options.model,
      prompt: options.prompt,
      max_tokens_to_sample: options.maxTokens || 1000,
      temperature: options.temperature,
    };

    return this._request({
      method: "post",
      endpoint: "/v1/complete",
      data: payload,
      stream: options.stream,
    });
  }

  /**
   * 上传文件
   * @param {Object} options - 选项
   * @param {string} options.filePath - 文件路径
   * @param {string} options.purpose - 文件用途
   * @returns {Promise<Object>} - 响应数据
   */
  async uploadFile(options) {
    const formData = new FormData();
    formData.append("purpose", options.purpose || "file-extract");
    formData.append("file", fs.createReadStream(options.filePath));

    return this._request({
      method: "post",
      endpoint: "/v1/files",
      data: formData,
      headers: {
        ...formData.getHeaders(),
      },
    });
  }

  /**
   * 获取文件列表
   * @returns {Promise<Object>} - 响应数据
   */
  async listFiles() {
    return this._request({
      method: "get",
      endpoint: "/v1/files",
    });
  }

  /**
   * 获取文件详情
   * @param {string} fileId - 文件ID
   * @returns {Promise<Object>} - 响应数据
   */
  async getFile(fileId) {
    return this._request({
      method: "get",
      endpoint: `/v1/files/${fileId}`,
    });
  }

  /**
   * 删除文件
   * @param {string} fileId - 文件ID
   * @returns {Promise<Object>} - 响应数据
   */
  async deleteFile(fileId) {
    return this._request({
      method: "delete",
      endpoint: `/v1/files/${fileId}`,
    });
  }

  /**
   * 获取模型列表
   * @returns {Promise<Object>} - 响应数据
   */
  async listModels() {
    return this._request({
      method: "get",
      endpoint: "/v1/models",
    });
  }

  /**
   * 设置API密钥
   * @param {string} apiKey - API密钥
   */
  setApiKey(apiKey) {
    this.apiKey = apiKey;
    this.client.defaults.headers["X-Api-Key"] = apiKey;
  }

  /**
   * 设置API URL
   * @param {string} apiUrl - API URL
   */
  setApiUrl(apiUrl) {
    this.apiUrl = apiUrl;
    this.client.defaults.baseURL = apiUrl;
  }

  /**
   * 设置请求超时时间
   * @param {number} timeout - 超时时间（毫秒）
   */
  setTimeout(timeout) {
    this.timeout = timeout;
    this.client.defaults.timeout = timeout;
  }
}

module.exports = ApiClient;
