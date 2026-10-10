// seventy-disciples/game.js

// 运行时状态
let gameState = {
  phase: 1, // 1: 主复活前七十人差派 (传天国近了); 2: 圣灵降临后使徒宣教 (传基督十字架与复活)
  turn: 1,
  resources: {
    converts: 0,
    faith: 100,
    truth: 20,
    goods: 50
  },
  playerPos: "capernaum",
  ap: 3,
  maxAp: 3,
  player: null,
  companion: null,
  churches: {}, // { capernaum: { level: 1, letterBuffRemaining: 0 } }
  researchedTechs: []
};

// 地图视口平移与缩放状态
let mapTransform = {
  scale: 1,
  panX: -350,
  panY: -200,
  isDragging: false,
  startX: 0,
  startY: 0
};

let selectedTemplateId = null;

// 初始化
window.addEventListener("DOMContentLoaded", () => {
  renderTemplateSelection();
  bindUIEvents();
  initMapPanAndZoom();
});

// 1. 渲染开局模板
function renderTemplateSelection() {
  const container = document.getElementById("template-select-grid");
  container.innerHTML = "";

  CHARACTER_TEMPLATES.forEach(t => {
    const card = document.createElement("div");
    card.className = "template-card";
    card.id = `tpl-${t.id}`;
    card.innerHTML = `
      <h4>${t.name}</h4>
      <p style="font-size:0.75rem;color:#665241;margin:2px 0 4px;">${t.desc}</p>
      <div style="font-size:0.7rem;color:#801d1d;font-weight:bold;">${t.perk}</div>
    `;
    card.onclick = () => {
      document.querySelectorAll(".template-card").forEach(c => c.classList.remove("selected"));
      card.classList.add("selected");
      selectedTemplateId = t.id;
      document.getElementById("btn-confirm-start").disabled = false;
    };
    container.appendChild(card);
  });
}

// 2. 绑定交互事件
function bindUIEvents() {
  document.getElementById("btn-confirm-start").onclick = startGame;
  document.getElementById("next-turn-btn").onclick = handleNextTurn;
  document.getElementById("open-tech-btn").onclick = () => {
    renderTechTree();
    document.getElementById("modal-tech").classList.add("active");
  };

  document.getElementById("act-preach").onclick = actionPreach;
  document.getElementById("act-heal").onclick = actionHeal;
  document.getElementById("act-build-church").onclick = actionBuildChurch;
  document.getElementById("act-send-letter").onclick = actionSendLetter;

  // 地图视口按键缩放
  document.getElementById("btn-zoom-in").onclick = () => zoomMap(0.15);
  document.getElementById("btn-zoom-out").onclick = () => zoomMap(-0.15);
  document.getElementById("btn-zoom-reset").onclick = resetMapTransform;
}

// 3. 地图手势平移与以鼠标为中心的滚轮缩放
function initMapPanAndZoom() {
  const viewport = document.getElementById("map-viewport");

  viewport.addEventListener("mousedown", (e) => {
    if (e.target.closest(".map-node") || e.target.closest(".map-ctrl-btn")) return;
    mapTransform.isDragging = true;
    mapTransform.startX = e.clientX - mapTransform.panX;
    mapTransform.startY = e.clientY - mapTransform.panY;
  });

  window.addEventListener("mousemove", (e) => {
    if (!mapTransform.isDragging) return;
    mapTransform.panX = e.clientX - mapTransform.startX;
    mapTransform.panY = e.clientY - mapTransform.startY;
    applyMapTransform();
  });

  window.addEventListener("mouseup", () => {
    mapTransform.isDragging = false;
  });

  viewport.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomStep = e.deltaY < 0 ? 0.12 : -0.12;
    zoomMapAt(zoomStep, mouseX, mouseY);
  }, { passive: false });

  applyMapTransform();
}

function zoomMapAt(delta, mouseX, mouseY) {
  const oldScale = mapTransform.scale;
  const newScale = Math.max(0.65, oldScale + delta);
  if (newScale === oldScale) return;

  mapTransform.panX = mouseX - (mouseX - mapTransform.panX) * (newScale / oldScale);
  mapTransform.panY = mouseY - (mouseY - mapTransform.panY) * (newScale / oldScale);
  mapTransform.scale = newScale;

  applyMapTransform();
}

function zoomMap(delta) {
  const viewport = document.getElementById("map-viewport");
  const rect = viewport.getBoundingClientRect();
  zoomMapAt(delta, rect.width / 2, rect.height / 2);
}

function applyMapTransform() {
  const container = document.getElementById("map-container");
  container.style.transform = `translate(${mapTransform.panX}px, ${mapTransform.panY}px) scale(${mapTransform.scale})`;
  container.style.setProperty("--map-scale", mapTransform.scale);

  if (mapTransform.scale < 1.15) {
    container.classList.add("lod-far");
    container.classList.remove("lod-near");
  } else {
    container.classList.remove("lod-far");
    container.classList.add("lod-near");
  }
}

function resetMapTransform() {
  mapTransform.scale = 1;
  mapTransform.panX = gameState.phase === 1 ? -420 : -250;
  mapTransform.panY = gameState.phase === 1 ? -220 : -100;
  applyMapTransform();
}

