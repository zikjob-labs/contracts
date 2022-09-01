const { ethers } = require('hardhat');
const { utils } = ethers;

const delay = (s) =>
  new Promise((resolve, _) => setTimeout(() => resolve(), s * 1000));
const toWei = (value) => utils.parseEther(value.toString());

const tokenURI = 'https://ipfs.zikjob.com/ipfs/QmSVTx8GPu9XijjJt6f152cBBHjkNtKvY7tbayKMxMmsDM/';

async function main() {
  let deployedContract;
  const deployedAddress = '';
  const ZikAvatar = await ethers.getContractFactory('ZikAvatar');
  if (deployedAddress == '') {
    // BSC Testnet
    deployedContract = await ZikAvatar.deploy(
      1251,
      tokenURI,
      '0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee', // BUSD Contract
      '0x6A2AAd07396B36Fe02a22b33cf443582f682c82f', // VRF Coordinator
      '0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314' // Key Hash
    );

    // BSC Mainnet
    // deployedContract = await ZikAvatar.deploy(
    //   436,
    //   tokenURI,
    //   '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', // BUSD Contract
    //   '0xc587d9053cd1118f25F645F9E08BB98c9712A4EE', // VRF Coordinator
    //   '0x114f3da0a805b6a67d6e9cd2ec746f7028f1b7376365af575cfea3550dd1aa04' // Key Hash
    // );

    await deployedContract.deployed();
    console.log('ZikAvatar Contract deployed to:', deployedContract.address);
  } else {
    deployedContract = ZikAvatar.attach(deployedAddress);

    deployedContract.on('NFTMinted', async (minter, quantity) => {
      console.log(`Minter (${minter}) minted (${quantity}) Zik Avatar.`);
    });

    deployedContract.on('NFTRequested', async (requestId, quantity) => {
      console.log(`RequestId (${requestId}) with ${quantity} random number`);
    });

    deployedContract.on('NFTFulfilled', async (requestId, randomWords) => {
      console.log(`RequestId (${requestId}) get random number`);
      console.log(randomWords);
    });

    deployedContract.on('Transfer', async (_1, _2, tokenId) => {
      const tokenURI = await deployedContract.getTokenURI(tokenId);
      console.log(`TokenId (${tokenId}) generated - tokenURI (${tokenURI})`);
      // const avatarGenerated = await deployedContract.getInfoAvatar(tokenId);
      // console.log(avatarGenerated);
    });

    // Mint NFT for ZikTeam
    // await deployedContract.mintZikAvatarByOwner(20);
    // console.log('Mint ZikAvatar for ZikTeam done!');

    await deployedContract.mintZikAvatar(30, { value: toWei(0.03) });
    await delay(10);

    await deployedContract.createNewPool();
    await delay(30);
    console.log('Pool created');

    await deployedContract.addToPool(
      Array(30)
        .fill(1)
        .map((_, idx) => idx)
    );
    await delay(30);
    console.log('Add to pool success');

    currentPool = await deployedContract.currentPool();
    console.log(`--Pool ${currentPool}--`);

    const requesters = await deployedContract.getRequesterOfPool(currentPool);
    console.log(`Requester: ${requesters}`);
    for (let i = 0; i < requesters.length; i++) {
      const requester = requesters[i];
      console.log(
        `Requester (${requester}) with tokenIds: ${await deployedContract.getTokenIdsByRequester(
          currentPool,
          requester
        )}`
      );
    }

    let infoAvatar = await deployedContract.getInfoAvatar(0);
    console.log(`Avatar: ${infoAvatar}`);

    await deployedContract.requestZikAttribute();
    console.log('Call request ZikAttribute');
    await delay(60);
    // Wait for full filled
    await deployedContract.generateAttribute();
    await delay(10);

    infoAvatar = await deployedContract.getInfoAvatar(0);
    console.log(`Avatar: ${infoAvatar}`);
  }
}

main()
  .then(() => null)
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
