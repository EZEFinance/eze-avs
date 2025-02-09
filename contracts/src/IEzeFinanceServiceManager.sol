// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {Reclaim} from "./Reclaim/Reclaim.sol";

interface IEzeFinanceServiceManager {
    event NewEzeTaskCreated(uint32 indexed taskIndex, EzeTask task);

    event EzeTaskResponded(uint32 indexed taskIndex, EzeTask task, address operator, bytes signature);

    event Debug(bytes32 storedHash, bytes32 suppliedHash);

    struct EzeTask{
        address accountAddress;
        string stakingAddress;
        uint32 taskCreatedBlock;
    }

    function latestTaskNum() external view returns (uint32);

    function allTaskHashes(
        uint32 taskIndex
    ) external view returns (bytes32);

    function allTaskResponses(
        address operator,
        uint32 taskIndex
    ) external view returns (bytes memory);

    function taskAgent(
        string memory taskName
    ) external returns (EzeTask memory);

    function respondToApproveTask(
        EzeTask calldata task,
        uint32 referenceTaskIndex,
        bytes calldata signature,
        Reclaim.Proof memory proof
    ) external;
}
