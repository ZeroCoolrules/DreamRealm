const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @title Add Liquidity Script
 * @notice Adds initial liquidity to all pools in the Dream Economy
 * @dev Run this after deployment to bootstrap the AMM
 */

const ADDRESSES_FILE = (network) => path.join(__dirname, "..", `contract-addresses-${network}.json`);

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Adding liquidity with account:", deployer.address);

  // Load deployed addresses
  const addressesPath = ADDRESSES_FILE(hre.network.name);
  if (!fs.existsSync(addressesPath)) {
    console.error(`No deployment found for ${hre.network.name}. Run deploy.js first.`);
    process.exit(1);
  }

  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  console.log("Loaded addresses:", addresses.tokens);

  // Get contract instances
  const router = await hre.ethers.getContractAt("TokenEconomyRouter", addresses.infrastructure.TokenEconomyRouter);

  const tokens = {
    DREAM: await hre.ethers.getContractAt("DreamCoin", addresses.tokens.DREAM),
    CUPID: await hre.ethers.getContractAt("CupidCoin", addresses.tokens.CUPID),
    SPARK: await hre.ethers.getContractAt("SparkCoin", addresses.tokens.SPARK),
    FORGE: await hre.ethers.getContractAt("ForgeCoin", addresses.tokens.FORGE),
    GUARD: await hre.ethers.getContractAt("GuardCoin", addresses.tokens.GUARD),
  };

  // Liquidity amounts (adjust as needed)
  const liquidityConfig = [
    { pair: ["DREAM", "CUPID"], amount0: "1000", amount1: "10000" },
    { pair: ["DREAM", "SPARK"], amount0: "1000", amount1: "50000" },
    { pair: ["DREAM", "GUARD"], amount0: "1000", amount1: "500" },
    { pair: ["CUPID", "SPARK"], amount0: "5000", amount1: "25000" },
    { pair: ["SPARK", "FORGE"], amount0: "50000", amount1: "5000" },
  ];

  for (const config of liquidityConfig) {
    const [token0Name, token1Name] = config.pair;
    const token0 = tokens[token0Name];
    const token1 = tokens[token1Name];
    const amount0 = hre.ethers.parseUnits(config.amount0, 18);
    const amount1 = hre.ethers.parseUnits(config.amount1, 18);

    console.log(`\n💧 Adding liquidity: ${token0Name}/${token1Name}`);
    console.log(`   Amounts: ${config.amount0} ${token0Name} + ${config.amount1} ${token1Name}`);

    try {
      // Approve tokens
      await (await token0.approve(await router.getAddress(), amount0)).wait();
      await (await token1.approve(await router.getAddress(), amount1)).wait();

      // Add liquidity
      const tx = await router.addLiquidity(
        await token0.getAddress(),
        await token1.getAddress(),
        amount0,
        amount1,
        0, // amount0Min (no slippage protection for initial)
        0  // amount1Min
      );
      await tx.wait();

      console.log(`   ✅ Liquidity added for ${token0Name}/${token1Name}`);
    } catch (error) {
      console.log(`   ⚠️  Failed: ${error.message}`);
    }
  }

  console.log("\n✅ Liquidity provisioning complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Failed:", error);
    process.exit(1);
  });
