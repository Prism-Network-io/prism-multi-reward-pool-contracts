const { time, constants } = require("openzeppelin-test-helpers");
const Web3 = require("web3");

const DeflectPool = artifacts.require("DeflectPool.sol");
const SatelliteDeflector = artifacts.require("SatelliteDeflector.sol");

const _stakingToken = "0x3df2C04B0eC486F09Fc89C943377F18c2EEE28a2";
const _deflector = "0xb6F016F879200107cA5b94A7A7A6C01B48eE415b";
const _treasury = "0xb3C912a583b365f7B4CAdB705B7735e1E10fAC03";
const _devFund = "0xc62Ca0808Dd2b1029c634dA732423EcFbe89683f";
const _devFee = 1;
const _burnFee = 1;
const _prism = "0x6225f4247eB126BbafE2855841F60E91BBb8a43c";
const boostToken = "0xAef9068d17CA94632e2d240B1CfCA02E585C9eff";

const deployDeflector = async (deployer) => {
  let deflector;
  await deployer.deploy(SatelliteDeflector);
  deflector = await SatelliteDeflector.deployed();
  console.log("deflector ", deflector.address);

};

const deployPool = async (name, deployer) => {
    let pool;
    await deployer.deploy(DeflectPool, _stakingToken, _deflector, _treasury, _devFund, _devFee, _burnFee, _prism);

    pool = await DeflectPool.deployed();
    // pool = await DeflectPool.at("0x9073913C37a7b15072Fa4af4ff7aebEe70cDA176");

    let deflector = await SatelliteDeflector.at(_deflector);
    console.log("Pool ", name, pool.address);

    console.log("--- Adding Staking Pool ---")
    await deflector.addPool(pool.address);

    console.log("--- Adding Local boost---")
    await deflector.addLocalBoost(
      pool.address,
      boostToken,
      [
        // Level 1: 50%
        "10000000000000",
        // Level 2:  20%
        "20000000000000",
        // Level 3: 30%
        "30000000000000",
        // Level 4:  40%
        "40000000000000",
        // Level 5:  50%
        "50000000000000",
      ],
      [100, 200, 300, 400, 500]
    );

    // await pool.addRewardPool(rewardToken, 600);

    // //transfer reward tokens manually

    // await pool.notifyRewardPool(0, 10000000000000);

    // await pool.transferOwnership("0xb3C912a583b365f7B4CAdB705B7735e1E10fAC03");

    // await rewardToken.approve(_treasury, 10000000000000);
    
    // await pool.stake(10000000000000);
  
  };
  
  module.exports = async function (deployer) {
    await deployPool("Pool", deployer);
    console.log("Contract Deployed")
  };