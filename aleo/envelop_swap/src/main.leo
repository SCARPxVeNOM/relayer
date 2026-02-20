program envelop_swap.aleo {
    @noupgrade
    async constructor() {}

    record SwapRequest {
        owner: address,
        token_in: field,
        token_out: field,
        amount_in: u64,
        min_amount_out: u64,
        quote_hash: field,
        nonce: u64,
    }

    record SwapReceipt {
        owner: address,
        token_in: field,
        token_out: field,
        amount_in: u64,
        amount_out: u64,
        fee_paid: u64,
        rate_x1e6: u64,
        executed_at: u64,
    }

    transition create_swap_request(
        token_in: field,
        token_out: field,
        amount_in: u64,
        min_amount_out: u64,
        quote_hash: field,
        nonce: u64
    ) -> SwapRequest {
        assert(amount_in > 0u64);
        assert(min_amount_out > 0u64);

        return SwapRequest {
            owner: self.signer,
            token_in: token_in,
            token_out: token_out,
            amount_in: amount_in,
            min_amount_out: min_amount_out,
            quote_hash: quote_hash,
            nonce: nonce,
        };
    }

    transition settle_swap(
        request: SwapRequest,
        amount_out: u64,
        fee_paid: u64,
        rate_x1e6: u64,
        executed_at: u64
    ) -> SwapReceipt {
        assert(amount_out >= request.min_amount_out);

        return SwapReceipt {
            owner: request.owner,
            token_in: request.token_in,
            token_out: request.token_out,
            amount_in: request.amount_in,
            amount_out: amount_out,
            fee_paid: fee_paid,
            rate_x1e6: rate_x1e6,
            executed_at: executed_at,
        };
    }

    transition cancel_swap(request: SwapRequest) -> address {
        assert(self.signer == request.owner);
        return request.owner;
    }
}

