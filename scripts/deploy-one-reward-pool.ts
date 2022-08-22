import { ethers } from "hardhat";
const hre = require("hardhat");
const delay = require('delay')

async function main() {

    // Unchanging Variables
    const treasuryAddress = "0x69952B9cF895013c1e4077f241025Ec06c3C5Fc3";
    const devFee = 150;   // 1.5%
    const tokenFee = 0;
    // const poolDuration = 604800;
    // const poolDuration = 2419200; // 1 month
    const poolDuration = 4838400; // 2 month
    const startPool = true;

    // Changing Variables
    const rewardAmount = ethers.utils.parseEther("1000"); //100,000

    //Deploy Mocks
    console.log("Deploying mock tokens");

    const MockRewardContract = await ethers.getContractFactory("MockReward");
    const mockReward = await MockRewardContract.deploy(
        "Reward Token",
        "REWARD",
        1000000,
        18,
    )

    // await delay(20000);

    // await hre.run("verify:verify", {
    //   address: mockReward.address,
    //   constructorArguments: [
    //     "Reward Token",
    //     "REWARD",
    //     1000000,
    //     18,
    //   ],
    // });

    await mockReward.deployed();
    console.log('Mock Reward Token deployed to:', mockReward.address);

    const MockStakingContract = await ethers.getContractFactory("MockStaking");
    const mockStaking = await MockStakingContract.deploy(
        "Staking Token",
        "STAKE",
        1000000,
        18,
    );

    // await delay(20000);

    // await hre.run("verify:verify", {
    //   address: mockStaking.address,
    //   constructorArguments: [
    //     "Staking Token",
    //     "STAKE",
    //     1000000,
    //     18,
    //   ],
    // });

    
    await mockStaking.deployed();
    console.log('Mock Staking Token deployed to:', mockStaking.address);
    
    //Deploy Pool
    const MultiRewardPoolContract = await ethers.getContractFactory("MultiRewardPool");
    const multiRewardPool = await MultiRewardPoolContract.deploy(
      mockStaking.address, // Staking Token Address
      treasuryAddress,  // Treasury Address
      devFee,           // Dev Fee (%)
      tokenFee);        // Token Transfer Fee (%)
      
      await multiRewardPool.deployed();
      console.log('Mutli-Reward-Pool Contract for Staking Token:', mockStaking.address, 'deployed at:', multiRewardPool.address);
      // Adds Reward Pool
      await multiRewardPool.addRewardPool(mockReward.address);
      console.log('Reward Pool added for Reward Token:', mockReward.address);
      
      //Starts Reward Pool
      await mockReward.approve(multiRewardPool.address, rewardAmount);
      console.log('Approved', rewardAmount, 'to be used by the Multi-Reward-Pool');

    await delay(15000);
    
    if(startPool){
      await multiRewardPool.startRewardPool(0, rewardAmount, poolDuration);
      console.log('Reward Pool for', mockReward.address, 'started. Total Reward Amount is', rewardAmount, 'and Duration of the pool is', poolDuration);
    }
    
    console.log('Deployment Completed');

    console.log("----");
    console.log("----");
    console.log("----");
    console.log("----");

    console.log('Multipool deployed to:',  multiRewardPool.address);
    console.log('Staking token:',  mockStaking.address);
    console.log('Reward tokens:',  mockReward.address);
  
    console.log("----");
    console.log("----");
    console.log("----");
    console.log("----");
    
    await delay(30000);
    
    await mockStaking.transfer("0xafda0b875cf59c462e726652896e8a77262397d9", "100000000000000000000");

    const length = await multiRewardPool.poolLength()

    console.log("pool length" + length);

    await delay(30000);

    // Verify Contract  
    await hre.run("verify:verify", {
      address: multiRewardPool.address,
      constructorArguments: [
        mockStaking.address,
        treasuryAddress,
        devFee,
        tokenFee,
      ],
    });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    // process.exitCode = 1;
});
