/**
 * 共享策略引擎 — Sniper 和 Radar 共用同一套逻辑
 */

const MASTERS = {
    TALEB: (m, prices) => {
        const isTail = prices.some(p => Number(p) < 0.05 || Number(p) > 0.95);
        return (isTail && Number(m.liquidity) > 5000) ? 'TAIL_RISK' : null;
    },
    SOROS: (m) => {
        const change = Math.abs(Number(m.oneDayPriceChange || 0));
        const vol24 = Number(m.volume24hr || 0);
        return (vol24 > 10000 && change > 0.05) ? 'REFLEXIVITY_TREND' : null;
    },
    MUNGER: (m) => {
        const spread = Number(m.spread || 1);
        const vol = Number(m.volume || 0);
        return (vol > 50000 && spread < 0.01) ? 'HIGH_CERTAINTY' : null;
    },
    NAVAL: (m, category) => {
        const vol = Number(m.volume || 0);
        return (category.includes('TECH') && vol > 20000) ? 'TECH_LEVERAGE' : null;
    }
};

function applyMasterTags(m, prices, category) {
    const tags = [];
    for (const [name, logic] of Object.entries(MASTERS)) {
        const tag = logic(m, prices, category);
        if (tag) tags.push(tag);
    }
    if (tags.length === 0) tags.push('RAW_MARKET');
    return tags;
}

module.exports = { MASTERS, applyMasterTags };
