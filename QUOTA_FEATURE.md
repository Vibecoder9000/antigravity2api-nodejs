# Model Quota Management Feature

## Feature Description

Added model quota viewing functionality, allowing users to view the remaining quota and reset time for each Token's model in the frontend management interface.

## Implementation Plan

### Data Storage
- **accounts.json**: Kept simple, only stores core authentication information.
- **data/quotas.json**: New file, specifically stores quota information (lightweight persistence).
- **Memory Cache**: 5-minute cache to avoid frequent API requests.
- **Auto Cleanup**: Hourly cleanup of data not updated for more than 1 hour.

### Core Files

1. **src/api/client.js**
   - Added `getModelsWithQuotas(token)` function.
   - Extract `quotaInfo` field from API response.
   - Return simplified quota data structure.

2. **src/auth/quota_manager.js** (New)
   - Quota cache management.
   - File persistence.
   - UTC time to Beijing Time conversion.
   - Auto cleanup of expired data.

3. **src/routes/admin.js**
   - Added `GET /admin/tokens/:refreshToken/quotas` interface.
   - Support on-demand retrieval of quota information for a specific Token.

4. **public/app.js**
   - Added `toggleQuota()` function: Expand/collapse quota panel.
   - Added `loadQuota()` function: Load quota data from API.
   - Added `renderQuota()` function: Render progress bars and quota information.

5. **public/style.css**
   - Added styles related to quota display.
   - Progress bar styles (Gradient: Green >50%, Yellow 20-50%, Red <20%).

## Usage

### Frontend Operations

1. Login to the management interface.
2. Click the **"📊 View Quota"** button in the Token card.
3. The system will automatically load all model quota information for this Token.
4. Displayed as progress bars:
   - Model name
   - Remaining quota percentage (with color indication)
   - Quota reset time (Beijing Time)

### Data Format

#### API Response Example
```json
{
  "success": true,
  "data": {
    "lastUpdated": 1765109350660,
    "models": {
      "gemini-2.0-flash-exp": {
        "remaining": 0.972,
        "resetTime": "01-07 15:27",
        "resetTimeRaw": "2025-01-07T07:27:44Z"
      },
      "gemini-1.5-pro": {
        "remaining": 0.85,
        "resetTime": "01-07 16:15",
        "resetTimeRaw": "2025-01-07T08:15:30Z"
      }
    }
  }
}
```

#### quotas.json Storage Format
```json
{
  "meta": {
    "lastCleanup": 1765109350660,
    "ttl": 3600000
  },
  "quotas": {
    "1//0eDtvmkC_KgZv": {
      "lastUpdated": 1765109350660,
      "models": {
        "gemini-2.0-flash-exp": {
          "r": 0.972,
          "t": "2025-01-07T07:27:44Z"
        }
      }
    }
  }
}
```

## Features

✅ **On-Demand Loading**: Only fetch quota information when the user clicks.  
✅ **Smart Cache**: Use cache for repeated views within 5 minutes to reduce API requests.  
✅ **Auto Cleanup**: Regularly clean up expired data to keep files lightweight.  
✅ **Visual Display**: Progress bars intuitively show remaining quotas.  
✅ **Color Indication**: Green (>50%), Yellow (20-50%), Red (<20%).  
✅ **Time Conversion**: Automatically convert UTC time to Beijing Time.  
✅ **Lightweight Storage**: Use field abbreviations, only store changed models.  

## Precautions

1. First time viewing quota requires calling Google API, which may take a few seconds.
2. Quota information is cached for 5 minutes. For latest data, please wait for cache expiration and view again.
3. The `quotas.json` file is created automatically, no manual configuration needed.
4. If the Token is expired or invalid, an error message will be displayed.

## Testing

After starting the service:
```bash
npm start
```

Visit the management interface and click the "View Quota" button for any Token to test the functionality.
