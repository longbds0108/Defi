import { useEffect, useState } from 'react';
import { useAccount, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from 'wagmi';
import { erc20Abi, formatUnits, parseUnits, zeroAddress } from 'viem';
import ConnectCta from '../components/ConnectCta';
import TokenSelect from '../components/TokenSelect';
import { arcTestnet } from '../config/wagmi';
import { ARC_TESTNET_TOKENS, type Token } from '../config/tokens';
import {
  ARC_DEX_CHAIN_ID,
  ARC_SWAP_ROUTER,
  ARC_SWAP_FACTORY,
  ARC_SWAP_SLIPPAGE_BPS,
  arcRouterAbi,
  arcFactoryAbi,
  arcPairAbi,
  arcGasHeadroom,
} from '../config/arcDex';

type Phase = 'idle' | 'approvingA' | 'approvingB' | 'adding';
type PoolRaw = {
  ai: number;
  bi: number;
  pair?: `0x${string}`;
  reserveA?: bigint;
  reserveB?: bigint;
  totalSupply?: bigint;
  yourLP?: bigint;
};

const TOK = ARC_TESTNET_TOKENS;
const PAIRS: [number, number][] = [
  [0, 1], // USDC / EURC
  [0, 2], // USDC / cirBTC
  [1, 2], // EURC / cirBTC
];
const EXPLORER = arcTestnet.blockExplorers.default.url;
const FEE_TIER = '0.30%';

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
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
  if (/insufficient/i.test(msg)) return 'Insufficient balance.';
  return msg.length > 160 ? `${msg.slice(0, 160)}…` : msg;
}

