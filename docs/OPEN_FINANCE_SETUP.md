# Open Finance Setup Guide - Pluggy Integration

## Overview

This guide explains how to fully configure and use the Open Finance integration with Pluggy API.

## Prerequisites

1. **Pluggy Account**: Sign up at https://dashboard.pluggy.ai
2. **API Credentials**: Get your Client ID and Client Secret
3. **Webhook URL**: Set up a public URL for webhooks (your-domain.com/api/webhooks/pluggy)

## Environment Variables

Add these to your `.env` file or Vercel environment variables:

```bash
PLUGGY_CLIENT_ID=your_client_id_here
PLUGGY_CLIENT_SECRET=your_client_secret_here
PLUGGY_WEBHOOK_SECRET=your_webhook_secret_here
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

## Features Implemented

### 1. Token Management
- Automatic token caching (1 hour TTL)
- Token refresh on expiry
- Retry logic for authentication failures

### 2. Retry Logic
- Exponential backoff for failed requests
- Configurable max attempts (default: 3)
- Automatic retry on network errors and 5xx responses

### 3. Webhook Integration
- Real-time sync when banks update data
- Automatic handling of connection status changes
- Error notifications

### 4. Error Handling
- Bank-specific error messages
- User-friendly error display
- Automatic retry for transient errors
- Audit logging of all errors

### 5. Audit Logging
- All connections tracked
- Sync operations logged
- Error events recorded
- User actions auditable

### 6. Performance
- Redis caching for API responses
- Optimized database queries with indexes
- Paginated transaction loading
- Efficient bulk operations

## Setup Steps

### Step 1: Configure Pluggy

1. Go to https://dashboard.pluggy.ai
2. Create a new application
3. Copy your Client ID and Client Secret
4. Add them to your environment variables

### Step 2: Set Up Webhooks

1. In Pluggy dashboard, go to Settings > Webhooks
2. Add webhook URL: `https://your-domain.com/api/webhooks/pluggy`
3. Select events to receive:
   - `item/created`
   - `item/updated`
   - `item/error`
   - `item/deleted`
   - `item/login_succeeded`
   - `item/login_failed`
4. Copy the webhook secret to your environment

### Step 3: Run Migrations

```bash
npm run migrations
```

This will:
- Create audit_logs table
- Add performance indexes
- Set up webhook tracking

### Step 4: Test Connection

1. Go to `/open-finance` in your app
2. Click "Connect Bank"
3. Select a bank (use Pluggy's test mode)
4. Complete authentication
5. Verify accounts and transactions sync

## API Endpoints

### Connect Bank
```typescript
POST /api/open-finance/connect-token
// Returns: { accessToken: string }
```

### Save Connection
```typescript
POST /api/open-finance/save-connection
Body: {
  itemId: string,
  institutionId: string,
  institutionName: string
}
```

### Sync Connection
```typescript
POST /api/open-finance/sync
Body: { itemId: string }
```

### Disconnect
```typescript
DELETE /api/open-finance/disconnect
Body: { itemId: string }
```

## Webhook Events

The webhook handler processes these events automatically:

- **item/created**: Syncs initial data
- **item/updated**: Refreshes accounts and transactions
- **item/error**: Updates connection status
- **item/deleted**: Removes connection
- **item/login_succeeded**: Marks connection as active
- **item/login_failed**: Marks connection as error

## Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `INVALID_CREDENTIALS` | Wrong bank password | User must reconnect |
| `INSTITUTION_UNAVAILABLE` | Bank is down | Automatic retry in 5min |
| `CONNECTION_ERROR` | Network issue | Automatic retry |
| `OUTDATED_CREDENTIALS` | Password changed | User must reconnect |
| `MFA_REQUIRED` | 2FA needed | User interaction required |

## Monitoring

### Check Connection Status
```sql
SELECT * FROM open_finance_connections 
WHERE user_id = 'xxx'
ORDER BY last_sync_at DESC;
```

### View Audit Logs
```sql
SELECT * FROM audit_logs 
WHERE action LIKE 'open_finance%'
ORDER BY created_at DESC
LIMIT 50;
```

### Cache Health
```typescript
import { cacheHealthCheck } from '@/lib/cache';
const isHealthy = await cacheHealthCheck();
```

## Troubleshooting

### Connection Fails
1. Check API credentials in env vars
2. Verify webhook secret is correct
3. Check Pluggy dashboard for API status
4. Review audit logs for specific error

### Sync Not Working
1. Trigger manual sync: `/api/open-finance/sync`
2. Check webhook is receiving events
3. Verify bank credentials are valid
4. Check audit logs for sync errors

### Performance Issues
1. Verify Redis is connected
2. Check database indexes exist
3. Review slow query log
4. Enable query caching

## Security Best Practices

1. **Never log sensitive data**: Passwords, tokens in plain text
2. **Rotate webhook secret**: Every 90 days
3. **Monitor audit logs**: Daily review for suspicious activity
4. **Rate limit**: Implement on all Open Finance endpoints
5. **Encrypt at rest**: All sensitive connection data

## Next Steps

- [ ] Enable MFA for Open Finance connections
- [ ] Implement connection health monitoring
- [ ] Add retry queue for failed syncs
- [ ] Set up alerting for sync failures
- [ ] Create user notification system

## Support

- Pluggy Docs: https://docs.pluggy.ai
- Pluggy Support: support@pluggy.ai
- Status Page: https://status.pluggy.ai
