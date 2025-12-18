# Antigravity to OpenAI API Proxy Service

A proxy service that converts the Google Antigravity API into an OpenAI-compatible format, supporting streaming responses, tool calls, and multi-account management.

## Features

- ✅ OpenAI API 兼容格式
- ✅ 流式和非流式响应
- ✅ 工具调用（Function Calling）支持
- ✅ 多账号自动轮换（支持多种轮询策略）
- ✅ Token 自动刷新
- ✅ API Key 认证
- ✅ 思维链（Thinking）输出，兼容 OpenAI reasoning_effort 参数和 DeepSeek reasoning_content 格式
- ✅ 图片输入支持（Base64 编码）
- ✅ 图片生成支持（gemini-3-pro-image 模型）
- ✅ Pro 账号随机 ProjectId 支持
- ✅ 模型额度查看（实时显示剩余额度和重置时间）
- ✅ SD WebUI API 兼容（支持 txt2img/img2img）
- ✅ 心跳机制（防止 Cloudflare 超时断连）
- ✅ 模型列表缓存（减少 API 请求）
- ✅ 资格校验自动回退（无资格时自动生成随机 ProjectId）
- ✅ 真 System 消息合并（开头连续多条 system 与 SystemInstruction 合并）
- ✅ 隐私模式（自动隐藏敏感信息）
- ✅ 内存优化（从 8+ 进程减少为 2 个进程，内存占用从 100MB+ 降为 50MB+）
- ✅ 对象池复用（减少 50%+ 临时对象创建，降低 GC 频率）

## Environment Requirements

- Node.js >= 18.0.0

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and edit the configuration:

```bash
cp .env.example .env
```

Edit the `.env` file to configure necessary parameters:

```env
# Required Configuration
API_KEY=sk-text
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
JWT_SECRET=your-jwt-secret-key-change-this-in-production

# 可选配置
# PROXY=http://127.0.0.1:7890
# SYSTEM_INSTRUCTION=你是聊天机器人
# IMAGE_BASE_URL=http://your-domain.com
```

### 3. Login to Get Token

```bash
npm run login
```

The browser will automatically open the Google authorization page. After authorization, the Token will be saved to `data/accounts.json`.

### 4. Start Service

```bash
npm start
```

The service will start at `http://localhost:8045`.

## Docker Deployment

### Using Docker Compose (Recommended)

1. **Configure Environment Variables**

Create `.env` file:

```bash
cp .env.example .env
```

Edit the `.env` file to configure necessary parameters.

2. **Start Service**

```bash
docker-compose up -d
```

3. **View Logs**

```bash
docker-compose logs -f
```

4. **Stop Service**

```bash
docker-compose down
```

### Using Docker

1. **Build Image**

```bash
docker build -t antigravity2api .
```

2. **Run Container**

```bash
docker run -d \
  --name antigravity2api \
  -p 8045:8045 \
  -e API_KEY=sk-text \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=admin123 \
  -e JWT_SECRET=your-jwt-secret-key \
  -e IMAGE_BASE_URL=http://your-domain.com \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/public/images:/app/public/images \
  -v $(pwd)/.env:/app/.env \
  -v $(pwd)/config.json:/app/config.json \
  antigravity2api
```

3. **View Logs**

```bash
docker logs -f antigravity2api
```

### Docker Deployment Instructions

- Data Persistence: `data/` directory is mounted to the container to save Token data.
- Image Storage: `public/images/` directory is mounted to the container to save generated images.
- Configuration Files: `.env` and `config.json` are mounted to the container, supporting hot updates.
- Port Mapping: Default mapping is port 8045, modify as needed.
- Automatic Restart: Container will automatically restart if it exits abnormally.

## Zeabur Deployment

### Deploy Using Pre-built Image

1. **Create Service**

Create a new service in the Zeabur console using the following image:

```
ghcr.io/liuw1535/antigravity2api-nodejs
```

2. **Configure Environment Variables**

