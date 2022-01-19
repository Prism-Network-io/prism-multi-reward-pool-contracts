const { time, constants } = require("openzeppelin-test-helpers");
const Web3 = require("web3");

const DeflectPool = artifacts.require("DeflectPool.sol");
const SatelliteDeflector = artifacts.require("SatelliteDeflector.sol");

const _stakingToken = "0x3df2C04B0eC486F09Fc89C943377F18c2EEE28a2";
const _BSCdeflector = "0x3b583D0AEc1C329f934daC41029BB95Ed3A2fCff";
const _treasury = "0xb3C912a583b365f7B4CAdB705B7735e1E10fAC03";
const _devFund = "0xc62Ca0808Dd2b1029c634dA732423EcFbe89683f";
const _devFee = 1;
const _burnFee = 1;
const _prism = "0x6225f4247eB126BbafE2855841F60E91BBb8a43c";
const boostToken = "0xAef9068d17CA94632e2d240B1CfCA02E585C9eff";

const NJOY = "0x299899A16df8a7bcDdd176913737F19782958C76";
const NJOY_EMPIRE = "0xda8158e10a3281dc17af4a04dd6735710db4427f";

const ADMC = "0xA55EF2fB2B7b6A60371FD3def9B806E74a48bE69";
const ADMC_WBNB = "0x0D3E6Df10D88ba11b738DC41290A4829505D8c37";
const ADMC_EMPIRE = "0x47D2DB6885017c9CA4eb72fcDD358d9C16515fED";

const admc_1 = "0x1EFdD2F06aaFB9DE568F59A873ba83BC567e562C";
const admc_2 = "0xb398b5B7CA545AdbdbC3aF5e97305451291a97A9";
const admc_3 = "0x43fd789Bb365DDc1cFeAc65d180BBa7206168F23";

const STAKE = "0xb7D311E2Eb55F2f68a9440da38e7989210b9A05e";
const WXDAI = "0xe91d153e0b41518a2ce8dd3d7944fa863463a97d";
const XPRISM = "0xd46df541148932690b81092f600f35208afd4325";
const XDEX = "0xc83859c413a6ba5ca1620cd876c7e33a232c1c34";

const XDEX_XDAI = "0xe3946277F2fBBa6D99fa80788816F07ebE8284F2";
const XDEX_xPRISM = "0x6ed9577B2813b8BF6Fe63dB4a24E562ac5Ce9834";
const XDEX_EMP_LP = "0xD55CE271327C45F790965fB5fAa89820bB4162cD";
const WXDAI_xPRISM = "0x1AB118E52D71Bd52A7597286Bb627a2BEcE30B13";
const XDEX_POOL = "0x5043a37E45A41138d2F2494955ed9D32bcc9565b";
const xPRISM_POOL = "0xd474b979DD0923532dAfe85705631E94BF8c08AC";

const PDEX_MATIC = "0x6d0d97fe6c323e5b3248ceb356dbf74708c2d8be";
const PDEX_pPRISM = "0xb773731f5c2425167edf2384fca215f02565ddde";
const PDEX_PDEX_MATIC = "0x78fb682998adbf7d9a7606aaf762ed23e466dbfa";
const MATIC_pPRISM = "0x733cc311ebae030ee877c9ea6eccfbf659c142aa";
const PDEX = "0xc83859c413a6ba5ca1620cd876c7e33a232c1c34";
const pPRISM = "0xd46df541148932690b81092f600f35208afd4325";

const WETH_MATIC = "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619";
const USDC_MATIC = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174";
const wMATIC = "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270";

const ADEX_AVAX_POOL = "0x9427E124E105d2E2C35949E7632889ec0065CF5f";
const ADEX_APRISM_POOL = "0xB541fb5dc381Fdf7a744602daDA57B28741F3247";
const ADEX_ADEX_AVAX_POOL = "0xA3d6A88D887153E0E367FAf9e2FC1f1769073083";
const AVAX_APRISM_POOL = "0x95548c9B7a3AbDCa5F57173F914470c8f01Ade2A";
const ADEX_POOL = "0x229B0205398B6Fda0aC03cC3E0f2A4952AeA2c73";
const APRISM_POOL = "0x281F20Aff1b787609e3c257c85e3F79Bfc51Ff6b";


const ADEX = "0xc83859C413a6bA5ca1620cD876c7E33a232c1C34";
const ADEX_AVAX = "0x80832376db4e414c88629c54923aecb9855346c0";
const ADEX_APRISM = "0xed3915ee1587595e81ada81d82c298122b4ae8a9";

