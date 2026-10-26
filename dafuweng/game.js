/**
 * 《天路同行：圣经大富翁》核心游戏逻辑 (game.js) - v2.1 升级版
 * 新增特性：
 * 1. 镜头自动平滑跟随当前行动玩家 (focusCameraOnPlayer)
 * 2. 强化玩家代表色边框与所属堂会彩色顶栏旗帜
 * 3. 投掷骰子后严格禁用技能栏与HUD恩赐芯片点击
 * 4. 屏幕中央动态事件横幅弹窗 (showEventPopup) 实时播报关键事件
 */

// ==================== 一、静态配置数据 ====================

const CHURCH_RANK_NAMES = [
  "无",
  "家庭聚会",
  "乡村小堂",
  "城镇会堂",
  "区域大堂",
  "中心牧区",
  "宏伟圣殿",
  "使徒中心"
];

const PLAYER_COLORS = ["#ef4444", "#3b82f6", "#10b981", "#a855f7"];
const PLAYER_COLOR_NAMES = ["R", "B", "G", "P"];

const CHARACTERS = [
  {
    id: "abraham",
    name: "亚伯拉罕",
    avatar: "亚",
    title: "信心之父（旧约）",
    skillName: "【多国之父】",
    skillDesc: "初始信心额外 +20（开局70信心）；每次在安息日格休整时，当回合与停留回合各额外 +5 信心（共得20信心）。"
  },
  {
    id: "moses",
    name: "摩西",
    avatar: "摩",
    title: "律法与领路人（旧约）",
    skillName: "【旷野引导】",
    skillDesc: "停留在试炼格时，试炼要求的信心门槛永久降低 15 点；且通过试炼获得的财富与信心奖励提升 50%。"
  },
  {
    id: "david",
    name: "大卫",
    avatar: "卫",
    title: "合神心意的王（旧约）",
    skillName: "【赞美诗篇】",
    skillDesc: "回合开始的教会查经问答中，每答对 1 道题，除教会信徒 +10% 外，自身额外恢复 +3 信心与 +$300 财富。"
  },
  {
    id: "solomon",
    name: "所罗门",
    avatar: "所",
    title: "智慧与圣殿之王（旧约）",
    skillName: "【圣殿建造者】",
    skillDesc: "初始财富额外 +$3,000（开局$13,000）；将教会扩建至 5~7 级时，扩建费用享受 8 折优惠。"
  },
  {
    id: "peter",
    name: "彼得",
    avatar: "彼",
    title: "教会磐石（新约）",
    skillName: "【磐石牧养】",
    skillDesc: "建立 1 级教会时初始信徒数翻倍（2/10地价）；且名下教会问答答错时，信徒仅减少 25%（常规减少50%）。"
  },
  {
    id: "paul",
    name: "保罗",
    avatar: "保",
    title: "外邦人的使徒（新约）",
    skillName: "【宣教热忱】",
    skillDesc: "每次路过或停留起点【耶路撒冷】时，除获得 $1,000 外，名下所有已建教会的信徒立即额外增加 5%。"
  },
  {
    id: "barnabas",
    name: "巴拿巴",
    avatar: "巴",
    title: "劝慰子（新约）",
    skillName: "【甘心劝慰】",
    skillDesc: "访问他人教会支付奉献款时减免 25%；当其他玩家访问巴拿巴的教会奉献时，巴拿巴额外获得 +5 信心。"
  },
  {
    id: "luke",
    name: "路加",
    avatar: "路",
    title: "博学医者与史家（新约）",
    skillName: "【详尽考究】",
    skillDesc: "教会查经问答时，系统自动排除 1 个错误选项（四选一变三选一）；且答错时自身不扣信心。"
  }
];

const SPIRITUAL_GIFTS = [
  {
    id: "pillar_cloud",
    name: "云柱火柱",
    cost: 15,
    desc: "神圣引导：本回合不投随机骰子，直接指定前进 1 ~ 6 步。"
  },
  {
    id: "eagle_wings",
    name: "如鹰展翅",
    cost: 10,
    desc: "奔跑不困倦：本回合投掷 2 颗骰子（前进 2~12 步）。"
  },
  {
    id: "philip_teleport",
    name: "腓利被提",
    cost: 20,
    desc: "圣灵提走：本回合不投骰子，直接传送至名下任意一座教会并触发扩建判定。"
  },
  {
    id: "nehemiah_wall",
    name: "尼希米筑墙",
    cost: 20,
    desc: "修造城墙：立即指定名下任意一座未满级教会，免费扩建 1 级。"
  },
  {
    id: "cleanse_temple",
    name: "洁净圣殿",
    cost: 25,
    desc: "斥责世俗：指定任意对手的一座教会强制降低 1 级（1级则信徒减半）。"
  },
  {
    id: "cana_wedding",
    name: "迦拿婚宴",
    cost: 15,
    desc: "水变美酒：立即获得「当前剩余信心 × $40」的财富补助（保底 $1,200）。"
  },
  {
    id: "five_loaves",
    name: "五饼二鱼",
    cost: 25,
    desc: "倍增神迹：指定名下任意一座教会，其当前信徒人数立即增加 30%。"
  },
  {
    id: "armor_of_god",
    name: "属灵全副军装",
    cost: 15,
    desc: "信德藤牌：获得1层护盾，下一次免除他人教会奉献款，或免除试炼失败惩罚。"
  },
  {
    id: "gift_tongues",
    name: "舌音方言",
    cost: 10,
    desc: "圣灵口才：下回合开始时的教会查经问答无需做题，全部直接判定为答对（+10%）。"
  },
  {
    id: "jubilee_horn",
    name: "约禧年号角",
    cost: 30,
    desc: "产业归回：立即从当前场上财富最多的一名对手处转移 15% 现金归入自己名下。"
  }
];

const TRIAL_EVENTS = [
  {
    name: "迦拿的酒尽了",
    story: "《约翰福音》2章：婚宴上酒用尽，马利亚与仆人顺服主的话语把水缸倒满。",
    reqFaith: 30,
    winText: "化水为酒：获得供应，财富 +$1,200！",
    loseText: "宴席窘迫：信心不足，财富 -$800。",
    onWin: (p, mult) => { p.wealth += Math.round(1200 * mult); },
    onLose: (p) => { p.wealth -= 800; }
  },
  {
    name: "旷野吗哪的考验",
    story: "《出埃及记》16章：百姓在旷野每天按需拾取吗哪，不可留到次日早晨。",
    reqFaith: 40,
    winText: "日用充足：信心 +8，财富 +$1,000！",
    loseText: "吗哪生虫：财富 -$1,200，信心 -5。",
    onWin: (p, mult) => { p.faith += Math.round(8 * mult); p.wealth += Math.round(1000 * mult); },
    onLose: (p) => { p.wealth -= 1200; p.faith = Math.max(0, p.faith - 5); }
  },
  {
    name: "彼得履海",
    story: "《马太福音》14章：夜里四更天，彼得在加利利海面上迎着风浪走向耶稣。",
    reqFaith: 50,
    winText: "风浪平静：信心 +12，并随机领受 1 项【圣灵恩赐】！",
    loseText: "看风浪下沉：小信受挫，信心 -10。",
    onWin: (p, mult) => {
      p.faith += Math.round(12 * mult);
      if (p.gifts.length < 4) {
        const randGift = SPIRITUAL_GIFTS[Math.floor(Math.random() * SPIRITUAL_GIFTS.length)];
        p.gifts.push(randGift.id);
      }
    },
    onLose: (p) => { p.faith = Math.max(0, p.faith - 10); }
  },
  {
    name: "基甸三百勇士",
    story: "《士师记》7章：基甸顺服神将三万大军裁至三百人，夜袭米甸大营。",
    reqFaith: 60,
    winText: "以少胜多：名下所有教会信徒人数 +15%！",
    loseText: "惧怕退缩：名下随机一座教会信徒减少 30%。",
    onWin: (p) => {
      getPlayerChurches(p.index).forEach(t => { t.believers = Math.round(t.believers * 1.15); });
    },
    onLose: (p) => {
      const list = getPlayerChurches(p.index);
      if (list.length > 0) {
        const target = list[Math.floor(Math.random() * list.length)];
        target.believers = Math.floor(target.believers * 0.7);
      }
    }
  },
  {
    name: "耶利哥城墙",
    story: "《约书亚记》6章：约书亚率百姓凭信心绕城七日，祭司吹角、百姓呼喊震塌坚城。",
    reqFaith: 70,
    winText: "城墙坍塌：财富 +$2,500，且名下随机一座未满级教会免费升 1 级！",
    loseText: "攻城受挫：财富 -$2,000，信心 -5。",
    onWin: (p, mult) => {
      p.wealth += Math.round(2500 * mult);
      const upgradable = getPlayerChurches(p.index).filter(t => t.level < 7);
      if (upgradable.length > 0) {
        const t = upgradable[Math.floor(Math.random() * upgradable.length)];
        upgradeChurchOnTile(t, false);
      }
    },
    onLose: (p) => { p.wealth -= 2000; p.faith = Math.max(0, p.faith - 5); }
  },
  {
    name: "烈火窑中的考验",
    story: "《但以理书》3章：沙得拉、米煞、亚伯尼歌拒绝跪拜金像，被扔进烧热七倍的烈火窑。",
    reqFaith: 80,
    winText: "神子同行：毫发无损，信心 +15，财富 +$3,000！",
    loseText: "烈焰灼伤：财富 -$2,500，信心 -10。",
    onWin: (p, mult) => { p.faith += Math.round(15 * mult); p.wealth += Math.round(3000 * mult); },
    onLose: (p) => { p.wealth -= 2500; p.faith = Math.max(0, p.faith - 10); }
  },
  {
    name: "但以理狮子坑",
    story: "《但以理书》6章：但以理坚持一日三次向神祷告，被扔进狮子坑，神差使者封住狮口。",
    reqFaith: 90,
    winText: "国王下旨尊崇：名下所有教会信徒 +25%，财富 +$3,000！",
    loseText: "惊惧受损：名下信徒最多的一座教会信徒直接减半。",
    onWin: (p, mult) => {
      p.wealth += Math.round(3000 * mult);
      getPlayerChurches(p.index).forEach(t => { t.believers = Math.round(t.believers * 1.25); });
    },
    onLose: (p) => {
      const list = getPlayerChurches(p.index);
      if (list.length > 0) {
        list.sort((a, b) => b.believers - a.believers);
        list[0].believers = Math.floor(list[0].believers * 0.5);
      }
    }
  },
  {
    name: "摩利亚山献以撒",
    story: "《创世记》22章：亚伯拉罕凭绝对信心顺服呼召献上独生子，耶和华预备公羊代替。",
    reqFaith: 100,
    winText: "耶和华以勒（终极祝福）：财富 +$5,000，名下所有教会信徒 +30%！",
    loseText: "未能通过终极考验：信心 -15，财富 -$3,000。",
    onWin: (p, mult) => {
      p.wealth += Math.round(5000 * mult);
      getPlayerChurches(p.index).forEach(t => { t.believers = Math.round(t.believers * 1.3); });
    },
    onLose: (p) => { p.faith = Math.max(0, p.faith - 15); p.wealth -= 3000; }
  }
];

