import appDb from "../storage/app.db.js";

function computeOutputAmount({ reserveIn, reserveOut, amountIn, feeBps }) {
  if (amountIn <= 0n) {
    throw new Error("Amount in must be greater than zero");
  }
  if (reserveIn <= 0n || reserveOut <= 0n) {
    throw new Error("Pool has insufficient liquidity");
  }

  const feeDenominator = 10_000n;
  const amountInWithFee = (amountIn * (feeDenominator - BigInt(feeBps))) / feeDenominator;
  if (amountInWithFee <= 0n) {
    throw new Error("Amount too small after fees");
  }

  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn + amountInWithFee;
  const amountOut = numerator / denominator;
  if (amountOut <= 0n || amountOut >= reserveOut) {
    throw new Error("Pool has insufficient liquidity for this trade size");
  }
  return { amountOut, amountInWithFee };
}

export function buildSwapQuote({ tokenIn, tokenOut, amountInAtomic, userId }) {
  const pool = appDb.getSwapPool(tokenIn, tokenOut);
  if (!pool) {
    throw new Error(`No pool found for ${tokenIn}/${tokenOut}`);
  }

  const direct = pool.token_a === tokenIn;
  const reserveIn = BigInt(direct ? pool.reserve_a_atomic : pool.reserve_b_atomic);
  const reserveOut = BigInt(direct ? pool.reserve_b_atomic : pool.reserve_a_atomic);
  const { amountOut } = computeOutputAmount({
    reserveIn,
    reserveOut,
    amountIn: amountInAtomic,
    feeBps: pool.fee_bps,
  });

  const rate = Number(amountOut) / Number(amountInAtomic);
  const expiresAt = Date.now() + 60_000;

  return appDb.createSwapQuote({
    userId,
    tokenIn,
    tokenOut,
    amountInAtomic,
    amountOutAtomic: amountOut,
    rate: Number.isFinite(rate) ? rate.toFixed(12) : "0",
    feeBps: pool.fee_bps,
    expiresAt,
  });
}

export function executeSwap({
  userId,
  quote,
  maxSlippageBps,
  aleoTxId,
}) {
  const currentPool = appDb.getSwapPool(quote.token_in, quote.token_out);
  if (!currentPool) {
    throw new Error("Swap pool no longer exists");
  }

  const direct = currentPool.token_a === quote.token_in;
  const reserveIn = BigInt(direct ? currentPool.reserve_a_atomic : currentPool.reserve_b_atomic);
  const reserveOut = BigInt(direct ? currentPool.reserve_b_atomic : currentPool.reserve_a_atomic);
  const amountIn = BigInt(quote.amount_in_atomic);
  const quotedOut = BigInt(quote.amount_out_atomic);
  const slippageBps = BigInt(maxSlippageBps ?? 100);
  const minOut = (quotedOut * (10_000n - slippageBps)) / 10_000n;

  const { amountOut } = computeOutputAmount({
    reserveIn,
    reserveOut,
    amountIn,
    feeBps: currentPool.fee_bps,
  });

  if (amountOut < minOut) {
    throw new Error("Swap quote expired due to slippage. Please request a new quote.");
  }

  const userInBalance = appDb.getBalanceAtomic(userId, quote.token_in);
  if (userInBalance < amountIn) {
    throw new Error(`Insufficient ${quote.token_in} balance`);
  }

  const runSwap = appDb.transaction(() => {
    appDb.upsertBalanceAtomic(userId, quote.token_in, userInBalance - amountIn);
    const userOutBalance = appDb.getBalanceAtomic(userId, quote.token_out);
    appDb.upsertBalanceAtomic(userId, quote.token_out, userOutBalance + amountOut);

    let newReserveA = BigInt(currentPool.reserve_a_atomic);
    let newReserveB = BigInt(currentPool.reserve_b_atomic);

    if (direct) {
      newReserveA += amountIn;
      newReserveB -= amountOut;
    } else {
      newReserveB += amountIn;
      newReserveA -= amountOut;
    }

    appDb.updateSwapPool({
      pairId: currentPool.pair_id,
      reserveA: newReserveA,
      reserveB: newReserveB,
    });

    return appDb.createSwap({
      userId,
      quoteId: quote.id,
      tokenIn: quote.token_in,
      tokenOut: quote.token_out,
      amountInAtomic: amountIn,
      amountOutAtomic: amountOut,
      rate: (Number(amountOut) / Number(amountIn)).toFixed(12),
      feeBps: currentPool.fee_bps,
      aleoTxId,
    });
  });

  return runSwap();
}

