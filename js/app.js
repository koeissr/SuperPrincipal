/**
 * 《我當校長超勇的》前端 UI 互動與應用程式邏輯
 * 玩家社群免費交流分享工具 (MIT License)
 */

// 應用程式狀態 (State)
let selectedCharacters = [];
let sortableInstance = null;
let mode1SolutionGlobal = null;
let mode2SolutionGlobal = null;
let activeWorker = null;
let currentCatalogTab = 'all';
let isDataDirty = false;

// ==========================================
// 數據變更感應與待重新運算狀態 (Dirty State Management)
// ==========================================
function markDataDirty() {
    isDataDirty = true;
    updateRealtimeEstimate();
    const launchBtn = document.getElementById("mainLaunchBtn");
    if (launchBtn) {
        launchBtn.classList.add("needs-recalc");
    }
    const b1 = document.getElementById("mode1Badge");
    const b2 = document.getElementById("mode2Badge");
    if (b1 && b1.textContent === "完成") {
        b1.className = "badge bg-warning text-dark";
        b1.textContent = "待重新運算";
    }
    if (b2 && b2.textContent === "完成") {
        b2.className = "badge bg-warning text-dark";
        b2.textContent = "待重新運算";
    }
}

function clearDataDirty() {
    isDataDirty = false;
    updateRealtimeEstimate();
    const launchBtn = document.getElementById("mainLaunchBtn");
    if (launchBtn) {
        launchBtn.classList.remove("needs-recalc");
    }
}

// ==========================================
// ⚡ 即時戰力與理論上限推估計算 (Real-time Estimation Bar)
// ==========================================
function updateRealtimeEstimate() {
    const intimacySelect = document.getElementById("intimacySelect");
    const intimacy = intimacySelect ? parseInt(intimacySelect.value) || 0 : 0;
    const maxRoundsAllowed = Math.max(0, Math.round((100 - intimacy) / 5));

    const baseHpInput = document.getElementById("bossBaseHp");
    const incHpInput = document.getElementById("bossIncHp");
    const baseHp = baseHpInput && baseHpInput.value !== "" ? parseInt(baseHpInput.value) || 180000 : 180000;
    const incHp = incHpInput && incHpInput.value !== "" ? parseInt(incHpInput.value) || 900 : 900;

    const charCount = (typeof selectedCharacters !== "undefined" && selectedCharacters) ? selectedCharacters.length : 0;
    let totalAttempts = 0;
    let totalPower = 0;

    if (typeof selectedCharacters !== "undefined" && selectedCharacters) {
        selectedCharacters.forEach(c => {
            const cnt = parseInt(c.count) || 0;
            const scr = parseInt(c.score) || 0;
            totalAttempts += cnt;
            totalPower += scr * cnt;
        });
    }

    // 推估在無溢出完美情況下最多能打幾輪
    let estRounds = 0;
    let cumulativeHp = 0;
    for (let r = 1; r <= maxRoundsAllowed; r++) {
        const roundHp = baseHp + (r - 1) * incHp;
        if (cumulativeHp + roundHp <= totalPower) {
            cumulativeHp += roundHp;
            estRounds = r;
        } else {
            break;
        }
    }
    const targetIntimacy = Math.min(100, intimacy + estRounds * 5);

    // 更新右側頂部儀表列各元素 ID
    const elIntimacy = document.getElementById("rtIntimacy");
    if (elIntimacy) elIntimacy.textContent = `${intimacy}%`;

    const elCharCount = document.getElementById("rtCharCount");
    if (elCharCount) elCharCount.textContent = charCount;

    const elTotalTimes = document.getElementById("rtTotalTimes");
    if (elTotalTimes) elTotalTimes.textContent = totalAttempts;

    const elTotalScore = document.getElementById("rtTotalScore");
    if (elTotalScore) elTotalScore.textContent = totalPower.toLocaleString();

    const elMaxRoundBadge = document.getElementById("rtMaxRoundBadge");
    if (elMaxRoundBadge) {
        elMaxRoundBadge.innerHTML = `🎯 推估可交流上限：<b>${estRounds} 輪 (${intimacy}% ➔ ${targetIntimacy}%)</b>`;
    }

    // 同步更新步驟 2 標題的人數統計
    const countEl = document.getElementById("selectedTitleCount");
    if (countEl) {
        countEl.textContent = `(${charCount} 人)`;
    }
}


// ==========================================
// 操作說明與設定提示 點擊/觸控與外部點擊管理 (Popover Interaction)
// ==========================================
function positionPopover(wrapper) {
    if (!wrapper) return;
    const badge = wrapper.querySelector(".help-badge, .config-hint-badge, .help-circle-btn");
    const card = wrapper.querySelector(".help-popover-card");
    if (badge && card) {
        const rect = badge.getBoundingClientRect();
        card.style.position = "fixed";
        card.style.top = (rect.bottom + 6) + "px";
        let left = rect.left;
        if (left + 350 > window.innerWidth) {
            left = window.innerWidth - 360;
        }
        if (left < 10) left = 10;
        card.style.left = left + "px";
        card.style.right = "auto";
        card.style.zIndex = "99999";
    }
}

function toggleHelpPopover(id, event) {
    if (event) {
        event.stopPropagation();
    }
    const target = document.getElementById(id);
    if (!target) return;
    const isOpen = target.classList.contains("is-open");
    closeAllHelpPopovers();
    if (!isOpen) {
        positionPopover(target);
        target.classList.add("is-open");
    }
}

function closeHelpPopover(id, event) {
    if (event) {
        event.stopPropagation();
    }
    const target = document.getElementById(id);
    if (target) {
        target.classList.remove("is-open");
    }
}

function closeAllHelpPopovers() {
    document.querySelectorAll(".help-popover-wrapper").forEach(el => {
        el.classList.remove("is-open");
    });
}

// 載入預設 Demo 角色清冊與 BOSS 參數
async function autoLoadInitialDemoData() {
    if (typeof DEFAULT_DEMO_DATA !== "undefined") {
        const d = DEFAULT_DEMO_DATA;
        const intimacySelect = document.getElementById("intimacySelect");
        if (intimacySelect) intimacySelect.value = d.intimacy || 0;

        const baseHp = document.getElementById("bossBaseHp");
        if (baseHp) baseHp.value = d.baseHp || 240000;

        const incHp = document.getElementById("bossIncHp");
        if (incHp) incHp.value = d.incHp || 1800;

        selectedCharacters = JSON.parse(JSON.stringify(d.characters || []));
        renderSelectedTable();
        renderCharPool();
        updateRealtimeEstimate();
    }
}

// 初始化 (預設自動載入 Demo 登場角色與參數，零配置開箱即用)
async function initApp() {
    initIntimacyOptions();
    initSortable();
    initEventListeners();
    await autoLoadInitialDemoData();

    // 頁面重載/開啟時強制浮現「操作說明」約 3 秒後自動平滑收起
    setTimeout(() => {
        const wrapper = document.getElementById("helpPopoverWrapper");
        if (wrapper) {
            positionPopover(wrapper);
            wrapper.classList.add("is-open");
            setTimeout(() => {
                if (wrapper && !wrapper.matches(":hover")) {
                    wrapper.classList.remove("is-open");
                }
            }, 3000);
        }
    }, 400);

    // 載入 Demo 成功後延遲 1 秒，自動啟動「開始最佳化運算」展示極速算力與成果
    setTimeout(() => {
        if (selectedCharacters && selectedCharacters.length > 0 && !mode1SolutionGlobal && !mode2SolutionGlobal) {
            console.log("⚡ Auto-triggering optimization on startup demo...");
            startOptimizationFlow();
        }
    }, 1000);
}

