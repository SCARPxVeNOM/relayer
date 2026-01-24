/**
 * Validation utilities for transfer form
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates that an amount is a positive number
 * Requirements: 5.2
 */
export function validateAmount(amount: string): ValidationResult {
  // Check if empty
  if (!amount || amount.trim() === '') {
    return {
      valid: false,
      error: 'Amount is required',
    };
  }

  // Check if it's a valid number
  const numValue = Number(amount);
  if (isNaN(numValue)) {
    return {
      valid: false,
      error: 'Amount must be a valid number',
    };
  }

  // Check if positive
  if (numValue <= 0) {
    return {
      valid: false,
      error: 'Amount must be greater than zero',
    };
  }

  // Check for infinity
  if (!isFinite(numValue)) {
    return {
      valid: false,
      error: 'Amount must be a finite number',
    };
  }

  return { valid: true };
}

/**
 * Validates Ethereum address format
 * Requirements: 5.4
 */
export function validateEthereumAddress(address: string): ValidationResult {
  // Check if empty
  if (!address || address.trim() === '') {
    return {
      valid: false,
      error: 'Address is required',
    };
  }

  // Check if it starts with 0x
  if (!address.startsWith('0x')) {
    return {
      valid: false,
      error: 'Address must start with 0x',
    };
  }

  // Check if it has the correct length (0x + 40 hex characters)
  if (address.length !== 42) {
    return {
      valid: false,
      error: 'Address must be 42 characters long (0x + 40 hex characters)',
    };
  }

  // Check if all characters after 0x are valid hex
  const hexPart = address.slice(2);
  const hexRegex = /^[0-9a-fA-F]+$/;
  if (!hexRegex.test(hexPart)) {
    return {
      valid: false,
      error: 'Address must contain only hexadecimal characters',
    };
  }

  return { valid: true };
}

/**
 * Validates the entire transfer form
 * Requirements: 5.5
 */
export interface TransferFormData {
  amount: string;
  recipientAddress: string;
  destinationChain: 'sepolia' | 'amoy';
}

export function validateTransferForm(formData: TransferFormData): {
  valid: boolean;
  errors: {
    amount?: string;
    recipientAddress?: string;
  };
} {
  const amountValidation = validateAmount(formData.amount);
  const addressValidation = validateEthereumAddress(formData.recipientAddress);

  const errors: { amount?: string; recipientAddress?: string } = {};

  if (!amountValidation.valid) {
    errors.amount = amountValidation.error;
  }

  if (!addressValidation.valid) {
    errors.recipientAddress = addressValidation.error;
  }

  return {
    valid: amountValidation.valid && addressValidation.valid,
    errors,
  };
}
