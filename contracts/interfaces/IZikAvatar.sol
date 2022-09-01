// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/interfaces/IERC721.sol";

interface IZikAvatar is IERC721 {
    event NFTMinted(address indexed minter, uint32 indexed quantity);
    event NFTRequested(uint256 indexed requestId, uint32 indexed quantity);
    event NFTFulfilled(
        uint256 indexed requestId,
        uint256[] indexed randomWords
    );

    function mintZikAvatar(uint32 quantity) external payable;

    function mintZikAvatarWithBUSD(uint32 quantity) external;

    function addToPool(uint256[] memory tokenIds) external;

    function removeFromPool() external;

    function getNumberOfAvatars() external view returns (uint256);

    function getInfoAvatar(uint256 tokenId)
        external
        view
        returns (uint256, uint256);
}
