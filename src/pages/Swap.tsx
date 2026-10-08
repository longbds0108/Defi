import { useEffect, useState } from 'react';
import { useAccount, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from 'wagmi';
import { erc20Abi, formatUnits, parseUnits } from 'viem';
import ConnectCta from '../components/ConnectCta';
import TokenSelect from '../components/TokenSelect';
import { arcTestnet } from '../config/wagmi';
import { ARC_TESTNET_TOKENS, type Token } from '../config/tokens';
import {
  ARC_DEX_CHAIN_ID,
  ARC_SWAP_ROUTER,
  ARC_SWAP_SLIPPAGE_BPS,
  arcRouterAbi,
  arcGasHeadroom,
} from '../config/arcDex';
import { initSwapTicker } from '../landing/swapTicker';

type Phase = 'idle' | 'approving' | 'swapping';
type SwapRecord = { ts: number; payAmount: string; paySymbol: string; recvAmount: string; recvSymbol: string; hash: string };

const EXPLORER = arcTestnet.blockExplorers.default.url;
const USDC_ADDR = ARC_TESTNET_TOKENS[0].address; // routing hub

const symbolOf = (addr: string) =>
  ARC_TESTNET_TOKENS.find((t) => t.address.toLowerCase() === addr.toLowerCase())?.symbol ?? `${addr.slice(0, 6)}…`;

// Candidate paths: direct, plus a hop through USDC when neither side is USDC.
function buildPaths(inAddr: `0x${string}`, outAddr: `0x${string}`): `0x${string}`[][] {
  const paths: `0x${string}`[][] = [[inAddr, outAddr]];
  const u = USDC_ADDR.toLowerCase();
  if (inAddr.toLowerCase() !== u && outAddr.toLowerCase() !== u) paths.push([inAddr, USDC_ADDR, outAddr]);
  return paths;
}

function fmt(value: bigint, decimals: number) {
  return Number(formatUnits(value, decimals)).toLocaleString('en-US', { maximumFractionDigits: 6 });
}

function toRaw(human: string, decimals: number): bigint | undefined {
  if (!human || Number.isNaN(Number(human)) || Number(human) <= 0) return undefined;
  try {
    return parseUnits(human, decimals);
  } catch {
    return undefined;
  }
}

function mapError(e: unknown): string {
  const msg = (e as { shortMessage?: string; message?: string })?.shortMessage ?? (e as Error)?.message ?? 'Transaction failed';
  if (/rejected|denied|user rejected/i.test(msg)) return 'Transaction cancelled in your wallet.';
  if (/insufficient/i.test(msg)) return 'Insufficient balance or liquidity.';
  return msg.length > 160 ? `${msg.slice(0, 160)}…` : msg;
}

export default function Swap() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: ARC_DEX_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();

  const [payToken, setPayToken] = useState<Token>(ARC_TESTNET_TOKENS[0]);
  const [receiveToken, setReceiveToken] = useState<Token>(ARC_TESTNET_TOKENS[1]);
  const [amountIn, setAmountIn] = useState('');
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [quoteOut, setQuoteOut] = useState<bigint>();
  const [routePath, setRoutePath] = useState<`0x${string}`[]>();
  const [quoting, setQuoting] = useState(false);
  const [noPool, setNoPool] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string>();
  const [lastHash, setLastHash] = useState<string>();
  const [history, setHistory] = useState<SwapRecord[]>([]);

  const onArc = chainId === ARC_DEX_CHAIN_ID;
  const amountNum = Number(amountIn);

  useEffect(() => {
    initSwapTicker();
    try {
      const raw = localStorage.getItem('hedgora.swaps');
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  // CoinGecko reference prices (fallback when a pair has no pool).
  useEffect(() => {
    let active = true;
    const ids = Array.from(new Set(ARC_TESTNET_TOKENS.map((t) => t.coingeckoId))).join(',');
    const load = async () => {
      try {
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`, { cache: 'no-store' });
        if (!res.ok || !active) return;
        const data = await res.json();
        if (!active) return;
        const next: Record<string, number> = {};
        for (const t of ARC_TESTNET_TOKENS) {
          const p = data?.[t.coingeckoId]?.usd;
          if (typeof p === 'number') next[t.symbol] = p;
        }
        setPrices(next);
      } catch {
        /* keep last prices */
      }
    };
    load();
    const id = window.setInterval(load, 60_000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  // Real balance of the selected pay token, read from Arc Testnet.
  const { data: balanceRaw, refetch: refetchBalance } = useReadContract({
    address: payToken.address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: ARC_DEX_CHAIN_ID,
    query: { enabled: Boolean(address), refetchInterval: 15_000 },
  });
  const balanceText = isConnected && balanceRaw != null ? fmt(balanceRaw as bigint, payToken.decimals) : '0';

  // Live on-chain quote — best of the direct path and the route through USDC.
  useEffect(() => {
    setQuoteOut(undefined);
    setRoutePath(undefined);
    setNoPool(false);
    if (!publicClient || payToken.address === receiveToken.address) return;
    const raw = toRaw(amountIn, payToken.decimals);
    if (!raw) return;
    let active = true;
    setQuoting(true);
    const timer = window.setTimeout(async () => {
      try {
        const paths = buildPaths(payToken.address, receiveToken.address);
        const quotes = await Promise.all(
          paths.map(async (path) => {
            try {
              const amounts = (await publicClient.readContract({
                address: ARC_SWAP_ROUTER,
                abi: arcRouterAbi,
                functionName: 'getAmountsOut',
                args: [raw, path],
              })) as readonly bigint[];
              return { path, out: amounts[amounts.length - 1] };
            } catch {
              return null;
            }
          }),
        );
        if (!active) return;
        const valid = quotes.filter((q): q is { path: `0x${string}`[]; out: bigint } => q != null && q.out > 0n);
        if (valid.length === 0) {
          setNoPool(true);
          return;
        }
        const best = valid.reduce((a, b) => (b.out > a.out ? b : a));
        setQuoteOut(best.out);
        setRoutePath(best.path);
      } catch {
        if (active) setNoPool(true);
      } finally {
        if (active) setQuoting(false);
      }
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [payToken, receiveToken, amountIn, publicClient]);

  // Reference estimate (used only when there is no pool).
  const payUsd = prices[payToken.symbol];
  const recvUsd = prices[receiveToken.symbol];
  const refOut = payUsd && recvUsd && amountNum > 0 ? (amountNum * payUsd) / recvUsd : undefined;

  const amountOutText =
    quoteOut != null
      ? fmt(quoteOut, receiveToken.decimals)
      : noPool && refOut != null
        ? refOut.toLocaleString('en-US', { maximumFractionDigits: 6 })
        : quoting
          ? '…'
          : '';

  const rateText =
    quoteOut != null && amountNum > 0
      ? `1 ${payToken.symbol} ≈ ${(Number(formatUnits(quoteOut, receiveToken.decimals)) / amountNum).toLocaleString('en-US', { maximumFractionDigits: 6 })} ${receiveToken.symbol} · pool Arc Swap`
      : noPool && payUsd && recvUsd
        ? `1 ${payToken.symbol} ≈ ${(payUsd / recvUsd).toLocaleString('en-US', { maximumFractionDigits: 6 })} ${receiveToken.symbol} · reference`
        : undefined;

  const routeLabel = routePath && routePath.length > 2 ? routePath.map(symbolOf).join(' → ') : undefined;

  const payTokens = ARC_TESTNET_TOKENS.filter((t) => t.address !== receiveToken.address);
  const receiveTokens = ARC_TESTNET_TOKENS.filter((t) => t.address !== payToken.address);

  const onAmountChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmountIn(value);
      setLastHash(undefined);
      setError(undefined);
    }
  };

  const applyPct = (pct: number) => {
    if (balanceRaw == null) return;
    const amount = (Number(formatUnits(balanceRaw as bigint, payToken.decimals)) * pct) / 100;
    setAmountIn(amount > 0 ? String(Number(amount.toFixed(6))) : '0');
  };

  const reverse = () => {
    setPayToken(receiveToken);
    setReceiveToken(payToken);
    setAmountIn('');
  };

  const pushHistory = (record: SwapRecord) =>
    setHistory((prev) => {
      const next = [record, ...prev].slice(0, 8);
      try {
        localStorage.setItem('hedgora.swaps', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });

  async function executeSwap() {
    if (!publicClient || !address || quoteOut == null || !routePath) return;
    const raw = toRaw(amountIn, payToken.decimals);
    if (!raw) return;
    const account = address;
    const path = routePath;
    setError(undefined);
    setLastHash(undefined);
    try {
      // 1) Allowance → approve router if needed.
      const allowance = (await publicClient.readContract({
        address: payToken.address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [account, ARC_SWAP_ROUTER],
      })) as bigint;
      if (allowance < raw) {
        setPhase('approving');
        const approveHash = await writeContractAsync({
          address: payToken.address,
          abi: erc20Abi,
          functionName: 'approve',
          args: [ARC_SWAP_ROUTER, raw],
          chainId: ARC_DEX_CHAIN_ID,
          gas: 2_000_000n,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      // 2) Swap exact tokens for tokens (with slippage + deadline).
      setPhase('swapping');
      const minOut = quoteOut - (quoteOut * ARC_SWAP_SLIPPAGE_BPS) / 10_000n;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
      const args = [raw, minOut, [...path], account, deadline] as const;

      await publicClient.simulateContract({
        account,
        address: ARC_SWAP_ROUTER,
        abi: arcRouterAbi,
        functionName: 'swapExactTokensForTokens',
        args,
      });
      let gas: bigint;
      try {
        gas = arcGasHeadroom(
          await publicClient.estimateContractGas({
            account,
            address: ARC_SWAP_ROUTER,
            abi: arcRouterAbi,
            functionName: 'swapExactTokensForTokens',
            args,
          }),
        );
      } catch {
        gas = arcGasHeadroom();
      }
      const hash = await writeContractAsync({
        address: ARC_SWAP_ROUTER,
        abi: arcRouterAbi,
        functionName: 'swapExactTokensForTokens',
        args,
        chainId: ARC_DEX_CHAIN_ID,
        gas,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      pushHistory({
        ts: Date.now(),
        payAmount: amountIn,
        paySymbol: payToken.symbol,
        recvAmount: amountOutText || '—',
        recvSymbol: receiveToken.symbol,
        hash,
      });
      setLastHash(hash);
      setAmountIn('');
      refetchBalance();
    } catch (e) {
      setError(mapError(e));
    } finally {
      setPhase('idle');
    }
  }

  const phaseLabel = phase === 'approving' ? 'Approve in wallet…' : phase === 'swapping' ? 'Swapping…' : 'Swap';

  let action;
  if (!isConnected) {
    action = <ConnectCta className="swapbox__cta swapbox__cta--connect">Connect wallet</ConnectCta>;
  } else if (!onArc) {
    action = (
      <button type="button" className="swapbox__cta swapbox__cta--connect" onClick={() => switchChain?.({ chainId: ARC_DEX_CHAIN_ID })}>
        Switch to Arc Testnet
      </button>
    );
  } else if (!(amountNum > 0)) {
    action = <button type="button" className="swapbox__cta" disabled>Enter an amount</button>;
  } else if (quoting) {
    action = <button type="button" className="swapbox__cta" disabled>Fetching quote…</button>;
  } else if (quoteOut == null) {
    action = <button type="button" className="swapbox__cta" disabled>No route on Arc Swap</button>;
  } else {
    action = (
      <button type="button" className="swapbox__cta swapbox__cta--connect" onClick={executeSwap} disabled={phase !== 'idle'}>
        {phaseLabel}
      </button>
    );
  }

  return (
    <div className="swap-page">
      <div className="swap-ticker" aria-label="Top 40 cryptocurrency markets by market capitalization">
        <div className="swap-ticker__track" id="swapTickerTrack"></div>
      </div>

      <div className="swap-layout">
        <div className="swap-main">
          <section className="swapbox" aria-label="Swap">
            {/* You pay */}
            <div className="swapfield">
              <div className="swapfield__top">
                <span className="swapfield__label">You pay</span>
                <div className="swapbox__pcts">
                  <button type="button" className="swapbox__pct" onClick={() => applyPct(25)}>25%</button>
                  <button type="button" className="swapbox__pct" onClick={() => applyPct(50)}>50%</button>
                  <button type="button" className="swapbox__pct" onClick={() => applyPct(75)}>75%</button>
                </div>
              </div>
              <div className="swapbox__amount-row">
                <input
                  className="swapbox__amount"
                  inputMode="decimal"
                  placeholder="0"
                  aria-label="Amount to pay"
                  value={amountIn}
                  onChange={(e) => onAmountChange(e.target.value)}
                />
                <TokenSelect tokens={payTokens} selected={payToken} onSelect={setPayToken} />
              </div>
              <div className="swapbox__balance">Balance <b>{balanceText}</b></div>
            </div>

            {/* Swap direction */}
            <div className="swapbox__swapzone">
              <button type="button" className="swapbox__swap" aria-label="Switch tokens" onClick={reverse}>↓</button>
            </div>

            {/* You receive */}
            <div className="swapfield">
              <div className="swapfield__top">
                <span className="swapfield__label">You receive</span>
              </div>
              <div className="swapbox__amount-row">
                <input
                  className="swapbox__amount"
                  inputMode="decimal"
                  placeholder="0"
                  aria-label="Estimated amount to receive"
                  value={amountOutText}
                  readOnly
                />
                <TokenSelect tokens={receiveTokens} selected={receiveToken} onSelect={setReceiveToken} />
              </div>
              {rateText && <p className="swapbox__rate">{rateText}</p>}
              {routeLabel && <p className="swapbox__rate">Route: {routeLabel}</p>}
            </div>

            {/* Action */}
            {action}

            {noPool && amountNum > 0 && (
              <p className="swapbox__note">No Arc Swap route for this pair (needs a USDC pool on each side) — showing a reference price only.</p>
            )}
            {error && <p className="swapbox__note swapbox__note--error">{error}</p>}
            {lastHash && (
              <p className="swapbox__note swapbox__note--ok">
                Swap successful · <a href={`${EXPLORER}/tx/${lastHash}`} target="_blank" rel="noreferrer">view on explorer ↗</a>
              </p>
            )}
          </section>
        </div>

        <aside className="swap-side">
          <div className="swap-history-box">
            <h3>Swap history</h3>
            {history.length > 0 ? (
              <div className="swap-history">
                {history.map((h) => (
                  <div key={h.hash} className="swap-history__row">
                    <div className="swap-history__pair">
                      <span>{h.payAmount} {h.paySymbol}</span>
                      <span className="swap-history__arrow" aria-hidden="true">→</span>
                      <span>{h.recvAmount} {h.recvSymbol}</span>
                    </div>
                    <a href={`${EXPLORER}/tx/${h.hash}`} target="_blank" rel="noreferrer">{h.hash.slice(0, 8)}… ↗</a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="swap-history-empty">
                <span className="empty-orb" aria-hidden="true">✳</span>
                <strong>No swaps yet</strong>
                <p>Your swaps will appear here.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
