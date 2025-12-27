const express = require("express");
const cors = require("cors");
const { logger, errorLogger } = require("./logger");

const app = express();
const PORT = process.env.LOG_SERVICE_PORT || 3100;

// 中间件
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// 健康检查接口
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// 日志记录接口
app.post("/log", (req, res) => {
  try {
    const { level, message, meta = {} } = req.body;

    if (!level || !message) {
      return res
        .status(400)
        .json({ error: "Missing required fields: level, message" });
    }

    const logData = {
      ...meta,
      timestamp: new Date().toISOString(),
      service: "api-gateway",
    };

    switch (level.toLowerCase()) {
      case "error":
        errorLogger.error(message, logData);
        break;
      case "warn":
        logger.warn(message, logData);
        break;
      case "info":
        logger.info(message, logData);
        break;
      case "debug":
        logger.debug(message, logData);
        break;
      default:
        logger.info(message, logData);
    }

    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Log service error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 批量日志记录接口
app.post("/logs/batch", (req, res) => {
  try {
    const { logs } = req.body;

    if (!Array.isArray(logs)) {
      return res.status(400).json({ error: "logs must be an array" });
    }

    logs.forEach((log) => {
      const { level, message, meta = {} } = log;
      const logData = {
        ...meta,
        timestamp: new Date().toISOString(),
        service: "api-gateway",
      };

      switch (level.toLowerCase()) {
        case "error":
          errorLogger.error(message, logData);
          break;
        case "warn":
          logger.warn(message, logData);
          break;
        case "info":
          logger.info(message, logData);
          break;
        case "debug":
          logger.debug(message, logData);
          break;
        default:
          logger.info(message, logData);
      }
    });

    res.json({
      success: true,
      count: logs.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Batch log service error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 启动服务器
const server = app.listen(PORT, () => {
  console.log(`Log service running on port ${PORT}`);
  logger.info("Log service started", { port: PORT });
});

// 优雅关闭
process.on("SIGTERM", () => {
  console.log("Received SIGTERM, shutting down gracefully");
  server.close(() => {
    console.log("Log service closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("Received SIGINT, shutting down gracefully");
  server.close(() => {
    console.log("Log service closed");
    process.exit(0);
  });
});

module.exports = app;
