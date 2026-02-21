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

    record TokenBalance {
        owner: address,
        token_id: field,
        amount: u64,
    }

    record PoolState {
        owner: address,
        token_a: field,
        token_b: field,
        reserve_a: u64,
        reserve_b: u64,
        fee_bps: u16,
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

    transition init_pool(
        token_a: field,
        token_b: field,
        reserve_a: u64,
        reserve_b: u64,
        fee_bps: u16
    ) -> PoolState {
        assert(token_a != token_b);
        assert(reserve_a > 0u64);
        assert(reserve_b > 0u64);

        return PoolState {
            owner: self.signer,
            token_a: token_a,
            token_b: token_b,
            reserve_a: reserve_a,
            reserve_b: reserve_b,
            fee_bps: fee_bps,
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

    transition settle_swap_onchain(
        request: SwapRequest,
        user_in: TokenBalance,
        user_out: TokenBalance,
        pool: PoolState,
        amount_out: u64,
        fee_paid: u64,
        rate_x1e6: u64,
        executed_at: u64
    ) -> (TokenBalance, TokenBalance, PoolState, SwapReceipt) {
        assert(user_in.owner == request.owner);
        assert(user_in.token_id == request.token_in);
        assert(user_out.owner == request.owner);
        assert(user_out.token_id == request.token_out);
        assert(user_in.amount >= request.amount_in);
        assert(amount_out >= request.min_amount_out);

        let is_forward: bool = pool.token_a == request.token_in;
        assert(is_forward || pool.token_b == request.token_in);

        if is_forward {
            assert(pool.token_b == request.token_out);
            assert(pool.reserve_b >= amount_out);

            let updated_in = TokenBalance {
                owner: user_in.owner,
                token_id: user_in.token_id,
                amount: user_in.amount - request.amount_in,
            };
            let updated_out = TokenBalance {
                owner: user_out.owner,
                token_id: user_out.token_id,
                amount: user_out.amount + amount_out,
            };
            let updated_pool = PoolState {
                owner: pool.owner,
                token_a: pool.token_a,
                token_b: pool.token_b,
                reserve_a: pool.reserve_a + request.amount_in,
                reserve_b: pool.reserve_b - amount_out,
                fee_bps: pool.fee_bps,
            };
            let receipt = SwapReceipt {
                owner: request.owner,
                token_in: request.token_in,
                token_out: request.token_out,
                amount_in: request.amount_in,
                amount_out: amount_out,
                fee_paid: fee_paid,
                rate_x1e6: rate_x1e6,
                executed_at: executed_at,
            };
            return (updated_in, updated_out, updated_pool, receipt);
        } else {
            assert(pool.token_a == request.token_out);
            assert(pool.reserve_a >= amount_out);

            let updated_in = TokenBalance {
                owner: user_in.owner,
                token_id: user_in.token_id,
                amount: user_in.amount - request.amount_in,
            };
            let updated_out = TokenBalance {
                owner: user_out.owner,
                token_id: user_out.token_id,
                amount: user_out.amount + amount_out,
            };
            let updated_pool = PoolState {
                owner: pool.owner,
                token_a: pool.token_a,
                token_b: pool.token_b,
                reserve_a: pool.reserve_a - amount_out,
                reserve_b: pool.reserve_b + request.amount_in,
                fee_bps: pool.fee_bps,
            };
            let receipt = SwapReceipt {
                owner: request.owner,
                token_in: request.token_in,
                token_out: request.token_out,
                amount_in: request.amount_in,
                amount_out: amount_out,
                fee_paid: fee_paid,
                rate_x1e6: rate_x1e6,
                executed_at: executed_at,
            };
            return (updated_in, updated_out, updated_pool, receipt);
        }
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
