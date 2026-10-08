/* Swap ticker (CoinGecko + Hyperliquid) — ported verbatim from app/swap.html inline script. */
// @ts-nocheck
/* eslint-disable */
export function initSwapTicker() {
    (function () {
      var track = document.getElementById('swapTickerTrack');
      if (!track) return;
      var markets = [];
      var marketById = Object.create(null);
      var liveMids = Object.create(null);
      track.textContent = 'Loading top crypto markets…';

      function formatPrice(value) {
        var n = Number(value);
        if (!Number.isFinite(n)) return '—';
        var digits = n >= 1000 ? 2 : n >= 1 ? 2 : n >= 0.1 ? 4 : 6;
        return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: digits }).format(n);
      }

      function makeItem(market) {
        var item = document.createElement('article');
        item.className = 'swap-ticker__item';
        item.dataset.coin = String(market.symbol || '').toUpperCase();
        item.dataset.marketId = market.id;
        var image = document.createElement('img');
        image.src = market.image;
        image.alt = '';
        image.loading = 'lazy';
        image.referrerPolicy = 'no-referrer';
        image.addEventListener('error', function () {
          image.remove();
          var fallback = document.createElement('span');
          fallback.className = 'swap-ticker__fallback';
          fallback.textContent = String(market.symbol || '?').slice(0, 1).toUpperCase();
          item.insertBefore(fallback, item.firstChild);
        }, { once: true });
        var details = document.createElement('div');
        var symbol = document.createElement('b');
        symbol.textContent = String(market.symbol || '').toUpperCase();
        var values = document.createElement('span');
        var price = document.createElement('strong');
        price.className = 'swap-ticker__price';
        var change = document.createElement('i');
        change.className = 'swap-ticker__change';
        values.append(price, change);
        details.append(symbol, values);
        item.append(image, details);
        item.title = market.name + ' · ' + market.id;
        return item;
      }

      function renderMarkets() {
        var top40 = markets.slice(0, 40);
        track.replaceChildren();
        track.dataset.marketCount = String(top40.length);
        [false, true].forEach(function (duplicate) {
          var set = document.createElement('div');
          set.className = 'swap-ticker__set';
          if (duplicate) set.setAttribute('aria-hidden', 'true');
          top40.forEach(function (market) { set.appendChild(makeItem(market)); });
          track.appendChild(set);
        });
        paint();
      }

      function paint() {
        track.querySelectorAll('.swap-ticker__item').forEach(function (item) {
          var market = marketById[item.dataset.marketId];
          if (!market) return;
          var liveMid = Number(liveMids[item.dataset.coin]);
          var price = Number.isFinite(liveMid) && liveMid > 0 ? liveMid : Number(market.current_price);
          var changePct = Number(market.price_change_percentage_24h);
          if (Number.isFinite(price) && price > 0) item.querySelector('.swap-ticker__price').textContent = formatPrice(price);
          var changeNode = item.querySelector('.swap-ticker__change');
          if (Number.isFinite(changePct)) {
            var previousPrice = Number(market.current_price) / (1 + changePct / 100);
            var displayedChange = Number.isFinite(liveMid) && liveMid > 0 && previousPrice > 0
              ? ((price - previousPrice) / previousPrice) * 100
              : changePct;
            var rising = displayedChange >= 0;
            changeNode.textContent = (rising ? '↑ ' : '↓ ') + Math.abs(displayedChange).toFixed(2) + '%';
            changeNode.classList.toggle('is-up', rising);
            changeNode.classList.toggle('is-down', !rising);
          } else {
            changeNode.textContent = '24h —';
          }
          item.title = market.name + ' · ' + (Number.isFinite(liveMid) && liveMid > 0 ? 'Hyperliquid live mid' : 'CoinGecko market price');
        });
      }

      // Last-known markets survive a CoinGecko rate-limit / outage.
      function applyCachedMarkets() {
        try {
          var cached = JSON.parse(localStorage.getItem('hedgora.ticker') || 'null');
          if (!Array.isArray(cached) || !cached.length) return false;
          markets = cached;
          marketById = Object.create(null);
          markets.forEach(function (market) { marketById[market.id] = market; });
          renderMarkets();
          return true;
        } catch (e) {
          return false;
        }
      }

      async function refreshMarkets() {
        try {
          var url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h';
          var response = await fetch(url, { cache: 'no-store' });
          if (!response.ok) throw new Error('CoinGecko API response: ' + response.status);
          var result = await response.json();
          if (!Array.isArray(result) || result.length < 40) throw new Error('CoinGecko returned fewer than 40 markets');
          markets = result.slice(0, 50).filter(function (market) { return market && market.id && market.symbol && market.image; });
          marketById = Object.create(null);
          markets.forEach(function (market) { marketById[market.id] = market; });
          renderMarkets();
          track.removeAttribute('data-error');
          try { localStorage.setItem('hedgora.ticker', JSON.stringify(markets)); } catch (e) { /* ignore */ }
        } catch (error) {
          if (!markets.length) applyCachedMarkets();
          if (!markets.length) {
            track.dataset.error = 'true';
            track.textContent = 'Market data is temporarily unavailable.';
          }
          console.error('Could not load CoinGecko top markets.', error);
        }
      }

      applyCachedMarkets(); // show last-known instantly, before the first fetch
      refreshMarkets();
      window.setInterval(refreshMarkets, 60000);

      var socket;
      var reconnectDelay = 1000;
      var reconnectTimer;
      function connectLivePrices() {
        if (document.hidden) return;
        socket = new WebSocket('wss://api.hyperliquid.xyz/ws');
        socket.addEventListener('open', function () {
          reconnectDelay = 1000;
          socket.send(JSON.stringify({ method: 'subscribe', subscription: { type: 'allMids' } }));
        });
        socket.addEventListener('message', function (event) {
          try {
            var message = JSON.parse(event.data);
            if (message.channel !== 'allMids' || !message.data || !message.data.mids) return;
            Object.keys(message.data.mids).forEach(function (symbol) { liveMids[symbol.toUpperCase()] = message.data.mids[symbol]; });
            paint();
          } catch (error) {
            console.error('Could not read Hyperliquid price update.', error);
          }
        });
        socket.addEventListener('close', function () {
          if (document.hidden) return;
          reconnectTimer = window.setTimeout(connectLivePrices, reconnectDelay);
          reconnectDelay = Math.min(reconnectDelay * 2, 30000);
        });
      }
      connectLivePrices();
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          window.clearTimeout(reconnectTimer);
          if (socket) socket.close();
        } else if (!socket || socket.readyState === WebSocket.CLOSED) {
          connectLivePrices();
        }
      });
    }());

}
