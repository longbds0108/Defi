import { useState } from 'react';

type ChainChipProps = {
  name: string;
  short: string;
  logo?: string;
  active?: boolean;
  onClick?: () => void;
};

/** Round chain icon for the "Spend from" selector, with a letter fallback. */
export default function ChainChip({ name, short, logo, active, onClick }: ChainChipProps) {
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      className={`swapbox__chain${active ? ' is-active' : ''}`}
      title={name}
      aria-label={name}
      aria-pressed={active}
      onClick={onClick}
    >
      {logo && !failed ? (
        <img src={logo} alt="" onError={() => setFailed(true)} />
      ) : (
        <span>{short.slice(0, 2)}</span>
      )}
    </button>
  );
}
