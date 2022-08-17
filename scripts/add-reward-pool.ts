import { ethers } from "hardhat";
const delay = require('delay')

async function main() {

  // Changing Variables
  const poolDuration = 3600;
  const deployedStakingToken = "0xF25751Cf814dC083C6d41E3B6b38c4bdCFDC4A6f";
  const deployedMultiPool = "0xA814C415417Dc7536a7f4CAEa96b9Dd6FA55D20D";
  const rewardAmount = 200;
  const rewardPoolID = 2;

  // Get Deployed Pool
  const multiPoolContract = await ethers.getContractFactory("MultiRewardPool");
  const multiPool = await multiPoolContract.attach(
    deployedMultiPool // The deployed contract address
  );
  console.log('Mutli-Reward-Pool Contract for Staking Token:', deployedStakingToken, 'deployed at:', multiPool.address);

   //Deploy Mocks
   console.log("Deploying mock tokens");

   const MockRewardContract = await ethers.getContractFactory("MockReward");
   const mockReward = await MockRewardContract.deploy(
       "Reward Token 3",
       "REWARD3",
       2000000,
       18,
   )

  // Adds Reward Pool
  await multiPool.addRewardPool(mockReward.address);
  console.log('Reward Pool added for Reward Token:', mockReward.address);

  // Starts Reward Pool
  await mockReward.approve(multiPool.address, rewardAmount);
  console.log('Approved', rewardAmount, 'to be used by the Multi-Reward-Pool');

  await delay(20000);

  await multiPool.startRewardPool(rewardPoolID, rewardAmount, poolDuration);
  console.log('Reward Pool for', mockReward.address, 'started. Total Reward Amount is', rewardAmount, 'and Duration of the pool is', poolDuration);

  console.log('Deployment Completed');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  // process.exitCode = 1;
});
