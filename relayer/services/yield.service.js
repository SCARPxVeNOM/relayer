import appDb from "../storage/app.db.js";
import { getTokenById } from "./assets.catalog.js";
import { getYieldAssetById, listYieldAssetsByToken } from "./yield.catalog.js";

const BPS_DENOM = 10_000n;
const YEAR_SECONDS = 365n * 24n * 60n * 60n;
const YIELD_QUOTE_TTL_MS = 90_000;
const YIELD_PROGRAM_ID = process.env.ALEO_YIELD_PROGRAM_ID || "envelop_yield.aleo";
const TOKEN_FIELD_MAP = {
  ALEO: "1field",
  USDC: "2field",
  WETH: "3field",
};

function nowMs() {
  return Date.now();
}

function ensurePositiveAmount(amountAtomic) {
  if (amountAtomic <= 0n) {
    throw new Error("Amount must be greater than zero");
  }
}

function tokenToField(tokenId) {
  const field = TOKEN_FIELD_MAP[String(tokenId || "").toUpperCase()];
  if (!field) {
    throw new Error(`Unsupported token field mapping for ${tokenId}`);
  }
  return field;
}

function toU64Literal(value) {
  const v = BigInt(value);
  if (v < 0n) {
    throw new Error("u64 input cannot be negative");
  }
  return `${v}u64`;
}

function hashToField(input) {
  let hash = 1469598103934665603n;
  const prime = 1099511628211n;
  const mod = 2n ** 64n;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= BigInt(input.charCodeAt(i));
    hash = (hash * prime) % mod;
  }
  return `${hash}field`;
}

function normalizeAction(action) {
  const normalized = String(action || "").toLowerCase().trim();
  if (!["stake", "unstake", "claim", "rebalance"].includes(normalized)) {
    throw new Error("action must be one of: stake, unstake, claim, rebalance");
  }
  return normalized;
}

function calculateAccrued(stakedAtomic, apyBps, elapsedSec) {
  if (stakedAtomic <= 0n || elapsedSec <= 0n || apyBps <= 0) {
    return 0n;
  }
  return (stakedAtomic * BigInt(apyBps) * elapsedSec) / (BPS_DENOM * YEAR_SECONDS);
}

function normalizePositionRow(row) {
  if (!row) return null;
  return {
    userId: row.user_id,
    assetId: row.asset_id,
    tokenId: row.token_id,
    rewardTokenId: row.reward_token_id,
    stakedAtomic: BigInt(row.staked_atomic),
    unclaimedAtomic: BigInt(row.unclaimed_atomic),
    lastAccrualAt: Number(row.last_accrual_at),
  };
}

function accrueSinglePosition(row, nowTs) {
  const asset = getYieldAssetById(row.asset_id);
  if (!asset) return row;

  const current = normalizePositionRow(row);
  const elapsedSec = BigInt(Math.max(0, Math.floor((nowTs - current.lastAccrualAt) / 1000)));
  if (elapsedSec <= 0n) return row;

  const accrued = calculateAccrued(current.stakedAtomic, asset.apyBps, elapsedSec);
  if (accrued <= 0n) {
    appDb.upsertYieldPosition({
      userId: current.userId,
      assetId: current.assetId,
      tokenId: current.tokenId,
      rewardTokenId: current.rewardTokenId,
      stakedAtomic: current.stakedAtomic,
      unclaimedAtomic: current.unclaimedAtomic,
      lastAccrualAt: nowTs,
    });
    return appDb.getYieldPosition(current.userId, current.assetId);
  }

  appDb.upsertYieldPosition({
    userId: current.userId,
    assetId: current.assetId,
    tokenId: current.tokenId,
    rewardTokenId: current.rewardTokenId,
    stakedAtomic: current.stakedAtomic,
    unclaimedAtomic: current.unclaimedAtomic + accrued,
    lastAccrualAt: nowTs,
  });
  return appDb.getYieldPosition(current.userId, current.assetId);
}