Add the following environment variables in the service settings:

| Environment Variable | Description | Example Value |
|--------|------|--------|
| `API_KEY` | API Authentication Key | `sk-your-api-key` |
| `ADMIN_USERNAME` | Administrator Username | `admin` |
| `ADMIN_PASSWORD` | Administrator Password | `your-secure-password` |
| `JWT_SECRET` | JWT Secret | `your-jwt-secret-key` |
| `IMAGE_BASE_URL` | Image Service Base URL | `https://your-domain.zeabur.app` |

Optional Environment Variables:
- `PROXY`: Proxy address
- `SYSTEM_INSTRUCTION`: System prompt

3. **Configure Persistent Storage**

Add the following mount points in the service's "Volumes" settings:

| Mount Path | Description |
|---------|------|
| `/app/data` | Token Data Storage |
| `/app/public/images` | Generated Image Storage |

⚠️ **Important Note**:
- Only mount `/app/data` and `/app/public/images`.
- Do not mount other directories (such as `/app/.env`, `/app/config.json`, etc.), otherwise necessary configuration files may be cleared and the project will fail to start.

4. **Bind Domain**

Bind a domain in the service's "Networking" settings, then set that domain to the `IMAGE_BASE_URL` environment variable.

5. **Start Service**

After saving the configuration, Zeabur will automatically pull the image and start the service. Access via the bound domain.

### Zeabur Deployment Instructions

- Use pre-built Docker image, no manual build required.
- Configure all necessary parameters via environment variables.
- Persistent storage ensures Token and image data are not lost.

## Web Management Interface

After the service starts, visit `http://localhost:8045` to open the Web Management Interface.

### Features

- 🔐 **Secure Login**: JWT Token authentication, protecting management interfaces.
- 📊 **Real-time Statistics**: Display total Token count, enable/disable status statistics.
- ➕ **Multiple Addition Methods**:
  - OAuth Login (Recommended): Automatically complete Google authorization process.
  - Manual Entry: Directly input Access Token and Refresh Token.
- 🎯 **Token Management**:
  - View detailed information of all Tokens (Access Token suffix, Project ID, expiration time).
  - 📊 View model quotas: Grouped by type (Claude/Gemini/Others), real-time view of remaining quota and reset time.
  - One-click Enable/Disable Token.
  - Delete invalid Tokens.
  - Real-time refresh of Token list.
- ⚙️ **Configuration Management**:
  - Online editing of server configuration (port, listening address).
  - Adjust default parameters (temperature, Top P/K, max Tokens).
  - Modify security configuration (API key, request size limit).
  - Configure proxy, system prompt, and other optional settings.
  - Hot reload configuration (some configurations require restart to take effect).

### Usage Flow

1. **Login to System**
   - Login using `ADMIN_USERNAME` and `ADMIN_PASSWORD` configured in `.env`.
   - After successful login, JWT Token will be automatically saved to the browser.

2. **Add Token**
   - **OAuth Method** (Recommended):
     1. Click "OAuth Login" button.
     2. Click "Open Authorization Page" in the popup.
     3. Complete Google authorization in the new window.
     4. Copy the full callback URL from the browser address bar.
     5. Paste into the input box and submit.
   - **Manual Method**:
     1. Click "Manual Entry" button.
     2. Fill in Access Token, Refresh Token, and expiration time.
     3. Submit to save.

3. **Manage Tokens**
   - View status and information on Token cards.
   - Click "📊 View Quota" button to view model quota information for that account.
     - Automatically grouped by model type (Claude/Gemini/Others).
     - Display remaining quota percentage and progress bar.
     - Display quota reset time (Beijing Time).
     - Support "Refresh Now" to force update quota data.
   - Use "Enable/Disable" button to control Token status.
   - Use "Delete" button to remove invalid Tokens.
   - Click "Refresh" button to update the list.