const MAPS_DATA = {
  small: {
    title: "加利利福音环线",
    believerGoal: 15000,
    gridCols: 7,
    gridRows: 5,
    tiles: [
      { name: "耶路撒冷", type: "start" },
      { name: "伯利恒", type: "city", price: 1200 },
      { name: "伯大尼", type: "city", price: 1200 },
      { name: "约旦河渡口", type: "trial" },
      { name: "拿撒勒", type: "city", price: 1400 },
      { name: "迦拿", type: "city", price: 1600 },
      { name: "安息日（一）", type: "sabbath" },
      { name: "拿因城", type: "city", price: 1800 },
      { name: "提比哩亚", type: "city", price: 2000 },
      { name: "马可楼", type: "pentecost" },
      { name: "抹大拉", type: "city", price: 2200 },
      { name: "伯赛大", type: "city", price: 2400 },
      { name: "加利利海风暴", type: "trial" },
      { name: "安息日（二）", type: "sabbath" },
      { name: "哥拉汛", type: "city", price: 2600 },
      { name: "迦百农", type: "city", price: 2800 },
      { name: "格拉森", type: "city", price: 3000 },
      { name: "圣殿所罗门廊", type: "pentecost" },
      { name: "撒玛利亚叙加", type: "city", price: 3200 },
      { name: "耶利哥", type: "city", price: 3600 },
      { name: "安息日（三）", type: "sabbath" }
    ]
  },
  medium: {
    title: "应许之地与初代教会",
    believerGoal: 15000,
    gridCols: 9,
    gridRows: 7,
    tiles: [
      { name: "耶路撒冷", type: "start" },
      { name: "希伯仑", type: "city", price: 1200 },
      { name: "伯利恒", type: "city", price: 1200 },
      { name: "别是巴", type: "city", price: 1400 },
      { name: "犹大旷野", type: "trial" },
      { name: "吉甲", type: "city", price: 1600 },
      { name: "安息日（一）", type: "sabbath" },
      { name: "示罗", type: "city", price: 1800 },
      { name: "马可楼", type: "pentecost" },
      { name: "伯特利", type: "city", price: 1800 },
      { name: "米斯巴", type: "city", price: 2000 },
      { name: "亚割谷", type: "trial" },
      { name: "耶利哥", type: "city", price: 2200 },
      { name: "安息日（二）", type: "sabbath" },
      { name: "吕大", type: "city", price: 2400 },
      { name: "约帕", type: "city", price: 2600 },
      { name: "硝皮匠西门家", type: "pentecost" },
      { name: "拿撒勒", type: "city", price: 2600 },
      { name: "基顺河谷", type: "trial" },
      { name: "迦百农", type: "city", price: 2800 },
      { name: "安息日（三）", type: "sabbath" },
      { name: "撒玛利亚城", type: "city", price: 3000 },
      { name: "哥尼流宅邸", type: "pentecost" },
      { name: "该撒利亚", type: "city", price: 3200 },
      { name: "大马士革路上", type: "trial" },
      { name: "大马士革", type: "city", price: 3400 },
      { name: "叙利亚安提阿", type: "city", price: 3600 },
      { name: "安息日（四）", type: "sabbath" }
    ]
  },
  large: {
    title: "使徒行传：直到地极",
    believerGoal: 30000,
    gridCols: 11,
    gridRows: 8,
    tiles: [
      { name: "耶路撒冷", type: "start" },
      { name: "伯利恒", type: "city", price: 1200 },
      { name: "约帕", type: "city", price: 1200 },
      { name: "旷野古道", type: "trial" },
      { name: "该撒利亚", type: "city", price: 1400 },
      { name: "马可楼", type: "pentecost" },
      { name: "安息日（一）", type: "sabbath" },
      { name: "大马士革", type: "city", price: 1500 },
      { name: "叙利亚安提阿", type: "city", price: 1600 },
      { name: "居比路海路", type: "trial" },
      { name: "撒拉米", type: "city", price: 1800 },
      { name: "帕弗", type: "city", price: 1800 },
      { name: "安提阿会堂", type: "pentecost" },
      { name: "安息日（二）", type: "sabbath" },
      { name: "特庇", type: "city", price: 2000 },
      { name: "路司得城外", type: "trial" },
      { name: "路司得", type: "city", price: 2100 },
      { name: "以哥念", type: "city", price: 2200 },
      { name: "老底嘉", type: "city", price: 2400 },
      { name: "推喇奴学房", type: "pentecost" },
      { name: "安息日（三）", type: "sabbath" },
      { name: "非拉铁非", type: "city", price: 2500 },
      { name: "亚细亚剧场", type: "trial" },
      { name: "推雅推喇", type: "city", price: 2600 },
      { name: "士每拿", type: "city", price: 2700 },
      { name: "以弗所", type: "city", price: 2800 },
      { name: "特罗亚海港", type: "pentecost" },
      { name: "安息日（四）", type: "sabbath" },
      { name: "腓立比", type: "city", price: 3000 },
      { name: "友拉革罗狂风", type: "trial" },
      { name: "帖撒罗尼迦", type: "city", price: 3100 },
      { name: "雅典", type: "city", price: 3200 },
      { name: "哥林多", type: "city", price: 3400 },
      { name: "罗马", type: "city", price: 3600 },
      { name: "安息日（五）", type: "sabbath" }
    ]
  }
};

const FALLBACK_QUESTIONS = [
  { id: 1, question: "神在第几天创造了人？", options: ["第六天", "第五天", "第七天", "第四天"], answerIndex: 0, reference: "创世记 1:26-31" },
  { id: 2, question: "伊甸园中有两棵特殊的树，一棵是生命树，另一棵是什么树？", options: ["永生树", "平安树", "分别善恶的树", "智慧树"], answerIndex: 2, reference: "创世记 2:9" },
  { id: 4, question: "挪亚方舟最后停留在哪一座山上？", options: ["亚拉腊山", "迦密山", "西奈山", "黑门山"], answerIndex: 0, reference: "创世记 8:4" },
  { id: 5, question: "神以什么作为不再用洪水毁灭全地的立约记号？", options: ["彩虹", "云柱", "羔羊的血", "割礼"], answerIndex: 0, reference: "创世记 9:13" },
  { id: 10, question: "亚伯拉罕顺服神，带着以撒到哪座山去献祭？", options: ["橄榄山", "尼波山", "摩利亚山", "何烈山"], answerIndex: 2, reference: "创世记 22:2" },
  { id: 27, question: "摩西举杖，神使大东风吹了一夜，分开了哪片水域让以色列人走干地？", options: ["加利利海", "约旦河", "死海", "红海"], answerIndex: 3, reference: "出埃及记 14:21" }
];

// ==================== 二、全局状态对象 ====================

let allQuestions = [];
let activeQuestionPool = [];

const gameState = {
  lobby: {
    playerCount: 4,
    winGoal: "survival",
    mapSize: "small",
    quizDiff: "children",
    slots: [
      { name: "玩家一", type: "human", charId: "abraham" },
      { name: "玩家二", type: "human", charId: "peter" },
      { name: "电脑三", type: "ai", charId: "paul" },
      { name: "电脑四", type: "ai", charId: "solomon" }
    ]
  },
  round: 1,
  maxRounds: 40,
  currentPlayerIdx: 0,
  phase: "IDLE", // IDLE, QUIZ, READY_ROLL, MOVING, TILE_EVENT, GAMEOVER
  players: [],
  board: [],
  boardPixelWidth: 1400,
  boardPixelHeight: 1060,
  usedGiftThisTurn: false,
  doubleDiceActive: false,
  camera: {
    x: 0,
    y: 0,
    scale: 0.95,
    isDragging: false,
    startX: 0,
    startY: 0
  }
};

// ==================== 三、初始化与屏幕中央弹窗挂载 ====================

document.addEventListener("DOMContentLoaded", () => {
  ensureCenterToastContainer();
  loadQuestionsJSON();
  initLobbyUI();
  initMapViewportDrag();
  bindGlobalButtons();
});

// 昵称保留原始文本，只在拼入 HTML 时转义，避免标签或属性被浏览器解析。
function escapeHtml(value) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value).replace(/[&<>"']/g, char => entities[char]);
}

// 动态创建屏幕正中央事件横幅容器
function ensureCenterToastContainer() {
  if (!document.getElementById("center-toast-container")) {
    const container = document.createElement("div");
    container.id = "center-toast-container";
    container.className = "center-toast-container";
    document.body.appendChild(container);
  }
}

/**
 * 在屏幕中央弹出清晰醒目的事件通知横幅
 * @param {string} icon 图标
 * @param {string} title 标题
 * @param {string} desc 详情描述
 * @param {string} borderColor 边框颜色（默认金色或玩家代表色）
 * @param {number} duration 停留毫秒数
 */
function showEventPopup(icon, title, desc, borderColor = "#f2c94c", duration = 2200) {
  ensureCenterToastContainer();
  const container = document.getElementById("center-toast-container");

  const card = document.createElement("div");
  card.className = "event-toast-card";
  card.style.borderColor = borderColor;
  card.innerHTML = `
    <div class="toast-icon-badge"></div>
    <div class="toast-content-wrap">
      <div class="toast-title"></div>
      <div class="toast-desc"></div>
    </div>
  `;
  card.querySelector(".toast-icon-badge").textContent = icon;
  const titleEl = card.querySelector(".toast-title");
  titleEl.style.color = borderColor;
  titleEl.textContent = title;
  card.querySelector(".toast-desc").textContent = desc;

  container.appendChild(card);

  // 限制同时最多展示 3 条，避免刷屏遮挡
  while (container.children.length > 3) {
    container.removeChild(container.firstChild);
  }

  setTimeout(() => {
    card.classList.add("toast-fade-out");
    setTimeout(() => {
      if (card.parentNode === container) {
        container.removeChild(card);
      }
    }, 260);
  }, duration);
}

async function loadQuestionsJSON() {
  const statusEl = document.getElementById("question-load-status");
  try {
    const res = await fetch("questions.json");
    if (!res.ok) throw new Error("HTTP status " + res.status);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      allQuestions = data;
      statusEl.textContent = `✅ 已成功加载圣经题库（共 ${allQuestions.length} 道题：前 280 题儿童版 / 全 1000 题研经版）`;
      return;
    }
  } catch (err) {
    console.warn("无法通过 fetch 读取 questions.json，启用内置备用题库：", err);
    allQuestions = FALLBACK_QUESTIONS;
    statusEl.textContent = "⚠️ 本地直接打开受浏览器跨域限制，已启用内置演示题库（建议使用 VSCode Live Server 打开以加载全部 1000 题）";
    statusEl.style.color = "#f2c94c";
  }
}

function initLobbyUI() {
  const countBtns = document.querySelectorAll("#player-count-group .opt-btn");
  countBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      countBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      gameState.lobby.playerCount = parseInt(btn.dataset.count, 10);
      renderLobbyPlayerSlots();
    });
  });

  const goalCards = document.querySelectorAll("#win-goal-group .radio-card");
  goalCards.forEach(card => {
    card.addEventListener("click", () => {
      goalCards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      const radio = card.querySelector("input[type='radio']");
      radio.checked = true;
      gameState.lobby.winGoal = radio.value;
    });
  });

  const mapBtns = document.querySelectorAll("#map-size-group .opt-btn");
  mapBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      mapBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      gameState.lobby.mapSize = btn.dataset.map;
    });
  });

  const diffBtns = document.querySelectorAll("#quiz-diff-group .opt-btn");
  diffBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      diffBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      gameState.lobby.quizDiff = btn.dataset.diff;
    });
  });

  renderLobbyPlayerSlots();
  document.getElementById("btn-start-game").addEventListener("click", startNewGame);
}

function renderLobbyPlayerSlots() {
  const container = document.getElementById("lobby-player-slots");
  container.innerHTML = "";

  for (let i = 0; i < gameState.lobby.playerCount; i++) {
    const slotData = gameState.lobby.slots[i];
    const charObj = CHARACTERS.find(c => c.id === slotData.charId) || CHARACTERS[0];

    const card = document.createElement("div");
    card.className = "player-slot-card";
    card.style.borderColor = PLAYER_COLORS[i];
    card.innerHTML = `
      <div class="slot-header">
        <span class="slot-badge p${i + 1}-bg">P${i + 1}·${PLAYER_COLOR_NAMES[i]}</span>
        <input type="text" class="player-name-input" value="" data-idx="${i}" />
        <select class="player-type-select" data-idx="${i}">
          <option value="human" ${slotData.type === "human" ? "selected" : ""}>真人</option>
          <option value="ai" ${slotData.type === "ai" ? "selected" : ""}>电脑AI</option>
        </select>
      </div>
      <select class="char-select" data-idx="${i}">
        ${CHARACTERS.map(c => `
          <option value="${c.id}" ${c.id === slotData.charId ? "selected" : ""}>
            ${c.name} — ${c.title}
          </option>
        `).join("")}
      </select>
      <div class="char-skill-preview" id="slot-skill-preview-${i}">
        <div class="skill-title">✨ ${charObj.skillName}</div>
        <div class="skill-desc">${charObj.skillDesc}</div>
      </div>
    `;
    card.querySelector(".player-name-input").value = slotData.name;
    container.appendChild(card);
  }

  container.querySelectorAll(".player-name-input").forEach(input => {
    input.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      gameState.lobby.slots[idx].name = e.target.value.trim() || `玩家${idx + 1}`;
    });
  });

  container.querySelectorAll(".player-type-select").forEach(sel => {
    sel.addEventListener("change", (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      gameState.lobby.slots[idx].type = e.target.value;
    });
  });

  container.querySelectorAll(".char-select").forEach(sel => {
    sel.addEventListener("change", (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      const newCharId = e.target.value;
      gameState.lobby.slots[idx].charId = newCharId;
      const charObj = CHARACTERS.find(c => c.id === newCharId);
      const previewEl = document.getElementById(`slot-skill-preview-${idx}`);
      if (charObj && previewEl) {
        previewEl.innerHTML = `
          <div class="skill-title">✨ ${charObj.skillName}</div>
          <div class="skill-desc">${charObj.skillDesc}</div>
        `;
      }
    });
  });
}

