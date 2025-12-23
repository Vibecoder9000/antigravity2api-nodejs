import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { log } from '../utils/logger.js';
import { generateSessionId, generateProjectId } from '../utils/idGenerator.js';
import config, { getConfigJson } from '../config/config.js';
import { OAUTH_CONFIG } from '../constants/oauth.js';
import { buildAxiosRequestConfig } from '../utils/httpClient.js';
import AntigravityRequester from '../AntigravityRequester.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 检测是否在 pkg 打包环境中运行
const isPkg = typeof process.pkg !== 'undefined';

// 获取数据目录路径
// pkg 环境下使用可执行文件所在目录或当前工作目录
function getDataDir() {
  if (isPkg) {
    // pkg 环境：优先使用可执行文件旁边的 data 目录
    const exeDir = path.dirname(process.execPath);
    const exeDataDir = path.join(exeDir, 'data');
    // 检查是否可以在该目录创建文件
    try {
      if (!fs.existsSync(exeDataDir)) {
        fs.mkdirSync(exeDataDir, { recursive: true });
      }
      return exeDataDir;
    } catch (e) {
      // 如果无法创建，尝试当前工作目录
      const cwdDataDir = path.join(process.cwd(), 'data');
      try {
        if (!fs.existsSync(cwdDataDir)) {
          fs.mkdirSync(cwdDataDir, { recursive: true });
        }
        return cwdDataDir;
      } catch (e2) {
        // 最后使用用户主目录
        const homeDataDir = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.antigravity', 'data');
        if (!fs.existsSync(homeDataDir)) {
          fs.mkdirSync(homeDataDir, { recursive: true });
        }
        return homeDataDir;
      }
    }
  }
  // 开发环境
  return path.join(__dirname, '..', '..', 'data');
}

// 轮询策略枚举
const RotationStrategy = {
  ROUND_ROBIN: 'round_robin',           // 均衡负载：每次请求切换
  QUOTA_EXHAUSTED: 'quota_exhausted',   // 额度耗尽才切换
  REQUEST_COUNT: 'request_count'        // 自定义次数后切换
};

class TokenManager {
  constructor(filePath = path.join(getDataDir(), 'accounts.json')) {
    this.filePath = filePath;
    this.tokens = [];
    this.currentIndex = 0;
    
    // 轮询策略相关 - 使用原子操作避免锁
    this.rotationStrategy = RotationStrategy.ROUND_ROBIN;
    this.requestCountPerToken = 50;  // request_count 策略下每个token请求次数后切换
    this.tokenRequestCounts = new Map();  // 记录每个token的请求次数
    
    // Initialize requester if not using native axios
    this.requester = null;
    if (!config.useNativeAxios) {
      try {
        this.requester = new AntigravityRequester();
      } catch (error) {
        log.warn('AntigravityRequester in TokenManager initialization failed, fallback to axios:', error.message);
      }
    }

    this.ensureFileExists();
    this.initialize();
  }