function initEventListeners() {
    const baseHpInput = document.getElementById("bossBaseHp");
    const incHpInput = document.getElementById("bossIncHp");
    if (baseHpInput) baseHpInput.addEventListener("input", markDataDirty);
    if (incHpInput) incHpInput.addEventListener("input", markDataDirty);

    // 支援所有 Popover 在 Hover 時動態定位至 fixed，杜絕任何父容器 overflow 截斷
    document.querySelectorAll(".help-popover-wrapper").forEach(wrapper => {
        wrapper.addEventListener("mouseenter", () => {
            positionPopover(wrapper);
        });
    });

    // 外部點擊自動關閉所有釘住的浮動卡片
    document.addEventListener("click", function (e) {
        if (!e.target.closest(".help-popover-wrapper")) {
            closeAllHelpPopovers();
        }
    });

    // 鍵盤監聽: ESC關閉浮動視窗、Ctrl+Enter (Cmd+Enter) 極速啟動運算
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            closeAllHelpPopovers();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
            e.preventDefault();
            startOptimizationFlow();
        }
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}

// 初始化親密度下拉選單 (0% ~ 100%, 遞進 5%)
function initIntimacyOptions() {
    const select = document.getElementById("intimacySelect");
    if (!select) return;
    select.innerHTML = "";
    for (let i = 0; i <= 100; i += 5) {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = i + "%" + (i === 100 ? " (已滿)" : "");
        select.appendChild(opt);
    }
}

function handleIntimacyChange() {
    const intimacySelect = document.getElementById("intimacySelect");
    if (!intimacySelect) return;
    const val = parseInt(intimacySelect.value);
    const alertBox = document.getElementById("intimacyAlert");
    if (!alertBox) return;
    if (val === 100) {
        alertBox.classList.remove("d-none");
    } else {
        alertBox.classList.add("d-none");
    }
    markDataDirty();
}

// 圖鑑頁籤切換
function switchCatalogTab(tabGroup) {
    currentCatalogTab = tabGroup;
    const btns = document.querySelectorAll(".catalog-tab-btn");
    btns.forEach(btn => btn.classList.remove("active"));
    if (window.event && window.event.target) {
        window.event.target.classList.add("active");
    }
    renderCharPool();
}

// 渲染角色圖鑑 (男女高辨識度色彩標籤、文理組頁籤、全選按鈕連動與打勾標記)
function renderCharPool() {
    const container = document.getElementById("catalogBadgesContainer");
    if (!container) return;
    container.innerHTML = "";

    if (typeof ALL_CHARACTERS === "undefined" || !Array.isArray(ALL_CHARACTERS)) {
        console.error("ALL_CHARACTERS 未定義");
        return;
    }

    // 1. 檢查並更新全選按鈕狀態
    const wenzuChars = ALL_CHARACTERS.filter(c => c.group === "文組");
    const lizuChars = ALL_CHARACTERS.filter(c => c.group === "理組");
    const isAllWenzuSelected = wenzuChars.length > 0 && wenzuChars.every(c => selectedCharacters.some(sc => sc.name === c.name));
    const isAllLizuSelected = lizuChars.length > 0 && lizuChars.every(c => selectedCharacters.some(sc => sc.name === c.name));

    const btnWenzu = document.getElementById("btnSelectAllWenzu");
    const btnLizu = document.getElementById("btnSelectAllLizu");

    if (btnWenzu) {
        btnWenzu.classList.toggle("all-selected", isAllWenzuSelected);
        btnWenzu.innerHTML = isAllWenzuSelected
            ? '<i class="fa-solid fa-square-check"></i> 取消全選文組'
            : '<i class="fa-regular fa-square-check"></i> 全選文組 (31)';
    }
    if (btnLizu) {
        btnLizu.classList.toggle("all-selected", isAllLizuSelected);
        btnLizu.innerHTML = isAllLizuSelected
            ? '<i class="fa-solid fa-square-check"></i> 取消全選理組'
            : '<i class="fa-regular fa-square-check"></i> 全選理組 (26)';
    }

    // 2. 頁籤過濾
    const filtered = ALL_CHARACTERS.filter(char => {
        if (currentCatalogTab === 'wenzu') return char.group === "文組";
        if (currentCatalogTab === 'lizu') return char.group === "理組";
        return true;
    });

    // 3. 渲染高辨識度標籤
    filtered.forEach(char => {
        const isSelected = selectedCharacters.some(sc => sc.name === char.name);
        const genderClass = char.gender === "男" ? "gender-m" : "gender-f";
        const genderSymbol = char.gender === "男" ? "♂" : "♀";

        const badge = document.createElement("span");
        badge.className = `badge char-badge ${genderClass}${isSelected ? ' selected' : ''}`;
        badge.dataset.name = char.name;

        const checkMark = isSelected ? '<span class="char-badge-check"><i class="fa-solid fa-check"></i></span>' : '';
        badge.innerHTML = `<span class="gender-pill">${genderSymbol}</span> <span class="char-name-text">${char.name}</span>${checkMark}`;
        badge.onclick = () => toggleCharSelected(char);

        container.appendChild(badge);
    });

    filterCharBadges();
}// 快速全選 / 取消全選指定組別 (支援疊加全選全部)
function toggleSelectAllGroup(groupName) {
    if (typeof ALL_CHARACTERS === "undefined") return;
    const targetChars = ALL_CHARACTERS.filter(c => c.group === groupName);
    const isAllSelected = targetChars.length > 0 && targetChars.every(c => selectedCharacters.some(sc => sc.name === c.name));

    if (isAllSelected) {
        // 取消全選該組別
        selectedCharacters = selectedCharacters.filter(sc => {
            const charInfo = ALL_CHARACTERS.find(c => c.name === sc.name);
            return charInfo ? charInfo.group !== groupName : true;
        });
    } else {
        // 全選該組別 (未在名冊中的全部加入)
        targetChars.forEach(char => {
            if (!selectedCharacters.some(sc => sc.name === char.name)) {
                selectedCharacters.push({
                    name: char.name,
                    score: 0,
                    count: 3
                });
            }
        });
    }

    renderCharPool();
    renderSelectedTable();
    markDataDirty();
}

// 關鍵字搜尋過濾
function filterCharBadges() {
    const searchInput = document.getElementById("charSearchInput");
    if (!searchInput) return;
    const q = searchInput.value.trim().toLowerCase();
    const badges = document.querySelectorAll(".char-badge");
    badges.forEach(b => {
        if (b.dataset.name.toLowerCase().includes(q)) {
            b.style.display = "inline-flex";
        } else {
            b.style.display = "none";
        }
    });
}

// 浮動抽屜選單 (Bottom Sheet Drawer) 開關控制
function openCatalogDrawer() {
    const backdrop = document.getElementById("catalogDrawerBackdrop");
    const drawer = document.getElementById("catalogDrawer");
    if (backdrop) backdrop.classList.remove("d-none");
    if (drawer) drawer.classList.remove("d-none");
    renderCharPool();
}

