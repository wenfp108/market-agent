const axios = require('axios');

// ==========================================
// 0. 策略引擎
// ==========================================
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
        return (category === 'TECH' && vol > 20000) ? 'TECH_LEVERAGE' : null;
    }
};

// ==========================================
// 1. 过滤配置
// ==========================================
const CATEGORY_PRIORITY = ["politics", "economy", "finance", "crypto", "tech", "geopolitics", "climate-science", "world"];
const FILTER_CONFIG = {
    "politics": { signals: ["election", "nominate", "strike", "shutdown", "fed", "president", "war", "cabinet", "senate", "house"], noise: ["tweet", "post", "mention", "says", "follower", "wear", "odds", "poll", "approval"] },
    "economy": { signals: ["fed", "powell", "rate", "inflation", "cpi", "gdp", "recession", "ecb", "treasury", "job", "unemployment"], noise: ["brazil", "turkey", "ranking", "statement"] },
    "finance": { signals: ["gold", "silver", "s&p", "nasdaq", "oil", "commodity", "largest company", "revenue", "stock"], noise: ["acquisition", "merger", "ipo", "earnings call", "dividend"] },
    "crypto": { signals: ["bitcoin", "ethereum", "solana", "etf", "flow", "price", "hit", "market cap"], noise: ["fdv", "launch", "airdrop", "listing", "mint", "floor price", "nft", "meme", "token"] },
    "tech": { signals: ["ai model", "benchmark", "gemini", "gpt", "nvidia", "apple", "microsoft", "semiconductor", "agi"], noise: ["app store", "download", "tiktok", "charizard", "pokemon", "influencer", "game"] },
    "geopolitics": { signals: ["strike", "ceasefire", "supreme leader", "regime", "invasion", "nuclear", "war", "military", "border"], noise: ["costa rica", "thailand", "parliamentary election", "local"] },
    "climate-science": { signals: ["earthquake", "spacex", "measles", "virus", "pandemic", "temperature", "volcano", "hurricane"], noise: ["snow", "inches", "rain", "weather in", "nyc", "washington", "cloud"] },
    "world": { signals: ["coalition", "prime minister", "eu", "nato", "un", "trade deal"], noise: ["us election", "us strike"] }
};