4. **隐私模式**
   - 默认开启，自动隐藏 Token、Project ID 等敏感信息
   - 点击「显示敏感信息」切换显示/隐藏状态
   - 支持逐个查看或批量显示

5. **配置轮询策略**
   - 支持三种轮询策略：
     - `round_robin`：均衡负载，每次请求切换 Token
     - `quota_exhausted`：额度耗尽才切换
     - `request_count`：自定义请求次数后切换
   - 可在「设置」页面配置

6. **修改配置**
   - 切换到「设置」标签页
   - 修改需要调整的配置项
   - 点击「保存配置」按钮应用更改
   - 注意：端口和监听地址修改需要重启服务
   - 支持的设置项：
     - 编辑 Token 信息（Access Token、Refresh Token）
     - 思考预算（1024-32000）
     - 图片访问地址
     - 轮询策略
     - 内存阈值
     - 心跳间隔
     - 字体大小

### Interface Preview

- **Token 管理页面**：卡片式展示所有 Token，支持快速操作
- **设置页面**：分类展示所有配置项，支持在线编辑
- **响应式设计**：支持桌面和移动设备访问
- **字体优化**：采用 MiSans + Ubuntu Mono 字体，增强可读性

## API Usage

The service provides an OpenAI-compatible API interface. For detailed usage instructions, please see [API.md](API.md).

### Quick Test

```bash
curl http://localhost:8045/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-text" \
  -d '{
    "model": "gemini-2.0-flash-exp",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## Multi-Account Management

`data/accounts.json` supports multiple accounts, and the service will automatically rotate between them:

```json
[
  {
    "access_token": "ya29.xxx",
    "refresh_token": "1//xxx",
    "expires_in": 3599,
    "timestamp": 1234567890000,
    "enable": true
  },
  {
    "access_token": "ya29.yyy",
    "refresh_token": "1//yyy",
    "expires_in": 3599,
    "timestamp": 1234567890000,
    "enable": true
  }
]
```

- `enable: false` can disable a specific account.
- Tokens will automatically refresh upon expiration.
- Refresh failure (403) will automatically disable the account and switch to the next one.

## Configuration Description

Project configuration is divided into two parts:

### 1. config.json (Basic Configuration)

Basic configuration file, including server, API, and default parameter settings:

```json
{
  "server": {
    "port": 8045,              // 服务端口
    "host": "0.0.0.0",         // 监听地址
    "maxRequestSize": "500mb", // 最大请求体大小
    "heartbeatInterval": 15000,// 心跳间隔（毫秒），防止 Cloudflare 超时
    "memoryThreshold": 100     // 内存阈值（MB），超过时触发 GC
  },
  "rotation": {
    "strategy": "round_robin", // 轮询策略：round_robin/quota_exhausted/request_count
    "requestCount": 50         // request_count 策略下每个 Token 的请求次数
  },
  "defaults": {
    "temperature": 1,          // 默认温度参数
    "topP": 1,                 // 默认 top_p
    "topK": 50,                // 默认 top_k
    "maxTokens": 32000,        // 默认最大 token 数
    "thinkingBudget": 1024     // 默认思考预算（仅对思考模型生效，范围 1024-32000）
  },
  "cache": {
    "modelListTTL": 3600000    // 模型列表缓存时间（毫秒），默认 1 小时
  },
  "other": {
    "timeout": 300000,         // 请求超时时间（毫秒）
    "skipProjectIdFetch": false,// 跳过 ProjectId 获取，直接随机生成（仅 Pro 账号有效）
    "useNativeAxios": false    // 使用原生 axios 而非 AntigravityRequester
  }
}
```

### 轮询策略说明

| 策略 | 说明 |
|------|------|
| `round_robin` | 均衡负载：每次请求后切换到下一个 Token |
| `quota_exhausted` | 额度耗尽才切换：持续使用当前 Token 直到额度用完 |
| `request_count` | 自定义次数：每个 Token 使用指定次数后切换 |

### 2. .env（敏感配置）

Environment variable configuration file, containing sensitive information and optional configurations:

| Environment Variable | Description | Required |
|--------|------|------|
| `API_KEY` | API 认证密钥 | ✅ |
| `ADMIN_USERNAME` | 管理员用户名 | ✅ |
| `ADMIN_PASSWORD` | 管理员密码 | ✅ |
| `JWT_SECRET` | JWT 密钥 | ✅ |
| `PROXY` | 代理地址（如：http://127.0.0.1:7890），也支持系统代理环境变量 
|`HTTP_PROXY`/`HTTPS_PROXY` | ❌ |
| `SYSTEM_INSTRUCTION` | 系统提示词 | ❌ |
| `IMAGE_BASE_URL` | 图片服务基础 URL | ❌ |

For a complete configuration example, please refer to the `.env.example` file.

## Development Commands

```bash
# Start Service
npm start