export function syncYieldAccrual(userId) {
  const nowTs = nowMs();
  const rows = appDb.listYieldPositions(userId);
  for (const row of rows) {
    accrueSinglePosition(row, nowTs);
  }
  return appDb.listYieldPositions(userId);
}

function sumBigInts(values) {
  return values.reduce((acc, v) => acc + BigInt(v), 0n);
}

function makeTransition(functionName, inputs) {
  return {
    programId: YIELD_PROGRAM_ID,
    functionName,
    inputs,
  };
}

function buildStakePlan({ asset, amountAtomic }) {
  const nonce = BigInt(nowMs());
  return {
    action: "stake",
    steps: [
      {
        type: "stake",
        assetId: asset.id,
        tokenId: asset.tokenId,
        rewardTokenId: asset.rewardTokenId,
        amountAtomic: amountAtomic.toString(),
        apyBps: asset.apyBps,
        riskLevel: asset.riskLevel,
      },
    ],
    transitions: [
      makeTransition("stake", [
        asset.strategyField,
        tokenToField(asset.tokenId),
        toU64Literal(amountAtomic),
        toU64Literal(asset.minApyBps),
        toU64Literal(nonce),
      ]),
    ],
  };
}

function buildUnstakePlan({ asset, amountAtomic }) {
  const exitFeeAtomic = (amountAtomic * BigInt(asset.exitFeeBps)) / BPS_DENOM;
  const minOutAtomic = amountAtomic - exitFeeAtomic;
  const nonce = BigInt(nowMs());
  return {
    action: "unstake",
    steps: [
      {
        type: "unstake",
        assetId: asset.id,
        tokenId: asset.tokenId,
        rewardTokenId: asset.rewardTokenId,
        amountAtomic: amountAtomic.toString(),
        exitFeeBps: asset.exitFeeBps,
        minOutAtomic: minOutAtomic.toString(),
      },
    ],
    transitions: [
      makeTransition("unstake", [
        asset.strategyField,
        tokenToField(asset.tokenId),
        toU64Literal(amountAtomic),
        toU64Literal(minOutAtomic),
        toU64Literal(nonce),
      ]),
    ],
  };
}

function buildClaimPlan({ claimRows }) {
  let nonce = BigInt(nowMs());
  const steps = [];
  const transitions = [];
  for (const row of claimRows) {
    const asset = getYieldAssetById(row.asset_id);
    if (!asset) continue;

    const claimAtomic = BigInt(row.unclaimed_atomic);
    if (claimAtomic <= 0n) continue;

    steps.push({
      type: "claim",
      assetId: asset.id,
      tokenId: asset.tokenId,
      rewardTokenId: asset.rewardTokenId,
      amountAtomic: claimAtomic.toString(),
    });
    transitions.push(
      makeTransition("claim", [
        asset.strategyField,
        tokenToField(asset.rewardTokenId),
        toU64Literal(claimAtomic),
        toU64Literal(Math.floor(nowMs() / 1000)),
        toU64Literal(nonce),
      ])
    );
    nonce += 1n;
  }

  return {
    action: "claim",
    steps,
    transitions,
  };
}

function normalizeTargetWeights(targetWeights) {
  if (!targetWeights || typeof targetWeights !== "object" || Array.isArray(targetWeights)) {
    throw new Error("targetWeights must be an object map of assetId -> weight");
  }
  const entries = Object.entries(targetWeights).map(([assetId, weight]) => [assetId, Number(weight)]);
  if (entries.length < 2) {
    throw new Error("Rebalance requires at least 2 target assets");
  }
  for (const [, weight] of entries) {
    if (!Number.isFinite(weight) || weight < 0) {
      throw new Error("Each target weight must be a positive number");
    }
  }
  const total = entries.reduce((acc, [, weight]) => acc + weight, 0);
  if (Math.abs(total - 1) > 0.0001) {
    throw new Error("targetWeights must sum to 1");
  }
  return entries;
}