// ==========================================
// 2. 黑名单同步 (3天/2月/2年)
// ==========================================
async function generateSniperTargets() {
    const token = process.env.MY_PAT || process.env.GITHUB_TOKEN;
    const COMMAND_REPO = "wenfp108/Central-Bank";
    if (!token) { console.log("⚠️ No Token for Central-Bank sync."); return []; }

    const issuesUrl = `https://api.github.com/repos/${COMMAND_REPO}/issues?state=open&per_page=100`;

    try {
        console.log("📡 [Radar] Syncing with Central-Bank for de-duplication...");
        const resp = await axios.get(issuesUrl, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' } });
        
        const now = new Date();
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        
        // 1. 未来3天日期
        const targetDates = [];
        for (let i = 0; i < 3; i++) {
            const d = new Date(now);
            d.setDate(now.getDate() + i);
            targetDates.push({
                str: `${months[d.getMonth()]} ${d.getDate()}`, 
                year: d.getFullYear()
            });
        }

        // 2. 月份计算
        const currMonthIndex = now.getMonth();
        const nextMonthIndex = (currMonthIndex + 1) % 12;
        const nextNextMonthIndex = (currMonthIndex + 2) % 12;

        const currMonthStr = months[currMonthIndex];
        const nextMonthStr = months[nextMonthIndex];
        const nextNextMonthStr = months[nextNextMonthIndex];

        const currentYearVal = now.getFullYear();
        const nextYearVal = currentYearVal + 1;

        const nextMonthYear = nextMonthIndex < currMonthIndex ? currentYearVal + 1 : currentYearVal;
        const nextNextMonthYear = nextNextMonthIndex < currMonthIndex ? currentYearVal + 1 : currentYearVal;

        let specificTargets = [];
        const polyIssues = resp.data.filter(issue => issue.title.toLowerCase().includes('[poly]'));

        polyIssues.forEach(issue => {
            let t = issue.title.replace(/\[poly\]/gi, '').trim();
            
            // 逻辑 A: {date}
            if (t.includes("{date}")) {
                targetDates.forEach(dateObj => {
                    let q = t.replace(/{date}/g, dateObj.str)
                             .replace(/{year}/g, String(dateObj.year))
                             .replace(/{month}/g, currMonthStr)
                             .replace(/{next_month}/g, nextMonthStr);
                    specificTargets.push(normalizeText(q));
                });
            } 
            // 逻辑 B: {month}
            else if (t.includes("{month}") || t.includes("{next_month}")) {
                let q1 = t.replace(/{month}/g, currMonthStr)
                          .replace(/{next_month}/g, nextMonthStr)
                          .replace(/{year}/g, String(currentYearVal));
                specificTargets.push(normalizeText(q1));

                let q2 = t.replace(/{month}/g, nextMonthStr)
                          .replace(/{next_month}/g, nextNextMonthStr)
                          .replace(/{year}/g, String(nextMonthYear));
                specificTargets.push(normalizeText(q2));
            } 
            // 逻辑 C: {year}
            else if (t.includes("{year}")) {
                let q1 = t.replace(/{year}/g, String(currentYearVal));
                specificTargets.push(normalizeText(q1));

                let q2 = t.replace(/{year}/g, String(nextYearVal));
                specificTargets.push(normalizeText(q2));
            }
            else {
                specificTargets.push(normalizeText(t));
            }
        });
        
        console.log(`✅ Loaded ${specificTargets.length} active Sniper targets to exclude.`);
        return specificTargets;
    } catch (e) { console.error("❌ Failed to fetch Central-Bank issues:", e.message); return []; }
}

function normalizeText(str) {
    return str.toLowerCase().replace(/[?!]/g, "").replace(/\s+/g, " ").trim();
}

// ==========================================
// 3. 雷达主任务
// ==========================================
async function runRadarTask() {
    const REPO_OWNER = process.env.REPO_OWNER || process.env.GITHUB_REPOSITORY_OWNER;
    let REPO_NAME = process.env.REPO_NAME;
    if (!REPO_NAME && process.env.GITHUB_REPOSITORY) {
         REPO_NAME = process.env.GITHUB_REPOSITORY.split('/')[1];
    }
    const TOKEN = process.env.MY_PAT || process.env.GITHUB_TOKEN;
    if (!TOKEN) return console.log("❌ Missing Secrets! (MY_PAT required)");

    const sniperBlacklist = await generateSniperTargets();

    console.log("📡 [Radar] Scanning Top 100 Global Markets...");
    const url = `https://gamma-api.polymarket.com/events?limit=100&active=true&closed=false&order=volume24hr&ascending=false`;

    try {
        const resp = await axios.get(url);
        const events = resp.data;
        let trendingData = [];

        events.forEach(event => {
            if (!event.markets) return;

            const eventTags = event.tags ? event.tags.map(t => t.slug) : [];
            let primaryTag = null;
            for (const cat of CATEGORY_PRIORITY) { if (eventTags.includes(cat)) { primaryTag = cat; break; } }
            if (!primaryTag) return;

            const eventTitleClean = normalizeText(event.title);
            if (sniperBlacklist.some(target => eventTitleClean.includes(target) || target.includes(eventTitleClean))) return;

            const rules = FILTER_CONFIG[primaryTag];
            if (rules.noise.some(kw => eventTitleClean.includes(kw))) return;
            const isLoose = ["politics", "geopolitics", "world"].includes(primaryTag);
            if (!isLoose && !rules.signals.some(kw => eventTitleClean.includes(kw))) return;

            event.markets.forEach(m => {
                if (!m.active || m.closed) return;
                const vol24h = Number(m.volume24hr || 0);
                if (vol24h < 10000) return;

                let prices = [], outcomes = [];
                try { prices = JSON.parse(m.outcomePrices); outcomes = JSON.parse(m.outcomes); } catch (e) { return; }
                let priceStr = outcomes.map((o, i) => `${o}: ${(Number(prices[i]) * 100).toFixed(1)}%`).join(" | ");

                const masterTags = [];
                const categoryUpper = primaryTag.toUpperCase();
                for (const [name, logic] of Object.entries(MASTERS)) {
                    const tag = logic(m, prices, categoryUpper);
                    if (tag) masterTags.push(tag);
                }
                if (masterTags.length === 0) masterTags.push("RAW_MARKET");

                trendingData.push({
                    slug: event.slug,
                    ticker: m.slug,
                    question: m.groupItemTitle || m.question,
                    eventTitle: event.title,
                    prices: priceStr,
                    volume: Math.round(Number(m.volume || 0)),
                    liquidity: Math.round(Number(m.liquidity || 0)),
                    endDate: m.endDate ? m.endDate.split("T")[0] : "N/A", 
                    dayChange: m.oneDayPriceChange ? (Number(m.oneDayPriceChange) * 100).toFixed(2) + "%" : "0.00%",
                    vol24h: Math.round(vol24h),
                    spread: m.spread ? (Number(m.spread) * 100).toFixed(2) + "%" : "N/A", 
                    sortOrder: Number(m.groupItemThreshold || 0), 
                    updatedAt: m.updatedAt,
                    category: categoryUpper,
                    url: `https://polymarket.com/event/${event.slug}`,
                    strategy_tags: masterTags 
                });
            });
        });

        trendingData.sort((a, b) => b.vol24h - a.vol24h);
        const top30 = trendingData.slice(0, 30);

        if (top30.length > 0) {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            const day = now.getDate();
            const timePart = `${now.getHours().toString().padStart(2, '0')}_${now.getMinutes().toString().padStart(2, '0')}`;
            const fileName = `radar-${year}-${month}-${day}-${timePart}.json`;
            const datePart = now.toISOString().split('T')[0];
            const path = `data/trends/${datePart}/${fileName}`;
            await axios.put(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
                message: `Radar Update: ${fileName}`,
                content: Buffer.from(JSON.stringify(top30, null, 2)).toString('base64')
            }, { headers: { Authorization: `Bearer ${TOKEN}` } });
            console.log(`✅ Radar Success: Filtered & Uploaded ${top30.length} signals.`);
        } else { console.log("⚠️ No high-value signals found."); }

    } catch (e) { console.error("❌ Radar Error:", e.message); }
}

// ==========================================
// 4. 执行入口
// ==========================================
(async () => {
    console.log("🚀 Radar Agent Initializing...");
    try {
        await runRadarTask();
        console.log("🏁 Radar Scan Complete. Exiting.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Fatal Radar Error:", error);
        process.exit(1);
    }
})();
