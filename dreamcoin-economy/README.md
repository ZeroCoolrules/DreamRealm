# 🌟 Dream Economy — 5-Token Ecosystem

> A Bitcoin-inspired, interconnected token economy with scarcity mechanics, governance, yield farming, and cross-token infrastructure.

## Overview

The Dream Economy is a complete cryptocurrency ecosystem featuring 5 specialized tokens, each designed for a unique economic role. Built with security-first principles and inspired by Bitcoin's tokenomics, this system creates a sustainable, interconnected economy where tokens complement and reinforce each other.

## 🪙 The Five Tokens

| Token | Symbol | Purpose | Max Supply | Key Feature |
|-------|--------|---------|------------|-------------|
| **DreamCoin** | DREAM | Store of Value | 21,000,000 | Bitcoin-like halving, deflationary burns |
| **CupidCoin** | CUPID | Governance | 100,000,000 | Quadratic voting, staking rewards |
| **SparkCoin** | SPARK | Transactions | 10,000,000,000 | Dynamic fees, merchant cashback |
| **ForgeCoin** | FORGE | Work/Earn | 500,000,000 | Proof-of-Participation, achievements |
| **GuardCoin** | GUARD | Insurance/Reserve | 10,000,000 | Collateral-backed, circuit breaker |

## 🏗️ Infrastructure

| Contract | Purpose |
|----------|---------|
| **TokenEconomyRouter** | AMM DEX for cross-token swaps with dynamic fees |
| **StakingVault** | Multi-token yield farming with time-lock bonuses |

---

## Token Deep Dive

### DreamCoin (DREAM) — Digital Gold

The flagship store-of-value token, modeled after Bitcoin with enhanced features:

- **Max Supply**: 21,000,000 (scarce like Bitcoin)
- **Halving**: Block rewards halve every ~4 years automatically
- **Auto-Burn**: 1% of every transfer is burned (deflationary)
- **Anti-Whale**: Max 1% of supply per wallet
- **Locked Rewards**: Mining rewards locked for 30 days (anti-dump)
- **Block Reward**: Starts at 50 DREAM, halves over time

```
// Mine DREAM through ecosystem participation
forgeCoin.rewardActivity(user, ActivityType.Gaming, 10);

// Or earn through staking in the vault
stakingVault.stake(DREAM, amount, lockTier, autoCompound);
```

### CupidCoin (CUPID) — Governance Power

Full on-chain governance with innovative voting mechanics:

- **Quadratic Voting**: `votingPower = sqrt(balance)` — prevents whale dominance
- **Staking**: Lock CUPID for boosted rewards and governance power
- **Proposals**: Create proposals with 10k CUPID threshold
- **Delegation**: Partial delegation supported
- **Time-Weighted**: Longer locks = more voting power

**Voting Power Formula:**
```
votingPower = sqrt(balance + staked + received_delegations)
stakingBoost = lock_duration_based (up to 2x)
```

### SparkCoin (SPARK) — Lightning Fast Payments

Optimized for real-world transactions with merchant incentives:

- **Dynamic Fees**: 0.1% base, reduces with volume (up to 90% off)
- **Merchant Rewards**: 1% cashback to merchants, tiered bonuses
- **Buyer Cashback**: 0.05% back on every purchase
- **Batch Transfers**: Send to 100 recipients in one transaction
- **Subscriptions**: Recurring payment support
- **Volume Tiers**: $10k → $100k → $1M → $10M for fee reductions

### ForgeCoin (FORGE) — Proof of Participation

Earned exclusively through ecosystem contributions:

- **No ICO**: 100% earned through participation (95% distributed via rewards)
- **Activities**: Gaming, content creation, referrals, bug bounties, governance
- **Streak Bonus**: +1% per consecutive day (max 50%)
- **Achievements**: Unlock NFT-based earning boosts (5-25%)
- **Guilds**: Team up for collective bonuses
- **Seasonal Events**: 2x-5x multipliers during special periods
- **DREAM Conversion**: Convert FORGE → DREAM (50% burn, 7-day lock)

**Daily Earning Cap**: 1,000 FORGE per user

### GuardCoin (GUARD) — Economic Safety Net

Ultra-scarce stability token backed by collateral:

