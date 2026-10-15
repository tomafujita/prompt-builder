// =====================================================================
//  app.js … 生成・スコア・コピーなどの処理
//  画面に出る文言はすべて templates.js にあります（ここには書かない）
// =====================================================================
"use strict";

(function () {
  // チェック項目（F3）のキー。並び順 = プロンプトに出る順
  const FIELD_KEYS = ["role", "purpose", "premise", "conditions", "format", "example"];
  const ALL_KEYS = ["task"].concat(FIELD_KEYS);

  const $ = (id) => document.getElementById(id);
  const inputs = {};
  ALL_KEYS.forEach((key) => { inputs[key] = $("f-" + key); });

  let currentTemplate = TEMPLATES[DEFAULT_TEMPLATE] ? DEFAULT_TEMPLATE : Object.keys(TEMPLATES)[0];

  // "{n}文字" の {n} を置き換える
  function format(message, n) {
    return message.replace("{n}", String(n));
  }

  // テンプレートの例文（条件のように配列なら改行でつなぐ）
  function exampleText(key) {
    const value = TEMPLATES[currentTemplate][key];
    if (Array.isArray(value)) return value.join("\n");
    return value == null ? "" : String(value);
  }

  // ---------------------------------------------------------------
  //  F2 用途テンプレート
  // ---------------------------------------------------------------
  function renderTemplateButtons() {
    const box = $("template-buttons");
    Object.keys(TEMPLATES).forEach((id) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn";
      btn.dataset.template = id;
      btn.textContent = TEMPLATES[id].name;
      btn.addEventListener("click", () => selectTemplate(id));
      box.appendChild(btn);
    });
  }

  function selectTemplate(id) {
    currentTemplate = id;
    document.querySelectorAll("[data-template]").forEach((btn) => {
      btn.setAttribute("aria-pressed", btn.dataset.template === id ? "true" : "false");
    });
    // 入力済みの値は消さず、placeholder（入力例）だけ切り替える
    ALL_KEYS.forEach((key) => { inputs[key].placeholder = exampleText(key); });
  }

  function hasAnyInput() {
    return ALL_KEYS.some((key) => inputs[key].value.trim() !== "");
  }

  function fillOne(key) {
    inputs[key].value = exampleText(key);
    update();
  }

  function fillAll() {
    if (hasAnyInput() && !window.confirm(MESSAGES.confirmFillAll)) return;
    ALL_KEYS.forEach((key) => { inputs[key].value = exampleText(key); });
    update();
  }

  // ---------------------------------------------------------------
  //  F3 チェック項目の固定表示（ヒントと配点）
  // ---------------------------------------------------------------
  function renderFieldInfo() {
    FIELD_KEYS.forEach((key) => {
      document.querySelector('[data-hint="' + key + '"]').textContent = HINTS[key] || "";
      document.querySelector('[data-points="' + key + '"]').textContent = format(MESSAGES.points, POINTS[key] || 0);
    });
  }

  // ---------------------------------------------------------------
  //  F4 プロンプトの組み立て
  // ---------------------------------------------------------------
  // 役割：末尾の「です」「です。」「。」を取る
  function cleanRole(text) {
    return text.replace(/(です。?|。)$/, "").trim();
  }

  // やりたいこと：末尾「てほしい」→「てください」、末尾に「。」がなければ付ける
  function cleanTask(text) {
    let t = text.replace(/てほしい$/, "てください");
    if (!t.endsWith("。")) t += "。";
    return t;
  }

  // 条件・制約：1行に1つ。先頭の「・」「-」「*」は「・」にそろえ、空行は無視
  function cleanConditions(text) {
    return text.split(/\r?\n/)
      .map((line) => line.trim().replace(/^[・\-*]\s*/, "").trim())
      .filter((line) => line !== "")
      .map((line) => PROMPT.bullet + line)
      .join("\n");
  }

  // 各項目のブロック（空欄なら ""）を返す
  function buildBlocks(values) {
    const blocks = {};
    const role = cleanRole(values.role);
    blocks.role = role ? PROMPT.rolePrefix + role + PROMPT.roleSuffix : "";
    blocks.task = values.task ? PROMPT.task + "\n" + cleanTask(values.task) : "";
    ["purpose", "premise", "format", "example"].forEach((key) => {
      blocks[key] = values[key] ? PROMPT[key] + "\n" + values[key] : "";
    });
    const conditions = cleanConditions(values.conditions);
    blocks.conditions = conditions ? PROMPT.conditions + "\n" + conditions : "";
    return blocks;
  }

  // ブロックを決まった順に並べ、空行1つでつなぐ
  function joinBlocks(blocks) {
    return ["role", "task", "purpose", "premise", "conditions", "format", "example"]
      .map((key) => blocks[key])
      .filter((block) => block !== "")
      .join("\n\n");
  }

  // 前後の空白を取り除いた入力値
  function readValues() {
    const values = {};
    ALL_KEYS.forEach((key) => { values[key] = inputs[key].value.trim(); });
    return values;
  }

  // 文字数（絵文字なども1文字として数える）
  function countChars(text) {
    return Array.from(text).length;
  }

  // ---------------------------------------------------------------
  //  F6 充実度スコア
  // ---------------------------------------------------------------
  // プロンプトに出る項目（＝入力がある項目）の配点を合計する
  function renderScore(blocks) {
    const empty = FIELD_KEYS.filter((key) => blocks[key] === "");
    const total = FIELD_KEYS
      .filter((key) => blocks[key] !== "")
      .reduce((sum, key) => sum + (POINTS[key] || 0), 0);
    const score = Math.min(100, total);

    const level = LEVELS.slice()
      .sort((a, b) => b.min - a.min)
      .find((l) => score >= l.min) || LEVELS[LEVELS.length - 1];

    $("score-value").textContent = String(score);
    $("score-label").textContent = level.label;
    $("score-fill").style.width = score + "%";
    $("score-bar").setAttribute("aria-valuenow", String(score));
    const box = $("score");
    box.classList.remove("level-low", "level-mid", "level-high");
    box.classList.add("level-" + level.level);

    // 未入力の項目のアドバイスを、配点が高い順に最大3つ
    const list = $("advice");
    list.textContent = "";
    const tips = empty
      .slice()
      .sort((a, b) => (POINTS[b] || 0) - (POINTS[a] || 0))
      .slice(0, 3)
      .map((key) => ADVICE[key])
      .filter(Boolean);
    if (tips.length === 0) tips.push(MESSAGES.allFilled);
    tips.forEach((tip) => {
      const li = document.createElement("li");
      li.textContent = tip;
      list.appendChild(li);
    });
  }

  // ---------------------------------------------------------------
  //  画面の更新（入力のたびに呼ばれる）
  // ---------------------------------------------------------------
  let currentPrompt = "";

  function update() {
    const values = readValues();
    const blocks = buildBlocks(values);

    // F7 Before / After
    $("before-text").textContent = inputs.task.value;
    $("count-before").textContent = format(MESSAGES.charCount, countChars(inputs.task.value));

    const after = $("after-text");
    if (values.task === "") {
      currentPrompt = "";
      after.textContent = MESSAGES.emptyAfter;
      after.classList.add("is-empty");
      $("count-after").textContent = "";
    } else {
      currentPrompt = joinBlocks(blocks);
      after.textContent = currentPrompt;
      after.classList.remove("is-empty");
      $("count-after").textContent = format(MESSAGES.charCount, countChars(currentPrompt));
    }

    // F6 スコア（F1は採点しない）
    renderScore(blocks);

    // F5 やりたいことが空欄ならコピーできない
    $("btn-copy").disabled = values.task === "";
  }

  // ---------------------------------------------------------------
  //  F5 コピー
  // ---------------------------------------------------------------
  // clipboard API が使えない環境用：textarea を使ってコピーする
  function fallbackCopy(text) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "0";
    area.style.left = "0";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, text.length);
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch (e) {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }

  let statusTimer = null;
  function showStatus(message) {
    const status = $("copy-status");
    status.textContent = message;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => { status.textContent = ""; }, 2000);
  }

  function copyPrompt() {
    if (currentPrompt === "") return;
    const text = currentPrompt;
    const done = (ok) => showStatus(ok ? MESSAGES.copied : MESSAGES.copyFailed);
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(
        () => done(true),
        () => done(fallbackCopy(text))
      );
    } else {
      done(fallbackCopy(text));
    }
  }

  // ---------------------------------------------------------------
  //  リセット
  // ---------------------------------------------------------------
  function resetAll() {
    if (!window.confirm(MESSAGES.confirmReset)) return;
    ALL_KEYS.forEach((key) => { inputs[key].value = ""; });
    update();
    inputs.task.focus();
  }

  // ---------------------------------------------------------------
  //  起動
  // ---------------------------------------------------------------
  renderTemplateButtons();
  renderFieldInfo();
  selectTemplate(currentTemplate);

  ALL_KEYS.forEach((key) => { inputs[key].addEventListener("input", update); });
  document.querySelectorAll("[data-fill]").forEach((btn) => {
    btn.addEventListener("click", () => fillOne(btn.dataset.fill));
  });
  $("btn-fill-all").addEventListener("click", fillAll);
  $("btn-copy").addEventListener("click", copyPrompt);
  $("btn-reset").addEventListener("click", resetAll);

  update();
})();
