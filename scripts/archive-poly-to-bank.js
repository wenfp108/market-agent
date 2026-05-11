const fs = require('fs');
const path = require('path');

async function archivePolyData() {
    const today = new Date().toISOString().split('T')[0];
    const [y, m, d] = today.split('-');
    const ROOT = process.cwd();
    const LOCAL_DATA = path.resolve(ROOT, 'data');
    const BANK_ROOT = path.resolve(ROOT, 'central_bank');

    console.log(`📅 启动收割程序: ${today}`);

    const targets = [
        { local: 'strategy', bank: 'polymarket/strategy' },
        { local: 'trends',   bank: 'polymarket/trends' }
    ];

    let totalCopied = 0;
    let totalFailed = 0;

    targets.forEach(t => {
        const sourcePath = path.join(LOCAL_DATA, t.local, today);
        const targetPath = path.join(BANK_ROOT, t.bank, y, m, d);

        if (fs.existsSync(sourcePath)) {
            const files = fs.readdirSync(sourcePath).filter(f => f.endsWith('.json'));
            if (files.length > 0) {
                if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });
                files.forEach(file => {
                    const srcFile = path.join(sourcePath, file);
                    const destFile = path.join(targetPath, file);
                    try {
                        fs.copyFileSync(srcFile, destFile);
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
