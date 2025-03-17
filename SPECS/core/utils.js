/**
 * 工具函数
 *
 * 提供各种通用的辅助功能，如字符串处理、日期格式化、对象操作等。
 */

/**
 * 截断字符串到指定长度
 * @param {string} str - 要截断的字符串
 * @param {number} length - 最大长度
 * @param {string} suffix - 截断后添加的后缀
 * @returns {string} - 截断后的字符串
 */
function truncate(str, length = 80, suffix = "...") {
  if (typeof str !== "string") {
    return str;
  }

  if (str.length <= length) {
    return str;
  }

  return str.substring(0, length) + suffix;
}

/**
 * 检查值是否为空（null、undefined、空字符串、空数组或空对象）
 * @param {*} value - 要检查的值
 * @returns {boolean} - 是否为空
 */
function isEmpty(value) {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string" && value.trim() === "") {
    return true;
  }

  if (Array.isArray(value) && value.length === 0) {
    return true;
  }

  if (typeof value === "object" && Object.keys(value).length === 0) {
    return true;
  }

  return false;
}

/**
 * 深度合并对象
 * @param {Object} target - 目标对象
 * @param {...Object} sources - 源对象
 * @returns {Object} - 合并后的对象
 */
function deepMerge(target, ...sources) {
  if (!sources.length) {
    return target;
  }

  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) {
          Object.assign(target, { [key]: {} });
        }
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}

/**
 * 检查值是否为对象
 * @param {*} item - 要检查的值
 * @returns {boolean} - 是否为对象
 */
function isObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}

/**
 * 格式化日期
 * @param {Date|number|string} date - 要格式化的日期
 * @param {string} format - 格式字符串（yyyy-MM-dd HH:mm:ss）
 * @returns {string} - 格式化后的日期字符串
 */
function formatDate(date, format = "yyyy-MM-dd HH:mm:ss") {
  date = new Date(date);

  const padZero = (num) => String(num).padStart(2, "0");

  const replacements = {
    yyyy: date.getFullYear(),
    MM: padZero(date.getMonth() + 1),
    dd: padZero(date.getDate()),
    HH: padZero(date.getHours()),
    mm: padZero(date.getMinutes()),
    ss: padZero(date.getSeconds()),
  };

  return format.replace(/yyyy|MM|dd|HH|mm|ss/g, (match) => replacements[match]);
}

/**
 * 生成UUID
 * @returns {string} - UUID字符串
 */
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 防抖函数
 * @param {Function} func - 要执行的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} - 防抖后的函数
 */
function debounce(func, wait = 300) {
  let timeout;

  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 * @param {Function} func - 要执行的函数
 * @param {number} limit - 限制时间（毫秒）
 * @returns {Function} - 节流后的函数
 */
function throttle(func, limit = 300) {
  let inThrottle;

  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * 休眠函数
 * @param {number} ms - 休眠时间（毫秒）
 * @returns {Promise<void>} - Promise
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 重试函数
 * @param {Function} fn - 要重试的函数
 * @param {Object} options - 选项
 * @param {number} options.retries - 重试次数
 * @param {number} options.retryDelay - 重试延迟（毫秒）
 * @param {Function} options.onRetry - 重试回调
 * @returns {Promise<*>} - Promise
 */
async function retry(
  fn,
  { retries = 3, retryDelay = 300, onRetry = null } = {}
) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;

      if (attempt < retries) {
        if (onRetry) {
          onRetry(error, attempt);
        }

        await sleep(retryDelay);
      }
    }
  }

  throw lastError;
}

/**
 * 检查字符串是否匹配模式（可以是正则表达式或字符串）
 * @param {string} input - 输入字符串
 * @param {RegExp|string} pattern - 模式
 * @param {boolean} exact - 是否精确匹配（仅适用于字符串模式）
 * @returns {boolean} - 是否匹配
 */
function isMatchingPattern(input, pattern, exact = false) {
  if (typeof input !== "string") {
    return false;
  }

  if (pattern instanceof RegExp) {
    return pattern.test(input);
  }

  if (typeof pattern === "string") {
    return exact ? input === pattern : input.includes(pattern);
  }

  return false;
}

/**
 * 检测对象是否为错误
 * @param {*} value - 要检查的值
 * @returns {boolean} - 是否为错误
 */
function isError(value) {
  return (
    value instanceof Error ||
    Object.prototype.toString.call(value) === "[object Error]" ||
    Object.prototype.toString.call(value) === "[object Exception]"
  );
}

module.exports = {
  truncate,
  isEmpty,
  deepMerge,
  isObject,
  formatDate,
  generateUUID,
  debounce,
  throttle,
  sleep,
  retry,
  isMatchingPattern,
  isError,
};
