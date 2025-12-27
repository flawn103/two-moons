# Log Service

A Winston-based logging service for recording API requests and error logs, supporting 48-hour log retention.

## File Structure

```
log-service/
├── server.js              # Express server main file
├── logger.js              # Winston logger configuration
├── logForwarder.js        # Log forwarder (client-side)
├── package.json           # Project dependency configuration
├── README.md              # Detailed documentation
├── .gitignore             # Git ignore file
├── logs/                  # Log output directory
│   ├── application-YYYY-MM-DD-HH.log  # Application logs
│   └── error-YYYY-MM-DD-HH.log        # Error logs
└── node_modules/          # Dependency package directory
```

## Core Features

### 1. Winston Logging System (logger.js)
- **Log Levels**: info, warn, error, debug
- **File Rotation**: Generates new log files every hour
- **Retention Policy**: Automatically cleans up after 48 hours
- **Dual Loggers**: Separates application logs and error logs
- **Format**: JSON format, including timestamps and error stacks

### 2. Express Log Service (server.js)
- **Port**: Defaults to 3100 (configurable via LOG_SERVICE_PORT)
- **API Endpoints**:
  - `GET /health` - Health check
  - `POST /log` - Single log record
  - `POST /logs/batch` - Batch log record
- **Middleware**: CORS support, 10MB request limit
- **Graceful Shutdown**: Handles SIGTERM and SIGINT

### 3. Log Forwarder (logForwarder.js)
- **Batch Processing**: Configurable batch size and timeout
- **Queue Management**: In-memory queue, supports retry on failure
- **Middleware**: Express middleware to automatically record requests
- **Performance Optimization**: Asynchronous sending, does not affect API response time

## Environment Variable Configuration

| Variable Name | Description | Default Value |
|--------|------|--------|
| LOG_SERVICE_PORT | Log service port number | 3100 |
| ENABLE_LOG_FORWARDING | Enable log forwarding | false |
| LOG_SERVICE_URL | Log service URL | http://localhost:3100 |
| LOG_BATCH_SIZE | Batch processing size | 10 |
| LOG_BATCH_TIMEOUT | Batch processing timeout (ms) | 5000 |

## Usage

### 1. Start Log Service
```bash
cd log-service
npm start
# or
node server.js
```

### 2. Integrate in Next.js Application
Use functions provided by `../services/apiLogging.ts` in API routes:
- `withLogging()` - Decorator wrapper
- `logApiRequest()` - Manually log request
- `logApiError()` - Manually log error

## Log Format

### Request Log
```json
{
  "level": "info",
  "message": "GET /api/posts",
  "timestamp": "2024-01-01T10:00:00.000Z",
  "service": "api-gateway",
  "type": "api_request",
  "method": "GET",
  "url": "/api/posts",
  "statusCode": 200,
  "responseTime": 150,
  "ip": "127.0.0.1"
}
```

### Error Log
```json
{
  "level": "error",
  "message": "Database connection failed",
  "timestamp": "2024-01-01T10:00:00.000Z",
  "type": "api_error",
  "stack": "Error: ...\n    at ...",
  "method": "POST",
  "url": "/api/data"
}
```

## Performance Features

- **Asynchronous Processing**: Log recording does not affect API response time
- **Batch Sending**: Reduces the number of network requests
- **Memory Queue**: Caches logs when the service is unavailable
- **Automatic Cleanup**: 48-hour log rotation to avoid disk usage issues
- **Queue Limit**: Maximum 1000 logs to prevent memory overflow

## Failure Recovery

- **Retry Mechanism**: Automatically retries on send failure
- **Queue Protection**: Discards old logs when limit is exceeded
- **Graceful Shutdown**: Ensures remaining logs are sent

## Development Status

- ✅ Basic logging functionality
- ✅ Batch processing
- ✅ File rotation
- ✅ Error handling
- ✅ Performance optimization
- 🔄 Test coverage (To be improved)
