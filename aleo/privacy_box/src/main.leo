// Privacy Box - Multi-Chain Privacy Barrier MVP
// This program enables private cross-chain transfers

program privacy_box_mvp.aleo {
    // Constructor required for deployment
    // The constructor allows you to manage program upgrades.
    // It is currently configured to **prevent** upgrades.
    @noupgrade
    async constructor() {}

// Vault record to store user's private balance
record Vault {
    owner: address,
    balance: u64,
}

// Initialize a new vault with initial balance
transition init(owner: address, amount: u64) -> Vault {
    return Vault { 
        owner: owner, 
        balance: amount 
    };
}

// Request a private cross-chain transfer
// All parameters except vault are private (amount, chain_id, destination)
// Note: dest is Aleo address format; relayer converts to target chain format
transition request_transfer(
    vault: Vault,
    private amount: u64,
    private chain_id: u8,
    private dest: address
) -> Vault {
    // Ensure sufficient balance
    assert(vault.balance >= amount);
    
    // Return updated vault with reduced balance
    return Vault {
        owner: vault.owner,
        balance: vault.balance - amount
    };
}

// Get vault balance (public view)
transition get_balance(vault: Vault) -> u64 {
    return vault.balance;
}

}

