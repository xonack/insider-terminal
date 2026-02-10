# Plan: Add Limitless Exchange & Opinion.trade as Market Sources

## Context

The insider-terminal app currently supports **Polymarket** (working) and **Kalshi** (integration in progress). Jens wants to add two new prediction market platforms as additional sources: **Limitless Exchange** (Base L2 DeFi) and **Opinion.trade** (BNB Chain). Both are separate competing platforms, not Kalshi categories.

The existing architecture uses a clean **adapter pattern**: platform-specific API clients in `src/lib/{platform}/`, data normalization to a common Polymarket format in the scoring engine, and a `market_source` column throughout the DB. This makes adding new sources straightforward.

---

## Research Findings

### Opinion.trade - READY TO INTEGRATE
- **Full REST API** at `https://openapi.opinion.trade/openapi`
- **Docs**: https://docs.opinion.trade/developer-guide/opinion-open-api
- **Auth**: API key in header (`apikey: your_key`) - requires [Google Form registration](https://docs.google.com/forms/d/1h7gp8UffZeXzYQ-lv4jcou9PoRNOqMAQhyW4IwZDnII)
- **Chain**: BNB Chain (BSC), Chain ID 56, USDT collateral
- **Key endpoints**:
  - `GET /openapi/market` - Market listing (binary + categorical)
  - `GET /openapi/market/{marketId}` - Market detail
  - `GET /openapi/trade/user/{walletAddress}` - User trades WITH wallet attribution
  - `GET /openapi/positions/user/{walletAddress}` - User positions
  - `GET /openapi/token/latest-price?token_id={id}` - Price data
- **Rate limit**: 15 req/sec, 20 items/page max
- **Response format**: `{ code: 0, msg: "success", result: { ... } }`
- **Wallet discovery**: Must use BscScan or on-chain monitoring (no "list all traders" endpoint)
- **Smart contract**: ConditionalToken (ERC-1155) at `0xAD1a38cEc043e70E83a3eC30443dB285ED10D774`

### Limitless Exchange - NEEDS API DISCOVERY
- **Chain**: Base L2 (Coinbase)
- **No documented REST API found** - DeFi-native protocol
- **Integration approach**: Either find undocumented API (likely exists for their frontend) or query on-chain via Base RPC/subgraph
- **Volume**: ~$5M/week (smaller than Opinion)
- **Recommendation**: Integrate Opinion first (well-documented), then tackle Limitless as Phase 2 once we discover their API or build on-chain querying

---

## Implementation Plan

### Phase 1: Shared Infrastructure Updates

**Files to modify:**

#### 1. `src/lib/utils/constants.ts` - Add new source types
```typescript
export type MarketSource = 'polymarket' | 'kalshi' | 'opinion' | 'limitless';
export const VALID_SOURCES = ['polymarket', 'kalshi', 'opinion', 'limitless'] as const;

// Add API base URLs
export const OPINION_API_BASE = 'https://openapi.opinion.trade/openapi';
export const LIMITLESS_API_BASE = 'TBD'; // Discovered in Phase 2
```

#### 2. `src/components/shared/MarketBadge.tsx` - Add badge styles
- Opinion: Orange badge with "O" label (`bg-orange-500/20 text-orange-400 border-orange-500/30`)
- Limitless: Purple badge with "L" label (`bg-purple-500/20 text-purple-400 border-purple-500/30`)

#### 3. `src/components/layout/TerminalShell.tsx` - Add dropdown options
```html
<option value="opinion">OPNN</option>
<option value="limitless">LMTLS</option>
```

#### 4. `src/app/api/wallet/[address]/route.ts` - Update valid sources error message
#### 5. `src/app/api/scan/route.ts` - Add rejection messages for new sources (no public discovery)

### Phase 2: Opinion.trade Integration

**New files to create:**

#### 1. `src/lib/opinion/types.ts` - Type definitions
- `OpinionMarket` - Market metadata (marketId, title, status, volume, cutoffAt, etc.)
- `OpinionTrade` - Trade record (txHash, wallet, marketId, side, price, shares, timestamp, pnl)
- `OpinionPosition` - Position (marketId, sharesOwned, avgEntryPrice, unrealizedPnl, claimStatus)
- `OpinionMarketListResponse`, `OpinionTradeResponse`, `OpinionPositionResponse` - API wrappers
- Response envelope: `{ code: number, msg: string, result: T }`

#### 2. `src/lib/opinion/client.ts` - API client
- `opinionFetch<T>(path, params)` - Authenticated fetcher with API key header
- Retry logic matching Kalshi pattern (3 attempts, exponential backoff)
- Rate limit handling (429 with backoff)
- Custom `OpinionApiError` class
- Env var: `OPINION_API_KEY`

#### 3. `src/lib/opinion/data-api.ts` - High-level data fetchers
- `getMarkets(params?)` - `GET /openapi/market`
- `getMarket(marketId)` - `GET /openapi/market/{marketId}`
- `getUserTrades(walletAddress, marketId?)` - `GET /openapi/trade/user/{wallet}`
- `getUserPositions(walletAddress, marketId?)` - `GET /openapi/positions/user/{wallet}`
- `getTokenPrice(tokenId)` - `GET /openapi/token/latest-price`
- Handle pagination (20 items/page max) with auto-pagination for full results

**Files to modify:**

#### 4. `src/lib/scoring/engine.ts` - Add Opinion normalization + dispatch
- `normalizeOpinionTrade(trade: OpinionTrade): PolymarketTrade` - Map fields:
  - `walletAddress` → `proxyWallet`
  - `side` (BUY/SELL) → `side`
  - `marketId` → `conditionId`
  - `price` → `price` (check if needs conversion)
  - `createdAt` → `timestamp` (convert to unix)
  - `txHash` → `transactionHash`
  - `outcomeLabel` → `outcome`
- `normalizeOpinionPosition(pos: OpinionPosition): PolymarketPosition` - Map fields:
  - `sharesOwned` → `size`
  - `avgEntryPrice` → `avgPrice`
  - `unrealizedPnl` → `cashPnl`
  - `marketTitle` → `title`
- `buildOpinionCache(trades, source)` - Market metadata cache builder
- Add `else if (source === 'opinion')` branch in `scoreWallet()`

### Phase 3: Limitless Exchange Integration (After API Discovery)

**Approach options (to be determined):**
1. **Find undocumented REST API** - Inspect limitless.exchange network requests in browser devtools
2. **On-chain querying** - Use Base L2 RPC + ethers.js to read contract events/state
3. **Subgraph** - Check if Limitless has a The Graph subgraph for indexed data

**New files (structure mirrors Opinion):**
- `src/lib/limitless/types.ts`
- `src/lib/limitless/client.ts`
- `src/lib/limitless/data-api.ts`
- Add normalization functions + dispatch in scoring engine

### Phase 4: Environment & Deployment

- Add `OPINION_API_KEY` to `.env.local` and Vercel env vars
- Add `LIMITLESS_API_KEY` (if needed) to env vars
- Apply for Opinion API key via Google Form
- No DB schema changes needed (market_source column already supports any string)

---

## Implementation Order

| Step | What | Files | Depends On |
|------|------|-------|------------|
| 1 | Update MarketSource type + constants | `constants.ts` | Nothing |
| 2 | Update MarketBadge + TerminalShell UI | `MarketBadge.tsx`, `TerminalShell.tsx` | Step 1 |
| 3 | Update API route error messages | `wallet/route.ts`, `scan/route.ts` | Step 1 |
| 4 | Create Opinion types | `src/lib/opinion/types.ts` | Nothing |
| 5 | Create Opinion API client | `src/lib/opinion/client.ts` | Step 4 |
| 6 | Create Opinion data API | `src/lib/opinion/data-api.ts` | Step 5 |
| 7 | Add Opinion normalization + dispatch | `scoring/engine.ts` | Steps 4-6 |
| 8 | Discover Limitless API | Research task | Nothing |
| 9 | Create Limitless integration | `src/lib/limitless/*` | Step 8 |
| 10 | Add Limitless normalization + dispatch | `scoring/engine.ts` | Step 9 |

**Steps 1-3 can run in parallel. Steps 4-7 are sequential. Step 8 can run in parallel with 1-7.**

---

## Team Assignment

**Engineer Agent 1 (Shared + Opinion):** Steps 1-7
- Update shared infrastructure (types, UI, routes)
- Build complete Opinion integration

**Engineer Agent 2 (Limitless Research + Integration):** Steps 8-10
- Use browser devtools approach to discover Limitless API
- Build Limitless integration once API is understood

---

## Verification

1. **Type check**: `npx tsc --noEmit` passes with new types
2. **Opinion scoring**: `GET /api/wallet/{bsc_address}?source=opinion` returns valid score
3. **Leaderboard filter**: `GET /api/leaderboard?source=opinion` returns only Opinion wallets
4. **Markets filter**: `GET /api/markets?source=opinion` returns only Opinion markets
5. **UI badges**: Orange "O" badge for Opinion, Purple "L" for Limitless render correctly
6. **Source dropdown**: Both new options appear in TerminalShell selector
7. **Scan rejection**: `POST /api/scan?source=opinion` returns helpful error message
8. **Build passes**: `npm run build` succeeds with no errors

---

## Prerequisites / Blockers

- [ ] **Apply for Opinion API key** via [Google Form](https://docs.google.com/forms/d/1h7gp8UffZeXzYQ-lv4jcou9PoRNOqMAQhyW4IwZDnII) - BLOCKER for testing
- [ ] **Discover Limitless API** - BLOCKER for Phase 3
- [ ] Add `OPINION_API_KEY` to `.env.local` once received