function closeCatalogDrawer() {
    const backdrop = document.getElementById("catalogDrawerBackdrop");
    const drawer = document.getElementById("catalogDrawer");
    if (backdrop) backdrop.classList.add("d-none");
    if (drawer) drawer.classList.add("d-none");
}

// 切換登場狀態 (從圖鑑抽屜點擊加入/移出至登場清單)
function toggleCharSelected(char) {
    const idx = selectedCharacters.findIndex(sc => sc.name === char.name);
    if (idx >= 0) {
        selectedCharacters.splice(idx, 1);
    } else {
        selectedCharacters.push({
            name: char.name,
            score: 0,
            count: 3
        });
    }
    renderCharPool();
    renderSelectedTable();
    markDataDirty();
}

// 學科成績 (傷害) 單擊 1 點與長按連續加速機制 (10 點/100 點)
let holdTimer = null;
let holdInterval = null;
let holdCount = 0;

function startScoreHold(idx, delta) {
    stopScoreHold();
    // 1. 單擊微調 1 點
    adjustCharScore(idx, delta);
    holdCount = 0;

    // 2. 長按 400ms 後開啟加速連續計時器
    holdTimer = setTimeout(() => {
        holdInterval = setInterval(() => {
            holdCount++;
            let step = 1;
            if (holdCount > 25) {
                step = 100; // 按住超過約 2 秒，每次跳 100 點
            } else if (holdCount > 10) {
                step = 10;  // 按住超過約 1 秒，每次跳 10 點
            }
            adjustCharScore(idx, delta > 0 ? step : -step);
        }, 80);
    }, 400);
}

function stopScoreHold() {
    if (holdTimer) clearTimeout(holdTimer);
    if (holdInterval) clearInterval(holdInterval);
    holdTimer = null;
    holdInterval = null;
    holdCount = 0;
}

