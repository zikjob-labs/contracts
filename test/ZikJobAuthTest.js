const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('ZikJobAuth', async function () {
  let [owner, addr1, addr2] = [null, null, null];
  let contract;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const ZikJobAuth = await ethers.getContractFactory('ZikJobAuth');
    contract = await ZikJobAuth.deploy();
    await contract.deployed();
  });

  it('Deploy ZikJobAuth', async function () {
    expect(contract).to.be.not.null;
  });

  it('Create Zikkie', async function () {
    const zikkieAddr = await contract.callStatic.createZikkie();
    await contract.createZikkie();
    expect(await contract.userToZikkie(owner.address)).to.be.equal(zikkieAddr);

    const Zikkie = await ethers.getContractFactory('Zikkie');
    const zikkieContract = Zikkie.attach(zikkieAddr);
    expect(await zikkieContract.owner()).to.be.equal(owner.address);
  });
});
