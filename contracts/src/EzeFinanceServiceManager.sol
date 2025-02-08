// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {ECDSAServiceManagerBase} from "@eigenlayer-middleware/src/unaudited/ECDSAServiceManagerBase.sol";
import {ECDSAStakeRegistry} from "@eigenlayer-middleware/src/unaudited/ECDSAStakeRegistry.sol";
import {IServiceManager} from "@eigenlayer-middleware/src/interfaces/IServiceManager.sol";
import {ECDSAUpgradeable} from "@openzeppelin-upgrades/contracts/utils/cryptography/ECDSAUpgradeable.sol";
import {IERC1271Upgradeable} from "@openzeppelin-upgrades/contracts/interfaces/IERC1271Upgradeable.sol";
import {IEzeFinanceServiceManager} from "./IEzeFinanceServiceManager.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@eigenlayer/contracts/interfaces/IRewardsCoordinator.sol";
import {TransparentUpgradeableProxy} from "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

import {Reclaim} from "./Reclaim/Reclaim.sol";
import {Claims} from "./Reclaim/Claims.sol";
import {Addresses} from "./Reclaim/Addresses.sol";

/**
 * @title Primary entrypoint for procuring services from HelloWorld.
 * @author Eigen Labs, Inc.
 */

contract EzeFinanceServiceManager is
    ECDSAServiceManagerBase,
    IEzeFinanceServiceManager
{
    using ECDSAUpgradeable for bytes32;

    uint32 public latestTaskNum;
    address public constant OWNER_ADDRESS =
        0xa1e7FE3295A2c422d930d24c86220d496A36869C;

    mapping(uint32 => bytes32) public allTaskHashes;
    mapping(address => mapping(uint32 => bytes)) public allTaskResponses;
    mapping(uint256 => bool) public userChannelID;

    modifier onlyOperator() {
        require(
            ECDSAStakeRegistry(stakeRegistry).operatorRegistered(msg.sender),
            "Operator must be the caller"
        );
        _;
    }

    constructor(
        address _avsDirectory,
        address _stakeRegistry,
        address _rewardsCoordinator,
        address _delegationManager
    )
        ECDSAServiceManagerBase(
            _avsDirectory,
            _stakeRegistry,
            _rewardsCoordinator,
            _delegationManager
        )
    {}

    /* FUNCTIONS */
    // NOTE: this function creates new task, assigns it a taskId

    function taskAgent(
        string memory stakingAddress
    ) external returns (EzeTask memory) {
        EzeTask memory ezeTask;
        ezeTask.accountAddress = msg.sender;
        ezeTask.stakingAddress = stakingAddress;
        ezeTask.taskCreatedBlock = uint32(block.number);

        // store hash of task onchain, emit event, and increase taskNum
        allTaskHashes[latestTaskNum] = keccak256(abi.encode(ezeTask));
        emit NewEzeTaskCreated(latestTaskNum, ezeTask);
        latestTaskNum = latestTaskNum + 1;

        return ezeTask;
    }

    function respondToApproveTask(
        EzeTask calldata task,
        uint32 referenceTaskIndex,
        bytes memory signature,
        Reclaim.Proof memory proof
    ) external {
        bytes32 storedHash = allTaskHashes[referenceTaskIndex];
        bytes32 suppliedHash = keccak256(abi.encode(task));
        emit Debug(storedHash, suppliedHash);

        require(
            keccak256(abi.encode(task)) == allTaskHashes[referenceTaskIndex],
            "supplied task does not match the one recorded in the contract"
        );
        require(
            allTaskResponses[msg.sender][referenceTaskIndex].length == 0,
            "Operator has already responded to the task"
        );

        // The message that was signed
        bytes32 messageHash = keccak256(
            abi.encodePacked("Hello, this is a signed message from the Eze Finance Service Manager.")
        );
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        bytes4 magicValue = IERC1271Upgradeable.isValidSignature.selector;
        if (
            !(magicValue ==
                ECDSAStakeRegistry(stakeRegistry).isValidSignature(
                    ethSignedMessageHash,
                    signature
                ))
        ) {
            revert();
        }

        require(proof.signedClaim.claim.owner == OWNER_ADDRESS, "Owner is not valid!");

        // updating the storage with task responses
        allTaskResponses[msg.sender][referenceTaskIndex] = signature;

        // emitting event
        emit EzeTaskResponded(referenceTaskIndex, task, msg.sender);
    }
    
}
