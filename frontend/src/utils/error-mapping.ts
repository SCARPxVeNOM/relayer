/**
 * Error mapping utility for wallet and transaction errors
 * Provides user-friendly messages and actionable guidance
 */

export interface ErrorInfo {
  userMessage: string;
  guidance: string;
  retryable: boolean;
}

export type ErrorType =
  | 'METAMASK_NOT_INSTALLED'
  | 'LEO_WALLET_NOT_INSTALLED'
  | 'CONNECTION_REJECTED'
  | 'NETWORK_UNSUPPORTED'
  | 'NETWORK_SWITCH_FAILED'
  | 'INSUFFICIENT_BALANCE'
  | 'INVALID_ADDRESS'
  | 'TRANSACTION_REJECTED'
  | 'TRANSACTION_FAILED'
  | 'TIMEOUT'
  | 'UNKNOWN';

const ERROR_MAP: Record<ErrorType, ErrorInfo> = {
  METAMASK_NOT_INSTALLED: {
    userMessage: 'MetaMask wallet is not installed',
    guidance: 'Please install the MetaMask browser extension from metamask.io and refresh the page.',
    retryable: false,
  },
  LEO_WALLET_NOT_INSTALLED: {
    userMessage: 'Leo Wallet is not installed',
    guidance: 'Please install the Leo Wallet browser extension and refresh the page.',
    retryable: false,
  },
  CONNECTION_REJECTED: {
    userMessage: 'Wallet connection was rejected',
    guidance: 'You rejected the connection request. Click retry to connect your wallet again.',
    retryable: true,
  },
  NETWORK_UNSUPPORTED: {
    userMessage: 'Network not supported',
    guidance: 'Please switch to Ethereum Sepolia or Polygon Amoy testnet in your wallet.',
    retryable: true,
  },
  NETWORK_SWITCH_FAILED: {
    userMessage: 'Failed to switch network',
    guidance: 'Please manually switch to the correct network in your wallet settings.',
    retryable: true,
  },
  INSUFFICIENT_BALANCE: {
    userMessage: 'Insufficient balance',
    guidance: 'You don\'t have enough funds. Please add funds to your wallet or reduce the transfer amount.',
    retryable: false,
  },
  INVALID_ADDRESS: {
    userMessage: 'Invalid recipient address',
    guidance: 'Please enter a valid Ethereum address (starting with 0x followed by 40 hexadecimal characters).',
    retryable: false,
  },
  TRANSACTION_REJECTED: {
    userMessage: 'Transaction was rejected',
    guidance: 'You rejected the transaction in your wallet. Click retry to try again.',
    retryable: true,
  },
  TRANSACTION_FAILED: {
    userMessage: 'Transaction failed',
    guidance: 'The transaction failed on the blockchain. Please check the transaction details and try again.',
    retryable: true,
  },
  TIMEOUT: {
    userMessage: 'Request timed out',
    guidance: 'The request took too long to complete. Please check your internet connection and try again.',
    retryable: true,
  },
  UNKNOWN: {
    userMessage: 'An unexpected error occurred',
    guidance: 'Please try again. If the problem persists, contact support.',
    retryable: true,
  },
};

/**
 * Maps a raw error to a user-friendly error with guidance
 */
export function mapError(error: unknown): ErrorInfo {
  const errorMessage = getErrorMessage(error);
  const errorType = detectErrorType(errorMessage);
  return ERROR_MAP[errorType];
}

/**
 * Extracts error message from various error types
 */
function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Unknown error';
}

/**
 * Detects error type from error message
 */
function detectErrorType(message: string): ErrorType {
  const lowerMessage = message.toLowerCase();

  // Wallet not installed
  if (lowerMessage.includes('metamask') && lowerMessage.includes('not installed')) {
    return 'METAMASK_NOT_INSTALLED';
  }
  if (lowerMessage.includes('leo') && lowerMessage.includes('not installed')) {
    return 'LEO_WALLET_NOT_INSTALLED';
  }
  if (lowerMessage.includes('ethereum') && lowerMessage.includes('not found')) {
    return 'METAMASK_NOT_INSTALLED';
  }

  // Connection issues
  if (lowerMessage.includes('rejected') || lowerMessage.includes('denied')) {
    // Check if it's specifically a transaction rejection
    if (lowerMessage.includes('transaction')) {
      return 'TRANSACTION_REJECTED';
    }
    return 'CONNECTION_REJECTED';
  }

  // Network issues
  if (lowerMessage.includes('unsupported network') || lowerMessage.includes('wrong network')) {
    return 'NETWORK_UNSUPPORTED';
  }
  if (lowerMessage.includes('switch network') && lowerMessage.includes('failed')) {
    return 'NETWORK_SWITCH_FAILED';
  }

  // Transaction issues
  if (lowerMessage.includes('insufficient') && lowerMessage.includes('balance')) {
    return 'INSUFFICIENT_BALANCE';
  }
  if (lowerMessage.includes('invalid address')) {
    return 'INVALID_ADDRESS';
  }
  if (lowerMessage.includes('transaction') && lowerMessage.includes('rejected')) {
    return 'TRANSACTION_REJECTED';
  }
  if (lowerMessage.includes('transaction') && lowerMessage.includes('failed')) {
    return 'TRANSACTION_FAILED';
  }

  // Timeout
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return 'TIMEOUT';
  }

  return 'UNKNOWN';
}

/**
 * Checks if an error is retryable
 */
export function isRetryable(error: unknown): boolean {
  const errorInfo = mapError(error);
  return errorInfo.retryable;
}
