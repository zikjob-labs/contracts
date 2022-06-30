const { ethers } = require('hardhat');
const {
  encodeKeyValue,
  decodeKeyValue,
} = require('@erc725/erc725.js/build/main/src/lib/utils');
const {
  encodeKeyName,
} = require('@erc725/erc725.js/build/main/src/lib/encodeKeyName');
const ZikJobProfileMetadata = require('../schemas/ZikJobProfileMetadata.json');
const delay = (ms) => new Promise((resolve) => setTimeout(() => resolve(), ms));

const zikkieAddr = '';

async function deployAuth() {
  const ZikJobAuth = await ethers.getContractFactory('ZikJobAuth');
  const zikjobAuthContract = await ZikJobAuth.deploy();
  await zikjobAuthContract.deployed();
  console.log('ZikJobAuth deployed to:', zikjobAuthContract.address);

  return zikjobAuthContract;
}

async function deployZikkie(zikjobAuthContract) {
  const owner = await ethers.getSigner();
  const zikkieAddr = await zikjobAuthContract.callStatic.createZikkie();
  await zikjobAuthContract.createZikkie();
  console.log(`${owner.address} with ZikJob Profile ${zikkieAddr}`);
  const Zikkie = await ethers.getContractFactory('Zikkie');
  const zikkieContract = Zikkie.attach(zikkieAddr);

  return zikkieContract;
}

async function deploy() {
  let zikkieContract;
  if (zikkieAddr == '') {
    const authContract = await deployAuth();
    zikkieContract = await deployZikkie(authContract);
  } else {
    const Zikkie = await ethers.getContractFactory('Zikkie');
    zikkieContract = Zikkie.attach(zikkieAddr);
    console.log(`ZikJob Profile address is: ${zikkieAddr}`);
  }

  return zikkieContract;
}

async function setData(zikkieContract) {
  const lsp3ProfileSchema = ZikJobProfileMetadata[1];
  key = encodeKeyName(lsp3ProfileSchema.name);
  let json = {
    LSP3Profile: {
      name: 'LSPProfileTest',
      description: 'Test set data',
    },
  };
  let url = 'ipfs://fake'; // <== upload to IPFS then get url
  let value = encodeKeyValue(
    lsp3ProfileSchema.valueContent,
    lsp3ProfileSchema.valueType,
    {
      json,
      url,
    }
  );
  await zikkieContract['setData(bytes32,bytes)'](key, value);
  console.log('setData with LSP3Profile');

  await delay(30000); // wait for mine new block
  const dataProfileEncoded = await zikkieContract['getData(bytes32)'](key);
  console.log(dataProfileEncoded);
  const dataProfileDecoded = decodeKeyValue(
    lsp3ProfileSchema.valueContent,
    lsp3ProfileSchema.valueType,
    dataProfileEncoded
  );
  console.log('LSP0Profile decoded:');
  console.log(dataProfileDecoded);
}

async function main() {
  const zikkieContract = await deploy();
  await delay(30000);
  await setData({ zikkieContract });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