// ==================== 四、开始新对局与棋盘构建 ====================

function startNewGame() {
  if (gameState.lobby.quizDiff === "children") {
    activeQuestionPool = allQuestions.filter(q => q.id <= 280);
    if (activeQuestionPool.length === 0) activeQuestionPool = [...allQuestions];
  } else {
    activeQuestionPool = [...allQuestions];
  }

  gameState.players = [];
  for (let i = 0; i < gameState.lobby.playerCount; i++) {
    const slot = gameState.lobby.slots[i];
    const charObj = CHARACTERS.find(c => c.id === slot.charId) || CHARACTERS[0];

    const initWealth = charObj.id === "solomon" ? 13000 : 10000;
    const initFaith = charObj.id === "abraham" ? 70 : 50;

    gameState.players.push({
      index: i,
      name: slot.name,
      isAI: slot.type === "ai",
      charId: charObj.id,
      charName: charObj.name,
      avatar: charObj.avatar,
      skillName: charObj.skillName,
      skillDesc: charObj.skillDesc,
      color: PLAYER_COLORS[i],
      colorName: PLAYER_COLOR_NAMES[i],
      wealth: initWealth,
      faith: initFaith,
      position: 0,
      sabbathRestTurns: 0,
      shieldActive: false,
      autoPassQuiz: false,
      gifts: [],
      eliminated: false
    });
  }

  const mapCfg = MAPS_DATA[gameState.lobby.mapSize];
  gameState.board = mapCfg.tiles.map((t, idx) => ({
    index: idx,
    name: t.name,
    type: t.type,
    price: t.price || 0,
    owner: null,
    level: 0,
    believers: 0
  }));

  gameState.round = 1;
  gameState.currentPlayerIdx = 0;

  document.getElementById("lobby-screen").classList.remove("active");
  document.getElementById("lobby-screen").classList.add("hidden");

  renderBoardDOM();
  renderAllPlayersHUD();
  updateTopHudBar();

  clearEventLog();
  addEventLog(`📜 游戏开始！地图：【${mapCfg.title}】，题库：${gameState.lobby.quizDiff === "children" ? "儿童版 (前280题)" : "研经版 (全1000题)"}。`);

  startPlayerTurn();
}

function renderBoardDOM() {
  const mapCfg = MAPS_DATA[gameState.lobby.mapSize];
  const cols = mapCfg.gridCols;
  const rows = mapCfg.gridRows;
  const total = gameState.board.length;

  const tileSize = 126;
  const gap = 12;
  const step = tileSize + gap;

  const boardWidth = cols * step - gap;
  const boardHeight = rows * step - gap;

  gameState.boardPixelWidth = boardWidth + 120;
  gameState.boardPixelHeight = boardHeight + 120;

  const canvas = document.getElementById("map-canvas");
  canvas.style.width = `${gameState.boardPixelWidth}px`;
  canvas.style.height = `${gameState.boardPixelHeight}px`;

  const offsetX = 60;
  const offsetY = 60;

  const centerHub = document.getElementById("board-center-hub");
  centerHub.style.width = `${Math.max(400, (cols - 2) * step - 50)}px`;
  centerHub.style.height = `${Math.max(250, (rows - 2) * step - 50)}px`;
  document.getElementById("center-map-title").textContent = mapCfg.title;

  const perimeterCoords = computePerimeterCoordinates(total, boardWidth - tileSize, boardHeight - tileSize, offsetX, offsetY);

  const tilesContainer = document.getElementById("tiles-container");
  tilesContainer.innerHTML = "";

  gameState.board.forEach((tile, idx) => {
    const pos = perimeterCoords[idx];
    tile.x = pos.x;
    tile.y = pos.y;

    const el = document.createElement("div");
    el.id = `board-tile-${idx}`;
    el.className = `board-tile tile-${tile.type}`;
    el.style.left = `${pos.x}px`;
    el.style.top = `${pos.y}px`;
    tilesContainer.appendChild(el);

    updateSingleTileDOM(idx);
  });

  const tokensContainer = document.getElementById("tokens-container");
  tokensContainer.innerHTML = "";
  gameState.players.forEach(p => {
    const token = document.createElement("div");
    token.id = `player-token-${p.index}`;
    token.className = "player-token";
    token.style.backgroundColor = p.color;
    token.textContent = p.avatar;
    tokensContainer.appendChild(token);
  });

  updateAllTokensPosition();
}

function computePerimeterCoordinates(count, rectW, rectH, startX, startY) {
  const coords = [];
  const totalLen = 2 * (rectW + rectH);

  for (let i = 0; i < count; i++) {
    const dist = (i / count) * totalLen;
    let x = 0, y = 0;
    if (dist <= rectW) {
      x = dist;
      y = 0;
    } else if (dist <= rectW + rectH) {
      x = rectW;
      y = dist - rectW;
    } else if (dist <= 2 * rectW + rectH) {
      x = rectW - (dist - (rectW + rectH));
      y = rectH;
    } else {
      x = 0;
      y = rectH - (dist - (2 * rectW + rectH));
    }
    coords.push({ x: Math.round(startX + x), y: Math.round(startY + y) });
  }
  return coords;
}

function updateSingleTileDOM(tileIdx) {
  const tile = gameState.board[tileIdx];
  const el = document.getElementById(`board-tile-${tileIdx}`);
  if (!el) return;

  el.className = `board-tile tile-${tile.type}`;
  let ownerRibbonHtml = "";

  if (tile.owner !== null) {
    el.classList.add(`owner-${tile.owner}`);
    const ownerPlayer = gameState.players[tile.owner];
    ownerRibbonHtml = `<div class="tile-owner-ribbon" style="background:${ownerPlayer.color};">🚩 ${escapeHtml(ownerPlayer.name)} (${ownerPlayer.charName})</div>`;
  }

  let icon = "🏛️";
  let centerSub = "";
  let bottomLeft = "";
  let bottomRight = "";

  if (tile.type === "start") {
    icon = "🕍";
    centerSub = `<span class="tile-level-badge" style="background:#b7791f;">恩典起点</span>`;
    bottomLeft = "经过/停留";
    bottomRight = "+$1,000";
  } else if (tile.type === "sabbath") {
    icon = "🕯️";
    centerSub = `<span class="tile-level-badge" style="background:#0284c7;">逢七安息</span>`;
    bottomLeft = "休整1回合";
    bottomRight = "共+10信心";
  } else if (tile.type === "pentecost") {
    icon = "🔥";
    centerSub = `<span class="tile-level-badge" style="background:#ea580c;">五旬节</span>`;
    bottomLeft = "圣灵降临";
    bottomRight = "领受恩赐";
  } else if (tile.type === "trial") {
    icon = "⚡";
    centerSub = `<span class="tile-level-badge" style="background:#7e22ce;">旷野试炼</span>`;
    bottomLeft = "试验信心";
    bottomRight = "奖惩分明";
  } else if (tile.type === "city") {
    if (tile.owner === null) {
      icon = "⛺";
      centerSub = `<span style="font-size:0.7rem;color:#6b573b;">无主禾场</span>`;
      bottomLeft = `💰$${tile.price}`;
      bottomRight = `初信 ${tile.price / 10}`;
    } else {
      const ownerPlayer = gameState.players[tile.owner];
      const churchIcons = ["", "🏠", "🏡", "⛪", "⛪", "🏰", "🕌", "👑"];
      icon = churchIcons[tile.level] || "⛪";
      centerSub = `<span class="tile-level-badge" style="background:${ownerPlayer.color};">${tile.level}级·${CHURCH_RANK_NAMES[tile.level]}</span>`;
      bottomLeft = `地价$${tile.price}`;
      bottomRight = `👥 ${tile.believers.toLocaleString()}`;
    }
  }

  el.innerHTML = `
    ${ownerRibbonHtml}
    <div class="tile-top-bar">
      <span class="tile-index">#${tileIdx + 1}</span>
      <span class="tile-name" title="${tile.name}">${tile.name}</span>
    </div>
    <div class="tile-center-body">
      <div class="tile-icon">${icon}</div>
      ${centerSub}
    </div>
    <div class="tile-bottom-bar">
      <span class="tile-price">${bottomLeft}</span>
      <span class="tile-believers">${bottomRight}</span>
    </div>
  `;
}

function updateAllTokensPosition() {
  const offsets = [
    { dx: 14, dy: 44 },
    { dx: 74, dy: 44 },
    { dx: 14, dy: 78 },
    { dx: 74, dy: 78 }
  ];

  gameState.players.forEach(p => {
    const token = document.getElementById(`player-token-${p.index}`);
    if (!token) return;
    if (p.eliminated) {
      token.classList.add("hidden");
      return;
    }
    const tile = gameState.board[p.position];
    const off = offsets[p.index];
    token.style.left = `${tile.x + off.dx}px`;
    token.style.top = `${tile.y + off.dy}px`;

    if (p.index === gameState.currentPlayerIdx) {
      token.classList.add("active-token");
    } else {
      token.classList.remove("active-token");
    }
  });
}

// ==================== 五、镜头跟随系统 (Camera Follow) ====================

/**
 * 将镜头平滑聚焦到指定玩家当前所在的地块
 */
function focusCameraOnPlayer(player, customScale = null) {
  if (!player || player.eliminated) return;
  const tile = gameState.board[player.position];
  if (!tile) return;

  if (customScale !== null) {
    gameState.camera.scale = customScale;
  }

  // 计算地块中心相对于画布中心的偏移量
  const tileCenterX = tile.x + 63;
  const tileCenterY = tile.y + 63;
  const canvasCenterX = gameState.boardPixelWidth / 2;
  const canvasCenterY = gameState.boardPixelHeight / 2;

  // 将该地块移动到屏幕正中心（乘以当前缩放比例并适度保留边界舒适感）
  const dx = (canvasCenterX - tileCenterX) * gameState.camera.scale * 0.72;
  const dy = (canvasCenterY - tileCenterY) * gameState.camera.scale * 0.72;

  gameState.camera.x = Math.round(dx);
  gameState.camera.y = Math.round(dy);
  applyCameraTransform();
}

// ==================== 六、HUD 渲染与技能禁用控制 ====================

