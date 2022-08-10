const { expect } = require('chai');
const { ethers } = require('hardhat');
const { utils } = ethers;

const toWei = (value) => utils.parseEther(value.toString());

describe('ZikAvatar', async function () {
  let [owner, addr1, addr2, addr3] = [null, null, null, null];
  let contract, vrfCoordinatorV2Mock, busdContract;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();

    const SimpleToken = await ethers.getContractFactory('SimpleToken');
    busdContract = await SimpleToken.deploy('BUSD Token', 'BUSD');
    await busdContract.deployed();
    await busdContract.transfer(addr1.address, toWei(1000000));
    await busdContract.transfer(addr2.address, toWei(1000000));
    await busdContract.transfer(addr3.address, toWei(1000000));

    const VRFCoordinatorV2 = await ethers.getContractFactory(
      'VRFCoordinatorV2'
    );
    vrfCoordinatorV2Mock = await VRFCoordinatorV2.deploy(
      toWei(0.025),
      50000000000
    );
    await vrfCoordinatorV2Mock.deployed();

    const subscriptionId =
      await vrfCoordinatorV2Mock.callStatic.createSubscription();
    await vrfCoordinatorV2Mock.createSubscription();
    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, toWei(1000));

    const ZikAvatar = await ethers.getContractFactory('ZikAvatar');
    contract = await ZikAvatar.deploy(
      subscriptionId,
      'https://ipfs.zikjob.com',
      busdContract.address,
      vrfCoordinatorV2Mock.address,
      '0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314'
    );
    await contract.deployed();
  });

  it('Deployed ZikAvatar', async function () {
    expect(await contract.name()).to.equal('Zikkie Avatar');
    expect(await contract.symbol()).to.equal('ZJSA');
  });

  it('Mint Zik Avatar for Team', async function () {
    expect(await contract.balanceOf(owner.address)).to.be.equal(0);
    await contract.mintZikAvatarByOwner();
    expect(await contract.balanceOf(owner.address)).to.be.equal(210);
    await expect(contract.mintZikAvatarByOwner()).to.be.reverted;
  });

  it('Buy box failed', async function () {
    await expect(
      contract.connect(addr1).mintZikAvatar(0, { value: toWei(0.0001) })
    ).to.be.revertedWith('Invalid quantity');

    await expect(
      contract.connect(addr1).mintZikAvatar(1, { value: toWei(0.0009) })
    ).to.be.revertedWith('Not enough amount to buy');

    await expect(
      contract.connect(addr1).mintZikAvatar(5001, { value: toWei(5) })
    ).to.be.revertedWith('Reached the maximum number of avatars');
  });

  it('Buy box success', async function () {
    await contract.connect(addr1).mintZikAvatar(10, { value: toWei(0.1) });
    expect(await contract.balanceOf(addr1.address)).to.be.equal(10);
    await contract.connect(addr1).mintZikAvatar(100, { value: toWei(1) });
    expect(await contract.balanceOf(addr1.address)).to.be.equal(110);
    expect(await contract.getNumberOfAvatars()).to.be.equal(110);
  });

  it('Buy box with busd failed', async function () {
    await expect(
      contract.connect(addr1).mintZikAvatarWithBUSD(0)
    ).to.be.revertedWith('Invalid quantity');

    await expect(
      contract.connect(addr1).mintZikAvatarWithBUSD(1)
    ).to.be.revertedWith('ERC20: insufficient allowance');

    await busdContract.connect(addr1).approve(contract.address, toWei(125025));
    await expect(
      contract.connect(addr1).mintZikAvatarWithBUSD(5001)
    ).to.be.revertedWith('Reached the maximum number of avatars');
  });

  it('Buy box with busd success', async function () {
    await busdContract.connect(addr1).approve(contract.address, toWei(250));
    await contract.connect(addr1).mintZikAvatarWithBUSD(10);
    expect(await busdContract.balanceOf(contract.address)).to.be.equal(
      toWei(250)
    );
    expect(await contract.balanceOf(addr1.address)).to.be.equal(10);

    await busdContract.connect(addr1).approve(contract.address, toWei(2500));
    await contract.connect(addr1).mintZikAvatarWithBUSD(100);
    expect(await contract.balanceOf(addr1.address)).to.be.equal(110);
  });

  it('Add to pool', async function () {
    await contract.connect(addr1).mintZikAvatar(15, { value: toWei(0.15) });
    await contract.connect(addr2).mintZikAvatar(50, { value: toWei(0.5) });
    await contract.connect(addr1).mintZikAvatar(15, { value: toWei(0.15) });
    await contract.connect(addr3).mintZikAvatar(30, { value: toWei(0.3) });

    await contract.createNewPool();
    const currentPool = await contract.currentPool();

    await expect(contract.connect(addr1).addToPool([])).to.be.reverted;
    await expect(contract.connect(addr1).addToPool([0, 1, 20])).to.be.reverted;

    expect(
      (await contract.getTokenIdsByRequester(currentPool, addr1.address)).length
    ).to.be.equal(0);

    await contract.connect(addr1).addToPool([0, 1, 2]);

    expect(
      (await contract.getTokenIdsByRequester(currentPool, addr1.address)).length
    ).to.be.equal(3);

    await contract.connect(addr1).addToPool(
      Array(15)
        .fill(1)
        .map((_, idx) => idx)
    );
    await contract.connect(addr2).addToPool(
      Array(35)
        .fill(1)
        .map((_, idx) => idx + 15)
    );
    expect(
      (await contract.getTokenIdsByRequester(currentPool, addr1.address)).length
    ).to.be.equal(15);
    expect(
      (await contract.getTokenIdsByRequester(currentPool, addr2.address)).length
    ).to.be.equal(35);

    await expect(contract.connect(addr3).addToPool([80])).to.be.reverted;
  });

  it('Remove from pool', async function () {
    await contract.connect(addr1).mintZikAvatar(15, { value: toWei(0.15) });
    await contract.connect(addr2).mintZikAvatar(50, { value: toWei(0.5) });
    await contract.connect(addr1).mintZikAvatar(15, { value: toWei(0.15) });
    await contract.connect(addr3).mintZikAvatar(30, { value: toWei(0.3) });

    await contract.createNewPool();
    const currentPool = await contract.currentPool();

    expect(
      (await contract.getTokenIdsByRequester(currentPool, addr1.address)).length
    ).to.be.equal(0);

    await contract.connect(addr1).addToPool([0, 1, 2]);

    expect(
      (await contract.getTokenIdsByRequester(currentPool, addr1.address)).length
    ).to.be.equal(3);

    await contract.connect(addr1).removeFromPool();
    expect(
      (await contract.getTokenIdsByRequester(currentPool, addr1.address)).length
    ).to.be.equal(0);
  });

  it('Generate attribute', async function () {
    await contract.connect(addr1).mintZikAvatar(15, { value: toWei(0.15) });
    await contract.connect(addr2).mintZikAvatar(50, { value: toWei(0.5) });
    await contract.connect(addr1).mintZikAvatar(15, { value: toWei(0.15) });
    await contract.connect(addr3).mintZikAvatar(30, { value: toWei(0.3) });

    await contract.createNewPool();
    await contract.connect(addr1).addToPool(
      Array(15)
        .fill(1)
        .map((_, idx) => idx)
    );
    await contract.connect(addr2).addToPool(
      Array(35)
        .fill(1)
        .map((_, idx) => idx + 15)
    );

    let infoAvatar0 = await contract.getInfoAvatar(0);
    expect(infoAvatar0[0]).to.be.equal(0);
    expect(infoAvatar0[1]).to.be.equal(0);

    let requestId = await contract.callStatic.requestZikAttribute();
    await contract.requestZikAttribute();
    await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, contract.address);
    await contract.generateAttribute();

    infoAvatar0 = await contract.getInfoAvatar(0);
    expect(infoAvatar0[0]).to.be.not.equal(0);
    expect(infoAvatar0[1]).to.be.not.equal(0);

    await contract.createNewPool();
    await contract.connect(addr1).addToPool(
      Array(10)
        .fill(1)
        .map((_, idx) => idx + 65)
    );
    await contract.connect(addr3).addToPool(
      Array(20)
        .fill(1)
        .map((_, idx) => idx + 85)
    );

    let infoAvatar65 = await contract.getInfoAvatar(65);
    expect(infoAvatar65[0]).to.be.equal(0);
    expect(infoAvatar65[1]).to.be.equal(0);

    requestId = await contract.callStatic.requestZikAttribute();
    await contract.requestZikAttribute();
    await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, contract.address);
    await contract.generateAttribute();

    infoAvatar65 = await contract.getInfoAvatar(65);
    expect(infoAvatar65[0]).to.be.not.equal(0);
    expect(infoAvatar65[1]).to.be.not.equal(0);
  });

  it('Withdraw ether', async function () {
    await contract.connect(addr1).mintZikAvatar(5, { value: toWei(0.05) });
    expect(await ethers.provider.getBalance(contract.address)).to.be.equal(
      toWei(0.05)
    );

    await contract.withdraw();
    expect(await ethers.provider.getBalance(contract.address)).to.be.equal(
      toWei(0)
    );
    await expect(contract.withdraw()).to.be.reverted;
  });

  it('Withdraw busd', async function () {
    await busdContract.connect(addr1).approve(contract.address, toWei(250));
    await contract.connect(addr1).mintZikAvatarWithBUSD(10);
    expect(await busdContract.balanceOf(contract.address)).to.be.equal(
      toWei(250)
    );

    await contract.withdrawBUSD();
    expect(await busdContract.balanceOf(contract.address)).to.be.equal(
      toWei(0)
    );
    await expect(contract.withdrawBUSD()).to.be.reverted;
  });
});