// 渲染已登場表格
function renderSelectedTable() {
    const tbody = document.getElementById("selectedCharTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    updateRealtimeEstimate();

    if (selectedCharacters.length === 0) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="5" class="text-center text-muted py-4 fs-7"><i class="fa-solid fa-users-slash me-1"></i> 目前無登場角色，請點擊上方「選取登場同學」或「匯入我的個人化資料」。</td>`;
        tbody.appendChild(tr);
        return;
    }

    selectedCharacters.forEach((char, idx) => {
        const tr = document.createElement("tr");
        tr.dataset.index = idx;
        tr.innerHTML = `
            <td class="text-center" style="width: 20px;"><i class="fa-solid fa-grip-vertical handle"></i></td>
            <td class="col-char-name text-nowrap" title="${char.name}">${char.name}</td>
            <td class="text-center">
                <div class="input-group input-group-sm justify-content-center">
                    <button class="btn btn-outline-secondary btn-inc-dec" tabindex="-1"
                        onmousedown="startScoreHold(${idx}, -1)" onmouseup="stopScoreHold()" onmouseleave="stopScoreHold()" 
                        ontouchstart="startScoreHold(${idx}, -1)" ontouchend="stopScoreHold()" ontouchcancel="stopScoreHold()">-</button>
                    <input type="number" id="score_input_${idx}" class="form-control num-input-score text-center" 
                        value="${char.score}" 
                        onfocus="this.select()"
                        onkeydown="handleScoreInputKeydown(event, ${idx})"
                        oninput="updateCharScore(${idx}, this.value)"
                        onchange="updateCharScore(${idx}, this.value)">
                    <button class="btn btn-outline-secondary btn-inc-dec" tabindex="-1"
                        onmousedown="startScoreHold(${idx}, 1)" onmouseup="stopScoreHold()" onmouseleave="stopScoreHold()" 
                        ontouchstart="startScoreHold(${idx}, 1)" ontouchend="stopScoreHold()" ontouchcancel="stopScoreHold()">+</button>
                </div>
            </td>
            <td class="text-center">
                <div class="input-group input-group-sm justify-content-center">
                    <button class="btn btn-outline-secondary btn-inc-dec" tabindex="-1" onclick="adjustCharCount(${idx}, -1)">-</button>
                    <input type="number" id="count_input_${idx}" class="form-control num-input-count text-center" tabindex="-1" min="0" value="${char.count}" oninput="updateCharCount(${idx}, this.value)" onchange="updateCharCount(${idx}, this.value)">
                    <button class="btn btn-outline-secondary btn-inc-dec" tabindex="-1" onclick="adjustCharCount(${idx}, 1)">+</button>
                </div>
            </td>
            <td class="text-center">
                <button class="btn btn-outline-danger btn-sm p-1" tabindex="-1" onclick="removeCharFromSelected(${idx})" title="刪除"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 學科成績欄 Tab 鍵智慧垂直導航 (流暢錄入體驗)
function handleScoreInputKeydown(event, idx) {
    const total = selectedCharacters.length;
    if (event.key === "Tab") {
        event.preventDefault();
        if (total <= 0) return;
        const nextIdx = event.shiftKey
            ? (idx - 1 + total) % total
            : (idx + 1) % total;
        const nextInput = document.getElementById(`score_input_${nextIdx}`);
        if (nextInput) {
            nextInput.focus();
            nextInput.select();
        }
    } else if (event.key === "Enter" || event.key === "ArrowDown") {
        event.preventDefault();
        if (total <= 0) return;
        const nextIdx = (idx + 1) % total;
        const nextInput = document.getElementById(`score_input_${nextIdx}`);
        if (nextInput) {
            nextInput.focus();
            nextInput.select();
        }
    } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (total <= 0) return;
        const prevIdx = (idx - 1 + total) % total;
        const prevInput = document.getElementById(`score_input_${prevIdx}`);
        if (prevInput) {
            prevInput.focus();
            prevInput.select();
        }
    }
}

function removeCharFromSelected(index) {
    selectedCharacters.splice(index, 1);
    renderCharPool();
    renderSelectedTable();
    markDataDirty();
}

// Sortable 拖曳初始化
function initSortable() {
    const el = document.getElementById("selectedCharTableBody");
    if (!el || typeof Sortable === "undefined") return;
    sortableInstance = Sortable.create(el, {
        handle: '.handle',
        animation: 150,
        onEnd: function (evt) {
            const movedItem = selectedCharacters.splice(evt.oldIndex, 1)[0];
            selectedCharacters.splice(evt.newIndex, 0, movedItem);
            renderSelectedTable();
            markDataDirty();
        }
    });
}

// 數值調整輔助
function adjustValue(elementId, delta) {
    const input = document.getElementById(elementId);
    if (!input) return;
    let val = parseInt(input.value) || 0;
    val = Math.max(0, val + delta);
    input.value = val;
    markDataDirty();
}

function adjustCharScore(idx, delta) {
    if (!selectedCharacters[idx]) return;
    selectedCharacters[idx].score = Math.max(0, selectedCharacters[idx].score + delta);
    const scoreInp = document.getElementById(`score_input_${idx}`);
    if (scoreInp) {
        scoreInp.value = selectedCharacters[idx].score;
        scoreInp.focus();
    } else {
        renderSelectedTable();
    }
    markDataDirty();
}

function updateCharScore(idx, val) {
    if (!selectedCharacters[idx]) return;
    selectedCharacters[idx].score = Math.max(0, parseInt(val) || 0);
    markDataDirty();
}

function adjustCharCount(idx, delta) {
    if (!selectedCharacters[idx]) return;
    selectedCharacters[idx].count = Math.max(0, selectedCharacters[idx].count + delta);
    const countInp = document.getElementById(`count_input_${idx}`);
    if (countInp) {
        countInp.value = selectedCharacters[idx].count;
    } else {
        renderSelectedTable();
    }
    markDataDirty();
}

function updateCharCount(idx, val) {
    if (!selectedCharacters[idx]) return;
    selectedCharacters[idx].count = Math.max(0, parseInt(val) || 0);
    markDataDirty();
}

// ==========================================
// 登場角色集體微調 (Batch Score / Count Adjust)
// ==========================================

let batchOp = '+';
let batchModalInstance = null;

function openBatchAdjustModal() {
    if (selectedCharacters.length === 0) {
        alert("⚠️ 目前尚未選取任何登場角色！請先選取角色。");
        return;
    }
    const modalEl = document.getElementById("batchAdjustModal");
    if (!modalEl) return;
    if (!batchModalInstance) {
        batchModalInstance = new bootstrap.Modal(modalEl);
    }
    setBatchOp('+');
    handleBatchTargetChange();
    const valInput = document.getElementById("batchValueInput");
    if (valInput) valInput.value = "";
    updateBatchPreview();
    batchModalInstance.show();
    setTimeout(() => {
        if (valInput) valInput.focus();
    }, 400);
}

function handleBatchTargetChange() {
    const targetRadio = document.querySelector('input[name="batchTarget"]:checked');
    const target = targetRadio ? targetRadio.value : 'score';
    const valInput = document.getElementById("batchValueInput");
    const valLabel = document.getElementById("batchValueLabel");
    if (!valInput) return;

    if (target === 'count') {
        valInput.placeholder = "請輸入次數調整值 (例如 1)";
        valInput.step = "1";
        if (valLabel) valLabel.innerHTML = '<i class="fa-solid fa-calculator me-1"></i>4. 設定增減次數：';
    } else {
        valInput.placeholder = "請輸入成績調整值 (例如 500)";
        valInput.step = "10";
        if (valLabel) valLabel.innerHTML = '<i class="fa-solid fa-calculator me-1"></i>4. 設定增減成績：';
    }
}

function setBatchOp(op) {
    batchOp = op;
    const btn = document.getElementById("batchOpBtn");
    if (btn) {
        btn.textContent = op === '+' ? '＋ 增加' : '－ 減少';
    }
}

function getSelectedBatchFilters() {
    const groupRadio = document.querySelector('input[name="batchGroup"]:checked');
    const genderRadio = document.querySelector('input[name="batchGender"]:checked');
    return {
        group: groupRadio ? groupRadio.value : 'all',
        gender: genderRadio ? genderRadio.value : 'all'
    };
}

function getMatchedCharacters() {
    const filter = getSelectedBatchFilters();
    return selectedCharacters.filter(char => {
        const info = (typeof ALL_CHARACTERS !== "undefined")
            ? ALL_CHARACTERS.find(c => c.name === char.name)
            : null;
        if (!info) return true;
        const matchGroup = filter.group === 'all' || info.group === filter.group;
        const matchGender = filter.gender === 'all' || info.gender === filter.gender;
        return matchGroup && matchGender;
    });
}

function updateBatchPreview() {
    const matched = getMatchedCharacters();
    const countEl = document.getElementById("batchMatchCount");
    if (countEl) {
        countEl.textContent = matched.length;
    }
}

function applyBatchAdjustment() {
    const targetRadio = document.querySelector('input[name="batchTarget"]:checked');
    const target = targetRadio ? targetRadio.value : 'score';
    const valInput = document.getElementById("batchValueInput");
    const val = parseInt(valInput ? valInput.value : 0);
    if (!val || val <= 0) {
        alert("⚠️ 請輸入大於 0 的有效調整數值！");
        if (valInput) valInput.focus();
        return;
    }

    const filter = getSelectedBatchFilters();
    let modifiedCount = 0;

    selectedCharacters.forEach(char => {
        const info = (typeof ALL_CHARACTERS !== "undefined")
            ? ALL_CHARACTERS.find(c => c.name === char.name)
            : null;

        let matchGroup = true;
        let matchGender = true;
        if (info) {
            matchGroup = filter.group === 'all' || info.group === filter.group;
            matchGender = filter.gender === 'all' || info.gender === filter.gender;
        }

        if (matchGroup && matchGender) {
            if (target === 'count') {
                if (batchOp === '+') {
                    char.count += val;
                } else {
                    char.count = Math.max(0, char.count - val);
                }
            } else {
                if (batchOp === '+') {
                    char.score += val;
                } else {
                    char.score = Math.max(0, char.score - val);
                }
            }
            modifiedCount++;
        }
    });

    renderSelectedTable();
    markDataDirty();

    if (batchModalInstance) {
        batchModalInstance.hide();
    }
}

// ==========================================
// 全環境自適應算力引擎 Flow (Web Worker + 主線程降級秒算 + 超時守門犬)
// ==========================================

function startOptimizationFlow() {
    if (selectedCharacters.length === 0) {
        alert("❌ 未找到登場角色！請先點擊選單或匯入角色清冊。");
        return;
    }

    const validChars = selectedCharacters.filter(c => c.score > 0 && c.count > 0);
    if (validChars.length === 0) {
        alert("❌ 未找到有效戰力的登場角色！請確認學科成績 > 0。");
        return;
    }

    const overlay = document.getElementById("calcOverlay");
    const progressBar = document.getElementById("calcProgressBar");
    if (overlay) overlay.classList.remove("d-none");
    if (progressBar) progressBar.style.width = "15%";

    document.getElementById("mode1Badge").className = "badge bg-warning text-dark";
    document.getElementById("mode1Badge").textContent = "計算中...";
    document.getElementById("mode2Badge").className = "badge bg-secondary";
    document.getElementById("mode2Badge").textContent = "等待中...";

    const characters = validChars.map((c, idx) => ({ id: idx, name: c.name, score: c.score, count: c.count }));
    characters.sort((a, b) => b.score - a.score);

    const intimacySelect = document.getElementById("intimacySelect");
    const intimacy = intimacySelect ? parseInt(intimacySelect.value) || 0 : 0;

    // 計算當前親密度下最多需交流的輪數 (每擊破 1 輪 +5% 親密度，達 100% 親密度畢業結束)
    const maxRoundsAllowed = (intimacy >= 100) ? 0 : Math.min(20, Math.ceil((100 - intimacy) / 5));

    if (maxRoundsAllowed <= 0) {
        alert("⚠️ 當前居民親密度已達 100% (滿級)，該居民無需繼續交流！");
        if (overlay) overlay.classList.add("d-none");
        return;
    }

    const baseHpInput = document.getElementById("bossBaseHp");
    const incHpInput = document.getElementById("bossIncHp");
    const baseHp = baseHpInput && baseHpInput.value !== "" ? parseInt(baseHpInput.value) : 180000;
    const incHp = incHpInput && incHpInput.value !== "" ? parseInt(incHpInput.value) : 900;

    const bosses = [];
    for (let i = 1; i <= maxRoundsAllowed; i++) {
        bosses.push({ round: "第" + i + "輪", hp: baseHp + (i - 1) * incHp });
    }

    const totalScore = characters.reduce((sum, c) => sum + c.score * c.count, 0);

    // 即時更新儀表列推估
    updateRealtimeEstimate();

    // 本地主線程直接計算函式 (異步排程確保 Overlay 與進度條在 0ms 內第一時間即時繪製)
    function executeMainThreadDirectly() {
        try {
            if (progressBar) progressBar.style.width = "35%";

            setTimeout(() => {
                // 【模式一】早期完美 0 溢出優先 (全局 DFS 極限通關)
                const sol1 = (typeof CalcEngine !== "undefined" && CalcEngine.runMode1ZeroOverkill)
                    ? CalcEngine.runMode1ZeroOverkill(characters, bosses, totalScore)
                    : [];
                mode1SolutionGlobal = sol1;
                renderMode1Results(sol1, bosses);
                document.getElementById("mode1Badge").className = "badge bg-primary";
                document.getElementById("mode1Badge").textContent = "完成";

                if (progressBar) progressBar.style.width = "75%";
                document.getElementById("mode2Badge").className = "badge bg-warning text-dark";
                document.getElementById("mode2Badge").textContent = "計算中...";

                setTimeout(() => {
                    // 【模式二】超高戰力平滑派駐 (逐輪貪婪 + 激勵權重)
                    const sol2 = (typeof CalcEngine !== "undefined" && CalcEngine.runMode2SmoothGreedy)
                        ? CalcEngine.runMode2SmoothGreedy(characters, bosses)
                        : [];
                    mode2SolutionGlobal = sol2;
                    renderMode2Results(sol2, bosses);
                    document.getElementById("mode2Badge").className = "badge bg-success";
                    document.getElementById("mode2Badge").textContent = "完成";
                    if (progressBar) progressBar.style.width = "100%";
                    clearDataDirty();

                    // 算完後於右下角優雅浮現匯出戰報按鈕
                    const fab = document.getElementById("floatingExportBtn");
                    if (fab) fab.classList.remove("d-none");

                    setTimeout(() => {
                        if (overlay) overlay.classList.add("d-none");
                    }, 200);
                }, 20);
            }, 20);
        } catch (err) {
            console.error("主線程運算錯誤:", err);
            alert("❌ 算力引擎發生錯誤：" + err.message);
            if (overlay) overlay.classList.add("d-none");
        }
    }

    // 透過 requestAnimationFrame 先行交出主線程，確保磨砂遮罩 0ms 瞬間顯示後直接執行極速運算
    requestAnimationFrame(() => {
        setTimeout(executeMainThreadDirectly, 30);
    });
}

// ==========================================
// 戰報渲染函式
// ==========================================

// 【模式一】早期完美 0 溢出優先 戰報渲染 (左欄)
function renderMode1Results(solution, bosses) {
    const container = document.getElementById("mode1ResultContainer");
    if (!container) return;
    if (!solution || solution.length === 0) {
        container.innerHTML = `<div class="alert alert-warning fs-7">⚠️ 戰力不足以打通第 1 輪 BOSS。</div>`;
        return;
    }

    const intimacySelect = document.getElementById("intimacySelect");
    const intimacy = intimacySelect ? parseInt(intimacySelect.value) || 0 : 0;
    const maxRounds = bosses ? bosses.length : 20;

    const clearedCount = solution.filter(s => s.cleared).length;
    const totOverkill = solution.filter(s => s.cleared).reduce((sum, s) => sum + s.overkill, 0);

    const endIntimacy = Math.min(100, intimacy + clearedCount * 5);
    const isGraduated = (endIntimacy >= 100);

    let bannerHtml = isGraduated ?
        `<div class="alert alert-success p-2 mb-2 fs-7">
            <b>🎉 完美通關 ${clearedCount} 輪！親密度達到 100% 畢業結束</b> ｜ 累計溢出：<b>${Math.round(totOverkill).toLocaleString()}</b>
        </div>` :
        `<div class="alert alert-primary p-2 mb-2 fs-7">
            <b>🎯 擊破 ${clearedCount}/${maxRounds} 輪 (親密度 ${endIntimacy}%)</b> ｜ 累計溢出：<b>${Math.round(totOverkill).toLocaleString()}</b>
        </div>`;

    let html = bannerHtml;

    solution.forEach(roundSol => {
        const isCleared = roundSol.cleared;
        const algoClass = roundSol.algo === 'DFS全局匹配' ? 'algo-dfs' :
            roundSol.algo === 'DP背包演算法' ? 'algo-dp' : 'algo-final';

        html += `
            <div class="round-card ${isCleared ? 'cleared' : 'failed'}">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <div class="d-flex align-items-center gap-1">
                        <span class="badge ${isCleared ? 'bg-primary' : 'bg-danger'}">${roundSol.round}</span>
                        ${roundSol.algo ? `<span class="algo-tag-badge ${algoClass}">${roundSol.algo}</span>` : ''}
                    </div>
                    <span class="fs-7 fw-bold">BOSS血量: ${roundSol.bossHp.toLocaleString()}</span>
                </div>
                <div class="mb-1">
                    ${roundSol.members.map(m => `<span class="char-tag-pill">${m.name} (${m.score.toLocaleString()})</span>`).join('')}
                </div>
                <div class="d-flex justify-content-between fs-8 text-muted border-top pt-1 mt-1">
                    <span>戰力總輸出值: <b>${roundSol.teamDmg.toLocaleString()}</b></span>
                    <span class="${isCleared ? 'text-success' : 'text-danger'} fw-bold">
                        ${isCleared ? `溢出: +${Math.round(roundSol.overkill).toLocaleString()}` : `殘餘: ${Math.abs(roundSol.overkill).toLocaleString()}`}
                    </span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// 【模式二】超高戰力平滑派駐 戰報渲染 (右欄)
function renderMode2Results(solution, bosses) {
    const container = document.getElementById("mode2ResultContainer");
    if (!container) return;
    if (!solution || solution.length === 0) {
        container.innerHTML = `<div class="alert alert-warning fs-7">⚠️ 戰力不足以打通第 1 輪 BOSS。</div>`;
        return;
    }

    const intimacySelect = document.getElementById("intimacySelect");
    const intimacy = intimacySelect ? parseInt(intimacySelect.value) || 0 : 0;
    const maxRounds = bosses ? bosses.length : 20;

    const clearedCount = solution.filter(s => s.cleared).length;
    const totOverkill = solution.filter(s => s.cleared).reduce((sum, s) => sum + s.overkill, 0);

    const endIntimacy = Math.min(100, intimacy + clearedCount * 5);
    const isGraduated = (endIntimacy >= 100);

    let bannerHtml = isGraduated ?
        `<div class="alert alert-success p-2 mb-2 fs-7">
            <b>🎉 完美通關 ${clearedCount} 輪！親密度達到 100% 畢業結束</b> ｜ 累計溢出：<b>${Math.round(totOverkill).toLocaleString()}</b>
        </div>` :
        `<div class="alert alert-warning p-2 mb-2 fs-7">
            <b>🎯 擊破 ${clearedCount}/${maxRounds} 輪 (親密度 ${endIntimacy}%)</b> ｜ 累計溢出：<b>${Math.round(totOverkill).toLocaleString()}</b>
        </div>`;

    let html = bannerHtml;

    solution.forEach(roundSol => {
        const isCleared = roundSol.cleared;
        const algoClass = 'algo-final';

        html += `
            <div class="round-card ${isCleared ? 'cleared' : 'failed'}">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <div class="d-flex align-items-center gap-1">
                        <span class="badge ${isCleared ? 'bg-success' : 'bg-danger'}">${roundSol.round}</span>
                        ${roundSol.algo ? `<span class="algo-tag-badge ${algoClass}">${roundSol.algo}</span>` : ''}
                    </div>
                    <span class="fs-7 fw-bold">BOSS血量: ${roundSol.bossHp.toLocaleString()}</span>
                </div>
                <div class="mb-1">
                    ${roundSol.members.map(m => `<span class="char-tag-pill">${m.name} (${m.score.toLocaleString()})</span>`).join('')}
                </div>
                <div class="d-flex justify-content-between fs-8 text-muted border-top pt-1 mt-1">
                    <span>戰力總輸出值: <b>${roundSol.teamDmg.toLocaleString()}</b></span>
                    <span class="${isCleared ? 'text-success' : 'text-danger'} fw-bold">
                        ${isCleared ? `溢出: +${Math.round(roundSol.overkill).toLocaleString()}` : `殘餘: ${Math.abs(roundSol.overkill).toLocaleString()}`}
                    </span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ==========================================
// Excel (.xlsx) 登場角色清冊 匯出/匯入/解析 邏輯
// ==========================================

function parseExcelData(workbook) {
    let sheetName = workbook.SheetNames.find(n => n.includes("登場角色")) || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // 1. 精準讀取 B1:B3 居民參數
    if (jsonRows.length >= 3) {
        if (jsonRows[0] && jsonRows[0][1] !== undefined && jsonRows[0][1] !== null) {
            let rawVal = jsonRows[0][1];
            let intimacyNum = 0;
            if (typeof rawVal === "number") {
                intimacyNum = (rawVal > 0 && rawVal <= 1) ? Math.round(rawVal * 100) : Math.round(rawVal);
            } else if (typeof rawVal === "string") {
                let strVal = rawVal.replace("%", "").trim();
                let parsed = parseFloat(strVal);
                if (!isNaN(parsed)) {
                    intimacyNum = (parsed > 0 && parsed <= 1 && rawVal.includes(".")) ? Math.round(parsed * 100) : Math.round(parsed);
                }
            }
            const intimacySelect = document.getElementById("intimacySelect");
            if (intimacySelect) {
                intimacySelect.value = Math.min(100, Math.max(0, intimacyNum));
                handleIntimacyChange();
            }
        }
        if (jsonRows[1] && jsonRows[1][1] !== undefined && jsonRows[1][1] !== null) {
            let baseHpNum = parseInt(jsonRows[1][1]);
            if (!isNaN(baseHpNum) && baseHpNum > 0) {
                const baseHpInput = document.getElementById("bossBaseHp");
                if (baseHpInput) baseHpInput.value = baseHpNum;
            }
        }
        if (jsonRows[2] && jsonRows[2][1] !== undefined && jsonRows[2][1] !== null) {
            let incHpNum = parseInt(jsonRows[2][1]);
            if (!isNaN(incHpNum) && incHpNum >= 0) {
                const incHpInput = document.getElementById("bossIncHp");
                if (incHpInput) incHpInput.value = incHpNum;
            }
        }
    }

    // 2. 讀取登場角色資料
    const newSelected = [];
    const ignoreKeywords = ["當前居民親密度", "第 1 輪初始精力", "第 2 輪起遞增精力", "角色姓名", "學科成績", "可交流次數"];

    let startRowIndex = 6;
    if (jsonRows.length > 5 && jsonRows[5] && String(jsonRows[5][0]).includes("角色姓名")) {
        startRowIndex = 6;
    } else {
        const headerIdx = jsonRows.findIndex(r => r && r[0] && String(r[0]).trim() === "角色姓名");
        if (headerIdx !== -1) startRowIndex = headerIdx + 1;
        else startRowIndex = 0;
    }

    for (let i = startRowIndex; i < jsonRows.length; i++) {
        const row = jsonRows[i];
        if (!row || row.length < 2) continue;
        const name = row[0] ? String(row[0]).trim() : "";
        const score = Number(row[1]) || 0;
        const count = Number(row[2]) > 0 ? Number(row[2]) : 3;

        if (ignoreKeywords.some(kw => name.includes(kw))) continue;

        if (name && score > 0) {
            newSelected.push({ name, score, count });
        }
    }

    return newSelected;
}

function exportCharExcelTemplate() {
    const intimacyVal = document.getElementById("intimacySelect") ? document.getElementById("intimacySelect").value + "%" : "0%";
    const baseHpInput = document.getElementById("bossBaseHp");
    const incHpInput = document.getElementById("bossIncHp");
    const baseHpVal = baseHpInput && baseHpInput.value !== "" ? Number(baseHpInput.value) : "";
    const incHpVal = incHpInput && incHpInput.value !== "" ? Number(incHpInput.value) : "";

    const activeRows = selectedCharacters.map(c => [c.name, c.score, c.count]);

    const lizuMale = ALL_CHARACTERS.filter(c => c.group === "理組" && c.gender === "男").map(c => c.name);
    const lizuFemale = ALL_CHARACTERS.filter(c => c.group === "理組" && c.gender === "女").map(c => c.name);
    const wenzuMale = ALL_CHARACTERS.filter(c => c.group === "文組" && c.gender === "男").map(c => c.name);
    const wenzuFemale = ALL_CHARACTERS.filter(c => c.group === "文組" && c.gender === "女").map(c => c.name);

    const maxRefRows = Math.max(lizuMale.length, lizuFemale.length, wenzuMale.length, wenzuFemale.length, activeRows.length);

    const data = [
        ["當前居民親密度", intimacyVal, null, null, null, null, null, null, null],
        ["第 1 輪初始精力", baseHpVal, null, null, null, null, null, null, null],
        ["第 2 輪起遞增精力", incHpVal, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null, null, null],
        ["角色姓名", "學科成績", "可交流次數", null, "理組-男生", "理組-女生", null, "文組-男生", "文組-女生"]
    ];

    for (let i = 0; i < maxRefRows; i++) {
        const act = activeRows[i] || [null, null, null];
        const lm = lizuMale[i] || null;
        const lf = lizuFemale[i] || null;
        const wm = wenzuMale[i] || null;
        const wf = wenzuFemale[i] || null;

        data.push([
            act[0], act[1], act[2],
            null,
            lm, lf,
            null,
            wm, wf
        ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(data);

    const thinBorder = {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
    };

    const styleYellowHeader = {
        fill: { fgColor: { rgb: "FFFF00" } },
        font: { bold: true, name: "微軟正黑體", sz: 11 },
        border: thinBorder,
        alignment: { horizontal: "center", vertical: "center" }
    };

    const styleGreenGroup = {
        fill: { fgColor: { rgb: "92D050" } },
        font: { bold: true, name: "微軟正黑體", sz: 11 },
        border: thinBorder,
        alignment: { horizontal: "center", vertical: "center" }
    };

    const stylePurpleGroup = {
        fill: { fgColor: { rgb: "D9D2E9" } },
        font: { bold: true, name: "微軟正黑體", sz: 11 },
        border: thinBorder,
        alignment: { horizontal: "center", vertical: "center" }
    };

    const styleMale = {
        fill: { fgColor: { rgb: "BDD7EE" } },
        font: { name: "微軟正黑體", sz: 11 },
        border: thinBorder,
        alignment: { horizontal: "center", vertical: "center" }
    };

    const styleFemale = {
        fill: { fgColor: { rgb: "F8CBAD" } },
        font: { name: "微軟正黑體", sz: 11 },
        border: thinBorder,
        alignment: { horizontal: "center", vertical: "center" }
    };

    const styleNormal = {
        font: { name: "微軟正黑體", sz: 11 },
        border: thinBorder,
        alignment: { horizontal: "center", vertical: "center" }
    };

    for (let r = 0; r < 3; r++) {
        const cellARef = XLSX.utils.encode_cell({ r: r, c: 0 });
        const cellBRef = XLSX.utils.encode_cell({ r: r, c: 1 });
        if (ws[cellARef]) ws[cellARef].s = styleYellowHeader;
        if (ws[cellBRef]) ws[cellBRef].s = styleNormal;
    }

    for (let c = 0; c < 3; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: 5, c: c });
        if (ws[cellRef]) ws[cellRef].s = styleYellowHeader;
    }

    const e6 = XLSX.utils.encode_cell({ r: 5, c: 4 });
    const f6 = XLSX.utils.encode_cell({ r: 5, c: 5 });
    if (ws[e6]) ws[e6].s = styleGreenGroup;
    if (ws[f6]) ws[f6].s = styleGreenGroup;

    const h6 = XLSX.utils.encode_cell({ r: 5, c: 7 });
    const i6 = XLSX.utils.encode_cell({ r: 5, c: 8 });
    if (ws[h6]) ws[h6].s = stylePurpleGroup;
    if (ws[i6]) ws[i6].s = stylePurpleGroup;

    const totalRows = data.length;
    for (let r = 6; r < totalRows; r++) {
        const cellARef = XLSX.utils.encode_cell({ r: r, c: 0 });
        const cellBRef = XLSX.utils.encode_cell({ r: r, c: 1 });
        const cellCRef = XLSX.utils.encode_cell({ r: r, c: 2 });

        if (ws[cellARef] && ws[cellARef].v) {
            const charName = String(ws[cellARef].v).trim();
            const charObj = ALL_CHARACTERS.find(c => c.name === charName);
            const isFemale = charObj && charObj.gender === "女";
            const rowStyle = isFemale ? styleFemale : styleMale;

            ws[cellARef].s = rowStyle;
            if (ws[cellBRef]) ws[cellBRef].s = rowStyle;
            if (ws[cellCRef]) ws[cellCRef].s = rowStyle;
        }

        const cellERef = XLSX.utils.encode_cell({ r: r, c: 4 });
        if (ws[cellERef] && ws[cellERef].v) ws[cellERef].s = styleMale;

        const cellFRef = XLSX.utils.encode_cell({ r: r, c: 5 });
        if (ws[cellFRef] && ws[cellFRef].v) ws[cellFRef].s = styleFemale;

        const cellHRef = XLSX.utils.encode_cell({ r: r, c: 7 });
        if (ws[cellHRef] && ws[cellHRef].v) ws[cellHRef].s = styleMale;

        const cellIRef = XLSX.utils.encode_cell({ r: r, c: 8 });
        if (ws[cellIRef] && ws[cellIRef].v) ws[cellIRef].s = styleFemale;
    }

    ws['!cols'] = [
        { wch: 18 },
        { wch: 16 },
        { wch: 14 },
        { wch: 4 },
        { wch: 14 },
        { wch: 14 },
        { wch: 4 },
        { wch: 14 },
        { wch: 14 }
    ];

    const lastRowIndex = Math.max(6, data.length);
    ws['!autofilter'] = { ref: "A6:C" + lastRowIndex };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "登場角色清單");

    const now = new Date();
    const dateStr = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0');
    downloadExcelFile(wb, `登場角色清單備份_${dateStr}.xlsx`);
}

// 支援本機 file:// 協議與瀏覽器無阻礙下載具正確檔名之 Excel 檔案
async function downloadExcelFile(wb, filename) {
    try {
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

        // 1. 優先使用現代瀏覽器原生 File System Access API (直接跳出 Windows 另存新檔，絕對保留中文檔名與 .xlsx)
        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: filename,
                    types: [{
                        description: 'Excel 試算表 (*.xlsx)',
                        accept: {
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
                        }
                    }]
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                return;
            } catch (err) {
                if (err.name === 'AbortError') return; // 使用者自己按取消，不做任何事
                console.warn("showSaveFilePicker not supported/declined, falling back to Blob download:", err);
            }
        }

        // 2. 降級備用策略：使用 Blob URL 並延遲 60 秒銷毀，確保瀏覽器下載器完整讀取檔名與副檔名
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.position = "fixed";
        a.style.top = "-9999px";
        a.href = blobUrl;
        a.download = filename;
        a.setAttribute("download", filename);
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            if (document.body.contains(a)) document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        }, 60000);
    } catch (err) {
        console.error("Excel download failed, fallback to SheetJS default:", err);
        XLSX.writeFile(wb, filename);
    }
}

