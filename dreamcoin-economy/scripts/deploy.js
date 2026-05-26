const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @title Dream Economy Deployment Script
 * @notice Deploys the complete 5-token ecosystem with all infrastructure
 * @dev Deploy order matters: Tokens → Router → Vault → Configuration
 */

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║         DREAM ECONOMY ECOSYSTEM DEPLOYMENT               ║");
  console.log("║         Version 2.0 | Bitcoin-Inspired                   ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("\nDeploying with account:", deployer.address);
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", (await hre.ethers.provider.getNetwork()).chainId);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH\n");

  // ============================================
  // CONFIGURATION
  // ============================================
  const config = {
    dreamSupply: process.env.DREAM_SUPPLY || "21000000",
    cupidSupply: process.env.CUPID_SUPPLY || "100000000",
    sparkSupply: process.env.SPARK_SUPPLY || "10000000000",
    forgeSupply: process.env.FORGE_SUPPLY || "500000000",
    guardSupply: process.env.GUARD_SUPPLY || "10000000",
    tokenNamePrefix: process.env.TOKEN_NAME_PREFIX || "",
  };

  // ============================================
  // DEPLOYMENT RECORD
  // ============================================
  const deployment = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {},
    config: {},
  };

  // ============================================
  // PHASE 1: DEPLOY CORE TOKENS
  // ============================================
  console.log("\n📦 PHASE 1: Deploying Core Tokens");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Deploy DreamCoin (DREAM) - The Bitcoin of the ecosystem
  console.log("\n🪙 Deploying DreamCoin (DREAM)...");
  console.log("   Features: Halving, Burn, Anti-Whale, Locked Rewards");
  
  const DreamCoin = await hre.ethers.getContractFactory("DreamCoin");
  const dreamCoin = await DreamCoin.deploy(
    deployer.address, // devFund
    deployer.address  // treasury
  );
  await dreamCoin.waitForDeployment();
  const dreamAddress = await dreamCoin.getAddress();
  console.log("   ✅ DreamCoin deployed to:", dreamAddress);
  
  deployment.contracts.dreamCoin = {
    address: dreamAddress,
    name: "DreamCoin",
    symbol: "DREAM",
    maxSupply: config.dreamSupply,
    features: ["Halving", "Auto-Burn", "Anti-Whale", "Locked Mining Rewards"],
  };

  // Deploy CupidCoin (CUPID) - Governance
  console.log("\n💘 Deploying CupidCoin (CUPID)...");
  console.log("   Features: Quadratic Voting, Staking, Proposals, Delegation");
  
  const CupidCoin = await hre.ethers.getContractFactory("CupidCoin");
  const cupidCoin = await CupidCoin.deploy(
    deployer.address, // treasury
    deployer.address  // airdrop distributor
  );
  await cupidCoin.waitForDeployment();
  const cupidAddress = await cupidCoin.getAddress();
  console.log("   ✅ CupidCoin deployed to:", cupidAddress);
  
  deployment.contracts.cupidCoin = {
    address: cupidAddress,
    name: "CupidCoin",
    symbol: "CUPID",
    maxSupply: config.cupidSupply,
    features: ["Quadratic Voting", "Staking Rewards", "Governance Proposals", "Delegation"],
  };

  // Deploy SparkCoin (SPARK) - Fast transactions
  console.log("\n⚡ Deploying SparkCoin (SPARK)...");
  console.log("   Features: Dynamic Fees, Merchant Rewards, Subscriptions, Batch Transfers");
  
  const SparkCoin = await hre.ethers.getContractFactory("SparkCoin");
  const sparkCoin = await SparkCoin.deploy(
    deployer.address, // treasury
    deployer.address  // merchant rewards pool
  );
  await sparkCoin.waitForDeployment();
  const sparkAddress = await sparkCoin.getAddress();
  console.log("   ✅ SparkCoin deployed to:", sparkAddress);
  
  deployment.contracts.sparkCoin = {
    address: sparkAddress,
    name: "SparkCoin",
    symbol: "SPARK",
    maxSupply: config.sparkSupply,
    features: ["Dynamic Fees", "Merchant Rewards", "Subscriptions", "Batch Transfers", "Cashback"],
  };

  // Deploy ForgeCoin (FORGE) - Work token
  console.log("\n🔨 Deploying ForgeCoin (FORGE)...");
  console.log("   Features: Proof-of-Participation, Achievements, Guilds, DREAM Conversion");
  
  const ForgeCoin = await hre.ethers.getContractFactory("ForgeCoin");
  const forgeCoin = await ForgeCoin.deploy(
    deployer.address, // treasury
    deployer.address  // initial earning contract
  );
  await forgeCoin.waitForDeployment();
  const forgeAddress = await forgeCoin.getAddress();
  console.log("   ✅ ForgeCoin deployed to:", forgeAddress);
  
  deployment.contracts.forgeCoin = {
    address: forgeAddress,
    name: "ForgeCoin",
    symbol: "FORGE",
    maxSupply: config.forgeSupply,
    features: ["Proof-of-Participation", "Achievements", "Guilds", "DREAM Conversion", "Seasonal Events"],
  };

  // Deploy GuardCoin (GUARD) - Stability reserve
  console.log("\n🛡️  Deploying GuardCoin (GUARD)...");
  console.log("   Features: Collateral Backing, Insurance, Circuit Breaker, Rebase Yields");
  
  const GuardCoin = await hre.ethers.getContractFactory("GuardCoin");
  const guardCoin = await GuardCoin.deploy(
    deployer.address, // treasury
    deployer.address  // oracle (replace with real oracle in production)
  );
  await guardCoin.waitForDeployment();
  const guardAddress = await guardCoin.getAddress();
  console.log("   ✅ GuardCoin deployed to:", guardAddress);
  
  deployment.contracts.guardCoin = {
    address: guardAddress,
    name: "GuardCoin",
    symbol: "GUARD",
    maxSupply: config.guardSupply,
    features: ["Collateral Backing", "Insurance Payouts", "Circuit Breaker", "Rebase Yields", "Bonding/Redemption"],
  };

  // ============================================
  // PHASE 2: DEPLOY INFRASTRUCTURE
  // ============================================
  console.log("\n\n📦 PHASE 2: Deploying Infrastructure");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Deploy TokenEconomyRouter
  console.log("\n🔄 Deploying TokenEconomyRouter...");
  console.log("   Features: AMM Swaps, Liquidity Pools, Price Oracle, Cross-Token Routing");
  
  const TokenEconomyRouter = await hre.ethers.getContractFactory("TokenEconomyRouter");
  const router = await TokenEconomyRouter.deploy(deployer.address);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("   ✅ TokenEconomyRouter deployed to:", routerAddress);
  
  deployment.contracts.tokenEconomyRouter = {
    address: routerAddress,
    name: "TokenEconomyRouter",
    features: ["AMM Swaps", "Liquidity Pools", "Price Oracle", "Flash Loan Protection", "Cross-Token Routing"],
  };

  // Deploy StakingVault
  console.log("\n🏦 Deploying StakingVault...");
  console.log("   Features: Multi-Token Staking, Time-Lock Bonuses, Auto-Compound, Boost System");
  
  const StakingVault = await hre.ethers.getContractFactory("StakingVault");
  const stakingVault = await StakingVault.deploy(deployer.address);
  await stakingVault.waitForDeployment();
  const vaultAddress = await stakingVault.getAddress();
  console.log("   ✅ StakingVault deployed to:", vaultAddress);
  
  deployment.contracts.stakingVault = {
    address: vaultAddress,
    name: "StakingVault",
    features: ["Multi-Token Staking", "Time-Lock Bonuses", "Auto-Compound", "Boost System", "Flexible Withdrawal"],
  };

  // ============================================
  // PHASE 3: CONFIGURE ECOSYSTEM
  // ============================================
  console.log("\n\n⚙️  PHASE 3: Configuring Ecosystem Interconnections");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Add supported tokens to Router
  console.log("\n🔗 Registering tokens with Router...");
  await (await router.addSupportedToken(dreamAddress)).wait();
  await (await router.addSupportedToken(cupidAddress)).wait();
  await (await router.addSupportedToken(sparkAddress)).wait();
  await (await router.addSupportedToken(forgeAddress)).wait();
  await (await router.addSupportedToken(guardAddress)).wait();
  console.log("   ✅ All tokens registered with Router");

  // Create trading pairs in Router
  console.log("\n💱 Creating liquidity pools...");
  const pairs = [
    [dreamAddress, cupidAddress],
    [dreamAddress, sparkAddress],
    [dreamAddress, forgeAddress],
    [dreamAddress, guardAddress],
    [cupidAddress, sparkAddress],
    [cupidAddress, forgeAddress],
    [sparkAddress, forgeAddress],
    [sparkAddress, guardAddress],
  ];
  
  for (const [token0, token1] of pairs) {
    try {
      await (await router.createPool(token0, token1)).wait();
      console.log(`   ✅ Pool created`);
    } catch (e) {
      console.log(`   ⚠️  Pool creation skipped (may already exist)`);
    }
  }

  // Setup StakingVault pools
  console.log("\n🏦 Configuring StakingVault pools...");
  await (await stakingVault.addPool(dreamAddress, 3000)).wait(); // High weight for DREAM
  await (await stakingVault.addPool(cupidAddress, 2500)).wait();
  await (await stakingVault.addPool(sparkAddress, 2000)).wait();
  await (await stakingVault.addPool(forgeAddress, 1500)).wait();
  await (await stakingVault.addPool(guardAddress, 1000)).wait();
  console.log("   ✅ All pools added to StakingVault");

  // Add reward tokens to StakingVault
  console.log("\n🎁 Adding reward tokens to StakingVault...");
  const rewardRate = hre.ethers.parseUnits("0.001", 18); // 0.001 tokens per second
  await (await stakingVault.addRewardToken(dreamAddress, rewardRate)).wait();
  await (await stakingVault.addRewardToken(cupidAddress, rewardRate * 2n)).wait();
  console.log("   ✅ Reward tokens configured");

  // Configure ForgeCoin to use DREAM for conversions
  console.log("\n🔨 Linking ForgeCoin to DreamCoin...");
  await (await forgeCoin.setDreamToken(dreamAddress)).wait();
  console.log("   ✅ ForgeCoin → DreamCoin conversion enabled");

  // Authorize StakingVault and Router as earners for ForgeCoin
  console.log("\n🔑 Authorizing ecosystem contracts...");
  await (await forgeCoin.setAuthorizedEarner(vaultAddress, true)).wait();
  await (await forgeCoin.setAuthorizedEarner(routerAddress, true)).wait();
  await (await forgeCoin.setAuthorizedEarner(deployer.address, true)).wait();
  console.log("   ✅ Contract permissions set");

  // Setup DreamCoin minters
  console.log("\n⛏️  Setting up DreamCoin miners...");
  await (await dreamCoin.addMinter(vaultAddress)).wait();
  await (await dreamCoin.addMinter(forgeAddress)).wait(); // Forge can mine DREAM
  console.log("   ✅ Mining permissions configured");

  // ============================================
  // PHASE 4: VERIFY & SAVE
  // ============================================
  console.log("\n\n📋 PHASE 4: Verification & Documentation");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Verify token balances
  console.log("\n💰 Initial Token Distribution:");
  const tokens = [
    { name: "DREAM", contract: dreamCoin },
    { name: "CUPID", contract: cupidCoin },
    { name: "SPARK", contract: sparkCoin },
    { name: "FORGE", contract: forgeCoin },
    { name: "GUARD", contract: guardCoin },
  ];

  for (const token of tokens) {
    const totalSupply = await token.contract.totalSupply();
    const symbol = await token.contract.symbol();
    console.log(`   ${symbol}: ${hre.ethers.formatUnits(totalSupply, 18)} total supply`);
  }

  // Save deployment record
  const deploymentPath = path.join(__dirname, "..", `deployment-${hre.network.name}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log(`\n📝 Deployment saved to: ${deploymentPath}`);

  // Generate contract addresses file for frontend integration
  const addresses = {
    network: hre.network.name,
    chainId: deployment.chainId,
    tokens: {
      DREAM: dreamAddress,
      CUPID: cupidAddress,
      SPARK: sparkAddress,
      FORGE: forgeAddress,
      GUARD: guardAddress,
    },
    infrastructure: {
      TokenEconomyRouter: routerAddress,
      StakingVault: vaultAddress,
    },
    deployedAt: deployment.timestamp,
  };

  const addressesPath = path.join(__dirname, "..", `contract-addresses-${hre.network.name}.json`);
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log(`📝 Contract addresses saved to: ${addressesPath}`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log("\n\n╔══════════════════════════════════════════════════════════╗");
  console.log("║          🎉 DREAM ECONOMY DEPLOYMENT COMPLETE 🎉         ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("\n📊 DEPLOYED CONTRACTS:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`   DREAM  → ${dreamAddress}`);
  console.log(`   CUPID  → ${cupidAddress}`);
  console.log(`   SPARK  → ${sparkAddress}`);
  console.log(`   FORGE  → ${forgeAddress}`);
  console.log(`   GUARD  → ${guardAddress}`);
  console.log(`   Router → ${routerAddress}`);
  console.log(`   Vault  → ${vaultAddress}`);
  console.log("\n📚 TOKEN ROLES:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   DREAM  │ Store of Value   │ Bitcoin-inspired scarcity");
  console.log("   CUPID  │ Governance       │ Democracy & staking power");
  console.log("   SPARK  │ Transactions     │ Fast payments & cashback");
  console.log("   FORGE  │ Work/Earn        │ Participation rewards");
  console.log("   GUARD  │ Insurance        │ Stability & collateral");
  console.log("\n⚡ NEXT STEPS:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   1. Add liquidity to pools via TokenEconomyRouter");
  console.log("   2. Configure your QuickNode/Alchemy RPC in .env");
  console.log("   3. Verify contracts on Etherscan");
  console.log("   4. Distribute tokens to community");
  console.log("   5. Launch staking vault rewards");
  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ DEPLOYMENT FAILED:", error);
    process.exit(1);
  });
