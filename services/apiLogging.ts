import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

class LogForwarderClient {
  logServiceUrl: string;
  batchSize: number;
  batchTimeout: number;
  logQueue: any[];
  batchTimer: null | NodeJS.Timeout;
  constructor() {
    this.logServiceUrl = "http://localhost:3100";
    this.batchSize = parseInt(process.env.NEXT_PUBLIC_LOG_BATCH_SIZE || "10");
    this.batchTimeout = parseInt(
      process.env.NEXT_PUBLIC_LOG_BATCH_TIMEOUT || "5000"
    );
    this.logQueue = [];
    this.batchTimer = null;

    this.startBatchProcessor();
  }

  // 记录API请求日志
  logRequest(method, url, statusCode, responseTime, additionalData = {}) {
    const logData = {
      level: "info",
      message: `${method} ${url}`,
      meta: {
        type: "api_request",
        method,
        url,
        statusCode,
        responseTime,
        timestamp: new Date().toISOString(),
        ...additionalData,
      },
    };

    this.addToQueue(logData);
  }

  // 记录错误日志
  logError(error, additionalData = {}) {
    const logData = {
      level: "error",
      message: error.message || "Unknown error",
      meta: {
        type: "api_error",
        stack: error.stack,
        timestamp: new Date().toISOString(),
        ...additionalData,
      },
    };

    this.addToQueue(logData);
  }

  // 记录自定义日志
  log(level, message, meta = {}) {
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
      await (axios as any).post(`${this.logServiceUrl}/logs/batch`, { logs });
    } catch (error) {
      // console.error("Failed to forward logs to log service:", error);
      // 如果发送失败，将日志重新加入队列
      this.logQueue.unshift(...logs);

      // 限制队列大小，防止内存溢出
      if (this.logQueue.length > 1000) {
        this.logQueue = this.logQueue.slice(-500);
      }
    }
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
const logForwarderClient = new LogForwarderClient();

/**
 * 非侵入式API请求日志中间件
 * 只记录基本信息，不修改响应对象
 */
export function withLogging(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now();

    try {
      // 执行原始处理器
      await handler(req, res);

      // 记录成功的请求（在响应发送后）
      const responseTime = Date.now() - startTime;

      logForwarderClient.logRequest(
        req.method || "UNKNOWN",
        req.url || "unknown",
        res.statusCode,
        responseTime,
        {
          query: req.query,
          body: req.body,
          userAgent: req.headers["user-agent"],
          referer: req.headers.referer,
          ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress,
        }
      );
    } catch (error) {
      // 记录错误
      const responseTime = Date.now() - startTime;
      logForwarderClient.logError(error as Error, {
        method: req.method,
        url: req.url,
        query: req.query,
        userAgent: req.headers["user-agent"],
        ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress,
        responseTime,
      });

      // 不干涉错误处理，让上层处理
      throw error;
    }
  };
}

/**
 * 简单的日志包装函数，用于不需要捕获响应数据的场景
 */
export function logApiRequest(
  req: NextApiRequest,
  res: NextApiResponse,
  responseTime: number,
  additionalData = {}
) {
  logForwarderClient.logRequest(
    req.method || "UNKNOWN",
    req.url || "unknown",
    res.statusCode,
    responseTime,
    {
      query: req.query,
      userAgent: req.headers["user-agent"],
      referer: req.headers.referer,
      ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress,
      ...additionalData,
    }
  );
}

/**
 * 记录API错误
 */
export function logApiError(
  error: Error,
  req: NextApiRequest,
  additionalData = {}
) {
  logForwarderClient.logError(error, {
    method: req.method,
    url: req.url,
    query: req.query,
    userAgent: req.headers["user-agent"],
    ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress,
    ...additionalData,
  });
}
