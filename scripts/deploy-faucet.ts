import { ethers } from "hardhat";
const hre = require("hardhat");
const delay = require('delay')

async function main() {

    // Unchanging Variables
    const treasuryAddress = "0x69952B9cF895013c1e4077f241025Ec06c3C5Fc3";

    // Changing Variables
    const mockStakingAddress = "0x6dBB5C3602500D04064228bD8C0a8D9df8f88586";
    const mockStakingAddress2= "0x85B1fe94f74EA4d354cA85054d041EE167340ee3";
    const empireAddress= "0x5A0FdF1f13Eb51A291669cE1C515630a4F6B0281";

    //Deploy Mocks
    const Faucet = await ethers.getContractFactory("Faucet");
    const facuet = await Faucet.deploy(
        mockStakingAddress,
        mockStakingAddress2,
        empireAddress,
        treasuryAddress
        
    )
    await facuet.deployed();
    console.log('Faucet deployed to:', facuet.address);

    // Verify Contract  
    await hre.run("verify:verify", {
      address: facuet.address,
      constructorArguments: [
        mockStakingAddress,
        mockStakingAddress2,
        empireAddress,
        treasuryAddress
      ]
    });
    

    // // Verify Contract  
    // await hre.run("verify:verify", {
    //   address: mockReward.address,
    //   constructorArguments: [
    //     "Reward Token",
    //     "REWARD",
    //     1000000,
    //     18,
    //   ],
    // });

    // // Verify Contract  
    // await hre.run("verify:verify", {
    //   address: mockReward2.address,
    //   constructorArguments: [
    //     "Reward Token 2",
    //     "REWARD2",
    //     1000000,
    //     18,
    //   ],
    // });

    // // Verify Contract  
    // await hre.run("verify:verify", {
    //   address: mockStaking.address,
    //   constructorArguments: [
    //     "Staking Token",
    //     "STAKE",
    //     1000000,
    //     18,
    //   ],
    // });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    // process.exitCode = 1;
});
