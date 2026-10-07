import { useState } from 'react';
import { tokenLogo } from '../lib/tokenLogos';

/**
 * Round token logo for a symbol, sized to match `.token-dot` (24px).
 * Falls back to the lettered dot when no logo is known or the image fails.
 */
export default function TokenLogo({ symbol }: { symbol?: string }) {
  const [failed, setFailed] = useState(false);
  const sym = (symbol ?? '?').toUpperCase();
  const url = tokenLogo(symbol);

  if (!url || failed) {
    const modifier = sym === 'USDC' ? ' token-dot--usdc' : sym === 'EURC' ? ' token-dot--eurc' : '';
    const glyph = sym === 'USDC' ? '$' : sym === 'EURC' ? '€' : sym.slice(0, 1);
    return <i className={`token-dot${modifier}`}>{glyph}</i>;
  }

  return (
    <img
      className="token-logo"
      src={url}
      alt={sym}
      width={24}
      height={24}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
