const { ethers } = require('hardhat');

async function main() {
  const zikjobAuthAddr = '';
  if (zikjobAuthAddr != '') {
    const owner = await ethers.getSigner();
    const ZikJobAuth = await ethers.getContractFactory('ZikJobAuth');
    const zikjobAuthContract = ZikJobAuth.attach(zikjobAuthAddr);
    const zikkieAddr = await zikjobAuthContract.callStatic.createZikkie();
    await zikjobAuthContract.createZikkie();
    console.log(`${owner.address} with ZikJob Profile ${zikkieAddr}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