// 4. Canvas 手绘古代近东与地中海真实地形轮廓
function drawRealisticAncientMap() {
  const canvas = document.getElementById("map-canvas");
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = "#ecdcb6";
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#a8c0cf";
  ctx.strokeStyle = "#859ea8";
  ctx.lineWidth = 3;

  // 地中海主海盆
  ctx.beginPath();
  ctx.moveTo(150, 900);
  ctx.bezierCurveTo(350, 850, 750, 880, 990, 820);
  ctx.lineTo(980, 680);
  ctx.bezierCurveTo(995, 600, 1010, 520, 1020, 460);
  ctx.bezierCurveTo(1030, 410, 1010, 390, 970, 390);
  ctx.bezierCurveTo(890, 370, 840, 400, 770, 390);
  ctx.bezierCurveTo(740, 350, 720, 310, 750, 240);
  ctx.lineTo(680, 220);
  ctx.bezierCurveTo(620, 250, 600, 280, 630, 340);
  ctx.bezierCurveTo(610, 390, 560, 450, 580, 470);
  ctx.bezierCurveTo(530, 440, 480, 370, 450, 310);
  ctx.bezierCurveTo(380, 240, 300, 220, 260, 290);
  ctx.bezierCurveTo(320, 360, 380, 420, 370, 460);
  ctx.bezierCurveTo(310, 420, 260, 340, 220, 290);
  ctx.bezierCurveTo(150, 320, 100, 450, 150, 900);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 塞浦路斯
  ctx.beginPath();
  ctx.ellipse(945, 455, 38, 16, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 克里特
  ctx.beginPath();
  ctx.ellipse(680, 510, 60, 12, 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 西西里
  ctx.beginPath();
  ctx.ellipse(320, 460, 35, 22, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 加利利海
  ctx.fillStyle = "#8aa8b8";
  ctx.beginPath();
  ctx.ellipse(1055, 550, 14, 20, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 约旦河
  ctx.beginPath();
  ctx.strokeStyle = "#8aa8b8";
  ctx.lineWidth = 2.5;
  ctx.moveTo(1055, 570);
  ctx.bezierCurveTo(1052, 600, 1048, 630, 1050, 660);
  ctx.stroke();

  // 死海
  ctx.beginPath();
  ctx.ellipse(1050, 700, 11, 38, 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 文字注记
  ctx.font = "italic bold 17px Georgia, serif";
  ctx.fillStyle = "rgba(74, 98, 114, 0.65)";
  ctx.fillText("MARE NOSTRUM (地中海)", 530, 620);
  ctx.fillText("AEGAEUM (爱琴海)", 670, 360);
  ctx.fillText("PONTUS EUXINUS (黑海)", 840, 180);

  ctx.font = "bold 15px 'Songti SC', 'SimSun', serif";
  ctx.fillStyle = "rgba(109, 76, 50, 0.55)";
  ctx.fillText("【加利利】", 1000, 530);
  ctx.fillText("【犹太行省】", 965, 720);
  ctx.fillText("【小亚细亚】", 830, 290);
  ctx.fillText("【马其顿与希腊】", 520, 250);
  ctx.fillText("【义大利】", 250, 240);

  const grad = ctx.createRadialGradient(w/2, h/2, 400, w/2, h/2, 750);
  grad.addColorStop(0, "rgba(236, 220, 182, 0)");
  grad.addColorStop(1, "rgba(78, 52, 28, 0.35)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

// 5. 正式开局
function startGame() {
  gameState.player = CHARACTER_TEMPLATES.find(t => t.id === selectedTemplateId);
  const others = CHARACTER_TEMPLATES.filter(t => t.id !== selectedTemplateId);
  gameState.companion = others[Math.floor(Math.random() * others.length)];

  gameState.maxAp = gameState.player.stats.ap || 3;
  gameState.ap = gameState.maxAp;
  gameState.resources.faith = gameState.player.stats.faith;
  gameState.resources.truth = gameState.player.stats.truth;

  document.getElementById("modal-intro").classList.remove("active");

  drawRealisticAncientMap();
  renderCompanions();
  renderMap();
  updateUI();
  resetMapTransform();

  const startMsg = `奉差启程！你（${gameState.player.name}）与同行搭档（${gameState.companion.name}）两两出发，前往各城宣告天国临近。`;
  addLog(startMsg);

  showChronicleModal({
    badge: "使徒启程",
    title: "奉主圣名 · 两两出征",
    content: `你与搭档领受差遣，不带钱囊、口袋和鞋，第一站踏入加利利海畔的迦百农。去医治城里的病人，对他们说：‘神的国临近你们了！’`,
    changes: [
      { text: `初始行动力: ${gameState.ap}`, type: "positive" },
      { text: `初始信心: ${gameState.resources.faith}`, type: "neutral" }
    ]
  });
}

// 6. 渲染航线与节点
function renderMap() {
  const layer = document.getElementById("nodes-layer");
  layer.innerHTML = "";
  const tooltip = document.getElementById("node-tooltip");

  let svg = document.getElementById("routes-svg");
  if (!svg) {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.id = "routes-svg";
    svg.setAttribute("class", "route-svg");
    layer.appendChild(svg);
  }
  svg.innerHTML = "";

  const renderedLines = new Set();

  Object.values(MAP_NODES).forEach(node => {
    if (gameState.phase < node.phase) return;

    node.connections.forEach(targetId => {
      const target = MAP_NODES[targetId];
      if (!target || gameState.phase < target.phase) return;

      const lineKey = [node.id, target.id].sort().join("-");
      if (!renderedLines.has(lineKey)) {
        renderedLines.add(lineKey);
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", node.x);
        line.setAttribute("y1", node.y);
        line.setAttribute("x2", target.x);
        line.setAttribute("y2", target.y);
        line.setAttribute("class", node.isSea || target.isSea ? "route-line sea" : "route-line");
        svg.appendChild(line);
      }
    });

    const el = document.createElement("div");
    el.className = `map-node type-${node.type} ${node.id === gameState.playerPos ? 'active-player-pos' : ''} ${gameState.churches[node.id] ? 'has-church' : ''}`;
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;

    el.innerHTML = `
      <div class="node-pin">${gameState.churches[node.id] ? '✝' : (node.type === 'hub' ? '★' : '•')}</div>
      <div class="node-label">${node.name}</div>
    `;

    el.addEventListener("mouseenter", () => {
      const hasChurch = !!gameState.churches[node.id];
      const isCur = node.id === gameState.playerPos;
      tooltip.innerHTML = `
        <h4>${node.name} <span class="tooltip-tag">${node.type === 'hub' ? '战略大都' : (node.type === 'port' ? '通商海港' : '城镇村庄')}</span></h4>
        <div class="tooltip-desc">${node.desc}</div>
        <div class="tooltip-meta">
          <div>• 民情刚硬度: <strong>${node.hardiness}%</strong></div>
          <div>• 教会状态: <strong>${hasChurch ? '<span style="color:#2b8a3e">已建立家庭教会</span>' : '暂无教会'}</strong></div>
          <div>• 交通枢纽: <strong>${node.isSea ? '通航海路' : '罗马驿道'}</strong></div>
          ${isCur ? '<div><strong style="color:#c92a2a">当前驻足地点</strong></div>' : ''}
        </div>
      `;
      tooltip.style.display = "block";
    });

    el.addEventListener("mousemove", (e) => {
      tooltip.style.left = `${e.clientX + 14}px`;
      tooltip.style.top = `${e.clientY + 14}px`;
    });

    el.addEventListener("mouseleave", () => {
      tooltip.style.display = "none";
    });

    el.onclick = () => {
      tooltip.style.display = "none";
      handleNodeClick(node.id);
    };

    layer.appendChild(el);
  });
}

// 7. 节点移动
function handleNodeClick(targetId) {
  if (targetId === gameState.playerPos) return;

  const curNode = MAP_NODES[gameState.playerPos];
  if (!curNode.connections.includes(targetId)) {
    showChronicleModal({
      badge: "道路阻隔",
      title: "无法直接通达",
      content: `【${MAP_NODES[targetId].name}】与当前所在城市没有直达的陆上驿道或海运航线。请沿航线逐站前行。`,
      changes: []
    });
    return;
  }

  if (gameState.ap <= 0) {
    showChronicleModal({
      badge: "步履疲乏",
      title: "行动力已尽",
      content: `本回合行动力已用尽，请停步歇宿，点击右上角【下一回合】重新得力后再行出发。`,
      changes: []
    });
    return;
  }

  gameState.ap -= 1;
  gameState.playerPos = targetId;
  const targetNode = MAP_NODES[targetId];

  renderMap();
  updateUI();

  addLog(`队伍行军抵达：${targetNode.name}（消耗 1 行动力）。`);

  showChronicleModal({
    badge: "行军抵达",
    title: `踏足 ${targetNode.name}`,
    content: `你的队伍抵达了【${targetNode.name}】。\n${targetNode.desc}\n此地民情刚硬度约为 ${targetNode.hardiness}%。城中百姓渴慕真光。`,
    changes: [
      { text: `消耗行动力 -1`, type: "negative" },
      { text: `驻足于: ${targetNode.name}`, type: "neutral" }
    ]
  });
}

// 🌟 统一平滑胜率模型计算函数
// 规律：刚硬度0时胜率=100%；刚硬度>=50时基准=1/3；0~50之间越靠近0上升越快
// 信心增益：Faith/600（100信心由1/3升至1/2，200信心升至2/3）
function calculateSmoothSuccessRate(hardiness, faith) {
  let baseP = 0;
  if (hardiness >= 50) {
    baseP = 1.0 / 3.0; // 无论多硬恒定约 33.3%
  } else if (hardiness <= 0) {
    baseP = 1.0;       // 刚硬度为 0 必胜 100%
  } else {
    // 0 < H < 50：下凸非线性平滑过渡，越靠近 0 上升越陡峭
    const progressToZero = (50.0 - hardiness) / 50.0;
    baseP = (1.0 / 3.0) + (2.0 / 3.0) * Math.pow(progressToZero, 1.8);
  }

  // 信心动态增益：0信心+0，100信心+0.167，200信心+0.333
  const faithBonus = Math.max(0, faith) / 600.0;

  // 最终胜率上限钳位到 100%
  return Math.min(1.0, Math.max(0.05, baseP + faithBonus));
}

// 8.1 宣教互动：传道宣讲
function actionPreach() {
  if (gameState.ap <= 0) {
    return showChronicleModal({ badge: "疲乏", title: "无法行动", content: "行动力已耗尽，请进入下一回合。", changes: [] });
  }
  gameState.ap -= 1;

  const node = MAP_NODES[gameState.playerPos];
  const totalTruth = gameState.player.stats.truth + (gameState.companion ? gameState.companion.stats.truth : 0);

  // 采用全新平滑公式
  const successChance = calculateSmoothSuccessRate(node.hardiness, gameState.resources.faith);

  const roll = Math.random();

  if (roll < successChance) {
    const isCritical = Math.random() < 0.08; // 8% 暴击

    // 刚硬度削减基础值（上限 20%）
    const baseDrop = 1 + (totalTruth * 0.04) + (gameState.resources.faith * 0.01) + (node.hardiness * 0.03);
    let hardinessDrop = Math.max(1, Math.floor(baseDrop + (Math.random() * 2 - 1)));

    // 信徒阶梯（无上限封顶）
    let convertsGain = 0;
    const curC = gameState.resources.converts;
    const curF = gameState.resources.faith;

    if (curC < 15) {
      convertsGain = Math.floor(Math.random() * 3) + 2; // 2~4
    } else if (curC < 45) {
      convertsGain = Math.floor(Math.random() * 4) + 4 + Math.floor(0.02 * curF); // 4~7 + 0.02信心
    } else {
      convertsGain = Math.floor(Math.random() * 4) + 7 + Math.floor((0.08 * curC) + (0.05 * curF)); // 7~10 + 0.08信徒 + 0.05信心
    }

    if (isCritical) {
      hardinessDrop = Math.min(20, Math.floor(hardinessDrop * 2.0) + Math.floor(Math.random() * 3));
      convertsGain = Math.floor(convertsGain * 1.5) + 3;

      gameState.resources.truth += 4;
      node.hardiness = Math.max(0, node.hardiness - hardinessDrop);
      gameState.resources.converts += convertsGain;

      if (gameState.phase === 1) {
        showChronicleModal({
          badge: "天国好消息",
          title: `在 ${node.name} 宣告：神的国临近你们了！`,
          content: `你遵照主的教导宣告天国临近！圣灵大施感化，听者无不扎心，坚垒发生大塌陷！`,
          changes: [
            { text: `🔥 刚硬度重创 -${hardinessDrop}% (现为 ${node.hardiness}%)`, type: "positive" },
            { text: `门徒 +${convertsGain} (爆发增长)`, type: "positive" },
            { text: `真理 +4`, type: "positive" },
            { text: `行动力 -1`, type: "negative" }
          ]
        });
        addLog(`在 ${node.name} 宣告天国降临，全城扎心，刚硬度 -${hardinessDrop}%，新增 ${convertsGain} 门徒。`);
      } else {
        showChronicleModal({
          badge: "使徒见证",
          title: `在 ${node.name} 放胆见证基督复活！`,
          content: `你在会堂见证基督复活！真理大有能力，群聚归主之势无可阻挡！`,
          changes: [
            { text: `🔥 刚硬度重创 -${hardinessDrop}% (现为 ${node.hardiness}%)`, type: "positive" },
            { text: `门徒 +${convertsGain} (爆发增长)`, type: "positive" },
            { text: `真理 +4`, type: "positive" },
            { text: `行动力 -1`, type: "negative" }
          ]
        });
        addLog(`在 ${node.name} 见证基督复活，瓦解刚硬度 ${hardinessDrop}%，归信 ${convertsGain} 人。`);
      }
    } else {
      hardinessDrop = Math.min(20, hardinessDrop);
      gameState.resources.truth += 2;
      node.hardiness = Math.max(0, node.hardiness - hardinessDrop);
      gameState.resources.converts += convertsGain;

      if (gameState.phase === 1) {
        showChronicleModal({
          badge: "和平之子",
          title: `在 ${node.name} 寻访接纳天国的百姓`,
          content: `你们挨家挨户问安宣告和平，寻得敬虔的平安之子接待。民心坚石逐渐被真理融化。`,
          changes: [
            { text: `刚硬度 -${hardinessDrop}% (现为 ${node.hardiness}%)`, type: "positive" },
            { text: `门徒 +${convertsGain}`, type: "positive" },
            { text: `真理 +2`, type: "positive" },
            { text: `行动力 -1`, type: "negative" }
          ]
        });
        addLog(`在 ${node.name} 寻得平安之子，刚硬度 -${hardinessDrop}%，门徒 +${convertsGain}。`);
      } else {
        showChronicleModal({
          badge: "辩道剖析",
          title: `在 ${node.name} 会堂本着圣经辩论`,
          content: `你放胆引证圣经辩道，随着福音规模壮大，城中多人离弃偶像归向真神。`,
          changes: [
            { text: `刚硬度 -${hardinessDrop}% (现为 ${node.hardiness}%)`, type: "positive" },
            { text: `门徒 +${convertsGain}`, type: "positive" },
            { text: `真理 +2`, type: "positive" },
            { text: `行动力 -1`, type: "negative" }
          ]
        });
        addLog(`在 ${node.name} 会堂辩道，刚硬度 -${hardinessDrop}%，门徒 +${convertsGain}。`);
      }
    }
  } else {
    // 传道受阻扣当前 10% 信心
    const faithLost = Math.max(5, Math.floor(gameState.resources.faith * 0.10));
    gameState.resources.faith = Math.max(0, gameState.resources.faith - faithLost);

    showChronicleModal({
      badge: "遭遇抗拒",
      title: `在 ${node.name} 讲道受阻`,
      content: `此处民情顽梗（刚硬度达 ${node.hardiness}%），市集众人冷眼以对。队伍信心受到磨砺。`,
      changes: [
        { text: `信心受损 -10% (-${faithLost})`, type: "negative" },
        { text: `行动力 -1`, type: "negative" }
      ]
    });
    addLog(`在 ${node.name} 讲道遇冷，信心 -${faithLost}。`);

    // 🌟 核心修复：即时死亡判定
    checkEndGameConditions();
  }

  updateUI();
  renderMap();
}

// 8.2 宣教互动：按手祷告
function actionHeal() {
  if (gameState.ap <= 0) {
    return showChronicleModal({ badge: "疲乏", title: "无法行动", content: "行动力不足，请进入下一回合。", changes: [] });
  }
  if (gameState.resources.faith < 15) {
    return showChronicleModal({ badge: "灵里枯竭", title: "信心微小", content: "按手祷告需要至少 15 点圣灵信心。", changes: [] });
  }

  gameState.ap -= 1;
  gameState.resources.faith -= 15; // 预扣 15 信心

  const node = MAP_NODES[gameState.playerPos];

  // 采用全新平滑公式
  const healChance = calculateSmoothSuccessRate(node.hardiness, gameState.resources.faith);

  const roll = Math.random();

  if (roll < healChance) {
    const isMiracleGreat = Math.random() < 0.10; // 10% 暴击

    // 刚硬度削减基础值（上限 20%）
    const totalGrit = gameState.player.stats.grit + (gameState.companion ? gameState.companion.stats.grit : 0);
    const baseDrop = 1 + (gameState.resources.faith * 0.035) + (totalGrit * 0.02);
    let hardinessDrop = Math.max(1, Math.floor(baseDrop + (Math.random() * 2 - 1)));

    // 信徒新阶梯增长（彻底无上限）
    let convertsGain = 0;
    const curC = gameState.resources.converts;
    const curF = gameState.resources.faith;

    if (curC < 15) {
      convertsGain = Math.floor(Math.random() * 3) + 2;
    } else if (curC < 45) {
      convertsGain = Math.floor(Math.random() * 4) + 4 + Math.floor(0.02 * curF);
    } else {
      convertsGain = Math.floor(Math.random() * 4) + 7 + Math.floor((0.08 * curC) + (0.05 * curF));
    }

    // 成功反哺机制：返还预扣的 15 信心，并额外增加当前信心的 10%
    const extraFaith = Math.max(2, Math.floor((gameState.resources.faith + 15) * 0.10));
    gameState.resources.faith += 15 + extraFaith; // 全额返还 + 额外10%

    if (isMiracleGreat) {
      hardinessDrop = Math.min(20, Math.floor(hardinessDrop * 2.2) + Math.floor(Math.random() * 3));
      convertsGain = Math.floor(convertsGain * 1.5) + 4;

      node.hardiness = Math.max(0, node.hardiness - hardinessDrop);
      gameState.resources.converts += convertsGain;

      showChronicleModal({
        badge: "罕见奇迹",
        title: `在 ${node.name} 显明惊人神迹！`,
        content: `瘫子立时行走跳跃赞美神！预扣信心如数返还并大大得胜，全城轰动，归主之人如潮水涌入！`,
        changes: [
          { text: `✨ 15信心全返 + 额外+${extraFaith} (10%)`, type: "positive" },
          { text: `🔥 刚硬度重创 -${hardinessDrop}% (现为 ${node.hardiness}%)`, type: "positive" },
          { text: `门徒 +${convertsGain} (爆发增长)`, type: "positive" },
          { text: `行动力 -1`, type: "negative" }
        ]
      });
      addLog(`在 ${node.name} 见证罕见神迹！刚硬度 -${hardinessDrop}%，门徒 +${convertsGain}，信心反哺 +${extraFaith}。`);
    } else {
      hardinessDrop = Math.min(20, hardinessDrop);
      node.hardiness = Math.max(0, node.hardiness - hardinessDrop);
      gameState.resources.converts += convertsGain;

      showChronicleModal({
        badge: "按手医治",
        title: `在 ${node.name} 见证神迹医治`,
        content: `你奉主的名按手在病患身上，热病退去、恶疾痊愈。预扣信心全然收回，并蒙圣灵加添恩典！`,
        changes: [
          { text: `✨ 15信心全返 + 额外+${extraFaith} (10%)`, type: "positive" },
          { text: `刚硬度 -${hardinessDrop}% (现为 ${node.hardiness}%)`, type: "positive" },
          { text: `门徒 +${convertsGain}`, type: "positive" },
          { text: `行动力 -1`, type: "negative" }
        ]
      });
      addLog(`在 ${node.name} 医治病人，刚硬度 -${hardinessDrop}%，门徒 +${convertsGain}，信心增 +${extraFaith}。`);
    }
  } else {
    // 祷告失败扣除当前 12% 信心（预扣的15点不返还）
    const extraLoss = Math.max(6, Math.floor(gameState.resources.faith * 0.12));
    gameState.resources.faith = Math.max(0, gameState.resources.faith - extraLoss);

    showChronicleModal({
      badge: "灵里争战",
      title: `在 ${node.name} 经历信心的磨难`,
      content: `虽按手代求但未见果效，旁观者低语讥诮。预扣信心耗尽，灵里更受挫折冲击。`,
      changes: [
        { text: `损失预扣 15 信心`, type: "negative" },
        { text: `额外受挫 -12% (-${extraLoss})`, type: "negative" },
        { text: `行动力 -1`, type: "negative" }
      ]
    });
    addLog(`在 ${node.name} 祷告争战未果，损失 15 信心并追加 -${extraLoss}。`);

    // 🌟 核心修复：即时死亡判定
    checkEndGameConditions();
  }

  updateUI();
  renderMap();
}

// 8.3 宣教互动：建立教会
function actionBuildChurch() {
  if (gameState.phase < 2) {
    return showChronicleModal({
      badge: "时机未至",
      title: "阶段限制",
      content: "【阶段一 · 七十人两两游历时期】核心使命是寻访平安之子。五旬节圣灵大降临后方可正式建堂！",
      changes: []
    });
  }
  if (gameState.churches[gameState.playerPos]) {
    return showChronicleModal({ badge: "已建堂", title: "据点已存在", content: "此处已建立家庭教会并有信徒聚会，无需重复设立。", changes: [] });
  }
  if (gameState.resources.goods < 40) {
    return showChronicleModal({ badge: "物资短缺", title: "难以供给", content: "建立家庭教会需要筹备 40 点爱心物资。请积累后再建。", changes: [] });
  }

  const node = MAP_NODES[gameState.playerPos];
  gameState.resources.goods -= 40;
  gameState.churches[gameState.playerPos] = { level: 1, letterBuffRemaining: 0 };

  const rebound = Math.floor(Math.random() * 7) + 12;
  node.hardiness = Math.min(100, node.hardiness + rebound);

  renderMap();
  updateUI();

  showChronicleModal({
    badge: "建立教会",
    title: `在 ${node.name} 设立家庭教会`,
    content: `奉父、子、圣灵的名为门徒施洗，设立聚会据点！旧有势力大起警觉，刚硬度反弹上升。每座教会每回合需要 5 点物资维系周济。`,
    changes: [
      { text: `物资储备 -40`, type: "negative" },
      { text: `确立据点: ✝`, type: "positive" },
      { text: `⚠️ 旧势力反弹：刚硬度 +${rebound}% (现为 ${node.hardiness}%)`, type: "negative" }
    ]
  });
  addLog(`在 ${node.name} 设立家庭教会据点！旧势力反弹，刚硬度 +${rebound}%。`);
}

// 8.4 宣教互动：发送督责书信
function actionSendLetter() {
  if (!gameState.researchedTechs.includes("m_epistles")) {
    return showChronicleModal({
      badge: "缺乏体制",
      title: "尚未研发书信体制",
      content: "尚未在教会事工树中研发【羊皮卷信差体制】。唯有训练出忠心可托的信差，方能跨城递送信件。",
      changes: []
    });
  }
  if (gameState.resources.truth < 15) {
    return showChronicleModal({ badge: "真理不足", title: "无法成书", content: "撰写一份有真理分量与圣灵默示的劝勉书信，需要消耗 15 点真理经卷储备。", changes: [] });
  }

  gameState.resources.truth -= 15;
  Object.keys(gameState.churches).forEach(k => {
    gameState.churches[k].letterBuffRemaining = 3;
  });

  updateUI();

  showChronicleModal({
    badge: "使徒书信",
    title: "向各城教会寄发羊皮卷督责书信",
    content: `你磨墨展卷，针对纷争、世俗化与异端写下恳切书信，派遣信差送往各城！各地教会被信中的真理深深震动，重新合一！`,
    changes: [
      { text: `消耗真理 -15`, type: "negative" },
      { text: `所有教会获得 3 回合【异端与纷争免疫护盾】`, type: "positive" }
    ]
  });
  addLog(`寄发使徒督责书信，所有教会获得 3 回合稳固护盾。`);
}

// 9. 回合结算
function handleNextTurn() {
  gameState.turn += 1;
  gameState.ap = gameState.maxAp;

  const churchCount = Object.keys(gameState.churches).length;

  let convertsGrowth = churchCount * 2;
  let faithGrowth = 4 + (churchCount * 2);
  let truthGrowth = 3 + churchCount;

  // 物资新循环：严格等于 信徒/10 - 5 * 教会数（去除所有常数）
  const convertsContribution = Math.floor(gameState.resources.converts / 10);
  const goodsCost = churchCount * 5;
  const netGoodsGrowth = convertsContribution - goodsCost;

  gameState.resources.goods += netGoodsGrowth;
  if (gameState.resources.goods < 0) {
    gameState.resources.goods = 0;
    gameState.resources.faith = Math.max(0, gameState.resources.faith - 8);
    gameState.resources.converts = Math.max(0, gameState.resources.converts - 6);
    addLog(`【物资匮乏警告】教会周济断绝，信心与门徒流失！`);
  }

  gameState.resources.converts += convertsGrowth;
  gameState.resources.faith += faithGrowth;
  gameState.resources.truth += truthGrowth;

  // 刚硬度动态回升
  Object.values(MAP_NODES).forEach(node => {
    if (gameState.phase < node.phase) return;
    if (node.id === gameState.playerPos) return;

    const church = gameState.churches[node.id];
    if (church && church.letterBuffRemaining > 0) {
      church.letterBuffRemaining -= 1;
      return;
    }

    if (church) {
      node.hardiness = Math.min(85, node.hardiness + 1);
    } else {
      node.hardiness = Math.min(100, node.hardiness + 2);
    }
  });

  updateUI();
  renderMap();

  addLog(`--- 第 ${gameState.turn} 回合：日光升起，主恩长存 ---`);

  // 死亡判定
  if (checkEndGameConditions()) return;

  // 阶段 1 转 阶段 2 判定
  if (gameState.phase === 1 && gameState.turn >= 8) {
    triggerHistoricalTurningPoint();
    return;
  }

  // 阶段 2 危机
  if (gameState.phase === 2 && Math.random() < 0.45) {
    triggerRandomCrisis();
    return;
  }

  showChronicleModal({
    badge: `回合交替`,
    title: `第 ${gameState.turn} 回合启幕`,
    content: `新一周日光升起，信徒恒切擘饼祈祷。\n信徒捐献贡献物资 +${convertsContribution}，${churchCount} 座教会爱筵周济维持开销 -${goodsCost} 点物资。\n远离牧养之城，民情刚硬度略有回升。`,
    changes: [
      { text: `行动力充盈: ${gameState.maxAp}`, type: "positive" },
      { text: `净物资变动: ${netGoodsGrowth >= 0 ? '+' : ''}${netGoodsGrowth}`, type: netGoodsGrowth >= 0 ? "positive" : "negative" },
      { text: `未巡视城市刚硬度略微回升`, type: "neutral" }
    ]
  });
}

// 10. 历史转折大事件
function triggerHistoricalTurningPoint() {
  gameState.phase = 2;
  gameState.playerPos = "jerusalem";

  document.getElementById("phase-badge").textContent = "阶段二：使徒行传大宣教";
  renderMap();
  updateUI();
  resetMapTransform();

  addLog(`【重大见证】亲历主耶稣复活与五旬节圣灵沛降！全地中海宣教版图开启。`);

  showChronicleModal({
    badge: "历史转折点",
    title: "受难、复活与五旬节圣灵大降临",
    content: `七十人宣教行期已毕，你们奉召回到耶路撒冷。\n在此，你们亲身目睹了主为罪人被钉十字架，并在三日后破开坟墓战胜死亡荣耀复活！升天之时，主亲自颁布至高使命：\n“但圣灵降临在你们身上，你们就必得着能力；并要在耶路撒冷、犹太全地和撒玛利亚，直到地极，作我的见证！”\n五旬节如大风与舌头般烈火的圣灵沛然浇灌！海路与罗马帝国全境版图已为你全面展开！现在，放胆传讲复活的基督！`,
    changes: [
      { text: `开放罗马帝国大航路版图`, type: "positive" },
      { text: `传道内容升华为【基督复活与十字架】`, type: "positive" },
      { text: `正式解锁【建立教会】大战略`, type: "positive" },
      { text: `队伍回到圣城耶路撒冷`, type: "neutral" }
    ]
  });
}

// 11. 危机事件弹窗结算
function triggerRandomCrisis() {
  const crisis = CRISIS_EVENTS[Math.floor(Math.random() * CRISIS_EVENTS.length)];
  const isProtected = gameState.researchedTechs.includes(crisis.requiredTech);

  if (isProtected) {
    showChronicleModal({
      badge: "危机化解",
      title: crisis.title,
      content: `${crisis.desc}\n\n【圣灵引导下的智慧】：由于你的教会早已研发确立了对应的真理与治理体制，各地领袖站立得稳，${crisis.successMsg}`,
      changes: [
        { text: `✓ 成功免疫危机惩罚`, type: "positive" },
        { text: `教会威望更加坚固`, type: "positive" }
      ]
    });
    addLog(`成功化解危机：【${crisis.title}】。`);
  } else {
    const changesList = [];

    if (crisis.onFailure.faithLossPct) {
      const pct = Math.round(crisis.onFailure.faithLossPct * 100);
      const actualLoss = Math.max(5, Math.floor(gameState.resources.faith * crisis.onFailure.faithLossPct));
      gameState.resources.faith = Math.max(0, gameState.resources.faith - actualLoss);
      changesList.push({ text: `信心 -${pct}% (-${actualLoss})`, type: "negative" });
    }

    if (crisis.onFailure.convertsLossPct) {
      const pct = Math.round(crisis.onFailure.convertsLossPct * 100);
      const actualLoss = Math.max(2, Math.floor(gameState.resources.converts * crisis.onFailure.convertsLossPct));
      gameState.resources.converts = Math.max(0, gameState.resources.converts - actualLoss);
      changesList.push({ text: `信徒流失 -${pct}% (-${actualLoss})`, type: "negative" });
    }

    if (crisis.onFailure.goodsLossPct) {
      const pct = Math.round(crisis.onFailure.goodsLossPct * 100);
      const actualLoss = Math.max(5, Math.floor(gameState.resources.goods * crisis.onFailure.goodsLossPct));
      gameState.resources.goods = Math.max(0, gameState.resources.goods - actualLoss);
      changesList.push({ text: `物资损失 -${pct}% (-${actualLoss})`, type: "negative" });
    }

    if (crisis.onFailure.truthLossPct) {
      const pct = Math.round(crisis.onFailure.truthLossPct * 100);
      const actualLoss = Math.max(3, Math.floor(gameState.resources.truth * crisis.onFailure.truthLossPct));
      gameState.resources.truth = Math.max(0, gameState.resources.truth - actualLoss);
      changesList.push({ text: `真理受惑 -${pct}% (-${actualLoss})`, type: "negative" });
    }

    showChronicleModal({
      badge: "历经磨难",
      title: crisis.title,
      content: `${crisis.desc}\n\n【防线失守】：由于教会体制或神学根基尚未研发完备，这场巨浪给初生的门徒群体带来了沉重的打击与震荡！`,
      changes: changesList
    });
    addLog(`遭遇磨难：【${crisis.title}】，教会受损。`);

    // 即时死亡判定
    checkEndGameConditions();
  }

  updateUI();
}

// 12. 使徒纪事流水账（右下角日志面板）
function addLog(summaryText) {
  const stream = document.getElementById("log-stream");
  if (!stream) return;

  const item = document.createElement("div");
  item.className = "log-item";
  item.innerHTML = `<span class="log-turn">T${gameState.turn}</span>${summaryText}`;

  stream.appendChild(item);
  stream.scrollTop = stream.scrollHeight;
}

// 13. 通用中央使徒纪事弹窗
function showChronicleModal({ badge, title, content, changes }) {
  const modal = document.getElementById("modal-chronicle");
  document.getElementById("chronicle-badge").textContent = badge;
  document.getElementById("chronicle-title").textContent = title;
  document.getElementById("chronicle-content").innerHTML = content.replace(/\n/g, "<br>");

  const changeBox = document.getElementById("chronicle-changes");
  changeBox.innerHTML = "";
  if (changes && changes.length > 0) {
    changes.forEach(ch => {
      const span = document.createElement("span");
      span.className = `change-pill ${ch.type}`;
      span.textContent = ch.text;
      changeBox.appendChild(span);
    });
  }

  document.getElementById("chronicle-confirm-btn").onclick = () => {
    modal.classList.remove("active");
  };

  modal.classList.add("active");
}

// 14. 终局胜负检测（修复：返回布尔值并在任何信心归零时立即执行弹窗与重开）
function checkEndGameConditions() {
  if (gameState.resources.faith <= 0) {
    showChronicleModal({
      badge: "败局终章",
      title: "信心熄灭",
      content: "在漫长严酷的逼迫与试炼中，队伍的信心与热忱彻底耗尽，宣教的火种陷入了沉寂...",
      changes: [{ text: "点击确定重新启程", type: "negative" }]
    });
    document.getElementById("chronicle-confirm-btn").onclick = () => location.reload();
    return true;
  }

  if (gameState.churches["rome"]) {
    showChronicleModal({
      badge: "荣耀凯歌",
      title: "地极见证 · 罗马开花",
      content: "“保罗在自己所租的房子里住了足足两年。凡来见他的人，他全都接待，放胆传讲神国的道，将主耶稣基督的事教导人，并没有人禁止。”\n\n福音如今已牢牢扎根于罗马帝国的心脏，福音网络跨越地中海两岸！你已打过了那美好的仗，守住了所信的道！阿们！",
      changes: [{ text: "达成使徒行传宣教大胜利！", type: "positive" }]
    });
    document.getElementById("chronicle-confirm-btn").onclick = () => location.reload();
    return true;
  }
  return false;
}

// 15. 双科技树渲染
function renderTechTree() {
  const truthList = document.getElementById("truth-tree-list");
  const ministryList = document.getElementById("ministry-tree-list");
  truthList.innerHTML = "";
  ministryList.innerHTML = "";

  TRUTH_TECH_TREE.forEach(t => truthList.appendChild(createTechCard(t)));
  MINISTRY_TECH_TREE.forEach(t => ministryList.appendChild(createTechCard(t)));
}

function createTechCard(t) {
  const isResearched = gameState.researchedTechs.includes(t.id);
  const card = document.createElement("div");
  card.className = `tech-card ${isResearched ? 'researched' : ''}`;
  card.innerHTML = `
    <strong>${t.name}</strong> (需 ${t.cost} 真理)
    <p style="font-size:0.75rem;color:#554433;margin:2px 0;">${t.desc}</p>
    ${isResearched ? '<span style="color:#2b8a3e;font-weight:bold;">✓ 已领悟</span>' : `<button onclick="researchTech('${t.id}',${t.cost})">默想研发</button>`}
  `;
  return card;
}

window.researchTech = function(id, cost) {
  if (gameState.resources.truth < cost) {
    alert("真理经卷储备不足！");
    return;
  }
  gameState.resources.truth -= cost;
  gameState.researchedTechs.push(id);
  renderTechTree();
  updateUI();

  showChronicleModal({
    badge: "真理突破",
    title: `领悟体制/神学：【${id}】`,
    content: `在内室祈祷与圣经研读中豁然开朗，确立了这项属灵根基！对教会的巩固带来深远保护。`,
    changes: [{ text: `消耗真理: -${cost}`, type: "negative" }]
  });
  addLog(`研发成功：领悟【${id}】。`);
};

// 16. UI 与同伴刷新
function updateUI() {
  document.getElementById("turn-num").textContent = gameState.turn;
  document.getElementById("res-converts").textContent = gameState.resources.converts;
  document.getElementById("res-faith").textContent = gameState.resources.faith;
  document.getElementById("res-truth").textContent = gameState.resources.truth;
  document.getElementById("res-mercy-goods").textContent = gameState.resources.goods;
  document.getElementById("cur-ap").textContent = `${gameState.ap}/${gameState.maxAp}`;

  const curNode = MAP_NODES[gameState.playerPos];
  document.getElementById("cur-loc-name").textContent = curNode.name;
  document.getElementById("cur-loc-desc").textContent = curNode.desc;
  document.getElementById("cur-hardiness").textContent = `${curNode.hardiness}%`;
  document.getElementById("cur-church-status").textContent = gameState.churches[curNode.id] ? "已建立家庭教会" : "未建立";
}

function renderCompanions() {
  const container = document.getElementById("companion-list");
  container.innerHTML = "";

  [gameState.player, gameState.companion].forEach((p, idx) => {
    if (!p) return;
    const div = document.createElement("div");
    div.className = "companion-card";
    div.innerHTML = `
      <div class="companion-header">
        <span>${idx === 0 ? '👑 [主角]' : '🤝 [搭档]'} ${p.name}</span>
      </div>
      <div class="companion-perk">${p.perk}</div>
    `;
    container.appendChild(div);
  });
}