/**
 * 《我當校長超勇的》Web Worker 代理線程
 * 模式一：【早期完美 0 溢出優先】(全局 DFS 極限通關)
 * 模式二：【超高戰力平滑派駐】(逐輪貪婪 + 高戰力激勵權重)
 * 玩家社群免費交流分享工具 (MIT License)
 */

if (typeof importScripts === "function") {
    try {
        importScripts('core.js');
    } catch (e) {
        console.warn("importScripts 載入失敗:", e);
    }
}

self.onmessage = function (e) {
    const { action, characters, bosses, totalScore } = e.data;
    if (action === 'start') {
        try {
            // 1. 執行【模式一：早期完美 0 溢出優先】(全局 DFS 極限通關)
            const sol1 = self.CalcEngine.runMode1ZeroOverkill(characters, bosses, totalScore);
            self.postMessage({ type: 'mode1_done', solution: sol1 });

            // 2. 執行【模式二：超高戰力平滑派駐】(逐輪貪婪 + 激勵權重)
            const sol2 = self.CalcEngine.runMode2SmoothGreedy(characters, bosses);
            self.postMessage({ type: 'mode2_done', solution: sol2 });
        } catch (err) {
            self.postMessage({ type: 'error', error: err.message });
        }
    }
};
