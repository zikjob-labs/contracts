const { expect } = require('chai');
const { ethers } = require('hardhat');
const {
  encodeKeyValue,
  decodeKeyValue,
} = require('@erc725/erc725.js/build/main/src/lib/utils');
const {
  encodeKeyName
} = require('@erc725/erc725.js/build/main/src/lib/encodeKeyName');
const ZikJobProfileMetadata = require('../schemas/ZikJobProfileMetadata.json');

describe('Zikkie', async function () {
  let [owner, addr1, addr2] = [null, null, null];
  let contract;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const Zikkie = await ethers.getContractFactory('Zikkie');
    contract = await Zikkie.deploy(owner.address);
    await contract.deployed();
  });

  it('Deploy Zikkie', async function () {
    expect(contract).to.be.not.null;
  });

  it('Support InterfaceID', async function () {
    const erc725XInterfaceID = '0x44c028fe',
      erc725YInterfaceID = '0x714df77c',
      lsp0InterfaceID = '0x481e0fe8',
      lsp1InterfaceID = '0x6bb56a14';
    expect(await contract.supportsInterface(erc725XInterfaceID)).to.be.equal(
      true
    );
    expect(await contract.supportsInterface(erc725YInterfaceID)).to.be.equal(
      true
    );
    expect(await contract.supportsInterface(lsp0InterfaceID)).to.be.equal(true);
    expect(await contract.supportsInterface(lsp1InterfaceID)).to.be.equal(true);
  });

  it('Get and set data', async function () {
    const standardLSP0Schema = ZikJobProfileMetadata[0];
    let key = encodeKeyName(standardLSP0Schema.name);

    expect(await contract['getData(bytes32)'](key)).to.be.equal(
      standardLSP0Schema.valueContent
    );

    const lsp3ProfileSchema = ZikJobProfileMetadata[1];
    key = encodeKeyName(lsp3ProfileSchema.name);
    let json = {
      LSP3Profile: {
        name: 'LSPProfileTest',
        description: 'Test set data',
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
    await contract['setData(bytes32,bytes)'](key, value);
    let dataProfileEncoded = await contract['getData(bytes32)'](key);
    expect(dataProfileEncoded).to.be.equal(value);

    const dataProfileDecoded = decodeKeyValue(
      lsp3ProfileSchema.valueContent,
      lsp3ProfileSchema.valueType,
      dataProfileEncoded
    );
    expect(dataProfileDecoded.url).to.be.equal(url);

    json = {
      LSP3Profile: {
        name: 'LSPProfileTest',
        description: 'Change description',
      },
    };
    value = encodeKeyValue(
      lsp3ProfileSchema.valueContent,
      lsp3ProfileSchema.valueType,
      {
        json,
        url,
      }
    );
    await contract['setData(bytes32,bytes)'](key, value);
    dataProfileEncoded = await contract['getData(bytes32)'](key);
    expect(dataProfileEncoded).to.be.equal(value);
  });
});
