const { ethers } = require('hardhat');
const {
  encodeKeyName,
  encodeKeyValue,
  decodeKeyValue,
} = require('@erc725/erc725.js/build/main/src/lib/utils');
const ZikJobProfileMetadata = require('../schemas/ZikJobProfileMetadata.json');
const delay = (ms) => new Promise(resolve => setTimeout(() => resolve(), ms));

async function deployAuthAndZikkie() {
  const owner = await ethers.getSigner();
  const ZikJobAuth = await ethers.getContractFactory('ZikJobAuth');
  const zikjobAuthContract = await ZikJobAuth.deploy();
  await zikjobAuthContract.deployed();

  console.log('ZikJobAuth deployed to:', zikjobAuthContract.address);

  const zikkieAddr = await zikjobAuthContract.callStatic.createZikkie();
  await zikjobAuthContract.createZikkie();
  console.log(`${owner.address} with ZikJob Profile ${zikkieAddr}`);
  const Zikkie = await ethers.getContractFactory('Zikkie');
  const zikkieContract = Zikkie.attach(zikkieAddr);

  return { zikjobAuthContract, zikkieContract };
}
async function main() {
  const zikkieAddr = '0x83193aDAa5f7A7E23116D3bC8c8cD12444fC7A39';
  let zikkieContract;
  if (zikkieAddr == '') {
    zikkieContract = (await deployAuthAndZikkie()).zikkieContract;
  } else {
    const Zikkie = await ethers.getContractFactory('Zikkie');
    zikkieContract = Zikkie.attach(zikkieAddr);
  }

  const lsp3ProfileSchema = ZikJobProfileMetadata[1];
  key = encodeKeyName(lsp3ProfileSchema.name);
  let json = {
    LSP3Profile: {
      name: 'LSPProfileTest',
      description: 'Test set data 1234567890',
    },
  };
  let url = 'https://fake'; // <== upload to IPFS then get url
  let value = encodeKeyValue(
    lsp3ProfileSchema.valueContent,
    lsp3ProfileSchema.valueType,
    {
      json,
      url,
    }
  );
  await zikkieContract['setData(bytes32,bytes)'](key, value);
  
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

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
