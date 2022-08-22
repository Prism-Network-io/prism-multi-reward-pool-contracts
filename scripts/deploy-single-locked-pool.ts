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
    const lockDuration = 10800; // 

    // Changing Variables
    const rewardAmount = ethers.utils.parseEther("500000"); //100,000

    //Deploy Mocks
    console.log("Deploying mock tokens");

    const MockRewardContract = await ethers.getContractFactory("MockReward");
    const mockReward = await MockRewardContract.deploy(
        "Reward Token",
        "REWARD",
        1000000,
        18,
    )
    await mockReward.deployed();
    console.log('Mock Reward Token deployed to:', mockReward.address);

    const MockStakingContract = await ethers.getContractFactory("MockStaking");
    const mockStaking = await MockStakingContract.deploy(
        "Staking Token",
        "STAKE",
        1000000,
        18,
    );    
    await mockStaking.deployed();
    console.log('Mock Staking Token deployed to:', mockStaking.address);
    
    //Deploy Pool
    const SingleRewardPoolContract = await ethers.getContractFactory("SingleRewardLockedPool");

    const singleRewardPool = await SingleRewardPoolContract.deploy(
        poolDuration,
        mockStaking.address, // Staking Token Address
        mockReward.address, // Staking Token Address
        treasuryAddress,  // Treasury Address
        devFee,           // Dev Fee (%)
        tokenFee,        // Token Transfer Fee (%)
        lockDuration);        // Token Transfer Fee (%)
      
    await singleRewardPool.deployed();
    console.log('Single-Reward-Pool Contract for Staking Token:', mockStaking.address, 'deployed at:', singleRewardPool.address);

    await mockReward.transfer(singleRewardPool.address, rewardAmount);

    await delay(10000);
    
    await singleRewardPool.notifyRewardAmount(rewardAmount);
        
    console.log('Deployment Completed');

    console.log("----");
    console.log("----");
    console.log("----");
    console.log("----");

    console.log('SingleReward Locked Pool deployed to:',  singleRewardPool.address);
    console.log('Staking token:',  mockStaking.address);
    console.log('Reward tokens:',  mockReward.address);
  
    console.log("----");
    console.log("----");
    console.log("----");
    console.log("----");
    
    // await delay(20000);
    
    await mockStaking.transfer("0xafda0b875cf59c462e726652896e8a77262397d9", "100000000000000000000");

    // const length = await singleRewardPool.poolLength()

    // console.log("pool length" + length);

    await delay(30000);

    // Verify Contract  
    await hre.run("verify:verify", {
      address: singleRewardPool.address,
      constructorArguments: [
        poolDuration,
        mockStaking.address, // Staking Token Address
        mockReward.address, // Staking Token Address
        treasuryAddress,  // Treasury Address
        devFee,           // Dev Fee (%)
        tokenFee,        // Token Transfer Fee (%)
        lockDuration
      ],
    });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    // process.exitCode = 1;
});
