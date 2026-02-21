program envelop_payments.aleo {
    @noupgrade
    async constructor() {}

    record PaymentIntent {
        owner: address,
        sender: address,
        recipient_hash: field,
        token_id: field,
        amount: u64,
        note_hash: field,
        nonce: u64,
    }

    record TokenBalance {
        owner: address,
        token_id: field,
        amount: u64,
    }

    record PaymentReceipt {
        owner: address,
        sender: address,
        token_id: field,
        amount: u64,
        payment_id: field,
        settled_at: u64,
    }

    transition create_payment_intent(
        recipient_hash: field,
        token_id: field,
        amount: u64,
        note_hash: field,
        nonce: u64
    ) -> PaymentIntent {
        assert(amount > 0u64);

        return PaymentIntent {
            owner: self.signer,
            sender: self.signer,
            recipient_hash: recipient_hash,
            token_id: token_id,
            amount: amount,
            note_hash: note_hash,
            nonce: nonce,
        };
    }

    transition mint_balance(token_id: field, amount: u64) -> TokenBalance {
        assert(amount > 0u64);
        return TokenBalance {
            owner: self.signer,
            token_id: token_id,
            amount: amount,
        };
    }

    transition settle_payment_onchain(
        intent: PaymentIntent,
        sender_balance: TokenBalance,
        recipient_balance: TokenBalance,
        payment_id: field,
        settled_at: u64
    ) -> (TokenBalance, TokenBalance, PaymentReceipt) {
        assert(sender_balance.owner == intent.sender);
        assert(sender_balance.token_id == intent.token_id);
        assert(recipient_balance.token_id == intent.token_id);
        assert(sender_balance.amount >= intent.amount);

        let updated_sender = TokenBalance {
            owner: sender_balance.owner,
            token_id: sender_balance.token_id,
            amount: sender_balance.amount - intent.amount,
        };
        let updated_recipient = TokenBalance {
            owner: recipient_balance.owner,
            token_id: recipient_balance.token_id,
            amount: recipient_balance.amount + intent.amount,
        };
        let receipt = PaymentReceipt {
            owner: intent.sender,
            sender: intent.sender,
            token_id: intent.token_id,
            amount: intent.amount,
            payment_id: payment_id,
            settled_at: settled_at,
        };
        return (updated_sender, updated_recipient, receipt);
    }

    transition settle_payment(
        intent: PaymentIntent,
        payment_id: field,
        settled_at: u64
    ) -> PaymentReceipt {
        return PaymentReceipt {
            owner: intent.sender,
            sender: intent.sender,
            token_id: intent.token_id,
            amount: intent.amount,
            payment_id: payment_id,
            settled_at: settled_at,
        };
    }

    transition cancel_payment(intent: PaymentIntent) -> address {
        assert(self.signer == intent.sender);
        return intent.sender;
    }
}
