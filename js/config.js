/**
 * 《我當校長超勇的》57 位角色圖鑑與預設組態設定 (MIT License)
 */

// 57 位角色完整圖鑑資料庫 (僅包含群組與性別分類)
const ALL_CHARACTERS = [
    // 文組 - 男 (16 位)
    { name: "少年包拯", group: "文組", gender: "男" },
    { name: "少年孔融", group: "文組", gender: "男" },
    { name: "小光", group: "文組", gender: "男" },
    { name: "陳澤", group: "文組", gender: "男" },
    { name: "齊凱飛", group: "文組", gender: "男" },
    { name: "張子矜", group: "文組", gender: "男" },
    { name: "電競傑克", group: "文組", gender: "男" },
    { name: "運動阿緯", group: "文組", gender: "男" },
    { name: "畫畫傑哥", group: "文組", gender: "男" },
    { name: "季靖琪", group: "文組", gender: "男" },
    { name: "楊家豪", group: "文組", gender: "男" },
    { name: "童樂正", group: "文組", gender: "男" },
    { name: "梁柏霖", group: "文組", gender: "男" },
    { name: "李君銘", group: "文組", gender: "男" },
    { name: "小海", group: "文組", gender: "男" },
    { name: "肖國才", group: "文組", gender: "男" },

    // 文組 - 女 (15 位)
    { name: "武則天", group: "文組", gender: "女" },
    { name: "花木蘭", group: "文組", gender: "女" },
    { name: "劉思璿", group: "文組", gender: "女" },
    { name: "藍薇薇", group: "文組", gender: "女" },
    { name: "李靜怡", group: "文組", gender: "女" },
    { name: "郭芷靈", group: "文組", gender: "女" },
    { name: "苗瑛", group: "文組", gender: "女" },
    { name: "安琪", group: "文組", gender: "女" },
    { name: "楊青謠", group: "文組", gender: "女" },
    { name: "陶子", group: "文組", gender: "女" },
    { name: "戴筱婷", group: "文組", gender: "女" },
    { name: "秦詩雨", group: "文組", gender: "女" },
    { name: "吳悠悠", group: "文組", gender: "女" },
    { name: "林夢庭", group: "文組", gender: "女" },
    { name: "丁小芹", group: "文組", gender: "女" },

    // 理組 - 男 (13 位)
    { name: "小王子", group: "理組", gender: "男" },
    { name: "阿牛", group: "理組", gender: "男" },
    { name: "譚浩嘉", group: "理組", gender: "男" },
    { name: "胡睿識", group: "理組", gender: "男" },
    { name: "道一鋒", group: "理組", gender: "男" },
    { name: "嚴明信", group: "理組", gender: "男" },
    { name: "木果陽", group: "理組", gender: "男" },
    { name: "葉雨星", group: "理組", gender: "男" },
    { name: "宗翰", group: "理組", gender: "男" },
    { name: "陸修", group: "理組", gender: "男" },
    { name: "吳子軒", group: "理組", gender: "男" },
    { name: "楊翰飛", group: "理組", gender: "男" },
    { name: "盧宇誠", group: "理組", gender: "男" },

    // 理組 - 女 (13 位)
    { name: "織女", group: "理組", gender: "女" },
    { name: "安若珍", group: "理組", gender: "女" },
    { name: "蘇巧巧", group: "理組", gender: "女" },
    { name: "沈亦秋", group: "理組", gender: "女" },
    { name: "夏詩琪", group: "理組", gender: "女" },
    { name: "陳欣雅", group: "理組", gender: "女" },
    { name: "貝斯", group: "理組", gender: "女" },
    { name: "林詩月", group: "理組", gender: "女" },
    { name: "趙雅玲", group: "理組", gender: "女" },
    { name: "林宜芳", group: "理組", gender: "女" },
    { name: "賈霖霖", group: "理組", gender: "女" },
    { name: "黃依蕾", group: "理組", gender: "女" },
    { name: "宋霖菲", group: "理組", gender: "女" }
];

// 預設 Demo 保底數據 (用於 file:// 離線相容)
const DEFAULT_DEMO_DATA = {
    intimacy: 0,
    baseHp: 240000,
    incHp: 1800,
    characters: [
        { name: "藍薇薇", score: 96814, count: 6 },
        { name: "張子矜", score: 86555, count: 3 },
        { name: "武則天", score: 67481, count: 3 },
        { name: "小光", score: 59633, count: 3 },
        { name: "季靖琪", score: 49582, count: 3 },
        { name: "齊凱飛", score: 46753, count: 3 },
        { name: "安琪", score: 45300, count: 3 },
        { name: "苗瑛", score: 43303, count: 3 },
        { name: "陳澤", score: 42684, count: 3 },
        { name: "電競傑克", score: 42277, count: 3 },
        { name: "楊青謠", score: 40247, count: 3 },
        { name: "畫畫傑哥", score: 36952, count: 3 },
        { name: "少年孔融", score: 36360, count: 3 },
        { name: "陶子", score: 27036, count: 3 },
        { name: "戴筱婷", score: 17352, count: 3 },
        { name: "運動阿緯", score: 16916, count: 3 },
        { name: "梁柏霖", score: 15544, count: 3 },
        { name: "林夢庭", score: 13665, count: 3 },
        { name: "秦詩雨", score: 10754, count: 3 },
        { name: "吳悠悠", score: 9789, count: 3 },
        { name: "丁小芹", score: 8628, count: 3 },
        { name: "楊家豪", score: 7515, count: 3 },
        { name: "小海", score: 5579, count: 3 },
        { name: "肖國才", score: 5579, count: 3 },
        { name: "童樂正", score: 5317, count: 3 },
        { name: "李君銘", score: 5048, count: 3 }
    ]
};