function buildRebalancePlan({ userId, targetWeights }) {
  const entries = normalizeTargetWeights(targetWeights);
  const assets = entries.map(([assetId]) => getYieldAssetById(assetId));
  if (assets.some((asset) => !asset)) {
    throw new Error("One or more target assets are unsupported");
  }

  const tokenId = assets[0].tokenId;
  if (assets.some((asset) => asset.tokenId !== tokenId)) {
    throw new Error("Rebalance currently supports assets with the same underlying token");
  }

  const currentRows = entries.map(([assetId]) => appDb.getYieldPosition(userId, assetId));
  const currentByAsset = new Map();
  for (const row of currentRows) {
    if (!row) continue;
    currentByAsset.set(row.asset_id, BigInt(row.staked_atomic));
  }

  const currentTotal = sumBigInts(entries.map(([assetId]) => currentByAsset.get(assetId) || 0n));
  if (currentTotal <= 0n) {
    throw new Error("No existing staked balance in selected assets to rebalance");
  }

  let assigned = 0n;
  const targets = new Map();
  for (let i = 0; i < entries.length; i += 1) {
    const [assetId, weight] = entries[i];
    if (i === entries.length - 1) {
      targets.set(assetId, currentTotal - assigned);
      continue;
    }
    const target = (currentTotal * BigInt(Math.floor(weight * 1_000_000))) / 1_000_000n;
    targets.set(assetId, target);
    assigned += target;
  }

  const steps = [];
  let totalDrift = 0n;
  for (const [assetId] of entries) {
    const asset = getYieldAssetById(assetId);
    const current = currentByAsset.get(assetId) || 0n;
    const target = targets.get(assetId) || 0n;
    if (target === current) continue;

    if (target > current) {
      const delta = target - current;
      steps.push({
        type: "stake",
        assetId,
        tokenId: asset.tokenId,
        rewardTokenId: asset.rewardTokenId,
        amountAtomic: delta.toString(),
        apyBps: asset.apyBps,
        riskLevel: asset.riskLevel,
      });
      totalDrift += delta;
    } else {
      const delta = current - target;
      const exitFeeAtomic = (delta * BigInt(asset.exitFeeBps)) / BPS_DENOM;
      const minOutAtomic = delta - exitFeeAtomic;
      steps.push({
        type: "unstake",
        assetId,
        tokenId: asset.tokenId,
        rewardTokenId: asset.rewardTokenId,
        amountAtomic: delta.toString(),
        exitFeeBps: asset.exitFeeBps,
        minOutAtomic: minOutAtomic.toString(),
      });
      totalDrift += delta;
    }
  }

  if (steps.length === 0) {
    throw new Error("Portfolio is already aligned with target weights");
  }

  const targetHash = hashToField(JSON.stringify(entries.sort((a, b) => a[0].localeCompare(b[0]))));
  const rebalanceNonce = BigInt(nowMs());
  return {
    action: "rebalance",
    tokenId,
    steps,
    transitions: [
      makeTransition("rebalance", [
        hashToField(`rebalance:${userId}:${rebalanceNonce}`),
        tokenToField(tokenId),
        toU64Literal(currentTotal),
        toU64Literal(totalDrift),
        toU64Literal(rebalanceNonce),
      ]),
      makeTransition("rebalance", [
        targetHash,
        tokenToField(tokenId),
        toU64Literal(currentTotal),
        toU64Literal(Math.max(1, steps.length)),
        toU64Literal(rebalanceNonce + 1n),
      ]),
    ],
  };
}

