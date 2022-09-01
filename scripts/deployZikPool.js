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
    const duration = 30;
    const contract = await ZikPool.deploy(
      '0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee', // BUSD Contract Testnet
      zikAvatarAddress,
      duration
    );
    await contract.deployed();
    console.log('ZikPool deployed to:', contract.address);
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