function renderAllPlayersHUD() {
  // 判断当前阶段是否允许点击圣灵恩赐（仅在当前真人玩家 READY_ROLL 且本回合未用过恩赐时可选中）
  const activePlayer = gameState.players[gameState.currentPlayerIdx];
  const canUseGiftsNow = (
    gameState.phase === "READY_ROLL" &&
    activePlayer &&
    !activePlayer.isAI &&
    !gameState.usedGiftThisTurn
  );

  // 同步更新底部恩赐按钮状态
  const bottomGiftBtn = document.getElementById("btn-open-gifts");
  if (bottomGiftBtn) {
    bottomGiftBtn.disabled = !canUseGiftsNow;
  }

  for (let i = 0; i < 4; i++) {
    const card = document.getElementById(`hud-player-${i}`);
    if (i >= gameState.players.length) {
      card.classList.add("hidden");
      continue;
    }
    card.classList.remove("hidden");
    const p = gameState.players[i];
    const churches = getPlayerChurches(i);
    const totalBelievers = getPlayerTotalBelievers(i);

    card.className = `player-hud-card pos-${getCornerClass(i)} p-color-${i}`;
    if (i === gameState.currentPlayerIdx && !p.eliminated) {
      card.classList.add("active-turn");
    }
    if (p.eliminated) {
      card.classList.add("eliminated");
    }

    let statusText = "候命中";
    if (p.eliminated) statusText = "已退场";
    else if (p.sabbathRestTurns > 0) statusText = "🕯️安息中";
    else if (i === gameState.currentPlayerIdx) statusText = "行动中";

    const isThisPlayerGiftClickable = (i === gameState.currentPlayerIdx && canUseGiftsNow);

    const giftsHtml = p.gifts.length === 0
      ? `<span class="gifts-empty-hint">圣灵恩赐槽 (0/4)</span>`
      : p.gifts.map((gId, gIdx) => {
          const g = SPIRITUAL_GIFTS.find(x => x.id === gId);
          return `<span class="gift-mini-chip ${isThisPlayerGiftClickable ? "" : "disabled-gift"}" title="${g.desc}" data-pidx="${i}" data-gidx="${gIdx}">🕊️${g.name}</span>`;
        }).join("");

    card.innerHTML = `
      <div class="hud-card-header">
        <div class="avatar-circle p${i + 1}-border">${p.avatar}</div>
        <div class="hud-title-wrap">
          <div class="hud-player-name">
            <span class="turn-color-dot" style="background:${p.color};"></span>
            ${escapeHtml(p.name)} · ${p.charName}${p.isAI ? " (AI)" : ""}
          </div>
          <div class="hud-char-skill" title="${p.skillDesc}">✨${p.skillName}</div>
        </div>
        <span class="status-pill" style="border:1px solid ${p.color};">${statusText}</span>
      </div>
      <div class="hud-stats-grid">
        <div class="stat-box wealth-box">
          <span class="stat-label">💰 财富</span>
          <span class="stat-val">$${p.wealth.toLocaleString()}</span>
        </div>
        <div class="stat-box faith-box">
          <span class="stat-label">🕊️ 信心</span>
          <span class="stat-val">${p.faith}${p.shieldActive ? " 🛡️" : ""}</span>
        </div>
        <div class="stat-box church-box">
          <span class="stat-label">⛪ 堂会</span>
          <span class="stat-val">${churches.length} 座</span>
        </div>
        <div class="stat-box believer-box">
          <span class="stat-label">👥 信徒</span>
          <span class="stat-val">${totalBelievers.toLocaleString()}</span>
        </div>
      </div>
      <div class="hud-gifts-bar">${giftsHtml}</div>
    `;

    // 若当前处于可释放恩赐阶段，允许直接点击 HUD 上的恩赐芯片发动
    if (isThisPlayerGiftClickable) {
      card.querySelectorAll(".gift-mini-chip").forEach(chip => {
        chip.addEventListener("click", () => {
          const gIdx = parseInt(chip.dataset.gidx, 10);
          const gId = p.gifts[gIdx];
          activateSpiritualGift(p, gId, gIdx);
        });
      });
    }
  }
}

function getCornerClass(idx) {
  return ["top-left", "top-right", "bottom-left", "bottom-right"][idx];
}

function updateTopHudBar() {
  const p = gameState.players[gameState.currentPlayerIdx];
  // 去掉“第X回合”、“当前行动：”等冗余前缀，只留核心信息
  document.getElementById("hud-round-num").textContent = `R${gameState.round}`;
  document.getElementById("hud-current-player").innerHTML =
    `<span class="turn-color-dot" style="background:${p.color};"></span>${escapeHtml(p.name)}·${p.charName}`;

  const mapCfg = MAPS_DATA[gameState.lobby.mapSize];
  const goalMap = {
    survival: "🏆 目标：福音遍传（生存淘汰制）",
    believers: `🏆 目标：总信徒达 ${mapCfg.believerGoal.toLocaleString()} 人`,
    score: `🏆 目标：${gameState.maxRounds} 回合综合属灵影响力最高`
  };

  // 将地图、目标、题库信息写入悬停浮窗内
  document.getElementById("hud-goal-summary").textContent = goalMap[gameState.lobby.winGoal];
  const popMap = document.getElementById("popover-map-name");
  if (popMap) popMap.textContent = `🗺️ 地图：${mapCfg.title}（${gameState.board.length}格）`;
  const popDiff = document.getElementById("popover-diff-name");
  if (popDiff) popDiff.textContent = `📖 题库：${gameState.lobby.quizDiff === "children" ? "儿童版 (前280题)" : "研经版 (全1000题)"}`;
}

function setPhaseText(text) {
  document.getElementById("hud-phase-text").textContent = text;
}

// ==================== 七、单回合标准流程控制 (Turn Loop) ====================

function startPlayerTurn() {
  if (checkVictoryConditions()) return;

  const p = gameState.players[gameState.currentPlayerIdx];
  if (p.eliminated) {
    advanceToNextPlayer();
    return;
  }

  gameState.phase = "QUIZ";
  gameState.usedGiftThisTurn = false;
  gameState.doubleDiceActive = false;
  document.getElementById("dice-box-2").classList.add("hidden");
  document.getElementById("btn-end-turn").classList.add("hidden");
  document.getElementById("btn-roll-dice").disabled = true;
  document.getElementById("btn-open-gifts").disabled = true;

  renderAllPlayersHUD();
  updateTopHudBar();
  updateAllTokensPosition();

  // 镜头自动平滑聚焦到当前回合玩家
  focusCameraOnPlayer(p);

  // 阶段一 (A)：检查是否处于安息日格停留休整状态
  if (p.sabbathRestTurns > 0) {
    setPhaseText("安息日休整");
    const bonusFaith = p.charId === "abraham" ? 10 : 5;
    p.faith += bonusFaith;
    p.sabbathRestTurns -= 1;

    const msg = `在安息日专心仰望休整，灵里重新得力，信心 +${bonusFaith}！`;
    addEventLog(`🕯️ 【${p.name}】${msg}`);
    showEventPopup("🕯️", `${p.name} · 安息日得力`, msg, p.color, 2000);
    renderAllPlayersHUD();

    setTimeout(() => {
      advanceToNextPlayer();
    }, 1800);
    return;
  }

  // 阶段一 (B)：晨更牧养查经问答（每回合最多抽查 3 座教会）
  const myChurches = getPlayerChurches(p.index);
  if (myChurches.length > 0) {
    setPhaseText("晨更牧养查经");
    runMorningChurchQuizPhase(p, myChurches);
  } else {
    enterReadyRollPhase();
  }
}

function runMorningChurchQuizPhase(player, churches) {
  const shuffled = [...churches].sort(() => Math.random() - 0.5);
  const selectedChurches = shuffled.slice(0, 3);

  // 若激活了【舌音方言】免答卡
  if (player.autoPassQuiz) {
    player.autoPassQuiz = false;
    selectedChurches.forEach(t => {
      t.believers = Math.round(t.believers * 1.1);
      updateSingleTileDOM(t.index);
      if (player.charId === "david") {
        player.faith += 3;
        player.wealth += 300;
      }
    });
    const msg = `因【舌音方言】恩赐庇护，本回合抽查的 ${selectedChurches.length} 座教会全部免答通过，信徒各 +10%！`;
    addEventLog(`🕊️ 【${player.name}】${msg}`);
    showEventPopup("🕊️", `${player.name} · 舌音方言生效`, msg, player.color, 2200);
    renderAllPlayersHUD();
    enterReadyRollPhase();
    return;
  }

  // AI 玩家自动查经并弹窗汇报
  if (player.isAI) {
    let passCount = 0;
    selectedChurches.forEach(t => {
      const winRate = player.charId === "luke" ? 0.82 : 0.7;
      const isCorrect = Math.random() < winRate;
      if (isCorrect) passCount++;
      applyQuizOutcomeToChurch(player, t, isCorrect, false);
    });
    showEventPopup(
      "📖",
      `${player.name} · 晨更查经结算`,
      `本回合抽查 ${selectedChurches.length} 座堂会：答对 ${passCount} 题，答错 ${selectedChurches.length - passCount} 题。`,
      player.color,
      2000
    );
    renderAllPlayersHUD();
    setTimeout(() => enterReadyRollPhase(), 1200);
    return;
  }

  // 真人玩家：依次弹出最多 3 道题
  let currentQuizIdx = 0;

  function showNextQuizModal() {
    if (currentQuizIdx >= selectedChurches.length) {
      document.getElementById("modal-quiz").classList.add("hidden");
      renderAllPlayersHUD();
      if (checkVictoryConditions()) return;
      enterReadyRollPhase();
      return;
    }

    const churchTile = selectedChurches[currentQuizIdx];
    const qObj = getRandomQuestion();

    const modal = document.getElementById("modal-quiz");
    modal.classList.remove("hidden");

    // 1. 让问答弹窗边框直接变成当前答题玩家的代表色
    const quizCard = modal.querySelector(".modal-card");
    if (quizCard) {
      quizCard.style.borderColor = player.color;
      quizCard.style.boxShadow = `0 0 28px ${player.color}66, 0 24px 60px rgba(0, 0, 0, 0.85)`;
    }

    // 2. 在顶部标签和标题里醒目加上【玩家名（角色名）】与代表色圆点
    const tagEl = document.getElementById("quiz-progress-tag");
    tagEl.style.backgroundColor = player.color;
    tagEl.style.color = "#fff";
    tagEl.style.borderColor = "#fff";
    tagEl.textContent = `👤 答题者：${player.name}（${player.charName}） | 第 ${currentQuizIdx + 1} / ${selectedChurches.length} 座教会`;

    document.getElementById("quiz-church-title").innerHTML =
      `<span style="color:${player.color};">【${escapeHtml(player.name)}】</span>正在牧养：⛪【${churchTile.name}教会】（${churchTile.level}级 ${CHURCH_RANK_NAMES[churchTile.level]}）`;
    document.getElementById("quiz-current-believers").textContent = churchTile.believers.toLocaleString();
    document.getElementById("quiz-question-text").textContent = qObj.question;

    const lukeBanner = document.getElementById("luke-skill-banner");
    let excludedIdx = -1;
    if (player.charId === "luke") {
      lukeBanner.classList.remove("hidden");
      const wrongIndices = [0, 1, 2, 3].filter(i => i !== qObj.answerIndex);
      excludedIdx = wrongIndices[Math.floor(Math.random() * wrongIndices.length)];
    } else {
      lukeBanner.classList.add("hidden");
    }

    const feedbackArea = document.getElementById("quiz-feedback-area");
    feedbackArea.classList.add("hidden");
    const nextBtn = document.getElementById("btn-quiz-next");
    nextBtn.classList.add("hidden");

    const optContainer = document.getElementById("quiz-options-list");
    optContainer.innerHTML = "";
    const labels = ["A", "B", "C", "D"];

    qObj.options.forEach((optText, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "quiz-opt-btn";
      btn.textContent = `${labels[i]}. ${optText}`;

      if (i === excludedIdx) {
        btn.classList.add("opt-excluded");
        btn.disabled = true;
      }

      btn.addEventListener("click", () => {
        optContainer.querySelectorAll(".quiz-opt-btn").forEach((b, bIdx) => {
          b.disabled = true;
          if (bIdx === qObj.answerIndex) b.classList.add("opt-correct");
        });

        const isCorrect = (i === qObj.answerIndex);
        if (!isCorrect) btn.classList.add("opt-wrong");

        const resultLog = applyQuizOutcomeToChurch(player, churchTile, isCorrect, true);

        feedbackArea.classList.remove("hidden");
        document.getElementById("quiz-result-title").textContent = isCorrect
          ? "✅ 真道扎根！回答正确！"
          : "❌ 牧养失职！回答错误！";
        document.getElementById("quiz-result-desc").textContent = resultLog;
        document.getElementById("quiz-reference-tag").textContent = `📖 经文出处：${qObj.reference || "圣经"}`;

        nextBtn.classList.remove("hidden");
        nextBtn.onclick = () => {
          currentQuizIdx++;
          showNextQuizModal();
        };
      });

      optContainer.appendChild(btn);
    });
  }

  showNextQuizModal();
}

