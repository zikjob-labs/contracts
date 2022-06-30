const { ethers } = require('hardhat');

async function main() {
  const ZikJobAuth = await ethers.getContractFactory('ZikJobAuth');
  const zikjobAuthContract = await ZikJobAuth.deploy();
  await zikjobAuthContract.deployed();
  console.log('ZikJobAuth deployed to:', zikjobAuthContract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
