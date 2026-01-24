# Implementation Plan - Wallet Integration Frontend

- [x] 1. Set up project structure and dependencies




  - Create React + TypeScript + Vite project
  - Install core dependencies (ethers.js, zustand, react-query, tailwind)
  - Install testing dependencies (vitest, react-testing-library, fast-check)
  - Configure TypeScript, ESLint, and Prettier
  - Set up Tailwind CSS configuration
  - _Requirements: All requirements depend on proper project setup_

- [x] 2. Implement MetaMask wallet connector





  - Create MetaMaskConnector service with connect/disconnect methods
  - Implement account and network detection
  - Add event listeners for account and network changes
  - Implement network switching functionality
  - Add balance fetching capability
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3, 8.1_

- [x] 2.1 Write property test for MetaMask connection



  - **Property 1: MetaMask connection triggers request**
  - **Validates: Requirements 1.1**

- [x] 2.2 Write property test for successful connection display

  - **Property 2: Successful connection displays address**
  - **Validates: Requirements 1.2**

- [x] 2.3 Write property test for connection failures

  - **Property 3: Connection failures show errors**
  - **Validates: Requirements 1.3**

- [x] 2.4 Write property test for network change detection

  - **Property 10: Network change detection**
  - **Validates: Requirements 4.1**

- [x] 2.5 Write property test for unsupported network warning

  - **Property 11: Unsupported network warning**
  - **Validates: Requirements 4.2**

- [x] 2.6 Write unit tests for MetaMask connector


  - Test connection flow with mocked ethereum provider
  - Test network switching
  - Test error handling for missing MetaMask
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 4.3_

- [x] 3. Implement Leo Wallet connector





  - Create LeoWalletConnector service with connect/disconnect methods
  - Implement account detection
  - Add transaction request functionality
  - Implement transaction status polling
  - Add balance fetching capability
  - _Requirements: 2.1, 2.2, 2.3, 6.1, 6.2, 6.3, 6.4, 8.1_

- [x] 3.1 Write property test for Leo Wallet connection


  - **Property 4: Leo Wallet connection triggers request**
  - **Validates: Requirements 2.1**

- [x] 3.2 Write property test for Leo Wallet success


  - **Property 5: Leo Wallet success displays Aleo address**
  - **Validates: Requirements 2.2**

- [x] 3.3 Write property test for Leo Wallet failures


  - **Property 6: Leo Wallet failures show errors**
  - **Validates: Requirements 2.3**

- [x] 3.4 Write unit tests for Leo Wallet connector



  - Test connection flow with mocked Leo Wallet API
  - Test transaction submission
  - Test error handling for missing Leo Wallet
  - _Requirements: 2.1, 2.2, 2.3, 6.1_

- [x] 4. Create state management with Zustand





  - Create wallet state store with MetaMask and Leo Wallet states
  - Implement wallet connection/disconnection actions
  - Add network update actions
  - Implement balance refresh functionality
  - Add state persistence to localStorage
  - _Requirements: 3.1, 3.2, 3.3, 8.1, 8.2_

- [x] 4.1 Write property test for dual wallet display


  - **Property 7: Dual wallet display**
  - **Validates: Requirements 3.1**

- [x] 4.2 Write property test for independent disconnection


  - **Property 8: Independent wallet disconnection**
  - **Validates: Requirements 3.2**

- [x] 4.3 Write property test for connection persistence


  - **Property 9: Connection persistence**
  - **Validates: Requirements 3.3**

- [x] 4.4 Write unit tests for wallet state management


  - Test state updates for wallet connections
  - Test state persistence and restoration
  - Test balance updates
  - _Requirements: 3.1, 3.2, 3.3, 8.1, 8.2_

- [x] 5. Build wallet connection UI components





  - Create WalletButton component for MetaMask
  - Create WalletButton component for Leo Wallet
  - Create WalletDisplay component showing connected addresses
  - Add network indicator and switch button
  - Implement loading states during connection
  - Add error message display for connection failures
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 4.1, 4.2, 4.3, 9.1, 10.1_

- [x] 5.1 Write unit tests for wallet UI components


  - Test wallet button interactions
  - Test wallet display rendering
  - Test network indicator
  - Test error message display
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

