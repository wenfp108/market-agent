# Market Agent

> Polymarket 双引擎采集系统 — Sniper 精准狙击 + Radar 全局扫描

## 架构

```
Central-Bank Issues [poly] 标签
         │
    ┌────▼────┐
    │ Sniper  │──→ 搜索 Polymarket 精准匹配
    │ (Puppeteer) │
    └────┬────┘         ┌──────────────┐
         │              │ data/strategy/│
         ├──────────────→│   *.json     │
         │              └──────┬───────┘
    ┌────▼────┐                │ 本地桥接
    │  Radar  │←───────────────┘ (减去 Sniper 已采集的)
    │ (Axios) │
    └────┬────┘         ┌──────────────┐
         │              │  data/trends/ │
         └──────────────→│   *.json     │
                        └──────┬───────┘
                               │
                        ┌──────▼───────┐
                        │   Harvest    │──→ 复制到 Central-Bank
                        │  (校验后清理)  │──→ 清理本地 data/
                        └──────────────┘
```

## 双引擎设计

| | Sniper | Radar |
|---|---|---|
| **目标** | Central-Bank Issues 里指定的话题 | Polymarket 全球 Top 1000 |
| **方式** | Puppeteer 爬搜索页 | Axios 调 API |
| **输出** | `data/strategy/{date}/` | `data/trends/{date}/` |
| **去重** | 自身 slug 去重 | 减去 Sniper 已采集的 slug |
| **频率** | 每小时 | 每小时（Sniper 之后 10 秒） |

## 策略引擎

四个大师视角，对每条市场信号打标签：

| 大师 | 策略 | 触发条件 |
|------|------|---------|
| **Taleb** | TAIL_RISK | 价格 < 5% 或 > 95%，且流动性 > $5000 |
| **Soros** | REFLEXIVITY_TREND | 24h 交易量 > $10000 且日涨跌 > 5% |
| **Munger** | HIGH_CERTAINTY | 交易量 > $50000 且价差 < 1% |
| **Naval** | TECH_LEVERAGE | TECH 类目且交易量 > $20000 |

不符合任何策略的标记为 `RAW_MARKET`。

## 自动化流程

```
每小时 15 分 → Sniper 采集 → 等 10 秒 → Radar 扫描
    → 自动触发 Harvest → 复制到 Central-Bank → 校验 → 清理本地
```

1. **Sniper** 从 Central-Bank 的 Issues 读取 `[poly]` 标签，搜索 Polymarket 获取精准数据
2. **Radar** 扫描全球 Top 1000 市场，排除 Sniper 已覆盖的，按板块各取 Top 3
3. **Harvest** 将今日数据复制到 Central-Bank，校验文件大小后清理本地

## 关联仓库

| 仓库 | 用途 |
|------|------|
| [market-agent](https://github.com/wenfp108/market-agent) | 本仓库。数据采集 |
| [Central-Bank](https://github.com/wenfp108/Central-Bank) | 原始数据存储 + Issues 指令中心 |
| [Refinery-Engine](https://github.com/wenfp108/refinery-erngine) | 数据清洗 + AI 审计 |

## 板块分类

Radar 按以下板块各取 Top 3：

POLITICS → ECONOMY → CRYPTO → TECH → GEOPOLITICS → WORLD → FINANCE → CLIMATE-SCIENCE

## 环境变量

| 变量 | 用途 |
|------|------|
| `MY_PAT` | GitHub Token（读写 Central-Bank） |
| `PUPPETEER_EXECUTABLE_PATH` | 可选，自定义 Chrome 路径 |

## 环境

- **Runner**: GitHub Actions (`ubuntu-latest`)
- **Engine**: Node.js 20
- **调度**: 每小时 15 分
