# Antigravity to OpenAI API Proxy Service

A proxy service that converts the Google Antigravity API into an OpenAI-compatible format, supporting streaming responses, tool calls, and multi-account management.

## Features

- ✅ OpenAI API Compatible Format
- ✅ Streaming and Non-Streaming Responses
- ✅ Tool Calling (Function Calling) Support
- ✅ Multi-Account Automatic Rotation
- ✅ Token Automatic Refresh
- ✅ API Key Authentication
- ✅ Chain of Thought (Thinking) Output
- ✅ Image Input Support (Base64 Encoding)
- ✅ Image Generation Support (Big/Small Banana Models)
- ✅ Pro Account Random ProjectId Support

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

# Optional Configuration
# PROXY=http://127.0.0.1:7897
# SYSTEM_INSTRUCTION=You are a chat robot
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

4. **Modify Configuration**
   - Switch to "Settings" tab.
   - Modify configuration items as needed.
   - Click "Save Configuration" button to apply changes.
   - Note: Port and listening address modifications require service restart.

### Interface Preview

- **Token Management Page**: Card-style display of all Tokens, supporting quick operations.
- **Settings Page**: Categorized display of all configuration items, supporting online editing.
- **Responsive Design**: Supports desktop and mobile access.

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
    "port": 8045,              // Service port
    "host": "0.0.0.0",         // Listening address
    "maxRequestSize": "500mb"  // Max request body size
  },
  "defaults": {
    "temperature": 1,          // Default temperature
    "topP": 0.85,              // Default top_p
    "topK": 50,                // Default top_k
    "maxTokens": 8096          // Default max tokens
  },
  "other": {
    "timeout": 180000,         // Request timeout (ms)
    "skipProjectIdFetch": true // Skip ProjectId fetch, generate randomly directly
  }
}
```

### 2. .env (Sensitive Configuration)

Environment variable configuration file, containing sensitive information and optional configurations:

| Environment Variable | Description | Required |
|--------|------|------|
| `API_KEY` | API Authentication Key | ✅ |
| `ADMIN_USERNAME` | Administrator Username | ✅ |
| `ADMIN_PASSWORD` | Administrator Password | ✅ |
| `JWT_SECRET` | JWT Secret | ✅ |
| `PROXY` | Proxy Address (e.g., http://127.0.0.1:7897) | ❌ |
| `SYSTEM_INSTRUCTION` | System Prompt | ❌ |
| `IMAGE_BASE_URL` | Image Service Base URL | ❌ |

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
│   └── accounts.json       # Token storage (auto-generated)
├── public/
│   ├── index.html          # Web management interface
│   ├── app.js              # Frontend logic
│   └── style.css           # Interface styles
├── scripts/
│   ├── oauth-server.js     # OAuth login service
│   └── refresh-tokens.js   # Token refresh script
├── src/
│   ├── api/
│   │   └── client.js       # API call logic
│   ├── auth/
│   │   ├── jwt.js          # JWT authentication
│   │   └── token_manager.js # Token management
│   ├── routes/
│   │   └── admin.js        # Admin interface routes
│   ├── bin/
│   │   ├── antigravity_requester_android_arm64   # Android ARM64 TLS requester
│   │   ├── antigravity_requester_linux_amd64     # Linux AMD64 TLS requester
│   │   └── antigravity_requester_windows_amd64.exe # Windows AMD64 TLS requester
│   ├── config/
│   │   └── config.js       # Configuration loading
│   ├── server/
│   │   └── index.js        # Main server
│   ├── utils/
│   │   ├── idGenerator.js  # ID generator
│   │   ├── logger.js       # Logging module
│   │   └── utils.js        # Utility functions
│   └── AntigravityRequester.js # TLS fingerprint requester wrapper
├── test/
│   ├── test-request.js     # Request test
│   └── test-transform.js   # Transform test
├── .env                    # Environment variable configuration (sensitive info)
├── .env.example            # Environment variable configuration example
├── config.json             # Basic configuration file
└── package.json            # Project configuration
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

## Precautions

1. For first-time use, copy `.env.example` to `.env` and configure it.
2. Run `npm run login` to get Token.
3. `.env` and `data/accounts.json` contain sensitive information, do not leak.
4. Initializes multi-account rotation to improve availability.
5. Token refreshes automatically, no manual maintenance needed.

## License

MIT
