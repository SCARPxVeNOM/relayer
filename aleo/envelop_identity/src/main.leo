program envelop_identity.aleo {
    @noupgrade
    async constructor() {}

    record UsernameClaim {
        owner: address,
        username_hash: field,
        display_name_hash: field,
        registered_at: u64,
        nonce: u64,
        claim_id: field,
    }

    transition register_username(
        username_hash: field,
        display_name_hash: field,
        registered_at: u64,
        nonce: u64
    ) -> UsernameClaim {
        assert(registered_at > 0u64);

        return UsernameClaim {
            owner: self.signer,
            username_hash: username_hash,
            display_name_hash: display_name_hash,
            registered_at: registered_at,
            nonce: nonce,
            claim_id: username_hash,
        };
    }
}
