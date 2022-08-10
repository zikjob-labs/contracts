const { expect } = require('chai');
const { ethers, network } = require('hardhat');
const { utils } = ethers;

const toWei = (value) => utils.parseEther(value.toString());
const fromWei = (value) =>
  utils.formatEther(typeof value === 'string' ? value : value.toString());
const getGasFeeFromTx = async (tx) => {
  if (tx && typeof tx.wait === 'function') {
    const { gasUsed, effectiveGasPrice } = await tx.wait();
    return gasUsed.mul(effectiveGasPrice);
  }

  return ethers.BigNumber.from(0);
};

describe.only('ZikPool', async function () {
  let [owner, addr1, addr2] = [null, null, null];
  let contract, stakingToken, rewardToken;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    const SimpleToken = await ethers.getContractFactory('SimpleToken');
    rewardToken = await SimpleToken.deploy('BUSD', 'BUSD');
    await rewardToken.deployed();

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
    stakingToken = await ZikAvatar.deploy(
      subscriptionId,
      'https://ipfs.zikjob.com',
      rewardToken.address,
      vrfCoordinatorV2Mock.address,
      '0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314'
    );
    await stakingToken.deployed();
    await stakingToken.connect(addr1).mintZikAvatar(20, { value: toWei(0.2) });
    await stakingToken.connect(addr2).mintZikAvatar(50, { value: toWei(0.5) });

    await stakingToken.createNewPool();
    await stakingToken.connect(addr1).addToPool(
      Array(10)
        .fill(1)
        .map((_, idx) => idx)
    );
    await stakingToken.connect(addr2).addToPool(
      Array(10)
        .fill(1)
        .map((_, idx) => idx + 20)
    );
    let requestId = await stakingToken.callStatic.requestZikAttribute();
    await stakingToken.requestZikAttribute();
    await vrfCoordinatorV2Mock.fulfillRandomWords(
      requestId,
      stakingToken.address
    );
    await stakingToken.generateAttribute();

    const ZikPool = await ethers.getContractFactory('ZikPool');
    contract = await ZikPool.deploy(rewardToken.address, stakingToken.address);
    await contract.deployed();
    await rewardToken.transfer(contract.address, toWei(1500000));
  });

  it('Deployed ZikPool', async function () {
    expect(await contract.stakingToken()).to.be.equal(stakingToken.address);
    expect(await contract.rewardsToken()).to.be.equal(rewardToken.address);
    expect(await contract.totalStaked()).to.be.equal(0);
    expect(await rewardToken.balanceOf(contract.address)).to.be.equal(
      toWei(1500000)
    );
  });

  it('Stake', async function () {
    await stakingToken.connect(addr1).setApprovalForAll(contract.address, true);
    await contract.connect(addr1).stake([1, 2, 3]);
    await expect(contract.connect(addr1).stake([1, 4, 5])).to.be.revertedWith(
      'Token id has been staked'
    );
    let addr1Stake = await contract.userStakeDetail(addr1.address);

    expect(await contract.totalStaked()).to.be.equal(3);
    expect(addr1Stake.reward).to.be.equal(0);
    expect(await contract.getBalance(addr1.address)).to.be.equal(toWei(75));

    let profit = new ethers.BigNumber.from(0);
    for (let i = 1; i < 4; i++) {
      const infoAvatar = await stakingToken.getInfoAvatar(i);
      profit = profit.add(infoAvatar[0]);
    }
    expect(await contract.getProfitBonus(addr1.address)).to.be.equal(
      profit.div(3)
    );

    await contract.connect(addr1).stake([4, 5]);
    addr1Stake = await contract.userStakeDetail(addr1.address);

    expect(await contract.totalStaked()).to.be.equal(5);
    expect(addr1Stake.reward).to.be.gte(0);

    for (let i = 4; i < 6; i++) {
      const infoAvatar = await stakingToken.getInfoAvatar(i);
      profit = profit.add(infoAvatar[0]);
    }
    expect(await contract.getProfitBonus(addr1.address)).to.be.equal(
      profit.div(5)
    );

    await network.provider.send('evm_increaseTime', [608400]); // Move to next 7 days 1 hour
    await network.provider.send('evm_mine');
    await expect(contract.connect(addr1).stake([6, 7])).to.be.revertedWith(
      'Pool is ended'
    );

    // 5 NFT + 10% APR + % bonus ~ 7days
    expect(await contract.earned(addr1.address)).to.be.gte(
      toWei(125)
        .mul(profit.div(5).add(1000))
        .mul(604500)
        .div(31556926)
        .div(10000)
    );
  });

  it('Claim', async function () {
    await stakingToken.connect(addr1).setApprovalForAll(contract.address, true);
    await stakingToken.connect(addr2).setApprovalForAll(contract.address, true);
    await contract.connect(addr1).stake([0, 1, 2, 3, 4]);
    await contract.connect(addr2).stake([20, 21, 22]);

    await network.provider.send('evm_increaseTime', [3600]); // Move to next one hour
    await network.provider.send('evm_mine');

    const addr1EarnedAfter3500s = toWei(125)
      .mul((await contract.getProfitBonus(addr1.address)).add(1000))
      .mul(3500)
      .div(31556926)
      .div(10000);
    expect(await contract.earned(addr1.address)).to.be.gte(
      addr1EarnedAfter3500s
    );
    await contract.connect(addr1).claim();
    expect(await contract.earned(addr1.address)).to.be.equal(0);
    expect(await rewardToken.balanceOf(addr1.address)).to.be.gte(
      addr1EarnedAfter3500s
    );

    await network.provider.send('evm_increaseTime', [608400]); // Move to next 7 days 1 hour
    await network.provider.send('evm_mine');

    const addr1EarnedAfter6d22h = toWei(125)
      .mul((await contract.getProfitBonus(addr1.address)).add(1000))
      .mul(597600)
      .div(31556926)
      .div(10000);
    expect(await contract.earned(addr1.address)).to.be.gte(
      addr1EarnedAfter6d22h
    );
    await contract.connect(addr1).claim();
    expect(await rewardToken.balanceOf(addr1.address)).to.be.gte(
      addr1EarnedAfter6d22h.add(addr1EarnedAfter3500s)
    );

    const addr2EarnedAfter6d23h = toWei(75)
      .mul((await contract.getProfitBonus(addr2.address)).add(1000))
      .mul(601200)
      .div(31556926)
      .div(10000);
    expect(await contract.earned(addr2.address)).to.be.gte(
      addr2EarnedAfter6d23h
    );
    await contract.connect(addr2).claim();
    expect(await rewardToken.balanceOf(addr2.address)).to.be.gte(
      addr2EarnedAfter6d23h
    );
  });

  it('UnStake', async function () {
    await stakingToken.connect(addr1).setApprovalForAll(contract.address, true);
    await contract.connect(addr1).stake([0, 1, 2, 3, 4]);

    expect(await contract.totalStaked()).to.be.equal(5);

    await network.provider.send('evm_increaseTime', [3600]); // Move to next one hour
    await network.provider.send('evm_mine');

    const earnedBeforeHour = toWei(125)
      .mul((await contract.getProfitBonus(addr1.address)).add(1000))
      .mul(3540)
      .div(31556926)
      .div(10000);
    const earnedAfterHour = toWei(125)
      .mul((await contract.getProfitBonus(addr1.address)).add(1000))
      .mul(3660)
      .div(31556926)
      .div(10000);

    await contract.connect(addr1).unStake();

    expect(await contract.totalStaked()).to.be.equal(0);
    expect(await contract.earned(addr1.address))
      .to.be.gte(earnedBeforeHour)
      .to.be.lte(earnedAfterHour);

    await network.provider.send('evm_increaseTime', [3600]); // Move to next one hour
    await network.provider.send('evm_mine');

    expect(await contract.earned(addr1.address))
      .to.be.gte(earnedBeforeHour)
      .to.be.lte(earnedAfterHour);

    await expect(contract.connect(addr1).unStake()).to.be.revertedWith(
      'You do not staked'
    );

    await contract.connect(addr1).claim();
    expect(await rewardToken.balanceOf(addr1.address))
      .to.be.gte(earnedBeforeHour)
      .to.be.lte(earnedAfterHour);
  });

  it('WithdrawRewardUnused', async function () {
    await expect(contract.withdrawRewardUnused()).to.be.revertedWith(
      'Pool is not ended'
    );

    await network.provider.send('evm_increaseTime', [608400]); // Move to next 7 days 1 hour
    await network.provider.send('evm_mine');

    await contract.withdrawRewardUnused();
    expect(await rewardToken.balanceOf(owner.address)).to.be.equal(
      toWei(500000000)
    );
    expect(await rewardToken.balanceOf(contract.address)).to.be.equal(0);
    await expect(contract.withdrawRewardUnused()).to.be.revertedWith(
      'No token unused'
    );
  });
});