- [x] 6. Implement transfer form validation logic





  - Create validation functions for amount (positive numbers only)
  - Create validation function for Ethereum addresses
  - Implement form state validation
  - Add real-time validation feedback
  - _Requirements: 5.2, 5.4, 5.5_

- [x] 6.1 Write property test for amount validation


  - **Property 14: Amount validation**
  - **Validates: Requirements 5.2**


- [x] 6.2 Write property test for address validation

  - **Property 16: Address format validation**
  - **Validates: Requirements 5.4**

- [x] 6.3 Write property test for submit button enablement


  - **Property 17: Submit button enablement**
  - **Validates: Requirements 5.5**

- [x] 6.4 Write unit tests for validation logic


  - Test amount validation with various inputs
  - Test address validation
  - Test form validation state
  - _Requirements: 5.2, 5.4, 5.5_

- [x] 7. Create transfer form state management





  - Create transfer state store with form fields
  - Implement form field update actions
  - Add form validation state
  - Implement form submission logic
  - Add form reset functionality
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7.1 Write property test for form enablement


  - **Property 13: Form enablement based on wallet state**
  - **Validates: Requirements 5.1**

- [x] 7.2 Write property test for chain selection display

  - **Property 15: Chain selection display**
  - **Validates: Requirements 5.3**

- [x] 8. Build transfer form UI component





  - Create TransferForm component with amount input
  - Add destination chain selector (Sepolia/Amoy)
  - Add recipient address input
  - Implement form validation display
  - Add submit button with loading state
  - Disable form when wallets not connected or network incorrect
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 10.2_

- [x] 8.1 Write unit tests for transfer form component



  - Test form field updates
  - Test validation display
  - Test form submission
  - Test form disabling conditions
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 9. Implement transaction execution logic





  - Create transaction service to build Aleo transaction parameters
  - Implement transfer submission through Leo Wallet
  - Add transaction status monitoring
  - Implement error handling for transaction failures
  - Add retry logic for failed status checks
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 9.2_

- [x] 9.1 Write property test for transfer submission


  - **Property 18: Transfer submission triggers Aleo transaction**
  - **Validates: Requirements 6.1**



- [x] 9.2 Write property test for pending status

  - **Property 19: Pending status display**


  - **Validates: Requirements 6.2**




- [ ] 9.3 Write property test for confirmation status
  - **Property 20: Confirmation status update**
  - **Validates: Requirements 6.3**


- [ ] 9.4 Write property test for transaction failure
  - **Property 21: Transaction failure handling**

  - **Validates: Requirements 6.4**

- [ ] 9.5 Write unit tests for transaction execution



  - Test transaction parameter building
  - Test transaction submission
  - Test status monitoring
  - Test error handling
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 10. Create transaction history state management



  - Create transaction history store
  - Implement add transaction action
  - Implement update transaction status action
  - Add transaction persistence to localStorage
  - Implement transaction loading from storage
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 10.1 Write property test for history entry creation


  - **Property 22: History entry creation**
  - **Validates: Requirements 7.1**



- [x] 10.2 Write property test for history completeness

  - **Property 23: History entry completeness**


  - **Validates: Requirements 7.2**


- [-] 10.3 Write property test for real-time updates



  - **Property 25: Real-time status updates**
  - **Validates: Requirements 7.4**

- [x] 10.4 Write unit tests for transaction history state


  - Test adding transactions
  - Test updating transaction status
  - Test transaction persistence
  - _Requirements: 7.1, 7.2, 7.4_

- [x] 11. Build transaction history UI component





  - Create TransactionHistory component with transaction list
  - Display transaction ID, amount, chain, status, timestamp
  - Add transaction detail modal/view
  - Implement status indicators (pending, confirmed, failed)
  - Add real-time status updates
  - Add links to block explorers
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 11.1 Write property test for transaction detail view






  - **Property 24: Transaction detail view**
  - **Validates: Requirements 7.3**

- [x] 11.2 Write unit tests for transaction history component




  - Test transaction list rendering
  - Test transaction detail display
  - Test status updates
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 12. Implement balance display and updates






  - Create balance display component for both wallets
  - Implement balance refresh on wallet connection
  - Add automatic balance updates every 10 seconds
  - Implement amount formatting with proper decimals
  - Add balance refresh button
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 12.1 Write property test for balance display


  - **Property 26: Balance display**
  - **Validates: Requirements 8.1**

