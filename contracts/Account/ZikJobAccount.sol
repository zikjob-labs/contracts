// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/interfaces/IERC1271.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "@erc725/smart-contracts/contracts/ERC725XCore.sol";
import "@erc725/smart-contracts/contracts/ERC725YCore.sol";
import "@lukso/lsp-smart-contracts/contracts/LSP1UniversalReceiver/ILSP1UniversalReceiver.sol";
import "@lukso/lsp-smart-contracts/contracts/LSP1UniversalReceiver/ILSP1UniversalReceiverDelegate.sol";
import "../ZikJobConstants.sol";

abstract contract ZikJobAccount is
    IERC1271,
    ILSP1UniversalReceiver,
    ERC725XCore,
    ERC725YCore
{
    event ValueReceived(address indexed sender, uint256 indexed value);

    receive() external payable {
        emit ValueReceived(_msgSender(), msg.value);
    }

    /**
     * @notice Checks if an owner signed `_data`.
     * ERC1271 interface.
     *
     * @param _hash hash of the data signed//Arbitrary length data signed on the behalf of address(this)
     * @param _signature owner's signature(s) of the data
     */
    function isValidSignature(bytes32 _hash, bytes memory _signature)
        public
        view
        override
        returns (bytes4 magicValue)
    {
        // prettier-ignore
        address _owner = owner();
        // if OWNER is a contract
        if (_owner.code.length != 0) {
            return
                ERC165Checker.supportsInterface(_owner, _INTERFACEID_ERC1271)
                    ? IERC1271(_owner).isValidSignature(_hash, _signature)
                    : _ERC1271_FAILVALUE;
            // if OWNER is a key
        } else {
            return
                _owner == ECDSA.recover(_hash, _signature)
                    ? _INTERFACEID_ERC1271
                    : _ERC1271_FAILVALUE;
        }
    }

    /**
     * @notice Triggers the UniversalReceiver event when this function gets executed successfully.
     * @dev Forwards the call to the UniversalReceiverDelegate if set.
     * @param _typeId The type of call received.
     * @param _data The data received.
     */
    function universalReceiver(bytes32 _typeId, bytes calldata _data)
        external
        virtual
        override
        returns (bytes memory returnValue)
    {
        bytes memory data = _getData(_LSP1_UNIVERSAL_RECEIVER_DELEGATE_KEY);
        if (data.length >= 20) {
            address universalReceiverDelegate;

            assembly {
                universalReceiverDelegate := div(
                    mload(add(add(data, 0x20), 0)),
                    0x1000000000000000000000000
                )
            }

            if (
                ERC165Checker.supportsInterface(
                    universalReceiverDelegate,
                    _INTERFACEID_LSP1_DELEGATE
                )
            ) {
                returnValue = ILSP1UniversalReceiverDelegate(
                    universalReceiverDelegate
                ).universalReceiverDelegate(_msgSender(), _typeId, _data);
            }
        }
        emit UniversalReceiver(_msgSender(), _typeId, returnValue, _data);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC725XCore, ERC725YCore)
        returns (bool)
    {
        return
            interfaceId == _INTERFACEID_ERC1271 ||
            interfaceId == _INTERFACEID_LSP0 ||
            interfaceId == _INTERFACEID_LSP1 ||
            super.supportsInterface(interfaceId);
    }
}
