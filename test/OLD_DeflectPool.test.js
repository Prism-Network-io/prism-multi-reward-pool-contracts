const DeflectPool = artifacts.require("DeflectPool");
const Deflector = artifacts.require("Deflector");
const MockERC20 = artifacts.require("MockERC20");
const MockPRISM = artifacts.require("MockPRISM");
const { assert } = require("chai");
const { time } = require("openzeppelin-test-helpers");
const big = (n) => web3.utils.toBN(n);
const defaultSupply = big(10000000);
const defaultDecimals = big(12);
const defaultDuration = time.duration.weeks(9); // 9 weeks
const parseUnits = (units, pow) => big(+units).mul(big(10).pow(big(pow)));

const deployMock = async (accounts) => {
  // Fake PRISM to support historical mints
  const prismToken = await MockPRISM.new();

  // Fake staking token
  const stakingToken = await MockERC20.new(defaultSupply, defaultDecimals);

  // Fake reward token
  const rewardToken = await MockERC20.new(defaultSupply, defaultDecimals);

  // Fake boost token
  const boostToken = await MockERC20.new(
    defaultSupply.mul(big(10000)),
    defaultDecimals
  );

  // Deflector implementation deployed with the PRISM address
  const deflector = await Deflector.new(prismToken.address);
  const treasuryAddr = accounts[8];
  const devAddr = accounts[9];
  // A single pool for the above configuration
  //        address _treasury,
  //        address _devFund,
  const pool = await DeflectPool.new(
    defaultDuration,
    stakingToken.address,
    rewardToken.address,
    deflector.address,
    treasuryAddr,
    devAddr,
    big(10)
  );

  // Addition of pool to deflector to enable purchasing of local boosts
  await deflector.addPool(pool.address);

  // Addition of local boosts for the pool using the following tiers
  await deflector.addLocalBoost(
    pool.address,
    boostToken.address,
    [
      // Level 1: 2500 FAKEBOOSTOKEN -> 50 -> 5%
      parseUnits("2500", 18),
      // Level 2: 3000 FAKEBOOSTOKEN -> 100 -> 10%
      parseUnits("3000", 18),
      // Level 3: 3500 FAKEBOOSTOKEN -> 200 -> 20%
      parseUnits("3500", 18),
      // Level 4: 4000 FAKEBOOSTOKEN -> 300 -> 30%
      parseUnits("4000", 18),
      // Level 5: 5000 FAKEBOOSTOKEN -> 400 -> 40%
      parseUnits("5000", 18),
      // Level 6: 6000 FAKEBOOSTOKEN -> 400 -> 40%
      parseUnits("6000", 18),
    ],
    [50, 100, 200, 300, 400, 500]
  );

  return {
    prismToken,
    stakingToken,
    rewardToken,
    deflector,
    pool,
    boostToken,
  };
};

