const { ethers } = require('hardhat');
const { utils } = ethers;

const delay = (s) =>
  new Promise((resolve, _) => setTimeout(() => resolve(), s * 1000));
const toWei = (value) => utils.parseEther(value.toString());
const fromWei = (value) =>
  utils.formatEther(typeof value === 'string' ? value : value.toString());

async function main() {
  const zikPoolAddress = '';
  const zikAvatarAddress = '';
  const ZikPool = await ethers.getContractFactory('ZikPool');

  if (zikPoolAddress == '') {
    const SimpleToken = await ethers.getContractFactory('SimpleToken');
    const rewardToken = await SimpleToken.deploy('BUSD', 'BUSD');
    await rewardToken.deployed();
    console.log('SimpleToken (BUSD) deployed to:', rewardToken.address);

    const contract = await ZikPool.deploy(
      rewardToken.address,
      zikAvatarAddress
    );
    await contract.deployed();
    console.log('ZikPool deployed to:', contract.address);

    await rewardToken.transfer(contract.address, toWei(1500000));
  } else {
    const owner = await ethers.getSigner();
    const contract = ZikPool.attach(zikPoolAddress);
    const ZikAvatar = await ethers.getContractFactory('ZikAvatar');
    const zikAvatar = ZikAvatar.attach(zikAvatarAddress);

    for (let i = 0; i < 5; i++) {
      const infoAvatar = await zikAvatar.getInfoAvatar(i);
      console.log(
        `Avatar ${i}: profit(${infoAvatar[0]}) - feeReduction(${infoAvatar[1]})`
      );
    }

    // await zikAvatar.setApprovalForAll(contract.address, true);
    // await contract.connect(owner).stake([0, 1, 2, 3, 4]);
    // console.log('Stake tokenIds: 0, 1, 2, 3, 4');
    // delay(10);

    console.log(
      `Address ${owner.address} earned ${fromWei(
        await contract.connect(owner).earned(owner.address)
      )} BUSD`
    );
  }
}

main()
  .then(() => null)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
