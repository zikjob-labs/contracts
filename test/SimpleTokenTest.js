const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('SimpleToken', async function () {
  let [owner, addr1, addr2] = [null, null, null];
  let simpleToken;

  beforeEach(async function() {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const SimpleToken = await ethers.getContractFactory('SimpleToken');
    simpleToken = await SimpleToken.deploy('TestToken', 'TT1');
    await simpleToken.deployed();
  });

  it('Deploy SimpleToken', async function () {
    const ownerBalance = await simpleToken.balanceOf(owner.address);
    expect(await simpleToken.totalSupply()).to.equal(ownerBalance);
  });

  it('Should transfer between accounts', async function () {
    const balanceOwner = await simpleToken.balanceOf(owner.address);
    await simpleToken.transfer(addr1.address, 100);
    expect(await simpleToken.balanceOf(owner.address)).to.equal(balanceOwner.sub(100));
    expect(await simpleToken.balanceOf(addr1.address)).to.equal(100);

    simpleToken = await simpleToken.connect(addr1);
    await simpleToken.transfer(addr2.address, 50);
    expect(await simpleToken.balanceOf(addr1.address)).to.equal(50);
    expect(await simpleToken.balanceOf(addr2.address)).to.equal(50);
  });
});