contract("DeflectPool", (accounts) => {
  it("should properly initialize the contract", async () => {
    const { stakingToken, pool, rewardToken, deflector } = await deployMock(
      accounts
    );
    const expectedMultiplier = big(10).pow(await stakingToken.decimals());

    assert.equal((await pool.devFee()).valueOf(), 10);
    assert.equal(await pool.rewardToken(), rewardToken.address);
    assert.equal(await pool.stakingToken(), stakingToken.address);
    assert.equal(await pool.deflector(), deflector.address);
    assert.equal(await pool.treasury(), accounts[8]);
    assert.equal(await pool.devFund(), accounts[9]);
    assert.equal(
      (await pool.duration()).toString(),
      defaultDuration.toString()
    );
    assert.equal(
      (await pool.stakingTokenMultiplier()).toString(),
      expectedMultiplier.toString()
    );
  });

  it("should properly success change the local booost", async () => {
    const { deflector, boostToken, pool } = await deployMock(accounts);

    await deflector.updateLocalBoost(
      pool.address,
      boostToken.address,
      [
        // Level 1: 3000 FAKEBOOSTOKEN -> 50 -> 5%
        parseUnits("3000", 18),
        // Level 2: 3500 FAKEBOOSTOKEN -> 100 -> 10%
        parseUnits("3500", 18),
        // Level 3: 4000 FAKEBOOSTOKEN -> 200 -> 20%
        parseUnits("4000", 18),
        // Level 4: 4500 FAKEBOOSTOKEN -> 300 -> 30%
        parseUnits("4500", 18),
        // Level 5: 5500 FAKEBOOSTOKEN -> 400 -> 40%
        parseUnits("5500", 18),
        // Level 6: 6500 FAKEBOOSTOKEN -> 400 -> 40%
        parseUnits("6500", 18),
      ],
      [10, 20, 30, 40, 50, 60]
    );

    const poolInfo = await deflector.getPoolInfor(
      pool.address,
      boostToken.address
    );
    console.log("xxxx poolInfo", poolInfo);
  });

  it("is earning rewards without boosts", async () => {
    const { stakingToken, rewardToken, pool } = await deployMock(accounts);
    const expectedMultiplier = big(10).pow(await stakingToken.decimals());

    const stakeAmount = expectedMultiplier.div(big(10));
    await stakingToken.approve(pool.address, stakeAmount);
    await pool.stake(stakeAmount);
    await stakingToken.transfer(accounts[1], stakeAmount);
    await stakingToken.approve(pool.address, stakeAmount, {
      from: accounts[1],
    });
    await pool.stake(stakeAmount, { from: accounts[1] });
    await rewardToken.transfer(pool.address, parseUnits(defaultSupply, 12));
    await pool.notifyRewardAmount();

    await time.increase(time.duration.weeks(9));

    const earned1 = await pool.earned(accounts[0]);
    const earned2 = await pool.earned(accounts[1]);

    assert.equal(earned1.toString(), earned2.toString());

    const ts = await pool.totalSupply();
    const rewardPerToken = await pool.rewardPerToken();

    assert.equal(
      earned1.add(earned2).toString(),
      ts
        .mul(rewardPerToken)
        .div(await pool.stakingTokenMultiplier())
        .toString()
    );
  });

  it("is earning rewards with global boosts", async () => {
    const { stakingToken, rewardToken, prismToken, pool } = await deployMock(
      accounts
    );
    const expectedMultiplier = big(10).pow(await stakingToken.decimals());

    const stakeAmount = expectedMultiplier.div(big(10));

    // Loop through boost %
    const boosts = [
      { percentage: 0, amount: "0" },
      { percentage: 5, amount: "15" },
      { percentage: 10, amount: "30" },
      { percentage: 25, amount: "75" },
      { percentage: 50, amount: "150" },
    ];

    for (let i = 0; i < boosts.length; i++) {
      await stakingToken.transfer(accounts[i], stakeAmount);
      await stakingToken.approve(pool.address, stakeAmount, {
        from: accounts[i],
      });
      await prismToken.mint(parseUnits(boosts[i].amount, 18), {
        from: accounts[i],
      });
      await pool.stake(stakeAmount, {
        from: accounts[i],
      });
    }

    await rewardToken.transfer(pool.address, parseUnits(defaultSupply, 12));
    await pool.notifyRewardAmount();

    await time.increase(time.duration.weeks(9));

    for (let i = 0; i < boosts.length; i++) {
      // console.log(i + " Earned: ", earned.toString());
      const balance = await pool.balanceOf(accounts[i]);
      // console.log(i + " Balance: ", balance.toString());
      const boostedBalance = await pool.boostedBalanceOf(accounts[i]);
      assert.equal(
        balance.mul(big(boosts[i].percentage)).div(big(100)).toString(),
        boostedBalance.toString()
      );

      const earned = await pool.earned(accounts[i]);
      const ts = await pool.totalSupply();
      const bts = await pool.boostedTotalSupply();
      const rewardPerToken = await pool.rewardPerToken();
      const totalReward = ts
        .add(bts)
        .mul(rewardPerToken)
        .div(await pool.stakingTokenMultiplier());

      const expectedEarned = balance
        .add(boostedBalance)
        .mul(totalReward)
        .div(ts.add(bts));

      const deviation = +expectedEarned.sub(earned).abs();
      assert.approximately(deviation, 0, 1);
    }
  });

  it("is earning rewards with local boosts", async () => {
    const { stakingToken, rewardToken, boostToken, pool } = await deployMock(
      accounts
    );
    const expectedMultiplier = big(10).pow(await stakingToken.decimals());

    const stakeAmount = expectedMultiplier.div(big(10));

    // Loop through boost %
    const boosts = [
      { percentage: 5, amount: "2500" },
      { percentage: 10, amount: "3000" },
      { percentage: 20, amount: "3500" },
      { percentage: 30, amount: "4000" },
      { percentage: 40, amount: "5000" },
      { percentage: 50, amount: "6000" },
    ];

    await rewardToken.transfer(pool.address, parseUnits(defaultSupply, 12));
    await pool.notifyRewardAmount();

    for (let i = 0; i < boosts.length; i++) {
      if (i !== 0) await stakingToken.transfer(accounts[i], stakeAmount);
      await stakingToken.approve(pool.address, stakeAmount, {
        from: accounts[i],
      });
      if (i !== 0)
        await boostToken.transfer(
          accounts[i],
          parseUnits(boosts[i].amount, 18)
        );
      await boostToken.approve(pool.address, parseUnits(boosts[i].amount, 18), {
        from: accounts[i],
      });
      const tokenBalanceBeforePurchase = await boostToken.balanceOf(
        accounts[i]
      );
      const tokenBalanceOfTreasuasyBefore = await boostToken.balanceOf(
        accounts[8]
      );
      const tokenBalanceOfDevBefore = await boostToken.balanceOf(accounts[9]);
      await pool.purchase(boostToken.address, i + 1, {
        from: accounts[i],
      });
      const tokenBalanceAfterPurchase = await boostToken.balanceOf(accounts[i]);
      const tokenBalanceOfTreasuasyAfter = await boostToken.balanceOf(
        accounts[8]
      );
      const tokenBalanceOfDevAfter = await boostToken.balanceOf(accounts[9]);
      const actualCost = big(tokenBalanceBeforePurchase).sub(
        big(tokenBalanceAfterPurchase)
      );
      const differDev = big(tokenBalanceOfDevAfter).sub(
        big(tokenBalanceOfDevBefore)
      );
      const differTreasuasy = big(tokenBalanceOfTreasuasyAfter).sub(
        big(tokenBalanceOfTreasuasyBefore)
      );
      assert.equal(actualCost * 0.25, differDev);
      console.log("Differ treasuasy: " + differTreasuasy);
      console.log("ActualCost " + actualCost);
      assert.equal(
        actualCost.sub(differDev).toString(),
        differTreasuasy.toString()
      );

      await pool.stake(stakeAmount, {
        from: accounts[i],
      });
    }

    await time.increase(time.duration.weeks(9));

    for (let i = 0; i < boosts.length; i++) {
      // console.log(i + " Earned: ", earned.toString());
      const balance = await pool.balanceOf(accounts[i]);
      // console.log(i + " Balance: ", balance.toString());
      const boostedBalance = await pool.boostedBalanceOf(accounts[i]);
      assert.equal(
        balance.mul(big(boosts[i].percentage)).div(big(100)).toString(),
        boostedBalance.toString()
      );

      const earned = await pool.earned(accounts[i]);
      const ts = await pool.totalSupply();
      const bts = await pool.boostedTotalSupply();
      const rewardPerToken = await pool.rewardPerToken();
      const totalReward = ts
        .add(bts)
        .mul(rewardPerToken)
        .div(await pool.stakingTokenMultiplier());

      const expectedEarned = balance
        .add(boostedBalance)
        .mul(totalReward)
        .div(ts.add(bts));

      const deviation = +expectedEarned.sub(earned).abs();

      // This deviation is observable because we enable boosts a bit late due to time passing so our deviation is "0.0001" units
      const permittedDeviation = +parseUnits(1, 14);

      assert.approximately(deviation, 0, permittedDeviation);

      console.log("Permitted Deviation: ", permittedDeviation);
      console.log("Actual Deviation   : ", deviation);
    }
  });

  it("is earning rewards with local and global boosts", async () => {
    const {
      stakingToken,
      rewardToken,
      prismToken,
      boostToken,
      pool,
    } = await deployMock(accounts);
    const expectedMultiplier = big(10).pow(await stakingToken.decimals());

    const stakeAmount = expectedMultiplier.div(big(10));

    // Loop through boost %
    const boosts = [
      { percentage: 0, amount: "0" },
      { percentage: 5, amount: "15" },
      { percentage: 10, amount: "30" },
      { percentage: 25, amount: "75" },
      { percentage: 50, amount: "150" },
    ];
    const localBoosts = [
      { percentage: 5, amount: "2500" },
      { percentage: 10, amount: "3000" },
      { percentage: 20, amount: "3500" },
      { percentage: 30, amount: "4000" },
      { percentage: 40, amount: "5000" },
      { percentage: 50, amount: "6000" },
    ];

    await rewardToken.transfer(pool.address, parseUnits(defaultSupply, 12));
    await pool.notifyRewardAmount();

    for (let i = 0; i < boosts.length; i++) {
      await stakingToken.transfer(accounts[i], stakeAmount);
      await stakingToken.approve(pool.address, stakeAmount, {
        from: accounts[i],
      });
      if (i == 5) {
        // global boost 50 - local boost 50
        await prismToken.mint(parseUnits(boosts[i - 1].amount, 18), {
          from: accounts[i],
        });
      } else {
        await prismToken.mint(parseUnits(boosts[i].amount, 18), {
          from: accounts[i],
        });
      }
      if (i !== 0)
        await boostToken.transfer(
          accounts[i],
          parseUnits(localBoosts[i].amount, 18)
        );
      await boostToken.approve(
        pool.address,
        parseUnits(localBoosts[i].amount, 18),
        {
          from: accounts[i],
        }
      );
      await pool.purchase(boostToken.address, i + 1, {
        from: accounts[i],
      });
      await pool.stake(stakeAmount, {
        from: accounts[i],
      });
    }

    await time.increase(time.duration.weeks(9));

    for (let i = 0; i < boosts.length; i++) {
      // console.log(i + " Earned: ", earned.toString());
      const balance = await pool.balanceOf(accounts[i]);
      // console.log(i + " Balance: ", balance.toString());
      const boostedBalance = await pool.boostedBalanceOf(accounts[i]);
      if (i == 5) {
        assert.equal(
          balance
            .mul(
              big(boosts[i - 1].percentage).add(big(localBoosts[i].percentage))
            )
            .div(big(100))
            .toString(),
          boostedBalance.toString()
        );
      } else {
        assert.equal(
          balance
            .mul(big(boosts[i].percentage).add(big(localBoosts[i].percentage)))
            .div(big(100))
            .toString(),
          boostedBalance.toString()
        );
      }

      const earned = await pool.earned(accounts[i]);
      const ts = await pool.totalSupply();
      const bts = await pool.boostedTotalSupply();
      const rewardPerToken = await pool.rewardPerToken();
      const totalReward = ts
        .add(bts)
        .mul(rewardPerToken)
        .div(await pool.stakingTokenMultiplier());

      const expectedEarned = balance
        .add(boostedBalance)
        .mul(totalReward)
        .div(ts.add(bts));

      const deviation = +expectedEarned.sub(earned).abs();

      // This deviation is observable because we enable boosts a bit late due to time passing so our deviation is "0.0001" units
      const permittedDeviation = +parseUnits(1, 14);

      assert.approximately(deviation, 0, permittedDeviation);

      console.log("Permitted Deviation: ", permittedDeviation);
      console.log("Actual Deviation   : ", deviation);
    }
  });
});
