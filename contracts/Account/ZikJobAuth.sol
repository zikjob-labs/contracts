// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "../interfaces/ILSP0.sol";
import "./Zikkie.sol";
import "./ZikJobEmployer.sol";

contract ZikJobAuth is Ownable {
    mapping(address => address) public userToZikkie;
    mapping(address => address) public userToEmployer;
    address[] public zikkies;
    address[] public employers;

    event ZikkieCreated(address indexed zikkieAddress);
    event EmployerCreated(address indexed employerAddress);

    function createZikkie() external returns (address zikkieAddress) {
        bytes memory bytecode = type(Zikkie).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(_msgSender(), address(this)));
        zikkieAddress = Create2.deploy(
            0,
            salt,
            abi.encodePacked(bytecode, abi.encode(_msgSender()))
        );
        userToZikkie[_msgSender()] = zikkieAddress;
        zikkies.push(zikkieAddress);
        emit ZikkieCreated(zikkieAddress);
    }

    function createEmployer() external returns (address employerAddress) {
        bytes memory bytecode = type(ZikJobEmployer).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(_msgSender(), address(this)));
        employerAddress = Create2.deploy(
            0,
            salt,
            abi.encodePacked(bytecode, abi.encode(_msgSender()))
        );
        userToEmployer[_msgSender()] = employerAddress;
        employers.push(employerAddress);
        emit EmployerCreated(employerAddress);
    }
}
