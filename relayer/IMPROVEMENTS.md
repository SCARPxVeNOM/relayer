# Relayer Improvements Guide

This document outlines the improvements made to enhance the relayer's reliability, observability, and performance.

## 🚀 Key Improvements

### 1. **Persistent Transaction Storage**
- **File**: `relayer/storage/transaction.db.js`
- **Technology**: SQLite (better-sqlite3)
- **Benefits**:
  - Survives relayer restarts
  - Prevents duplicate processing
  - Transaction history and metrics
  - Failed transaction retry tracking

**Usage**:
```bash
# Database stored in: data/transactions.db (configurable via DB_PATH env var)
```

### 2. **Rate Limiting**
- **File**: `relayer/utils/rate-limiter.js`
- **Algorithm**: Token bucket
- **Benefits**:
  - Prevents API rate limit violations
  - Configurable per-second and per-minute limits
  - Automatic token refill

**Configuration**:
```bash
ALEO_RATE_LIMIT_RPS=5      # Requests per second
ALEO_RATE_LIMIT_RPM=100    # Requests per minute
```

### 3. **Circuit Breaker Pattern**
- **File**: `relayer/utils/circuit-breaker.js`
- **Benefits**:
  - Prevents cascading failures
  - Automatic recovery testing
  - Three states: CLOSED, OPEN, HALF_OPEN

**Configuration**:
```javascript
{
  failureThreshold: 5,      // Failures before opening
  resetTimeout: 60000,      // 1 minute cooldown
  monitoringWindow: 60000   // 1 minute window
}
```

### 4. **Health Check API**
- **File**: `relayer/api/health.js`
- **Endpoints**:
  - `GET /health` - Basic health check
  - `GET /metrics` - Detailed metrics
  - `GET /status` - System status

**Usage**:
```bash
# Default port: 3001 (configurable via HEALTH_PORT)
curl http://localhost:3001/health
curl http://localhost:3001/metrics
curl http://localhost:3001/status
```

### 5. **Dynamic Gas Management**
- **File**: `relayer/utils/gas-manager.js`
- **Benefits**:
  - Automatic gas price updates
  - Configurable multiplier (default: 1.1 = 10% buffer)
  - EIP-1559 support
  - Caching to reduce RPC calls

**Configuration**:
```bash
GAS_PRICE_MULTIPLIER=1.1  # 10% buffer above base gas price
```

### 6. **Dead Letter Queue**
- **File**: `relayer/utils/dead-letter-queue.js`
- **Benefits**:
  - Handles permanently failed transactions
  - Automatic retry with exponential backoff
  - Configurable max retries

**Configuration**:
```bash
MAX_RETRIES=3           # Maximum retry attempts
RETRY_DELAY=60000      # Delay between retries (ms)
```

## 📊 Monitoring & Observability

### Metrics Available

1. **Queue Metrics**:
   - Queue sizes per chain
   - Pending batch counts

2. **Wallet Metrics**:
   - Wallet balances
   - Nonce status
   - Pending transaction counts

3. **Transaction Metrics**:
   - Total processed
   - Success/failure counts
   - By status breakdown

4. **System Metrics**:
   - Memory usage (heap, RSS)
   - Uptime
   - Process stats

### Accessing Metrics

```bash
# Get all metrics
curl http://localhost:3001/metrics | jq

# Get health status
curl http://localhost:3001/health | jq

# Get system status
curl http://localhost:3001/status | jq
```

## 🔧 Configuration

### New Environment Variables

```bash
# Database
DB_PATH=./data/transactions.db

# Rate Limiting
ALEO_RATE_LIMIT_RPS=5
ALEO_RATE_LIMIT_RPM=100

# Circuit Breaker (via code, not env)
# Configured in aleo.listener.js

# Gas Management
GAS_PRICE_MULTIPLIER=1.1

# Dead Letter Queue
MAX_RETRIES=3
RETRY_DELAY=60000

# Health API
HEALTH_PORT=3001
```

## 🛡️ Resilience Improvements

### 1. **Transaction Deduplication**
- In-memory Set for fast lookups
- SQLite database for persistence
- Survives restarts

### 2. **Error Recovery**
- Circuit breaker prevents API spam
- Rate limiting prevents bans
- Dead letter queue for retries
- Automatic retry with backoff

### 3. **Gas Optimization**
- Dynamic gas price updates
- EIP-1559 support
- Configurable multiplier
- Reduced failed transactions

## 📈 Performance Improvements

1. **Reduced API Calls**:
   - Rate limiting prevents over-calling
   - Gas price caching
   - Circuit breaker stops failed calls

2. **Better Batching**:
   - Persistent queue state
   - Better error handling
   - Non-blocking execution

3. **Parallel Execution**:
   - Multiple wallets per chain
   - Independent nonce management
   - Fault isolation

## 🔍 Troubleshooting

### Check Circuit Breaker Status

```javascript
// In code
const state = aleoListener.circuitBreaker.getState();
console.log(state);
```

### View Failed Transactions

```sql
-- In SQLite database
SELECT * FROM processed_transactions WHERE status = 'failed';
```

### Check Rate Limiter

The rate limiter automatically manages tokens. Check logs for rate limit messages.

### Monitor Health

```bash
# Continuous monitoring
watch -n 5 'curl -s http://localhost:3001/health | jq'
```

## 🚨 Production Recommendations

1. **Database Backup**:
   - Regularly backup `data/transactions.db`
   - Consider PostgreSQL for production

2. **Monitoring**:
   - Set up alerts on `/health` endpoint
   - Monitor `/metrics` for anomalies
   - Track circuit breaker state

3. **Scaling**:
   - Use multiple relayer instances with shared database
   - Implement distributed locking for batch processing
   - Consider Redis for shared state

4. **Security**:
   - Secure health API endpoint
   - Encrypt database at rest
   - Rotate private keys regularly

## 📝 Next Steps

1. **Add Prometheus Metrics**: Export metrics in Prometheus format
2. **Add Alerting**: Integrate with PagerDuty/AlertManager
3. **Add Distributed Locking**: For multi-instance deployments
4. **Add Webhook Support**: Notify external systems of status changes
5. **Add Transaction Replay**: Replay failed transactions manually
6. **Add Admin API**: Administrative endpoints for management

## 🎯 Summary

These improvements make the relayer:
- ✅ **More Reliable**: Circuit breaker, retries, persistence
- ✅ **More Observable**: Health API, metrics, logging
- ✅ **More Efficient**: Rate limiting, gas optimization
- ✅ **More Resilient**: Error recovery, dead letter queue
- ✅ **Production-Ready**: Monitoring, persistence, recovery