// 頁面初始化預設自動靜默載入 Demo 登場角色與參數 (無 alert 干擾)
async function autoLoadInitialDemoData() {
    let loadedFromNetwork = false;
    try {
        const demoPath = encodeURI('data/登場角色清單demo檔.xlsx') + '?v=' + new Date().getTime();
        const response = await fetch(demoPath);
        if (response.ok) {
            const data = new Uint8Array(await response.arrayBuffer());
            const workbook = XLSX.read(data, { type: 'array' });
            const newSelected = parseExcelData(workbook);
            if (newSelected.length > 0) {
                selectedCharacters = newSelected;
                loadedFromNetwork = true;
            }
        }
    } catch (err) {
        console.warn("Network fetch demo file failed (file:// protocol offline mode), using fallback demo data:", err);
    }

    if (!loadedFromNetwork && typeof DEFAULT_DEMO_DATA !== "undefined") {
        selectedCharacters = JSON.parse(JSON.stringify(DEFAULT_DEMO_DATA.characters));
        const intimacySelect = document.getElementById("intimacySelect");
        const baseHpInput = document.getElementById("bossBaseHp");
        const incHpInput = document.getElementById("bossIncHp");
        if (intimacySelect) {
            intimacySelect.value = DEFAULT_DEMO_DATA.intimacy;
            handleIntimacyChange();
        }
        if (baseHpInput) baseHpInput.value = DEFAULT_DEMO_DATA.baseHp;
        if (incHpInput) incHpInput.value = DEFAULT_DEMO_DATA.incHp;
    }

    renderCharPool();
    renderSelectedTable();
}

