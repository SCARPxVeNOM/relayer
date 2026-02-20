program envelop_invoice.aleo {
    @noupgrade
    async constructor() {}

    record Invoice {
        owner: address,
        creator: address,
        recipient: address,
        token_id: field,
        amount: u64,
        due_at: u64,
        status: u8,
        invoice_id: field,
        memo_hash: field,
    }

    record PaymentReceipt {
        owner: address,
        payer: address,
        payee: address,
        token_id: field,
        amount: u64,
        invoice_id: field,
        paid_at: u64,
    }

    transition create_invoice(
        recipient: address,
        token_id: field,
        amount: u64,
        due_at: u64,
        invoice_id: field,
        memo_hash: field
    ) -> Invoice {
        assert(amount > 0u64);

        return Invoice {
            owner: self.signer,
            creator: self.signer,
            recipient: recipient,
            token_id: token_id,
            amount: amount,
            due_at: due_at,
            status: 0u8,
            invoice_id: invoice_id,
            memo_hash: memo_hash,
        };
    }

    transition pay_invoice(
        invoice_id: field,
        payee: address,
        token_id: field,
        amount: u64,
        paid_at: u64
    ) -> PaymentReceipt {
        assert(amount > 0u64);
        return PaymentReceipt {
            owner: self.signer,
            payer: self.signer,
            payee: payee,
            token_id: token_id,
            amount: amount,
            invoice_id: invoice_id,
            paid_at: paid_at,
        };
    }

    transition cancel_invoice(invoice: Invoice) -> Invoice {
        assert(self.signer == invoice.creator);
        assert(invoice.status == 0u8);

        return Invoice {
            owner: invoice.owner,
            creator: invoice.creator,
            recipient: invoice.recipient,
            token_id: invoice.token_id,
            amount: invoice.amount,
            due_at: invoice.due_at,
            status: 2u8,
            invoice_id: invoice.invoice_id,
            memo_hash: invoice.memo_hash,
        };
    }
}