# Development Mode (Auto Restart)
npm run dev

# Login to Get Token
npm run login
```

## Project Structure

```
.
├── data/
│   ├── accounts.json       # Token 存储（自动生成）
│   └── quotas.json         # 额度缓存（自动生成）
├── public/
│   ├── index.html          # Web 管理界面
│   ├── app.js              # 前端逻辑
│   ├── style.css           # 界面样式
│   └── images/             # 生成的图片存储目录
├── scripts/
│   ├── oauth-server.js     # OAuth login service
│   └── refresh-tokens.js   # Token refresh script
├── src/
│   ├── api/
│   │   └── client.js       # API 调用逻辑（含模型列表缓存）
│   ├── auth/
│   │   ├── jwt.js          # JWT 认证
│   │   ├── token_manager.js # Token 管理（含轮询策略）
│   │   └── quota_manager.js # 额度缓存管理
│   ├── routes/
│   │   ├── admin.js        # 管理接口路由
│   │   └── sd.js           # SD WebUI 兼容接口
│   ├── bin/
│   │   ├── antigravity_requester_android_arm64   # Android ARM64 TLS requester
│   │   ├── antigravity_requester_linux_amd64     # Linux AMD64 TLS requester
│   │   └── antigravity_requester_windows_amd64.exe # Windows AMD64 TLS requester
│   ├── config/
│   │   ├── config.js       # 配置加载
│   │   └── init-env.js     # 环境变量初始化
│   ├── constants/
│   │   └── oauth.js        # OAuth 常量
│   ├── server/
│   │   └── index.js        # 主服务器（含内存管理和心跳）
│   ├── utils/
│   │   ├── configReloader.js # 配置热重载
│   │   ├── deepMerge.js    # 深度合并工具
│   │   ├── envParser.js    # 环境变量解析
│   │   ├── idGenerator.js  # ID 生成器
│   │   ├── imageStorage.js # 图片存储
│   │   ├── logger.js       # 日志模块
│   │   └── utils.js        # 工具函数
│   └── AntigravityRequester.js # TLS 指纹请求器封装
├── test/
│   ├── test-request.js     # 请求测试
│   ├── test-image-generation.js # 图片生成测试
│   ├── test-token-rotation.js # Token 轮换测试
│   └── test-transform.js   # 转换测试
├── .env                    # 环境变量配置（敏感信息）
├── .env.example            # 环境变量配置示例
├── config.json             # 基础配置文件
├── Dockerfile              # Docker 构建文件
├── docker-compose.yml      # Docker Compose 配置
└── package.json            # 项目配置
```

## Pro Account Random ProjectId

For Pro subscription accounts, you can skip API validation and use a randomly generated ProjectId directly:

1. Set in `config.json` file:
```json
{
  "other": {
    "skipProjectIdFetch": true
  }
}
```

2. When running `npm run login`, a randomly generated ProjectId will be automatically used.

3. Existing accounts will also automatically generate a random ProjectId when used.

Note: This feature is only applicable to Pro subscription accounts. The official has fixed the vulnerability where free accounts could use random ProjectIds.

## 资格校验自动回退

当 OAuth 登录或添加 Token 时，系统会自动检测账号的订阅资格：

1. **有资格的账号**：正常使用 API 返回的 ProjectId
2. **无资格的账号**：自动生成随机 ProjectId，避免添加失败

这一机制确保了：
- 无论账号是否有 Pro 订阅，都能成功添加 Token
- 自动降级处理，无需手动干预
- 不会因为资格校验失败而阻止登录流程

## 真 System 消息合并

本服务支持将开头连续的多条 system 消息与全局 SystemInstruction 合并：

```
请求消息：
[system] 你是助手
[system] 请使用中文回答
[user] 你好

