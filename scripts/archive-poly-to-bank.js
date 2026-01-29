const fs = require('fs');
const path = require('path');

async function archivePolyData() {
    const today = new Date().toISOString().split('T')[0];
    const ROOT = process.cwd();
    const LOCAL_DATA = path.resolve(ROOT, 'data');
    const BANK_ROOT = path.resolve(ROOT, 'central_bank'); // 对应 YAML 中的 path

    console.log(`📅 执行归档判定，日期标签: ${today}`);

    const targets = [
        { local: 'strategy', bank: 'polymarket/strategy' },
        { local: 'trends',   bank: 'polymarket/trends' }
    ];

    targets.forEach(t => {
        const sourcePath = path.join(LOCAL_DATA, t.local, today);
        const targetPath = path.join(BANK_ROOT, t.bank, today);

        if (fs.existsSync(sourcePath)) {
            const files = fs.readdirSync(sourcePath).filter(f => f.endsWith('.json'));
            
            if (files.length > 0) {
                if (!fs.existsSync(targetPath)) {
                    fs.mkdirSync(targetPath, { recursive: true });
                }

                files.forEach(file => {
                    const srcFile = path.join(sourcePath, file);
                    const destFile = path.join(targetPath, file);
                    
                    fs.copyFileSync(srcFile, destFile);
                    if (fs.existsSync(destFile)) {
                        fs.unlinkSync(srcFile);
                        console.log(`✅ [${t.local}] 归档成功: ${file}`);
                    }
                });
            } else {
                console.log(`📭 [${t.local}] 今日无待归档文件。`);
            }
        }
    });
}

archivePolyData().catch(console.error);