- **Collateral Ratio**: 150-300% dynamic backing
- **Bonding**: Mint GUARD by depositing collateral at 1-10% discount
- **Insurance Fund**: 20% of supply for crisis payouts
- **Circuit Breaker**: Auto-triggers on 50% price drops
- **Rebase Yields**: 8-15% APR distributed via balance increases
- **Redemption**: Burn GUARD to reclaim collateral (14-day lock)

---

## Quick Start

### Prerequisites

```bash
# Install Node.js 18+ from https://nodejs.org

# Install dependencies
npm install
```

### Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
PRIVATE_KEY=0xYOUR_PRIVATE_KEY
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
ETHERSCAN_API_KEY=YOUR_KEY
```

### Deploy to Testnet (Sepolia)

```bash
# 1. Compile contracts
npx hardhat compile

# 2. Deploy all contracts
npx hardhat run scripts/deploy.js --network sepolia

# 3. Add initial liquidity (optional)
npx hardhat run scripts/add-liquidity.js --network sepolia

# 4. Verify contracts on Etherscan
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS
```

### Deploy to Local Node (Testing)

```bash
# Terminal 1: Start local node
npx hardhat node

# Terminal 2: Deploy
npx hardhat run scripts/deploy.js --network localhost
```

---

## Contract Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DREAM ECONOMY                             │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  DREAM   │  │  CUPID   │  │  SPARK   │  │  FORGE   │   │
│  │  Token   │  │  Token   │  │  Token   │  │  Token   │   │
│  │          │  │          │  │          │  │          │   │
│  │• Halving │  │• Voting │  │• Dynamic │  │• Earn    │   │
│  │• Burn    │  │• Stake  │  │  Fees    │  │• Convert │   │
│  │• Anti-   │  │• Propose │  │• Cashback│  │• Guilds  │   │
│  │  Whale   │  │• Delegate│  │• Batch   │  │• Seasons │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
│       │             │             │             │          │
│       └─────────────┴──────┬──────┴─────────────┘          │
│                            │                                │
│              ┌─────────────┴──────────────┐                 │
│              │    TokenEconomyRouter        │                 │
│              │    (AMM DEX)                 │                 │
│              │                              │                 │
│              │• Swap Tokens                  │                 │
│              │• Provide Liquidity            │                 │
│              │• Price Oracle                 │                 │
│              │• Cross-Token Routing          │                 │
│              └─────────────┬────────────────┘                 │
│                            │                                 │
│              ┌─────────────┴──────────────┐                  │
│              │      StakingVault           │                  │
│              │    (Yield Farming)          │                  │
│              │                              │                  │
│              │• Multi-Token Staking         │                  │
│              │• Time-Lock Bonuses           │                  │
│              │• Auto-Compound               │                  │
│              │• Boost System                │                  │
│              └──────────────────────────────┘                  │
│                            │                                  │
│                   ┌────────┴────────┐                         │
│                   │     GUARD       │                         │
│                   │  (Insurance)    │                         │
│                   │                 │                         │
│                   │• Collateral     │                         │
│                   │• Circuit Breaker│                         │
│                   │• Rebase Yields  │                         │
│                   └─────────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Features

### Token-Level Security
- **ReentrancyGuard**: All external functions protected
- **Pausable**: Emergency pause capability
- **Access Control**: Role-based permissions
- **Safe Math**: Overflow/underflow protection (Solidity 0.8.x)
- **Anti-Whale**: Maximum wallet limits
- **Flash Loan Protection**: 1-block delay on large swaps

### Economic Security
- **Deflationary Burns**: DREAM (1%), CUPID (0.5%), FORGE (50% on conversion)
- **Time Locks**: Mining rewards, conversions, redemptions locked
- **Halving Cycles**: Predictable, decreasing inflation
- **Circuit Breaker**: Automatic protection during market crashes
- **Dynamic Collateral**: GUARD backing adjusts to market conditions

### Access Control
```
Owner (Deployer)
├── Token Minting (DREAM only via authorized miners)
├── Parameter Updates
├── Emergency Pause
└── Treasury Management
```

---

## Token Interactions

### Economic Flows

```
User Activity → FORGE (earned)
     ↓
FORGE ──convert──→ DREAM (with 50% burn)
     │
     └───guilds──→ Earning boost

DREAM ──stake──→ StakingVault → Yield in CUPID + DREAM
     │
     └───pair──→ TokenEconomyRouter → CUPID/SPARK/GUARD

CUPID ──stake──→ Governance voting power
     │
     └───vote──→ Protocol decisions

SPARK ──spend──→ Merchant purchases → Cashback + Rewards
     │
     └───batch──→ Multi-recipient payments

