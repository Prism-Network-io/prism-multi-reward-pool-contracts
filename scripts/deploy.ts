import { ethers } from "hardhat";
const hre = require("hardhat");

async function main() {

  const treasuryAddress = 0x488874e8b9C7999a853b2b2f4c1Dd8b952B3c2dB;
  const devFee = 5;
  const tokenFee = 0;

  const stakingToken = 0x488874e8b9C7999a853b2b2f4c1Dd8b952B3c2dB;
  const rewardToken = 0x488874e8b9C7999a853b2b2f4c1Dd8b952B3c2dB;
  const rewardAmount = 100;
  const poolDuration = 3600;

  // Deploys the Contract
  const MultiRewardPool = await ethers.getContractFactory("MultiRewardPool");
  const multiRewardPool = await MultiRewardPool.deploy(
    stakingToken,     // Staking Token Address
    treasuryAddress,  // Treasury Address
    devFee,           // Dev Fee (%)
    tokenFee);        // Token Transfer Fee (%)

  await multiRewardPool.deployed();
  console.log("Mutli-Reward-Pool Contract for Staking Token:", stakingToken, "deployed at:", multiRewardPool.address);

  // Adds Reward Pool
  await multiRewardPool.addRewardPool(rewardToken);
  console.log("Reward Pool added for Reward Token:", rewardToken);

  // Starts Reward Pool
  await multiRewardPool.startRewardPool(0, rewardAmount, poolDuration);
  console.log("Reward Pool for", rewardToken, "started. Total Reward Amount is", rewardAmount, "and Duration of the pool is", poolDuration);

  // Verify Contract
  await hre.run("verify:verify", {
    address: multiRewardPool.address,
    constructorArguments: [
      stakingToken,
      "0xabcdef",
    ],
  });
  console.log("Contract verified successfully");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
