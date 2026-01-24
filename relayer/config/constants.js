/**
 * Application constants
 */

export const ALEO_PROGRAM_ID = "privacy_box_mvp.aleo";
export const ALEO_ENDPOINT = process.env.ALEO_RPC || "https://api.explorer.provable.com/v1";
export const ALEO_NETWORK = "testnet3";

export const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || "10000"); // 10 seconds
export const MAX_RETRIES = parseInt(process.env.MAX_RETRIES || "3");
export const RETRY_DELAY = parseInt(process.env.RETRY_DELAY || "2000"); // 2 seconds

export const SUPPORTED_CHAINS = [11155111, 80002]; // ETH Sepolia, Polygon Amoy

