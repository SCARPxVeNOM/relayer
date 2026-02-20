import Database from "better-sqlite3";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("AppDB");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function now() {
  return Date.now();
}

function randomId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

class AppDatabase {
  constructor() {
    const dbPath = process.env.APP_DB_PATH || path.join(__dirname, "../../data/app.db");
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.db = new Database(dbPath);
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) {
      return;
    }

    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT NOT NULL UNIQUE,
        wallet_address TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS wallet_bindings (
        user_id INTEGER PRIMARY KEY,
        aleo_address TEXT NOT NULL UNIQUE,
        private_key_encrypted TEXT NOT NULL,
        view_key_encrypted TEXT NOT NULL,
        encryption_meta TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS auth_sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS otp_challenges (
        id TEXT PRIMARY KEY,
        phone TEXT NOT NULL,
        provider TEXT NOT NULL,
        provider_sid TEXT,
        code_hash TEXT,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS wallet_auth_challenges (
        id TEXT PRIMARY KEY,
        address_hint TEXT,
        message TEXT NOT NULL,
        nonce TEXT NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS asset_balances (
        user_id INTEGER NOT NULL,
        token_id TEXT NOT NULL,
        available_atomic TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, token_id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS yield_positions (
        user_id INTEGER NOT NULL,
        asset_id TEXT NOT NULL,
        token_id TEXT NOT NULL,
        reward_token_id TEXT NOT NULL,
        staked_atomic TEXT NOT NULL,
        unclaimed_atomic TEXT NOT NULL,
        last_accrual_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, asset_id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS yield_quotes (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        intent_json TEXT NOT NULL,
        plan_json TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS yield_actions (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        quote_id TEXT,
        action TEXT NOT NULL,
        status TEXT NOT NULL,
        aleo_tx_id TEXT,
        plan_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS swap_pools (
        pair_id TEXT PRIMARY KEY,
        token_a TEXT NOT NULL,
        token_b TEXT NOT NULL,
        reserve_a_atomic TEXT NOT NULL,
        reserve_b_atomic TEXT NOT NULL,
        fee_bps INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS swap_quotes (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token_in TEXT NOT NULL,
        token_out TEXT NOT NULL,
        amount_in_atomic TEXT NOT NULL,
        amount_out_atomic TEXT NOT NULL,
        rate TEXT NOT NULL,
        fee_bps INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS swaps (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        quote_id TEXT,
        token_in TEXT NOT NULL,
        token_out TEXT NOT NULL,
        amount_in_atomic TEXT NOT NULL,
        amount_out_atomic TEXT NOT NULL,
        rate TEXT NOT NULL,
        fee_bps INTEGER NOT NULL,
        status TEXT NOT NULL,
        aleo_tx_id TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS payments (
        id TEXT PRIMARY KEY,
        sender_user_id INTEGER NOT NULL,
        recipient_user_id INTEGER,
        recipient_phone TEXT,
        recipient_address TEXT,
        token_id TEXT NOT NULL,
        amount_atomic TEXT NOT NULL,
        note TEXT,
        status TEXT NOT NULL,
        aleo_tx_id TEXT,
        created_at INTEGER NOT NULL,
        paid_at INTEGER,
        FOREIGN KEY (sender_user_id) REFERENCES users(id),
        FOREIGN KEY (recipient_user_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        creator_user_id INTEGER NOT NULL,
        creator_address TEXT NOT NULL,
        recipient_user_id INTEGER,
        recipient_phone TEXT,
        recipient_address TEXT,
        token_id TEXT NOT NULL,
        amount_atomic TEXT NOT NULL,
        memo TEXT,
        due_at INTEGER,
        create_aleo_tx_id TEXT,
        status TEXT NOT NULL,
        payment_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (creator_user_id) REFERENCES users(id),
        FOREIGN KEY (recipient_user_id) REFERENCES users(id),
        FOREIGN KEY (payment_id) REFERENCES payments(id)
      );

      CREATE TABLE IF NOT EXISTS relay_submissions (
        id TEXT PRIMARY KEY,
        user_id INTEGER,
        client_tx_id TEXT,
        serialized_length INTEGER,
        aleo_tx_id TEXT,
        status TEXT NOT NULL,
        mode TEXT NOT NULL,
        response_json TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
      CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_challenges(phone);
      CREATE INDEX IF NOT EXISTS idx_wallet_auth_expires ON wallet_auth_challenges(expires_at);
      CREATE INDEX IF NOT EXISTS idx_yield_positions_user ON yield_positions(user_id);
      CREATE INDEX IF NOT EXISTS idx_yield_quotes_user ON yield_quotes(user_id);
      CREATE INDEX IF NOT EXISTS idx_yield_quotes_expires ON yield_quotes(expires_at);
      CREATE INDEX IF NOT EXISTS idx_yield_actions_user ON yield_actions(user_id);
      CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON swap_quotes(user_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_creator ON invoices(creator_user_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_recipient_user ON invoices(recipient_user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_sender ON payments(sender_user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_recipient_user ON payments(recipient_user_id);
    `);

    // Lightweight migrations for existing local DBs.
    this.ensureColumn("invoices", "create_aleo_tx_id", "TEXT");

    this.seedSwapPools();
    this.initialized = true;
    logger.info("App database initialized");
  }

  close() {
    this.db.close();
  }

  run(sql, params = []) {
    return this.db.prepare(sql).run(...params);
  }

  get(sql, params = []) {
    return this.db.prepare(sql).get(...params);
  }

  all(sql, params = []) {
    return this.db.prepare(sql).all(...params);
  }

  transaction(fn) {
    return this.db.transaction(fn);
  }

  cleanupExpired() {
    const ts = now();
    this.run(`DELETE FROM auth_sessions WHERE expires_at <= ?`, [ts]);
    this.run(`DELETE FROM otp_challenges WHERE expires_at <= ? AND status != 'verified'`, [ts]);
    this.run(`DELETE FROM wallet_auth_challenges WHERE expires_at <= ? AND status != 'verified'`, [ts]);
    this.run(`DELETE FROM yield_quotes WHERE expires_at <= ?`, [ts]);
    this.run(`DELETE FROM swap_quotes WHERE expires_at <= ?`, [ts]);
  }

  createOtpChallenge({ phone, provider, providerSid, codeHash, expiresAt, metadata }) {
    const id = randomId("otp");
    this.run(
      `
      INSERT INTO otp_challenges
      (id, phone, provider, provider_sid, code_hash, status, attempts, expires_at, created_at, metadata)
      VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?)
      `,
      [id, phone, provider, providerSid || null, codeHash || null, expiresAt, now(), JSON.stringify(metadata || {})]
    );
    return id;
  }

  getOtpChallenge(id) {
    return this.get(`SELECT * FROM otp_challenges WHERE id = ?`, [id]);
  }

  markOtpChallengeVerified(id) {
    this.run(`UPDATE otp_challenges SET status = 'verified' WHERE id = ?`, [id]);
  }

  incrementOtpAttempt(id) {
    this.run(`UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = ?`, [id]);
  }

  createWalletAuthChallenge({ challengeId, addressHint, message, nonce, expiresAt }) {
    const id = challengeId || randomId("wac");
    this.run(
      `
      INSERT INTO wallet_auth_challenges
      (id, address_hint, message, nonce, status, attempts, expires_at, created_at)
      VALUES (?, ?, ?, ?, 'pending', 0, ?, ?)
      `,
      [id, addressHint || null, message, nonce, expiresAt, now()]
    );
    return id;
  }

  getWalletAuthChallenge(id) {
    return this.get(`SELECT * FROM wallet_auth_challenges WHERE id = ?`, [id]);
  }

  markWalletAuthChallengeVerified(id) {
    this.run(`UPDATE wallet_auth_challenges SET status = 'verified' WHERE id = ?`, [id]);
  }

  incrementWalletAuthAttempt(id) {
    this.run(`UPDATE wallet_auth_challenges SET attempts = attempts + 1 WHERE id = ?`, [id]);
  }

  createOrGetUserByPhone(phone) {
    const existing = this.get(`SELECT * FROM users WHERE phone = ?`, [phone]);
    if (existing) {
      this.run(`UPDATE users SET updated_at = ? WHERE id = ?`, [now(), existing.id]);
      return this.get(`SELECT * FROM users WHERE id = ?`, [existing.id]);
    }

    this.run(`INSERT INTO users (phone, created_at, updated_at) VALUES (?, ?, ?)`, [phone, now(), now()]);
    return this.get(`SELECT * FROM users WHERE phone = ?`, [phone]);
  }

  createOrGetUserByWalletAddress(address) {
    const normalized = String(address || "").trim();
    if (!normalized) {
      throw new Error("Wallet address is required");
    }

    const existingByAddress = this.get(`SELECT * FROM users WHERE wallet_address = ?`, [normalized]);
    if (existingByAddress) {
      this.run(`UPDATE users SET updated_at = ? WHERE id = ?`, [now(), existingByAddress.id]);
      return this.get(`SELECT * FROM users WHERE id = ?`, [existingByAddress.id]);
    }

    // Preserve NOT NULL + UNIQUE requirement on users.phone for wallet-only accounts.
    const syntheticPhone = `wallet:${normalized}`;
    const existingBySyntheticPhone = this.get(`SELECT * FROM users WHERE phone = ?`, [syntheticPhone]);
    if (existingBySyntheticPhone) {
      this.run(
        `UPDATE users SET wallet_address = ?, updated_at = ? WHERE id = ?`,
        [normalized, now(), existingBySyntheticPhone.id]
      );
      return this.get(`SELECT * FROM users WHERE id = ?`, [existingBySyntheticPhone.id]);
    }

    this.run(
      `INSERT INTO users (phone, wallet_address, created_at, updated_at) VALUES (?, ?, ?, ?)`,
      [syntheticPhone, normalized, now(), now()]
    );
    return this.get(`SELECT * FROM users WHERE wallet_address = ?`, [normalized]);
  }

  getUserById(userId) {
    return this.get(`SELECT * FROM users WHERE id = ?`, [userId]);
  }

  getUserByPhone(phone) {
    return this.get(`SELECT * FROM users WHERE phone = ?`, [phone]);
  }

  getUserByAddress(address) {
    return this.get(`SELECT * FROM users WHERE wallet_address = ?`, [address]);
  }

  getWalletBindingByUserId(userId) {
    return this.get(`SELECT * FROM wallet_bindings WHERE user_id = ?`, [userId]);
  }

  bindWallet({
    userId,
    address,
    privateKeyEncrypted,
    viewKeyEncrypted,
    encryptionMeta,
  }) {
    const ts = now();
    this.run(
      `
      INSERT OR REPLACE INTO wallet_bindings
      (user_id, aleo_address, private_key_encrypted, view_key_encrypted, encryption_meta, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM wallet_bindings WHERE user_id = ?), ?), ?)
      `,
      [
        userId,
        address,
        privateKeyEncrypted,
        viewKeyEncrypted,
        JSON.stringify(encryptionMeta),
        userId,
        ts,
        ts,
      ]
    );

    this.run(`UPDATE users SET wallet_address = ?, updated_at = ? WHERE id = ?`, [address, ts, userId]);
  }

  createAuthSession(userId, ttlMs = 1000 * 60 * 60 * 24 * 30) {
    const token = crypto.randomBytes(32).toString("hex");
    const createdAt = now();
    const expiresAt = createdAt + ttlMs;
    this.run(
      `INSERT INTO auth_sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)`,
      [token, userId, expiresAt, createdAt]
    );
    return { token, expiresAt };
  }

  getSession(token) {
    return this.get(`SELECT * FROM auth_sessions WHERE token = ?`, [token]);
  }

  ensureInitialBalances(userId) {
    const defaults = [
      { tokenId: "ALEO", amount: "100000000" },
      { tokenId: "USDC", amount: "500000000" },
      { tokenId: "WETH", amount: "3000000000000000000" },
    ];

    for (const asset of defaults) {
      const exists = this.get(
        `SELECT user_id FROM asset_balances WHERE user_id = ? AND token_id = ?`,
        [userId, asset.tokenId]
      );
      if (!exists) {
        this.run(
          `INSERT INTO asset_balances (user_id, token_id, available_atomic, updated_at) VALUES (?, ?, ?, ?)`,
          [userId, asset.tokenId, asset.amount, now()]
        );
      }
    }
  }

  listBalances(userId) {
    return this.all(
      `SELECT token_id, available_atomic, updated_at FROM asset_balances WHERE user_id = ? ORDER BY token_id`,
      [userId]
    );
  }

  getBalanceAtomic(userId, tokenId) {
    const row = this.get(
      `SELECT available_atomic FROM asset_balances WHERE user_id = ? AND token_id = ?`,
      [userId, tokenId]
    );
    return row ? BigInt(row.available_atomic) : 0n;
  }

  upsertBalanceAtomic(userId, tokenId, amountAtomic) {
    this.run(
      `
      INSERT INTO asset_balances (user_id, token_id, available_atomic, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, token_id)
      DO UPDATE SET
        available_atomic = excluded.available_atomic,
        updated_at = excluded.updated_at
      `,
      [userId, tokenId, amountAtomic.toString(), now()]
    );
  }

  listYieldPositions(userId) {
    return this.all(
      `
      SELECT * FROM yield_positions
      WHERE user_id = ?
      ORDER BY asset_id ASC
      `,
      [userId]
    );
  }

  getYieldPosition(userId, assetId) {
    return this.get(
      `
      SELECT * FROM yield_positions
      WHERE user_id = ? AND asset_id = ?
      `,
      [userId, assetId]
    );
  }

  upsertYieldPosition({
    userId,
    assetId,
    tokenId,
    rewardTokenId,
    stakedAtomic,
    unclaimedAtomic,
    lastAccrualAt,
  }) {
    const ts = now();
    this.run(
      `
      INSERT INTO yield_positions
      (user_id, asset_id, token_id, reward_token_id, staked_atomic, unclaimed_atomic, last_accrual_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, asset_id)
      DO UPDATE SET
        token_id = excluded.token_id,
        reward_token_id = excluded.reward_token_id,
        staked_atomic = excluded.staked_atomic,
        unclaimed_atomic = excluded.unclaimed_atomic,
        last_accrual_at = excluded.last_accrual_at,
        updated_at = excluded.updated_at
      `,
      [
        userId,
        assetId,
        tokenId,
        rewardTokenId,
        stakedAtomic.toString(),
        unclaimedAtomic.toString(),
        lastAccrualAt,
        ts,
        ts,
      ]
    );
    return this.getYieldPosition(userId, assetId);
  }

  createYieldQuote({
    userId,
    action,
    intentJson,
    planJson,
    expiresAt,
  }) {
    const id = randomId("yquote");
    this.run(
      `
      INSERT INTO yield_quotes
      (id, user_id, action, intent_json, plan_json, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [id, userId, action, intentJson, planJson, expiresAt, now()]
    );
    return this.get(`SELECT * FROM yield_quotes WHERE id = ?`, [id]);
  }

  getYieldQuoteById(id) {
    return this.get(`SELECT * FROM yield_quotes WHERE id = ?`, [id]);
  }

  listYieldQuotes(userId, limit = 50) {
    return this.all(
      `
      SELECT * FROM yield_quotes
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [userId, limit]
    );
  }

  createYieldAction({
    userId,
    quoteId,
    action,
    status,
    aleoTxId,
    planJson,
  }) {
    const id = randomId("yaction");
    this.run(
      `
      INSERT INTO yield_actions
      (id, user_id, quote_id, action, status, aleo_tx_id, plan_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [id, userId, quoteId || null, action, status, aleoTxId || null, planJson, now()]
    );
    return this.get(`SELECT * FROM yield_actions WHERE id = ?`, [id]);
  }

  listYieldActions(userId, limit = 100) {
    return this.all(
      `
      SELECT * FROM yield_actions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [userId, limit]
    );
  }

  getSwapPool(tokenX, tokenY) {
    return this.get(
      `
      SELECT * FROM swap_pools
      WHERE (token_a = ? AND token_b = ?) OR (token_a = ? AND token_b = ?)
      `,
      [tokenX, tokenY, tokenY, tokenX]
    );
  }

  createSwapQuote(quote) {
    const id = randomId("quote");
    this.run(
      `
      INSERT INTO swap_quotes
      (id, user_id, token_in, token_out, amount_in_atomic, amount_out_atomic, rate, fee_bps, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        quote.userId,
        quote.tokenIn,
        quote.tokenOut,
        quote.amountInAtomic.toString(),
        quote.amountOutAtomic.toString(),
        quote.rate,
        quote.feeBps,
        quote.expiresAt,
        now(),
      ]
    );
    return this.get(`SELECT * FROM swap_quotes WHERE id = ?`, [id]);
  }

  getSwapQuoteById(id) {
    return this.get(`SELECT * FROM swap_quotes WHERE id = ?`, [id]);
  }

  updateSwapPool(pool) {
    this.run(
      `
      UPDATE swap_pools
      SET reserve_a_atomic = ?, reserve_b_atomic = ?, updated_at = ?
      WHERE pair_id = ?
      `,
      [pool.reserveA.toString(), pool.reserveB.toString(), now(), pool.pairId]
    );
  }

  createSwap({
    userId,
    quoteId,
    tokenIn,
    tokenOut,
    amountInAtomic,
    amountOutAtomic,
    rate,
    feeBps,
    aleoTxId,
  }) {
    const id = randomId("swap");
    this.run(
      `
      INSERT INTO swaps
      (id, user_id, quote_id, token_in, token_out, amount_in_atomic, amount_out_atomic, rate, fee_bps, status, aleo_tx_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)
      `,
      [
        id,
        userId,
        quoteId || null,
        tokenIn,
        tokenOut,
        amountInAtomic.toString(),
        amountOutAtomic.toString(),
        rate,
        feeBps,
        aleoTxId || null,
        now(),
      ]
    );
    return this.get(`SELECT * FROM swaps WHERE id = ?`, [id]);
  }

  listSwaps(userId, limit = 50) {
    return this.all(
      `
      SELECT * FROM swaps
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [userId, limit]
    );
  }

  createPayment({
    senderUserId,
    recipientUserId,
    recipientPhone,
    recipientAddress,
    tokenId,
    amountAtomic,
    note,
    status,
    aleoTxId,
  }) {
    const id = randomId("pay");
    const ts = now();
    this.run(
      `
      INSERT INTO payments
      (id, sender_user_id, recipient_user_id, recipient_phone, recipient_address, token_id, amount_atomic, note, status, aleo_tx_id, created_at, paid_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        senderUserId,
        recipientUserId || null,
        recipientPhone || null,
        recipientAddress || null,
        tokenId,
        amountAtomic.toString(),
        note || null,
        status,
        aleoTxId || null,
        ts,
        status === "completed" ? ts : null,
      ]
    );
    return this.get(`SELECT * FROM payments WHERE id = ?`, [id]);
  }

  listPayments(userId, limit = 100) {
    return this.all(
      `
      SELECT * FROM payments
      WHERE sender_user_id = ? OR recipient_user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [userId, userId, limit]
    );
  }

  createInvoice({
    creatorUserId,
    creatorAddress,
    recipientUserId,
    recipientPhone,
    recipientAddress,
    tokenId,
    amountAtomic,
    memo,
    dueAt,
    createAleoTxId,
  }) {
    const id = randomId("inv");
    const ts = now();
    this.run(
      `
      INSERT INTO invoices
      (id, creator_user_id, creator_address, recipient_user_id, recipient_phone, recipient_address, token_id, amount_atomic, memo, due_at, create_aleo_tx_id, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
      `,
      [
        id,
        creatorUserId,
        creatorAddress,
        recipientUserId || null,
        recipientPhone || null,
        recipientAddress || null,
        tokenId,
        amountAtomic.toString(),
        memo || null,
        dueAt || null,
        createAleoTxId || null,
        ts,
        ts,
      ]
    );
    return this.get(`SELECT * FROM invoices WHERE id = ?`, [id]);
  }

  listInvoicesForUser(user) {
    return this.all(
      `
      SELECT * FROM invoices
      WHERE creator_user_id = ?
         OR recipient_user_id = ?
         OR recipient_phone = ?
         OR recipient_address = ?
      ORDER BY created_at DESC
      LIMIT 200
      `,
      [user.id, user.id, user.phone, user.wallet_address || ""]
    );
  }

  getInvoiceById(id) {
    return this.get(`SELECT * FROM invoices WHERE id = ?`, [id]);
  }

  markInvoicePaid(invoiceId, paymentId) {
    this.run(
      `UPDATE invoices SET status = 'paid', payment_id = ?, updated_at = ? WHERE id = ?`,
      [paymentId, now(), invoiceId]
    );
  }

  createRelaySubmission({
    userId,
    clientTxId,
    serializedLength,
    aleoTxId,
    status,
    mode,
    responseJson,
  }) {
    const id = randomId("relay");
    this.run(
      `
      INSERT INTO relay_submissions
      (id, user_id, client_tx_id, serialized_length, aleo_tx_id, status, mode, response_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        userId || null,
        clientTxId || null,
        serializedLength || 0,
        aleoTxId || null,
        status,
        mode,
        responseJson ? JSON.stringify(responseJson) : null,
        now(),
      ]
    );
    return this.get(`SELECT * FROM relay_submissions WHERE id = ?`, [id]);
  }

  listRelaySubmissions(userId, limit = 50) {
    return this.all(
      `
      SELECT * FROM relay_submissions
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
      `,
      [userId, limit]
    );
  }

  seedSwapPools() {
    const nowTs = now();
    const defaults = [
      {
        pairId: "ALEO_USDC",
        tokenA: "ALEO",
        tokenB: "USDC",
        reserveAAtomic: "500000000000",
        reserveBAtomic: "750000000000",
        feeBps: 30,
      },
      {
        pairId: "ALEO_WETH",
        tokenA: "ALEO",
        tokenB: "WETH",
        reserveAAtomic: "900000000000",
        reserveBAtomic: "120000000000000000000",
        feeBps: 30,
      },
    ];

    for (const p of defaults) {
      const exists = this.get(`SELECT pair_id FROM swap_pools WHERE pair_id = ?`, [p.pairId]);
      if (!exists) {
        this.run(
          `
          INSERT INTO swap_pools
          (pair_id, token_a, token_b, reserve_a_atomic, reserve_b_atomic, fee_bps, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [p.pairId, p.tokenA, p.tokenB, p.reserveAAtomic, p.reserveBAtomic, p.feeBps, nowTs]
        );
      }
    }
  }

  ensureColumn(table, column, definition) {
    const cols = this.all(`PRAGMA table_info(${table})`);
    if (!cols.some((c) => c.name === column)) {
      this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      logger.info(`Added missing column ${table}.${column}`);
    }
  }
}

const appDb = new AppDatabase();
export default appDb;