const ADEX_ADEX_AVAX = "0xe4b37ef0add9a7532ac513d4637d8fc0f4129d44";
const WAVAX_APRISM = "0x09e7bff9efe20471c79e8acaadc9713a43788330";
const WAVAX = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";
const APRISM = "0x9888b4470f7b3494572ad491f24717c6a1efe1b7";

const ETH_AVAX = "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB";

const FDEX_LP = "0xC12a874065b52926F89F29253744c15Bc37eAf0B";
const WFTM = "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83";
const USDC = "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75";
const ETH = "0x74b23882a30290451a17c44f4f05243b6b58c76d";
const FPRISM = "0xd46df541148932690B81092f600f35208AFd4325";
const FDEX = "0xc83859C413a6bA5ca1620cD876c7E33a232c1C34";
const FDEX_EMPLP = "0xB7f9f3450e975eCbCa458A83A940d14bB48CfE31";

const FDEX_FPRISM = "0xB773731F5C2425167EdF2384FCa215F02565ddDE";
const WFTM_USDC = "0x2703f8eb09B1d6d3dc5727329e8f17e58146b49b";

const WFTM_FPRISM = "0xadF91b184608E6915fa892fA979604E440352BCD";
const WFTM_ETH = "0xAaDAa2844921ECbB1F74C2900fBc383dBfb493C8";
const WFTM_BTC = "0x953026527b56a4975329e6207774Fee676aa74dA";

const BOO = "0x841fad6eae12c286d1fd18d1d525dffa75c7effe";

const empireBNB = "0xf3114cb351f38f8e8ff17f8313ff91cec4ff196f";
const busdBNB = "0x15443197c97009737e8e9fe3eac321affcba65c1";
const usdtBNB = "0x6a38723e0acb329c887ed9f180d0e3913aef4ddc";
const ethBNB = "0x571073e1ffcd0879fafa34167a0490ebf9594b52";
const ethBUSD = "0x7993d6dccd29d9ddd03c8e6a32791055106ad9b3";
const usdtBUSD = "0xec08e44232d7385472b4e1d374dea7d7b780d5dc";
const usdcBUSD = "0xe518e01583783b9f240fa02ff451726f13c63381";
const btcbBUSD = "0xb1326f3c4eb110d46871bcffc5aade7a6454cd37";
const btcbBNB = "0x8175a6c23009b31cb46a7bcdd9c13a300da2cd95";
const bPrismBNB = "0x424ee77418c492b9861a3796402ffb22136a5863";
const bPrismEmpireDex = "0xADB7A32bbC7EeF58cA1A60cA1256F028603B01c9";
const EmpireDexEmpireBNB = "0x6688349f8e74c03c422f79254e8126280be5e484";

const bPRISM = "0x4cf12dd46bab9afc94e049342fd75a9eaff5d096";
const WBNB = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
const bTCB = "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c";
const BUSD = "0xe9e7cea3dedca5984780bafc599bd69add087d56";
const empireDex = "0xc83859C413a6bA5ca1620cD876c7E33a232c1C34"
const prismDev = "0xd6F8da21cB98e9Eb3Cd27A9034E1A71D17beC9ed";
const prismTreasury = "0x5abbd94bb0561938130d83fda22e672110e12528";

const PRISM = "0xd46df541148932690b81092f600f35208afd4325";
const wETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
const DEF = "0x3aa5f749d4a6bcf67dac1091ceb69d1f5d86fa53";
const USDT = "0xdac17f958d2ee523a2206206994597c13d831ec7"; 

const poolaa = "0x8F35095BF9615e1504aDE5e071B230BEc345910C";
const poolbb = "0xe7fF27Ec5aB236809Bd3Fd559B0C0B178D3EB043";

const poola = "0x07120b4A106BF34f519B86B9AA3897c2E98B58D7";
const poolb = "0x87777b7Ef6e7a79D517224DDEaC508A23B035e8e";
const poolc = "0xFc941aAAdE432cF2f1FEC60aC49D2D8362Fa906d";
const poold = "0x8c95C9b57296061efAEC6eb9C6CFA722Dc8Cc66d";
const poole = "0xc65A04A779e51Ccc86d4dF55c498140302989c0E";

const bEVAPE = "0x69d1ff85004a445A892dFbD88DF00D48fb0aF638";
const EVAPE = "0x54de6226b8a54b5a5935bb54f47c3e409c71634a";

const DOLPH = "0xcd970d95da2a886e04eaf739d04c0deee8f37f4d";
const DOLPH_BNB = "0x05e68a71a489bb96de3b7da7440ece8d0a326853";

// CRO 

