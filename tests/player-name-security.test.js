// Run with: node --test tests/player-name-security.test.js (no dependencies).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

// Capture output from the real renderers; timers and page initialization stay idle.
class Element {
  constructor() {
    this.style = {};
    this.classList = { add() {}, remove() {} };
    this.children = [];
    this.queries = new Map();
    this.textContent = "";
  }
  set innerHTML(value) { this.html = value; this.children = []; }
  get innerHTML() { return this.html || ""; }
  querySelector(selector) {
    if (!this.queries.has(selector)) this.queries.set(selector, new Element());
    return this.queries.get(selector);
  }
  querySelectorAll() { return []; }
  appendChild(child) { this.children.push(child); }
  addEventListener() {}
}

function loadGame(directory) {
  const elements = new Map();
  const document = {
    addEventListener() {},
    createElement: () => new Element(),
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, new Element());
      return elements.get(id);
    }
  };
  const context = vm.createContext({ document, window: { addEventListener() {} }, setTimeout() {}, console });
  vm.runInContext(readFileSync(join(__dirname, "..", directory, "game.js"), "utf8"), context);
  return { context, get: id => document.getElementById(id), run: code => vm.runInContext(code, context) };
}

const nickname = `"><img src=x onerror="globalThis.injected=1"><b>中文</b>&'`;
const escaped = "&quot;&gt;&lt;img src=x onerror=&quot;globalThis.injected=1&quot;&gt;&lt;b&gt;中文&lt;/b&gt;&amp;&#39;";
function assertEscaped(element) {
  assert.ok(element.innerHTML.includes(escaped), "nickname must be escaped at the HTML sink");
  assert.ok(!element.innerHTML.includes(nickname), "raw nickname must not enter HTML");
}

test("dafuweng keeps input values and toast content as literal text", () => {
  const { context, get, run } = loadGame("dafuweng");
  context.nickname = nickname;
  assert.equal(run("escapeHtml(nickname)"), escaped);
  run("gameState.lobby.slots[0].name = nickname; renderLobbyPlayerSlots();");
  const slot = get("lobby-player-slots").children[0];
  assert.equal(slot.querySelector(".player-name-input").value, nickname);
  assert.ok(!slot.innerHTML.includes(nickname));
  run('showEventPopup("🕊️", nickname, nickname);');
  const toast = get("center-toast-container").children[0];
  assert.equal(toast.querySelector(".toast-title").textContent, nickname);
  assert.equal(toast.querySelector(".toast-desc").textContent, nickname);
  assert.ok(!toast.innerHTML.includes(nickname));
});

test("dafuweng escapes names across HUD, ownership, quiz, picker and results", () => {
  const { context, get, run } = loadGame("dafuweng");
  context.nickname = nickname;
  run(`gameState.players = [{ index: 0, name: nickname, charId: "abraham", charName: "亚伯拉罕",
    avatar: "亚", skillName: "多国之父", skillDesc: "测试", color: "#ef4444", colorName: "R",
    wealth: 10000, faith: 70, position: 0, gifts: [], isAI: false, eliminated: false }];
    gameState.board = [{ index: 0, name: "伯利恒", type: "city", price: 1200,
      owner: 0, level: 1, believers: 120 }];
    renderAllPlayersHUD(); updateTopHudBar(); updateSingleTileDOM(0);
    runMorningChurchQuizPhase(gameState.players[0], gameState.board);
    openChurchTargetSelection("测试", gameState.board, () => {});
    showGameOverModal(gameState.players[0], "测试");`);
  for (const id of ["hud-player-0", "hud-current-player", "board-tile-0", "quiz-church-title", "gameover-rankings"]) {
    assertEscaped(get(id));
  }
  assertEscaped(get("picker-list").children[0]);
});

test("pilgrim-progress escapes names in roster and leaderboard", () => {
  const { context, get, run } = loadGame("pilgrim-progress");
  context.nickname = nickname;
  assert.equal(run("escapeHtml(nickname)"), escaped);
  run('players = [{ name: nickname, color: "#c92a2a", position: 70, faith: 50 }]; updateUI(); finishGameAndShowLeaderboard();');
  assertEscaped(get("player-roster").children[0]);
  assertEscaped(get("leaderboard-list").children[0]);
  assert.equal(get("active-player-name").textContent, nickname);
});
