// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "../interfaces/IZikAvatar.sol";

contract ZikAvatar is IZikAvatar, ERC721, VRFConsumerBaseV2, Ownable {
    using Strings for string;

    VRFCoordinatorV2Interface COORDINATOR;
    IERC20 BUSD;
    string _baseTokenURI;

    // Your subscription ID.
    uint64 subscriptionId;

    // BSC Testnet coordinator. For other networks,
    // see https://docs.chain.link/docs/vrf-contracts/#configurations
    // address vrfCoordinator = 0x6A2AAd07396B36Fe02a22b33cf443582f682c82f;

    // The gas lane to use, which specifies the maximum gas price to bump to.
    // For a list of available gas lanes on each network,
    // see https://docs.chain.link/docs/vrf-contracts/#configurations
    // bytes32 keyHash =
    //     0xd4bb89654db74673a187bd804519e65e3f71a52bc55f11da7601a13dcf505314;
    bytes32 keyHash;

    uint32 callbackGasLimit = 1500000;

    // The default is 3, but you can set this higher.
    uint16 requestConfirmations = 3;

    uint256 public currentPool = 0;
    uint256 public immutable BNB_PRICE = 0.001 ether;
    uint256 public immutable BUSD_PRICE = 25 ether;
    uint256 public immutable MAX_AVATARS = 5000;

    uint256 public totalCommon = 0;
    uint256 public totalRare = 0;
    uint256 public totalEpic = 0;
    uint256 public totalLegendary = 0;

    struct Avatar {
        uint256 profit;
        uint256 feeReduction;
    }

    struct Pool {
        uint256 quantity;
        address[] requester;
        mapping(address => bool) isAdded;
        mapping(address => uint256[]) requesterToTokenIds;
    }

    Avatar[] private avatars;

    mapping(uint256 => Pool) pools;
    mapping(uint256 => bool) public poolIdIsUsed;
    mapping(uint256 => uint256[]) public poolIdToRandomWords;
    mapping(uint256 => bool) public isGeneratedAttribute;

    constructor(
        uint64 _subscriptionId,
        string memory tokenURI,
        address _busd,
        address _vrfCoordinator,
        bytes32 _keyHash
    ) VRFConsumerBaseV2(_vrfCoordinator) ERC721("Zikkie Avatar", "ZJSA") {
        COORDINATOR = VRFCoordinatorV2Interface(_vrfCoordinator);
        BUSD = IERC20(_busd);
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        _baseTokenURI = tokenURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function getTokenURI(uint256 tokenId) public view returns (string memory) {
        return tokenURI(tokenId);
    }

    function setTokenURI(uint256 tokenId, string memory _tokenURI) public {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721: transfer caller is not owner nor approved"
        );
        _baseTokenURI = _tokenURI;
    }

    function safeMint(uint32 quantity) internal {
        uint256 newTokenId;
        for (uint i = 0; i < quantity; i++) {
            newTokenId = avatars.length;
            avatars.push(Avatar(0, 0));
            _safeMint(_msgSender(), newTokenId);
        }
    }

    function mintZikAvatarByOwner() external onlyOwner {
        require(balanceOf(owner()) == 0);

        uint32 quantity = 210;
        safeMint(quantity);
        emit NFTMinted(owner(), quantity);
    }

    function mintZikAvatar(uint32 quantity) external override payable {
        require(quantity > 0, "Invalid quantity");
        require(
            avatars.length + quantity <= MAX_AVATARS,
            "Reached the maximum number of avatars"
        );
        require(msg.value >= quantity * BNB_PRICE, "Not enough amount to buy");

        safeMint(quantity);
        emit NFTMinted(owner(), quantity);
    }

    function mintZikAvatarWithBUSD(uint32 quantity) external override {
        require(quantity > 0, "Invalid quantity");
        require(
            avatars.length + quantity <= MAX_AVATARS,
            "Reached the maximum number of avatars"
        );
        require(
            BUSD.transferFrom(msg.sender, address(this), quantity * BUSD_PRICE)
        );

        safeMint(quantity);
        emit NFTMinted(owner(), quantity);
    }

    function addToPool(uint256[] memory tokenIds) external override {
        require(tokenIds.length > 0);
        require(
            pools[currentPool].quantity + tokenIds.length <= 50,
            "Exceed number of avatar"
        );
        bool isValidTokenId = true;
        for (uint i = 0; i < tokenIds.length; i++) {
            if (
                !_isApprovedOrOwner(_msgSender(), tokenIds[i]) ||
                isGeneratedAttribute[tokenIds[i]]
            ) {
                isValidTokenId = false;
                break;
            }
        }
        require(isValidTokenId, "Token ID not valid!");

        if (!pools[currentPool].isAdded[_msgSender()]) {
            pools[currentPool].requester.push(_msgSender());
            pools[currentPool].isAdded[_msgSender()] = true;
        }

        pools[currentPool].quantity =
            pools[currentPool].quantity -
            pools[currentPool].requesterToTokenIds[_msgSender()].length +
            tokenIds.length;
        pools[currentPool].requesterToTokenIds[_msgSender()] = tokenIds;
    }

    function removeFromPool() external override {
        pools[currentPool].quantity -= pools[currentPool]
            .requesterToTokenIds[_msgSender()]
            .length;
        delete pools[currentPool].requesterToTokenIds[_msgSender()];
    }

    function createNewPool() external onlyOwner {
        Pool storage pool = pools[++currentPool];
        pool.requester = new address[](0);
    }

    function requestZikAttribute() external onlyOwner returns (uint256) {
        require(!poolIdIsUsed[currentPool]);
        uint32 quantity = uint32(pools[currentPool].quantity);
        uint256 requestId = COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            quantity
        );
        emit NFTRequested(requestId, quantity);

        return requestId;
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords)
        internal
        override
    {
        poolIdToRandomWords[currentPool] = randomWords;
        poolIdIsUsed[currentPool] = false;
        emit NFTFullfilled(requestId, randomWords);
    }

    function generateAttribute() external onlyOwner {
        require(!poolIdIsUsed[currentPool]);

        uint256[] memory randomWords = poolIdToRandomWords[currentPool];
        uint256[] memory tokenIds = new uint256[](randomWords.length);
        uint t = 0;
        address[] memory requesters = pools[currentPool].requester;
        for (uint i = 0; i < requesters.length; i++) {
            address requester = requesters[i];
            uint256[] memory requesterToTokenIds = pools[currentPool]
                .requesterToTokenIds[requester];

            for (uint j = 0; j < requesterToTokenIds.length; j++) {
                uint256 tokenId = requesterToTokenIds[j];
                tokenIds[t++] = tokenId;
                isGeneratedAttribute[tokenId] = true;
            }
        }

        for (uint i = 0; i < randomWords.length; i++) {
            uint256 randomNumber = randomWords[i];
            uint256 rare = randomNumber % 14;
            uint256 profit = ((randomNumber % 400) / 100);
            uint256 feeReduction = ((randomNumber % 80) / 10);
            bool pass = false;

            // Legendary
            if (rare == 13) {
                if (totalLegendary < 50) {
                    profit += 15;
                    feeReduction += 43;
                    totalLegendary++;
                } else {
                    pass = true;
                }
            }

            // Epic
            if (pass || rare == 12) {
                if (totalEpic < 350) {
                    profit += 10;
                    feeReduction += 32;
                    totalEpic++;
                    pass = false;
                } else {
                    pass = true;
                }
            }

            // Rare
            if (pass || (rare >= 9 && rare < 12)) {
                if (totalRare < 1150) {
                    profit += 5;
                    feeReduction += 21;
                    totalRare++;
                    pass = false;
                } else {
                    pass = true;
                }
            }

            // Common
            if (pass || rare < 9) {
                feeReduction += 10;
                totalCommon++;
            }

            Avatar storage avatar = avatars[tokenIds[i]];
            avatar.profit = profit * 100; // support xx.yy %
            avatar.feeReduction = feeReduction * 100; // support xx.yy %
        }
        poolIdIsUsed[currentPool] = true;
    }

    function withdraw() external payable onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0);
        (bool success, ) = (_msgSender()).call{value: balance}("");
        require(success);
    }

    function withdrawBUSD() external payable onlyOwner {
        uint256 balance = BUSD.balanceOf(address(this));
        require(balance > 0);
        require(BUSD.transfer(_msgSender(), balance));
    }

    function getNumberOfAvatars() public view override returns (uint256) {
        return avatars.length;
    }

    function getInfoAvatar(uint256 tokenId)
        public
        view
        override
        returns (uint256, uint256)
    {
        return (avatars[tokenId].profit, avatars[tokenId].feeReduction);
    }

    function getRequesterOfPool(uint256 poolId)
        public
        view
        returns (address[] memory)
    {
        return pools[poolId].requester;
    }

    function getTokenIdsByRequester(uint256 poolId, address requester)
        public
        view
        returns (uint256[] memory)
    {
        return pools[poolId].requesterToTokenIds[requester];
    }
}