async function loadDemoExcel() {
    await autoLoadInitialDemoData();
    alert("✅ 成功導入 Demo 值 (" + selectedCharacters.length + " 位登場角色與居民參數)！");
}

function resetSelectedCharacters() {
    selectedCharacters = [];
    mode1SolutionGlobal = null;
    mode2SolutionGlobal = null;

    const baseHpInput = document.getElementById("bossBaseHp");
    const incHpInput = document.getElementById("bossIncHp");
    const intimacySelect = document.getElementById("intimacySelect");
    if (baseHpInput) baseHpInput.value = "";
    if (incHpInput) incHpInput.value = "";
    if (intimacySelect) {
        intimacySelect.value = "0";
        handleIntimacyChange();
    }

    renderCharPool();
    renderSelectedTable();
    clearDataDirty();

    updateRealtimeEstimate();

    const fab = document.getElementById("floatingExportBtn");
    if (fab) fab.classList.add("d-none");

    const m1Container = document.getElementById("mode1ResultContainer");
    if (m1Container) {
        m1Container.innerHTML = '<div class="text-center text-muted py-4"><i class="fa-solid fa-chart-line fa-2x mb-2 d-block text-secondary"></i>尚未執行運算，請點擊左側「🚀 開始最佳化運算」(或按 <code>Ctrl+Enter</code>)。</div>';
    }
    const m2Container = document.getElementById("mode2ResultContainer");
    if (m2Container) {
        m2Container.innerHTML = '<div class="text-center text-muted py-5 fs-7"><i class="fa-solid fa-chart-bar fa-2x mb-2 d-block text-secondary"></i>尚未執行運算，請點擊左側「🚀 開始最佳化運算」(或按 <code>Ctrl+Enter</code>)。</div>';
    }

    const b1 = document.getElementById("mode1Badge");
    if (b1) {
        b1.className = "badge bg-secondary";
        b1.textContent = "待運算";
    }
    const b2 = document.getElementById("mode2Badge");
    if (b2) {
        b2.className = "badge bg-secondary";
        b2.textContent = "待運算";
    }
}