function applyQuizOutcomeToChurch(player, churchTile, isCorrect) {
  let msg = "";
  if (isCorrect) {
    const oldVal = churchTile.believers;
    churchTile.believers = Math.round(churchTile.believers * 1.1);
    msg = `你在【${churchTile.name}教会】按正意分解真理的道，信徒增加 10%（${oldVal} → ${churchTile.believers}）！`;
    if (player.charId === "david") {
      player.faith += 3;
      player.wealth += 300;
      msg += ` 【大卫·赞美诗篇】额外获得 +3 信心与 +$300 财富！`;
    }
    addEventLog(`📖 ✅ 【${player.name}】答对查经，【${churchTile.name}教会】信徒增至 ${churchTile.believers} 人。`);
  } else {
    const oldVal = churchTile.believers;
    const retainRatio = player.charId === "peter" ? 0.75 : 0.5;
    churchTile.believers = Math.max(10, Math.floor(churchTile.believers * retainRatio));

    if (player.charId === "luke") {
      msg = `回答有误，【${churchTile.name}教会】信徒流失至 ${churchTile.believers} 人（【路加·详尽考究】免扣信心）。`;
    } else {
      player.faith = Math.max(0, player.faith - 5);
      msg = `未能解答会众疑惑，【${churchTile.name}教会】信徒由 ${oldVal} 减至 ${churchTile.believers} 人，你的信心 -5！`;
    }
    addEventLog(`📖 ❌ 【${player.name}】查经答错，【${churchTile.name}教会】信徒减至 ${churchTile.believers} 人。`);
  }
  updateSingleTileDOM(churchTile.index);
  renderAllPlayersHUD();
  return msg;
}

function getRandomQuestion() {
  if (activeQuestionPool.length === 0) return FALLBACK_QUESTIONS[0];
  const idx = Math.floor(Math.random() * activeQuestionPool.length);
  return activeQuestionPool[idx];
}

// 阶段二：祷告与恩赐 / 准备投掷骰子
function enterReadyRollPhase() {
  gameState.phase = "READY_ROLL";
  setPhaseText("准备投掷 / 可用恩赐");

  const p = gameState.players[gameState.currentPlayerIdx];
  const rollBtn = document.getElementById("btn-roll-dice");
  const giftBtn = document.getElementById("btn-open-gifts");

  focusCameraOnPlayer(p);
  renderAllPlayersHUD();

  if (p.isAI) {
    rollBtn.disabled = true;
    giftBtn.disabled = true;
    setTimeout(() => executeRollDice(), 900);
  } else {
    rollBtn.disabled = false;
    giftBtn.disabled = gameState.usedGiftThisTurn || p.gifts.length === 0;
  }
}

// 阶段三：投掷骰子与移动（投掷后立即锁定技能栏）
function executeRollDice(forcedStep = null) {
  if (gameState.phase !== "READY_ROLL") return;
  gameState.phase = "MOVING";
  setPhaseText("踏上天路移动中（技能已锁定）");

  // 投掷骰子后立即禁用投掷按钮与技能栏
  document.getElementById("btn-roll-dice").disabled = true;
  document.getElementById("btn-open-gifts").disabled = true;
  renderAllPlayersHUD(); // 刷新HUD，使所有恩赐芯片挂上 .disabled-gift 禁止点击

  const dice1El = document.getElementById("dice-box-1");
  const dice2El = document.getElementById("dice-box-2");

  const d1 = forcedStep !== null ? forcedStep : (Math.floor(Math.random() * 6) + 1);
  const d2 = (forcedStep === null && gameState.doubleDiceActive) ? (Math.floor(Math.random() * 6) + 1) : 0;
  const totalSteps = d1 + d2;

  dice1El.classList.add("rolling");
  if (gameState.doubleDiceActive) {
    dice2El.classList.remove("hidden");
    dice2El.classList.add("rolling");
  }

  const diceFaces = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

  setTimeout(() => {
    dice1El.classList.remove("rolling");
    dice1El.textContent = diceFaces[d1] || d1;
    if (gameState.doubleDiceActive) {
      dice2El.classList.remove("rolling");
      dice2El.textContent = diceFaces[d2] || d2;
    }

    const p = gameState.players[gameState.currentPlayerIdx];
    addEventLog(`🎲 【${p.name}】投出了 ${totalSteps} 点，开始前进。`);
    showEventPopup("🎲", `${p.name} 投出 ${totalSteps} 点`, `沿天路顺时针前进 ${totalSteps} 步...`, p.color, 1400);
    movePlayerStepByStep(p, totalSteps);
  }, 450);
}

function movePlayerStepByStep(player, remainingSteps) {
  if (remainingSteps <= 0) {
    focusCameraOnPlayer(player);
    onPlayerLandedOnTile(player);
    return;
  }

  const boardLen = gameState.board.length;
  player.position = (player.position + 1) % boardLen;

  // 检查是否路过或正好到达起点 (格号0：耶路撒冷)
  if (player.position === 0) {
    player.wealth += 1000;
    let desc = `回到恩典之源【耶路撒冷】，领受宣教供给 +$1,000！`;
    if (player.charId === "paul") {
      getPlayerChurches(player.index).forEach(t => {
        t.believers = Math.round(t.believers * 1.05);
        updateSingleTileDOM(t.index);
      });
      desc += ` 【保罗·宣教热忱】使名下所有教会信徒 +5%！`;
    }
    addEventLog(`🕍 【${player.name}】${desc}`);
    showEventPopup("🕍", `途经耶路撒冷 · 恩典供给`, `【${player.name}】${desc}`, "#f2c94c", 2600);
    renderAllPlayersHUD();
  }

  updateAllTokensPosition();
  focusCameraOnPlayer(player);

  setTimeout(() => {
    movePlayerStepByStep(player, remainingSteps - 1);
  }, 280);
}

// ==================== 八、阶段四：落点事件结算 ====================

function onPlayerLandedOnTile(player) {
  gameState.phase = "TILE_EVENT";
  const tile = gameState.board[player.position];
  setPhaseText(`落点事工：${tile.name}`);
  renderAllPlayersHUD(); // 确保技能栏保持锁定

  if (tile.type === "start") {
    finishPlayerTurnAction();
  } else if (tile.type === "sabbath") {
    handleSabbathTile(player);
  } else if (tile.type === "pentecost") {
    handlePentecostTile(player);
  } else if (tile.type === "trial") {
    handleTrialTile(player);
  } else if (tile.type === "city") {
    handleCityTile(player, tile);
  }
}

// 1. 安息日格处理
function handleSabbathTile(player) {
  const gainFaith = player.charId === "abraham" ? 10 : 5;
  player.faith += gainFaith;
  player.sabbathRestTurns = 1;
  const desc = `踏入【安息日格】，当回合信心 +${gainFaith}，下回合将停留休整 1 回合再得 +${gainFaith} 信心！`;
  addEventLog(`🕯️ 【${player.name}】${desc}`);
  showEventPopup("🕯️", `${player.name} · 进入安息日`, desc, "#38bdf8", 2500);
  renderAllPlayersHUD();
  finishPlayerTurnAction();
}

// 2. 五旬节格处理
function handlePentecostTile(player) {
  if (player.isAI) {
    const affordable = SPIRITUAL_GIFTS.filter(g => player.faith >= g.cost + 25);
    if (player.gifts.length < 4 && affordable.length > 0) {
      const pick = affordable[Math.floor(Math.random() * affordable.length)];
      player.faith -= pick.cost;
      player.gifts.push(pick.id);
      const desc = `消耗 ${pick.cost} 信心，领受了圣灵恩赐【${pick.name}】！`;
      addEventLog(`🔥 【${player.name}】在五旬节格${desc}`);
      showEventPopup("🔥", `${player.name} · 五旬节领受恩赐`, desc, "#fb923c", 2300);
      renderAllPlayersHUD();
    } else {
      showEventPopup("🔥", `${player.name} · 途经五旬节格`, `在马可楼祷告片刻，未兑换新恩赐。`, "#fb923c", 1800);
    }
    finishPlayerTurnAction();
    return;
  }

  openPentecostShopModal(player);
}

function openPentecostShopModal(player) {
  const modal = document.getElementById("modal-pentecost");
  modal.classList.remove("hidden");

  function refreshShopUI() {
    document.getElementById("pentecost-faith-val").textContent = player.faith;
    const grid = document.getElementById("pentecost-gifts-grid");
    grid.innerHTML = "";

    SPIRITUAL_GIFTS.forEach(g => {
      const canBuy = player.faith >= g.cost && player.gifts.length < 4;
      const card = document.createElement("div");
      card.className = "gift-shop-card";
      card.innerHTML = `
        <div>
          <div class="gift-card-top">
            <span class="gift-name">🕊️ ${g.name}</span>
            <span class="gift-cost">消耗 ${g.cost} 信心</span>
          </div>
          <p class="gift-desc" style="margin-top:6px;">${g.desc}</p>
        </div>
        <button type="button" class="btn-primary" style="padding:7px 12px;font-size:0.85rem;" ${canBuy ? "" : "disabled"}>
          ${player.gifts.length >= 4 ? "恩赐槽已满 (4/4)" : (player.faith >= g.cost ? "祈求领受" : "信心不足")}
        </button>
      `;

      card.querySelector("button").addEventListener("click", () => {
        if (player.faith >= g.cost && player.gifts.length < 4) {
          player.faith -= g.cost;
          player.gifts.push(g.id);
          addEventLog(`🔥 【${player.name}】消耗 ${g.cost} 信心领受了【${g.name}】！`);
          showEventPopup("🕊️", `领受圣灵恩赐：【${g.name}】`, g.desc, "#56ccf2", 2000);
          renderAllPlayersHUD();
          refreshShopUI();
        }
      });

      grid.appendChild(card);
    });
  }

  refreshShopUI();

  document.getElementById("btn-close-pentecost").onclick = () => {
    modal.classList.add("hidden");
    finishPlayerTurnAction();
  };
}

