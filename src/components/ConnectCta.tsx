import type { ReactNode } from 'react';
import { useConnectModal, useAccountModal } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

type ConnectCtaProps = {
  className?: string;
  children?: ReactNode;
};

/**
 * A "Connect wallet" button that drives the RainbowKit modals.
 * - Disconnected: opens the connect modal, rendering the original label/children.
 * - Connected: shows the truncated address and opens the account modal.
 *
 * Keeps the caller's className so the existing button styling is untouched.
 */
export default function ConnectCta({ className, children }: ConnectCtaProps) {
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { address, isConnected } = useAccount();

  const label =
    isConnected && address ? `${address.slice(0, 6)}…${address.slice(-4)}` : children;

  return (
    <button
      className={className}
      type="button"
      onClick={() => (isConnected ? openAccountModal?.() : openConnectModal?.())}
    >
      {label}
    </button>
  );
}
