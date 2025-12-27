const axios = require("axios");

class LogForwarder {
  constructor() {
    this.logServiceUrl = process.env.LOG_SERVICE_URL || "http://localhost:3100";
    this.isEnabled = process.env.ENABLE_LOG_FORWARDING === "true";
    this.batchSize = parseInt(process.env.LOG_BATCH_SIZE || "10");
    this.batchTimeout = parseInt(process.env.LOG_BATCH_TIMEOUT || "5000");
    this.logQueue = [];
    this.batchTimer = null;

    if (this.isEnabled) {
      this.startBatchProcessor();
    }
  }

  // 记录API请求日志
  logRequest(req, res, responseTime) {
    if (!this.isEnabled) return;

    const logData = {
      level: "info",
      message: `${req.method} ${req.url}`,
      meta: {
        type: "api_request",
        method: req.method,
        url: req.url,
        originalUrl: req.originalUrl,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get("User-Agent"),
        referer: req.get("Referer"),
        statusCode: res.statusCode,
        responseTime: responseTime,
        timestamp: new Date().toISOString(),
      },
    };

    this.addToQueue(logData);
  }

  // 记录错误日志
  logError(error, req = null) {
    if (!this.isEnabled) return;

    const logData = {
      level: "error",
      message: error.message || "Unknown error",
      meta: {
        type: "api_error",
        stack: error.stack,
        method: req?.method,
        url: req?.url,
        originalUrl: req?.originalUrl,
        ip: req?.ip || req?.connection?.remoteAddress,
        userAgent: req?.get("User-Agent"),
        timestamp: new Date().toISOString(),
      },
    };

    this.addToQueue(logData);
  }

  // 记录自定义日志
  log(level, message, meta = {}) {
    if (!this.isEnabled) return;

    const logData = {
      level,
      message,
      meta: {
        ...meta,
        timestamp: new Date().toISOString(),
      },
    };

    this.addToQueue(logData);
  }

  // 添加到队列
  addToQueue(logData) {
    this.logQueue.push(logData);

    // 如果队列达到批处理大小，立即发送
    if (this.logQueue.length >= this.batchSize) {
      this.flushQueue();
    }
  }

  // 启动批处理器
  startBatchProcessor() {
    this.batchTimer = setInterval(() => {
      if (this.logQueue.length > 0) {
        this.flushQueue();
      }
    }, this.batchTimeout);
  }

  // 刷新队列
  async flushQueue() {
    if (this.logQueue.length === 0) return;

    const logs = [...this.logQueue];
    this.logQueue = [];

    try {
      await axios.post(`${this.logServiceUrl}/logs/batch`, { logs });
    } catch (error) {
      console.error("Failed to forward logs to log service:");
      // 如果发送失败，将日志重新加入队列
      this.logQueue.unshift(...logs);

      // 限制队列大小，防止内存溢出
      if (this.logQueue.length > 1000) {
        this.logQueue = this.logQueue.slice(-500);
      }
    }
  }

  // 创建Express中间件
  createMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();

      // 监听响应完成事件
      res.on("finish", () => {
        const responseTime = Date.now() - startTime;
        this.logRequest(req, res, responseTime);
      });

      next();
    };
  }

  // 关闭服务
  async shutdown() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    // 发送剩余的日志
    if (this.logQueue.length > 0) {
      await this.flushQueue();
    }
  }
}

// 创建单例实例
const logForwarder = new LogForwarder();

module.exports = logForwarder;