// 3. 试炼格处理
function handleTrialTile(player) {
  const trial = TRIAL_EVENTS[Math.floor(Math.random() * TRIAL_EVENTS.length)];
  const isMoses = player.charId === "moses";
  const effectiveReq = isMoses ? Math.max(10, trial.reqFaith - 15) : trial.reqFaith;
  const rewardMult = isMoses ? 1.5 : 1.0;

  let isSuccess = player.faith >= effectiveReq;
  let usedShield = false;

  if (!isSuccess && player.shieldActive) {
    player.shieldActive = false;
    usedShield = true;
  }

  if (player.isAI) {
    if (isSuccess) {
      trial.onWin(player, rewardMult);
      addEventLog(`⚡ 【${player.name}】在试炼【${trial.name}】中信心得胜（${player.faith} ≥ ${effectiveReq}）！${trial.winText}`);
      showEventPopup("🌟", `${player.name} · 试炼得胜：【${trial.name}】`, trial.winText, "#6fcf97", 2500);
    } else if (usedShield) {
      addEventLog(`🛡️ 【${player.name}】在试炼【${trial.name}】中触发【属灵全副军装】护盾，免受跌倒惩罚！`);
      showEventPopup("🛡️", `${player.name} · 全副军装护佑`, `抵挡了试炼【${trial.name}】的失败惩罚！`, "#56ccf2", 2400);
    } else {
      trial.onLose(player);
      addEventLog(`⚡ 【${player.name}】在试炼【${trial.name}】中信心不足（${player.faith} < ${effectiveReq}），${trial.loseText}`);
      showEventPopup("⚠️", `${player.name} · 试炼跌倒：【${trial.name}】`, trial.loseText, "#eb5757", 2500);
    }
    refreshAllBoardTiles();
    renderAllPlayersHUD();
    checkBankruptcyAndContinue(player);
    return;
  }

  // 真人弹出试炼结算框
  const modal = document.getElementById("modal-trial");
  modal.classList.remove("hidden");

  document.getElementById("trial-title").textContent = `【${trial.name}】`;
  document.getElementById("trial-story").textContent = trial.story;
  document.getElementById("trial-req-faith").textContent = effectiveReq;
  document.getElementById("trial-player-faith").textContent = player.faith;

  const mosesTip = document.getElementById("trial-moses-tip");
  if (isMoses) mosesTip.classList.remove("hidden");
  else mosesTip.classList.add("hidden");

  const outTitle = document.getElementById("trial-outcome-title");
  const outDesc = document.getElementById("trial-outcome-desc");

  if (isSuccess) {
    outTitle.textContent = "🌟 试炼得胜！（当前信心达标）";
    outTitle.style.color = "#6fcf97";
    outDesc.textContent = trial.winText;
  } else if (usedShield) {
    outTitle.textContent = "🛡️ 属灵全副军装护佑！";
    outTitle.style.color = "#56ccf2";
    outDesc.textContent = "你的信心虽未达标，但【属灵全副军装】为你抵挡了本次试炼惩罚！";
  } else {
    outTitle.textContent = "⚠️ 试炼跌倒（当前信心不足）";
    outTitle.style.color = "#eb5757";
    outDesc.textContent = trial.loseText;
  }

  document.getElementById("btn-trial-confirm").onclick = () => {
    modal.classList.add("hidden");
    if (isSuccess) {
      trial.onWin(player, rewardMult);
      addEventLog(`⚡ 【${player.name}】通过试炼【${trial.name}】：${trial.winText}`);
      showEventPopup("🌟", `试炼得胜：【${trial.name}】`, trial.winText, "#6fcf97", 2200);
    } else if (!usedShield) {
      trial.onLose(player);
      addEventLog(`⚡ 【${player.name}】未通过试炼【${trial.name}】：${trial.loseText}`);
      showEventPopup("⚠️", `试炼受挫：【${trial.name}】`, trial.loseText, "#eb5757", 2200);
    }
    refreshAllBoardTiles();
    renderAllPlayersHUD();
    checkBankruptcyAndContinue(player);
  };
}

// 4. 城市地区格处理：建立教会 / 扩建堂会 / 访问奉献
function handleCityTile(player, tile) {
  // 情况A：无主空地 -> 建立教会
  if (tile.owner === null) {
    const cost = tile.price;
    const initBelievers = player.charId === "peter" ? (tile.price * 2) / 10 : tile.price / 10;

    if (player.wealth < cost) {
      const msg = `抵达无主禾场【${tile.name}】，但经费不足 $${cost}，无法建立教会。`;
      addEventLog(`📍 【${player.name}】${msg}`);
      showEventPopup("📍", `${player.name} · 经费不足`, msg, player.color, 2000);
      finishPlayerTurnAction();
      return;
    }

    if (player.isAI) {
      if (player.wealth >= cost + 600) {
        buildChurchOnTile(player, tile);
      } else {
        showEventPopup("📍", `${player.name} · 途经【${tile.name}】`, `选择保留宣教资金，暂不植堂。`, player.color, 1600);
      }
      finishPlayerTurnAction();
      return;
    }

    openTileActionModal({
      tag: "🌱 开荒植堂（无主禾场）",
      title: `📍 ${tile.name}`,
      desc: `这片地区尚无教会见证，是否花费经费在此建立一座【1级·家庭聚会】？`,
      statsHtml: `
        <div>💰 建堂花费：<strong>$${cost.toLocaleString()}</strong>（当前财富：$${player.wealth.toLocaleString()}）</div>
        <div>👥 初始信徒：<strong>${initBelievers} 人</strong> ${player.charId === "peter" ? "（【彼得·磐石牧养】初始信徒翻倍！）" : ""}</div>
        <div>📈 后续每升第 k 级将增加 (k/10)×$${cost} 信徒，最高 7 级。</div>
      `,
      confirmText: `建立教会 ($${cost.toLocaleString()})`,
      cancelText: "暂不建立",
      onConfirm: () => {
        buildChurchOnTile(player, tile);
        finishPlayerTurnAction();
      },
      onCancel: () => finishPlayerTurnAction()
    });
    return;
  }

  // 情况B：自己的教会 -> 扩建堂会
  if (tile.owner === player.index) {
    if (tile.level >= 7) {
      const msg = `回到满级 7 级圣殿【${tile.name}教会】，会众兴旺（信徒 ${tile.believers} 人）！`;
      addEventLog(`⛪ 【${player.name}】${msg}`);
      showEventPopup("👑", `${player.name} · 巡视满级圣殿`, msg, player.color, 2000);
      finishPlayerTurnAction();
      return;
    }

    const nextLevel = tile.level + 1;
    const isSolomonDiscount = player.charId === "solomon" && nextLevel >= 5;
    const upgradeCost = isSolomonDiscount ? Math.round(tile.price * 0.8) : tile.price;
    const addedBelievers = Math.round((nextLevel / 10) * tile.price);

    if (player.wealth < upgradeCost) {
      const msg = `回到【${tile.name}教会】，但经费不足 $${upgradeCost}，暂无法扩建。`;
      addEventLog(`⛪ 【${player.name}】${msg}`);
      showEventPopup("⛪", `${player.name} · 回到己方堂会`, msg, player.color, 2000);
      finishPlayerTurnAction();
      return;
    }

    if (player.isAI) {
      if (player.wealth >= upgradeCost + 800) {
        player.wealth -= upgradeCost;
        upgradeChurchOnTile(tile, true);
      }
      finishPlayerTurnAction();
      return;
    }

    openTileActionModal({
      tag: "🔨 扩建堂会（牧养复兴）",
      title: `⛪ ${tile.name}教会（当前 ${tile.level} 级）`,
      desc: `是否花费经费将堂会从【${tile.level}级·${CHURCH_RANK_NAMES[tile.level]}】扩建至【${nextLevel}级·${CHURCH_RANK_NAMES[nextLevel]}】？`,
      statsHtml: `
        <div>💰 扩建费用：<strong>$${upgradeCost.toLocaleString()}</strong> ${isSolomonDiscount ? "（【所罗门·圣殿建造者】5~7级享8折优惠！）" : ""}</div>
        <div>👥 新增信徒：<strong>+${addedBelievers.toLocaleString()} 人</strong>（扩建后达 ${(tile.believers + addedBelievers).toLocaleString()} 人）</div>
      `,
      confirmText: `确认扩建 ($${upgradeCost.toLocaleString()})`,
      cancelText: "暂不扩建",
      onConfirm: () => {
        player.wealth -= upgradeCost;
        upgradeChurchOnTile(tile, true);
        finishPlayerTurnAction();
      },
      onCancel: () => finishPlayerTurnAction()
    });
    return;
  }

  // 情况C：其他玩家的教会 -> 团契访问与奉献结算
  const hostPlayer = gameState.players[tile.owner];
  if (player.shieldActive) {
    player.shieldActive = false;
    const msg = `访问【${hostPlayer.name}】的【${tile.name}教会】，触发【属灵全副军装】免除了奉献款！`;
    addEventLog(`🛡️ 【${player.name}】${msg}`);
    showEventPopup("🛡️", `${player.name} · 护盾免除奉献`, msg, "#56ccf2", 2400);
    renderAllPlayersHUD();
    finishPlayerTurnAction();
    return;
  }

  const B = tile.believers;
  const faithThreshold = player.faith * 10;
  let offering = 0;
  let formulaTypeDesc = "";

  if (B >= faithThreshold) {
    const oneTenthWealth = Math.max(0, Math.floor(player.wealth / 10));
    offering = Math.max(oneTenthWealth, B);
    formulaTypeDesc = `教会信徒 (${B}) ≥ 你的信心×10 (${faithThreshold})，触发【受感大额奉献】：max(财产1/10=$${oneTenthWealth}, 信徒数=${B})`;
  } else {
    const levelBase = Math.round((tile.level * tile.price) / 10);
    offering = Math.min(B, levelBase);
    formulaTypeDesc = `教会信徒 (${B}) < 你的信心×10 (${faithThreshold})，触发【常规甘心奉献】：min(信徒数=${B}, 等级×地价/10=${levelBase})`;
  }

  if (player.charId === "barnabas") {
    offering = Math.round(offering * 0.75);
    formulaTypeDesc += "（【巴拿巴·甘心劝慰】已减免 25% 奉献额）";
  }

  if (hostPlayer.charId === "barnabas") {
    hostPlayer.faith += 5;
  }

  if (player.isAI) {
    player.wealth -= offering;
    hostPlayer.wealth += offering;
    const msg = `访问【${hostPlayer.name}】的【${tile.name}教会】，献上爱心奉献 $${offering.toLocaleString()}！`;
    addEventLog(`🤝 【${player.name}】${msg}`);
    showEventPopup("🤝", `团契访问 · 奉献 $${offering.toLocaleString()}`, `【${player.name}】${msg}`, hostPlayer.color, 2500);
    renderAllPlayersHUD();
    checkBankruptcyAndContinue(player);
    return;
  }

  openTileActionModal({
    tag: "🤝 团契访问与爱心奉献",
    title: `⛪ 访问【${hostPlayer.name}】的 ${tile.name}教会`,
    desc: `你踏入了同工建立的 ${tile.level} 级【${CHURCH_RANK_NAMES[tile.level]}】，需按规矩支持当地圣工。`,
    statsHtml: `
      <div>📊 判定依据：${formulaTypeDesc}</div>
      <div>💸 应付奉献款：<strong style="color:#f2c94c;font-size:1.1rem;">$${offering.toLocaleString()}</strong></div>
      ${hostPlayer.charId === "barnabas" ? `<div>✨ 东道主【巴拿巴】额外获得 +5 信心！</div>` : ""}
    `,
    confirmText: `支付奉献 ($${offering.toLocaleString()})`,
    cancelText: null,
    onConfirm: () => {
      player.wealth -= offering;
      hostPlayer.wealth += offering;
      const msg = `向【${hostPlayer.name}】的【${tile.name}教会】奉献了 $${offering.toLocaleString()}！`;
      addEventLog(`🤝 【${player.name}】${msg}`);
      showEventPopup("🤝", `爱心奉献 $${offering.toLocaleString()}`, `【${player.name}】${msg}`, hostPlayer.color, 2300);
      renderAllPlayersHUD();
      checkBankruptcyAndContinue(player);
    }
  });
}

function buildChurchOnTile(player, tile) {
  player.wealth -= tile.price;
  tile.owner = player.index;
  tile.level = 1;
  tile.believers = player.charId === "peter" ? (tile.price * 2) / 10 : tile.price / 10;

  updateSingleTileDOM(tile.index);
  renderAllPlayersHUD();
  const msg = `在【${tile.name}】建立 1 级教会（家庭聚会），初始信徒 ${tile.believers} 人！`;
  addEventLog(`⛪ 【${player.name}】${msg}`);
  showEventPopup("⛪", `${player.name} · 开荒植堂`, msg, player.color, 2300);
}

function upgradeChurchOnTile(tile, logIt = true) {
  if (tile.level >= 7) return;
  tile.level += 1;
  const added = Math.round((tile.level / 10) * tile.price);
  tile.believers += added;
  updateSingleTileDOM(tile.index);
  renderAllPlayersHUD();

  if (logIt && tile.owner !== null) {
    const owner = gameState.players[tile.owner];
    const msg = `将【${tile.name}教会】扩建至 ${tile.level} 级（${CHURCH_RANK_NAMES[tile.level]}），信徒增至 ${tile.believers} 人！`;
    addEventLog(`🔨 【${owner.name}】${msg}`);
    showEventPopup("🔨", `${owner.name} · 扩建堂会`, msg, owner.color, 2300);
  }
}

