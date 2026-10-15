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
  //  画面の更新（入力のたびに呼ばれる）
  // ---------------------------------------------------------------
  function update() {
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

  update();
})();
