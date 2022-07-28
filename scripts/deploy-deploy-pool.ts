/*
TOKEN ADDRESSES

GOERLI UNI: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984"
KOVAN DAI: "0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa"

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
  const deployedRewardToken = "0x85b1fe94f74ea4d354ca85054d041ee167340ee3";

  const rewardAmount = 1000;


  // //Deploy Pool
  const MultiRewardPoolContract = await ethers.getContractFactory("MultiRewardPool");
  const multiRewardPool = await MultiRewardPoolContract.deploy(
    deployedStakingToken,      // Staking Token Address
    treasuryAddress,  // Treasury Address
    devFee,           // Dev Fee (%)
    tokenFee);        // Token Transfer Fee (%)

  await multiRewardPool.deployed();
  console.log('Mutli-Reward-Pool Contract for Staking Token:', deployedStakingToken, 'deployed at:', multiRewardPool.address);

  // Adds Reward Pool
  await multiRewardPool.addRewardPool(deployedRewardToken);
  console.log('Reward Pool added for Reward Token:', deployedRewardToken);

  const rewardContract = await ethers.getContractFactory("MockReward");
  const rewardToken = await rewardContract.attach(
    deployedRewardToken // The deployed contract address
  );

  // Starts Reward Pool
  await rewardToken.approve(multiRewardPool.address, rewardAmount);
  console.log('Approved', rewardAmount, 'to be used by the Multi-Reward-Pool');
  await multiRewardPool.startRewardPool(0, rewardAmount, poolDuration);
  console.log('Reward Pool for', rewardToken.address, 'started. Total Reward Amount is', rewardAmount, 'and Duration of the pool is', poolDuration);

  // // Verify Contract
  // await hre.run("verify:verify", {
  //   address: multiRewardPool.address,
  //   constructorArguments: [
  //     deployedStakingToken,
  //     treasuryAddress,
  //     devFee,
  //     tokenFee,
  //   ],
  // });
  // console.log('Contract verified successfully');

  console.log('Deployment Completed');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  // process.exitCode = 1;
});
