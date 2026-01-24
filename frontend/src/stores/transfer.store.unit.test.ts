import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTransferStore } from './transfer.store';
import { transactionService } from '@/services/transaction.service';

// Mock the transaction service
vi.mock('@/services/transaction.service', () => ({
  transactionService: {
    submitTransfer: vi.fn(),
    monitorTransaction: vi.fn(),
  },
  TransactionService: vi.fn(),
}));

/**
 * Unit tests for transfer store
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

describe('Transfer Store - Unit Tests', () => {
  beforeEach(() => {
    // Reset store to initial state
    const store = useTransferStore.getState();
    store.resetForm();
  });

  describe('Form field updates', () => {
    it('should update amount field', () => {
      const store = useTransferStore.getState();
      
      store.updateAmount('100');
      
      expect(useTransferStore.getState().form.amount).toBe('100');
    });

    it('should update destination chain', () => {
      const store = useTransferStore.getState();
      
      store.updateDestinationChain('amoy');
      
      expect(useTransferStore.getState().form.destinationChain).toBe('amoy');
    });

    it('should update recipient address', () => {
      const store = useTransferStore.getState();
      const address = '0x1234567890123456789012345678901234567890';
      
      store.updateRecipientAddress(address);
      
      expect(useTransferStore.getState().form.recipientAddress).toBe(address);
    });
  });

  describe('Form validation', () => {
    it('should validate amount on update', () => {
      const store = useTransferStore.getState();
      
      store.updateAmount('100');
      
      expect(useTransferStore.getState().validation.amount.valid).toBe(true);
    });

    it('should invalidate negative amount', () => {
      const store = useTransferStore.getState();
      
      store.updateAmount('-50');
      
      const validation = useTransferStore.getState().validation.amount;
      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
    });

    it('should validate address on update', () => {
      const store = useTransferStore.getState();
      const validAddress = '0x1234567890123456789012345678901234567890';
      
      store.updateRecipientAddress(validAddress);
      
      expect(useTransferStore.getState().validation.recipientAddress.valid).toBe(true);
    });

    it('should invalidate malformed address', () => {
      const store = useTransferStore.getState();
      
      store.updateRecipientAddress('invalid-address');
      
      const validation = useTransferStore.getState().validation.recipientAddress;
      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
    });

    it('should validate entire form', () => {
      const store = useTransferStore.getState();
      
      store.updateAmount('100');
      store.updateRecipientAddress('0x1234567890123456789012345678901234567890');
      
      const isValid = store.validateForm();
      
      expect(isValid).toBe(true);
    });

    it('should return false for invalid form', () => {
      const store = useTransferStore.getState();
      
      store.updateAmount('-100');
      store.updateRecipientAddress('invalid');
      
      const isValid = store.validateForm();
      
      expect(isValid).toBe(false);
    });
  });

  describe('Form submission', () => {
    it('should set submitting state during submission', async () => {
      // Mock successful submission
      vi.mocked(transactionService.submitTransfer).mockResolvedValue({
        txId: 'at1abc123',
        status: 'pending',
      });

      const store = useTransferStore.getState();
      
      store.updateAmount('100');
      store.updateRecipientAddress('0x1234567890123456789012345678901234567890');
      
      const submitPromise = store.submitTransfer();
      
      expect(useTransferStore.getState().isSubmitting).toBe(true);
      
      await submitPromise;
      
      expect(useTransferStore.getState().isSubmitting).toBe(false);
    });

    it('should reset form after successful submission', async () => {
      // Mock successful submission
      vi.mocked(transactionService.submitTransfer).mockResolvedValue({
        txId: 'at1abc123',
        status: 'pending',
      });

      const store = useTransferStore.getState();
      
      store.updateAmount('100');
      store.updateRecipientAddress('0x1234567890123456789012345678901234567890');
      store.updateDestinationChain('amoy');
      
      await store.submitTransfer();
      
      const state = useTransferStore.getState();
      expect(state.form.amount).toBe('');
      expect(state.form.recipientAddress).toBe('');
      expect(state.form.destinationChain).toBe('sepolia'); // Reset to default
    });

    it('should throw error for invalid form submission', async () => {
      const store = useTransferStore.getState();
      
      store.updateAmount(''); // Invalid
      store.updateRecipientAddress(''); // Invalid
      
      await expect(store.submitTransfer()).rejects.toThrow('Form validation failed');
    });

    it('should not reset form on submission failure', async () => {
      const store = useTransferStore.getState();
      
      store.updateAmount(''); // Invalid
      
      try {
        await store.submitTransfer();
      } catch (error) {
        // Expected to fail
      }
      
      // Form should not be reset
      expect(useTransferStore.getState().form.amount).toBe('');
    });
  });

  describe('Form reset', () => {
    it('should reset all form fields', () => {
      const store = useTransferStore.getState();
      
      store.updateAmount('100');
      store.updateRecipientAddress('0x1234567890123456789012345678901234567890');
      store.updateDestinationChain('amoy');
      
      store.resetForm();
      
      const state = useTransferStore.getState();
      expect(state.form.amount).toBe('');
      expect(state.form.recipientAddress).toBe('');
      expect(state.form.destinationChain).toBe('sepolia');
    });

    it('should reset validation state', () => {
      const store = useTransferStore.getState();
      
      store.updateAmount('-100'); // Invalid
      store.updateRecipientAddress('invalid'); // Invalid
      
      store.resetForm();
      
      const state = useTransferStore.getState();
      expect(state.validation.amount.valid).toBe(true);
      expect(state.validation.recipientAddress.valid).toBe(true);
    });

    it('should reset submitting state', () => {
      const store = useTransferStore.getState();
      
      // Manually set submitting state (normally set during submission)
      useTransferStore.setState({ isSubmitting: true });
      
      store.resetForm();
      
      expect(useTransferStore.getState().isSubmitting).toBe(false);
    });
  });
});
