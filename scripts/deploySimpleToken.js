const { ethers } = require('hardhat');

async function main() {
  const SimpleToken = await ethers.getContractFactory('SimpleToken');
  const simpleToken = await SimpleToken.deploy(
    'ZToken',
    'ZT',
  );

  await simpleToken.deployed();

  console.log('SimpleToken deployed to:', simpleToken.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