GUARD ──bond──→ Collateral backing → Insurance + Yield
     │
     └───redeem──→ Collateral (14-day lock)
```

---

## API Reference

### DreamCoin
```solidity
// Mine tokens (authorized contracts only)
function mine(address to, uint256 miningPower) returns (uint256 reward)

// Claim locked rewards
function claimLockedRewards()

// View halving info
function currentBlockReward() view returns (uint256)
function getHalvingsOccurred() view returns (uint256)
```

### CupidCoin
```solidity
// Stake with time-lock
function stake(uint256 amount, uint256 lockDuration)

// Governance
function propose(string description, address[] targets, uint256[] values, bytes[] calldatas) returns (uint256 proposalId)
function castVote(uint256 proposalId, bool support)

// Delegation
function delegate(address delegatee, uint256 amount)
```

### ForgeCoin
```solidity
// Reward participation (authorized only)
function rewardActivity(address user, ActivityType activity, uint256 units) returns (uint256)

// Convert to DREAM
function requestConversion(uint256 forgeAmount)
function claimConversion(uint256 requestIndex)

// Guilds
function createGuild(string name) returns (uint256)
function joinGuild(uint256 guildId)
```

### TokenEconomyRouter
```solidity
// Swap
function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to) returns (uint256)

// Liquidity
function addLiquidity(address token0, address token1, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min) returns (uint256 amount0, uint256 amount1, uint256 lpTokens)

// Queries
function getAmountsOut(uint256 amountIn, address[] path) view returns (uint256)
function getPrice(address token0, address token1) view returns (uint256)
```

### StakingVault
```solidity
// Stake
function stake(address stakeToken, uint256 amount, uint256 tierIndex, bool autoCompound)

// Unstake (with time-lock penalty if early)
function unstake(address stakeToken, uint256 stakeIndex) returns (uint256 received)

// View rewards
function pendingRewards(address stakeToken, address user, uint256 stakeIndex) view returns (address[] tokens, uint256[] amounts)
```

---

## Testing

```bash
# Run all tests
npx hardhat test

# Run specific test file
npx hardhat test test/DreamCoin.test.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test

# Run with coverage
npx hardhat coverage
```

---

## Deployment Checklist

- [ ] Set `PRIVATE_KEY` in `.env` (use a dedicated deployer wallet)
- [ ] Set `SEPOLIA_RPC_URL` for testnet deployment
- [ ] Fund deployer wallet with testnet ETH (Sepolia faucet)
- [ ] Run `npx hardhat compile` to verify compilation
- [ ] Run `npx hardhat run scripts/deploy.js --network sepolia`
- [ ] Save deployment addresses from `contract-addresses-sepolia.json`
- [ ] Verify contracts on Etherscan
- [ ] Run `add-liquidity.js` to bootstrap pools (optional)
- [ ] Transfer ownership to multi-sig or timelock (production)
- [ ] Configure QuickNode/Alchemy for production RPC

---

## Production Deployment

### Security Recommendations

1. **Use a Hardware Wallet** for the deployer address
2. **Multi-Sig Treasury**: Replace single-owner with Gnosis Safe
3. **Timelock Controller**: Add 24-48 hour delay on admin functions
4. **Oracle Integration**: Replace mock oracle with Chainlink for GUARD
5. **Audit**: Get contracts audited before mainnet (Consensys Diligence, OpenZeppelin, Certik)
6. **Bug Bounty**: Launch Immunefi bug bounty program

### Mainnet Deployment

```bash
# Set mainnet RPC and API keys in .env
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
ETHERSCAN_API_KEY=YOUR_KEY

# Deploy to Ethereum Mainnet
npx hardhat run scripts/deploy.js --network mainnet

# Deploy to Layer 2 (lower fees, faster)
npx hardhat run scripts/deploy.js --network base
npx hardhat run scripts/deploy.js --network arbitrum
```

---

## License

MIT License — See individual contract files for SPDX identifiers.

---

## Support

For questions or issues:
1. Check Hardhat's [documentation](https://hardhat.org/docs)
2. Review OpenZeppelin's [contracts](https://docs.openzeppelin.com/contracts)
3. Verify your `.env` configuration
4. Ensure you're running from the project root directory

---

**Built with ❤️ for the Dream Economy**

*Last updated: May 2026 | Solidity 0.8.24 | Hardhat 2.22*
