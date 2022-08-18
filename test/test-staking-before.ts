import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import { ethers, waffle } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { MockStaking, MockReward, MultiRewardPool } from "../typechain";

// TEST SCRIPT WITH POOL SETUP LOGIC IN 'BEFORE'

describe("Multi Reward Pool Tests", () => {

  // Typechain setup
  let mockStaking: MockStaking;
  let mockReward: MockReward;
  let multiRewardPool: MultiRewardPool;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  // Changing Variables
  const poolRewards = 1000;

  const treasuryAddress = "0x488874e8b9C7999a853b2b2f4c1Dd8b952B3c2dB";
  const devFee = 150;   // 1.5%
  const tokenFee = 0;
  const poolDuration = 4000;

  // Before each test reset test accounts states + redeploy test contracts 
  before(async () => {

    // Reset test users state
    [owner, addr1, addr2] = await ethers.getSigners();

    //Deploy Mocks
    console.log("Deploying mock tokens");

    // Deploy MockStaking
    mockStaking = (await (await ethers.getContractFactory("MockStaking")).deploy("Reward Token", "REWARD", 1000, 18)) as MockStaking;
    await mockStaking.deployed();
    console.log('Mock Staking Token deployed to:', mockStaking.address);

    // Deploy MockReward
    mockReward = (await (await ethers.getContractFactory("MockReward")).deploy("Reward Token", "REWARD", 1000, 18)) as MockReward;
    await mockReward.deployed();
    console.log('Mock Reward Token deployed to:', mockReward.address);

    // Deploy MultiRewardPool
    multiRewardPool = (await (await ethers.getContractFactory("MultiRewardPool")).deploy(mockStaking.address, owner.address, 0, 0)) as MultiRewardPool;
    await multiRewardPool.deployed();
    console.log('Mutli-Reward-Pool Contract for Staking Token:', mockStaking.address, 'deployed at:', multiRewardPool.address);
    
    // Adds Reward Pool
    await multiRewardPool.addRewardPool(mockReward.address);
    console.log('Reward Pool added for Reward Token:', mockReward.address);

    // Transfer REWARD to reward pool contract
    await mockReward.transfer(multiRewardPool.address, ethers.utils.parseEther("1000"));
    console.log('REWARD tokens added to Multi Reward Pool')

    // Transfer STAKE to users
    let addr1StakeAmount = ethers.utils.parseEther("75");
    let addr2StakeAmount = ethers.utils.parseEther("25");

    await mockStaking.transfer(addr1.address, addr1StakeAmount);
    console.log('Transfer', addr1StakeAmount, 'to addr1');
    await mockStaking.transfer(addr2.address, addr2StakeAmount);
    console.log('Transfer', addr2StakeAmount, 'to addr2');

    // Have users stake tokens
    await mockStaking.connect(addr1).approve(multiRewardPool.address, ethers.utils.parseEther("999999999"));
    await multiRewardPool.connect(addr1).stake(addr1StakeAmount);
    
    await mockStaking.connect(addr2).approve(multiRewardPool.address, ethers.utils.parseEther("999999999"));
    await multiRewardPool.connect(addr2).stake(addr2StakeAmount);

    const totalStakedTokens = await mockStaking.balanceOf(multiRewardPool.address);
    console.log('Total amount staked is', totalStakedTokens);

    const addr1percentOfTotalStaked = Number(addr1StakeAmount) / Number(totalStakedTokens);
    const addr2percentOfTotalStaked = Number(addr2StakeAmount) / Number(totalStakedTokens);
    console.log(addr1.address, '(addr1) staked', addr1StakeAmount, 'representing', addr1percentOfTotalStaked, '% of the supply');
    console.log(addr2.address, '(addr2) staked', addr2StakeAmount, 'representing', addr2percentOfTotalStaked, '% of the supply');
  });

  describe("Single Reward Pool: Test distribution over time", async () => {

    it("Check 1000 REWARD tokens added to pool", async function () {
      expect(mockReward.balanceOf(multiRewardPool.address)).to.equal(ethers.utils.parseEther("1000"));
    });

    it("Check addr1 has staked 75 tokens", async function () {
      expect(multiRewardPool.balanceOf(addr1.address)).to.equal(ethers.utils.parseEther("75"));
    });

    it("Check 100 STAKE tokens staked", async function () {
      expect(mockStaking.balanceOf(multiRewardPool.address)).to.equal(ethers.utils.parseEther("100"));
    });

    // Start Reward Pool
    it("Should start reward pool at poolId = 0", async function () {
      await multiRewardPool.startRewardPool(0, poolRewards, poolDuration);
      expect((await multiRewardPool.poolInfo(0)).rewardPoolID).to.equal(0);
    });

    it("Should set duration of pool as 4000 seconds", async function () {
      expect((await multiRewardPool.poolInfo(0)).duration).to.equal(poolDuration);
    });

    // it("Should check rewards distributed correctly at quarter of duration", async function () {
    //   await ethers.provider.send('evm_increaseTime', [1000]); // Increase time by 1000
    //   await ethers.provider.send('evm_mine', []) // Force mine to update block timestamp

    //   const totalExpectedEarningsQuarter = poolRewards / 4;
    //   const addr1ExpectedEarningsQuarter = (totalExpectedEarningsQuarter / 100) * addr1percentOfTotalStaked;
    //   const addr2ExpectedEarningsQuarter = (totalExpectedEarningsQuarter / 100) * addr2percentOfTotalStaked;
    //   const addr1EarningsQuarter = (await multiRewardPool.connect(addr1).earned(addr1.address, 0));
    //   const addr2EarningsQuarter = (await multiRewardPool.connect(addr2).earned(addr1.address, 0));
    //   expect(addr1ExpectedEarningsQuarter).to.equal(addr1EarningsQuarter);
    //   expect(addr2ExpectedEarningsQuarter).to.equal(addr2EarningsQuarter);
    //   console.log(addr1, '(addr1) expected to earn', addr1ExpectedEarningsQuarter, 'and earned:', addr1EarningsQuarter, 'at 1/4 duration');
    //   console.log(addr2, '(addr2) expected to earn', addr2ExpectedEarningsQuarter, 'and earned:', addr2EarningsQuarter, 'at 1/4 duration');
    // });

    //   it("Should check rewards distributed correctly at half of duration", async function () {
    //     await ethers.provider.send('evm_increaseTime', [1000]); // Increase time by 1000 (total 2000)
    //     await ethers.provider.send('evm_mine', []) // Force mine to update block timestamp

    //     const totalExpectedEarningsHalf = poolRewards / 2;
    //     const addr1ExpectedEarningsHalf = (totalExpectedEarningsHalf / 100) * addr1percentOfTotalStaked;
    //     const addr2ExpectedEarningsHalf = (totalExpectedEarningsHalf / 100) * addr2percentOfTotalStaked;
    //     const addr1EarningsHalf = (await multiRewardPool.connect(addr1).earned(addr1.address, 0));
    //     const addr2EarningsHalf = (await multiRewardPool.connect(addr2).earned(addr1.address, 0));
    //     expect(addr1ExpectedEarningsHalf).to.equal(addr1EarningsHalf);
    //     expect(addr2ExpectedEarningsHalf).to.equal(addr2EarningsHalf);
    //     console.log(addr1, '(addr1) expected to earn', addr1ExpectedEarningsHalf, 'and earned:', addr1EarningsHalf, 'at 1/2 duration');
    //     console.log(addr2, '(addr2) expected to earn', addr2ExpectedEarningsHalf, 'and earned:', addr2EarningsHalf, 'at 1/2 duration');
    //   });

    //   it("Should check rewards distributed correctly at completion of duration", async function () {
    //     await ethers.provider.send('evm_increaseTime', [2000]); // Increase time by 2000 (total 4000)
    //     await ethers.provider.send('evm_mine', []) // Force mine to update block timestamp

    //     const totalExpectedEarningsComplete = poolRewards;
    //     const addr1ExpectedEarningsComplete = (totalExpectedEarningsComplete / 100) * addr1percentOfTotalStaked;
    //     const addr2ExpectedEarningsComplete = (totalExpectedEarningsComplete / 100) * addr2percentOfTotalStaked;
    //     const addr1EarningsComplete = (await multiRewardPool.connect(addr1).earned(addr1.address, 0));
    //     const addr2EarningsComplete = (await multiRewardPool.connect(addr2).earned(addr1.address, 0));
    //     expect(addr1ExpectedEarningsComplete).to.equal(addr1EarningsComplete);
    //     expect(addr2ExpectedEarningsComplete).to.equal(addr2EarningsComplete);
    //     console.log(addr1, '(addr1) expected to earn', addr1ExpectedEarningsComplete, 'and earned:', addr1EarningsComplete, 'at full duration');
    //     console.log(addr2, '(addr2) expected to earn', addr2ExpectedEarningsComplete, 'and earned:', addr2EarningsComplete, 'at full duration');
    //   });

    // });

  });

});