合并后：
SystemInstruction = 全局配置的系统提示词 + "\n\n" + "你是助手\n\n请使用中文回答"
messages = [{role: user, content: 你好}]
```

这一设计：
- 兼容 OpenAI 的多 system 消息格式
- 充分利用 Antigravity 的 SystemInstruction 功能
- 确保系统提示词的完整性和优先级

## 思考预算（Thinking Budget）

对于支持思考能力的模型（如 gemini-2.0-flash-thinking-exp），可以通过以下方式控制思考深度：

### 方式一：使用 reasoning_effort 参数（OpenAI 兼容）

```json
{
  "model": "gemini-2.0-flash-thinking-exp",
  "reasoning_effort": "high",
  "messages": [...]
}
```

| 值 | 思考 Token 预算 |
|---|----------------|
| `low` | 1024 |
| `medium` | 16000 |
| `high` | 32000 |

### 方式二：使用 thinking_budget 参数（精确控制）

```json
{
  "model": "gemini-2.0-flash-thinking-exp",
  "thinking_budget": 24000,
  "messages": [...]
}
```

- 范围：1024 - 32000
- 优先级：`thinking_budget` > `reasoning_effort` > 配置文件默认值

### DeepSeek 思考格式兼容

本服务自动适配 DeepSeek 的 `reasoning_content` 格式，将思维链内容单独输出，避免与正常内容混淆：

```json
{
  "choices": [{
    "message": {
      "content": "最终答案",
      "reasoning_content": "这是思考过程..."
    }
  }]
```

## 内存优化

本服务经过深度内存优化：

### 优化效果

| 指标 | 优化前 | 优化后 |
|------|--------|--------|
| 进程数 | 8+ | 2 |
| 内存占用 | 100MB+ | 50MB+ |
| GC 频率 | 高 | 低 |

### 优化手段

1. **对象池复用**：流式响应对象通过对象池复用，减少 50%+ 临时对象创建
2. **预编译常量**：正则表达式、格式字符串等预编译，避免重复创建
3. **LineBuffer 优化**：高效的流式行分割，避免频繁字符串操作
4. **自动内存清理**：堆内存超过阈值（默认 100MB）时自动触发 GC
5. **进程精简**：移除不必要的子进程，统一在主进程处理

### 配置

```json
{
  "server": {
    "memoryThreshold": 100
  }
}
```

- `memoryThreshold`：触发 GC 的堆内存阈值（MB）

## 心跳机制

为防止 Cloudflare 等 CDN 因长时间无响应而断开连接，本服务实现了 SSE 心跳机制：

- 在流式响应期间，定期发送心跳包（`: heartbeat\n\n`）
- 默认间隔 15 秒，可配置
- 心跳包符合 SSE 规范，客户端会自动忽略

### 配置

```json
{
  "server": {
    "heartbeatInterval": 15000
  }
}
```

- `heartbeatInterval`：心跳间隔（毫秒），设为 0 禁用心跳

## 注意事项

1. For first-time use, copy `.env.example` to `.env` and configure it.
2. Run `npm run login` to get Token.
3. `.env` and `data/accounts.json` contain sensitive information, do not leak.
4. Initializes multi-account rotation to improve availability.
5. Token refreshes automatically, no manual maintenance needed.

## License

MIT
