// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Receiver
 * @notice Simple contract to receive ETH/MATIC on public chains
 * @dev Emits events when receiving funds for tracking
 */
contract Receiver {
    event Received(address indexed from, uint256 amount, uint256 timestamp);

    /**
     * @notice Receive ETH/MATIC
     * @dev Emits Received event with sender and amount
     */
    receive() external payable {
        emit Received(msg.sender, msg.value, block.timestamp);
    }

    /**
     * @notice Get contract balance
     * @return Current balance in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

