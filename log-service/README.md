# Log Service

基于Winston的日志服务，用于记录API请求和错误日志，支持48小时日志保留。

## 功能特性

- 📝 基于Winston的日志记录
- 🔄 每日文件轮换，自动清理48小时前的日志
- 🚀 批量日志处理，提高性能
- 🌐 REST API接口接收日志
- 📊 支持请求响应时间统计
- 🔒 错误日志单独存储

## 快速开始

### 1. 启动日志服务

```bash
cd log-service
node start.js
```

或者使用npm脚本：
```bash
cd log-service
npm start
```

服务将在端口3002启动（可通过LOG_SERVICE_PORT环境变量修改）。

### 2. 在主应用中启用日志转发

在`.env`文件中添加：
```env
NEXT_PUBLIC_ENABLE_LOG_FORWARDING=true
NEXT_PUBLIC_LOG_SERVICE_URL=http://localhost:3100
NEXT_PUBLIC_LOG_BATCH_SIZE=10
NEXT_PUBLIC_LOG_BATCH_TIMEOUT=5000
```

### 3. 在API路由中使用日志记录

#### 方法1：使用withLogging包装器
```typescript
import { withLogging } from '@/services/apiLogging';

export default async function handler(req, res) {
  return withLogging(async (req, res) => {
    // 你的API逻辑
    const data = await someOperation();
    res.json(data);
  })(req, res);
}
```

#### 方法2：手动记录日志
```typescript
import { logApiRequest, logApiError } from '@/services/apiLogging';

export default async function handler(req, res) {
  const startTime = Date.now();
  
  try {
    // 你的API逻辑
    const data = await someOperation();
    
    const responseTime = Date.now() - startTime;
    logApiRequest(req, res, responseTime, { customData: 'value' });
    
    res.json(data);
  } catch (error) {
    logApiError(error, req, { customData: 'value' });
    res.status(500).json({ error: error.message });
  }
}
```

## API接口

### 健康检查
```http
GET /health
```

### 记录单条日志
```http
POST /log
Content-Type: application/json

{
  "level": "info",
  "message": "API request logged",
  "meta": {
    "method": "GET",
    "url": "/api/posts",
    "statusCode": 200,
    "responseTime": 150
  }
}
```

### 批量记录日志
```http
POST /logs/batch
Content-Type: application/json

{
  "logs": [
    {
      "level": "info",
      "message": "Request 1",
      "meta": { "data": "value1" }
    },
    {
      "level": "error",
      "message": "Request 2 failed",
      "meta": { "error": "details" }
    }
  ]
}
```

## 日志文件结构

```
log-service/
├── logs/
│   ├── application-YYYY-MM-DD-HH.log  # 应用日志（48小时保留）
│   └── error-YYYY-MM-DD-HH.log        # 错误日志（48小时保留）
├── logger.js          # Winston配置
├── server.js          # Express服务器
├── start.js           # 启动脚本
└── logForwarder.js    # 日志转发器
```

## 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| LOG_SERVICE_PORT | 日志服务端口号 | 3002 |
| ENABLE_LOG_FORWARDING | 是否启用日志转发 | false |
| LOG_SERVICE_URL | 日志服务URL | http://localhost:3100 |
| LOG_BATCH_SIZE | 批处理大小 | 10 |
| LOG_BATCH_TIMEOUT | 批处理超时时间（毫秒） | 5000 |

## 性能考虑

- 日志记录是异步的，不会影响API响应时间
- 批量处理减少网络请求次数
- 队列大小限制防止内存溢出
- 48小时日志自动清理，避免磁盘空间占用

## 故障处理

- 如果日志服务不可用，日志会被缓存在内存队列中
- 队列大小超过限制时，会丢弃最早的日志
- 服务恢复后会自动重试发送缓存的日志