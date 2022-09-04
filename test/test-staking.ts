import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import { ethers, waffle } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { MockStaking, MockReward, MultiRewardPool } from "../typechain";
import { BigNumber } from "ethers";

  // Typechain setup
  let mockStaking: MockStaking;
  let mockStakingFee: MockStaking;
  let mockReward: MockReward;
  let mockReward2: MockReward;
  let mockReward3: MockReward;
  let multiRewardPool: MultiRewardPool;
  let multiRewardPoolFee: MultiRewardPool;
  let multiRewardPoolWithdraw: MultiRewardPool;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;

  // Defined Variables for tests
  const treasuryAddress = "0x488874e8b9C7999a853b2b2f4c1Dd8b952B3c2dB";
  const devFee = 150;   // 1.5%
  const tokenFee = 0;
  const tokenFeeActive = 1000;  // 10%

  const poolRewards = ethers.utils.parseEther("1000");
  const poolDuration = 4000;  
  const addr1StakeAmount = ethers.utils.parseEther("75");
  const addr1StakeAmountFee = ethers.utils.parseEther("100");
  const addr2StakeAmount = ethers.utils.parseEther("25");
  const addr3StakeAmountWithdraw = ethers.utils.parseEther("100");

  // Initialize Variables
  let addr1percentOfTotalStaked = 0;
  let addr2percentOfTotalStaked = 0;
  let totalStakedTokens: BigNumber;

  before(async () => {

    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    //Deploy Mocks
    console.log("Deploying mock tokens");

    // Deploy MockStaking
    mockStaking = (await (await ethers.getContractFactory("MockStaking")).deploy("Staking Token", "STAKING", 1000, 18)) as MockStaking;
    await mockStaking.deployed();
    console.log('Mock Staking Token deployed to:', mockStaking.address);

    // Deploy MockStakingFee
    mockStakingFee = (await (await ethers.getContractFactory("MockStakingFee")).deploy("Staking Token Fee", "STAKING_FEE", 1000, 18)) as MockStaking;
    await mockStakingFee.deployed();
    console.log('Mock Staking Fee Token deployed to:', mockStakingFee.address);

    // Deploy MockReward
    mockReward = (await (await ethers.getContractFactory("MockReward")).deploy("Reward Token", "REWARD", 1000, 18)) as MockReward;
    await mockReward.deployed();
    console.log('Mock Reward Token deployed to:', mockReward.address);

    // Deploy MockReward2
    mockReward2 = (await (await ethers.getContractFactory("MockReward")).deploy("Reward Token 2", "REWARD2", 1000, 18)) as MockReward;
    await mockReward2.deployed();
    console.log('Mock Reward 2 Token deployed to:', mockReward2.address);

    // Deploy MockReward3
    mockReward3 = (await (await ethers.getContractFactory("MockReward")).deploy("Reward Token 3", "REWARD3", 1000, 18)) as MockReward;
    await mockReward3.deployed();
    console.log('Mock Reward 3 Token deployed to:', mockReward3.address);

    // Deploy MultiRewardPool
    multiRewardPool = (await (await ethers.getContractFactory("MultiRewardPool")).deploy(mockStaking.address, treasuryAddress, devFee, tokenFee)) as MultiRewardPool;
    await multiRewardPool.deployed();
    console.log('Mutli-Reward-Pool Contract for STAKE:', mockStaking.address, 'deployed at:', multiRewardPool.address);
    
    // Adds Reward Pools
    await multiRewardPool.addRewardPool(mockReward.address);
    console.log('Reward Pool added for Reward Token:', mockReward.address);
    
    await multiRewardPool.addRewardPool(mockReward2.address);
    console.log('Reward Pool 2 added for Reward Token 2:', mockReward2.address);

    await multiRewardPool.addRewardPool(mockReward3.address);
    console.log('Reward Pool 3 added for Reward Token 3:', mockReward3.address);

    // Deploy MultiRewardPoolFee
    multiRewardPoolFee = (await (await ethers.getContractFactory("MultiRewardPool")).deploy(mockStakingFee.address, treasuryAddress, devFee, tokenFeeActive)) as MultiRewardPool;
    await multiRewardPoolFee.deployed();
    console.log('Mutli-Reward-Pool-Fee Contract for STAKE_FEE:', mockStakingFee.address, 'deployed at:', multiRewardPoolFee.address);

    // Deploy MultiRewardPoolWithdraw
    multiRewardPoolWithdraw = (await (await ethers.getContractFactory("MultiRewardPool")).deploy(mockStaking.address, treasuryAddress, devFee, tokenFee)) as MultiRewardPool;
    await multiRewardPoolWithdraw.deployed();
    console.log('Mutli-Reward-Pool Contract for WITHDRAW_TEST:', mockStaking.address, 'deployed at:', multiRewardPoolWithdraw.address);

    // Transfer STAKE to users
    await mockStaking.transfer(addr1.address, addr1StakeAmount);
    console.log('Transfer', addr1StakeAmount, 'STAKE to addr1');
    await mockStaking.transfer(addr2.address, addr2StakeAmount);
    console.log('Transfer', addr2StakeAmount, 'STAKE to addr2');
    await mockStaking.transfer(addr3.address, addr3StakeAmountWithdraw);
    console.log('Transfer', addr3StakeAmountWithdraw, 'STAKE to addr3');

    // Have users stake in multi reward pool (STAKE)
    await mockStaking.connect(addr1).approve(multiRewardPool.address, ethers.utils.parseEther("999999999"));
    await multiRewardPool.connect(addr1).stake(addr1StakeAmount);
    
    await mockStaking.connect(addr2).approve(multiRewardPool.address, ethers.utils.parseEther("999999999"));
    await multiRewardPool.connect(addr2).stake(addr2StakeAmount);

    totalStakedTokens = await mockStaking.balanceOf(multiRewardPool.address);
    console.log('Total amount staked is', totalStakedTokens);

    addr1percentOfTotalStaked = (Number(addr1StakeAmount) / Number(totalStakedTokens)) * 100;
    addr2percentOfTotalStaked = (Number(addr2StakeAmount) / Number(totalStakedTokens)) * 100;
    console.log(addr1.address, '(addr1) staked', addr1StakeAmount, 'representing', addr1percentOfTotalStaked, '% of the supply');
    console.log(addr2.address, '(addr2) staked', addr2StakeAmount, 'representing', addr2percentOfTotalStaked, '% of the supply');

    // Have users stake in multi reward pool (STAKE_FEE)
    await mockStakingFee.approve(multiRewardPoolFee.address, ethers.utils.parseEther("999999999"));
    await multiRewardPoolFee.stake(addr1StakeAmountFee);

    // Have users stake and withdraw in multi reward pool (WITHDRAW_TEST)
    await mockStaking.connect(addr3).approve(multiRewardPoolWithdraw.address, ethers.utils.parseEther("999999999"));
    await multiRewardPoolWithdraw.connect(addr3).stake(addr3StakeAmountWithdraw);
    await multiRewardPoolWithdraw.connect(addr3).withdraw(addr3StakeAmountWithdraw);
  });

  describe("Single Reward Pool: Test distribution over time", async () => {

    it("Check addr1 has staked 75 tokens", async function () {
      let addr1staked = await multiRewardPool.balanceOf(addr1.address);
      expect(addr1staked).to.equal(addr1StakeAmount);
    });

    it("Check addr2 has staked 25 tokens", async function () {
      let addr2staked = await multiRewardPool.balanceOf(addr2.address);
      expect(addr2staked).to.equal(addr2StakeAmount);
    });

    it("Check 100 STAKE tokens staked", async function () {
      let totalStaked = await mockStaking.balanceOf(multiRewardPool.address);
      expect(totalStaked).to.equal(totalStakedTokens);
    });

    // Start Reward Pool
    it("Should start reward pool at poolId = 0", async function () {
      await mockReward.approve(multiRewardPool.address, ethers.utils.parseEther("999999999"));
      await multiRewardPool.startRewardPool(0, poolRewards, poolDuration);
      expect((await multiRewardPool.poolInfo(0)).rewardPoolID).to.equal(0);
    });

    it("Check 1000 REWARD tokens added to pool", async function () {
      let rewardsAdded = await mockReward.balanceOf(multiRewardPool.address);
      expect(rewardsAdded).to.equal(poolRewards);
    });

    it("Should set duration of pool as 4000 seconds", async function () {
      expect((await multiRewardPool.poolInfo(0)).duration).to.equal(poolDuration);
    });

    it("Should check rewards distributed correctly at quarter of duration", async function () {
      await ethers.provider.send('evm_increaseTime', [1000]); // Increase time by 1000
      await ethers.provider.send('evm_mine', []) // Force mine to update block timestamp

      const totalExpectedEarningsQuarter = Number(poolRewards) / 4;
      const addr1ExpectedEarningsQuarter = (totalExpectedEarningsQuarter / 100) * addr1percentOfTotalStaked;
      const addr2ExpectedEarningsQuarter = (totalExpectedEarningsQuarter / 100) * addr2percentOfTotalStaked;
      const addr1EarningsQuarter = await multiRewardPool.connect(addr1).earned(addr1.address, 0);
      const addr2EarningsQuarter = await multiRewardPool.connect(addr2).earned(addr2.address, 0);
      expect(addr1ExpectedEarningsQuarter).to.equal(Number(addr1EarningsQuarter));
      expect(addr2ExpectedEarningsQuarter).to.equal(Number(addr2EarningsQuarter));
      console.log(addr1.address, '(addr1) expected to earn', addr1ExpectedEarningsQuarter, 'and earned:', addr1EarningsQuarter, 'at 1/4 duration');
      console.log(addr2.address, '(addr2) expected to earn', addr2ExpectedEarningsQuarter, 'and earned:', addr2EarningsQuarter, 'at 1/4 duration');
    });

    it("Should check rewards distributed correctly at half of duration", async function () {
      await ethers.provider.send('evm_increaseTime', [1000]); // Increase time by 1000 (total 2000)
      await ethers.provider.send('evm_mine', []) // Force mine to update block timestamp

      const totalExpectedEarningsHalf = Number(poolRewards) / 2;
      const addr1ExpectedEarningsHalf = (totalExpectedEarningsHalf / 100) * addr1percentOfTotalStaked;
      const addr2ExpectedEarningsHalf = (totalExpectedEarningsHalf / 100) * addr2percentOfTotalStaked;
      const addr1EarningsHalf = await multiRewardPool.connect(addr1).earned(addr1.address, 0);
      const addr2EarningsHalf = await multiRewardPool.connect(addr2).earned(addr2.address, 0);
      expect(addr1ExpectedEarningsHalf).to.equal(Number(addr1EarningsHalf));
      expect(addr2ExpectedEarningsHalf).to.equal(Number(addr2EarningsHalf));
      console.log(addr1.address, '(addr1) expected to earn', addr1ExpectedEarningsHalf, 'and earned:', addr1EarningsHalf, 'at 1/2 duration');
      console.log(addr2.address, '(addr2) expected to earn', addr2ExpectedEarningsHalf, 'and earned:', addr2EarningsHalf, 'at 1/2 duration');
    });

    it("Should check rewards distributed correctly at completion of duration", async function () {
      await ethers.provider.send('evm_increaseTime', [2000]); // Increase time by 2000 (total 4000)
      await ethers.provider.send('evm_mine', []) // Force mine to update block timestamp

      const totalExpectedEarningsComplete = Number(poolRewards);
      const addr1ExpectedEarningsComplete = (totalExpectedEarningsComplete / 100) * addr1percentOfTotalStaked;
      const addr2ExpectedEarningsComplete = (totalExpectedEarningsComplete / 100) * addr2percentOfTotalStaked;
      const addr1EarningsComplete = await multiRewardPool.connect(addr1).earned(addr1.address, 0);
      const addr2EarningsComplete = await multiRewardPool.connect(addr2).earned(addr2.address, 0);
      expect(addr1ExpectedEarningsComplete).to.equal(Number(addr1EarningsComplete));
      expect(addr2ExpectedEarningsComplete).to.equal(Number(addr2EarningsComplete));
      console.log(addr1.address, '(addr1) expected to earn', addr1ExpectedEarningsComplete, 'and earned:', addr1EarningsComplete, 'at full duration');
      console.log(addr2.address, '(addr2) expected to earn', addr2ExpectedEarningsComplete, 'and earned:', addr2EarningsComplete, 'at full duration');
    });

  });

  describe("Two Reward Pools: Test multiple rewards work", async () => {

    // Start Reward Pools
    it("Should start reward pool 2 at poolId = 1", async function () {
      await mockReward2.approve(multiRewardPool.address, ethers.utils.parseEther("999999999"));
      await multiRewardPool.startRewardPool(1, poolRewards, poolDuration);
      expect((await multiRewardPool.poolInfo(1)).rewardPoolID).to.equal(1);
    });

    it("Should start reward pool 3 at poolId = 2", async function () {
      await mockReward3.approve(multiRewardPool.address, ethers.utils.parseEther("999999999"));
      await multiRewardPool.startRewardPool(2, poolRewards, poolDuration);
      expect((await multiRewardPool.poolInfo(2)).rewardPoolID).to.equal(2);
    });

    it("Should distribute both reward tokens", async function () {
      const result1before = await multiRewardPool.earned(addr1.address, 1)
      const result2before = await multiRewardPool.earned(addr1.address, 2)

      await ethers.provider.send('evm_increaseTime', [1000]); // Increase time by 1000
      await ethers.provider.send('evm_mine', []) // Force mine to update block timestamp

      const result1after = await multiRewardPool.earned(addr1.address, 1)
      const result2after = await multiRewardPool.earned(addr1.address, 2)
      
      expect(Number(result1after)).to.be.greaterThan(Number(result1before));
      expect(Number(result2after)).to.be.greaterThan(Number(result2before));
    });

  });
  
  describe("Staking Token with Fee: Test tokenFee functionality", async () => {

    it("Should update totalSupply by correct amount", async function () {
      const totalSupplyFeeContract = await multiRewardPoolFee.totalSupply();
      expect(Number(totalSupplyFeeContract)).to.equal(Number(ethers.utils.parseEther("90")));
    });

    it("Should update users staked balance by correct amount", async function () {
      const addr1stakedFeeContract = await multiRewardPoolFee.balanceOf(owner.address);
      expect(Number(addr1stakedFeeContract)).to.equal(Number(ethers.utils.parseEther("90")));
    });

  });

  describe("Test Withdraw Fee (devFee)", async () => {
    
    it("Should take correct devFee from user withdrawing", async function () {
      const stakingBalanceAfterWithdraw = await mockStaking.balanceOf(addr3.address);
      expect(Number(stakingBalanceAfterWithdraw)).to.equal(Number(ethers.utils.parseEther("98.5")));
    });

    it("Should add correct amount to treasury address when user withdraws", async function () {
      const treasuryBalanceAfterWithdraw = await mockStaking.balanceOf(treasuryAddress);
      expect(Number(treasuryBalanceAfterWithdraw)).to.equal(Number(ethers.utils.parseEther("1.5")));
    });

  });