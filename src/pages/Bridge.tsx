import { useState } from 'react';
import { useAccount, useReadContract, useSwitchChain, useWriteContract } from 'wagmi';
import { createPublicClient, erc20Abi, formatUnits, http, parseUnits, type Chain } from 'viem';
import { sepolia, baseSepolia } from 'wagmi/chains';
import ConnectCta from '../components/ConnectCta';
import NetworkSelect from '../components/NetworkSelect';
import { arcTestnet } from '../config/wagmi';
import {
  CCTP_CHAINS,
  TOKEN_MESSENGER,
  MESSAGE_TRANSMITTER,
  USDC_DECIMALS,
  STANDARD_FINALITY,
  ZERO_BYTES32,
  addressToBytes32,
  fetchAttestation,
  tokenMessengerAbi,
  messageTransmitterAbi,
  type Attestation,
  type CctpChain,
} from '../config/cctp';

type Phase = 'idle' | 'switching' | 'approving' | 'burning' | 'attesting' | 'minting' | 'done';

const CHAIN_OBJS: Record<number, Chain> = {
  5042002: arcTestnet as unknown as Chain,
  11155111: sepolia,
  84532: baseSepolia,
};
const EXPLORERS: Record<number, string> = {
  5042002: 'https://explorer.testnet.arc.io',
  11155111: 'https://sepolia.etherscan.io',
  84532: 'https://sepolia.basescan.org',
};

