// 全局状态
const PRESET_PLAYERS = [
  { name: "彼得 (Peter)", color: "#c92a2a" },
  { name: "保罗 (Paul)", color: "#2b8a3e" },
  { name: "约翰 (John)", color: "#1864ab" },
  { name: "摩西 (Moses)", color: "#e67700" },
  { name: "大卫 (David)", color: "#5f3dc4" },
  { name: "路得 (Ruth)", color: "#a61e4d" },
  { name: "以斯帖 (Esther)", color: "#d9480f" },
  { name: "约瑟 (Joseph)", color: "#495057" }
];

let boardConfig = null;
let questionsData = [];
let cardsData = [];

let players = [];
let activePlayerIndex = 0;
let currentRound = 1;
let isFirstPlayerFinished = false; // 触发终局倒计时
let isAnimating = false;

// 1. 初始化入口与加载配置文件
window.addEventListener("DOMContentLoaded", async () => {
  try {
    const [bRes, qRes, cRes] = await Promise.all([
      fetch("board_config.json"),
      fetch("questions.json"),
      fetch("cards.json")
    ]);
    boardConfig = await bRes.json();
    questionsData = await qRes.json();
    cardsData = await cRes.json();
  } catch (err) {
    console.error("加载 JSON 失败，请确保使用本地 HTTP 服务器访问 (如 VSCode Live Server):", err);
  }

  setupLobbyUI();
  bindEvents();
});

// 2. 开局设置逻辑
function setupLobbyUI() {
  const select = document.getElementById("player-count");
  const container = document.getElementById("player-names-container");

  function renderInputs(count) {
    container.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const p = PRESET_PLAYERS[i];
      const div = document.createElement("div");
      div.className = "player-input-item";
      div.innerHTML = `
        <span class="roster-color-dot" style="background:${p.color}"></span>
        <input type="text" id="p-input-${i}" value="${p.name}">
      `;
      container.appendChild(div);
    }
  }

  select.addEventListener("change", (e) => renderInputs(parseInt(e.target.value)));
  renderInputs(2);
}

function bindEvents() {
  document.getElementById("start-game-btn").addEventListener("click", () => {
    const count = parseInt(document.getElementById("player-count").value);
    players = [];
    for (let i = 0; i < count; i++) {
      const name = document.getElementById(`p-input-${i}`).value.trim() || PRESET_PLAYERS[i].name;
      players.push({
        id: i,
        name: name,
        color: PRESET_PLAYERS[i].color,
        position: 1, // 起点为 1
        faith: 50,  // 初始 50 信心值
        isFasting: false,
        hasReachedGoal: false
      });
    }

    document.getElementById("setup-modal").classList.remove("active");
    initBoard();
    updateUI();
    log(`天路历程启程！共有 ${players.length} 名天路客出发。`);
  });

  document.getElementById("roll-btn").addEventListener("click", handleRollDice);
}

// 3. 构建 70 格 S 型蛇形棋盘
function initBoard() {
  const boardEl = document.getElementById("board");
  boardEl.innerHTML = "";

  // 7行10列，S型弯曲排列 (Row 0: 1..10 左->右; Row 1: 20..11 右->左 ...)
  const gridMapping = [];
  for (let row = 6; row >= 0; row--) {
    const isEvenFromBottom = (6 - row) % 2 === 0;
    const rowTiles = [];
    const startTile = (6 - row) * 10 + 1;
    for (let c = 0; c < 10; c++) {
      rowTiles.push(startTile + c);
    }
    if (!isEvenFromBottom) {
      rowTiles.reverse();
    }
    gridMapping.push(...rowTiles);
  }

  gridMapping.forEach((tileNum) => {
    const tileDiv = document.createElement("div");
    tileDiv.className = "tile";
    tileDiv.id = `tile-${tileNum}`;

    // 计算当前格处于第几层 (0~6层，从下往上)
    const floorIndex = Math.floor((tileNum - 1) / 10);
    // 判断该层水平行进方向：偶数层向右（1->10），奇数层向左（11->20）
    const isGoingRight = floorIndex % 2 === 0;

    let pathDirSymbol = "";
    let pathClass = "";

    // 路线指示：终点为★，逢十转折处统一为向下箭头 ↓，常规行进为水平箭头
    if (tileNum === 70) {
      pathDirSymbol = "★";
      pathClass = "tile-goal-mark";
    } else if (tileNum % 10 === 0) {
      // 逢十拐角处统一显示向下箭头，无文字
      pathDirSymbol = "↓";
      pathClass = "tile-turn";
    } else {
      // 常规行进箭头
      pathDirSymbol = isGoingRight ? "→" : "←";
      pathClass = "tile-arrow";
    }

    let label = "";
    // 判断特殊格
    if (tileNum === 1) {
      tileDiv.classList.add("tile-start");
      label = "起点";
    } else if (tileNum === 70) {
      tileDiv.classList.add("tile-goal");
      label = "新耶路撒冷";
    } else if (boardConfig.ladders.some(l => l.from === tileNum)) {
      tileDiv.classList.add("tile-ladder");
      const lad = boardConfig.ladders.find(l => l.from === tileNum);
      label = `十字架 ➔ ${lad.to}`;
    } else if (boardConfig.snakes.some(s => s.from === tileNum)) {
      tileDiv.classList.add("tile-snake");
      const snk = boardConfig.snakes.find(s => s.from === tileNum);
      label = `蛇陷阱 ➔ ${snk.to}`;
    } else if (boardConfig.sabbathTiles.includes(tileNum)) {
      tileDiv.classList.add("tile-sabbath");
      label = "安息日";
    } else if (boardConfig.eventTiles.includes(tileNum)) {
      tileDiv.classList.add("tile-event");
      label = "卡牌格";
    } else {
      label = "答题格";
    }

    tileDiv.innerHTML = `
      <div class="tile-top-bar">
        <span class="tile-num">${tileNum}</span>
        <span class="path-guide ${pathClass}">${pathDirSymbol}</span>
      </div>
      <div class="tile-label">${label}</div>
      <div class="pieces-container" id="pieces-${tileNum}"></div>
    `;
    boardEl.appendChild(tileDiv);
  });

  renderPieces();
}