function importCharExcel(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            const newSelected = parseExcelData(workbook);
            if (newSelected.length > 0) {
                selectedCharacters = newSelected;
                renderCharPool();
                renderSelectedTable();
                markDataDirty();
                alert("✅ 成功匯入 " + newSelected.length + " 位登場角色與居民參數！");
            } else {
                alert("⚠️ 檔案中未發現有效的登場角色數據（請確認 Col A 角色姓名與 Col B 成績 > 0）。");
            }
        } catch (err) {
            console.error("Excel import failed:", err);
            alert("❌ 匯入失敗：Excel 檔案格式解析錯誤！");
        }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = "";
}

function exportStrategyExcel() {
    if (!mode1SolutionGlobal && !mode2SolutionGlobal) {
        alert("❌ 尚無算力結果可供匯出，請先點擊「🚀 開始最佳化運算」。");
        return;
    }

    const wb = XLSX.utils.book_new();
    const intimacyVal = document.getElementById("intimacySelect") ? document.getElementById("intimacySelect").value + "%" : "0%";
    const baseHpVal = document.getElementById("bossBaseHp") ? document.getElementById("bossBaseHp").value : "";
    const incHpVal = document.getElementById("bossIncHp") ? document.getElementById("bossIncHp").value : "";

    const thinBorder = {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } }
    };

    const styleYellowHeader = {
        fill: { fgColor: { rgb: "FFFF00" } },
        font: { bold: true, name: "微軟正黑體", sz: 11 },
        border: thinBorder,
        alignment: { horizontal: "center", vertical: "center" }
    };

    const styleTitle = {
        fill: { fgColor: { rgb: "BDD7EE" } },
        font: { bold: true, name: "微軟正黑體", sz: 12 },
        border: thinBorder,
        alignment: { horizontal: "left", vertical: "center" }
    };

    const styleNormal = {
        font: { name: "微軟正黑體", sz: 11 },
        border: thinBorder,
        alignment: { horizontal: "center", vertical: "center" }
    };

    function applyStrategySheetStyles(ws, rowCount) {
        ws['!cols'] = [
            { wch: 14 },
            { wch: 18 },
            { wch: 16 },
            { wch: 16 }
        ];
        ws['!autofilter'] = { ref: "A6:D" + rowCount };

        const a1 = XLSX.utils.encode_cell({ r: 0, c: 0 });
        if (ws[a1]) ws[a1].s = styleTitle;

        for (let r = 1; r < 4; r++) {
            const ca = XLSX.utils.encode_cell({ r: r, c: 0 });
            const cb = XLSX.utils.encode_cell({ r: r, c: 1 });
            if (ws[ca]) ws[ca].s = styleYellowHeader;
            if (ws[cb]) ws[cb].s = styleNormal;
        }

        for (let c = 0; c < 4; c++) {
            const ch = XLSX.utils.encode_cell({ r: 5, c: c });
            if (ws[ch]) ws[ch].s = styleYellowHeader;
        }

        for (let r = 6; r < rowCount; r++) {
            for (let c = 0; c < 4; c++) {
                const cellRef = XLSX.utils.encode_cell({ r: r, c: c });
                if (ws[cellRef]) {
                    const charName = c === 1 ? String(ws[cellRef].v).trim() : "";
                    const charObj = ALL_CHARACTERS.find(ch => ch.name === charName);
                    if (charObj) {
                        ws[cellRef].s = {
                            fill: { fgColor: { rgb: charObj.gender === "女" ? "F8CBAD" : "BDD7EE" } },
                            font: { name: "微軟正黑體", sz: 11 },
                            border: thinBorder,
                            alignment: { horizontal: "center", vertical: "center" }
                        };
                    } else {
                        ws[cellRef].s = styleNormal;
                    }
                }
            }
        }
    }

    // 第一分頁：【模式一】早期完美 0 溢出優先 (對應全局 DFS 算力結果)
    if (mode1SolutionGlobal) {
        const rows1 = [
            ["【模式一】早期完美 0 溢出優先策略戰報"],
            ["當前居民親密度", intimacyVal],
            ["第 1 輪初始精力", baseHpVal],
            ["第 2 輪起遞增精力", incHpVal],
            [null, null, null, null],
            ["交流輪別", "出動角色", "扣除居民精力", "居民殘餘精力"]
        ];
        mode1SolutionGlobal.forEach(roundSol => {
            let remHp = roundSol.bossHp;
            roundSol.members.forEach(m => {
                remHp -= m.score;
                rows1.push([roundSol.round, m.name, m.score, remHp]);
            });
        });
        const ws1 = XLSX.utils.aoa_to_sheet(rows1);
        applyStrategySheetStyles(ws1, rows1.length);
        XLSX.utils.book_append_sheet(wb, ws1, "模式一_早期0溢出優先");
    }

    // 第二分頁：【模式二】超高戰力平滑派駐 (對應 20% 加權算力結果)
    if (mode2SolutionGlobal) {
        const rows2 = [
            ["【模式二】超高戰力平滑派駐策略戰報"],
            ["當前居民親密度", intimacyVal],
            ["第 1 輪初始精力", baseHpVal],
            ["第 2 輪起遞增精力", incHpVal],
            [null, null, null, null],
            ["交流輪別", "出動角色", "扣除居民精力", "居民殘餘精力"]
        ];
        mode2SolutionGlobal.forEach(roundSol => {
            let remHp = roundSol.bossHp;
            roundSol.members.forEach(m => {
                remHp -= m.score;
                rows2.push([roundSol.round, m.name, m.score, remHp]);
            });
        });
        const ws2 = XLSX.utils.aoa_to_sheet(rows2);
        applyStrategySheetStyles(ws2, rows2.length);
        XLSX.utils.book_append_sheet(wb, ws2, "模式二_超高戰力平滑");
    }

    const now = new Date();
    const dateStr = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0');
    downloadExcelFile(wb, `古鎮居民交流雙模式戰術報表_${dateStr}.xlsx`);
}
