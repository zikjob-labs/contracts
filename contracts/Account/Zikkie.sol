// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@erc725/smart-contracts/contracts/ERC725.sol";
import "./ZikJobAccount.sol";

contract Zikkie is ZikJobAccount, ERC725 {
    /**
     * @notice Sets the owner of the contract and sets the SupportedStandards key
     * @param _newOwner the owner of the contract
     */
    constructor(address _newOwner) ERC725(_newOwner) {
        bytes memory value;
        // set SupportedStandards:LSP3UniversalProfile
        value = hex"abe425d6";
        _setData(_LSP3_STANDARD_UNIVERSAL_PROFILE_KEY, value);
        // set SupportedStandards:ZikJobProfile
        value = hex"b5bea950";
        _setData(_STANDARD_ZIKJOB_PROFILE_KEY, value);
    }
}
