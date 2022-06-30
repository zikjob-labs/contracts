// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@erc725/smart-contracts/contracts/custom/OwnableUnset.sol";
import "./ZikJobAccount.sol";

contract ZikJobEmployer is ZikJobAccount {
    /**
     * @notice Sets the owner of the contract and sets the SupportedStandards key
     * @param _newOwner the owner of the contract
     */
    constructor(address _newOwner) {
        OwnableUnset._setOwner(_newOwner);

        bytes memory value;
        // set SupportedStandards:LSP3UniversalProfile
        value = hex"abe425d6";
        _setData(_LSP3_STANDARD_UNIVERSAL_PROFILE_KEY, value);
    }
}