// 4. 棋子定位渲染
function renderPieces() {
  document.querySelectorAll(".pieces-container").forEach(c => c.innerHTML = "");
  players.forEach(p => {
    const container = document.getElementById(`pieces-${p.position}`);
    if (container) {
      const piece = document.createElement("div");
      piece.className = "player-piece";
      piece.id = `piece-player-${p.id}`;
      piece.style.backgroundColor = p.color;
      piece.title = `${p.name} (信心: ${p.faith})`;
      container.appendChild(piece);
    }
  });
}

// 5. 掷骰子与 3D 动画
function handleRollDice() {
  if (isAnimating) return;
  const curP = players[activePlayerIndex];

  // 判定是否正处于禁食祷告
  if (curP.isFasting) {
    showDialog(
      "禁食祷告",
      `${curP.name} 正在禁食祷告中（本轮跳过投骰子）。\n灵里重得力量，信心值恢复至 10 点！`,
      [{ label: "阿们，平安领受", onClick: () => {
        curP.faith = 10;
        curP.isFasting = false;
        closeDialog();
        nextTurn();
      }}]
    );
    return;
  }

  isAnimating = true;
  document.getElementById("roll-btn").disabled = true;

  const diceVal = Math.floor(Math.random() * 6) + 1;
  const diceEl = document.getElementById("dice");

  diceEl.className = "dice rolling";

  setTimeout(() => {
    diceEl.className = `dice show-${diceVal}`;
    document.getElementById("roll-status").textContent = `${curP.name} 掷出了 ${diceVal} 点！`;
    log(`${curP.name} 投掷出 ${diceVal} 点。`);

    // 执行逐格跳动
    movePlayerStepByStep(curP, diceVal);
  }, 1200);
}

// 6. 逐格动画移动
async function movePlayerStepByStep(player, steps) {
  for (let i = 0; i < steps; i++) {
    if (player.position >= 70) break;
    player.position += 1;
    renderPieces();
    
    // 微跳动动画反馈
    const pieceEl = document.getElementById(`piece-player-${player.id}`);
    if (pieceEl) {
      pieceEl.classList.add("jumping");
      await new Promise(r => setTimeout(r, 260));
      pieceEl.classList.remove("jumping");
    }
    await new Promise(r => setTimeout(r, 60));
  }

  // 到达检测
  if (player.position >= 70) {
    player.position = 70;
    player.hasReachedGoal = true;
    if (!isFirstPlayerFinished) {
      isFirstPlayerFinished = true;
      log(`【宣告】${player.name} 率先抵达新耶路撒冷！本轮（第 ${currentRound} 轮）结束后将正式结算。`);
    }
  }

  renderPieces();
  updateUI();

  // 触发落点事件
  handleTileEvent(player);
}