  ensureFileExists() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, '[]', 'utf8');
      log.info('✓ Account config file created');
    }
  }

  async initialize() {
    try {
      log.info('Initializing token manager...');
      const data = fs.readFileSync(this.filePath, 'utf8');
      let tokenArray = JSON.parse(data);
      
      this.tokens = tokenArray.filter(token => token.enable !== false).map(token => ({
        ...token,
        sessionId: generateSessionId()
      }));
      
      this.currentIndex = 0;
      this.tokenRequestCounts.clear();
      
      // 加载轮询策略配置
      this.loadRotationConfig();
      
      if (this.tokens.length === 0) {
        log.warn('⚠ No available accounts. Please add one by:');
        log.warn('  Method 1: Run "npm run login"');
        log.warn('  Method 2: Use the web management interface');
      } else {
        log.info(`成功加载 ${this.tokens.length} 个可用token`);
        if (this.rotationStrategy === RotationStrategy.REQUEST_COUNT) {
          log.info(`轮询策略: ${this.rotationStrategy}, 每token请求 ${this.requestCountPerToken} 次后切换`);
        } else {
          log.info(`轮询策略: ${this.rotationStrategy}`);
        }
      }
    } catch (error) {
      log.error('Failed to initialize tokens:', error.message);
      this.tokens = [];
    }
  }

  // 加载轮询策略配置
  loadRotationConfig() {
    try {
      const jsonConfig = getConfigJson();
      if (jsonConfig.rotation) {
        this.rotationStrategy = jsonConfig.rotation.strategy || RotationStrategy.ROUND_ROBIN;
        this.requestCountPerToken = jsonConfig.rotation.requestCount || 10;
      }
    } catch (error) {
      log.warn('加载轮询配置失败，使用默认值:', error.message);
    }
  }

  // 更新轮询策略（热更新）
  updateRotationConfig(strategy, requestCount) {
    if (strategy && Object.values(RotationStrategy).includes(strategy)) {
      this.rotationStrategy = strategy;
    }
    if (requestCount && requestCount > 0) {
      this.requestCountPerToken = requestCount;
    }
    // 重置计数器
    this.tokenRequestCounts.clear();
    if (this.rotationStrategy === RotationStrategy.REQUEST_COUNT) {
      log.info(`轮询策略已更新: ${this.rotationStrategy}, 每token请求 ${this.requestCountPerToken} 次后切换`);
    } else {
      log.info(`轮询策略已更新: ${this.rotationStrategy}`);
    }
  }

  async fetchProjectId(token) {
    const url = 'https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:loadCodeAssist';
    const headers = {
      'Host': 'daily-cloudcode-pa.sandbox.googleapis.com',
      'User-Agent': config.api.userAgent || 'antigravity/1.11.9 windows/amd64',
      'Authorization': `Bearer ${token.access_token}`,
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip'
    };
    const data = { metadata: { ideType: 'ANTIGRAVITY' } };

    try {
      if (this.requester) {
        const response = await this.requester.antigravity_fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
          proxy: config.proxy,
          timeout: config.timeout // Align with axios timeout
        });
        
        if (!response.ok) {
           // Fallback or throw? consistent with axios behavior which throws on non-2xx usually
           // But here we just return undefined on failure in existing logic?
           // Original code: await axios(...) throws on 4xx/5xx by default.
           // So we should parse error.
           const errorText = await response.text();
           throw new Error(`Request failed with status ${response.status}: ${errorText}`);
        }
        const json = await response.json();
        return json?.cloudaicompanionProject;
      } else {
        const response = await axios(buildAxiosRequestConfig({
          method: 'POST',
          url,
          headers,
          data: JSON.stringify(data)
        }));
        return response.data?.cloudaicompanionProject;
      }
    } catch (error) {
       // Original code let errors propagate to getToken's try/catch
       throw error;
    }
  }

  isExpired(token) {
    if (!token.timestamp || !token.expires_in) return true;
    const expiresAt = token.timestamp + (token.expires_in * 1000);
    return Date.now() >= expiresAt - 300000;
  }

  async refreshToken(token) {
    log.info('Refreshing token...');
    const body = new URLSearchParams({
      client_id: OAUTH_CONFIG.CLIENT_ID,
      client_secret: OAUTH_CONFIG.CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: token.refresh_token
    });

    try {
      let responseData;
      
      if (this.requester) {
        const response = await this.requester.antigravity_fetch(OAUTH_CONFIG.TOKEN_URL, {
          method: 'POST',
          headers: {
            'Host': 'oauth2.googleapis.com',
            'User-Agent': 'Go-http-client/1.1',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept-Encoding': 'gzip'
          },
          body: body.toString(),
          proxy: config.proxy,
          timeout: config.timeout
        });

        if (!response.ok) {
           const errorText = await response.text();
           // Construct error object similar to axios error for consistency in catch block if needed, 
           // though existing catch block handles generic messages.
           const error = new Error(errorText);
           error.response = { status: response.status, data: errorText };
           throw error;
        }
        responseData = await response.json();
      } else {
        const response = await axios(buildAxiosRequestConfig({
          method: 'POST',
          url: OAUTH_CONFIG.TOKEN_URL,
          headers: {
            'Host': 'oauth2.googleapis.com',
            'User-Agent': 'Go-http-client/1.1',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept-Encoding': 'gzip'
          },
          data: body.toString()
        }));
        responseData = response.data;
      }

      token.access_token = responseData.access_token;
      token.expires_in = responseData.expires_in;
      token.timestamp = Date.now();
      this.saveToFile(token);
      return token;
    } catch (error) {
      throw { statusCode: error.response?.status, message: error.response?.data || error.message };
    }
  }

  saveToFile(tokenToUpdate = null) {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      const allTokens = JSON.parse(data);
      
      // If a specific token is provided, update it directly
      if (tokenToUpdate) {
        const index = allTokens.findIndex(t => t.refresh_token === tokenToUpdate.refresh_token);
        if (index !== -1) {
          const { sessionId, ...tokenToSave } = tokenToUpdate;
          allTokens[index] = tokenToSave;
        }
      } else {
        // Otherwise update all tokens from memory
        this.tokens.forEach(memToken => {
          const index = allTokens.findIndex(t => t.refresh_token === memToken.refresh_token);
          if (index !== -1) {
            const { sessionId, ...tokenToSave } = memToken;
            allTokens[index] = tokenToSave;
          }
        });
      }
      
      fs.writeFileSync(this.filePath, JSON.stringify(allTokens, null, 2), 'utf8');
    } catch (error) {
      log.error('Failed to save file:', error.message);
    }
  }

  disableToken(token) {
    log.warn(`Disabling token ...${token.access_token.slice(-8)}`)
    token.enable = false;
    this.saveToFile();
    this.tokens = this.tokens.filter(t => t.refresh_token !== token.refresh_token);
    this.currentIndex = this.currentIndex % Math.max(this.tokens.length, 1);
  }

  // 原子操作：获取并递增请求计数
  incrementRequestCount(tokenKey) {
    const current = this.tokenRequestCounts.get(tokenKey) || 0;
    const newCount = current + 1;
    this.tokenRequestCounts.set(tokenKey, newCount);
    return newCount;
  }

  // 原子操作：重置请求计数
  resetRequestCount(tokenKey) {
    this.tokenRequestCounts.set(tokenKey, 0);
  }

  // 判断是否应该切换到下一个token
  shouldRotate(token) {
    switch (this.rotationStrategy) {
      case RotationStrategy.ROUND_ROBIN:
        // 均衡负载：每次请求后都切换
        return true;
        
      case RotationStrategy.QUOTA_EXHAUSTED:
        // 额度耗尽才切换：检查token的hasQuota标记
        // 如果hasQuota为false，说明额度已耗尽，需要切换
        return token.hasQuota === false;
        
      case RotationStrategy.REQUEST_COUNT:
        // 自定义次数后切换
        const tokenKey = token.refresh_token;
        const count = this.incrementRequestCount(tokenKey);
        if (count >= this.requestCountPerToken) {
          this.resetRequestCount(tokenKey);
          return true;
        }
        return false;
        
      default:
        return true;
    }
  }

  // 标记token额度耗尽
  markQuotaExhausted(token) {
    token.hasQuota = false;
    this.saveToFile(token);
    log.warn(`...${token.access_token.slice(-8)}: 额度已耗尽，标记为无额度`);
    
    // 如果是额度耗尽策略，立即切换到下一个token
    if (this.rotationStrategy === RotationStrategy.QUOTA_EXHAUSTED) {
      this.currentIndex = (this.currentIndex + 1) % Math.max(this.tokens.length, 1);
    }
  }

  // 恢复token额度（用于额度重置后）
  restoreQuota(token) {
    token.hasQuota = true;
    this.saveToFile(token);
    log.info(`...${token.access_token.slice(-8)}: 额度已恢复`);
  }

  async getToken() {
    if (this.tokens.length === 0) return null;

    const totalTokens = this.tokens.length;
    const startIndex = this.currentIndex;

    for (let i = 0; i < totalTokens; i++) {
      const index = (startIndex + i) % totalTokens;
      const token = this.tokens[index];
      
      // 额度耗尽策略：跳过无额度的token
      if (this.rotationStrategy === RotationStrategy.QUOTA_EXHAUSTED && token.hasQuota === false) {
        continue;
      }
      
      try {
        if (this.isExpired(token)) {
          await this.refreshToken(token);
        }
        if (!token.projectId) {
          if (config.skipProjectIdFetch) {
            token.projectId = generateProjectId();
            this.saveToFile(token);
            log.info(`...${token.access_token.slice(-8)}: Using randomly generated projectId: ${token.projectId}`);
          } else {
            try {
              const projectId = await this.fetchProjectId(token);
              if (projectId === undefined) {
                log.warn(`...${token.access_token.slice(-8)}: Not eligible for projectId, skipping save`);
                this.disableToken(token);
                if (this.tokens.length === 0) return null;
                continue;
              }
              token.projectId = projectId;
              this.saveToFile(token);
            } catch (error) {
              log.error(`...${token.access_token.slice(-8)}: 获取projectId失败:`, error.message);
              continue;
            }
          }
        }
        
        // 更新当前索引
        this.currentIndex = index;
        
        // 根据策略决定是否切换
        if (this.shouldRotate(token)) {
          this.currentIndex = (this.currentIndex + 1) % totalTokens;
        }
        
        return token;
      } catch (error) {
        if (error.statusCode === 403 || error.statusCode === 400) {
          log.warn(`...${token.access_token.slice(-8)}: Token invalid or expired, automatically disabling`);
          this.disableToken(token);
          if (this.tokens.length === 0) return null;
        } else {
          log.error(`...${token.access_token.slice(-8)} 刷新失败:`, error.message);
        }
      }
    }

    // 如果所有token都无额度，重置所有token的额度状态并重试
    if (this.rotationStrategy === RotationStrategy.QUOTA_EXHAUSTED) {
      log.warn('所有token额度已耗尽，重置额度状态');
      this.tokens.forEach(t => {
        t.hasQuota = true;
      });
      this.saveToFile();
      // 返回第一个可用token
      return this.tokens[0] || null;
    }

    return null;
  }

  disableCurrentToken(token) {
    const found = this.tokens.find(t => t.access_token === token.access_token);
    if (found) {
      this.disableToken(found);
    }
  }

  // API Management methods
  async reload() {
    await this.initialize();
    log.info('Tokens hot reloaded');
  }

  addToken(tokenData) {
    try {
      this.ensureFileExists();
      const data = fs.readFileSync(this.filePath, 'utf8');
      const allTokens = JSON.parse(data);
      
      const newToken = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in || 3599,
        timestamp: tokenData.timestamp || Date.now(),
        enable: tokenData.enable !== undefined ? tokenData.enable : true
      };
      
      if (tokenData.projectId) {
        newToken.projectId = tokenData.projectId;
      }
      if (tokenData.email) {
        newToken.email = tokenData.email;
      }
      if (tokenData.hasQuota !== undefined) {
        newToken.hasQuota = tokenData.hasQuota;
      }
      
      allTokens.push(newToken);
      fs.writeFileSync(this.filePath, JSON.stringify(allTokens, null, 2), 'utf8');
      
      this.reload();
      return { success: true, message: 'Token added successfully' };
    } catch (error) {
      log.error('Failed to add Token:', error.message);
      return { success: false, message: error.message };
    }
  }

  updateToken(refreshToken, updates) {
    try {
      this.ensureFileExists();
      const data = fs.readFileSync(this.filePath, 'utf8');
      const allTokens = JSON.parse(data);
      
      const index = allTokens.findIndex(t => t.refresh_token === refreshToken);
      if (index === -1) {
        return { success: false, message: 'Token does not exist' };
      }
      
      allTokens[index] = { ...allTokens[index], ...updates };
      fs.writeFileSync(this.filePath, JSON.stringify(allTokens, null, 2), 'utf8');
      
      this.reload();
      return { success: true, message: 'Token updated successfully' };
    } catch (error) {
      log.error('Failed to update Token:', error.message);
      return { success: false, message: error.message };
    }
  }

  deleteToken(refreshToken) {
    try {
      this.ensureFileExists();
      const data = fs.readFileSync(this.filePath, 'utf8');
      const allTokens = JSON.parse(data);
      
      const filteredTokens = allTokens.filter(t => t.refresh_token !== refreshToken);
      if (filteredTokens.length === allTokens.length) {
        return { success: false, message: 'Token does not exist' };
      }
      
      fs.writeFileSync(this.filePath, JSON.stringify(filteredTokens, null, 2), 'utf8');
      
      this.reload();
      return { success: true, message: 'Token deleted successfully' };
    } catch (error) {
      log.error('Failed to delete Token:', error.message);
      return { success: false, message: error.message };
    }
  }

  getTokenList() {
    try {
      this.ensureFileExists();
      const data = fs.readFileSync(this.filePath, 'utf8');
      const allTokens = JSON.parse(data);
      
      return allTokens.map(token => ({
        refresh_token: token.refresh_token,
        access_token: token.access_token,
        access_token_suffix: token.access_token ? `...${token.access_token.slice(-8)}` : 'N/A',
        expires_in: token.expires_in,
        timestamp: token.timestamp,
        enable: token.enable !== false,
        projectId: token.projectId || null,
        email: token.email || null,
        hasQuota: token.hasQuota !== false
      }));
    } catch (error) {
      log.error('Failed to get Token list:', error.message);
      return [];
    }
  }

  // 获取当前轮询配置
  getRotationConfig() {
    return {
      strategy: this.rotationStrategy,
      requestCount: this.requestCountPerToken,
      currentIndex: this.currentIndex,
      tokenCounts: Object.fromEntries(this.tokenRequestCounts)
    };
  }
}

// 导出策略枚举
export { RotationStrategy };

const tokenManager = new TokenManager();
export default tokenManager;