function clientFor(chainId: number) {
  return createPublicClient({ chain: CHAIN_OBJS[chainId], transport: http() });
}
function fmt(value: bigint) {
  return Number(formatUnits(value, USDC_DECIMALS)).toLocaleString('en-US', { maximumFractionDigits: 6 });
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function mapError(e: unknown): string {
  const msg = (e as { shortMessage?: string; message?: string })?.shortMessage ?? (e as Error)?.message ?? 'Transaction failed';
  if (/rejected|denied|user rejected/i.test(msg)) return 'Transaction cancelled in your wallet.';
  if (/insufficient/i.test(msg)) return 'Insufficient USDC balance.';
  return msg.length > 160 ? `${msg.slice(0, 160)}…` : msg;
}

export default function Bridge() {
  const { address, isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [fromChain, setFromChain] = useState<CctpChain>(CCTP_CHAINS[1]); // Ethereum Sepolia
  const [toChain, setToChain] = useState<CctpChain>(CCTP_CHAINS[0]); // Arc Testnet
  const [amount, setAmount] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [attestTries, setAttestTries] = useState(0);
  const [burnHash, setBurnHash] = useState<string>();
  const [mintHash, setMintHash] = useState<string>();
  const [error, setError] = useState<string>();

  const busy = phase !== 'idle' && phase !== 'done';

  const { data: balFrom, refetch: refetchBal } = useReadContract({
    address: fromChain.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: fromChain.chainId,
    query: { enabled: Boolean(address), refetchInterval: 15_000 },
  });
  const balanceText = isConnected && balFrom != null ? fmt(balFrom as bigint) : '0';

  const amountRaw = (() => {
    try {
      return amount && Number(amount) > 0 ? parseUnits(amount, USDC_DECIMALS) : 0n;
    } catch {
      return 0n;
    }
  })();
  const insufficient = isConnected && balFrom != null && amountRaw > (balFrom as bigint);

  const onAmount = (v: string) => {
    if (v === '' || /^\d*\.?\d*$/.test(v)) {
      setAmount(v);
      setError(undefined);
      if (phase === 'done') setPhase('idle');
      setBurnHash(undefined);
      setMintHash(undefined);
    }
  };
  const pickFrom = (c: CctpChain) => {
    if (c.chainId === toChain.chainId) setToChain(fromChain);
    setFromChain(c);
  };
  const pickTo = (c: CctpChain) => {
    if (c.chainId === fromChain.chainId) setFromChain(toChain);
    setToChain(c);
  };
  const reverse = () => {
    setFromChain(toChain);
    setToChain(fromChain);
  };

  async function bridge() {
    if (!address || amountRaw <= 0n) return;
    const from = fromChain;
    const to = toChain;
    const src = clientFor(from.chainId);
    const dst = clientFor(to.chainId);
    setError(undefined);
    setBurnHash(undefined);
    setMintHash(undefined);
    setAttestTries(0);
    try {
      // 1) On the source chain, approve USDC to the TokenMessenger.
      setPhase('switching');
      await switchChainAsync({ chainId: from.chainId });
      const allowance = (await src.readContract({ address: from.usdc, abi: erc20Abi, functionName: 'allowance', args: [address, TOKEN_MESSENGER] })) as bigint;
      if (allowance < amountRaw) {
        setPhase('approving');
        const h = await writeContractAsync({ address: from.usdc, abi: erc20Abi, functionName: 'approve', args: [TOKEN_MESSENGER, amountRaw], chainId: from.chainId });
        await src.waitForTransactionReceipt({ hash: h });
      }

      // 2) Burn on the source chain (standard, free transfer).
      setPhase('burning');
      const burn = await writeContractAsync({
        address: TOKEN_MESSENGER,
        abi: tokenMessengerAbi,
        functionName: 'depositForBurn',
        args: [amountRaw, to.domain, addressToBytes32(address), from.usdc, ZERO_BYTES32, 0n, STANDARD_FINALITY],
        chainId: from.chainId,
      });
      setBurnHash(burn);
      await src.waitForTransactionReceipt({ hash: burn });

      // 3) Wait for Circle's attestation (Iris, public API).
      setPhase('attesting');
      let att: Attestation | null = null;
      for (let i = 0; i < 200 && !att; i++) {
        att = await fetchAttestation(from.domain, burn);
        if (!att) {
          setAttestTries(i + 1);
          await sleep(8000);
        }
      }
      if (!att) throw new Error('Attestation timed out. The burn is confirmed — you can mint later with the burn tx.');

      // 4) Mint on the destination chain.
      setPhase('switching');
      await switchChainAsync({ chainId: to.chainId });
      setPhase('minting');
      const mint = await writeContractAsync({
        address: MESSAGE_TRANSMITTER,
        abi: messageTransmitterAbi,
        functionName: 'receiveMessage',
        args: [att.message, att.attestation],
        chainId: to.chainId,
      });
      await dst.waitForTransactionReceipt({ hash: mint });
      setMintHash(mint);
      setPhase('done');
      refetchBal();
    } catch (e) {
      setError(mapError(e));
      setPhase('idle');
    }
  }

  const phaseLabel =
    phase === 'switching' ? 'Switch network in wallet…'
    : phase === 'approving' ? 'Approve USDC…'
    : phase === 'burning' ? `Burning on ${fromChain.short}…`
    : phase === 'attesting' ? `Waiting for attestation… (${attestTries})`
    : phase === 'minting' ? `Minting on ${toChain.short}…`
    : 'Bridge USDC';

  let action;
  if (!isConnected) {
    action = <ConnectCta className="swapbox__cta swapbox__cta--connect">Connect wallet</ConnectCta>;
  } else if (amountRaw <= 0n) {
    action = <button type="button" className="swapbox__cta" disabled>Enter an amount</button>;
  } else if (insufficient) {
    action = <button type="button" className="swapbox__cta" disabled>Insufficient USDC</button>;
  } else {
    action = (
      <button type="button" className="swapbox__cta swapbox__cta--connect" onClick={bridge} disabled={busy}>
        {phaseLabel}
      </button>
    );
  }

  return (
    <div className="pages-content">
      <div className="page-heading">
        <div>
          <p className="page-eyebrow">BRIDGE · CIRCLE CCTP V2</p>
          <h1>Bridge / Deposit / Withdraw</h1>
          <p className="page-intro">Move native USDC across chains with Circle CCTP (burn &amp; mint). Testnet only.</p>
        </div>
      </div>

      <div className="swap-layout">
        <div className="swap-main">
          <section className="swapbox" aria-label="Bridge USDC">
            {/* From */}
            <div className="swapfield">
              <div className="swapfield__top">
                <span className="swapfield__label">From</span>
                <NetworkSelect chains={CCTP_CHAINS} selected={fromChain} onSelect={pickFrom} />
              </div>
              <div className="swapbox__amount-row">
                <input className="swapbox__amount" inputMode="decimal" placeholder="0" aria-label="Amount" value={amount} onChange={(e) => onAmount(e.target.value)} disabled={busy} />
                <span className="swapbox__token swapbox__token--static"><img className="token-logo" src="/assets/usdc-logo.png" alt="" width={24} height={24} /><b>USDC</b></span>
              </div>
              <div className="swapbox__balance">Balance <b>{balanceText}</b></div>
            </div>

            {/* Direction */}
            <div className="swapbox__swapzone">
              <button type="button" className="swapbox__swap" aria-label="Swap direction" onClick={reverse} disabled={busy}>↓</button>
            </div>

            {/* To */}
            <div className="swapfield">
              <div className="swapfield__top">
                <span className="swapfield__label">To</span>
                <NetworkSelect chains={CCTP_CHAINS} selected={toChain} onSelect={pickTo} />
              </div>
              <div className="swapbox__amount-row">
                <input className="swapbox__amount" inputMode="decimal" placeholder="0" aria-label="You receive" value={amount} readOnly />
                <span className="swapbox__token swapbox__token--static"><img className="token-logo" src="/assets/usdc-logo.png" alt="" width={24} height={24} /><b>USDC</b></span>
              </div>
              <p className="swapbox__rate">1:1 via CCTP · standard transfer (no fee) · usually a few minutes</p>
            </div>

            {action}

            {burnHash && phase !== 'done' && (
              <p className="swapbox__note">
                Burn sent on {fromChain.short} · <a href={`${EXPLORERS[fromChain.chainId]}/tx/${burnHash}`} target="_blank" rel="noreferrer">tx ↗</a>
                {phase === 'attesting' && ' — waiting for Circle attestation (keep this tab open).'}
              </p>
            )}
            {error && <p className="swapbox__note swapbox__note--error">{error}</p>}
            {phase === 'done' && mintHash && (
              <p className="swapbox__note swapbox__note--ok">
                Bridged {amount} USDC to {toChain.short} · <a href={`${EXPLORERS[toChain.chainId]}/tx/${mintHash}`} target="_blank" rel="noreferrer">mint tx ↗</a>
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
