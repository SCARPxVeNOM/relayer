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

    record VaultState {
        owner: address,
        strategy_id: field,
        token_id: field,
        staked_total: u64,
        reward_pool: u64,
    }

    record StakePosition {
        owner: address,
        strategy_id: field,
        token_id: field,
        staked_amount: u64,
        unclaimed_rewards: u64,
        last_updated_at: u64,
    }

    record TokenBalance {
        owner: address,
        token_id: field,
        amount: u64,
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

    transition init_vault(
        strategy_id: field,
        token_id: field,
        staked_total: u64,
        reward_pool: u64
    ) -> VaultState {
        return VaultState {
            owner: self.signer,
            strategy_id: strategy_id,
            token_id: token_id,
            staked_total: staked_total,
            reward_pool: reward_pool,
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

    transition stake_onchain(
        vault: VaultState,
        position: StakePosition,
        user_balance: TokenBalance,
        amount: u64,
        min_apy_bps: u64,
        nonce: u64,
        updated_at: u64
    ) -> (VaultState, StakePosition, TokenBalance, StakeReceipt) {
        assert(amount > 0u64);
        assert(user_balance.owner == self.signer);
        assert(user_balance.token_id == vault.token_id);
        assert(user_balance.amount >= amount);
        assert(position.owner == self.signer);
        assert(position.strategy_id == vault.strategy_id);

        let updated_vault = VaultState {
            owner: vault.owner,
            strategy_id: vault.strategy_id,
            token_id: vault.token_id,
            staked_total: vault.staked_total + amount,
            reward_pool: vault.reward_pool,
        };
        let updated_position = StakePosition {
            owner: position.owner,
            strategy_id: position.strategy_id,
            token_id: position.token_id,
            staked_amount: position.staked_amount + amount,
            unclaimed_rewards: position.unclaimed_rewards,
            last_updated_at: updated_at,
        };
        let updated_balance = TokenBalance {
            owner: user_balance.owner,
            token_id: user_balance.token_id,
            amount: user_balance.amount - amount,
        };
        let receipt = StakeReceipt {
            owner: self.signer,
            strategy_id: vault.strategy_id,
            token_id: vault.token_id,
            amount: amount,
            min_apy_bps: min_apy_bps,
            nonce: nonce,
        };
        return (updated_vault, updated_position, updated_balance, receipt);
    }

    transition unstake_onchain(
        vault: VaultState,
        position: StakePosition,
        user_balance: TokenBalance,
        amount: u64,
        min_out: u64,
        nonce: u64,
        updated_at: u64
    ) -> (VaultState, StakePosition, TokenBalance, UnstakeReceipt) {
        assert(amount > 0u64);
        assert(min_out > 0u64);
        assert(min_out <= amount);
        assert(position.owner == self.signer);
        assert(position.staked_amount >= amount);
        assert(vault.staked_total >= amount);
        assert(user_balance.owner == self.signer);
        assert(user_balance.token_id == vault.token_id);

        let updated_vault = VaultState {
            owner: vault.owner,
            strategy_id: vault.strategy_id,
            token_id: vault.token_id,
            staked_total: vault.staked_total - amount,
            reward_pool: vault.reward_pool,
        };
        let updated_position = StakePosition {
            owner: position.owner,
            strategy_id: position.strategy_id,
            token_id: position.token_id,
            staked_amount: position.staked_amount - amount,
            unclaimed_rewards: position.unclaimed_rewards,
            last_updated_at: updated_at,
        };
        let updated_balance = TokenBalance {
            owner: user_balance.owner,
            token_id: user_balance.token_id,
            amount: user_balance.amount + min_out,
        };
        let receipt = UnstakeReceipt {
            owner: self.signer,
            strategy_id: vault.strategy_id,
            token_id: vault.token_id,
            amount: amount,
            min_out: min_out,
            nonce: nonce,
        };
        return (updated_vault, updated_position, updated_balance, receipt);
    }

    transition claim_onchain(
        vault: VaultState,
        position: StakePosition,
        reward_balance: TokenBalance,
        amount: u64,
        claimed_at: u64,
        nonce: u64
    ) -> (VaultState, StakePosition, TokenBalance, ClaimReceipt) {
        assert(amount > 0u64);
        assert(position.owner == self.signer);
        assert(position.unclaimed_rewards >= amount);
        assert(vault.reward_pool >= amount);
        assert(reward_balance.owner == self.signer);

        let updated_vault = VaultState {
            owner: vault.owner,
            strategy_id: vault.strategy_id,
            token_id: vault.token_id,
            staked_total: vault.staked_total,
            reward_pool: vault.reward_pool - amount,
        };
        let updated_position = StakePosition {
            owner: position.owner,
            strategy_id: position.strategy_id,
            token_id: position.token_id,
            staked_amount: position.staked_amount,
            unclaimed_rewards: position.unclaimed_rewards - amount,
            last_updated_at: claimed_at,
        };
        let updated_reward_balance = TokenBalance {
            owner: reward_balance.owner,
            token_id: reward_balance.token_id,
            amount: reward_balance.amount + amount,
        };
        let receipt = ClaimReceipt {
            owner: self.signer,
            strategy_id: vault.strategy_id,
            reward_token_id: reward_balance.token_id,
            amount: amount,
            claimed_at: claimed_at,
            nonce: nonce,
        };
        return (updated_vault, updated_position, updated_reward_balance, receipt);
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

    transition rebalance_onchain(
        source_position: StakePosition,
        target_position: StakePosition,
        rebalance_id: field,
        token_id: field,
        portfolio_value: u64,
        moved_amount: u64,
        nonce: u64,
        updated_at: u64
    ) -> (StakePosition, StakePosition, RebalanceReceipt) {
        assert(portfolio_value > 0u64);
        assert(moved_amount > 0u64);
        assert(moved_amount <= portfolio_value);
        assert(source_position.owner == self.signer);
        assert(target_position.owner == self.signer);
        assert(source_position.staked_amount >= moved_amount);
        assert(source_position.token_id == token_id);
        assert(target_position.token_id == token_id);

        let updated_source = StakePosition {
            owner: source_position.owner,
            strategy_id: source_position.strategy_id,
            token_id: source_position.token_id,
            staked_amount: source_position.staked_amount - moved_amount,
            unclaimed_rewards: source_position.unclaimed_rewards,
            last_updated_at: updated_at,
        };
        let updated_target = StakePosition {
            owner: target_position.owner,
            strategy_id: target_position.strategy_id,
            token_id: target_position.token_id,
            staked_amount: target_position.staked_amount + moved_amount,
            unclaimed_rewards: target_position.unclaimed_rewards,
            last_updated_at: updated_at,
        };
        let receipt = RebalanceReceipt {
            owner: self.signer,
            rebalance_id: rebalance_id,
            token_id: token_id,
            portfolio_value: portfolio_value,
            moved_amount: moved_amount,
            nonce: nonce,
        };
        return (updated_source, updated_target, receipt);
    }
}
