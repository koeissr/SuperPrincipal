/**
 * 《我當校長超勇的》核心算力演算法模組 (Core Calculation Engine)
 * 模式一：【早期完美 0 溢出優先】(全局 DFS 極限通關 + 上界精準剪枝)
 * 模式二：【超高戰力平滑派駐】(逐輪貪婪 + 高戰力激勵權重)
 * 玩家社群免費交流分享工具 (MIT License)
 */

(function (root) {
    const CalcEngine = {};

    // ==========================================
    // 【模式一】早期完美 0 溢出優先 (階梯式漸進最佳化架構：全局 DFS + DP 背包接管)
    // ==========================================
    CalcEngine.runMode1ZeroOverkill = function (characters, bosses, totalAvailableScore) {
        let cumHp = 0;
        let targetK = 0;
        for (let i = 0; i < bosses.length; i++) {
            if (cumHp + bosses[i].hp <= totalAvailableScore) {
                cumHp += bosses[i].hp;
                targetK = i + 1;
            } else {
                break;
            }
        }

        if (targetK === 0) return null;

        let currentK = targetK;
        let finalSolution = null;

        while (currentK > 0) {
            // 從小 cap 開始嘗試嚴格匹配：2000, 4000, 8000, 12000
            for (let cap of [2000, 4000, 8000, 12000]) {
                const sol = solveGlobalMatchingStrict(characters, bosses, currentK, cap);
                if (sol) {
                    finalSolution = sol;
                    break;
                }
            }
            if (!finalSolution) {
                const uncappedSol = solveGlobalMatchingStrict(characters, bosses, currentK, Infinity);
                if (uncappedSol) {
                    finalSolution = uncappedSol;
                }
            }
            if (finalSolution) break;
            currentK--;
        }

        // 階梯式自動接管：當 BOSS 血量大於 8 人極限或 DFS 無解時，自動全權由 DP 背包演算法自第 1 輪起步逐輪求解
        if (!finalSolution) {
            let leftoverItems = [];
            for (let c of characters) {
                for (let i = 0; i < c.count; i++) {
                    leftoverItems.push({ name: c.name, score: c.score });
                }
            }
            const solution = [];
            let nextRoundIdx = 0;

            while (leftoverItems.length > 0 && nextRoundIdx < bosses.length) {
                const currentBoss = bosses[nextRoundIdx];
                const totalLeftoverDmg = leftoverItems.reduce((sum, m) => sum + m.score, 0);

                if (totalLeftoverDmg >= currentBoss.hp) {
                    const dpIndices = solveDpExactMinimumOverkill(leftoverItems, currentBoss.hp);
                    let selectedItems = [];
                    let remItems = [];
                    if (dpIndices && dpIndices.length > 0) {
                        const usedSet = new Set(dpIndices);
                        for (let idx = 0; idx < leftoverItems.length; idx++) {
                            if (usedSet.has(idx)) {
                                selectedItems.push(leftoverItems[idx]);
                            } else {
                                remItems.push(leftoverItems[idx]);
                            }
                        }
                    } else {
                        leftoverItems.sort((a, b) => b.score - a.score);
                        let sum = 0;
                        for (let item of leftoverItems) {
                            if (sum < currentBoss.hp) {
                                selectedItems.push(item);
                                sum += item.score;
                            } else {
                                remItems.push(item);
                            }
                        }
                    }

                    const teamDmg = selectedItems.reduce((s, m) => s + m.score, 0);
                    solution.push({
                        round: currentBoss.round,
                        bossHp: currentBoss.hp,
                        teamDmg: teamDmg,
                        overkill: teamDmg - currentBoss.hp,
                        members: selectedItems,
                        cleared: true,
                        algo: "DP背包演算法"
                    });

                    leftoverItems = remItems;
                    nextRoundIdx++;
                } else {
                    solution.push({
                        round: currentBoss.round,
                        bossHp: currentBoss.hp,
                        teamDmg: totalLeftoverDmg,
                        overkill: totalLeftoverDmg - currentBoss.hp,
                        members: leftoverItems,
                        cleared: false,
                        algo: "壓軸全隊輸出"
                    });
                    leftoverItems = [];
                    break;
                }
            }
            finalSolution = solution.length > 0 ? solution : null;
        }

        return finalSolution;
    };

    function solveGlobalMatchingStrict(characters, bosses, targetK, maxOkCap) {
        const scoreMap = characters.map(c => c.score);
        const countCap = characters.map(c => c.count);
        const nameMap = characters.map(c => c.name);
        const numChars = characters.length;

        const totalScore = characters.reduce((sum, c) => sum + c.score * c.count, 0);
        const totalBossHp = bosses.slice(0, targetK).reduce((sum, b) => sum + b.hp, 0);
        const maxAllowedCumOverkill = totalScore - totalBossHp;

        const currentCounts = [...countCap];
        let searchCalls = 0;
        let bestSolution = null;

        function dfs(r, path, cumOverkill) {
            searchCalls++;
            if (bestSolution || searchCalls > 3000 || cumOverkill > maxAllowedCumOverkill) return;

            if (r === targetK) {
                bestSolution = path.map(p => ({ ...p, combo: [...p.combo] }));
                return;
            }

            const targetHp = bosses[r].hp;
            const validCands = [];

            // 搜尋當前輪的所有組合 (1..8 人，完整搜尋確保 0 溢出被抓取)
            for (let size = 1; size <= 8; size++) {
                function generateCombos(start, combo, currentSum, counts) {
                    const remSlots = size - combo.length;
                    if (remSlots === 0) {
                        const overkill = currentSum - targetHp;
                        if (overkill >= 0 && (maxOkCap === Infinity || overkill <= maxOkCap) && (cumOverkill + overkill <= maxAllowedCumOverkill)) {
                            validCands.push({ combo: [...combo], teamScore: currentSum, overkill, cost: overkill });
                        }
                        return;
                    }

                    // 剪枝 1：當前總和已超過目標 + 上限
                    if (maxOkCap !== Infinity && currentSum > targetHp + maxOkCap) return;

                    // 剪枝 2：分支上界評估（剩餘全選當前可選最大角色依然達不到 targetHp 則剪枝）
                    let maxAvailInBranch = 0;
                    for (let i = start; i < numChars; i++) {
                        if ((counts[i] || 0) < currentCounts[i]) {
                            maxAvailInBranch = scoreMap[i];
                            break;
                        }
                    }
                    if (currentSum + remSlots * maxAvailInBranch < targetHp) return;

                    for (let i = start; i < numChars; i++) {
                        if ((counts[i] || 0) < currentCounts[i]) {
                            combo.push(i);
                            counts[i] = (counts[i] || 0) + 1;
                            generateCombos(i, combo, currentSum + scoreMap[i], counts);
                            counts[i]--;
                            combo.pop();
                        }
                    }
                }
                generateCombos(0, [], 0, {});
            }

            if (validCands.length === 0) return;

            // 核心排序：cost 越小 (0 溢出絕對優先) 越先嘗試
            validCands.sort((a, b) => a.cost - b.cost);
            const topCands = validCands.slice(0, 20);

            for (let cand of topCands) {
                if (bestSolution) break;

                for (let idx of cand.combo) currentCounts[idx]--;
                path.push({
                    round: bosses[r].round,
                    bossHp: targetHp,
                    teamDmg: cand.teamScore,
                    overkill: cand.overkill,
                    combo: cand.combo
                });

                dfs(r + 1, path, cumOverkill + cand.overkill);

                path.pop();
                for (let idx of cand.combo) currentCounts[idx]++;
            }
        }

        dfs(0, [], 0);
        if (!bestSolution) return null;

        const solution = [];
        const charRem = [...countCap];
        for (let sol of bestSolution) {
            for (let idx of sol.combo) charRem[idx]--;
            solution.push({
                round: sol.round,
                bossHp: sol.bossHp,
                teamDmg: sol.teamDmg,
                overkill: sol.overkill,
                members: sol.combo.map(idx => ({ name: nameMap[idx], score: scoreMap[idx] })),
                cleared: true,
                algo: "DFS全局匹配"
            });
        }

        let nextRoundIdx = targetK;
        let leftoverItems = [];
        for (let i = 0; i < numChars; i++) {
            while (charRem[i] > 0) {
                leftoverItems.push({ name: nameMap[i], score: scoreMap[i] });
                charRem[i]--;
            }
        }

        while (leftoverItems.length > 0 && nextRoundIdx < bosses.length) {
            const currentBoss = bosses[nextRoundIdx];
            const totalLeftoverDmg = leftoverItems.reduce((sum, m) => sum + m.score, 0);

            if (totalLeftoverDmg >= currentBoss.hp) {
                // 戰力足夠擊破：使用 DP 挑選剛好擊破 BOSS 的最小溢出成員組合，剩餘成員留給次輪
                const dpIndices = solveDpExactMinimumOverkill(leftoverItems, currentBoss.hp);
                let selectedItems = [];
                let remItems = [];
                if (dpIndices && dpIndices.length > 0) {
                    const usedSet = new Set(dpIndices);
                    for (let idx = 0; idx < leftoverItems.length; idx++) {
                        if (usedSet.has(idx)) {
                            selectedItems.push(leftoverItems[idx]);
                        } else {
                            remItems.push(leftoverItems[idx]);
                        }
                    }
                } else {
                    // Fallback 貪婪選取
                    leftoverItems.sort((a, b) => b.score - a.score);
                    let sum = 0;
                    for (let item of leftoverItems) {
                        if (sum < currentBoss.hp) {
                            selectedItems.push(item);
                            sum += item.score;
                        } else {
                            remItems.push(item);
                        }
                    }
                }

                const teamDmg = selectedItems.reduce((s, m) => s + m.score, 0);
                solution.push({
                    round: currentBoss.round,
                    bossHp: currentBoss.hp,
                    teamDmg: teamDmg,
                    overkill: teamDmg - currentBoss.hp,
                    members: selectedItems,
                    cleared: true,
                    algo: "DP背包演算法"
                });

                leftoverItems = remItems;
                nextRoundIdx++;
            } else {
                // 戰力不足：全部剩餘成員進行最後壓軸輸出
                solution.push({
                    round: currentBoss.round,
                    bossHp: currentBoss.hp,
                    teamDmg: totalLeftoverDmg,
                    overkill: totalLeftoverDmg - currentBoss.hp,
                    members: leftoverItems,
                    cleared: false,
                    algo: "壓軸全隊輸出"
                });
                leftoverItems = [];
                break;
            }
        }

        return solution;
    }

    // ==========================================
    // 【模式二】超高戰力平滑派駐 (逐輪貪婪 + 獎勵權重)
    // ==========================================
    CalcEngine.runMode2SmoothGreedy = function (characters, bosses) {
        let availableItems = [];
        for (let c of characters) {
            for (let i = 0; i < c.count; i++) {
                availableItems.push({ name: c.name, score: c.score });
            }
        }

        const INCENTIVE_WEIGHT = 0.20;
        const outputData = [];

        for (let r = 0; r < bosses.length; r++) {
            const roundName = bosses[r].round;
            const targetHP = bosses[r].hp;

            const currentTotalScore = availableItems.reduce((sum, item) => sum + item.score, 0);
            if (currentTotalScore < targetHP) {
                let remHP = targetHP;
                const members = [];
                for (let item of availableItems) {
                    remHP -= item.score;
                    members.push({ name: item.name, score: item.score });
                }
                outputData.push({
                    round: roundName,
                    bossHp: targetHP,
                    teamDmg: currentTotalScore,
                    overkill: currentTotalScore - targetHP,
                    members: members,
                    cleared: false,
                    algo: "壓軸全隊輸出"
                });
                availableItems = [];
                break;
            }

            let bestTeamIndices = findGreedyTeamForRound(availableItems, targetHP, r + 1, INCENTIVE_WEIGHT);

            if (!bestTeamIndices) {
                if (currentTotalScore >= targetHP) {
                    // 貪婪保底選取：當全域組合搜尋逾時或溢出限制過嚴時，按分數由高至低依序派駐直至滿分通關
                    const sortedWithIdx = availableItems.map((it, idx) => ({ idx, score: it.score })).sort((a, b) => b.score - a.score);
                    let sum = 0;
                    bestTeamIndices = [];
                    for (let obj of sortedWithIdx) {
                        bestTeamIndices.push(obj.idx);
                        sum += obj.score;
                        if (sum >= targetHP) break;
                    }
                } else {
                    let remHP = targetHP;
                    const members = [];
                    for (let item of availableItems) {
                        remHP -= item.score;
                        members.push({ name: item.name, score: item.score });
                    }
                    outputData.push({
                        round: roundName,
                        bossHp: targetHP,
                        teamDmg: currentTotalScore,
                        overkill: currentTotalScore - targetHP,
                        members: members,
                        cleared: false,
                        algo: "壓軸全隊輸出"
                    });
                    availableItems = [];
                    break;
                }
            }

            const usedSet = new Set(bestTeamIndices);
            const nextAvailableItems = [];
            const members = [];
            let teamDmg = 0;

            for (let i = 0; i < availableItems.length; i++) {
                if (usedSet.has(i)) {
                    members.push({ name: availableItems[i].name, score: availableItems[i].score });
                    teamDmg += availableItems[i].score;
                } else {
                    nextAvailableItems.push(availableItems[i]);
                }
            }

            outputData.push({
                round: roundName,
                bossHp: targetHP,
                teamDmg: teamDmg,
                overkill: teamDmg - targetHP,
                members: members,
                cleared: true
            });

            availableItems = nextAvailableItems;
        }

        return outputData;
    };

    function findGreedyTeamForRound(items, targetHP, roundIndex, weight) {
        // 1. 先用 DP (動態規劃) 精準求出該輪所有剩餘卡牌數學上可達成的「絕對最低溢出 (absoluteMinOverkill)」
        const dpSol = solveDpExactMinimumOverkill(items, targetHP);
        let absoluteMinOverkill = 0;
        if (dpSol) {
            let dpSum = 0;
            dpSol.forEach(idx => dpSum += items[idx].score);
            absoluteMinOverkill = dpSum - targetHP;
        }

        // 2. 優先嘗試在 (absoluteMinOverkill + 50) 視窗內找尋高戰力平滑組合
        const tightCap = Math.max(100, absoluteMinOverkill + 50);
        const sol = searchGreedyTeamWithCap(items, targetHP, roundIndex, weight, tightCap);
        if (sol) return sol;

        // 3. 若 DFS 因高戰力防重疊限制未取勝，直接回傳 DP 的絕對最低溢出組合
        if (dpSol) return dpSol;

        // 4. 寬鬆門檻階梯嘗試
        const capsToTry = [2500, 8000, 25000];
        for (let cap of capsToTry) {
            const res = searchGreedyTeamWithCap(items, targetHP, roundIndex, weight, cap);
            if (res) return res;
        }
        return null;
    }

    function solveDpExactMinimumOverkill(items, targetHP) {
        const totalScore = items.reduce((s, it) => s + it.score, 0);
        if (totalScore < targetHP) return null;

        const maxTarget = Math.min(totalScore, targetHP + 30000);
        const dp = new Int8Array(maxTarget + 1);
        dp[0] = 1;
        const parentPrev = new Int32Array(maxTarget + 1).fill(-1);
        const parentItem = new Int16Array(maxTarget + 1).fill(-1);

        for (let i = 0; i < items.length; i++) {
            const s = items[i].score;
            if (s > maxTarget) continue;
            for (let v = maxTarget - s; v >= 0; v--) {
                if (dp[v] === 1) {
                    const nextV = v + s;
                    if (dp[nextV] === 0) {
                        dp[nextV] = 1;
                        parentPrev[nextV] = v;
                        parentItem[nextV] = i;
                    }
                }
            }
        }

        let bestVal = -1;
        for (let v = targetHP; v <= maxTarget; v++) {
            if (dp[v] === 1) {
                bestVal = v;
                break;
            }
        }

        if (bestVal === -1) return null;

        let curr = bestVal;
        const usedIndices = [];
        while (curr > 0 && parentPrev[curr] !== -1) {
            const itemIdx = parentItem[curr];
            usedIndices.push(itemIdx);
            curr = parentPrev[curr];
        }

        return usedIndices;
    }

    function searchGreedyTeamWithCap(items, targetHP, roundIndex, weight, initialCap) {
        let bestIndices = null;
        let bestRating = -Infinity;
        let minOverkill = Infinity;

        const charMap = {};
        const uniqueChars = [];

        for (let i = 0; i < items.length; i++) {
            const name = items[i].name;
            if (!charMap[name]) {
                charMap[name] = { name: name, score: items[i].score, indices: [] };
                uniqueChars.push(charMap[name]);
            }
            charMap[name].indices.push(i);
        }

        uniqueChars.sort((a, b) => b.score - a.score);

        const numUnique = uniqueChars.length;
        const countCap = uniqueChars.map(uc => uc.indices.length);
        const scoreMap = uniqueChars.map(uc => uc.score);
        const maxScoreInItems = scoreMap[0] || 0;

        const sortedScoresAsc = items.map(it => it.score).sort((a, b) => a - b);
        let cumAsc = 0;
        let maxNeededSize = items.length;
        for (let sIdx = 0; sIdx < sortedScoresAsc.length; sIdx++) {
            cumAsc += sortedScoresAsc[sIdx];
            if (cumAsc >= targetHP) {
                maxNeededSize = sIdx + 1;
                break;
            }
        }

        let foundGoodSolution = false;
        let totalSearchSteps = 0;

        for (let size = 1; size <= maxNeededSize; size++) {
            if (foundGoodSolution) break;

            function evaluateStream(start, combo, currentSum, counts) {
                totalSearchSteps++;
                if (foundGoodSolution || totalSearchSteps > 50000) return;

                const maxAllowedOverkill = (minOverkill !== Infinity) ? Math.min(minOverkill, 500) : initialCap;
                if (currentSum >= targetHP + maxAllowedOverkill) return;

                const remSlots = size - combo.length;
                if (remSlots === 0) {
                    const overkill = currentSum - targetHP;
                    if (overkill < 0) return;

                    if (roundIndex <= 6 && combo.filter(idx => scoreMap[idx] >= maxScoreInItems * 0.85).length > 1) {
                        return;
                    }

                    // 權重設計：溢出權重佔絕對主導 (-overkill * 10)，高戰力平滑激勵僅作極小微調比對
                    let bigBonus = 0;
                    for (let idx of combo) {
                        if (scoreMap[idx] >= 40000 || scoreMap[idx] >= targetHP * 0.4) {
                            bigBonus += (scoreMap[idx] / 10000);
                        }
                    }

                    const rating = -(overkill * 10) + bigBonus;
                    if (overkill < minOverkill || (overkill === minOverkill && rating > bestRating)) {
                        bestRating = rating;
                        minOverkill = overkill;

                        const realIndices = [];
                        const usedCounts = {};
                        for (let uIdx of combo) {
                            usedCounts[uIdx] = (usedCounts[uIdx] || 0);
                            realIndices.push(uniqueChars[uIdx].indices[usedCounts[uIdx]]);
                            usedCounts[uIdx]++;
                        }
                        bestIndices = realIndices;

                        if (minOverkill <= 100 && roundIndex <= 6) {
                            foundGoodSolution = true;
                        }
                    }
                    return;
                }

                if (currentSum + remSlots * maxScoreInItems < targetHP) return;

                for (let i = start; i < numUnique; i++) {
                    if ((counts[i] || 0) < countCap[i]) {
                        combo.push(i);
                        counts[i] = (counts[i] || 0) + 1;
                        evaluateStream(i, combo, currentSum + scoreMap[i], counts);
                        counts[i]--;
                        combo.pop();
                    }
                }
            }

            evaluateStream(0, [], 0, {});
        }

        return bestIndices;
    }

    // 別名相容支援
    CalcEngine.runMode1Global = CalcEngine.runMode1ZeroOverkill;
    CalcEngine.runMode2Global = CalcEngine.runMode1ZeroOverkill;
    CalcEngine.runMode1Greedy = CalcEngine.runMode2SmoothGreedy;
    CalcEngine.runMode2Greedy = CalcEngine.runMode2SmoothGreedy;

    // 模組匯出支援
    if (typeof module !== "undefined" && module.exports) {
        module.exports = CalcEngine;
    } else {
        root.CalcEngine = CalcEngine;
    }
})(typeof self !== "undefined" ? self : this);
