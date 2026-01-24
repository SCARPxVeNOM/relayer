# Requirements Document

## Introduction

This document specifies the requirements for a web-based frontend application that enables users to perform private cross-chain transfers using the Multi-Chain Privacy Barrier system. The frontend will integrate with MetaMask for Ethereum Sepolia and Polygon Amoy testnet operations, and Leo Wallet for Aleo testnet interactions, providing a complete user interface for the privacy-preserving cross-chain transfer workflow.

## Glossary

- **Frontend Application**: The web-based user interface for the Multi-Chain Privacy Barrier system
- **MetaMask**: Browser extension wallet for Ethereum-compatible chains (Sepolia, Polygon Amoy)
- **Leo Wallet**: Browser extension wallet for Aleo blockchain interactions
- **Privacy Box System**: The complete system including Aleo program, relayer, and public chain contracts
- **Vault**: An Aleo record that stores a user's private balance for cross-chain transfers
- **Transfer Request**: A private transaction on Aleo that initiates a cross-chain transfer
- **Relayer**: The backend service that monitors Aleo transactions and executes transfers on public chains
- **Testnet Tokens**: Test cryptocurrency (Sepolia ETH, Amoy MATIC, Aleo testnet tokens)
- **Chain Selection**: The user's choice of destination blockchain (Ethereum Sepolia or Polygon Amoy)
- **Recipient Address**: The destination address on the target public chain
- **Transaction Status**: The current state of a transfer (pending, completed, failed)

## Requirements

### Requirement 1

**User Story:** As a user, I want to connect my MetaMask wallet to the frontend, so that I can interact with Ethereum Sepolia and Polygon Amoy testnets.

#### Acceptance Criteria

1. WHEN a user clicks the "Connect MetaMask" button THEN the Frontend Application SHALL prompt MetaMask to request wallet connection
2. WHEN MetaMask connection is approved THEN the Frontend Application SHALL display the connected wallet address
3. WHEN the connected network is not Ethereum Sepolia or Polygon Amoy THEN the Frontend Application SHALL prompt the user to switch networks
4. WHEN a user switches networks in MetaMask THEN the Frontend Application SHALL detect the network change and update the displayed network
5. WHEN a user disconnects their wallet THEN the Frontend Application SHALL clear the wallet state and return to the disconnected view

### Requirement 2

**User Story:** As a user, I want to connect my Leo Wallet to the frontend, so that I can interact with the Aleo testnet for private transfers.

#### Acceptance Criteria

1. WHEN a user clicks the "Connect Leo Wallet" button THEN the Frontend Application SHALL prompt Leo Wallet to request connection
2. WHEN Leo Wallet connection is approved THEN the Frontend Application SHALL display the connected Aleo address
3. WHEN Leo Wallet is not installed THEN the Frontend Application SHALL display installation instructions with a link to the Leo Wallet extension
4. WHEN a user disconnects Leo Wallet THEN the Frontend Application SHALL clear the Aleo wallet state
5. WHEN Leo Wallet account changes THEN the Frontend Application SHALL detect the change and update the displayed address

### Requirement 3

**User Story:** As a user, I want to view my vault balance on Aleo, so that I can see how much I have available for cross-chain transfers.

#### Acceptance Criteria

1. WHEN Leo Wallet is connected THEN the Frontend Application SHALL query the Aleo program for the user's vault balance
2. WHEN a vault exists for the user THEN the Frontend Application SHALL display the vault balance in a readable format
3. WHEN no vault exists for the user THEN the Frontend Application SHALL display a message indicating no vault is initialized
4. WHEN the vault balance changes THEN the Frontend Application SHALL update the displayed balance within 10 seconds
5. WHEN the balance query fails THEN the Frontend Application SHALL display an error message and provide a retry option

### Requirement 4

**User Story:** As a user, I want to initialize a new vault on Aleo, so that I can start making private cross-chain transfers.

#### Acceptance Criteria

1. WHEN a user enters an initial balance amount and clicks "Initialize Vault" THEN the Frontend Application SHALL call the Aleo program's init transition through Leo Wallet
2. WHEN the vault initialization transaction is submitted THEN the Frontend Application SHALL display a pending status with the transaction ID
3. WHEN the vault initialization is confirmed THEN the Frontend Application SHALL display a success message and update the vault balance
4. WHEN the user enters an invalid amount THEN the Frontend Application SHALL prevent submission and display validation errors
5. WHEN the initialization transaction fails THEN the Frontend Application SHALL display the error message from Leo Wallet

### Requirement 5

**User Story:** As a user, I want to request a private cross-chain transfer, so that I can send funds from Aleo to Ethereum Sepolia or Polygon Amoy without revealing my identity.

#### Acceptance Criteria

1. WHEN a user selects a destination chain, enters a recipient address and amount, and clicks "Request Transfer" THEN the Frontend Application SHALL call the Aleo program's request_transfer transition with private parameters
2. WHEN the transfer request is submitted THEN the Frontend Application SHALL display the transaction status as pending
3. WHEN the transfer amount exceeds the vault balance THEN the Frontend Application SHALL prevent submission and display an error
4. WHEN the recipient address is invalid for the selected chain THEN the Frontend Application SHALL prevent submission and display validation errors
5. WHEN the transfer request is confirmed on Aleo THEN the Frontend Application SHALL display the Aleo transaction ID and indicate the relayer will process it

