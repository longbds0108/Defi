import { useEffect, useRef, useState } from 'react';
import type { Token } from '../config/tokens';

type TokenSelectProps = {
  tokens: Token[];
  selected?: Token;
  placeholder?: string;
  onSelect: (token: Token) => void;
};

/** Token pill that opens a dropdown of selectable tokens. */
export default function TokenSelect({ tokens, selected, placeholder = 'Select token', onSelect }: TokenSelectProps) {
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
      <button
        type="button"
        className={`swapbox__token${selected ? '' : ' swapbox__token--empty'}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? (
          <>
            <img className="token-logo" src={selected.logo} alt="" width={24} height={24} />
            <b>{selected.symbol}</b>
          </>
        ) : (
          placeholder
        )}
        <span className="swapbox__chev" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className="tokensel__menu" role="listbox">
          {tokens.map((t) => (
            <button
              key={t.address}
              type="button"
              role="option"
              aria-selected={selected?.address === t.address}
              className={`tokensel__item${selected?.address === t.address ? ' is-selected' : ''}`}
              onClick={() => {
                onSelect(t);
                setOpen(false);
              }}
            >
              <img className="token-logo" src={t.logo} alt="" width={28} height={28} />
              <span className="tokensel__meta">
                <b>{t.symbol}</b>
                <small>{t.name}</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
