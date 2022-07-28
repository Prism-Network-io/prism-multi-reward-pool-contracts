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
  const stakingToken = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
  const rewardToken = "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984";
  const rewardAmount = 1;

          // LOCALHOST DEPLOY VERSION
          const MockReward = await ethers.getContractFactory("MockReward");
          const mockReward = await MockReward.deploy(
            "Reward Token",
            "REWARD",
            1000000,
            18,
          );

          await mockReward.deployed();
          console.log('Mock Reward Token deployed to:', mockReward.address);

          // Deploys the Contract
          const MultiRewardPool = await ethers.getContractFactory("MultiRewardPool");
          const multiRewardPool = await MultiRewardPool.deploy(
            stakingToken,     // Staking Token Address
            treasuryAddress,  // Treasury Address
            devFee,           // Dev Fee (%)
            tokenFee);        // Token Transfer Fee (%)
        
          await multiRewardPool.deployed();
          console.log('Mutli-Reward-Pool Contract for Staking Token:',stakingToken, 'deployed at:',multiRewardPool.address);
        
          // Adds Reward Pool
          await multiRewardPool.addRewardPool(mockReward);
          console.log('Reward Pool added for Reward Token:',mockReward);
        
          // Starts Reward Pool
          await mockReward.approve(multiRewardPool, rewardAmount);
          console.log('Approved', rewardAmount, 'to be used by the Multi-Reward-Pool');
          await multiRewardPool.startRewardPool(0, rewardAmount, poolDuration);
          console.log('Reward Pool for', mockReward, 'started. Total Reward Amount is', rewardAmount, 'and Duration of the pool is', poolDuration);

  // // GOERLI DEPLOY VERSION
  // // Deploys the Contract
  // const MultiRewardPool = await ethers.getContractFactory("MultiRewardPool");
  // const multiRewardPool = await MultiRewardPool.deploy(
  //   stakingToken,     // Staking Token Address
  //   treasuryAddress,  // Treasury Address
  //   devFee,           // Dev Fee (%)
  //   tokenFee);        // Token Transfer Fee (%)

  // await multiRewardPool.deployed();
  // console.log('Mutli-Reward-Pool Contract for Staking Token:',stakingToken, 'deployed at:',multiRewardPool.address);

  // // Adds Reward Pool
  // await multiRewardPool.addRewardPool(rewardToken);
  // console.log('Reward Pool added for Reward Token:',rewardToken);

  // // Starts Reward Pool
  // await rewardToken.approve(multiRewardPool, rewardAmount);
  // console.log('Approved', rewardAmount, 'to be used by the Multi-Reward-Pool');
  // await multiRewardPool.startRewardPool(0, rewardAmount, poolDuration);
  // console.log('Reward Pool for', rewardToken, 'started. Total Reward Amount is', rewardAmount, 'and Duration of the pool is', poolDuration);

  // Verify Contract
  await hre.run("verify:verify", {
    address: multiRewardPool.address,
    constructorArguments: [
      stakingToken,
      treasuryAddress,
      devFee,
      tokenFee,
    ],
  });
  console.log('Contract verified successfully');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