const CRO_EMPIRE_POOL = '0xB53436b871C14F228FFd5f702EFF38B24c8556c6';
const EMPIRE_CRO_EMPIRE_POOL = '0x702Aa2B7e18d8cd48D95C7C004D061C1021E3d61';
const CRO_USDC_POOL = '0x3dA27005b4f80FA2ead3c8a0078EfB13DaC327eD';
const CRO_ETH_POOL = '0x65f54775A7C4F175D393871a29EF87562E824AB9';
const CRO_CroPRISM_POOL = '0x7c049baa4046b640BC77DbDCA0bA3F4a3d869394';

const EMPIRE_croPRISM_POOL = '0x4B2f8367233f2f957FC2B32daf94F605b8C02757';
const EMPIRE_POOL = '0x46E90E5E5D97D125C3E268758F1560cF557BCbc3';

const croETH = '0xe44Fd7fCb2b1581822D0c862B68222998a0c299a';
const croBTC = '0x062E66477Faf219F25D27dCED647BF57C3107d52';
const croUSDC = '0xc21223249CA28397B4B6541dfFaEcC539BfF0c59';
const WCRO = '0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23';

const METABC = '0xe5E33d3fFF677218BE30b33df5906f53B426875c';
const METABC_BNB = '0x05f291f0b4b3a9b53bb4cd99984802bd75593771';
const METABC_EMPIRE = '0x9ca805abca2af73813cae56b782d6dd91dff89a4';

const MIYAZAKI ='0xd5e7d22362bcc9881d06512d3189eae79dd98d70';




const deployDeflector = async (deployer) => {
  let deflector;
  await deployer.deploy(SatelliteDeflector);
  deflector = await SatelliteDeflector.deployed();
  console.log("deflector ", deflector.address);

};

const deployPool = async (name, deployer) => {
    let pool;
    await deployer.deploy(DeflectPool, empireBNB, _BSCdeflector, _treasury, _devFund, _devFee, _burnFee, _prism);

    pool = await DeflectPool.deployed();
    // pool = await DeflectPool.at("0x9073913C37a7b15072Fa4af4ff7aebEe70cDA176");

    let deflector = await SatelliteDeflector.at(_BSCdeflector);
    console.log("Pool ", name, pool.address);

    console.log("--- Adding Staking Pool ---")
    await deflector.addPool(pool.address);

    console.log("--- Adding Local boost---")
    // await deflector.addLocalBoost(
    //   pool.address,
    //   boostToken,
    //   [
    //     // Level 1: 50%
    //     "10000000000000",
    //     // Level 2:  20%
    //     "20000000000000",
    //     // Level 3: 30%
    //     "30000000000000",
    //     // Level 4:  40%
    //     "40000000000000",
    //     // Level 5:  50%
    //     "50000000000000",
    //   ],
    //   [100, 200, 300, 400, 500]
    // );

    await deflector.addLocalBoost(
      pool.address,
      WBNB,
      [
        // Level 1: 10%
        "36366700",
        // Level 2: 20%
        "727330440",
        // Level 3: 30%
        "109095096",
        // Level 4:  40%
        "145460128",
        // Level 5:  50%
        "181825160",
      ],
      [100, 200, 300, 400, 500]
    );
    // await deflector.addLocalBoost(
    //   pool.address,
    //   bPRISM,
    //   [
    //     // Level 1: 10%
    //     "1266666666670000000",
    //     // Level 2:  20%
    //     "2566666666670000000",
    //     // Level 3: 30%
    //     "3700000000000000000",
    //     // Level 4:  40%
    //     "5333333333330000000",
    //     // Level 5:  50%
    //     "6266666666670000000",
    //   ],
    //   [100, 200, 300, 400, 500]
    // );
    // await deflector.addLocalBoost(
    //   pool.address,
    //   BUSD,
    //   [
    //     // Level 1: 10%
    //     "20000000000000000000",
    //     // Level 2: 20%
    //     "40000000000000000000",
    //     // Level 3: 30%
    //     "60000000000000000000",
    //     // Level 4:  40%
    //     "80000000000000000000",
    //     // Level 5:  50%
    //     "100000000000000000000"
    //   ],
    //   [100, 200, 300, 400, 500]
    // );
    // await deflector.addLocalBoost(
    //   pool.address,
    //   empireDex,
    //   [
    //     // Level 1: 10%
    //     "197931034480000000",
    //     // Level 2:  20%
    //     "385862068960000000",
    //     // Level 3: 30%
    //     "583793103440000000",
    //     // Level 4:  40%
    //     "771724137930000000",
    //     // Level 5:  50%
    //     "979655172410000000"
    //   ],
    //   [100, 200, 300, 400, 500]
    // );

    await pool.addRewardPool(empireDex, 10800);

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