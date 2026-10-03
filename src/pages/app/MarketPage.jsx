import React, { useState } from 'react';
import Icon from '../../components/common/Icon';
import { useLanguage } from '../../context/LanguageContext';
import { MARKET, SHOPS } from '../../data/marketData';
import { byId, IMG, inr } from '../../data/cropsData';

export default function MarketPage() {
  const { t, L, loc, W, showToast } = useLanguage();
  const [shopFilter, setShopFilter] = useState('all');

  const date = new Date().toLocaleDateString(loc, {
    day: 'numeric',
    month: 'short',
  });

  const renderSparkline = (arr, mv) => {
    const mn = Math.min(...arr);
    const sp = Math.max(...arr) - mn || 1;
    const pts = arr.map((v, i) => [
      (i / (arr.length - 1)) * 80 + 2,
      25 - ((v - mn) / sp) * 20,
    ]);
    const col = mv > 0 ? '#2F5A18' : mv < 0 ? '#FF5A01' : '#83877F';
    const last = pts[pts.length - 1];

    return (
      <svg className="spark" viewBox="0 0 84 28" aria-hidden="true">
        <polyline
          points={pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')}
          fill="none"
          stroke={col}
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <circle cx={last[0]} cy={last[1]} r="2.6" fill={col} />
      </svg>
    );
  };

  const filteredShops = SHOPS.filter(
    (s) => shopFilter === 'all' || s.type === shopFilter
  );

  return (
    <section className="panel page" data-page="market" style={{ display: 'block' }}>
      <div className="page-h">
        <div>
          <h1>{t('mk.h', 'Sell at the right price, buy close to home')}</h1>
          <p>{t('mk.p', 'Sample prices and listings — not live.')}</p>
        </div>
        <span className="pill demo">
          <i />
          <span>{t('mk.demo', 'Sample data')}</span>
        </span>
      </div>

      <div className="grid g-ov">
        <div className="card scroll-x">
          <table className="mk-table">
            <caption className="sr-only">Sample market prices</caption>
            <thead>
              <tr>
                <th>{t('mk.crop', 'Crop & market')}</th>
                <th>{t('mk.price', 'Price / quintal')}</th>
                <th>{t('mk.move', '7-day')}</th>
                <th>
                  <span className="sr-only">Trend</span>
                </th>
              </tr>
            </thead>
            <tbody id="mkBody">
              {MARKET.map((m) => {
                const c = byId(m.crop);
                const cls = m.mv > 0 ? 'up' : m.mv < 0 ? 'down' : 'flat';
                const ic =
                  m.mv > 0 ? 'trend-up' : m.mv < 0 ? 'trend-down' : 'minus';

                return (
                  <tr key={m.crop}>
                    <td>
                      <div className="cc">
                        <img src={IMG(c.img, 80)} alt="" />
                        <div>
                          <b>{L(c.name)}</b>
                          <span>
                            {L(m.mkt)} · {L(W.sample)} {date}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="price num">{inr(m.price)}</td>
                    <td>
                      <span className={`mv ${cls}`}>
                        <Icon name={ic} className="ico sm" />
                        {m.mv > 0 ? '+' : ''}
                        {m.mv}%
                      </span>
                    </td>
                    <td>{renderSparkline(m.sp, m.mv)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="card">
          <div className="card-h">
            <h3>{t('mk.shops', 'Nearby input shops')}</h3>
          </div>

          <div
            style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}
            role="group"
            aria-label="Shop type"
          >
            <button
              className="chip-f"
              data-shop="all"
              aria-pressed={shopFilter === 'all'}
              onClick={() => setShopFilter('all')}
            >
              {t('f.all', 'All')}
            </button>
            <button
              className="chip-f"
              data-shop="fert"
              aria-pressed={shopFilter === 'fert'}
              onClick={() => setShopFilter('fert')}
            >
              {t('mk.fert', 'Fertilizer')}
            </button>
            <button
              className="chip-f"
              data-shop="pest"
              aria-pressed={shopFilter === 'pest'}
              onClick={() => setShopFilter('pest')}
            >
              {t('mk.pest', 'Pesticide')}
            </button>
          </div>

          <div id="shops">
            {filteredShops.map((s, i) => (
              <div key={i} className="shop">
                <span className={`ic ${s.type === 'pest' ? 'p' : ''}`}>
                  <Icon
                    name={s.type === 'pest' ? 'bug' : 'sprout'}
                    className="ico"
                  />
                </span>
                <div>
                  <b>{L(s.name)}</b>
                  <span>
                    {L(s.type === 'pest' ? W.pestShop : W.fertShop)} · {s.km}{' '}
                    {L(W.km)}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => showToast(W.callMsg)}
                >
                  <Icon name="phone" className="ico sm" />
                  <span>{L(W.call)}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