function openTileActionModal({ tag, title, desc, statsHtml, confirmText, cancelText, onConfirm, onCancel }) {
  const modal = document.getElementById("modal-tile-action");
  modal.classList.remove("hidden");

  document.getElementById("tile-modal-type-tag").textContent = tag;
  document.getElementById("tile-modal-title").textContent = title;
  document.getElementById("tile-modal-desc").textContent = desc;
  document.getElementById("tile-stats-preview").innerHTML = statsHtml;

  const confirmBtn = document.getElementById("btn-tile-confirm");
  const cancelBtn = document.getElementById("btn-tile-cancel");

  confirmBtn.textContent = confirmText;
  confirmBtn.onclick = () => {
    modal.classList.add("hidden");
    if (onConfirm) onConfirm();
  };

  if (cancelText) {
    cancelBtn.classList.remove("hidden");
    cancelBtn.textContent = cancelText;
    cancelBtn.onclick = () => {
      modal.classList.add("hidden");
      if (onCancel) onCancel();
    };
  } else {
    cancelBtn.classList.add("hidden");
  }
}

// ==================== 九、财务赤字：3 折变卖堂会与破产淘汰 ====================

function checkBankruptcyAndContinue(player) {
  if (player.wealth >= 0) {
    finishPlayerTurnAction();
    return;
  }

  const myChurches = getPlayerChurches(player.index);
  const totalLiquidationVal = myChurches.reduce((acc, t) => acc + Math.round(t.level * t.price * 0.3), 0);

  if (myChurches.length === 0 || player.wealth + totalLiquidationVal < 0) {
    eliminatePlayer(player);
    finishPlayerTurnAction();
    return;
  }

  if (player.isAI) {
    myChurches.sort((a, b) => a.believers - b.believers);
    for (const t of myChurches) {
      if (player.wealth >= 0) break;
      sellChurchAtThreeFoldDiscount(player, t);
    }
    finishPlayerTurnAction();
    return;
  }

  openLiquidationModal(player);
}

function sellChurchAtThreeFoldDiscount(player, tile) {
  const refund = Math.round(tile.level * tile.price * 0.3);
  player.wealth += refund;
  const msg = `以 3 折变卖了 ${tile.level} 级【${tile.name}教会】，回收资金 $${refund.toLocaleString()}。`;
  addEventLog(`⚠️ 【${player.name}】${msg}`);
  showEventPopup("⚠️", `${player.name} · 3折变卖堂会`, msg, "#eb5757", 2500);

  tile.owner = null;
  tile.level = 0;
  tile.believers = 0;
  updateSingleTileDOM(tile.index);
  renderAllPlayersHUD();
}

function openLiquidationModal(player) {
  const modal = document.getElementById("modal-liquidation");
  modal.classList.remove("hidden");

  const finishBtn = document.getElementById("btn-liq-finish");

  function refreshLiqList() {
    document.getElementById("liq-current-wealth").textContent = `$${player.wealth.toLocaleString()}`;
    const listEl = document.getElementById("liq-church-list");
    listEl.innerHTML = "";

    const churches = getPlayerChurches(player.index);
    churches.forEach(t => {
      const refund = Math.round(t.level * t.price * 0.3);
      const item = document.createElement("div");
      item.className = "liq-item";
      item.innerHTML = `
        <div>
          <strong>⛪ ${t.name}教会</strong>（${t.level}级 · 信徒 ${t.believers} 人）
          <div style="font-size:0.78rem;color:#b59f7e;">原累计投入：$${(t.level * t.price).toLocaleString()} | 3折回收：+$${refund.toLocaleString()}</div>
        </div>
        <button type="button" class="btn-primary" style="padding:6px 14px;font-size:0.84rem;">变卖 (+$${refund.toLocaleString()})</button>
      `;
      item.querySelector("button").addEventListener("click", () => {
        sellChurchAtThreeFoldDiscount(player, t);
        refreshLiqList();
      });
      listEl.appendChild(item);
    });

    finishBtn.disabled = player.wealth < 0;
  }

  refreshLiqList();

  finishBtn.onclick = () => {
    if (player.wealth >= 0) {
      modal.classList.add("hidden");
      finishPlayerTurnAction();
    }
  };
}

function eliminatePlayer(player) {
  player.eliminated = true;
  player.wealth = 0;
  getPlayerChurches(player.index).forEach(t => {
    t.owner = null;
    t.level = 0;
    t.believers = 0;
    updateSingleTileDOM(t.index);
  });
  const msg = `因资不抵债且无堂会可变卖，事工停滞，退出天路！`;
  addEventLog(`🚨 【${player.name}（${player.charName}）】${msg}`);
  showEventPopup("🚨", `${player.name} · 淘汰出局`, msg, "#eb5757", 3200);
  renderAllPlayersHUD();
  updateAllTokensPosition();
}

// ==================== 十、圣灵恩赐主动使用逻辑 ====================

function openPlayerGiftsPicker() {
  const player = gameState.players[gameState.currentPlayerIdx];
  // 严格校验：只有在投掷骰子前的 READY_ROLL 阶段才允许打开技能栏
  if (gameState.phase !== "READY_ROLL" || player.isAI) return;

  if (gameState.usedGiftThisTurn) {
    showEventPopup("⚠️", "本回合已使用过恩赐", "每个回合最多只能发动 1 项【圣灵恩赐】！", "#f2c94c", 1800);
    return;
  }

  if (player.gifts.length === 0) {
    showEventPopup("🕊️", "暂无圣灵恩赐", "可在踏上【五旬节格】时消耗信心领受恩赐卡！", "#56ccf2", 1800);
    return;
  }

  const modal = document.getElementById("modal-target-picker");
  modal.classList.remove("hidden");
  document.getElementById("picker-gift-tag").textContent = "🕊️ 圣灵恩赐槽（投掷前可用）";
  document.getElementById("picker-title").textContent = "请选择本回合要发动的【圣灵恩赐】";

  const listEl = document.getElementById("picker-list");
  listEl.innerHTML = "";

  player.gifts.forEach((gId, gIdx) => {
    const g = SPIRITUAL_GIFTS.find(x => x.id === gId);
    const item = document.createElement("div");
    item.className = "picker-item";
    item.innerHTML = `
      <div>
        <strong style="color:#f2c94c;">🕊️ ${g.name}</strong>
        <div style="font-size:0.8rem;color:#dfd0b8;margin-top:2px;">${g.desc}</div>
      </div>
      <button type="button" class="btn-primary" style="padding:6px 14px;font-size:0.85rem;">发动</button>
    `;
    item.querySelector("button").addEventListener("click", () => {
      modal.classList.add("hidden");
      activateSpiritualGift(player, gId, gIdx);
    });
    listEl.appendChild(item);
  });

  document.getElementById("btn-picker-cancel").onclick = () => {
    modal.classList.add("hidden");
  };
}

function activateSpiritualGift(player, giftId, giftSlotIdx) {
  if (gameState.phase !== "READY_ROLL" || gameState.usedGiftThisTurn) return;

  const consumeGift = () => {
    player.gifts.splice(giftSlotIdx, 1);
    gameState.usedGiftThisTurn = true;
    renderAllPlayersHUD();
  };

  // 1. 云柱火柱（遥控骰子 1~6 步）
  if (giftId === "pillar_cloud") {
    const rModal = document.getElementById("modal-remote-dice");
    rModal.classList.remove("hidden");
    rModal.querySelectorAll(".step-btn").forEach(btn => {
      btn.onclick = () => {
        const step = parseInt(btn.dataset.step, 10);
        rModal.classList.add("hidden");
        consumeGift();
        addEventLog(`🕊️ 【${player.name}】发动【云柱火柱】，指定前进 ${step} 步！`);
        showEventPopup("🕊️", `${player.name} · 云柱火柱`, `神圣引导：指定前进 ${step} 步！`, "#56ccf2", 2000);
        executeRollDice(step);
      };
    });
    return;
  }

  // 2. 如鹰展翅（双重骰子）
  if (giftId === "eagle_wings") {
    consumeGift();
    gameState.doubleDiceActive = true;
    document.getElementById("dice-box-2").classList.remove("hidden");
    addEventLog(`🕊️ 【${player.name}】发动【如鹰展翅】，本回合将同时投掷两颗骰子！`);
    showEventPopup("🦅", `${player.name} · 如鹰展翅`, `本回合将同时投掷 2 颗骰子！`, "#56ccf2", 2000);
    return;
  }

  // 3. 腓利被提（直接传送至己方任意教会）
  if (giftId === "philip_teleport") {
    const myChurches = getPlayerChurches(player.index);
    if (myChurches.length === 0) {
      showEventPopup("⚠️", "无法发动【腓利被提】", "你名下尚无已建立的教会可供传送！", "#eb5757", 2000);
      return;
    }
    openChurchTargetSelection("【腓利被提】选择要传送前往的己方教会", myChurches, (targetTile) => {
      consumeGift();
      gameState.phase = "MOVING";
      document.getElementById("btn-roll-dice").disabled = true;
      document.getElementById("btn-open-gifts").disabled = true;

      player.position = targetTile.index;
      updateAllTokensPosition();
      focusCameraOnPlayer(player);

      addEventLog(`🕊️ 【${player.name}】发动【腓利被提】，被圣灵瞬间提往【${targetTile.name}教会】！`);
      showEventPopup("🕊️", `${player.name} · 腓利被提`, `瞬间传送至【${targetTile.name}教会】！`, "#56ccf2", 2200);
      onPlayerLandedOnTile(player);
    });
    return;
  }

  // 4. 尼希米筑墙（远程免费升1级）
  if (giftId === "nehemiah_wall") {
    const upgradable = getPlayerChurches(player.index).filter(t => t.level < 7);
    if (upgradable.length === 0) {
      showEventPopup("⚠️", "无法发动【尼希米筑墙】", "你名下没有可扩建的未满级教会！", "#eb5757", 2000);
      return;
    }
    openChurchTargetSelection("【尼希米筑墙】选择要免费扩建 1 级的己方教会", upgradable, (targetTile) => {
      consumeGift();
      upgradeChurchOnTile(targetTile, false);
      const msg = `【${targetTile.name}教会】免费扩建至 ${targetTile.level} 级（信徒 ${targetTile.believers} 人）！`;
      addEventLog(`🕊️ 【${player.name}】发动【尼希米筑墙】，${msg}`);
      showEventPopup("🧱", `${player.name} · 尼希米筑墙`, msg, "#56ccf2", 2300);
    });
    return;
  }

  // 5. 洁净圣殿（对手教会降1级）
  if (giftId === "cleanse_temple") {
    const enemyChurches = gameState.board.filter(t => t.type === "city" && t.owner !== null && t.owner !== player.index);
    if (enemyChurches.length === 0) {
      showEventPopup("⚠️", "无法发动【洁净圣殿】", "场上尚无其他玩家的教会可供降级！", "#eb5757", 2000);
      return;
    }
    openChurchTargetSelection("【洁净圣殿】选择要强制降级的对手教会", enemyChurches, (targetTile) => {
      consumeGift();
      if (targetTile.level > 1) {
        const removedBase = Math.round((targetTile.level / 10) * targetTile.price);
        targetTile.level -= 1;
        targetTile.believers = Math.max(20, targetTile.believers - removedBase);
      } else {
        targetTile.believers = Math.max(10, Math.floor(targetTile.believers * 0.5));
      }
      updateSingleTileDOM(targetTile.index);
      renderAllPlayersHUD();
      const msg = `使【${targetTile.name}教会】降级整顿（当前 ${targetTile.level} 级，信徒 ${targetTile.believers} 人）！`;
      addEventLog(`🕊️ 【${player.name}】发动【洁净圣殿】，${msg}`);
      showEventPopup("⚡", `${player.name} · 洁净圣殿`, msg, "#eb5757", 2300);
    });
    return;
  }

  // 6. 迦拿婚宴（信心转财富）
  if (giftId === "cana_wedding") {
    consumeGift();
    const gain = Math.max(1200, player.faith * 40);
    player.wealth += gain;
    renderAllPlayersHUD();
    const msg = `水变美酒，获得 $${gain.toLocaleString()} 财富补助！`;
    addEventLog(`🕊️ 【${player.name}】发动【迦拿婚宴】，${msg}`);
    showEventPopup("🍷", `${player.name} · 迦拿婚宴`, msg, "#6fcf97", 2300);
    return;
  }

  // 7. 五饼二鱼（指定己方教会信徒 +30%）
  if (giftId === "five_loaves") {
    const myChurches = getPlayerChurches(player.index);
    if (myChurches.length === 0) {
      showEventPopup("⚠️", "无法发动【五饼二鱼】", "你名下尚无教会可供祝福倍增！", "#eb5757", 2000);
      return;
    }
    openChurchTargetSelection("【五饼二鱼】选择要使信徒 +30% 的己方教会", myChurches, (targetTile) => {
      consumeGift();
      targetTile.believers = Math.round(targetTile.believers * 1.3);
      updateSingleTileDOM(targetTile.index);
      renderAllPlayersHUD();
      const msg = `【${targetTile.name}教会】信徒暴涨 30% 至 ${targetTile.believers} 人！`;
      addEventLog(`🕊️ 【${player.name}】发动【五饼二鱼】，${msg}`);
      showEventPopup("🐟", `${player.name} · 五饼二鱼`, msg, "#6fcf97", 2300);
    });
    return;
  }

  // 8. 属灵全副军装（护盾）
  if (giftId === "armor_of_god") {
    consumeGift();
    player.shieldActive = true;
    renderAllPlayersHUD();
    const msg = `获得 1 层信德护盾（免除下一次奉献款或试炼惩罚）！`;
    addEventLog(`🛡️ 【${player.name}】穿戴【属灵全副军装】，${msg}`);
    showEventPopup("🛡️", `${player.name} · 属灵全副军装`, msg, "#56ccf2", 2200);
    return;
  }

  // 9. 舌音方言（下回合免答全对）
  if (giftId === "gift_tongues") {
    consumeGift();
    player.autoPassQuiz = true;
    const msg = `下回合晨更查经将无需做题，直接判定全部正确（信徒+10%）！`;
    addEventLog(`🕊️ 【${player.name}】发动【舌音方言】，${msg}`);
    showEventPopup("🔥", `${player.name} · 舌音方言`, msg, "#56ccf2", 2200);
    return;
  }

  // 10. 约禧年号角（从首富对手转移 15% 财富）
  if (giftId === "jubilee_horn") {
    const enemies = gameState.players.filter(p => p.index !== player.index && !p.eliminated);
    if (enemies.length === 0) return;
    enemies.sort((a, b) => b.wealth - a.wealth);
    const richest = enemies[0];
    const transfer = Math.max(0, Math.round(richest.wealth * 0.15));
    consumeGift();
    richest.wealth -= transfer;
    player.wealth += transfer;
    renderAllPlayersHUD();
    const msg = `从首富【${richest.name}】处转移了 $${transfer.toLocaleString()} 财富归入名下！`;
    addEventLog(`🎺 【${player.name}】吹响【约禧年号角】，${msg}`);
    showEventPopup("🎺", `${player.name} · 约禧年号角`, msg, "#f2c94c", 2500);
  }
}

