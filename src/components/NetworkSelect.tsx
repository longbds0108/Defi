import { useEffect, useRef, useState } from 'react';
import type { CctpChain } from '../config/cctp';

type NetworkSelectProps = {
  chains: CctpChain[];
  selected: CctpChain;
  onSelect: (chain: CctpChain) => void;
};

/** Network pill that opens a dropdown of chains (reuses the token-select styling). */
export default function NetworkSelect({ chains, selected, onSelect }: NetworkSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="tokensel" ref={ref}>
      <button type="button" className="swapbox__token" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}>
        <img className="token-logo" src={selected.logo} alt="" width={24} height={24} />
        <b>{selected.short}</b>
        <span className="swapbox__chev" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="tokensel__menu" role="listbox">
          {chains.map((c) => (
            <button
              key={c.chainId}
              type="button"
              role="option"
              aria-selected={selected.chainId === c.chainId}
              className={`tokensel__item${selected.chainId === c.chainId ? ' is-selected' : ''}`}
              onClick={() => {
                onSelect(c);
                setOpen(false);
              }}
            >
              <img className="token-logo" src={c.logo} alt="" width={28} height={28} />
              <span className="tokensel__meta">
                <b>{c.name}</b>
                <small>CCTP domain {c.domain}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