// 7. 落点格子事件分流
function handleTileEvent(player) {
  const pos = player.position;

  // 终点
  if (pos === 70) {
    handleSameTileCheck(player, () => nextTurn());
    return;
  }

  // A. 十字架飞升
  const ladder = boardConfig.ladders.find(l => l.from === pos);
  if (ladder) {
    showDialog("恩典阶梯", `踏上十字架恩典路径：【${ladder.label}】！\n飞升跃进至第 ${ladder.to} 格！`, [{
      label: "领受恩典",
      onClick: () => {
        closeDialog();
        player.position = ladder.to;
        renderPieces();
        updateUI();
        handleSameTileCheck(player, () => nextTurn());
      }
    }]);
    return;
  }

  // B. 蛇咬滑落
  const snake = boardConfig.snakes.find(s => s.from === pos);
  if (snake) {
    showDialog("旷野陷阱", `踩中蛇陷阱：【${snake.label}】！\n滑落倒退回第 ${snake.to} 格！`, [{
      label: "警醒自省",
      onClick: () => {
        closeDialog();
        player.position = snake.to;
        renderPieces();
        updateUI();
        handleSameTileCheck(player, () => nextTurn());
      }
    }]);
    return;
  }

  // C. 安息格
  if (boardConfig.sabbathTiles.includes(pos)) {
    showDialog("安息日避风港", "停留在安息圣洁之所，默想神的看顾。平安无事。", [{
      label: "领受安息",
      onClick: () => {
        closeDialog();
        handleSameTileCheck(player, () => nextTurn());
      }
    }]);
    return;
  }

  // D. 恩典/试炼卡牌格
  if (boardConfig.eventTiles.includes(pos)) {
    const card = cardsData[Math.floor(Math.random() * cardsData.length)];
    const isGrace = card.type === "grace";
    showDialog(
      isGrace ? "恩典卡牌" : "试炼卡牌",
      `【${card.title}】\n${card.description}\n\n信心变动: ${card.faithChange >= 0 ? '+' : ''}${card.faithChange}，位移: ${card.stepChange}`,
      [{
        label: "顺服",
        onClick: () => {
          closeDialog();
          player.faith += card.faithChange;
          applyStepOffset(player, card.stepChange);
          checkFaithStatus(player);
          handleSameTileCheck(player, () => nextTurn());
        }
      }]
    );
    return;
  }

  // E. 默认：圣经答题格
  triggerScriptureQuestion(player);
}

// 8. 问答弹窗逻辑
function triggerScriptureQuestion(player) {
  const q = questionsData[Math.floor(Math.random() * questionsData.length)];
  const content = document.createElement("div");
  content.innerHTML = `<p style="font-weight:bold;margin-bottom:12px;">${q.question}</p>`;

  const optContainer = document.createElement("div");
  optContainer.className = "options-list";

  q.options.forEach((optText, idx) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = `${['A','B','C','D'][idx]}. ${optText}`;
    btn.onclick = () => {
      closeDialog();
      if (idx === q.answerIndex) {
        player.faith += 5;
        log(`${player.name} 回答正确！(+5 信心) [${q.reference}]`);
        showDialog("答对了！", `正解！信心坚定，信心值 +5。\n经文出处: ${q.reference}`, [{
          label: "继续前行",
          onClick: () => {
            closeDialog();
            handleSameTileCheck(player, () => nextTurn());
          }
        }]);
      } else {
        player.faith -= 15;
        log(`${player.name} 回答错误。(-15 信心，后退 1 格) [${q.reference}]`);
        // 倒退 1 格，不触发该格事件
        applyStepOffset(player, -1);
        checkFaithStatus(player);
        showDialog("回答错误", `很遗憾答错了！信心值 -15，后退 1 格。\n正确答案为：${q.options[q.answerIndex]}\n经文出处: ${q.reference}`, [{
          label: "记在心上",
          onClick: () => {
            closeDialog();
            handleSameTileCheck(player, () => nextTurn());
          }
        }]);
      }
      updateUI();
    };
    optContainer.appendChild(btn);
  });

  content.appendChild(optContainer);

  const modal = document.getElementById("dialog-modal");
  document.getElementById("dialog-badge").textContent = "圣经问答";
  document.getElementById("dialog-title").textContent = `轮到 ${player.name} 作答`;
  document.getElementById("dialog-content").innerHTML = "";
  document.getElementById("dialog-content").appendChild(content);
  document.getElementById("dialog-actions").innerHTML = "";
  modal.classList.add("active");
}

