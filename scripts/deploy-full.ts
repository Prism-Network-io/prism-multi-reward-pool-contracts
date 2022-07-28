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
    const rewardAmount = 1000;

    //Deploy Mocks
    console.log("deploying mocks");

    const MockRewardContract = await ethers.getContractFactory("MockReward");
    const mockReward = await MockRewardContract.deploy(
        "Reward Token",
        "REWARD",
        1000000,
        18,
    );

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
    const MultiRewardPoolContract = await ethers.getContractFactory("MultiRewardPool");
    const multiRewardPool = await MultiRewardPoolContract.deploy(
        mockStaking.address,      // Staking Token Address
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
    await multiRewardPool.startRewardPool(0, rewardAmount, poolDuration);
    console.log('Reward Pool for', mockReward.address, 'started. Total Reward Amount is', rewardAmount, 'and Duration of the pool is', poolDuration);

    // Verify Contract
    // await hre.run("verify:verify", {
    //     address: multiRewardPool.address,
    //     constructorArguments: [
    //         mockStaking.address,
    //         treasuryAddress,
    //         devFee,
    //         tokenFee,
    //     ],
    // });
    // console.log('Contract verified successfully');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    // process.exitCode = 1;
});