### Requirement 6

**User Story:** As a user, I want to see the status of my transfer requests, so that I can track when the relayer executes the transfer on the public chain.

#### Acceptance Criteria

1. WHEN a transfer request is submitted THEN the Frontend Application SHALL display the request in a transaction history list
2. WHEN the relayer processes a transfer THEN the Frontend Application SHALL update the status to show the public chain transaction hash
3. WHEN a transfer is completed THEN the Frontend Application SHALL display a success indicator with links to both Aleo and public chain explorers
4. WHEN a transfer fails THEN the Frontend Application SHALL display the failure reason and error details
5. WHEN the user refreshes the page THEN the Frontend Application SHALL restore transaction history from local storage

### Requirement 7

**User Story:** As a user, I want to view my testnet token balances, so that I can see how much ETH and MATIC I have on the public chains.

#### Acceptance Criteria

1. WHEN MetaMask is connected to Ethereum Sepolia THEN the Frontend Application SHALL display the user's Sepolia ETH balance
2. WHEN MetaMask is connected to Polygon Amoy THEN the Frontend Application SHALL display the user's Amoy MATIC balance
3. WHEN the user switches networks THEN the Frontend Application SHALL update the displayed balance for the new network
4. WHEN a transfer is completed THEN the Frontend Application SHALL refresh the recipient's balance on the destination chain
5. WHEN balance queries fail THEN the Frontend Application SHALL display cached balances with a warning indicator

### Requirement 8

**User Story:** As a user, I want to receive testnet tokens from faucets, so that I can test the privacy barrier system.

#### Acceptance Criteria

1. WHEN a user clicks "Get Testnet Tokens" for Ethereum Sepolia THEN the Frontend Application SHALL display a link to the Sepolia faucet with the user's address pre-filled
2. WHEN a user clicks "Get Testnet Tokens" for Polygon Amoy THEN the Frontend Application SHALL display a link to the Polygon faucet with the user's address pre-filled
3. WHEN a user clicks "Get Aleo Testnet Tokens" THEN the Frontend Application SHALL display instructions for obtaining Aleo testnet tokens
4. WHEN no wallet is connected THEN the Frontend Application SHALL disable faucet links and display a connection prompt
5. WHEN faucet links are opened THEN the Frontend Application SHALL open them in a new browser tab

### Requirement 9

**User Story:** As a user, I want to see clear visual feedback during wallet operations, so that I understand what actions are being performed and their status.

#### Acceptance Criteria

1. WHEN a wallet connection is in progress THEN the Frontend Application SHALL display a loading indicator on the connect button
2. WHEN a transaction is being signed THEN the Frontend Application SHALL display a modal indicating "Waiting for signature"
3. WHEN a transaction is submitted but not confirmed THEN the Frontend Application SHALL display a pending animation with the transaction ID
4. WHEN an error occurs THEN the Frontend Application SHALL display a toast notification with the error message
5. WHEN a transaction succeeds THEN the Frontend Application SHALL display a success toast with a link to the block explorer

### Requirement 10

**User Story:** As a developer, I want the frontend to handle wallet connection errors gracefully, so that users receive helpful guidance when issues occur.

#### Acceptance Criteria

1. WHEN MetaMask is not installed THEN the Frontend Application SHALL display installation instructions with a download link
2. WHEN Leo Wallet is not installed THEN the Frontend Application SHALL display installation instructions with a download link
3. WHEN a user rejects a wallet connection request THEN the Frontend Application SHALL display a message explaining that connection is required
4. WHEN a wallet connection times out THEN the Frontend Application SHALL display a retry button
5. WHEN network switching fails THEN the Frontend Application SHALL display manual network configuration instructions

### Requirement 11

**User Story:** As a user, I want the frontend to validate my inputs before submitting transactions, so that I avoid failed transactions and wasted gas fees.

#### Acceptance Criteria

1. WHEN a user enters a transfer amount THEN the Frontend Application SHALL validate it is a positive number not exceeding the vault balance
2. WHEN a user enters a recipient address THEN the Frontend Application SHALL validate it matches the format for the selected destination chain
3. WHEN a user attempts to initialize a vault with zero or negative balance THEN the Frontend Application SHALL prevent submission and display an error
4. WHEN validation fails THEN the Frontend Application SHALL highlight the invalid field and display specific error messages
5. WHEN all validations pass THEN the Frontend Application SHALL enable the submit button

### Requirement 12

**User Story:** As a user, I want the frontend to be responsive and work on mobile devices, so that I can access the privacy barrier from any device.

#### Acceptance Criteria

1. WHEN the Frontend Application is accessed on a mobile device THEN the Frontend Application SHALL display a mobile-optimized layout
2. WHEN the screen width is below 768 pixels THEN the Frontend Application SHALL stack UI components vertically
3. WHEN wallet connection buttons are displayed on mobile THEN the Frontend Application SHALL ensure they are easily tappable with minimum 44px touch targets
4. WHEN transaction history is viewed on mobile THEN the Frontend Application SHALL display it in a scrollable, condensed format
5. WHEN the device orientation changes THEN the Frontend Application SHALL adjust the layout appropriately
