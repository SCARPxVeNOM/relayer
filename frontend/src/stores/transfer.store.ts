import { create } from 'zustand';
import { validateAmount, validateEthereumAddress, type ValidationResult } from '@/utils/validation';
import { transactionService, type TransferRequest } from '@/services/transaction.service';
import { useTransactionHistoryStore } from './transaction-history.store';
import { config } from '@/config';

export type DestinationChain = 'sepolia' | 'amoy';

interface TransferFormData {
  amount: string;
  destinationChain: DestinationChain;
  recipientAddress: string;
}

interface TransferValidation {
  amount: ValidationResult;
  recipientAddress: ValidationResult;
}

interface TransferState {
  form: TransferFormData;
  validation: TransferValidation;
  isSubmitting: boolean;
  lastTransactionId: string | null;
  
  // Actions
  updateAmount: (amount: string) => void;
  updateDestinationChain: (chain: DestinationChain) => void;
  updateRecipientAddress: (address: string) => void;
  validateForm: () => boolean;
  submitTransfer: () => Promise<string>;
  resetForm: () => void;
}

const initialFormData: TransferFormData = {
  amount: '',
  destinationChain: 'sepolia',
  recipientAddress: '',
};

const initialValidation: TransferValidation = {
  amount: { valid: true },
  recipientAddress: { valid: true },
};

export const useTransferStore = create<TransferState>((set, get) => ({
  form: initialFormData,
  validation: initialValidation,
  isSubmitting: false,
  lastTransactionId: null,

  updateAmount: (amount: string) => {
    set((state) => ({
      form: {
        ...state.form,
        amount,
      },
      validation: {
        ...state.validation,
        amount: validateAmount(amount),
      },
    }));
  },

  updateDestinationChain: (chain: DestinationChain) => {
    set((state) => ({
      form: {
        ...state.form,
        destinationChain: chain,
      },
    }));
  },

  updateRecipientAddress: (address: string) => {
    set((state) => ({
      form: {
        ...state.form,
        recipientAddress: address,
      },
      validation: {
        ...state.validation,
        recipientAddress: validateEthereumAddress(address),
      },
    }));
  },

  validateForm: () => {
    const { form } = get();
    
    const amountValidation = validateAmount(form.amount);
    const addressValidation = validateEthereumAddress(form.recipientAddress);
    
    set({
      validation: {
        amount: amountValidation,
        recipientAddress: addressValidation,
      },
    });
    
    return amountValidation.valid && addressValidation.valid;
  },

  submitTransfer: async () => {
    const { validateForm, form } = get();
    
    if (!validateForm()) {
      throw new Error('Form validation failed');
    }
    
    set({ isSubmitting: true });
    
    try {
      // Build transfer request
      const request: TransferRequest = {
        amount: form.amount,
        destinationChain: form.destinationChain,
        recipientAddress: form.recipientAddress,
      };
      
      // Submit transfer through transaction service
      const result = await transactionService.submitTransfer(request);
      
      // Store transaction ID
      set({ lastTransactionId: result.txId });
      
      // Add transaction to history
      const chainId = form.destinationChain === 'sepolia' 
        ? config.chains.sepolia.chainId 
        : config.chains.amoy.chainId;
      
      useTransactionHistoryStore.getState().addTransaction({
        id: result.txId,
        aleoTxId: result.txId,
        amount: form.amount,
        destinationChain: chainId,
        recipientAddress: form.recipientAddress,
        status: 'pending',
        timestamp: Date.now(),
      });
      
      // Start monitoring transaction status
      transactionService.monitorTransaction(result.txId, (statusDetail) => {
        useTransactionHistoryStore.getState().updateTransactionStatus(
          result.txId,
          statusDetail.status,
          {
            publicChainTxHash: statusDetail.publicChainTxHash,
            errorMessage: statusDetail.errorMessage,
          }
        );
      });
      
      // Reset form after successful submission
      get().resetForm();
      
      return result.txId;
    } catch (error) {
      console.error('Transfer submission failed:', error);
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  resetForm: () => {
    set({
      form: initialFormData,
      validation: initialValidation,
      isSubmitting: false,
      // Don't reset lastTransactionId as it may be needed for history
    });
  },
}));
