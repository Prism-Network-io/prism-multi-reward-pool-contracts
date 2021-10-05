const { time, constants } = require("openzeppelin-test-helpers");
const Web3 = require("web3");

const DeflectPool = artifacts.require("DeflectPool.sol");
const SatelliteDeflector = artifacts.require("SatelliteDeflector.sol");

// const bPRISM = "0x4cf12dd46bab9afc94e049342fd75a9eaff5d096";
// const prismDev = "0xd6F8da21cB98e9Eb3Cd27A9034E1A71D17beC9ed";
// const prismTreasury = "0x5abbd94bb0561938130d83fda22e672110e12528";
// const deflector = "0x7d23640d3C3a8E37e8858f7309EcD5d4d4c418c1";

const _stakingToken = "0x3df2C04B0eC486F09Fc89C943377F18c2EEE28a2";
const _deflector = "0x1E9A8d388Db730528F42fEF220b18f168DCa72BA";
const _treasury = "0xb3C912a583b365f7B4CAdB705B7735e1E10fAC03";
const _devFund = "0xc62Ca0808Dd2b1029c634dA732423EcFbe89683f";
const _devFee = 1;
const _burnFee = 1;
const _prism = "0x6225f4247eB126BbafE2855841F60E91BBb8a43c";
const boostToken = "0xAef9068d17CA94632e2d240B1CfCA02E585C9eff";
const rewardToken = "0x1074Fa4068f8eC1112a48f61cDc68e9953d08C18";


// module.exports = async function (deployer, network) {
//   console.log("start deploy");  
//   await deployer.deploy(DeflectPool, _stakingToken, _deflector, _treasury, _devFund, _devFee, _burnFee, _prism);
//   console.log("Contract Deployed");
// }

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
    // pool = await DeflectPool.at("0xe47725e21Ad28f6285E050Af2aD7E3E1CA0a0831");

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
    // let deflectorBSCTEST = await SatelliteDeflector.at("0x1E9A8d388Db730528F42fEF220b18f168DCa72BA");

    // let deflectorBSCTEST = await deployDeflector(deployer);
    await deployPool("Pool", deployer);
    console.log("Contract Deployed")
  };