function openChurchTargetSelection(title, tilesList, onSelect) {
  const modal = document.getElementById("modal-target-picker");
  modal.classList.remove("hidden");
  document.getElementById("picker-gift-tag").textContent = "🎯 选择目标堂会";
  document.getElementById("picker-title").textContent = title;

  const listEl = document.getElementById("picker-list");
  listEl.innerHTML = "";

  tilesList.forEach(t => {
    const owner = gameState.players[t.owner];
    const item = document.createElement("div");
    item.className = "picker-item";
    item.style.borderLeft = `4px solid ${owner.color}`;
    item.innerHTML = `
      <div>
        <strong>⛪ ${t.name}教会</strong>（${t.level}级 · 归属：${escapeHtml(owner.name)}）
        <div style="font-size:0.8rem;color:#b59f7e;">当前信徒：${t.believers.toLocaleString()} 人</div>
      </div>
      <button type="button" class="btn-primary" style="padding:6px 14px;font-size:0.84rem;">选择此堂会</button>
    `;
    item.querySelector("button").addEventListener("click", () => {
      modal.classList.add("hidden");
      onSelect(t);
    });
    listEl.appendChild(item);
  });

  document.getElementById("btn-picker-cancel").onclick = () => {
    modal.classList.add("hidden");
  };
}

// ==================== 十一、回合推进与终局胜负判定 ====================

function finishPlayerTurnAction() {
  if (checkVictoryConditions()) return;

  const p = gameState.players[gameState.currentPlayerIdx];
  renderAllPlayersHUD();

  if (p.isAI || p.eliminated) {
    setTimeout(() => advanceToNextPlayer(), 1100);
  } else {
    setPhaseText("事工完成，请结束回合");
    const endBtn = document.getElementById("btn-end-turn");
    endBtn.classList.remove("hidden");
  }
}

function advanceToNextPlayer() {
  document.getElementById("btn-end-turn").classList.add("hidden");

  const totalPlayers = gameState.players.length;
  let nextIdx = (gameState.currentPlayerIdx + 1) % totalPlayers;

  if (nextIdx <= gameState.currentPlayerIdx) {
    gameState.round += 1;
  }

  gameState.currentPlayerIdx = nextIdx;

  let guard = 0;
  while (gameState.players[gameState.currentPlayerIdx].eliminated && guard < totalPlayers) {
    const prev = gameState.currentPlayerIdx;
    gameState.currentPlayerIdx = (gameState.currentPlayerIdx + 1) % totalPlayers;
    if (gameState.currentPlayerIdx <= prev) {
      gameState.round += 1;
    }
    guard++;
  }

  startPlayerTurn();
}

function checkVictoryConditions() {
  const alivePlayers = gameState.players.filter(p => !p.eliminated);

  if (alivePlayers.length === 1) {
    showGameOverModal(alivePlayers[0], "福音遍传：成为场上唯一坚守到底的天路同行者！");
    return true;
  }

  if (gameState.lobby.winGoal === "believers") {
    const targetBelievers = MAPS_DATA[gameState.lobby.mapSize].believerGoal;
    for (const p of alivePlayers) {
      const totalB = getPlayerTotalBelievers(p.index);
      if (totalB >= targetBelievers) {
        showGameOverModal(p, `大使命达成：名下教会总信徒率先突破 ${targetBelievers.toLocaleString()} 人！`);
        return true;
      }
    }
  }

  if (gameState.lobby.winGoal === "score" && gameState.round > gameState.maxRounds) {
    const ranked = [...alivePlayers].sort((a, b) => computePlayerScore(b) - computePlayerScore(a));
    showGameOverModal(ranked[0], `天国荣耀：${gameState.maxRounds} 回合期满，以最高属灵影响力夺冠！`);
    return true;
  }

  return false;
}

function computePlayerScore(player) {
  const totalB = getPlayerTotalBelievers(player.index);
  return player.wealth + (totalB * 2) + (player.faith * 100);
}

function showGameOverModal(winner, reasonText) {
  gameState.phase = "GAMEOVER";
  const modal = document.getElementById("modal-gameover");
  modal.classList.remove("hidden");

  document.getElementById("gameover-title").textContent = `👑 荣耀归主！【${winner.name}（${winner.charName}）】获胜！`;
  document.getElementById("gameover-subtitle").textContent = reasonText;

  const ranked = [...gameState.players].sort((a, b) => {
    if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    return computePlayerScore(b) - computePlayerScore(a);
  });

  const tableEl = document.getElementById("gameover-rankings");
  tableEl.innerHTML = ranked.map((p, idx) => {
    const churches = getPlayerChurches(p.index).length;
    const believers = getPlayerTotalBelievers(p.index);
    const score = computePlayerScore(p);
    return `
      <div class="picker-item" style="margin-bottom:8px;border-left:5px solid ${p.color};border-color:${idx === 0 ? "#f2c94c" : "#59442e"};">
        <div>
          <strong style="font-size:1rem;color:${idx === 0 ? "#f2c94c" : "#fff"};">
            第 ${idx + 1} 名：${escapeHtml(p.name)}（${p.charName}） ${p.eliminated ? "[已退场]" : ""}
          </strong>
          <div style="font-size:0.82rem;color:#d1bfa3;margin-top:3px;">
            ⛪ 堂会：${churches} 座 | 👥 总信徒：${believers.toLocaleString()} 人 | 💰 财富：$${p.wealth.toLocaleString()} | 🕊️ 信心：${p.faith}
          </div>
        </div>
        <div style="text-align:right;">
          <span style="font-size:0.75rem;color:#a89478;">综合影响力</span>
          <div style="font-size:1.1rem;font-weight:900;color:#6fcf97;">${score.toLocaleString()}</div>
        </div>
      </div>
    `;
  }).join("");
}

// ==================== 十二、全屏棋盘拖拽、缩放与工具函数 ====================

function initMapViewportDrag() {
  const viewport = document.getElementById("map-viewport");
  const canvas = document.getElementById("map-canvas");

  viewport.addEventListener("mousedown", (e) => {
    if (e.button !== 0 && e.button !== 2) return;
    gameState.camera.isDragging = true;
    canvas.classList.add("dragging");
    gameState.camera.startX = e.clientX - gameState.camera.x;
    gameState.camera.startY = e.clientY - gameState.camera.y;
  });

  window.addEventListener("mousemove", (e) => {
    if (!gameState.camera.isDragging) return;
    gameState.camera.x = e.clientX - gameState.camera.startX;
    gameState.camera.y = e.clientY - gameState.camera.startY;
    applyCameraTransform();
  });

  window.addEventListener("mouseup", () => {
    if (gameState.camera.isDragging) {
      gameState.camera.isDragging = false;
      canvas.classList.remove("dragging");
    }
  });

  viewport.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    gameState.camera.scale = Math.min(1.5, Math.max(0.45, gameState.camera.scale + delta));
    applyCameraTransform();
  }, { passive: false });
}

function applyCameraTransform() {
  const canvas = document.getElementById("map-canvas");
  const { x, y, scale } = gameState.camera;
  canvas.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${scale})`;
}

function resetCameraPosition() {
  const currentPlayer = gameState.players[gameState.currentPlayerIdx];
  if (currentPlayer) {
    focusCameraOnPlayer(currentPlayer);
  } else {
    gameState.camera.x = 0;
    gameState.camera.y = 0;
    applyCameraTransform();
  }
}

function bindGlobalButtons() {
  document.getElementById("btn-roll-dice").addEventListener("click", () => executeRollDice());
  document.getElementById("btn-open-gifts").addEventListener("click", openPlayerGiftsPicker);
  document.getElementById("btn-end-turn").addEventListener("click", advanceToNextPlayer);

  document.getElementById("btn-reset-camera").addEventListener("click", resetCameraPosition);
  document.getElementById("btn-zoom-in").addEventListener("click", () => {
    gameState.camera.scale = Math.min(1.5, gameState.camera.scale + 0.1);
    applyCameraTransform();
  });
  document.getElementById("btn-zoom-out").addEventListener("click", () => {
    gameState.camera.scale = Math.max(0.45, gameState.camera.scale - 0.1);
    applyCameraTransform();
  });

  document.getElementById("btn-toggle-rules").addEventListener("click", () => {
    document.getElementById("modal-rules").classList.remove("hidden");
  });
  document.getElementById("btn-close-rules").addEventListener("click", () => {
    document.getElementById("modal-rules").classList.add("hidden");
  });

  document.getElementById("btn-restart-game").addEventListener("click", () => {
    document.getElementById("modal-gameover").classList.add("hidden");
    document.getElementById("lobby-screen").classList.remove("hidden");
    document.getElementById("lobby-screen").classList.add("active");
  });
}

function getPlayerChurches(playerIdx) {
  return gameState.board.filter(t => t.type === "city" && t.owner === playerIdx);
}

function getPlayerTotalBelievers(playerIdx) {
  return getPlayerChurches(playerIdx).reduce((sum, t) => sum + t.believers, 0);
}

function refreshAllBoardTiles() {
  gameState.board.forEach((_, idx) => updateSingleTileDOM(idx));
}

function addEventLog(text) {
  const box = document.getElementById("event-log-box");
  if (!box) return;
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.textContent = `[回合${gameState.round}] ${text}`;
  box.prepend(entry);
}

function clearEventLog() {
  const box = document.getElementById("event-log-box");
  if (box) box.innerHTML = "";
}