function formatAssetForResponse(asset, userPosition) {
  const token = getTokenById(asset.tokenId);
  const rewardToken = getTokenById(asset.rewardTokenId);
  const stakedAtomic = userPosition ? BigInt(userPosition.staked_atomic) : 0n;
  const unclaimedAtomic = userPosition ? BigInt(userPosition.unclaimed_atomic) : 0n;
  const projectedYearlyRewardAtomic = (stakedAtomic * BigInt(asset.apyBps)) / BPS_DENOM;

  return {
    id: asset.id,
    name: asset.name,
    protocol: asset.protocol,
    strategyType: asset.strategyType,
    riskLevel: asset.riskLevel,
    tokenId: asset.tokenId,
    tokenSymbol: token?.symbol || asset.tokenId,
    rewardTokenId: asset.rewardTokenId,
    rewardTokenSymbol: rewardToken?.symbol || asset.rewardTokenId,
    apyBps: asset.apyBps,
    minApyBps: asset.minApyBps,
    maxApyBps: asset.maxApyBps,
    lockupDays: asset.lockupDays,
    exitFeeBps: asset.exitFeeBps,
    capacityAtomic: asset.capacityAtomic,
    position: {
      stakedAtomic: stakedAtomic.toString(),
      unclaimedAtomic: unclaimedAtomic.toString(),
      projectedYearlyRewardAtomic: projectedYearlyRewardAtomic.toString(),
    },
  };
}

export function getYieldAssets({ userId, tokenId }) {
  syncYieldAccrual(userId);
  const positions = appDb.listYieldPositions(userId);
  const byAsset = new Map(positions.map((row) => [row.asset_id, row]));
  const assets = listYieldAssetsByToken(tokenId).map((asset) => formatAssetForResponse(asset, byAsset.get(asset.id)));
  const quotes = appDb.listYieldQuotes(userId, 20);
  const actions = appDb.listYieldActions(userId, 30);

  return {
    assets,
    positions,
    quotes,
    actions,
  };
}

export function buildYieldQuote({ userId, intent }) {
  const action = normalizeAction(intent.action);
  syncYieldAccrual(userId);

  let plan;
  if (action === "stake") {
    const asset = getYieldAssetById(intent.assetId);
    if (!asset) {
      throw new Error("Unsupported yield asset");
    }
    const amountAtomic = BigInt(intent.amountAtomic);
    ensurePositiveAmount(amountAtomic);

    const userBalance = appDb.getBalanceAtomic(userId, asset.tokenId);
    if (userBalance < amountAtomic) {
      throw new Error(`Insufficient ${asset.tokenId} balance`);
    }
    plan = buildStakePlan({ asset, amountAtomic });
  } else if (action === "unstake") {
    const asset = getYieldAssetById(intent.assetId);
    if (!asset) {
      throw new Error("Unsupported yield asset");
    }
    const amountAtomic = BigInt(intent.amountAtomic);
    ensurePositiveAmount(amountAtomic);

    const position = appDb.getYieldPosition(userId, asset.id);
    const staked = position ? BigInt(position.staked_atomic) : 0n;
    if (staked < amountAtomic) {
      throw new Error("Unstake amount exceeds current staked balance");
    }
    plan = buildUnstakePlan({ asset, amountAtomic });
  } else if (action === "claim") {
    let claimRows = appDb.listYieldPositions(userId).filter((row) => BigInt(row.unclaimed_atomic) > 0n);
    if (intent.assetId) {
      claimRows = claimRows.filter((row) => row.asset_id === intent.assetId);
    }
    if (claimRows.length === 0) {
      throw new Error("No claimable rewards for selected asset(s)");
    }
    plan = buildClaimPlan({ claimRows });
  } else if (action === "rebalance") {
    plan = buildRebalancePlan({
      userId,
      targetWeights: intent.targetWeights,
    });
  } else {
    throw new Error("Unsupported yield action");
  }

  const expiresAt = nowMs() + YIELD_QUOTE_TTL_MS;
  const quote = appDb.createYieldQuote({
    userId,
    action,
    intentJson: JSON.stringify(intent),
    planJson: JSON.stringify(plan),
    expiresAt,
  });

  return {
    id: quote.id,
    action: quote.action,
    expiresAt: quote.expires_at,
    createdAt: quote.created_at,
    plan,
  };
}

