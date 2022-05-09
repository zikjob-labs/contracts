// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ILSP0 {
    // ERC173
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    function owner() external view returns (address);

    function transferOwnership(address newOwner) external; // onlyOwner

    function renounceOwnership() external; // onlyOwner

    // ERC1271
    function isValidSignature(bytes32 _hash, bytes memory _signature)
        external
        view
        returns (bytes4 magicValue);

    // ERC725X
    event Executed(
        uint256 indexed _operation,
        address indexed _to,
        uint256 indexed _value,
        bytes4 _selector
    );

    event ContractCreated(
        uint256 indexed _operation,
        address indexed contractAddress,
        uint256 indexed _value
    );

    function execute(
        uint256 operationType,
        address to,
        uint256 value,
        bytes memory data
    ) external payable returns (bytes memory); // onlyOwner

    // ERC725Y
    event DataChanged(bytes32 indexed dataKey, bytes value);

    function getData(bytes32 dataKey)
        external
        view
        returns (bytes memory value);

    function setData(bytes32 dataKey, bytes memory value) external; // onlyOwner

    function getData(bytes32[] memory dataKeys)
        external
        view
        returns (bytes[] memory values);

    function setData(bytes32[] memory dataKeys, bytes[] memory values) external; // onlyOwner

    // LSP0 (ERC725Account)
    event ValueReceived(address indexed sender, uint256 indexed value);

    // LSP1
    event UniversalReceiver(
        address indexed from,
        bytes32 indexed typeId,
        bytes indexed returnedValue,
        bytes receivedData
    );

    function universalReceiver(bytes32 typeId, bytes memory data)
        external
        returns (bytes memory);
}
