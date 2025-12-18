import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { log } from '../utils/logger.js';
import memoryManager, { MemoryPressure } from '../utils/memoryManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 获取数据目录（支持 pkg 打包环境）
function getDataDir() {
  // 检测是否在 pkg 打包环境中运行
  if (process.pkg) {
    // pkg 环境：使用可执行文件所在目录的 data 子目录
    const execDir = path.dirname(process.execPath);
    return path.join(execDir, 'data');
  }
  // 普通环境：使用项目根目录的 data 子目录
  return path.join(__dirname, '..', '..', 'data');
}

class QuotaManager {
  constructor(filePath = path.join(getDataDir(), 'quotas.json')) {
    this.filePath = filePath;
    this.cache = new Map();
    this.requestCounts = new Map(); // Track requests per model per reset period
    this.CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存
    this.CLEANUP_INTERVAL = 60 * 60 * 1000; // 1小时清理一次
    this.cleanupTimer = null;
    this.ensureFileExists();
    this.loadFromFile();
    this.startCleanupTimer();
    this.registerMemoryCleanup();
  }

  ensureFileExists() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify({ meta: { lastCleanup: Date.now(), ttl: this.CLEANUP_INTERVAL }, quotas: {}, requestCounts: {} }, null, 2), 'utf8');
    }
  }

  loadFromFile() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(data);
      Object.entries(parsed.quotas || {}).forEach(([key, value]) => {
        this.cache.set(key, value);
      });
      // Load request counts
      Object.entries(parsed.requestCounts || {}).forEach(([key, value]) => {
        this.requestCounts.set(key, value);
      });
    } catch (error) {
      log.error('加载额度文件失败:', error.message);
    }
  }

  saveToFile() {
    try {
      const quotas = {};
      this.cache.forEach((value, key) => {
        quotas[key] = value;
      });
      const requestCounts = {};
      this.requestCounts.forEach((value, key) => {
        requestCounts[key] = value;
      });
      const data = {
        meta: { lastCleanup: Date.now(), ttl: this.CLEANUP_INTERVAL },
        quotas,
        requestCounts
      };
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      log.error('保存额度文件失败:', error.message);
    }
  }

  // Track a request for a model
  recordRequest(refreshToken, model) {
    const key = `${refreshToken}:${model}`;
    const quotaData = this.cache.get(refreshToken);
    const resetTime = quotaData?.models?.[model]?.t;
    
    const existing = this.requestCounts.get(key) || { count: 0, resetTime: null };
    
    // Reset count if reset time has passed or changed
    if (resetTime && existing.resetTime !== resetTime) {
      const resetDate = new Date(resetTime);
      if (new Date() >= resetDate) {
        existing.count = 0;
      }
      existing.resetTime = resetTime;
    }
    
    existing.count++;
    this.requestCounts.set(key, existing);
    this.saveToFile();
  }

  // Get request count for a model
  getRequestCount(refreshToken, model) {
    const key = `${refreshToken}:${model}`;
    const data = this.requestCounts.get(key);
    if (!data) return 0;
    
    // Check if reset time has passed
    if (data.resetTime) {
      const resetDate = new Date(data.resetTime);
      if (new Date() >= resetDate) {
        return 0; // Reset has occurred
      }
    }
    
    return data.count;
  }

  updateQuota(refreshToken, quotas) {
    this.cache.set(refreshToken, {
      lastUpdated: Date.now(),
      models: quotas
    });
    this.saveToFile();
  }

  getQuota(refreshToken) {
    const data = this.cache.get(refreshToken);
    if (!data) return null;
    
    // 检查缓存是否过期
    if (Date.now() - data.lastUpdated > this.CACHE_TTL) {
      return null;
    }
    
    return data;
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    this.cache.forEach((value, key) => {
      if (now - value.lastUpdated > this.CLEANUP_INTERVAL) {
        this.cache.delete(key);
        cleaned++;
      }
    });
    
    // Clean up old request counts
    this.requestCounts.forEach((value, key) => {
      if (value.resetTime) {
        const resetDate = new Date(value.resetTime);
        // Remove if reset was more than 24 hours ago
        if (now - resetDate.getTime() > 24 * 60 * 60 * 1000) {
          this.requestCounts.delete(key);
          cleaned++;
        }
      }
    });
    
    if (cleaned > 0) {
      log.info(`清理了 ${cleaned} 个过期的额度记录`);
      this.saveToFile();
    }
  }

  startCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cleanupTimer = setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // 注册内存清理回调
  registerMemoryCleanup() {
    memoryManager.registerCleanup((pressure) => {
      // 根据压力级别调整缓存 TTL
      if (pressure === MemoryPressure.CRITICAL) {
        // 紧急时清理所有缓存
        const size = this.cache.size;
        if (size > 0) {
          this.cache.clear();
          log.info(`紧急清理 ${size} 个额度缓存`);
        }
      } else if (pressure === MemoryPressure.HIGH) {
        // 高压力时清理过期缓存
        this.cleanup();
      }
    });
  }

  convertToBeijingTime(utcTimeStr) {
    if (!utcTimeStr) return 'N/A';
    try {
      const resetDate = new Date(utcTimeStr);
      const now = new Date();
      const diffMs = resetDate - now;
      
      if (diffMs <= 0) return 'Now';
      
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}`;
      }
      return `${minutes}m`;
    } catch (error) {
      return 'N/A';
    }
  }
}

const quotaManager = new QuotaManager();
export default quotaManager;
