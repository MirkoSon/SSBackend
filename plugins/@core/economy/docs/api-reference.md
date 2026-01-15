# Economy Plugin API Endpoints

**Plugin:** Economy (Optional)
**Base Path:** `/api/economy`
**Status:** Plugin must be enabled
**Last Updated:** 2026-01-14

---

## Overview

The Economy plugin provides a multi-currency virtual economy system with secure transactions, balance management, and economic analytics. All endpoints require JWT authentication.

**Features:**
- Multi-currency support
- Atomic transactions (credit, debit, transfer)
- Transaction history and audit logging
- Balance management
- Economic analytics

---

## Currency Management

### GET /api/economy/currencies

List all available currencies.

**Authentication:** Required (Bearer token)

**Success Response (200):**
```json
{
  "currencies": [
    {
      "id": "coins",
      "name": "Coins",
      "symbol": "🪙",
      "decimal_places": 0,
      "description": "Basic in-game currency",
      "transferable": true,
      "max_balance": -1,
      "created_at": "2026-01-14T10:00:00.000Z"
    },
    {
      "id": "gems",
      "name": "Gems",
      "symbol": "💎",
      "decimal_places": 0,
      "description": "Premium currency",
      "transferable": true,
      "max_balance": -1,
      "created_at": "2026-01-14T10:00:00.000Z"
    }
  ]
}
```

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/economy/currencies \
  -H "Authorization: Bearer <token>"
```

---

### GET /api/economy/currencies/:currencyId

Get details for a specific currency.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| currencyId | string | Currency identifier (e.g., "coins") |

**Success Response (200):**
```json
{
  "currency": {
    "id": "coins",
    "name": "Coins",
    "symbol": "🪙",
    "decimal_places": 0,
    "description": "Basic in-game currency",
    "transferable": true,
    "max_balance": -1
  }
}
```

---

### POST /api/economy/currencies

Create a new currency (Admin only).

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Currency identifier |
| name | string | Yes | Display name |
| symbol | string | No | Currency symbol/emoji |
| decimal_places | integer | No | Decimal precision (default: 0) |
| description | string | No | Currency description |
| transferable | boolean | No | Allow transfers (default: true) |
| max_balance | integer | No | Max balance (-1 = unlimited) |

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/economy/currencies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "id": "gold",
    "name": "Gold Bars",
    "symbol": "🥇",
    "decimal_places": 2,
    "description": "Rare premium currency",
    "transferable": false,
    "max_balance": 10000
  }'
```

---

## Balance Management

### GET /api/economy/balances/:userId

Get all currency balances for a user.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| userId | integer | User ID |

**Success Response (200):**
```json
{
  "user_id": 1,
  "balances": [
    {
      "currency_id": "coins",
      "currency_name": "Coins",
      "symbol": "🪙",
      "balance": 1500,
      "updated_at": "2026-01-14T12:00:00.000Z"
    },
    {
      "currency_id": "gems",
      "currency_name": "Gems",
      "symbol": "💎",
      "balance": 25,
      "updated_at": "2026-01-14T12:00:00.000Z"
    }
  ]
}
```

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/economy/balances/1 \
  -H "Authorization: Bearer <token>"
```

---

### POST /api/economy/balances/adjust

Adjust a user's balance (Admin only).

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| user_id | integer | Yes | User ID |
| currency_id | string | Yes | Currency identifier |
| amount | integer | Yes | Amount to add (positive) or remove (negative) |
| reason | string | Yes | Reason for adjustment |

**Success Response (200):**
```json
{
  "success": true,
  "user_id": 1,
  "currency_id": "coins",
  "old_balance": 1000,
  "new_balance": 1500,
  "amount_adjusted": 500,
  "reason": "Daily login bonus"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/economy/balances/adjust \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "user_id": 1,
    "currency_id": "coins",
    "amount": 500,
    "reason": "Daily login bonus"
  }'
```

---

### GET /api/economy/balances/leaderboard/:currencyId

Get richest players for a currency.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| currencyId | string | Currency identifier |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 100 | Number of results |

**Success Response (200):**
```json
{
  "currency_id": "coins",
  "currency_name": "Coins",
  "leaderboard": [
    {
      "rank": 1,
      "user_id": 42,
      "username": "richplayer",
      "balance": 1000000
    },
    {
      "rank": 2,
      "user_id": 7,
      "username": "goldhoader",
      "balance": 850000
    }
  ]
}
```

---

## Transaction Processing

### POST /api/economy/transactions

Create a new transaction (credit, debit, or transfer).

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | Yes | Transaction type: "credit", "debit", "transfer" |
| user_id | integer | Yes | Source user ID |
| currency_id | string | Yes | Currency identifier |
| amount | integer | Yes | Transaction amount (positive) |
| source | string | Yes | Transaction source (e.g., "purchase", "reward") |
| description | string | No | Human-readable description |
| target_user_id | integer | Conditional | Required for "transfer" type |
| metadata | object | No | Additional transaction data |

**Success Response (200):**
```json
{
  "success": true,
  "transaction_id": "txn_abc123",
  "type": "credit",
  "user_id": 1,
  "currency_id": "coins",
  "amount": 100,
  "new_balance": 1600,
  "created_at": "2026-01-14T12:30:00.000Z"
}
```

**Error Responses:**

| Code | Error | Cause |
|------|-------|-------|
| 400 | "Insufficient balance" | User doesn't have enough currency |
| 400 | "Invalid transaction type" | Type not in [credit, debit, transfer] |
| 400 | "target_user_id required for transfers" | Missing target user |
| 404 | "Currency not found" | Invalid currency ID |
| 409 | "Max balance exceeded" | Would exceed max_balance limit |

**Example - Credit (Add Currency):**
```bash
curl -X POST http://localhost:3000/api/economy/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "type": "credit",
    "user_id": 1,
    "currency_id": "coins",
    "amount": 100,
    "source": "quest_reward",
    "description": "Completed daily quest"
  }'
