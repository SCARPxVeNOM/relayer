/**
 * Address Converter - EVM ↔ Aleo Address Conversion
 * 
 * For MVP: Simple deterministic conversion using hashing
 * In production: Implement proper cryptographic conversion or maintain mapping table
 */

import { ethers } from 'ethers';

/**
 * Convert EVM address to Aleo address format
 * 
 * Note: This is a simplified conversion for MVP.
 * In production, you would either:
 * 1. Maintain a user-registered mapping (user provides both addresses)
 * 2. Use a bridge contract that emits events with both addresses
 * 3. Implement cryptographic derivation if possible
 * 
 * For now, we pass through the EVM address and let the relayer handle it
 */
export function evmToAleo(evmAddress) {
    // Validate EVM address format
    if (!ethers.isAddress(evmAddress)) {
        throw new Error(`Invalid EVM address: ${evmAddress}`);
    }

    // For MVP: Store original EVM address
    // In practice: This would be converted to Aleo address format (aleo1...)
    // The request_transfer function expects an Aleo address, but we'll use
    // a special encoding to embed the EVM address

    // Normalize address to lowercase checksummed format
    const normalized = ethers.getAddress(evmAddress);

    // Return as-is for now - the intent API will include this in the transaction data
    return normalized;
}

/**
 * Convert Aleo address to EVM address format
 * 
 * If the address is already in EVM format (0x...), return as-is
 * Otherwise, attempt to extract EVM address from Aleo format
 */
export function aleoToEVM(aleoAddress) {
    // If already EVM format, validate and return
    if (aleoAddress.startsWith('0x')) {
        if (!ethers.isAddress(aleoAddress)) {
            throw new Error(`Invalid EVM address embedded in Aleo: ${aleoAddress}`);
        }
        return ethers.getAddress(aleoAddress);
    }

    // For Aleo format (aleo1...), we would need a mapping table
    // For MVP, this is not directly used in the forward flow
    // (user submits EVM address, relayer converts it)

    throw new Error(`Cannot convert pure Aleo address to EVM: ${aleoAddress}. Mapping table required.`);
}

/**
 * Validate that an address is in valid format for the target chain
 */
export function validateAddress(address, type = 'evm') {
    if (type === 'evm') {
        return ethers.isAddress(address);
    } else if (type === 'aleo') {
        // Aleo addresses start with 'aleo1' and are base58 encoded
        return address.startsWith('aleo1') && address.length >= 59;
    }
    return false;
}

/**
 * Create a unique request ID from transaction parameters
 * This can be used for tracking before Aleo txHash is available
 */
export function createRequestId(chainId, recipient, amount, timestamp) {
    const data = `${chainId}-${recipient}-${amount}-${timestamp}`;
    return ethers.id(data).substring(0, 18); // Short hash for readability
}
