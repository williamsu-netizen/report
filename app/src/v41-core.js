(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.V41Core = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function hashText(value) {
    let h = 2166136261;
    const text = String(value || "");
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function getRowIndexId(row, makeKey) {
    return `rk_${hashText(makeKey(row))}`;
  }

  function chunkForBatch(items, size) {
    const source = items || [];
    const safeSize = Math.max(1, Number(size || 400));
    const out = [];
    for (let i = 0; i < source.length; i += safeSize) out.push(source.slice(i, i + safeSize));
    return out;
  }

  function isoWeekKey(date) {
    const value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = value.getDay() || 7;
    value.setDate(value.getDate() + 4 - day);
    const yearStart = new Date(value.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((value - yearStart) / 86400000) + 1) / 7);
    return `${value.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
  }

  function weekKeyToMonday(key) {
    const match = String(key || "").match(/^(\d{4})-W(\d{2})$/);
    if (!match) return null;
    const year = Number(match[1]), week = Number(match[2]);
    const jan4 = new Date(year, 0, 4);
    const firstMonday = new Date(year, 0, 4 - (jan4.getDay() || 7) + 1);
    firstMonday.setDate(firstMonday.getDate() + (week - 1) * 7);
    return firstMonday;
  }

  function findMissingWeekKeys(weekKeys) {
    const sorted = Array.from(new Set(weekKeys || [])).filter(Boolean).sort();
    if (sorted.length < 2) return [];
    const cursor = weekKeyToMonday(sorted[0]), end = weekKeyToMonday(sorted[sorted.length - 1]);
    if (!cursor || !end) return [];
    const existing = new Set(sorted), missing = [];
    while (cursor <= end) {
      const key = isoWeekKey(cursor);
      if (!existing.has(key)) missing.push(key);
      cursor.setDate(cursor.getDate() + 7);
    }
    return missing;
  }

  function weightedSurveySummary(agents) {
    let calls = 0, answered = 0, verySatisfied = 0, veryUnsatisfied = 0;
    (agents || []).forEach(function (agent) {
      calls += Number(agent.totalCalls || 0);
      answered += Number(agent.q1Answered || 0) + Number(agent.q2Answered || 0);
      verySatisfied += Number(agent.q1VerySatisfied || 0) + Number(agent.q2VerySatisfied || 0);
      veryUnsatisfied += Number(agent.q1VeryUnsatisfied || 0) + Number(agent.q2VeryUnsatisfied || 0);
    });
    return {
      teamTotalCalls: calls,
      surveySampleSize: answered,
      weightedVerySatAvg: answered ? verySatisfied / answered * 100 : 0,
      weightedVeryUnsatAvg: answered ? veryUnsatisfied / answered * 100 : 0,
      weightedSurAvg: calls ? answered / (calls * 2) * 100 : 0,
    };
  }

  function callKey(row, index) {
    const id = String((row && row.id) || "").trim();
    if (id) return `id:${id}`;
    return `fallback:${String(row.date || "")}｜${String(row.time || "")}｜${String(row.line || "")}｜${index}`;
  }

  function consolidateCalls(rows) {
    const calls = new Map();
    (rows || []).forEach(function (row, index) {
      const key = callKey(row || {}, index);
      const current = calls.get(key);
      if (!current) {
        calls.set(key, { ...row, callKey: key });
        return;
      }
      const currentHasAgent = !!String(current.agent || "").trim();
      const rowHasAgent = !!String(row.agent || "").trim();
      calls.set(key, {
        ...current,
        ...(rowHasAgent && !currentHasAgent ? row : {}),
        agent: currentHasAgent ? current.agent : (row.agent || ""),
        speakDuration: Math.max(Number(current.speakDuration || 0), Number(row.speakDuration || 0)),
        handleDuration: Math.max(Number(current.handleDuration || 0), Number(row.handleDuration || 0)),
        callKey: key,
      });
    });
    return Array.from(calls.values()).map(function (call) {
      return { ...call, callOutcome: String(call.agent || "").trim() ? "answered" : "missed" };
    });
  }

  function summarizeMissedCalls(rows) {
    const calls = consolidateCalls(rows);
    const answered = calls.filter(function (call) { return call.callOutcome === "answered"; });
    const missed = calls.filter(function (call) { return call.callOutcome === "missed"; });
    const group = function (getter) {
      const map = new Map();
      calls.forEach(function (call) {
        const key = String(getter(call) || "未分類");
        const value = map.get(key) || { key: key, offered: 0, answered: 0, missed: 0 };
        value.offered += 1;
        value[call.callOutcome] += 1;
        map.set(key, value);
      });
      return Array.from(map.values()).map(function (item) {
        return { ...item, missedRate: item.offered ? item.missed / item.offered * 100 : 0 };
      });
    };
    return {
      calls: calls,
      offered: calls.length,
      answered: answered.length,
      missed: missed.length,
      missedRate: calls.length ? missed.length / calls.length * 100 : 0,
      byWeek: group(function (call) { return call.weekKey; }).sort(function (a, b) { return a.key.localeCompare(b.key); }),
      byLine: group(function (call) { return call.line; }).sort(function (a, b) { return b.missedRate - a.missedRate || b.missed - a.missed; }),
      byHour: group(function (call) { return String(call.time || "").slice(0, 2) || "未分類"; }).sort(function (a, b) { return a.key.localeCompare(b.key); }),
    };
  }

  // 首頁風險判定規則：判定邏輯與畫面上的規則表都讀這一份，避免兩邊不一致。
  // direction：up = 數值越高越危險；down = 數值越低越危險。
  // op：畫面上門檻文字的前綴（例如「增加 ≥ 10%」）。labels 由 watch／medium／high 自動產生，改門檻後文字會跟著變。
  const DEFAULT_RISK_RULES = [
    { key: "volume", category: "來電爆量", direction: "up", op: "增加 ≥", watch: 10, medium: 25, high: 50, unit: "%", basis: "本期有效進線 vs 比較期間；比較期間須整段都有資料，否則不判定" },
    { key: "missed", category: "漏接率", direction: "up", strict: true, op: "超過", watch: 5, medium: null, high: 10, unit: "%", basis: "漏接通數 ÷ 有效進線；等於門檻不算（與目標值「≤ 目標即達標」一致）" },
    { key: "satisfactionDrop", category: "滿意度下降", direction: "up", op: "下降 ≥", watch: 3, medium: 5, high: 10, unit: "個百分點", basis: "Q1 人員、Q2 問題分開判定；非常滿意度：比較期間 − 本期（兩期都要有有效回答）" },
    { key: "lowSurveyRate", category: "調查率偏低", direction: "down", op: "低於", watch: 30, medium: 20, high: 10, unit: "%", basis: "Q1、Q2 分開判定；該題有效回答數 ÷ 已接聽（漏接的電話收不到問卷）" },
    { key: "veryUnsatisfied", category: "非常不滿意", direction: "up", op: "達", watch: 5, medium: 8, high: 15, unit: "%", basis: "Q1、Q2 分開判定；該題非常不滿意 ÷ 該題有效回答數" },
    { key: "incident", category: "人工重大事件", direction: "flag", labels: ["—", "—", "事件一經標記即觸發"], basis: "事件日期位於選取期間；未填日期者不列入，改列資料完整性提醒" },
  ];
  // 樣本數下限：低於下限時不判定，改列「樣本不足」提醒，避免 3 通漏接 1 通就變成 33% 高風險。
  const DEFAULT_SAMPLE_RULES = { minCalls: 30, minAnswers: 30 };

  function ruleLabels(rule) {
    if (rule.direction === "flag") return rule.labels;
    return [rule.watch, rule.medium, rule.high].map(function (v) { return v == null || v === "" ? "—" : `${rule.op} ${v}${rule.unit === "%" ? "%" : ` ${rule.unit}`}`; });
  }

  // 把使用者在畫面上調整的門檻（{ volume: { watch, medium, high }, ... }）套到預設規則上；不合理的值（非數字）忽略。
  function buildRiskRules(overrides) {
    const o = overrides || {};
    return DEFAULT_RISK_RULES.map(function (rule) {
      if (rule.direction === "flag") return { ...rule };
      const merged = { ...rule };
      ["watch", "medium", "high"].forEach(function (level) {
        const v = o[rule.key] ? o[rule.key][level] : undefined;
        if (v === null || v === "") { if (level === "medium") merged.medium = null; return; }
        if (v !== undefined && Number.isFinite(Number(v))) merged[level] = Number(v);
      });
      return { ...merged, labels: ruleLabels(merged) };
    });
  }

  // 檢查門檻順序是否合理（越嚴重的門檻要越極端），回傳錯誤訊息清單；空清單代表可以儲存。
  function validateRiskRules(rules) {
    const errors = [];
    rules.forEach(function (rule) {
      if (rule.direction === "flag") return;
      const seq = [rule.watch, rule.medium, rule.high].filter(function (v) { return v != null; });
      if (seq.some(function (v) { return !Number.isFinite(v) || v < 0; })) { errors.push(`${rule.category}：門檻必須是 0 以上的數字`); return; }
      for (let i = 1; i < seq.length; i++) {
        const ok = rule.direction === "down" ? seq[i] < seq[i - 1] : seq[i] > seq[i - 1];
        if (!ok) { errors.push(`${rule.category}：${rule.direction === "down" ? "越嚴重的門檻要越低" : "越嚴重的門檻要越高"}（注意 → 中風險 → 高風險）`); return; }
      }
    });
    return errors;
  }

  const RISK_RULES = buildRiskRules();

  function ruleLevel(rule, value) {
    if (!Number.isFinite(value)) return "normal";
    if (rule.direction === "down") {
      if (value < rule.high) return "high";
      if (rule.medium != null && value < rule.medium) return "medium";
      return value < rule.watch ? "watch" : "normal";
    }
    // strict：「超過」才算（例如漏接率），否則「達到」就算。
    const reach = function (threshold) { return rule.strict ? value > threshold : value >= threshold; };
    if (reach(rule.high)) return "high";
    if (rule.medium != null && reach(rule.medium)) return "medium";
    return reach(rule.watch) ? "watch" : "normal";
  }

  function num(value) {
    return value == null || value === "" ? NaN : Number(value);
  }

  function classifyOperationalRisk(input) {
    const data = input || {};
    // rules：畫面上調整過的門檻（buildRiskRules 的結果）；沒傳就用預設。
    const activeRules = Array.isArray(data.rules) && data.rules.length ? data.rules : RISK_RULES;
    const getRule = function (key) { return activeRules.find(function (rule) { return rule.key === key; }); };
    const thresholdText = function (key) { const r = getRule(key); return ["注意", "中風險", "高風險"].map(function (name, i) { return `${name} ${r.labels[i]}`; }).filter(function (t) { return !/—$/.test(t); }).join("、"); };
    // 樣本數下限：只有呼叫端有傳才啟用（舊的呼叫方式行為不變）。
    const minCalls = Number(data.minCalls || 0), minAnswers = Number(data.minAnswers || 0);
    const skipped = [];
    const volumeChangePct = num(data.volumeChangePct);
    const missedRate = num(data.missedRate);
    const incidentCount = Number(data.incidentCount || 0);
    const undatedIncidentCount = Number(data.undatedIncidentCount || 0);
    const currentCalls = Number(data.currentCalls || 0);
    const previousCalls = Number(data.previousCalls || 0);
    const satisfactionRate = num(data.satisfactionRate);
    const previousSatisfactionRate = num(data.previousSatisfactionRate);
    const surveySample = Number(data.surveySample || 0);
    const previousSurveySample = Number(data.previousSurveySample || 0);
    const surveyRate = num(data.surveyRate);
    const veryUnsatisfiedRate = num(data.veryUnsatisfiedRate);
    const compareLabel = data.compareLabel || "前期";
    const items = [];
    // itemKey 用來區分同一條規則套在不同題目上（例如 Q1、Q2 各自的滿意度下降）。
    const push = function (key, value, title, detail, itemKey, prefix) {
      const level = ruleLevel(getRule(key), value);
      if (level !== "normal") items.push({ key: itemKey || key, level, category: `${getRule(key).category}${prefix ? `（${prefix}）` : ""}`, title, detail });
    };
    // volumeComparable = false：比較期間只有部分資料，天數不同，不判定爆量。
    const enoughCalls = currentCalls >= minCalls;
    if (!enoughCalls && currentCalls > 0) skipped.push(`有效進線 ${currentCalls} 通，少於樣本下限 ${minCalls} 通：來電爆量、漏接率、調查率不判定`);
    if (previousCalls > 0 && data.volumeComparable !== false && enoughCalls && previousCalls >= minCalls) {
      push("volume", volumeChangePct, `來電量較${compareLabel}增加 ${volumeChangePct.toFixed(1)}%`, `本期 ${currentCalls} 通／${compareLabel} ${previousCalls} 通；門檻為${thresholdText("volume")}。`);
    }
    if (enoughCalls) push("missed", missedRate, `漏接率 ${missedRate.toFixed(1)}%`, `門檻為${thresholdText("missed")}。`);
    // 問卷：有傳 surveys（每題一筆）時逐題判定；否則沿用整體數字。
    const surveys = Array.isArray(data.surveys) && data.surveys.length ? data.surveys : [{
      key: "", label: "", rate: satisfactionRate, previousRate: previousSatisfactionRate, sample: surveySample, previousSample: previousSurveySample, surveyRate, veryUnsatisfiedRate,
    }];
    surveys.forEach(function (survey) {
      const label = survey.label || "";
      const lead = label ? `${label} ` : "";
      const suffix = survey.key ? `-${survey.key}` : "";
      const rate = num(survey.rate), previousRate = num(survey.previousRate);
      const sample = Number(survey.sample || 0), previousSample = Number(survey.previousSample || 0);
      const qSurveyRate = num(survey.surveyRate), qVeryUnsat = num(survey.veryUnsatisfiedRate);
      if (currentCalls > 0 && enoughCalls) {
        push("lowSurveyRate", qSurveyRate, `${lead}調查率偏低：${qSurveyRate.toFixed(1)}%`, `調查率過低時，滿意度結果可能不具代表性。門檻為${thresholdText("lowSurveyRate")}。`, `lowSurveyRate${suffix}`, label);
      }
      if (sample > 0 && sample < minAnswers) {
        skipped.push(`${lead}有效回答 ${sample} 筆，少於樣本下限 ${minAnswers} 筆：滿意度下降、非常不滿意不判定`);
        return;
      }
      if (sample > 0 && previousSample > 0 && previousSample >= minAnswers) {
        const drop = previousRate - rate;
        push("satisfactionDrop", drop, `${lead}非常滿意度較${compareLabel}下降 ${drop.toFixed(1)} 個百分點`, `本期 ${rate.toFixed(1)}%（n=${sample}）／${compareLabel} ${previousRate.toFixed(1)}%（n=${previousSample}）。`, `satisfactionDrop${suffix}`, label);
      }
      if (sample > 0) {
        push("veryUnsatisfied", qVeryUnsat, `${lead}非常不滿意比例 ${qVeryUnsat.toFixed(1)}%`, `有效回答 n=${sample}；建議搭配明細與事件註記確認原因。`, `veryUnsatisfied${suffix}`, label);
      }
    });
    if (incidentCount > 0) {
      items.push({
        key: "incident",
        level: "high",
        category: "人工重大事件",
        title: `${incidentCount} 件重大事件留言`,
        detail: "人工標記為重大事件時直接列為高風險。",
      });
    }
    if (undatedIncidentCount > 0) {
      items.push({
        key: "undated-incident",
        level: "watch",
        category: "資料完整性",
        title: `${undatedIncidentCount} 件重大事件未填日期`,
        detail: "未填日期的事件無法判斷屬於哪個期間，因此不列入高風險判定；請到事件註記補上日期。",
      });
    }
    const rank = { normal: 0, watch: 1, medium: 2, high: 3 };
    items.sort(function (a, b) { return rank[b.level] - rank[a.level]; });
    return { level: items.length ? items[0].level : "normal", items, skipped };
  }

  function shiftDateKey(key, days) {
    const date = new Date(`${key}T12:00:00`);
    date.setDate(date.getDate() + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  // 同一個月日往前推 years 年；2/29 遇到平年改為 2/28。
  function shiftYearKey(key, years) {
    const [y, m, d] = String(key).split("-").map(Number);
    const year = y + years;
    const lastDay = new Date(year, m, 0).getDate();
    return `${year}-${String(m).padStart(2, "0")}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
  }

  // 同一個日往前推 months 個月；遇到月底不夠天時改為該月最後一天（例如 3/31 往前一個月＝2/28）。
  function shiftMonthKey(key, months) {
    const [y, m, d] = String(key).split("-").map(Number);
    const total = y * 12 + (m - 1) + months;
    const year = Math.floor(total / 12), month = total % 12 + 1;
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
  }
  // 某個日期所在月份的第一天與最後一天。
  function monthBounds(key) {
    const [y, m] = String(key).split("-").map(Number);
    return { start: `${y}-${String(m).padStart(2, "0")}-01`, end: `${y}-${String(m).padStart(2, "0")}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}` };
  }

  // 比較期間：
  // - 當日／昨日：上週同一天，避免週一和週日直接相比。
  // - 本月（1 號到所選日期）：上月同期（上個月 1 號到同一天）。
  // - 上個月（整個月）：再前一個整月。
  // - 本年度：去年同期（去年 1/1 到去年同月同日），季節才對得上。
  // - 去年度：前一整年。
  // - 其他（近 7 日、近 30 日、近三個年度）：緊鄰的同長度前期。
  function comparisonRange(start, end, rangeMode) {
    if (rangeMode === "day" || rangeMode === "yesterday") {
      return { start: shiftDateKey(start, -7), end: shiftDateKey(end, -7), label: "上週同日" };
    }
    if (rangeMode === "month") {
      return { start: shiftMonthKey(start, -1), end: shiftMonthKey(end, -1), label: "上月同期" };
    }
    if (rangeMode === "lastMonth") {
      const prev = monthBounds(shiftMonthKey(start, -1));
      return { start: prev.start, end: prev.end, label: "前一個月" };
    }
    if (rangeMode === "ytd") {
      return { start: shiftYearKey(start, -1), end: shiftYearKey(end, -1), label: "去年同期" };
    }
    if (rangeMode === "lastYear") {
      return { start: shiftYearKey(start, -1), end: shiftYearKey(end, -1), label: "前一年度" };
    }
    const days = Math.max(1, Math.round((new Date(`${end}T12:00:00`) - new Date(`${start}T12:00:00`)) / 86400000) + 1);
    const previousEnd = shiftDateKey(start, -1);
    return { start: shiftDateKey(previousEnd, -(days - 1)), end: previousEnd, label: "同長度前期" };
  }

  // 比較期間是否整段都有資料：比較期間開始日早於資料最早日期時，代表只有部分資料，
  // 來電量不能公平相比（天數不同），爆量規則不判定。
  function comparisonCoverage(compare, earliestDate) {
    if (!earliestDate || !compare) return { complete: true, dataStart: earliestDate || "" };
    return { complete: compare.start >= earliestDate, dataStart: earliestDate };
  }

  // 時長轉秒數：支援純秒數、hh:mm:ss、「2分 33秒」「1時 2分 3秒」「1小時」「12.5秒」。
  function parseDuration(value) {
    if (value == null || value === "") return 0;
    const text = String(value).trim();
    if (/^\d+(\.\d+)?$/.test(text)) return Math.round(Number(text));
    const hms = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?$/);
    if (hms) return Math.round(Number(hms[1]) * 3600 + Number(hms[2]) * 60 + Number(hms[3] || 0));
    const zh = text.match(/^(?:(\d+(?:\.\d+)?)\s*(?:小時|時))?\s*(?:(\d+(?:\.\d+)?)\s*分(?:鐘)?)?\s*(?:(\d+(?:\.\d+)?)\s*秒)?$/);
    if (zh && (zh[1] || zh[2] || zh[3])) return Math.round(Number(zh[1] || 0) * 3600 + Number(zh[2] || 0) * 60 + Number(zh[3] || 0));
    return 0;
  }

  // 檔案是否有某個欄位（任一別名即可）。用來判斷「初始方向」欄位是否存在：
  // 有這一欄時只收「傳入」；整份檔案都沒有這一欄時，視為已篩好的傳入電話全部保留。
  function hasAnyColumn(rows, aliases, normalize) {
    const norm = normalize || function (s) { return String(s || "").trim(); };
    const wanted = new Set((aliases || []).map(norm));
    return (rows || []).slice(0, 20).some(function (row) {
      return Object.keys(row || {}).some(function (key) { return wanted.has(norm(key)); });
    });
  }

  // ── 專線電話號碼對照 ────────────────────────────────────────────────
  // 漏接的電話常常沒進到佇列，「第一佇列」會是空的或只有撥入號碼；用號碼末 8 碼對回專線名稱。
  const DEFAULT_LINE_PHONES = [
    { phone: "+886 2 2298 9739", line: "滿貫大亨" },
    { phone: "+886 2 2299 6858", line: "GT專線" },
    { phone: "+886 2 2298 0837", line: "金好運專線" },
    { phone: "+886 2 2299 1710", line: "儲值專線" },
  ];
  function phoneTail(value) {
    const digits = String(value == null ? "" : value).replace(/\D/g, "");
    return digits.length >= 8 ? digits.slice(-8) : "";
  }
  // value 是號碼（或含號碼的文字）時回傳對應專線名稱，否則回傳空字串。
  function lineFromPhone(value, table) {
    // Genesys 的 DNIS 欄位寫成「tel:+886222989739」，先去掉 tel:／sip: 這類前綴（大小寫皆可）。
    const text = String(value == null ? "" : value).trim().replace(/^(tel|sip|sips):/i, "");
    // 只有「看起來是電話號碼」的內容才比對，避免把一般文字裡剛好出現的數字誤認。
    if (!/^[\s+\-()\d]{8,}$/.test(text.trim())) return "";
    const tail = phoneTail(text);
    if (!tail) return "";
    const hit = (table || DEFAULT_LINE_PHONES).find(function (item) { return phoneTail(item.phone) === tail; });
    return hit ? hit.line : "";
  }
  // 在整列資料裡找電話號碼（第一佇列是空的時候用）；回傳第一個對得到的專線名稱。
  function lineFromRowPhones(rawRow, table) {
    const values = Object.keys(rawRow || {}).map(function (k) { return rawRow[k]; });
    for (let i = 0; i < values.length; i++) {
      const hit = lineFromPhone(values[i], table);
      if (hit) return hit;
    }
    return "";
  }

  // ── 日期工具 ────────────────────────────────────────────────────────
  function toDate(key) { return new Date(`${key}T12:00:00`); }
  function dateKeyOf(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
  // 星期一 = 0 … 星期日 = 6
  function weekdayIndex(key) { return (toDate(key).getDay() + 6) % 7; }
  const WEEKDAY_LABELS = ["週一", "週二", "週三", "週四", "週五", "週六", "週日"];
  function normDate(value) { return String(value || "").replace(/\//g, "-").split(" ")[0].replace(/^(\d{4})-(\d{1,2})-(\d{1,2})$/, function (_, y, m, d) { return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`; }); }
  function slotOf(time, slotMinutes) {
    const m = String(time || "").match(/^(\d{1,2}):(\d{2})/);
    if (!m) return -1;
    return Math.floor((Number(m[1]) * 60 + Number(m[2])) / slotMinutes);
  }
  function slotLabel(slot, slotMinutes) {
    const start = slot * slotMinutes, end = start + slotMinutes;
    const f = function (t) { return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };
    return `${f(start)}–${f(end)}`;
  }

  // ── 星期 × 時段熱力圖 ──────────────────────────────────────────────
  // calls：consolidateCalls 的結果（每通一筆，含 callOutcome）。回傳 7 × 時段格子的進線、漏接、漏接率，以及每個星期幾在資料中出現的天數（算平均用）。
  function weekdayHourMatrix(calls, slotMinutes) {
    const size = slotMinutes || 60, slots = Math.round(1440 / size);
    const cells = Array.from({ length: 7 }, function () { return Array.from({ length: slots }, function () { return { offered: 0, missed: 0 }; }); });
    const daysSeen = Array.from({ length: 7 }, function () { return new Set(); });
    (calls || []).forEach(function (call) {
      const date = normDate(call.date), slot = slotOf(call.time, size);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || slot < 0) return;
      const w = weekdayIndex(date);
      daysSeen[w].add(date);
      cells[w][slot].offered += 1;
      if (call.callOutcome === "missed") cells[w][slot].missed += 1;
    });
    const dayCounts = daysSeen.map(function (s) { return s.size; });
    const matrix = cells.map(function (row, w) {
      return row.map(function (cell) {
        return { ...cell, missedRate: cell.offered ? cell.missed / cell.offered * 100 : 0, avgOffered: dayCounts[w] ? cell.offered / dayCounts[w] : 0 };
      });
    });
    return { slotMinutes: size, slots, matrix, dayCounts, labels: WEEKDAY_LABELS };
  }

  // 逐日熱力圖：每個日期一列 × 時段。只列出資料裡有來電的日期（依日期排序），label 例如「8/15（五）」。
  function dateHourMatrix(calls, slotMinutes) {
    const size = slotMinutes || 60, slots = Math.round(1440 / size);
    const byDate = new Map();
    (calls || []).forEach(function (call) {
      const date = normDate(call.date), slot = slotOf(call.time, size);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || slot < 0) return;
      if (!byDate.has(date)) byDate.set(date, Array.from({ length: slots }, function () { return { offered: 0, missed: 0 }; }));
      const cell = byDate.get(date)[slot];
      cell.offered += 1;
      if (call.callOutcome === "missed") cell.missed += 1;
    });
    const dates = Array.from(byDate.keys()).sort();
    const shortDay = ["一", "二", "三", "四", "五", "六", "日"];
    const matrix = dates.map(function (date) {
      return byDate.get(date).map(function (cell) { return { ...cell, missedRate: cell.offered ? cell.missed / cell.offered * 100 : 0, avgOffered: cell.offered }; });
    });
    const labels = dates.map(function (date) { const d = toDate(date); return `${d.getMonth() + 1}/${d.getDate()}（${shortDay[weekdayIndex(date)]}）`; });
    return { slotMinutes: size, slots, matrix, dates, labels, dayCounts: dates.map(function () { return 1; }) };
  }

  // 熱力圖找「最高的格子」：漏接率模式只從來電數達 minOffered 的格子裡找，避免 1 通漏 1 通 = 100% 被當成最嚴重。
  function heatmapPeak(matrix, valueOf, options) {
    const minOffered = Number((options && options.minOffered) || 0);
    let peak = null;
    (matrix || []).forEach(function (row, r) {
      row.forEach(function (cell, c) {
        if (cell.offered < minOffered) return;
        const v = valueOf(cell);
        if (v > 0 && (!peak || v > peak.value)) peak = { row: r, col: c, value: v, cell: cell };
      });
    });
    return peak;
  }

  // ── 客服個人成績單 ──────────────────────────────────────────────────
  // rows：去重後的通話列（有 agent、q1、q2、handleDuration、speakDuration）。沒有客服名稱的（漏接）不列入個人成績。
  function agentScorecard(rows, options) {
    const minCalls = Number((options && options.minCalls) || 0);
    const map = new Map();
    const valid = ["非常滿意", "尚可", "非常不滿意"];
    const blank = function (name) { return { name, calls: 0, handle: 0, speak: 0, q1: { answered: 0, very: 0, unsat: 0 }, q2: { answered: 0, very: 0, unsat: 0 } }; };
    const team = blank("團隊合計");
    (rows || []).forEach(function (row) {
      const name = String(row.agent || "").trim();
      if (!name) return;
      const a = map.get(name) || blank(name);
      [a, team].forEach(function (t) {
        t.calls += 1;
        t.handle += Number(row.handleDuration || 0);
        t.speak += Number(row.speakDuration || 0);
        ["q1", "q2"].forEach(function (q) {
          const ans = row[q];
          if (valid.indexOf(ans) >= 0) { t[q].answered += 1; if (ans === "非常滿意") t[q].very += 1; if (ans === "非常不滿意") t[q].unsat += 1; }
        });
      });
      map.set(name, a);
    });
    const finish = function (t) {
      const pct = function (a, b) { return b ? a / b * 100 : null; };
      return {
        name: t.name, calls: t.calls,
        avgHandleSec: t.calls ? t.handle / t.calls : 0, avgSpeakSec: t.calls ? t.speak / t.calls : 0,
        q1Rate: pct(t.q1.very, t.q1.answered), q2Rate: pct(t.q2.very, t.q2.answered),
        q1SurveyRate: pct(t.q1.answered, t.calls), q2SurveyRate: pct(t.q2.answered, t.calls),
        q1Answered: t.q1.answered, q2Answered: t.q2.answered,
        veryUnsatisfied: t.q1.unsat + t.q2.unsat, q1VeryUnsat: t.q1.unsat, q2VeryUnsat: t.q2.unsat,
        lowSample: t.calls < minCalls,
      };
    };
    const teamRow = finish(team);
    const agents = Array.from(map.values()).map(finish).map(function (a) {
      const diff = function (k) { return a[k] == null || teamRow[k] == null ? null : a[k] - teamRow[k]; };
      return { ...a, share: teamRow.calls ? a.calls / teamRow.calls * 100 : 0, vsTeam: { avgHandleSec: a.avgHandleSec - teamRow.avgHandleSec, q1Rate: diff("q1Rate"), q2Rate: diff("q2Rate"), q1SurveyRate: diff("q1SurveyRate"), q2SurveyRate: diff("q2SurveyRate") } };
    }).sort(function (x, y) { return y.calls - x.calls || x.name.localeCompare(y.name); });
    return { agents, team: teamRow };
  }

  // ── 來電量預測 ─────────────────────────────────────────────────────
  // 方法：未來某一天 = 過去 weeksBack 週「同一個星期幾」的平均（沒有來電的日子算 0 通，但只取資料涵蓋範圍內的日子）。
  // 每 slotMinutes 分鐘一格，同時回傳最低／最高，讓使用者知道波動大小。
  function forecastVolume(calls, options) {
    const opt = options || {};
    const slotMinutes = opt.slotMinutes || 30, weeksBack = opt.weeksBack || 8, horizonDays = opt.horizonDays || 7;
    const slots = Math.round(1440 / slotMinutes);
    const byDate = new Map();
    let firstDate = "", lastDate = "";
    (calls || []).forEach(function (call) {
      const date = normDate(call.date), slot = slotOf(call.time, slotMinutes);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || slot < 0) return;
      if (!byDate.has(date)) byDate.set(date, new Array(slots).fill(0));
      byDate.get(date)[slot] += 1;
      if (!firstDate || date < firstDate) firstDate = date;
      if (!lastDate || date > lastDate) lastDate = date;
    });
    const baseDate = opt.baseDate || lastDate;
    if (!baseDate) return { baseDate: "", days: [], slotMinutes, weeksBack };
    const days = [];
    for (let i = 1; i <= horizonDays; i++) {
      const target = dateKeyOf(new Date(toDate(baseDate).getTime() + i * 86400000));
      const samples = [];
      for (let k = 1; samples.length < weeksBack; k++) {
        const d = dateKeyOf(new Date(toDate(target).getTime() - k * 7 * 86400000));
        if (d > baseDate) continue;
        if (d < firstDate) break;
        samples.push(byDate.get(d) || new Array(slots).fill(0));
      }
      const totals = samples.map(function (s) { return s.reduce(function (a, b) { return a + b; }, 0); });
      const mean = function (list) { return list.length ? list.reduce(function (a, b) { return a + b; }, 0) / list.length : 0; };
      const slotMeans = Array.from({ length: slots }, function (_, j) { return mean(samples.map(function (s) { return s[j]; })); });
      days.push({
        date: target, weekday: WEEKDAY_LABELS[weekdayIndex(target)], samples: samples.length,
        total: mean(totals), low: totals.length ? Math.min.apply(null, totals) : 0, high: totals.length ? Math.max.apply(null, totals) : 0,
        slots: slotMeans.map(function (v, j) { return { slot: j, label: slotLabel(j, slotMinutes), mean: v }; }),
      });
    }
    return { baseDate, firstDate, days, slotMinutes, weeksBack };
  }

  // ── 人力需求（Erlang C）─────────────────────────────────────────────
  // 業界排班常用公式：已知某時段來電數、平均處理時間，算出要幾位客服同時在線，才能讓 targetSL 比例的電話在 targetSec 秒內接起。
  function erlangCServiceLevel(agents, traffic, ahtSec, targetSec) {
    if (agents <= traffic) return 0;
    // 用遞推算 Erlang B，再換成 Erlang C，避免階乘溢位。
    let b = 1;
    for (let k = 1; k <= agents; k++) b = (traffic * b) / (k + traffic * b);
    const c = b / (1 - (traffic / agents) * (1 - b));
    return Math.max(0, Math.min(1, 1 - c * Math.exp(-(agents - traffic) * targetSec / ahtSec)));
  }
  function erlangCAgents(input) {
    const d = input || {};
    const calls = Number(d.calls || 0), aht = Number(d.ahtSec || 0), interval = Number(d.intervalSec || 1800);
    const targetSL = Number(d.targetSL == null ? 0.8 : d.targetSL), targetSec = Number(d.targetSec == null ? 20 : d.targetSec);
    const shrinkage = Number(d.shrinkage || 0);
    if (calls <= 0 || aht <= 0) return { agents: 0, scheduled: 0, traffic: 0, serviceLevel: 1, occupancy: 0 };
    const traffic = calls * aht / interval;
    let n = Math.max(1, Math.ceil(traffic));
    while (erlangCServiceLevel(n, traffic, aht, targetSec) < targetSL && n < traffic + 500) n += 1;
    const scheduled = shrinkage > 0 && shrinkage < 1 ? Math.ceil(n / (1 - shrinkage)) : n;
    return { agents: n, scheduled, traffic, serviceLevel: erlangCServiceLevel(n, traffic, aht, targetSec), occupancy: traffic / n };
  }

  // ── 統計管制圖（p 管制圖）──────────────────────────────────────────
  // points：[{ key, x（事件數，如漏接數）, n（樣本數，如進線數）}]。
  // 中心線 = 全部期間的整體比例；管制上下限 = 中心線 ± 3 個標準差（樣本越少，界限越寬）。
  // 訊號：超出上下限，或連續 7 個點都在中心線同一側（代表趨勢性變化）。
  function pChart(points, options) {
    const opt = options || {};
    const minN = Number(opt.minN || 0), runLength = opt.runLength || 7;
    const usable = (points || []).filter(function (p) { return Number(p.n) > 0; });
    const sumX = usable.reduce(function (a, p) { return a + Number(p.x); }, 0), sumN = usable.reduce(function (a, p) { return a + Number(p.n); }, 0);
    const center = sumN ? sumX / sumN : 0;
    const rows = (points || []).map(function (p) {
      const n = Number(p.n || 0), x = Number(p.x || 0);
      const rate = n ? x / n : null;
      const sigma = n ? Math.sqrt(center * (1 - center) / n) : 0;
      const ucl = n ? Math.min(1, center + 3 * sigma) : null, lcl = n ? Math.max(0, center - 3 * sigma) : null;
      const lowSample = n < minN;
      const signal = rate == null || lowSample ? null : rate > ucl ? "above" : rate < lcl ? "below" : null;
      return { key: p.key, x, n, rate: rate == null ? null : rate * 100, ucl: ucl == null ? null : ucl * 100, lcl: lcl == null ? null : lcl * 100, lowSample, signal, run: null };
    });
    // 連續同側：只看樣本足夠的點。
    let streak = [], side = 0;
    rows.forEach(function (r, i) {
      if (r.rate == null || r.lowSample) return;
      const s = r.rate > center * 100 ? 1 : r.rate < center * 100 ? -1 : 0;
      if (s !== 0 && s === side) streak.push(i); else { streak = s ? [i] : []; side = s; }
      if (streak.length >= runLength) streak.forEach(function (j) { rows[j].run = side > 0 ? "above" : "below"; });
    });
    return { center: center * 100, points: rows, target: opt.target == null ? null : Number(opt.target) };
  }

  // ── 各業務線一覽（V39.3）─────────────────────────────────────────────
  // rows／previousRows：本期與比較期間的通話列。每條專線算出來電、漏接、漏接率、Q1／Q2 非常滿意度，以及來電較前期的變化。
  const LINE_ORDER = ["GT專線", "儲值專線", "滿貫專線", "金好運專線"];
  function lineBreakdown(rows, previousRows) {
    const valid = ["非常滿意", "尚可", "非常不滿意"];
    const collect = function (list) {
      const map = new Map();
      consolidateCalls(list || []).forEach(function (call) {
        const key = String(call.line || "").trim() || "未分類";
        const g = map.get(key) || { line: key, offered: 0, missed: 0, q1: { n: 0, very: 0 }, q2: { n: 0, very: 0 } };
        g.offered += 1;
        if (call.callOutcome === "missed") g.missed += 1;
        ["q1", "q2"].forEach(function (q) { if (valid.indexOf(call[q]) >= 0) { g[q].n += 1; if (call[q] === "非常滿意") g[q].very += 1; } });
        map.set(key, g);
      });
      return map;
    };
    const cur = collect(rows), prev = collect(previousRows);
    const pct = function (a, b) { return b ? a / b * 100 : null; };
    const keys = Array.from(new Set(Array.from(cur.keys()).concat(Array.from(prev.keys()))));
    keys.sort(function (a, b) {
      const ia = LINE_ORDER.indexOf(a), ib = LINE_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    });
    return keys.map(function (key) {
      const c = cur.get(key) || { offered: 0, missed: 0, q1: { n: 0, very: 0 }, q2: { n: 0, very: 0 } };
      const p = prev.get(key) || { offered: 0, missed: 0, q1: { n: 0, very: 0 }, q2: { n: 0, very: 0 } };
      return {
        line: key, offered: c.offered, missed: c.missed, missedRate: pct(c.missed, c.offered),
        q1Rate: pct(c.q1.very, c.q1.n), q2Rate: pct(c.q2.very, c.q2.n), q1Answered: c.q1.n, q2Answered: c.q2.n,
        prevOffered: p.offered, prevMissedRate: pct(p.missed, p.offered),
        volumeChangePct: p.offered ? (c.offered - p.offered) / p.offered * 100 : null,
      };
    });
  }

  // ── 本期重點（V40）──────────────────────────────────────────────────
  // 給高階主管看的三行結論：先挑有問題的（未達標、重大事件、來電暴增、樣本太少），都沒問題才挑做得好的。
  // tone：bad（紅）／warn（黃）／good（綠）。每行 20 字以內：一個結論＋一個數字。
  const shortTitle = function (text, max) { const s = String(text || "未命名事件").trim(); return s.length > max ? `${s.slice(0, max)}…` : s; };
  function executiveHighlights(input) {
    const d = input || {};
    const t = d.targets || {};
    const hasTarget = function (v) { return v != null && v !== "" && Number.isFinite(Number(v)); };
    const fmt = function (v) { return Number(v).toFixed(1); };
    // 跟目標差不到 0.05 個百分點時多顯示一位小數，避免出現「5.0%，超標 1 通」這種看起來矛盾的寫法。
    const fmtNear = function (v, target) { return hasTarget(target) && Math.abs(Number(v) - Number(target)) < 0.05 ? Number(v).toFixed(2) : fmt(v); };
    const candidates = [];
    const add = function (tone, text, priority) { candidates.push({ tone, text, priority }); };
    const offered = Number((d.current && d.current.offered) || 0);
    const missed = d.current && d.current.missed != null ? Number(d.current.missed) : null;
    const missedRate = d.current ? d.current.missedRate : null;
    const prevOffered = Number((d.previous && d.previous.offered) || 0);
    const minCalls = Number(d.minCalls || 0), minAnswers = Number(d.minAnswers || 0);
    // 樣本太少的提醒固定保留一行，不會被紅燈擠掉。
    const sampleNote = offered > 0 && offered < minCalls ? { tone: "warn", text: `本期僅 ${offered} 通，僅供參考` } : null;
    // 1. 漏接率（≤ 目標＝達標；有漏接通數時換算「超出目標幾通」；沒設目標就不下達標與否的結論）
    if (offered > 0 && missedRate != null) {
      // 沒設目標時，顏色跟風險門檻（missedLevel：normal／watch／medium／high）
      if (!hasTarget(t.missedRate)) add(d.missedLevel === "high" ? "bad" : "warn", `漏接率 ${fmt(missedRate)}%，未設目標`, 1);
      else if (missedRate > Number(t.missedRate)) {
        const excess = missed != null ? Math.max(0, missed - Math.floor(offered * Number(t.missedRate) / 100)) : null;
        add("bad", excess ? `漏接率 ${fmtNear(missedRate, t.missedRate)}%，超標 ${excess} 通` : `漏接率 ${fmtNear(missedRate, t.missedRate)}%，目標 ${t.missedRate}%`, 1);
      }
      else add("good", `漏接率 ${fmtNear(missedRate, t.missedRate)}%，達標`, 1);
    }
    // 2. 業務線：來電達 minLine 通的業務線中，漏接率最高的那一條（沒設目標就不判斷）
    const minLine = Number(d.minLineCalls == null ? 10 : d.minLineCalls);
    const lines = (d.lines || []).filter(function (l) { return l.line !== "未分類" && l.offered >= minLine && l.missedRate != null; });
    if (lines.length && hasTarget(t.missedRate)) {
      const worst = lines.slice().sort(function (a, b) { return b.missedRate - a.missedRate || b.missed - a.missed; })[0];
      if (worst.missedRate > Number(t.missedRate)) add("bad", `${worst.line}最嚴重，漏接 ${fmt(worst.missedRate)}%`, 2);
      else add("good", `來電 ${minLine} 通以上業務線皆達標`, 2);
    }
    // 沒設目標、但風險門檻已亮燈時：只講事實（哪條線最嚴重），不下「達標」結論
    else if (lines.length && d.missedLevel && d.missedLevel !== "normal") {
      const worst = lines.slice().sort(function (a, b) { return b.missedRate - a.missedRate || b.missed - a.missed; })[0];
      add(d.missedLevel === "high" ? "bad" : "warn", `${worst.line}最嚴重，漏接 ${fmt(worst.missedRate)}%`, 2);
    }
    // 3. 重大事件：取日期最新的一件
    const incidents = latestFirst(d.incidents);
    if (incidents.length) add("bad", `重大事件 ${incidents.length} 件：${shortTitle(incidents[0].title, 8)}`, 3);
    // 4. 滿意度（Q1 人員、Q2 問題）：回答數要達「最少有效回答」、而且有設目標才下結論
    const s = d.satisfaction || {};
    const q = [["Q1", s.q1, t.q1Rate], ["Q2", s.q2, t.q2Rate]].filter(function (x) { return x[1] && x[1].answered > 0 && x[1].answered >= minAnswers && x[1].rate != null && hasTarget(x[2]); });
    if (q.length) {
      const below = q.filter(function (x) { return x[1].rate < Number(x[2]); });
      if (below.length === 1) add("warn", `${below[0][0]} 滿意度 ${fmt(below[0][1].rate)}%，未達 ${below[0][2]}%`, 4);
      else if (below.length > 1) add("warn", "Q1、Q2 滿意度皆未達標", 4);
      else add("good", `滿意度達標 ${q.map(function (x) { return `${fmt(x[1].rate)}%`; }).join("／")}`, 4);
    }
    // 5. 來電量
    const watch = Number(d.volumeWatch == null ? 10 : d.volumeWatch);
    if (offered > 0 && prevOffered > 0 && d.volumeComparable !== false) {
      const change = (offered - prevOffered) / prevOffered * 100;
      if (change >= watch) add("warn", `來電 ${offered} 通，增加 ${Math.round(change)}%`, 5);
      else add("good", `來電 ${offered} 通，${change <= -watch ? `減少 ${Math.round(-change)}%` : "與上期相近"}`, 5);
    }
    const rank = { bad: 3, warn: 2, good: 1 };
    const sorted = candidates.sort(function (a, b) { return rank[b.tone] - rank[a.tone] || a.priority - b.priority; }).map(function (c) { return { tone: c.tone, text: c.text }; });
    return sampleNote ? [sampleNote].concat(sorted.slice(0, 2)) : sorted.slice(0, 3);
  }

  // 重大事件依日期由新到舊（沒填日期的排最後）。
  function latestFirst(incidents) {
    return (incidents || []).slice().sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
  }

  // 「下一步」的系統建議（20 字以內）。這只是起點，畫面上會標「系統建議，僅供參考」，使用者可以改寫成實際對策。
  // 優先順序：漏接超標且知道最嚴重的專線 → 重大事件（最新一件） → 滿意度未達標 → 都正常。
  function nextStepSuggestion(input) {
    const d = input || {};
    // V41：沒設目標時，改看風險門檻有沒有亮燈（missedAlert），避免燈號紅色卻建議「維持現有配置」
    const missedProblem = d.excessMissed > 0 || !!d.missedAlert;
    if (missedProblem && d.worstLine) return d.peakHour != null && d.peakHour !== "" ? `${d.worstLine} ${Number(d.peakHour)} 點時段加派支援` : `${d.worstLine}高峰時段加派支援`;
    if (missedProblem) return "高峰時段加派支援，下期複查";
    const incidents = latestFirst(d.incidents);
    if (incidents.length) return `追蹤「${shortTitle(incidents[0].title, 8)}」處理進度`;
    if (d.satisfactionBelow) return "抽聽低分通話，找出原因";
    return "維持現有配置，持續觀察";
  }

  // ── 最近 N 週走勢（給 KPI 卡片的小趨勢線）──────────────────────────────
  // rows：全部通話列；endDate：本期最後一天。回傳由舊到新的 N 週（週一～週日），每週的來電、漏接率、Q1／Q2 非常滿意度。
  // V41：只算到 endDate 為止（不會把選取期間之後的電話算進來）；最後一週若沒走完，partial = true。
  // 沒有來電的週，比例為 null（趨勢線上留空，不當成 0）。
  function weeklySeries(rows, endDate, weeks) {
    const count = weeks || 12;
    const end = normDate(endDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) return [];
    const lastMonday = dateKeyOf(new Date(toDate(end).getTime() - weekdayIndex(end) * 86400000));
    const starts = [];
    for (let i = count - 1; i >= 0; i--) starts.push(dateKeyOf(new Date(toDate(lastMonday).getTime() - i * 7 * 86400000)));
    const firstStart = starts[0];
    const byWeek = new Map(starts.map(function (s) { return [s, []]; }));
    (rows || []).forEach(function (row) {
      const date = normDate(row.date);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < firstStart || date > end) return;
      const monday = dateKeyOf(new Date(toDate(date).getTime() - weekdayIndex(date) * 86400000));
      if (byWeek.has(monday)) byWeek.get(monday).push(row);
    });
    const valid = ["非常滿意", "尚可", "非常不滿意"];
    return starts.map(function (start) {
      const weekEnd = dateKeyOf(new Date(toDate(start).getTime() + 6 * 86400000));
      const calls = consolidateCalls(byWeek.get(start));
      const missed = calls.filter(function (c) { return c.callOutcome === "missed"; }).length;
      const q = { q1: { n: 0, very: 0 }, q2: { n: 0, very: 0 } };
      calls.forEach(function (c) { ["q1", "q2"].forEach(function (k) { if (valid.indexOf(c[k]) >= 0) { q[k].n += 1; if (c[k] === "非常滿意") q[k].very += 1; } }); });
      return {
        start, end: weekEnd, partial: weekEnd > end, offered: calls.length, missed,
        missedRate: calls.length ? missed / calls.length * 100 : null,
        q1Rate: q.q1.n ? q.q1.very / q.q1.n * 100 : null, q2Rate: q.q2.n ? q.q2.very / q.q2.n * 100 : null,
        q1Answered: q.q1.n, q2Answered: q.q2.n,
      };
    });
  }

  // ── 團隊期間彙總（V41，歷史總覽用；與 AI 儀表板同一套算法）──────────────────
  // rows：某一期間的通話列。有效進線＝以對話 ID 合併後的全部傳入；已接聽／漏接依「使用者 - 已互動」有沒有客服名字。
  // Q1／Q2 非常滿意度＝該題非常滿意 ÷ 該題有效回答；Q1／Q2 調查率＝該題有效回答 ÷ 已接聽。
  // 時數＝發話時間（小時），GT+儲值合併（人力計算用）、滿貫、金好運。
  function teamPeriodSummary(rows) {
    const calls = consolidateCalls(rows || []);
    const valid = ["非常滿意", "尚可", "非常不滿意"];
    const q = { q1: { n: 0, very: 0 }, q2: { n: 0, very: 0 } };
    const speak = { gtStored: 0, fullHouse: 0, lucky: 0 };
    let answered = 0;
    calls.forEach(function (c) {
      if (c.callOutcome !== "missed") answered += 1;
      ["q1", "q2"].forEach(function (k) { if (valid.indexOf(c[k]) >= 0) { q[k].n += 1; if (c[k] === "非常滿意") q[k].very += 1; } });
      const sec = Number(c.speakDuration || 0);
      if (c.line === "GT專線" || c.line === "儲值專線") speak.gtStored += sec;
      else if (c.line === "滿貫專線") speak.fullHouse += sec;
      else if (c.line === "金好運專線") speak.lucky += sec;
    });
    const offered = calls.length, missed = offered - answered;
    const pct = function (a, b) { return b ? a / b * 100 : null; };
    return {
      offered, answered, missed, missedRate: pct(missed, offered),
      q1Rate: pct(q.q1.very, q.q1.n), q2Rate: pct(q.q2.very, q.q2.n),
      q1SurveyRate: pct(q.q1.n, answered), q2SurveyRate: pct(q.q2.n, answered),
      q1Answered: q.q1.n, q2Answered: q.q2.n,
      hours: { gtStored: speak.gtStored / 3600, fullHouse: speak.fullHouse / 3600, lucky: speak.lucky / 3600 },
    };
  }

  // ── 去年同期對照（V41.1，V42.3 承接）────────────────────────────────────────────
  // 歷史總覽打勾「對照去年」時用：每一期跟去年「同一段日期」比。
  // 本期只有部分日期有資料時（例如 8 月只匯入到 8/20），就比去年 8/1～8/20，通數才公平。
  // 週：比去年同一個週次（例如第 35 週比去年第 35 週）；去年沒有第 53 週時算「去年無資料」。
  function isoWeekMonday(year, week) {
    const jan4 = new Date(year, 0, 4, 12);
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - (jan4.getDay() || 7) + 1 + (week - 1) * 7);
    return monday;
  }
  function addDays(key, days) { return dateKeyOf(new Date(toDate(key).getTime() + days * 86400000)); }
  function daysBetween(a, b) { return Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000); }
  // 期間 key（月 2026-08、年 2026、週 2026-W35）的起訖日期。
  function periodDateRange(key, viewType) {
    if (viewType === "months") return /^\d{4}-\d{2}$/.test(key) ? monthBounds(`${key}-01`) : null;
    if (viewType === "years") return /^\d{4}$/.test(key) ? { start: `${key}-01-01`, end: `${key}-12-31` } : null;
    const m = /^(\d{4})-W(\d{2})$/.exec(String(key));
    if (!m) return null;
    const monday = dateKeyOf(isoWeekMonday(Number(m[1]), Number(m[2])));
    return { start: monday, end: addDays(monday, 6) };
  }
  // 全部資料的最早、最晚日期，以及「哪些日子有資料」。
  function dataSpan(rows) {
    let start = "", end = "";
    const days = new Set();
    (rows || []).forEach(function (row) {
      const d = normDate(row.date);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
      days.add(d);
      if (!start || d < start) start = d;
      if (!end || d > end) end = d;
    });
    return { start, end, days };
  }
  // 一段日期裡，有資料的天數。
  function countDataDays(days, start, end) {
    let n = 0;
    for (let d = start; d <= end; d = addDays(d, 1)) if (days.has(d)) n += 1;
    return n;
  }
  // 去年同一段日期「有資料的天數」達到這個比例才拿來比（容許幾天本來就沒電話，例如休息日）。
  const LAST_YEAR_MIN_COVERAGE = 0.9;
  // 回傳 { status, range, summary }：status = ok（可比較）／none（去年沒有資料）／partial（去年資料不完整，不比較）。
  // V42.5：本期用「這一期實際有資料的第一天到最後一天」；去年那一段要逐日檢查，有資料的天數不到九成就算不完整。
  function lastYearComparison(rows, key, viewType, span) {
    const sp = span && span.days ? span : dataSpan(rows);
    const r = periodDateRange(key, viewType);
    if (!r || !sp.start) return { status: "none", range: null, summary: null };
    let cs = "", ce = "";
    for (let d = r.start; d <= r.end; d = addDays(d, 1)) if (sp.days.has(d)) { if (!cs) cs = d; ce = d; }
    if (!cs) return { status: "none", range: null, summary: null };
    let range;
    if (viewType === "weeks") {
      const m = /^(\d{4})-W(\d{2})$/.exec(String(key));
      const prevYear = Number(m[1]) - 1, week = Number(m[2]);
      const monday = isoWeekMonday(prevYear, week);
      const thursday = new Date(monday); thursday.setDate(monday.getDate() + 3);
      if (thursday.getFullYear() !== prevYear) return { status: "none", range: null, summary: null };
      const mondayKey = dateKeyOf(monday);
      range = { start: addDays(mondayKey, daysBetween(r.start, cs)), end: addDays(mondayKey, daysBetween(r.start, ce)) };
    } else {
      range = { start: shiftYearKey(cs, -1), end: shiftYearKey(ce, -1) };
    }
    const covered = countDataDays(sp.days, range.start, range.end);
    if (!covered) return { status: "none", range, summary: null };
    const total = daysBetween(range.start, range.end) + 1;
    if (covered / total < LAST_YEAR_MIN_COVERAGE) return { status: "partial", range, summary: null, coverage: { covered, total } };
    const inRange = (rows || []).filter(function (row) { const d = normDate(row.date); return d >= range.start && d <= range.end; });
    return { status: "ok", range, summary: teamPeriodSummary(inRange), coverage: { covered, total } };
  }

  // ── 人員班別歷程與換班前後比較（V42.7）────────────────────────────────
  // rows：已合併的通話列（建議先排除「人員有效期間」以外的列）；name：客服名字（忽略空白）；
  // months：要列出的月份（由舊到新）；shiftOf(month) → { shift, source, pending }。
  // 回傳每個月：班別、班別來源、是否待確認、這個人那個月的個人成績（沒接電話是 null）。
  function personShiftTimeline(rows, name, months, shiftOf) {
    const target = cleanName(name);
    const byMonth = {};
    (rows || []).forEach(function (r) {
      if (!r.monthKey || cleanName(r.agent) !== target) return;
      (byMonth[r.monthKey] = byMonth[r.monthKey] || []).push(r);
    });
    return (months || []).map(function (m) {
      const info = (shiftOf && shiftOf(m)) || {};
      const list = byMonth[m] || [];
      return { month: m, shift: info.shift || "", source: info.source || "", pending: !!info.pending, stats: list.length ? agentScorecard(list).team : null };
    });
  }
  // 換班：這個月的班別跟「上一個有班別的月份」不同。比較換班前、後各 windowMonths 個月（只算同一個班別連續的月份）。
  // 回傳 [{ month, from, to, beforeMonths, afterMonths, before, after }]；before／after 是那幾個月合起來的個人成績。
  function shiftChangeComparisons(timeline, rows, name, windowMonths) {
    const win = Math.max(1, Number(windowMonths || 3));
    const target = cleanName(name);
    const statsOf = function (monthList) {
      const set = new Set(monthList);
      const list = (rows || []).filter(function (r) { return set.has(r.monthKey) && cleanName(r.agent) === target; });
      return list.length ? { ...agentScorecard(list).team, months: monthList.length, callsPerMonth: list.length / monthList.length } : null;
    };
    const tl = timeline || [];
    const out = [];
    let prevIdx = -1;
    tl.forEach(function (t, i) {
      if (!t.shift) return;
      if (prevIdx >= 0 && tl[prevIdx].shift !== t.shift) {
        const from = tl[prevIdx].shift, to = t.shift;
        const beforeMonths = [];
        for (let j = prevIdx; j >= 0 && beforeMonths.length < win; j--) { if (tl[j].shift === from) beforeMonths.unshift(tl[j].month); else if (tl[j].shift) break; }
        const afterMonths = [];
        for (let j = i; j < tl.length && afterMonths.length < win; j++) { if (tl[j].shift === to) afterMonths.push(tl[j].month); else if (tl[j].shift) break; }
        out.push({ month: t.month, from, to, beforeMonths, afterMonths, before: statsOf(beforeMonths), after: statsOf(afterMonths) });
      }
      prevIdx = i;
    });
    return out;
  }

  // ── 匯入檢查：中間缺了哪幾天（V42.6）────────────────────────────────
  // dates：每通電話的日期（可重複、可用 / 或 -）。回傳第一天到最後一天之間「完全沒有電話」的日子，連續的合成一段：
  // [{ start, end, days }]。只看頭尾之間，不管頭尾以外的日子。
  function findMissingDates(dates) {
    const set = new Set();
    (dates || []).forEach(function (d) { const k = normDate(d); if (/^\d{4}-\d{2}-\d{2}$/.test(k)) set.add(k); });
    if (set.size < 2) return [];
    const sorted = Array.from(set).sort();
    const gaps = [];
    let cur = null;
    for (let d = sorted[0]; d <= sorted[sorted.length - 1]; d = addDays(d, 1)) {
      if (set.has(d)) { if (cur) { gaps.push(cur); cur = null; } continue; }
      if (cur) { cur.end = d; cur.days += 1; } else cur = { start: d, end: d, days: 1 };
    }
    if (cur) gaps.push(cur);
    return gaps;
  }

  // ── 班表（V42.5 從畫面程式搬進核心，方便自動測試）──────────────────────
  const SHIFT_NAMES = ["早班", "中班", "晚班"];
  const cleanName = function (n) { return String(n || "").replace(/[\s\u3000]+/g, ""); };
  function nextMonthKey(m) { return shiftMonthKey(`${m}-01`, 1).slice(0, 7); }
  // 班表自動沿用：使用者每個月都要有班表。從第一個已確認月份到目標月份（這個月或資料最新月份），
  // 每個「沒有確認過」的月份都沿用它之前最近的已確認月份（中間缺的月份也會補，並列為待確認）。
  // rules：{ default, "2026-08": {早班,中班,晚班} }；auto：{ "2026-09": "2026-08" } 待確認月份與來源。
  function planShiftAutoMonths(rules, auto, targetMonth) {
    const isMonth = function (k) { return /^\d{4}-\d{2}$/.test(k); };
    const pending = auto || {};
    const confirmed = Object.keys(rules || {}).filter(function (k) { return isMonth(k) && !Object.prototype.hasOwnProperty.call(pending, k); }).sort(); // 待確認的來源可能是空字串（新增、還沒儲存）
    const nextRules = { ...(rules || {}) }, nextAuto = {};
    if (!confirmed.length) {
      // 沒有任何已確認月份：保留原本的待確認月份（例如來源被刪掉了），讓使用者自己確認。
      Object.keys(pending).forEach(function (m) { if (nextRules[m]) nextAuto[m] = pending[m]; });
      return { rules: nextRules, auto: nextAuto };
    }
    const months = new Set(Object.keys(pending).filter(function (m) { return isMonth(m) && nextRules[m]; }));
    const target = isMonth(targetMonth) ? targetMonth : "";
    for (let m = confirmed[0]; target && m <= target; m = nextMonthKey(m)) months.add(m);
    Array.from(months).sort().forEach(function (m) {
      if (confirmed.indexOf(m) >= 0) return;
      const source = confirmed.filter(function (k) { return k < m; }).pop();
      if (!source) { nextAuto[m] = pending[m] || ""; return; }
      const copy = {};
      SHIFT_NAMES.forEach(function (sh) { copy[sh] = ((rules[source] || {})[sh] || []).slice(); });
      nextRules[m] = copy; nextAuto[m] = source;
    });
    return { rules: nextRules, auto: nextAuto };
  }
  // 班表裡找不到的人：某位客服在某個月有接電話，但那個月的班表沒有他（那個月沒建立班表時看預設班表）。
  // isEffective(name, row)：超過人員有效期間的人回傳 false，不列入。名字比對時忽略空白。
  function missingFromShiftTable(rows, rules, isEffective) {
    const inTable = function (table, name) { const n = cleanName(name); return !!table && SHIFT_NAMES.some(function (sh) { return (table[sh] || []).some(function (x) { return cleanName(x) === n; }); }); };
    const map = {};
    (rows || []).forEach(function (r) {
      const agent = String(r.agent || "").trim();
      if (!agent || !r.monthKey || r.callOutcome === "missed") return;
      if (isEffective && !isEffective(agent, r)) return;
      const table = (rules || {})[r.monthKey] || (rules || {}).default;
      if (inTable(table, agent)) return;
      const m = map[r.monthKey] = map[r.monthKey] || {};
      m[agent] = (m[agent] || 0) + 1;
    });
    return Object.keys(map).sort().map(function (month) {
      return { month, hasTable: !!(rules || {})[month], people: Object.keys(map[month]).sort(function (a, b) { return a.localeCompare(b, "zh-Hant"); }).map(function (name) { return { name, calls: map[month][name] }; }) };
    });
  }

  return { personShiftTimeline, shiftChangeComparisons, findMissingDates, planShiftAutoMonths, missingFromShiftTable, periodDateRange, dataSpan, lastYearComparison, lineBreakdown, executiveHighlights, nextStepSuggestion, weeklySeries, teamPeriodSummary, latestFirst, shiftMonthKey, monthBounds, hashText, getRowIndexId, chunkForBatch, findMissingWeekKeys, weightedSurveySummary, consolidateCalls, summarizeMissedCalls, DEFAULT_RISK_RULES, DEFAULT_SAMPLE_RULES, RISK_RULES, buildRiskRules, validateRiskRules, classifyOperationalRisk, comparisonRange, comparisonCoverage, parseDuration, hasAnyColumn, DEFAULT_LINE_PHONES, lineFromPhone, lineFromRowPhones, WEEKDAY_LABELS, weekdayIndex, slotLabel, weekdayHourMatrix, dateHourMatrix, heatmapPeak, agentScorecard, forecastVolume, erlangCAgents, erlangCServiceLevel, pChart };
});