- [x] 12.2 Write property test for balance updates


  - **Property 27: Balance update timeliness**
  - **Validates: Requirements 8.2**

- [x] 12.3 Write property test for amount formatting


  - **Property 28: Amount formatting**
  - **Validates: Requirements 8.3**

- [x] 12.4 Write unit tests for balance display







  - Test balance rendering
  - Test balance updates
  - Test amount formatting
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 13. Implement comprehensive error handling





  - Create error message component with user-friendly messages
  - Add error mapping for common wallet errors
  - Implement timeout handling with retry buttons
  - Add actionable error guidance for each error type
  - Create error boundary for React errors
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 13.1 Write property test for error messages


  - **Property 29: User-friendly error messages**
  - **Validates: Requirements 9.1**

- [x] 13.2 Write property test for timeout handling


  - **Property 30: Timeout handling with retry**
  - **Validates: Requirements 9.2**

- [x] 13.3 Write property test for actionable guidance


  - **Property 31: Actionable error guidance**
  - **Validates: Requirements 9.3**

- [x] 13.4 Write unit tests for error handling


  - Test error message display
  - Test retry functionality
  - Test error boundary
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 14. Implement loading states and UI feedback





  - Add loading spinner component
  - Implement loading state during wallet initialization
  - Add button loading states during operations
  - Disable buttons during in-progress operations
  - Add skeleton loaders for data fetching
  - _Requirements: 10.1, 10.2_


- [x] 14.1 Write property test for loading state display

  - **Property 32: Loading state display**
  - **Validates: Requirements 10.1**

- [x] 14.2 Write property test for button disabling


  - **Property 33: Operation button disabling**
  - **Validates: Requirements 10.2**

- [x] 14.3 Write unit tests for loading states


  - Test loading spinner display
  - Test button disabling during operations
  - Test skeleton loaders
  - _Requirements: 10.1, 10.2_

- [x] 15. Create main application layout





  - Create App component with routing (if needed)
  - Build header with wallet connection buttons
  - Create main content area with transfer form
  - Add sidebar or section for transaction history
  - Implement responsive layout for mobile and desktop
  - Add footer with links and information
  - _Requirements: All UI requirements_

- [x] 15.1 Write unit tests for main layout


  - Test layout rendering
  - Test responsive behavior
  - Test component integration
  - _Requirements: All UI requirements_

- [x] 16. Add network switch functionality





  - Implement network switch request for Sepolia
  - Implement network switch request for Amoy
  - Add network configuration (chain ID, RPC URL, block explorer)
  - Handle network switch errors
  - Add network switch confirmation feedback
  - _Requirements: 4.3_

- [x] 16.1 Write property test for network switch request


  - **Property 12: Network switch request**
  - **Validates: Requirements 4.3**

- [x] 16.2 Write unit tests for network switching


  - Test network switch requests
  - Test network configuration
  - Test error handling
  - _Requirements: 4.3_

- [-] 17. Implement transaction monitoring service



  - Create polling service for Aleo transaction status
  - Implement exponential backoff for polling
  - Add transaction confirmation detection
  - Implement public chain transaction hash extraction
  - Add monitoring stop on confirmation or failure
  - _Requirements: 6.2, 6.3, 6.4, 7.4_

- [-] 17.1 Write unit tests for transaction monitoring

  - Test polling logic
  - Test status detection
  - Test exponential backoff
  - _Requirements: 6.2, 6.3, 6.4_

- [ ] 18. Add environment configuration
  - Create environment variable configuration
  - Add Aleo program ID configuration
  - Add relayer API URL configuration
  - Add chain ID configurations
  - Create .env.example file
  - _Requirements: All requirements depend on proper configuration_

- [ ] 19. Implement accessibility features
  - Add ARIA labels to all interactive elements
  - Implement keyboard navigation
  - Add focus indicators
  - Ensure color contrast meets WCAG standards
  - Add screen reader announcements for status changes
  - _Requirements: 10.3, 10.4_

- [ ] 19.1 Write accessibility tests
  - Test ARIA labels
  - Test keyboard navigation
  - Test focus management
  - _Requirements: 10.3, 10.4_

- [ ] 20. Create documentation
  - Write README with setup instructions
  - Document environment variables
  - Create user guide for wallet connection
  - Document transfer process
  - Add troubleshooting guide
  - _Requirements: All requirements_

- [ ] 21. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
