import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { MockStaking as MockStakingType,
         MockReward as MockRewardType,
         MultiRewardPool as MultiRewardPoolType }
          from "../typechain";

// Typechain setup
let MockStaking;
let mockStaking: MockStakingType;
let MockReward;
let mockReward: MockRewardType;
let MultiRewardPool;
let multiRewardPool: MultiRewardPoolType;
let owner: SignerWithAddress;
let addr1: SignerWithAddress;
let addr2: SignerWithAddress;

describe("Multi Reward Pool Tests", async function () {

  // Before each test reset test accounts states + redeploy test contracts 
  beforeEach(async function () {

    // Reset test users state
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy MockStaking
    MockStaking = await ethers.getContractFactory("MockStaking");
    mockStaking = await MockStaking.deploy();
    await mockStaking.deployed();

    // Deploy MockReward
    MockReward = await ethers.getContractFactory("MockReward");
    mockReward = await MockReward.deploy();
    await mockReward.deployed();

    // Deploy MultiRewardPool
    MultiRewardPool = await ethers.getContractFactory("MultiRewardPool");
    multiRewardPool = await MultiRewardPool.deploy();
    await multiRewardPool.deployed();
  });

  const stakingTokenDecimals = await mockStaking.decimals();
  const rewardTokenDecimals = await mockReward.decimals();

  let addr1StakeAmount = 75 * 10 ** stakingTokenDecimals;
  let addr2StakeAmount = 25 * 10 ** stakingTokenDecimals;

  let poolRewards = 100000;
  let poolDuration = 4000;

  describe("Single Reward Pool: Test extending of pool", async function () {
    
  });


  describe("Single Reward Pool: Test distribution over time", async function () {

    // Have users stake tokens
    it("Should have addr1 stake 75 tokens", async function () {
      await multiRewardPool.connect(addr1).stake(addr1StakeAmount);
    });

    it("Should have addr2 stake 25 tokens", async function () {
      await multiRewardPool.connect(addr2).stake(addr2StakeAmount);
    });

    const totalStakedTokens = await mockStaking.balanceOf(multiRewardPool.address);
    const addr1percentOfTotalStaked = addr1StakeAmount/Number(totalStakedTokens);
    const addr2percentOfTotalStaked = addr2StakeAmount/Number(totalStakedTokens);

    console.log(addr1, '(addr1) staked', addr1StakeAmount, 'representing', addr1percentOfTotalStaked,'% of the supply');
    console.log(addr2, '(addr2) staked', addr2StakeAmount, 'representing', addr2percentOfTotalStaked,'% of the supply');
    console.log('Total amount staked is', totalStakedTokens);

    // Add reward pool
    it("Should add reward pool 0", async function () {
      await multiRewardPool.addRewardPool(mockReward.address);
      expect((await multiRewardPool.poolInfo(0)).rewardPoolID).to.equal((multiRewardPool.poolInfo.length)-1);
    });

    // Start Reward Pool
    it("Should start reward pool 0", async function () {

      await multiRewardPool.startRewardPool(0, poolRewards, poolDuration);

      it("Should start reward pool at poolId = 0", async function () {
        expect((await multiRewardPool.poolInfo(0)).rewardPoolID).to.equal(0);        
      });

      it("Should add 100,000 reward tokens", async function () {
        expect(mockReward.balanceOf(multiRewardPool.address)).to.equal(poolRewards*10**rewardTokenDecimals);
      });
      
      it("Should set duration of pool as 4000 seconds", async function () {
        expect((await multiRewardPool.poolInfo(0)).duration).to.equal(poolDuration);
      });


      it("Should check rewards distributed correctly at quarter of duration", async function () {
        await ethers.provider.send('evm_increaseTime', [1000]); // Increase time by 1000
        await ethers.provider.send('evm_mine', []) // Force mine to update block timestamp
        
        const totalExpectedEarningsQuarter =  poolRewards / 4;
        const addr1ExpectedEarningsQuarter = (totalExpectedEarningsQuarter / 100) * addr1percentOfTotalStaked;
        const addr2ExpectedEarningsQuarter = (totalExpectedEarningsQuarter / 100) * addr2percentOfTotalStaked;
        const addr1EarningsQuarter = (await multiRewardPool.connect(addr1).earned(addr1.address, 0));
        const addr2EarningsQuarter = (await multiRewardPool.connect(addr2).earned(addr1.address, 0));
        expect(addr1ExpectedEarningsQuarter).to.equal(addr1EarningsQuarter);
        expect(addr2ExpectedEarningsQuarter).to.equal(addr2EarningsQuarter);
        console.log(addr1, '(addr1) expected to earn', addr1ExpectedEarningsQuarter, 'and earned:', addr1EarningsQuarter, 'at 1/4 duration');
        console.log(addr2, '(addr2) expected to earn', addr2ExpectedEarningsQuarter, 'and earned:', addr2EarningsQuarter, 'at 1/4 duration');
      });

      it("Should check rewards distributed correctly at half of duration", async function () {
        await ethers.provider.send('evm_increaseTime', [1000]); // Increase time by 1000 (total 2000)
        await ethers.provider.send('evm_mine', []) // Force mine to update block timestamp

        const totalExpectedEarningsHalf =  poolRewards / 2;
        const addr1ExpectedEarningsHalf = (totalExpectedEarningsHalf / 100) * addr1percentOfTotalStaked;
        const addr2ExpectedEarningsHalf = (totalExpectedEarningsHalf / 100) * addr2percentOfTotalStaked;
        const addr1EarningsHalf = (await multiRewardPool.connect(addr1).earned(addr1.address, 0));
        const addr2EarningsHalf = (await multiRewardPool.connect(addr2).earned(addr1.address, 0));
        expect(addr1ExpectedEarningsHalf).to.equal(addr1EarningsHalf);
        expect(addr2ExpectedEarningsHalf).to.equal(addr2EarningsHalf);
        console.log(addr1, '(addr1) expected to earn', addr1ExpectedEarningsHalf, 'and earned:', addr1EarningsHalf, 'at 1/2 duration');
        console.log(addr2, '(addr2) expected to earn', addr2ExpectedEarningsHalf, 'and earned:', addr2EarningsHalf, 'at 1/2 duration');    
      });

      it("Should check rewards distributed correctly at completion of duration", async function () {
        await ethers.provider.send('evm_increaseTime', [2000]); // Increase time by 2000 (total 4000)
        await ethers.provider.send('evm_mine', []) // Force mine to update block timestamp

        const totalExpectedEarningsComplete =  poolRewards;
        const addr1ExpectedEarningsComplete = (totalExpectedEarningsComplete / 100) * addr1percentOfTotalStaked;
        const addr2ExpectedEarningsComplete = (totalExpectedEarningsComplete / 100) * addr2percentOfTotalStaked;
        const addr1EarningsComplete = (await multiRewardPool.connect(addr1).earned(addr1.address, 0));
        const addr2EarningsComplete = (await multiRewardPool.connect(addr2).earned(addr1.address, 0));
        expect(addr1ExpectedEarningsComplete).to.equal(addr1EarningsComplete);
        expect(addr2ExpectedEarningsComplete).to.equal(addr2EarningsComplete);
        console.log(addr1, '(addr1) expected to earn', addr1ExpectedEarningsComplete, 'and earned:', addr1EarningsComplete, 'at full duration');
        console.log(addr2, '(addr2) expected to earn', addr2ExpectedEarningsComplete, 'and earned:', addr2EarningsComplete, 'at full duration');   
      });

    });

  }); 

});