```

**Example - Debit (Remove Currency):**
```bash
curl -X POST http://localhost:3000/api/economy/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "type": "debit",
    "user_id": 1,
    "currency_id": "coins",
    "amount": 50,
    "source": "purchase",
    "description": "Bought health potion"
  }'
```

**Example - Transfer:**
```bash
curl -X POST http://localhost:3000/api/economy/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "type": "transfer",
    "user_id": 1,
    "target_user_id": 2,
    "currency_id": "coins",
    "amount": 25,
    "source": "player_trade",
    "description": "Trade payment"
  }'
```

---

### GET /api/economy/transactions/:userId

Get transaction history for a user.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| userId | integer | User ID |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| currency_id | string | all | Filter by currency |
| type | string | all | Filter by type (credit/debit/transfer) |
| limit | integer | 50 | Number of results |
| offset | integer | 0 | Pagination offset |

**Success Response (200):**
```json
{
  "user_id": 1,
  "transactions": [
    {
      "id": "txn_abc123",
      "currency_id": "coins",
      "amount": 100,
      "balance_before": 1500,
      "balance_after": 1600,
      "transaction_type": "credit",
      "source": "quest_reward",
      "description": "Completed daily quest",
      "created_at": "2026-01-14T12:30:00.000Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 150
  }
}
```

**Example Request:**
```bash
# Get all transactions
curl -X GET http://localhost:3000/api/economy/transactions/1 \
  -H "Authorization: Bearer <token>"

# Filter by currency and type
curl -X GET "http://localhost:3000/api/economy/transactions/1?currency_id=coins&type=credit&limit=20" \
  -H "Authorization: Bearer <token>"
```

---

### POST /api/economy/transactions/:transactionId/rollback

Rollback a transaction (Admin only).

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| transactionId | string | Transaction ID to rollback |

**Success Response (200):**
```json
{
  "success": true,
  "original_transaction_id": "txn_abc123",
  "rollback_transaction_id": "txn_xyz789",
  "amount_reversed": 100,
  "message": "Transaction rolled back successfully"
}
```

---

## Analytics

### GET /api/economy/analytics/overview

Get economy-wide statistics (Admin only).

**Success Response (200):**
```json
{
  "total_users": 1000,
  "total_transactions": 50000,
  "currency_stats": [
    {
      "currency_id": "coins",
      "total_supply": 5000000,
      "avg_balance": 5000,
      "median_balance": 3500,
      "users_with_balance": 950
    }
  ],
  "recent_activity": {
    "transactions_last_24h": 1200,
    "active_users_last_24h": 450
  }
}
```

---

### GET /api/economy/analytics/currency/:currencyId

Get analytics for a specific currency (Admin only).

**Success Response (200):**
```json
{
  "currency_id": "coins",
  "total_supply": 5000000,
  "avg_balance": 5000,
  "median_balance": 3500,
  "distribution": {
    "top_10_percent": 2000000,
    "middle_50_percent": 2500000,
    "bottom_40_percent": 500000
  },
  "transaction_volume": {
    "last_24h": 50000,
    "last_7d": 300000,
    "last_30d": 1200000
  }
}
```

---

## Common Integration Patterns

### Purchase Flow
```javascript
// Client-side purchase logic
async function purchaseItem(userId, itemId, itemPrice) {
  // 1. Verify user has sufficient balance
  const balances = await fetch(`/api/economy/balances/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(r => r.json());

  const coinsBalance = balances.balances.find(b => b.currency_id === 'coins');
  if (coinsBalance.balance < itemPrice) {
    throw new Error('Insufficient coins');
  }

  // 2. Debit currency
  const transaction = await fetch('/api/economy/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      type: 'debit',
      user_id: userId,
      currency_id: 'coins',
      amount: itemPrice,
      source: 'shop_purchase',
      description: `Purchased ${itemId}`,
      metadata: { item_id: itemId }
    })
  }).then(r => r.json());

  // 3. Grant item to inventory
  await fetch(`/api/inventory/${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      item_id: itemId,
      quantity: 1
    })
  });

  return transaction;
}
```

### Reward Flow
```javascript
// Server-side reward logic
async function grantQuestReward(userId, questId) {
  const quest = await getQuest(questId);

  // Credit currency as reward
  const transaction = await fetch('/api/economy/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serverToken}`
    },
    body: JSON.stringify({
      type: 'credit',
      user_id: userId,
      currency_id: 'coins',
      amount: quest.reward_amount,
      source: 'quest_completion',
      description: `Completed quest: ${quest.name}`,
      metadata: { quest_id: questId }
    })
  }).then(r => r.json());

  return transaction;
}
```

---

**Related Documentation:**
- [API Overview](overview.md)
- [Core Endpoints](core-endpoints.md)
- [Achievements Endpoints](achievements-endpoints.md)
- [Leaderboards Endpoints](leaderboards-endpoints.md)