function executeStakeStep(userId, step, nowTs) {
  const asset = getYieldAssetById(step.assetId);
  const amountAtomic = BigInt(step.amountAtomic);
  const balance = appDb.getBalanceAtomic(userId, asset.tokenId);
  if (balance < amountAtomic) {
    throw new Error(`Insufficient ${asset.tokenId} balance while staking`);
  }

  appDb.upsertBalanceAtomic(userId, asset.tokenId, balance - amountAtomic);
  const existing = normalizePositionRow(appDb.getYieldPosition(userId, asset.id));
  const stakedAtomic = (existing?.stakedAtomic || 0n) + amountAtomic;
  const unclaimedAtomic = existing?.unclaimedAtomic || 0n;
  appDb.upsertYieldPosition({
    userId,
    assetId: asset.id,
    tokenId: asset.tokenId,
    rewardTokenId: asset.rewardTokenId,
    stakedAtomic,
    unclaimedAtomic,
    lastAccrualAt: nowTs,
  });
}

function executeUnstakeStep(userId, step, nowTs) {
  const asset = getYieldAssetById(step.assetId);
  const amountAtomic = BigInt(step.amountAtomic);
  const existing = normalizePositionRow(appDb.getYieldPosition(userId, asset.id));
  if (!existing || existing.stakedAtomic < amountAtomic) {
    throw new Error(`Insufficient staked balance for ${asset.id}`);
  }

  const exitFeeAtomic = (amountAtomic * BigInt(asset.exitFeeBps)) / BPS_DENOM;
  const returnedAtomic = amountAtomic - exitFeeAtomic;
  const balance = appDb.getBalanceAtomic(userId, asset.tokenId);
  appDb.upsertBalanceAtomic(userId, asset.tokenId, balance + returnedAtomic);

  appDb.upsertYieldPosition({
    userId,
    assetId: asset.id,
    tokenId: asset.tokenId,
    rewardTokenId: asset.rewardTokenId,
    stakedAtomic: existing.stakedAtomic - amountAtomic,
    unclaimedAtomic: existing.unclaimedAtomic,
    lastAccrualAt: nowTs,
  });
}

function executeClaimStep(userId, step, nowTs) {
  const asset = getYieldAssetById(step.assetId);
  const claimAtomic = BigInt(step.amountAtomic);
  const existing = normalizePositionRow(appDb.getYieldPosition(userId, asset.id));
  if (!existing || existing.unclaimedAtomic < claimAtomic) {
    throw new Error(`Claim amount exceeds unclaimed rewards for ${asset.id}`);
  }

  const balance = appDb.getBalanceAtomic(userId, asset.rewardTokenId);
  appDb.upsertBalanceAtomic(userId, asset.rewardTokenId, balance + claimAtomic);
  appDb.upsertYieldPosition({
    userId,
    assetId: asset.id,
    tokenId: asset.tokenId,
    rewardTokenId: asset.rewardTokenId,
    stakedAtomic: existing.stakedAtomic,
    unclaimedAtomic: existing.unclaimedAtomic - claimAtomic,
    lastAccrualAt: nowTs,
  });
}

export function solveYieldQuote({ userId, quote, aleoTxId }) {
  if (!quote) {
    throw new Error("Yield quote not found");
  }
  if (quote.expires_at <= nowMs()) {
    throw new Error("Yield quote expired");
  }

  syncYieldAccrual(userId);
  const plan = JSON.parse(quote.plan_json);
  if (!plan?.steps || !Array.isArray(plan.steps)) {
    throw new Error("Invalid yield plan");
  }

  const nowTs = nowMs();
  const execute = appDb.transaction(() => {
    for (const step of plan.steps) {
      if (step.type === "stake") {
        executeStakeStep(userId, step, nowTs);
      } else if (step.type === "unstake") {
        executeUnstakeStep(userId, step, nowTs);
      } else if (step.type === "claim") {
        executeClaimStep(userId, step, nowTs);
      } else {
        throw new Error(`Unsupported plan step type: ${step.type}`);
      }
    }

    return appDb.createYieldAction({
      userId,
      quoteId: quote.id,
      action: plan.action || quote.action,
      status: "completed",
      aleoTxId,
      planJson: JSON.stringify(plan),
    });
  });

  const action = execute();
  return {
    action,
    plan,
    positions: appDb.listYieldPositions(userId),
    balances: appDb.listBalances(userId),
  };
}

