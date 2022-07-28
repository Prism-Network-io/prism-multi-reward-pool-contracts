import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const deployerKey = process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: "0.6.12",
  networks: {
    goerli: {
      url: process.env.GOERLI_URL || "",
      accounts: deployerKey,
    },
    mainet: {
      url: process.env.MAINET_URL || "",
      accounts: deployerKey,
    },
    sep: {
      url: process.env.SEP_URL || "",
      accounts: deployerKey,
    },
    kovan: {
      url: process.env.KOVAN_URL || "",
      accounts: deployerKey,
    },
    bsc: {
      url: process.env.BSC_URL || "",
      accounts: deployerKey,
    },
    polygon: {
      url: process.env.POLYGON_URL || "",
      accounts: deployerKey,
    },
    fantom: {
      url: process.env.FANTOM_URL || "",
      accounts: deployerKey,
    },
    avalanche: {
      url: process.env.AVALANCHE_URL || "",
      accounts: deployerKey,
    },
    cronos: {
      url: process.env.CRONOS_URL || "",
      accounts: deployerKey,
    },
    gnosis: {
      url: process.env.GNOSIS_URL || "",
      accounts: deployerKey,
    },
    kava: {
      url: process.env.KAVA_URL || "",
      accounts: deployerKey,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: {
      // goerli: process.env.GOERLISCAN_API_KEY,
      // mainet: process.env.ETHERSCAN_API_KEY,
      // bsc: process.env.BSCSCAN_API_KEY,
      // polygon: process.env.POLYSCAN_API_KEY,
      // fantom: process.env.FANTOMSCAN_API_KEY,
      // avalanche: process.env.AVASCAN_API_KEY,
      // cronos: process.env.CRONOSCAN_API_KEY,
      // gnosis: process.env.GNOSISCAN_API_KEY,
      // kava: process.env.KAVASCAN_API_KEY,
    },
    customChains: [
      {
        network: "cronos",
        chainId: 25,
        urls: {
          apiURL: "https://api.cronoscan.com/",
          browserURL: "https://cronoscan.com/",
        }
      },
      {
        network: "kava",
        chainId: 2222,
        urls: {
          apiURL: "https://explorer.kava.io/api",
          browserURL: "https://explorer.kava.io",
        }
      }

    ]
  }
};


export default config;