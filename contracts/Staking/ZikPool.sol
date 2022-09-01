// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/interfaces/IERC20.sol';
import '@openzeppelin/contracts/interfaces/IERC721Receiver.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '../interfaces/IZikAvatar.sol';

contract ZikPool is IERC721Receiver, Ownable {
    IERC20 public immutable rewardsToken;
    IZikAvatar public immutable stakingToken;

    uint256 public basePriceAvatar = 25 ether; // BUSD
    uint256 public apr = 1000; // 10.00%
    uint256 public endAt;
    uint256 public totalStaked;
    uint256 public totalStakeUsers;
    uint256 public totalEarned;

    struct UserStake {
        uint256[] tokenIds;
        uint256 reward;
        uint256 lastTimeUpdate;
    }

    mapping(address => UserStake) stakeUsers;
    mapping(uint256 => bool) tokenIdIsStaked;

    event Staked(address indexed user, uint256[] tokenIds);
    event Unstaked(address indexed user, uint256[] tokenIds);
    event Claimed(address indexed user, uint256 reward);

    constructor(
        address rewardsToken_,
        address stakingToken_,
        uint32 duration
    ) {
        require(rewardsToken_ != address(0), 'Invalid rewardsToken address');
        require(stakingToken_ != address(0), 'Invalid stakingToken address');

        rewardsToken = IERC20(rewardsToken_);
        stakingToken = IZikAvatar(stakingToken_);
        endAt = block.timestamp + (duration * 1 days);
    }

    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < endAt ? block.timestamp : endAt;
    }

    function getBalance(address user) public view returns (uint256) {
        UserStake memory userStake = stakeUsers[user];
        return userStake.tokenIds.length * basePriceAvatar;
    }

    function getProfitBonus(address user) public view returns (uint256) {
        UserStake memory userStake = stakeUsers[user];
        if (userStake.tokenIds.length == 0) return 0;

        uint256 profitBonus = 0;
        for (uint256 i = 0; i < userStake.tokenIds.length; i++) {
            (uint256 profit, ) = stakingToken.getInfoAvatar(
                userStake.tokenIds[i]
            );
            profitBonus += profit;
        }

        return profitBonus / userStake.tokenIds.length;
    }

    function earned(address user) public view returns (uint256) {
        UserStake memory userStake = stakeUsers[user];
        return
            ((getBalance(user) *
                (apr + getProfitBonus(user)) *
                (lastTimeRewardApplicable() - userStake.lastTimeUpdate)) /
                (10000 * 365 days)) + userStake.reward;
    }

    function userStakeDetail(address user)
        external
        view
        returns (UserStake memory)
    {
        UserStake memory userStake = stakeUsers[user];
        return userStake;
    }

    function stake(uint256[] memory tokenIds)
        external
        updateReward(msg.sender)
    {
        require(endAt > block.timestamp, 'Pool is ended');
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(!tokenIdIsStaked[tokenIds[i]], 'Token id has been staked');
            stakingToken.safeTransferFrom(
                msg.sender,
                address(this),
                tokenIds[i]
            );
            tokenIdIsStaked[tokenIds[i]] = true;
        }

        UserStake storage userStake = stakeUsers[msg.sender];
        if (userStake.tokenIds.length == 0) {
            totalStakeUsers++;
        }

        uint256[] memory newTokenIds = new uint256[](
            tokenIds.length + userStake.tokenIds.length
        );

        for (uint256 i = 0; i < userStake.tokenIds.length; i++) {
            newTokenIds[i] = userStake.tokenIds[i];
        }

        for (uint256 i = 0; i < tokenIds.length; i++) {
            newTokenIds[userStake.tokenIds.length + i] = tokenIds[i];
        }

        totalStaked =
            totalStaked -
            userStake.tokenIds.length +
            newTokenIds.length;
        userStake.tokenIds = newTokenIds;
        emit Staked(msg.sender, tokenIds);
    }

    function unStake() external updateReward(msg.sender) {
        UserStake storage userStake = stakeUsers[msg.sender];
        uint256[] memory tokenIds = userStake.tokenIds;
        require(tokenIds.length > 0, 'You do not staked');
        for (uint256 i = 0; i < tokenIds.length; i++) {
            stakingToken.safeTransferFrom(
                address(this),
                msg.sender,
                tokenIds[i]
            );
            tokenIdIsStaked[tokenIds[i]] = false;
        }
        totalStaked -= tokenIds.length;
        totalStakeUsers--;
        delete userStake.tokenIds;
        emit Unstaked(msg.sender, tokenIds);
    }

    function claim() public updateReward(msg.sender) {
        UserStake storage userStake = stakeUsers[msg.sender];
        require(userStake.reward > 0, 'No more for claim');
        uint256 userEarned = userStake.reward;
        userStake.reward = 0;
        totalEarned += userEarned;
        require(rewardsToken.transfer(msg.sender, userEarned));
        emit Claimed(msg.sender, userEarned);
    }

    function withdrawRewardUnused() external onlyOwner {
        require(endAt < block.timestamp, 'Pool is not ended');
        require(rewardsToken.balanceOf(address(this)) > 0, 'No token unused');
        require(
            rewardsToken.transfer(
                owner(),
                rewardsToken.balanceOf(address(this))
            )
        );
    }

    modifier updateReward(address user) {
        UserStake storage userStake = stakeUsers[user];
        if (userStake.lastTimeUpdate == 0) {
            userStake.lastTimeUpdate = block.timestamp;
        }
        userStake.reward = earned(user);
        userStake.lastTimeUpdate = lastTimeRewardApplicable();
        _;
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return
            bytes4(
                keccak256('onERC721Received(address,address,uint256,bytes)')
            );
    }
}
