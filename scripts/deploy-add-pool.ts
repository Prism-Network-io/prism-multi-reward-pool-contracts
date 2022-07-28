/*
TOKEN ADDRESSES

GOERLI
"0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"  // UNI

*/

import { ethers } from "hardhat";
const hre = require("hardhat");

async function main() {

  // Unchanging Variables
  const treasuryAddress = "0x488874e8b9C7999a853b2b2f4c1Dd8b952B3c2dB";
  const devFee = 150;   // 1.5%
  const tokenFee = 0;
  const poolDuration = 3600;

  // Changing Variables
  const deployedStakingToken = "0x06b8a2102C23DA15Eb7904e55d3cc692F58B4077";
  const deployedRewardToken = "0x881EED57411a8bD71A5e65Bc8990672941573794";
  const deployedMultiPool = "0x06b8a2102C23DA15Eb7904e55d3cc692F58B4077";
  const rewardAmount = 1;


  // //Deploy Pool
  const multiPoolContract = await ethers.getContractFactory("MultiRewardPool");
  const multiPool = await multiPoolContract.attach(
    deployedMultiPool // The deployed contract address
  );

  console.log('Mutli-Reward-Pool Contract for Staking Token:', deployedStakingToken, 'deployed at:', multiPool.address);

  // Adds Reward Pool
  await multiPool.addRewardPool(deployedRewardToken);
  console.log('Reward Pool added for Reward Token:', deployedRewardToken);

  const rewardContract = await ethers.getContractFactory("MockReward");
  const rewardToken = await rewardContract.attach(
    deployedRewardToken // The deployed contract address
  );

  // Starts Reward Pool
  await rewardToken.approve(multiPool.address, rewardAmount);
  console.log('Approved', rewardAmount, 'to be used by the Multi-Reward-Pool');
  await multiPool.startRewardPool(0, rewardAmount, poolDuration);
  console.log('Reward Pool for', rewardToken.address, 'started. Total Reward Amount is', rewardAmount, 'and Duration of the pool is', poolDuration);

  console.log('Contract verified successfully');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  // process.exitCode = 1;
});
