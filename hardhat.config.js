require('dotenv').config();
const { task } = require('hardhat/config');

require('@nomiclabs/hardhat-waffle');
require('hardhat-gas-reporter');

const privateKey = process.env.PRIVATE_KEY;
const infuraProjectID = process.env.INFURA_PROJECT_ID;

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async (_, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(
      `Address: ${account.address} - Balance: ${hre.ethers.utils.formatUnits(
        await account.getBalance(),
        'ether'
      )} ETH`
    );
  }
});

task(
  'gasPrice',
  'Print the gas price of network',
  async (taskArgs, { ethers }) => {
    console.log('-------------Network------------');
    console.log(await ethers.provider.getNetwork());
    console.log('--------------------------------');
    console.log(await ethers.provider.getGasPrice());
    console.log(
      `Gas Price is: ${ethers.utils.formatUnits(
        await ethers.provider.getGasPrice(),
        'gwei'
      )} gwei`
    );
  }
);

task('send', 'Send token to other address')
  .addParam('account', 'Account address')
  .setAction(async (taskArgs, { ethers }) => {
    const addr1 = await ethers.getSigner();
    await addr1
      .sendTransaction({
        to: taskArgs.account,
        value: ethers.utils.parseEther('1'),
      })
      .then((tx) => console.log(tx));
  });

task('mineBlock', 'mine block')
  .addParam('second', 'Second')
  .setAction(async (taskArgs, { ethers, network }) => {
    await network.provider.send('evm_increaseTime', [parseInt(taskArgs.second)]);
    await network.provider.send('evm_mine');
    console.log('Mine done!');
  });

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {},
    hardhat_node: {
      url: 'http://127.0.0.1:8546',
    },
    ganache: {
      url: 'http://127.0.0.1:8545',
    },
    lukso_testnet_16: {
      url: 'https://rpc.l16.lukso.network',
      chainId: 2828,
      accounts: [privateKey],
    },
    ropsten: {
      url: `https://ropsten.infura.io/v3/${infuraProjectID}`,
      accounts: [privateKey],
    },
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${infuraProjectID}`,
      accounts: [privateKey],
    },
    bsc_testnet: {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      accounts: [privateKey],
    },
    bsc: {
      url: 'https://bsc-dataseed.binance.org/',
      accounts: [privateKey],
    },
  },
  solidity: {
    version: '0.8.7',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  mocha: {
    timeout: 40000,
  },
};
