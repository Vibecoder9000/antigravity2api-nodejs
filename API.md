# API Usage Documentation

This document describes how to use the OpenAI-compatible API provided by Antigravity2API.

## Basic Configuration

All API requests need to carry the API Key in the Header:

```
Authorization: Bearer YOUR_API_KEY
```

Default service address: `http://localhost:8045`

## 目录

- [获取模型列表](#获取模型列表)
- [聊天补全](#聊天补全)
- [工具调用](#工具调用function-calling)
- [图片输入](#图片输入多模态)
- [图片生成](#图片生成)
- [思维链模型](#思维链模型)
- [SD WebUI 兼容 API](#sd-webui-兼容-api)
- [管理 API](#管理-api)
- [使用示例](#使用示例)

## 获取模型列表

```bash
curl http://localhost:8045/v1/models \
  -H "Authorization: Bearer sk-text"
```

**说明**：模型列表会缓存 1 小时（可通过 `config.json` 的 `cache.modelListTTL` 配置），减少 API 请求。

## 聊天补全

### Streaming Response

```bash
curl http://localhost:8045/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-text" \
  -d '{
    "model": "gemini-2.0-flash-exp",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

### Non-Streaming Response

```bash
curl http://localhost:8045/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-text" \
  -d '{
    "model": "gemini-2.0-flash-exp",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

## Tool Calling (Function Calling)

```bash
curl http://localhost:8045/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-text" \
  -d '{
    "model": "gemini-2.0-flash-exp",
    "messages": [{"role": "user", "content": "What is the weather in Beijing?"}],
    "tools": [{
      "type": "function",
      "function": {
        "name": "get_weather",
        "description": "Get weather information",
        "parameters": {
          "type": "object",
          "properties": {
            "location": {"type": "string", "description": "City name"}
          },
          "required": ["location"]
        }
      }
    }]
  }'
```

## Image Input (Multimodal)

Supports Base64 encoded image input, compatible with OpenAI's multimodal format:

```bash
curl http://localhost:8045/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-text" \
  -d '{
    "model": "gemini-2.0-flash-exp",
    "messages": [{
      "role": "user",
      "content": [
        {"type": "text", "text": "What is in this image?"},
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
          }
        }
      ]
    }],
    "stream": true
  }'
```

### Supported Image Formats

- JPEG/JPG (`data:image/jpeg;base64,...`)
- PNG (`data:image/png;base64,...`)
- GIF (`data:image/gif;base64,...`)
- WebP (`data:image/webp;base64,...`)

## Image Generation

支持使用 `gemini-3-pro-image` 模型生成图片，生成的图片会以 Markdown 格式返回：

    "model": "gemini-3-pro-image",
    "messages": [{"role": "user", "content": "画一只可爱的猫"}],
    "stream": false
  }'
```

**响应示例**：
```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "![image](http://localhost:8045/images/abc123.png)"
    }
  }]
}
```

**注意**：
- 生成的图片会保存到 `public/images/` 目录
- 需要配置 `IMAGE_BASE_URL` 环境变量以返回正确的图片 URL

## 请求参数说明

| Parameter | Type | Required | Description |
|------|------|------|------|
| `model` | string | ✅ | 模型名称 |
| `messages` | array | ✅ | 对话消息列表 |
| `stream` | boolean | ❌ | 是否流式响应，默认 false |
| `temperature` | number | ❌ | 温度参数，默认 1 |
| `top_p` | number | ❌ | Top P 参数，默认 1 |
| `top_k` | number | ❌ | Top K 参数，默认 50 |
| `max_tokens` | number | ❌ | 最大 token 数，默认 32000 |
| `thinking_budget` | number | ❌ | 思考预算（仅对思考模型生效），可为 0 或 1024-32000，默认 16000（0 表示关闭思考预算限制） |
| `reasoning_effort` | string | ❌ | 思维链强度（OpenAI 格式），可选值：`low`(1024)、`medium`(16000)、`high`(32000) |
| `tools` | array | ❌ | 工具列表（Function Calling） |

## Response Format

### Non-Streaming Response

```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gemini-2.0-flash-exp",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Hello! How can I help you?"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

### Streaming Response

```
data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1234567890,"model":"gemini-2.0-flash-exp","choices":[{"index":0,"delta":{"role":"assistant","content":"He"},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","created":1234567890,"model":"gemini-2.0-flash-exp","choices":[{"index":0,"delta":{"content":"llo"},"finish_reason":null}]}

data: [DONE]
```

## Error Handling

API returns standard HTTP status codes:

| Status Code | Description |
|--------|------|
| 200 | Request successful |
| 400 | Request parameter error |
| 401 | Invalid API Key |
| 429 | Request too frequent |
| 500 | Server internal error |

Error response format:

```json
{
  "error": {
    "message": "Error message",
    "type": "invalid_request_error",
    "code": "invalid_api_key"
  }
}
```

## 思维链模型

对于支持思维链的模型（如 `gemini-2.5-pro`、`claude-opus-4-5-thinking` 等），可以通过以下参数控制推理深度：

### 使用 reasoning_effort（OpenAI 兼容格式）

```bash
curl http://localhost:8045/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-text" \
  -d '{
    "model": "gemini-2.5-pro",
    "messages": [{"role": "user", "content": "解释量子纠缠"}],
    "stream": true,
    "reasoning_effort": "high"
  }'
```

| reasoning_effort | thinking_budget | 说明 |
|-----------------|-----------------|------|
| `low` | 1024 | 快速响应，适合简单问题 |
| `medium` | 16000 | 平衡模式（默认） |
| `high` | 32000 | 深度思考，适合复杂推理 |

### 使用 thinking_budget（直接数值）

```bash
curl http://localhost:8045/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-text" \
  -d '{
    "model": "gemini-2.5-pro",
    "messages": [{"role": "user", "content": "证明勾股定理"}],
      "stream": true,
    "thinking_budget": 24000
  }'
```

### 429 自动重试配置

所有 429 重试次数仅通过服务端配置控制：

- 全局默认重试次数（服务端配置）：
  - 文件：`config.json` 中的 `other.retryTimes`
  - 示例：
    ```json
    "other": {
      "timeout": 300000,
      "retryTimes": 3,
      "skipProjectIdFetch": false,
      "useNativeAxios": false
    }
    ```
  - 服务器始终使用这里配置的值作为 429 时的重试次数（默认 3 次）。

### 思维链响应格式

思维链内容通过 `reasoning_content` 字段输出（兼容 DeepSeek 格式）：

**非流式响应**：
```json
{
  "choices": [{
    "message": {
      "role": "assistant",
      "reasoning_content": "让我思考一下这个问题...",
      "content": "量子纠缠是..."
    }
  }]
}
```

**流式响应**：
```
data: {"choices":[{"delta":{"reasoning_content":"让我"}}]}
data: {"choices":[{"delta":{"reasoning_content":"思考..."}}]}
data: {"choices":[{"delta":{"content":"量子纠缠是..."}}]}
```

### 支持思维链的模型

- `gemini-2.5-pro`
- `gemini-2.5-flash-thinking`
- `gemini-3-pro-high`
- `gemini-3-pro-low`
- `claude-opus-4-5-thinking`
- `claude-sonnet-4-5-thinking`
- `rev19-uic3-1p`
- `gpt-oss-120b-medium`

## SD WebUI 兼容 API

本服务提供与 Stable Diffusion WebUI 兼容的 API 接口，可用于与支持 SD WebUI API 的客户端集成。

### 文本生成图片

```bash
curl http://localhost:8045/sdapi/v1/txt2img \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a cute cat, high quality, detailed",
    "negative_prompt": "",
    "steps": 20,
    "width": 512,
    "height": 512
  }'
```

### 图片生成图片

```bash
curl http://localhost:8045/sdapi/v1/img2img \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "enhance this image, high quality",
    "init_images": ["BASE64_ENCODED_IMAGE"],
    "steps": 20
  }'
```

### 其他 SD API 端点

| 端点 | 说明 |
|------|------|
| `GET /sdapi/v1/sd-models` | 获取可用的图片生成模型 |
| `GET /sdapi/v1/options` | 获取当前选项 |
| `GET /sdapi/v1/samplers` | 获取可用的采样器 |
| `GET /sdapi/v1/upscalers` | 获取可用的放大器 |
| `GET /sdapi/v1/progress` | 获取生成进度 |

## 管理 API

管理 API 需要 JWT 认证，先通过登录接口获取 token。

### 登录

```bash
curl http://localhost:8045/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

### Token 管理

```bash
# 获取 Token 列表
curl http://localhost:8045/admin/tokens \
  -H "Authorization: Bearer JWT_TOKEN"

# 添加 Token
curl http://localhost:8045/admin/tokens \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -d '{
    "access_token": "ya29.xxx",
    "refresh_token": "1//xxx",
    "expires_in": 3599
  }'

# 删除 Token
curl -X DELETE http://localhost:8045/admin/tokens/REFRESH_TOKEN \
  -H "Authorization: Bearer JWT_TOKEN"
```

### 查看模型额度

```bash
# 获取指定 Token 的模型额度
curl http://localhost:8045/admin/tokens/REFRESH_TOKEN/quotas \
  -H "Authorization: Bearer JWT_TOKEN"

# 强制刷新额度数据
curl "http://localhost:8045/admin/tokens/REFRESH_TOKEN/quotas?refresh=true" \
  -H "Authorization: Bearer JWT_TOKEN"
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "lastUpdated": 1702700000000,
    "models": {
      "gemini-2.5-pro": {
        "remaining": 0.85,
        "resetTime": "12-16 20:00",
        "resetTimeRaw": "2024-12-16T12:00:00Z"
      }
    }
  }
}
```

### 轮询策略配置

```bash
# 获取当前轮询配置
curl http://localhost:8045/admin/rotation \
  -H "Authorization: Bearer JWT_TOKEN"

# 更新轮询策略
curl -X PUT http://localhost:8045/admin/rotation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -d '{
    "strategy": "request_count",
    "requestCount": 20
  }'