// 9. 同格互动判定（对该格所有其他玩家同时生效）
function handleSameTileCheck(player, callback) {
  const othersInTile = players.filter(p => p.id !== player.id && p.position === player.position && p.position < 70);
  
  if (othersInTile.length > 0) {
    const otherNames = othersInTile.map(p => p.name).join("、");
    // 随机 50% 祝福，50% 劝勉督责
    const isBlessing = Math.random() > 0.5;

    if (isBlessing) {
      othersInTile.forEach(p => p.faith += 8);
      player.faith += 8;
      showDialog(
        "同路团契：彼此祝福",
        `在此与同行者（${otherNames}）相遇，同心合意！\n同格所有玩家信心值均 +8 点！`,
        [{ label: "感谢主", onClick: () => { closeDialog(); callback(); } }]
      );
    } else {
      othersInTile.forEach(p => {
        p.faith -= 10;
        applyStepOffset(p, -1);
        checkFaithStatus(p);
      });
      showDialog(
        "外邦相争：互相较量",
        `狭路相逢，步伐产生磨擦。\n除当前玩家外，同格其他玩家（${otherNames}）信心值 -10 点并后退 1 格！`,
        [{ label: "引以为戒", onClick: () => { closeDialog(); callback(); } }]
      );
    }
    renderPieces();
    updateUI();
  } else {
    callback();
  }
}

// 辅助位移计算
function applyStepOffset(player, offset) {
  player.position += offset;
  if (player.position < 1) player.position = 1;
  if (player.position > 70) player.position = 70;
  renderPieces();
}

// 信心破产判定 (<=0 触发禁食)
function checkFaithStatus(player) {
  if (player.faith <= 0) {
    player.faith = 0;
    player.isFasting = true;
    log(`【提醒】${player.name} 信心耗尽，下一轮将进入「禁食祷告」！`);
  }
}

// 10. 轮次交替与终局结束判定
function nextTurn() {
  isAnimating = false;
  document.getElementById("roll-btn").disabled = false;

  activePlayerIndex++;
  
  // 当前轮所有人都走过一遍，进入下一轮
  if (activePlayerIndex >= players.length) {
    activePlayerIndex = 0;
    
    // 如果首位玩家已经到达终点，且这一轮全部玩家都走完了 -> 终局结算
    if (isFirstPlayerFinished) {
      finishGameAndShowLeaderboard();
      return;
    }

    currentRound++;
    log(`--- 第 ${currentRound} 轮开始 ---`);
  }

  updateUI();
}

// 11. 终局结算面板
function finishGameAndShowLeaderboard() {
  document.getElementById("roll-btn").disabled = true;
  // 按照最终持有的信心值总分排序
  const sorted = [...players].sort((a, b) => b.faith - a.faith);

  const container = document.getElementById("leaderboard-list");
  container.innerHTML = "";

  sorted.forEach((p, rank) => {
    const item = document.createElement("div");
    item.className = "leader-item";
    item.innerHTML = `
      <span>第 ${rank + 1} 名：<strong style="color:${p.color}">${p.name}</strong> ${p.position >= 70 ? '（抵达成圣之城）' : `（驻足第${p.position}格）`}</span>
      <span>最终信心分：<strong>${p.faith}</strong> 点</span>
    `;
    container.appendChild(item);
  });

  document.getElementById("leaderboard-modal").classList.add("active");
}

// 通用 UI 更新与日志输出
function updateUI() {
  document.getElementById("current-round").textContent = currentRound;
  if (players.length > 0) {
    const curP = players[activePlayerIndex];
    const nameEl = document.getElementById("active-player-name");
    nameEl.textContent = curP.name;
    nameEl.style.color = curP.color;
  }

  // 名册
  const roster = document.getElementById("player-roster");
  roster.innerHTML = "";
  players.forEach((p, idx) => {
    const card = document.createElement("div");
    card.className = `roster-card ${idx === activePlayerIndex ? 'active-turn' : ''}`;
    card.innerHTML = `
      <div>
        <span class="roster-color-dot" style="background:${p.color}"></span>
        <strong>${p.name}</strong>
      </div>
      <div>
        格: ${p.position}/70 | 信心: <strong>${p.faith}</strong>
        ${p.isFasting ? '<span class="status-fasting">[禁食中]</span>' : ''}
      </div>
    `;
    roster.appendChild(card);
  });
}

function showDialog(title, text, actions = []) {
  const modal = document.getElementById("dialog-modal");
  document.getElementById("dialog-badge").textContent = "天路事件";
  document.getElementById("dialog-title").textContent = title;
  document.getElementById("dialog-content").innerText = text;

  const actionsContainer = document.getElementById("dialog-actions");
  actionsContainer.innerHTML = "";
  actions.forEach(act => {
    const btn = document.createElement("button");
    btn.className = "btn-primary";
    btn.textContent = act.label;
    btn.onclick = act.onClick;
    actionsContainer.appendChild(btn);
  });

  modal.classList.add("active");
}

function closeDialog() {
  document.getElementById("dialog-modal").classList.remove("active");
}

function log(msg) {
  const logsEl = document.getElementById("game-logs");
  const p = document.createElement("div");
  p.textContent = `• ${msg}`;
  logsEl.appendChild(p);
  logsEl.scrollTop = logsEl.scrollHeight;
}
