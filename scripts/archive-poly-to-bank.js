const fs = require('fs');
const path = require('path');

async function archivePolyData() {
    const today = new Date().toISOString().split('T')[0];
    const ROOT = process.cwd();
    const LOCAL_DATA = path.resolve(ROOT, 'data');
    const BANK_ROOT = path.resolve(ROOT, 'central_bank');

    console.log(`📅 启动收割程序: ${today}`);

    const targets = [
        { local: 'strategy', bank: 'polymarket/strategy' },
        { local: 'trends',   bank: 'polymarket/trends' }
    ];

    // 1. 搬运资产到中央银行，并验证完整性
    let totalCopied = 0;
    let totalFailed = 0;

    targets.forEach(t => {
        const sourcePath = path.join(LOCAL_DATA, t.local, today);
        const targetPath = path.join(BANK_ROOT, t.bank, today);

        if (fs.existsSync(sourcePath)) {
            const files = fs.readdirSync(sourcePath).filter(f => f.endsWith('.json'));
            if (files.length > 0) {
                if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });
                files.forEach(file => {
                    const srcFile = path.join(sourcePath, file);
                    const destFile = path.join(targetPath, file);
                    try {
                        fs.copyFileSync(srcFile, destFile);
                        // 验证：目标文件大小必须和源文件一致
                        const srcSize = fs.statSync(srcFile).size;
                        const destSize = fs.statSync(destFile).size;
                        if (srcSize !== destSize) {
                            console.error(`❌ [${t.local}] 校验失败: ${file} (src=${srcSize}, dest=${destSize})`);
                            totalFailed++;
                        } else {
                            console.log(`✅ [${t.local}] 已搬运: ${file} (${srcSize} bytes)`);
                            totalCopied++;
                        }
                    } catch (err) {
                        console.error(`❌ [${t.local}] 搬运失败: ${file} - ${err.message}`);
                        totalFailed++;
                    }
                });
            }
        }
    });

    // 2. 只有全部搬运成功才清理本地
    if (totalFailed > 0) {
        console.error(`🛑 检测到 ${totalFailed} 个文件搬运失败，跳过清理以保护数据！`);
        return;
    }

    if (totalCopied === 0) {
        console.log("💤 今日无数据需要搬运，跳过清理。");
        return;
    }

    console.log(`🔥 全部 ${totalCopied} 个文件搬运验证通过，执行本地清理...`);
    if (fs.existsSync(LOCAL_DATA)) {
        const items = fs.readdirSync(LOCAL_DATA);
        items.forEach(item => {
            if (item.startsWith('.git')) return;
            const itemPath = path.join(LOCAL_DATA, item);
            try {
                fs.rmSync(itemPath, { recursive: true, force: true });
                console.log(`🗑️ 已清理: ${item}`);
            } catch (err) {
                console.error(`❌ 清理失败 ${item}: ${err.message}`);
            }
        });
    }
}

archivePolyData().catch(console.error);
