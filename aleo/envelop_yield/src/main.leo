program envelop_yield.aleo {
    @noupgrade
    async constructor() {}

    record StakeReceipt {
        owner: address,
        strategy_id: field,
        token_id: field,
        amount: u64,
        min_apy_bps: u64,
        nonce: u64,
    }

    record UnstakeReceipt {
        owner: address,
        strategy_id: field,
        token_id: field,
        amount: u64,
        min_out: u64,
        nonce: u64,
    }

    record ClaimReceipt {
        owner: address,
        strategy_id: field,
        reward_token_id: field,
        amount: u64,
        claimed_at: u64,
        nonce: u64,
    }

    record RebalanceReceipt {
        owner: address,
        rebalance_id: field,
        token_id: field,
        portfolio_value: u64,
        moved_amount: u64,
        nonce: u64,
    }

    transition stake(
        strategy_id: field,
        token_id: field,
        amount: u64,
        min_apy_bps: u64,
        nonce: u64
    ) -> StakeReceipt {
        assert(amount > 0u64);

        return StakeReceipt {
            owner: self.signer,
            strategy_id: strategy_id,
            token_id: token_id,
            amount: amount,
            min_apy_bps: min_apy_bps,
            nonce: nonce,
        };
    }

    transition unstake(
        strategy_id: field,
        token_id: field,
        amount: u64,
        min_out: u64,
        nonce: u64
    ) -> UnstakeReceipt {
        assert(amount > 0u64);
        assert(min_out > 0u64);
        assert(min_out <= amount);

        return UnstakeReceipt {
            owner: self.signer,
            strategy_id: strategy_id,
            token_id: token_id,
            amount: amount,
            min_out: min_out,
            nonce: nonce,
        };
    }

    transition claim(
        strategy_id: field,
        reward_token_id: field,
        amount: u64,
        claimed_at: u64,
        nonce: u64
    ) -> ClaimReceipt {
        assert(amount > 0u64);

        return ClaimReceipt {
            owner: self.signer,
            strategy_id: strategy_id,
            reward_token_id: reward_token_id,
            amount: amount,
            claimed_at: claimed_at,
            nonce: nonce,
        };
    }

    transition rebalance(
        rebalance_id: field,
        token_id: field,
        portfolio_value: u64,
        moved_amount: u64,
        nonce: u64
    ) -> RebalanceReceipt {
        assert(portfolio_value > 0u64);
        assert(moved_amount > 0u64);
        assert(moved_amount <= portfolio_value);

        return RebalanceReceipt {
            owner: self.signer,
            rebalance_id: rebalance_id,
            token_id: token_id,
            portfolio_value: portfolio_value,
            moved_amount: moved_amount,
            nonce: nonce,
        };
    }
}
