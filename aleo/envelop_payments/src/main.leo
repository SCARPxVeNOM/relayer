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

