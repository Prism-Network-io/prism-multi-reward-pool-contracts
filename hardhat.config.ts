import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";

dotenv.config();

task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const deployerKey = process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000
      }
      // "viaIR": true, // fixes stack too deep errors w/ optimized IR-based code generation pipeline
    }
  },
  networks: {
    goerli: {
      url: process.env.GOERLI_URL || "",
      chainId: 5,
      accounts: deployerKey,
    },
    sepolia: {
      url: process.env.SEP_URL || "",
      chainId: 11155111,
      accounts: deployerKey,
    },
    bsctest: {
      url: process.env.BSCTEST_URL || "",
      chainId: 97,
      accounts: deployerKey,
    },
    mainet: {
      url: process.env.MAINET_URL || "",
      chainId: 1,
      accounts: deployerKey,
    },
    bsc: {
      url: process.env.BSC_URL || "",
      chainId: 56,
      accounts: deployerKey,
    },
    polygon: {
      url: process.env.POLYGON_URL || "",
      chainId: 137,
      accounts: deployerKey,
    },
    fantom: {
      url: process.env.FANTOM_URL || "",
      chainId: 250,
      accounts: deployerKey,
    },
    avalanche: {
      url: process.env.AVALANCHE_URL || "",
      chainId: 43114,
      accounts: deployerKey,
    },
    cronos: {
      url: process.env.CRONOS_URL || "",
      chainId: 25,
      accounts: deployerKey,
    },
    gnosis: {
      url: process.env.GNOSIS_URL || "",
      chainId: 100,
      accounts: deployerKey,
    },
    kava: {
      url: process.env.KAVA_URL || "",
      chainId: 2222,
      accounts: deployerKey,
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
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