```

**可用策略**：
- `round_robin`：每次请求切换 Token
- `quota_exhausted`：额度耗尽才切换
- `request_count`：自定义请求次数后切换

### 配置管理

```bash
# 获取配置
curl http://localhost:8045/admin/config \
  -H "Authorization: Bearer JWT_TOKEN"

# 更新配置
curl -X PUT http://localhost:8045/admin/config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -d '{
    "json": {
      "defaults": {
        "temperature": 0.7
      }
    }
  }'
```

## 使用示例

### Python

```python
import openai

openai.api_base = "http://localhost:8045/v1"
openai.api_key = "sk-text"

response = openai.ChatCompletion.create(
    model="gemini-2.0-flash-exp",
    messages=[{"role": "user", "content": "Hello"}],
    stream=True
)

for chunk in response:
    print(chunk.choices[0].delta.get("content", ""), end="")
```

### Node.js

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:8045/v1',
  apiKey: 'sk-text'
});

const stream = await openai.chat.completions.create({
  model: 'gemini-2.0-flash-exp',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: true
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

## Precautions

1. 所有 `/v1/*` 请求必须携带有效的 API Key
2. 管理 API (`/admin/*`) 需要 JWT 认证
3. 图片输入需要使用 Base64 编码
4. 流式响应使用 Server-Sent Events (SSE) 格式，包含心跳机制防止超时
5. 工具调用需要模型支持 Function Calling
6. 图片生成仅支持 `gemini-3-pro-image` 模型
7. 模型列表会缓存 1 小时，可通过配置调整
8. 思维链内容通过 `reasoning_content` 字段输出（兼容 DeepSeek 格式）