export default function Pools() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: ARC_DEX_CHAIN_ID });
  const { writeContractAsync } = useWriteContract();

  const [pools, setPools] = useState<PoolRaw[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<'pools' | 'positions'>('pools');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const [tokenA, setTokenA] = useState<Token>(TOK[0]); // USDC
  const [tokenB, setTokenB] = useState<Token>(TOK[2]); // cirBTC
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string>();
  const [lastHash, setLastHash] = useState<string>();

  const onArc = chainId === ARC_DEX_CHAIN_ID;
  const busy = phase !== 'idle';

  // CoinGecko reference prices for USD valuation.
  useEffect(() => {
    let active = true;
    const ids = Array.from(new Set(TOK.map((t) => t.coingeckoId))).join(',');
    const load = async () => {
      try {
        const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`, { cache: 'no-store' });
        if (!res.ok || !active) return;
        const data = await res.json();
        if (!active) return;
        const next: Record<string, number> = {};
        for (const t of TOK) {
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

  // Load all pools (reserves + your LP) live.
  useEffect(() => {
    let active = true;
    if (!publicClient) return;
    (async () => {
      const results = await Promise.all(
        PAIRS.map(async ([ai, bi]): Promise<PoolRaw> => {
          const a = TOK[ai];
          const b = TOK[bi];
          try {
            const pair = (await publicClient.readContract({
              address: ARC_SWAP_FACTORY,
              abi: arcFactoryAbi,
              functionName: 'getPair',
              args: [a.address, b.address],
            })) as `0x${string}`;
            if (pair === zeroAddress) return { ai, bi };
            const [reserves, token0, totalSupply, yourLP] = await Promise.all([
              publicClient.readContract({ address: pair, abi: arcPairAbi, functionName: 'getReserves' }) as Promise<readonly [bigint, bigint, number]>,
              publicClient.readContract({ address: pair, abi: arcPairAbi, functionName: 'token0' }) as Promise<`0x${string}`>,
              publicClient.readContract({ address: pair, abi: erc20Abi, functionName: 'totalSupply' }) as Promise<bigint>,
              address
                ? (publicClient.readContract({ address: pair, abi: erc20Abi, functionName: 'balanceOf', args: [address] }) as Promise<bigint>)
                : Promise.resolve(0n),
            ]);
            const aIs0 = token0.toLowerCase() === a.address.toLowerCase();
            return { ai, bi, pair, reserveA: aIs0 ? reserves[0] : reserves[1], reserveB: aIs0 ? reserves[1] : reserves[0], totalSupply, yourLP };
          } catch {
            return { ai, bi };
          }
        }),
      );
      if (active) setPools(results);
    })();
    return () => {
      active = false;
    };
  }, [publicClient, address, lastHash]);

  const price = (sym: string) => prices[sym] ?? (sym === 'USDC' ? 1 : 0);
  const poolUsd = (p: PoolRaw): number => {
    if (p.reserveA == null || p.reserveB == null) return 0;
    const a = TOK[p.ai];
    const b = TOK[p.bi];
    return Number(formatUnits(p.reserveA, a.decimals)) * price(a.symbol) + Number(formatUnits(p.reserveB, b.decimals)) * price(b.symbol);
  };
  const yourUsd = (p: PoolRaw): number => {
    if (!p.yourLP || !p.totalSupply || p.totalSupply === 0n) return 0;
    return (poolUsd(p) * Number(p.yourLP)) / Number(p.totalSupply);
  };

  const tvl = pools.reduce((s, p) => s + poolUsd(p), 0);
  const activePools = pools.filter((p) => p.reserveA != null).length;
  const yourLiquidity = pools.reduce((s, p) => s + yourUsd(p), 0);

  const visiblePools = pools.filter((p) => {
    const a = TOK[p.ai];
    const b = TOK[p.bi];
    if (tab === 'positions' && !(p.yourLP && p.yourLP > 0n)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!a.symbol.toLowerCase().includes(q) && !b.symbol.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Balances for the modal form's selected tokens.
  const { data: balA, refetch: refetchA } = useReadContract({
    address: tokenA.address, abi: erc20Abi, functionName: 'balanceOf', args: address ? [address] : undefined,
    chainId: ARC_DEX_CHAIN_ID, query: { enabled: Boolean(address), refetchInterval: 15_000 },
  });
  const { data: balB, refetch: refetchB } = useReadContract({
    address: tokenB.address, abi: erc20Abi, functionName: 'balanceOf', args: address ? [address] : undefined,
    chainId: ARC_DEX_CHAIN_ID, query: { enabled: Boolean(address), refetchInterval: 15_000 },
  });

  const selected = pools.find((p) => {
    const a = TOK[p.ai].address;
    const b = TOK[p.bi].address;
    return (a === tokenA.address && b === tokenB.address) || (a === tokenB.address && b === tokenA.address);
  });
  const selExists = selected?.reserveA != null;
  let resForA: bigint | undefined;
  let resForB: bigint | undefined;
  if (selected && selExists) {
    if (TOK[selected.ai].address === tokenA.address) {
      resForA = selected.reserveA;
      resForB = selected.reserveB;
    } else {
      resForA = selected.reserveB;
      resForB = selected.reserveA;
    }
  }

  const clearStatus = () => {
    setLastHash(undefined);
    setError(undefined);
  };
  const onAmountA = (v: string) => {
    if (v !== '' && !/^\d*\.?\d*$/.test(v)) return;
    setAmountA(v);
    clearStatus();
    if (selExists && resForA && resForB && Number(v) > 0) {
      const b = (Number(v) * Number(formatUnits(resForB, tokenB.decimals))) / Number(formatUnits(resForA, tokenA.decimals));
      setAmountB(b > 0 ? String(Number(b.toFixed(tokenB.decimals))) : '');
    }
  };
  const onAmountB = (v: string) => {
    if (v !== '' && !/^\d*\.?\d*$/.test(v)) return;
    setAmountB(v);
    clearStatus();
    if (selExists && resForA && resForB && Number(v) > 0) {
      const a = (Number(v) * Number(formatUnits(resForA, tokenA.decimals))) / Number(formatUnits(resForB, tokenB.decimals));
      setAmountA(a > 0 ? String(Number(a.toFixed(tokenA.decimals))) : '');
    }
  };

  const openAdd = (p: PoolRaw) => {
    setTokenA(TOK[p.ai]);
    setTokenB(TOK[p.bi]);
    setAmountA('');
    setAmountB('');
    clearStatus();
    setModalOpen(true);
  };
  const closeModal = () => {
    if (!busy) setModalOpen(false);
  };

  const rawA = toRaw(amountA, tokenA.decimals);
  const rawB = toRaw(amountB, tokenB.decimals);
  const initialPrice =
    !selExists && Number(amountA) > 0 && Number(amountB) > 0
      ? `1 ${tokenA.symbol} = ${(Number(amountB) / Number(amountA)).toLocaleString('en-US', { maximumFractionDigits: 8 })} ${tokenB.symbol}`
      : undefined;

  async function ensureApprove(token: Token, raw: bigint, p: Phase) {
    if (!publicClient || !address) return;
    const allowance = (await publicClient.readContract({ address: token.address, abi: erc20Abi, functionName: 'allowance', args: [address, ARC_SWAP_ROUTER] })) as bigint;
    if (allowance >= raw) return;
    setPhase(p);
    const hash = await writeContractAsync({ address: token.address, abi: erc20Abi, functionName: 'approve', args: [ARC_SWAP_ROUTER, raw], chainId: ARC_DEX_CHAIN_ID, gas: 2_000_000n });
    await publicClient.waitForTransactionReceipt({ hash });
  }

  async function addLiquidity() {
    if (!publicClient || !address || !rawA || !rawB) return;
    const account = address;
    setError(undefined);
    setLastHash(undefined);
    try {
      await ensureApprove(tokenA, rawA, 'approvingA');
      await ensureApprove(tokenB, rawB, 'approvingB');
      setPhase('adding');
      const minA = rawA - (rawA * ARC_SWAP_SLIPPAGE_BPS) / 10_000n;
      const minB = rawB - (rawB * ARC_SWAP_SLIPPAGE_BPS) / 10_000n;
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200);
      const args = [tokenA.address, tokenB.address, rawA, rawB, minA, minB, account, deadline] as const;
      await publicClient.simulateContract({ account, address: ARC_SWAP_ROUTER, abi: arcRouterAbi, functionName: 'addLiquidity', args });
      let gas: bigint;
      try {
        gas = arcGasHeadroom(await publicClient.estimateContractGas({ account, address: ARC_SWAP_ROUTER, abi: arcRouterAbi, functionName: 'addLiquidity', args }));
      } catch {
        gas = arcGasHeadroom();
      }
      const hash = await writeContractAsync({ address: ARC_SWAP_ROUTER, abi: arcRouterAbi, functionName: 'addLiquidity', args, chainId: ARC_DEX_CHAIN_ID, gas });
      await publicClient.waitForTransactionReceipt({ hash });
      setLastHash(hash);
      setAmountA('');
      setAmountB('');
      refetchA();
      refetchB();
    } catch (e) {
      setError(mapError(e));
    } finally {
      setPhase('idle');
    }
  }

  const phaseLabel =
    phase === 'approvingA' ? `Approve ${tokenA.symbol}…`
    : phase === 'approvingB' ? `Approve ${tokenB.symbol}…`
    : phase === 'adding' ? 'Adding liquidity…'
    : 'Add liquidity';

  let action;
  if (!isConnected) {
    action = <ConnectCta className="swapbox__cta swapbox__cta--connect">Connect wallet</ConnectCta>;
  } else if (!onArc) {
    action = (
      <button type="button" className="swapbox__cta swapbox__cta--connect" onClick={() => switchChain?.({ chainId: ARC_DEX_CHAIN_ID })}>
        Switch to Arc Testnet
      </button>
    );
  } else if (!rawA || !rawB) {
    action = <button type="button" className="swapbox__cta" disabled>Enter both amounts</button>;
  } else {
    action = (
      <button type="button" className="swapbox__cta swapbox__cta--connect" onClick={addLiquidity} disabled={busy}>
        {phaseLabel}
      </button>
    );
  }

  return (
    <div className="pages-content">
      <div className="page-heading">
        <div>
          <p className="page-eyebrow">LIQUIDITY · ARC TESTNET</p>
          <h1>Liquidity / Pools</h1>
          <p className="page-intro">Provide liquidity via Arc Swap. Seed a pair's pool to enable swaps for it (e.g. USDC/cirBTC).</p>
        </div>
      </div>

      {/* Stats */}
      <section className="pools-stats" aria-label="Pool overview">
        <article className="ui-card metric-card"><span>Total TVL</span><strong>{tvl > 0 ? usd(tvl) : '$0.00'}</strong><small>Across all pools</small></article>
        <article className="ui-card metric-card"><span>Active pools</span><strong>{activePools}</strong><small>/ {PAIRS.length} supported pairs</small></article>
        <article className="ui-card metric-card"><span>Your liquidity</span><strong>{isConnected ? usd(yourLiquidity) : '—'}</strong><small>Your share</small></article>
      </section>

      {/* Toolbar */}
      <div className="pools-toolbar">
        <div className="pools-tabs">
          <button type="button" className={`pools-tab${tab === 'pools' ? ' is-active' : ''}`} onClick={() => setTab('pools')}>Pools</button>
          <button type="button" className={`pools-tab${tab === 'positions' ? ' is-active' : ''}`} onClick={() => setTab('positions')}>My Positions</button>
        </div>
        <div className="pools-toolbar__right">
          <label className="pools-search">
            <span aria-hidden="true">⌕</span>
            <input type="search" placeholder="Search pools" aria-label="Search pools" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <button type="button" className="pools-newbtn" onClick={() => setModalOpen(true)}>
            <span aria-hidden="true">+</span> New position
          </button>
        </div>
      </div>

      {/* Table */}
      <section className="ui-card section-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="pooltable-scroll">
          <div className="pooltable">
            <div className="pooltable__row pooltable__row--head">
              <span>#</span>
              <span>Pool</span>
              <span>Fee tier</span>
              <span className="pooltable__num">TVL</span>
              <span className="pooltable__num">APR</span>
              <span className="pooltable__num">24h Volume</span>
              <span className="pooltable__num">24h Fees</span>
              <span className="pooltable__right">Action</span>
            </div>

            {visiblePools.map((p, i) => {
              const a = TOK[p.ai];
              const b = TOK[p.bi];
              const exists = p.reserveA != null;
              return (
                <div className="pooltable__row" key={`${p.ai}-${p.bi}`}>
                  <span className="pooltable__idx">{i + 1}</span>
                  <div className="pooltable__pool">
                    <span className="pool-logos">
                      <img src={a.logo} alt="" width={32} height={32} />
                      <img src={b.logo} alt="" width={32} height={32} />
                    </span>
                    <div className="pooltable__name">
                      <b>{a.symbol}/{b.symbol}</b>
                      <small>Arc · {FEE_TIER} fee · {exists ? 'Arc Swap V2' : 'no pool yet'}</small>
                    </div>
                  </div>
                  <span><span className="fee-badge">{FEE_TIER}</span></span>
                  <span className="pooltable__num">{exists ? usd(poolUsd(p)) : '—'}</span>
                  <span className="pooltable__num pooltable__muted">—</span>
                  <span className="pooltable__num pooltable__muted">—</span>
                  <span className="pooltable__num pooltable__muted">—</span>
                  <span className="pooltable__right">
                    <button type="button" className={`addbtn${exists ? '' : ' addbtn--create'}`} onClick={() => openAdd(p)}>
                      <span aria-hidden="true">+</span> {exists ? 'Add' : 'Create'}
                    </button>
                  </span>
                </div>
              );
            })}

            {visiblePools.length === 0 && (
              <div className="pools-empty">{tab === 'positions' ? 'No positions yet — add liquidity to a pool.' : 'No pools match your search.'}</div>
            )}
          </div>
        </div>
      </section>
      <p className="pools-foot">APR, volume and fees need a subgraph/indexer — shown as “—” for now. TVL is live from pool reserves.</p>

      {/* Add-liquidity modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__head">
              <h2>Add liquidity</h2>
              <button type="button" className="modal__close" aria-label="Close" onClick={closeModal}>×</button>
            </div>
            <section className="swapbox" aria-label="Add liquidity">
              <div className="swapfield">
                <div className="swapfield__top"><span className="swapfield__label">Token A</span></div>
                <div className="swapbox__amount-row">
                  <input className="swapbox__amount" inputMode="decimal" placeholder="0" aria-label="Amount A" value={amountA} onChange={(e) => onAmountA(e.target.value)} />
                  <TokenSelect tokens={TOK.filter((t) => t.address !== tokenB.address)} selected={tokenA} onSelect={(t) => { setTokenA(t); setAmountA(''); setAmountB(''); clearStatus(); }} />
                </div>
                <div className="swapbox__balance">Balance <b>{isConnected && balA != null ? fmt(balA as bigint, tokenA.decimals) : '0'}</b></div>
              </div>

              <div className="swapbox__swapzone"><span className="swapbox__swap" aria-hidden="true">+</span></div>

              <div className="swapfield">
                <div className="swapfield__top"><span className="swapfield__label">Token B</span></div>
                <div className="swapbox__amount-row">
                  <input className="swapbox__amount" inputMode="decimal" placeholder="0" aria-label="Amount B" value={amountB} onChange={(e) => onAmountB(e.target.value)} />
                  <TokenSelect tokens={TOK.filter((t) => t.address !== tokenA.address)} selected={tokenB} onSelect={(t) => { setTokenB(t); setAmountA(''); setAmountB(''); clearStatus(); }} />
                </div>
                <div className="swapbox__balance">Balance <b>{isConnected && balB != null ? fmt(balB as bigint, tokenB.decimals) : '0'}</b></div>
              </div>

              {selExists && resForA && resForB ? (
                <p className="swapbox__rate">Current pool: {fmt(resForA, tokenA.decimals)} {tokenA.symbol} · {fmt(resForB, tokenB.decimals)} {tokenB.symbol} — add at this ratio.</p>
              ) : (
                <p className="swapbox__rate">Pool {tokenA.symbol}/{tokenB.symbol} does not exist yet — you create it &amp; set the initial price.</p>
              )}
              {initialPrice && <p className="swapbox__rate">Initial price: {initialPrice}</p>}

              {action}

              {error && <p className="swapbox__note swapbox__note--error">{error}</p>}
              {lastHash && (
                <p className="swapbox__note swapbox__note--ok">
                  Liquidity added — {tokenA.symbol}/{tokenB.symbol} is now swappable · <a href={`${EXPLORER}/tx/${lastHash}`} target="_blank" rel="noreferrer">explorer ↗</a>
                </p>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
