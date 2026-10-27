const { useState, useMemo, useEffect, useRef, useCallback } = React;
const EMPTY_SHIFT_RULES = { default: { "早班": [], "中班": [], "晚班": [] } };
const EMPTY_EFFECTIVE_RULES = { "周明瑝": { start: "2025-W09", end: "2025-W35", note: "第35週後不再此單位" } };
const EMPTY_CLOUD_STORE = { rows: [], weeks: {}, months: {}, years: {}, detailByWeek: {} };
const EMPTY_PREVIEW_META = { mode: "none", title: "尚未載入資料", weekKeys: [], monthKeys: [], yearKeys: [], sourceCount: 0, recordCountBeforeDedupe: 0, recordCountAfterDedupe: 0 };
const EMPTY_EVENT_LIST = [];
const APP_VERSION = "v42.8.2｜同步雙重確認版";
const VERSION_HISTORY = [
    { version: "v42.8.2-cloud", date: "2026-10-27", title: "同步雙重確認版", changes: ["由 V42.8.1 另存新檔，未覆蓋舊版", "按「同步到雲端」後要確認兩次才會真的同步", "第一次確認：列出畫面上要存的資料（幾筆、幾個月）和雲端現在有幾筆；畫面上比雲端少時，用 ⚠ 提醒同步後雲端會變少", "第二次確認：最後再問一次，按「取消」就什麼都不會改"] },
    { version: "v42.8.1-cloud", date: "2026-10-27", title: "手動同步版", changes: ["由 V42.8 另存新檔，未覆蓋舊版", "右上角新增「同步到雲端」按鈕：按下去會把目前的電話資料、班表、人員有效期間、事件全部重新存一次到雲端", "同步完會再去雲端查一次，跳出視窗告訴你：雲端現在有幾筆電話、幾個月、同步時間", "畫面上沒有電話資料時，只同步設定，不會把雲端的電話資料清掉", "自動同步照舊；手動同步是給你多一層安心"] },
    { version: "v42.8.0-cloud", date: "2026-10-27", title: "雲端版", changes: ["由 V42.7 另存新檔，未覆蓋舊版", "接上新的 Firebase 雲端（專案 office-e266d），跟舊版的雲端完全分開", "打開網頁先用 Email＋密碼登入；登入後自動從雲端讀回電話資料、班表、人員有效期間、事件", "匯入電話資料後自動存到雲端（只寫有變動的月份）；改班表、人員有效期間、事件也會馬上存到雲端", "也可以選「先不登入」，跟 V42.7 一樣只在這台電腦用", "右上角顯示登入的帳號，可以登出；登出後畫面上的資料會清掉，雲端的資料還在"] },
    { version: "v42.7.0-local", date: "2026-10-26", title: "人員班別歷程版", changes: ["由 V42.6 另存新檔，未覆蓋舊版", "報表分析新增「人員班別歷程」頁：選一位客服，看他每個月上什麼班（時間線與每月明細）", "同一頁列出每次換班前後的表現比較：每月接聽數、Q1／Q2 非常滿意、Q1／Q2 調查率、平均處理與發話時間", "可選換班前後各比 1、3 或 6 個月；只算人員有效期間內的電話"] },
    { version: "v42.6.0-local", date: "2026-10-18", title: "匯入缺日檢查版", changes: ["由 V42.5 另存新檔，未覆蓋舊版", "匯入前預覽會檢查資料中間有沒有「完全沒有電話」的日子（例如 8/12～8/14），可能是少匯出了", "追加資料時，也會檢查舊資料和新資料之間有沒有空掉", "缺的日子如果是國定假日，會標出假日名稱，提醒可能本來就沒電話", "這些提醒也會留在資料驗證報告裡"] },
    { version: "v42.5.0-local", date: "2026-10-14", title: "雙重複核修正版", changes: ["由 V42.4 另存新檔，未覆蓋舊版；修正 Codex 與 Antigravity 複核找到的問題", "去年比較改成逐日檢查：資料中間缺一整個月顯示「去年無資料」，去年只記到月中顯示「去年資料不完整」；去年偶爾幾天沒電話（例如休息日）仍可比較", "本期只匯入部分日期時（例如 2/10～2/20），只跟去年同一段日期比", "班表中間缺的月份（刪掉的或提早建立未來月份造成的空檔）也會自動沿用並提醒確認", "「新增月份」先帶入上一個月的名單，按儲存後才算確認", "黃色提醒分別寫出每個月是沿用哪個月；來源月份被刪掉時會註明", "人員有效期間改用電話當天的日期判斷，交界那幾天不再誤判", "班表比對時忽略名字前後的空白", "計算核心移除重複的同名工具，並新增 9 項自動測試（共 70 項）"] },
    { version: "v42.4.0-local", date: "2026-10-13", title: "班表缺人提醒版", changes: ["由 V42.3 另存新檔，未覆蓋舊版", "匯入資料後，如果有客服在某個月接了電話、但那個月的班表裡找不到他，每一頁上方會出現提醒", "班表設定頁新增「班表裡找不到的人」清單：月份、客服、接聽數，並可直接打開那個月的班表", "超過人員有效期間的人不提醒；那個月還沒建立班表時，改看預設班表"] },
    { version: "v42.3.0-local", date: "2026-10-13", title: "去年同期週月年版", changes: ["由 V42.2 另存新檔，未覆蓋舊版", "歷史總覽的去年比較擴大到週（去年同一週）與年（前一年），月份照舊", "每格寫出去年的數字和變化，例如「去年 9.7%（▲3.0）」", "修正：去年同期資料不完整時（例如 2025 年 2 月只有 26～28 日）顯示「去年資料不完整」，不再拿 3 天跟整個月比"] },
    { version: "v42.2.0-local", date: "2026-10-12", title: "班表自動沿用提醒版", changes: ["由 Codex V42.1.1 複製到 Claude 資料夾另存新檔，未修改 Codex 原檔", "新的月份還沒建立班表時，先自動沿用上一個月的班表（成員相同）", "有自動沿用、還沒確認的月份時，每一頁最上方都會出現黃色提醒，請你到班表設定確認", "在班表設定按「確認無誤」或「儲存」後，那個月就算確認完成，提醒消失", "特殊班別規則維持移除（V42.0.1 已移除），班別只看每個月的班表"] },
    { version: "v42.1.1-local", date: "2026-10-07", title: "主管卡片排版修正版", changes: ["調查率卡片的去年同期差異改為固定兩行呈現", "將『百分點』放到比較標題，避免窄卡片把單位孤立換行", "保留 v42.1.0，不覆蓋舊版本"] },
    { version: "v42.1.0-local", date: "2026-10-02", title: "去年同月與假日標示版", changes: ["歷史總覽的月報新增去年同月比較，可一鍵顯示或隱藏", "未走完的月份只比較去年相同日期範圍，避免半個月誤比整月", "日期明細與逐日熱力圖自動標示國定假日、補假及補行上班日", "假日資料採政府行政機關辦公日曆的離線快照，只供解讀，不影響 KPI 計算"] },
    { version: "v42.0.1-local", date: "2026-10-02", title: "班表單一來源版", changes: ["移除特殊班別規則頁面與9條舊覆蓋規則", "所有客服班別只讀取班表設定；月份班表優先，其次預設班表", "修改班表後，已匯入資料會自動依班表重新計算"] },
    { version: "v42.0.0-local", date: "2026-10-02", title: "匯入預覽與模組化版", changes: ["匯入檔案改為先分析預覽，再由使用者選擇取代或追加", "AI 儀表板新增精簡的數字說明視窗，首頁版面維持不變", "特殊班別規則以單一生效期間欄呈現，不顯示來源或狀態", "大型 HTML 拆分為 HTML、畫面程式、樣式與計算核心，降低後續修改風險"] },
    { version: "v41.0.0-local", date: "2026-10-01", title: "全系統一致版", changes: ["由 V40.0.1 另存新檔，未覆蓋舊版；修正完整檢查找到的 34 項問題","各頁同一套算法：漏接率只看團隊；調查率＝該題回答數 ÷ 已接聽；Q1、Q2 分開，拿掉合併的「整體」指標；「總通話數」改名「接聽數」","歷史總覽改成團隊表：有效進線、已接聽、漏接、漏接率、Q1／Q2 非常滿意、Q1／Q2 調查率、GT+儲值／滿貫／金好運發話時數","沒人回問卷的客服顯示「—」，不再算成 0%；不再從規則帶入資料裡沒有的人名","人員有效期間不再刪除電話：期間外只是不列入個人排行與趨勢線；匯入後改班表或有效期間會自動重算","顏色全部跟「門檻與目標設定」的目標值；漏接率剛好等於目標算達標；目標留空時不再宣稱達標","AI 儀表板新增「本月」「上個月」；小趨勢線只算到本期最後一天，未走完的週不拿來判斷趨勢","移除沒有作用的「判斷模式」；重新整理前提醒資料會消失；預覽查詢改名「本次匯入預覽」；時數表加上「未分類」欄，各欄加總等於總計","期間篩選「今年度」改為「資料最新年度」（看資料、不看電腦日期）；特殊班別規則可編輯；沒有資料時提示先匯入","經 Codex 與 Antigravity 獨立複核，補完未完成項目與自動測試（57 項）"] },
    { version: "v40.0.1-local", date: "2026-09-30", title: "漏接明細全期間版", changes: ["漏接明細列出所選期間的全部漏接（由早到晚、分頁），不再只取最後 100 通"] },
    { version: "v40.0.0-local", date: "2026-09-29", title: "主管儀表板版", changes: ["以 Codex V39.5 為基礎另存","本期重點三行結論＋下一步（可改寫，依期間存本機）","KPI 卡片往上移；漏接率、Q1、Q2 加上近 12 週小趨勢線"] },
    { version: "v39.5.0-local", date: "2026-09-29", title: "日期區間自動顯示版", changes: ["由 V39.4 另存新檔，未覆蓋舊版", "日期框會依當日、昨日、近7日、近30日、本年度、去年度與近三年的選項，自動顯示實際起訖日期", "點擊日期框仍可選擇新的截止日期，所有區間會立即重新計算"] },
    { version: "v39.4.0-local", date: "2026-09-29", title: "主管決策儀表板版", changes: ["由 V39.3 另存新檔，未覆蓋來源檔", "首頁核心 KPI 由 8 張整併為 6 張，補上漏接目標差距與可減少通數", "新增主管決策摘要：自動指出主要問題專線、漏接熱區、營運影響與建議行動", "新增行動追蹤，可記錄改善措施、負責人、期限與處理狀態，資料保存在本機瀏覽器", "期間資訊改為精簡資料可信度列，降低首頁無效留白"] },
    { version: "v39.3.0-local", date: "2026-09-29", title: "高階主管資訊版", changes: ["本期三件事","各業務線一覽","AI 儀表板可新增／刪除重大事件"] },
    { version: "v39.2.0-local", date: "2026-09-29", title: "收合版（含 v39.2.1～39.2.4 修正）", changes: ["左側選單分組與報表卡片可收合、全部展開／收合","漏接明細欄位調整、小時漏接熱區與漏接明細左右並排","暫時隱藏來電量與人力預測","缺漏週次只看本期與比較期間"] },
    { version: "v39.1.0-local", date: "2026-09-29", title: "熱力圖改良版（含 v39.1.1）", changes: ["熱力圖可切換依星期幾／依日期，漏接率格子顯示漏接／來電，樣本少的格子變灰","漏接明細時間由早到晚"] },
    { version: "v39.0.0-local", date: "2026-09-29", title: "營運分析地端版", changes: ["由 V38.7 另存新檔，未覆蓋舊版；舊版移至「舊版」資料夾", "清除未使用的舊首頁、Firebase 雲端、登入、權限、回收桶程式（約 780 行）", "新增客服成績單、星期 × 時段熱力圖、統計警示（目標線、管制界限、樣本不足）、來電量與人力預測", "新增「門檻與目標設定」頁：風險門檻、樣本數下限、目標值、人力預測參數可在畫面上調整", "AI 儀表板改用可調門檻，樣本不足時不判定並列出原因", "第一佇列為電話號碼或空白時，自動依號碼換成專線名稱"] },
    { version: "v38.2.0-local", date: "2026-09-25", title: "多檔上傳版（含 v38.2.1～38.7）", changes: ["一次上傳多個檔案、追加到目前資料","AI 儀表板 Q1／Q2 分開、比較期間改為上週同日／去年同期","重複紀錄明細","KPI 卡片 8 張","漏接率分析加上期間篩選"] },
    { version: "v38.1.0-local", date: "2026-09-25", title: "匯入格式相容版", changes: ["由 V38 另存新檔，未覆蓋 V38", "支援沒有「初始方向」欄位的匯入檔（例如已篩好的年度彙整檔），整份視為傳入電話", "有「初始方向」欄位的原始匯出檔照舊只收「傳入」", "時長支援「1時 2分 3秒」「12.5秒」等寫法，不再被算成 0", "Excel 日期時間四捨五入到整秒，修正 10:20 被讀成 10:19:59、午夜可能被算到前一天的問題"] },
    { version: "v38.0.0-local", date: "2026-09-25", title: "完整風險規則與版本歷程版", changes: ["由 V37 地端版另存新檔，未覆蓋舊版", "首頁判定補回滿意度下降、調查率偏低、非常不滿意三條規則", "首頁新增「版本歷程」頁籤", "當日／昨日改為與上週同一天比較", "未填日期的重大事件不再永遠列為高風險，改列資料完整性提醒", "判定邏輯與規則表共用同一份規則設定"] },
    { version: "v37.0.0-local", date: "2026-09-25", title: "風險規則與爆量分類版", changes: ["由 V36 地端版另存新檔，未覆蓋舊版", "來電量增加10%／25%／50%分別列為注意／中風險／高風險", "漏接率達5%列為注意、達10%列為高風險", "人工重大事件直接列為高風險", "新增觸發原因、比較基準、樣本數與規則表"] },
    { version: "v36.0.0-local", date: "2026-09-24", title: "V36 地端營運儀表板版", changes: ["由 V36 另存新檔，未覆蓋雲端版本", "移除登入與 Firebase 連線資訊", "地端匯入後直接供首頁與各報表分析", "資料僅保留於目前瀏覽器工作階段"] },
    { version: "v36.0.0", date: "2026-09-24", title: "營運儀表板模板改版", changes: ["登入後首頁改為營運快報式版型", "新增日期快捷篩選與三種看板視角", "新增營運狀態橫幅、期間摘要與五張核心 KPI 卡片", "保留風險定義、重大事件與版本歷程入口"] },
    { version: "v35.0.0", date: "2026-09-24", title: "漏接率分析版", changes: ["沒有客服名稱的傳入電話列為漏接", "以對話 ID 合併多段紀錄，只要任一段有客服即列為已接聽", "新增有效進線、已接聽、漏接、漏接率與週次趨勢", "新增專線與小時漏接熱區排行"] },
    { version: "v33.0.0", date: "2026-09-21", title: "正式化與長期維護優化", changes: ["預設只載入最近12週／3個月，明細依期間延遲載入", "加入上傳狀態、對話索引、失敗清理與批次寫入", "新增人員等權與通話加權指標及樣本數", "特殊班別改為可設定並保留異動稽核", "加入角色權限、回收桶、還原與分段批次操作", "調整情境操作列、同步時間、缺漏週次、趨勢高低期間與手機選單"] },
    { version: "v32.0.0", date: "2026-09-21", title: "AI 儀表板功能優化", changes: ["新增簡潔儀表板首頁與細項切換", "建立風險留言與爆量數據的明確分類規則", "新增版本更新歷程；以新檔保存，不覆蓋 v31"] },
    { version: "v31", date: "2026-09-21", title: "既有正式基準版", changes: ["雲端資料、長期歷史、趨勢、明細、班表與 Excel 匯出"] },
];
const EVENT_TYPES = [
    { key: "onboarding", label: "新人上線", color: "#2563eb" },
    { key: "training", label: "教育訓練", color: "#7c3aed" },
    { key: "incident", label: "系統異常", color: "#dc2626" },
    { key: "other", label: "其他", color: "#64748b" },
];
const SUMMARY_HEADERS = ["客服名稱", "班別", "GT專線", "儲值專線", "GT+儲值專線", "滿貫專線", "金好運專線", "未分類", "總計"];
// V41：時數表的顯示名稱（GT+儲值 是小計，人力計算用；加上「未分類」讓各專線加起來等於總計）
const SUMMARY_LABELS = { "GT+儲值專線": "GT+儲值（小計）" };
const summaryLabel = (h) => SUMMARY_LABELS[h] || h;
const VALID_SURVEY = ["非常滿意", "尚可", "非常不滿意"];
const HISTORY_METRICS = [
    { label: "人員非常滿意度(Q1)", key: "q1VerySatRate", format: "percent" },
    { label: "人員調查率(Q1)", key: "q1SurRate", format: "percent" },
    { label: "問題非常滿意度(Q2)", key: "q2VerySatRate", format: "percent" },
    { label: "問題調查率(Q2)", key: "q2SurRate", format: "percent" },
    { label: "接聽數", key: "totalCalls", format: "number" },
    { label: "GT時數", key: "GT專線", source: "lines", format: "hours" },
    { label: "儲值專線時數", key: "儲值專線", source: "lines", format: "hours" },
    { label: "GT+儲值專線時數", key: "GT+儲值專線", source: "lines", format: "hours" },
    { label: "滿貫專線時數", key: "滿貫專線", source: "lines", format: "hours" },
    { label: "金好運專線時數", key: "金好運專線", source: "lines", format: "hours" }
];
const TREND_AGENT_COLORS = [
    { color: "#185FA5", bg: "#E6F1FB", tc: "#0C447C" },
    { color: "#3B6D11", bg: "#EAF3DE", tc: "#27500A" },
    { color: "#BA7517", bg: "#FAEEDA", tc: "#633806" },
    { color: "#534AB7", bg: "#EEEDFE", tc: "#3C3489" },
    { color: "#993556", bg: "#FBEAF0", tc: "#72243E" },
    { color: "#0F6E56", bg: "#E1F5EE", tc: "#085041" },
    { color: "#993C1D", bg: "#FAECE7", tc: "#4A1B0C" },
    { color: "#5F5E5A", bg: "#F1EFE8", tc: "#2C2C2A" },
];
const TREND_DASH_PATTERNS = [[], [6, 3], [3, 3], [8, 3, 2, 3], [4, 2], [10, 3], [2, 2], [7, 2, 2, 2]];
const formatPercent = (n) => `${Number(n || 0).toFixed(2)}%`;
const formatToHours = (seconds) => (Number(seconds || 0) / 3600).toFixed(2);
const formatDurationClock = (seconds) => {
    const total = Math.round(Number(seconds || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mmss = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return h > 0 ? `${h}:${mmss}` : mmss;
};
const normalizeMonthKey = (value) => { if (!value)
    return ""; const m = String(value).trim().match(/^(\d{4})[-\/](\d{1,2})$/); if (!m)
    return ""; return `${m[1]}-${String(m[2]).padStart(2, "0")}`; };
const parseNameList = (text) => String(text || "").split(/[、,，\n]/).map((s) => s.trim()).filter(Boolean);
const stringifyNameList = (arr) => (arr || []).join("、");
const formatDateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const formatCustomDate = (dateStr) => { if (!dateStr)
    return ""; const parts = String(dateStr).split(/[-/]/); if (parts.length >= 3)
    return `${parts[0]}/${parseInt(parts[1], 10)}/${parseInt(parts[2], 10)}`; return dateStr; };
const normalizeDateKey = (dateStr) => {
    const m = String(dateStr || "").trim().match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    return m ? `${m[1]}-${String(Number(m[2])).padStart(2, "0")}-${String(Number(m[3])).padStart(2, "0")}` : "";
};
const getHolidayInfo = (dateStr) => {
    const key = normalizeDateKey(dateStr);
    return key && window.TWHolidayCalendar && window.TWHolidayCalendar.days ? window.TWHolidayCalendar.days[key] || null : null;
};
// V42.6：缺日的說明文字。連續的日子合成一段；缺的日子全是國定假日時，註明「可能本來就沒電話」。
const describeMissingDates = (gap) => {
    const [y1, m1, d1] = gap.start.split("-").map(Number), [y2, m2, d2] = gap.end.split("-").map(Number);
    const range = gap.start === gap.end ? `${y1}/${m1}/${d1}` : y1 === y2 ? `${y1}/${m1}/${d1}～${m2}/${d2}` : `${y1}/${m1}/${d1}～${y2}/${m2}/${d2}`;
    const names = [];
    let holidayDays = 0;
    for (let d = new Date(`${gap.start}T12:00:00`); d <= new Date(`${gap.end}T12:00:00`); d.setDate(d.getDate() + 1)) {
        const info = getHolidayInfo(formatDateKey(d));
        if (info && info.isHoliday) { holidayDays += 1; if (info.name && !names.includes(info.name)) names.push(info.name); }
    }
    const holidayText = !names.length ? "" : holidayDays === gap.days ? `，${names.join("、")}：國定假日，可能本來就沒電話` : `，其中有${names.join("、")}`;
    return { text: `${range}（${gap.days} 天${holidayText}）`, allHoliday: holidayDays === gap.days };
};
const HolidayBadge = ({ date }) => {
    const info = getHolidayInfo(date);
    if (!info)
        return null;
    const isHoliday = info.isHoliday !== false;
    return React.createElement("span", { title: `${info.name}${info.description ? `｜${info.description}` : ""}`, style: { display: "inline-block", marginLeft: "5px", maxWidth: "92px", overflow: "hidden", textOverflow: "ellipsis", padding: "1px 5px", borderRadius: "999px", background: isHoliday ? "#fef2f2" : "#eff6ff", color: isHoliday ? "#b91c1c" : "#1d4ed8", border: `1px solid ${isHoliday ? "#fecaca" : "#bfdbfe"}`, fontSize: "10px", fontWeight: "700", lineHeight: 1.45, verticalAlign: "middle", whiteSpace: "nowrap" } }, info.name);
};
const getWeekRangeLabelFromKey = (weekKey) => {
    const m = String(weekKey || "").match(/^(\d{4})-W(\d{2})$/);
    if (!m)
        return "";
    const year = Number(m[1]);
    const weekNo = Number(m[2]);
    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay() || 7;
    const firstWeekMonday = new Date(jan4);
    firstWeekMonday.setDate(jan4.getDate() - jan4Day + 1);
    const monday = new Date(firstWeekMonday);
    monday.setDate(firstWeekMonday.getDate() + (weekNo - 1) * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return `${monday.getFullYear()}/${monday.getMonth() + 1}/${monday.getDate()}～${sunday.getFullYear()}/${sunday.getMonth() + 1}/${sunday.getDate()}`;
};
const normalizeWeekLabelRange = (weekLabel = "") => String(weekLabel || "").trim().replace(/\s*~\s*/g, "～");
const formatWeekKeyZh = (weekKey) => {
    const m = String(weekKey || "").match(/^(\d{4})-W(\d{2})$/);
    if (!m)
        return weekKey || "";
    const range = getWeekRangeLabelFromKey(weekKey);
    return `${m[1]}年第${parseInt(m[2], 10)}週${range ? `（${range}）` : ""}`;
};
const formatWeekDisplay = (weekKey, weekLabel = "") => {
    const zh = formatWeekKeyZh(weekKey);
    const range = normalizeWeekLabelRange(weekLabel) || getWeekRangeLabelFromKey(weekKey);
    if (!range || zh.includes("（"))
        return zh;
    return `${zh}（${range}）`;
};
const formatMonthDisplay = (monthKey = "") => { const m = String(monthKey || "").match(/^(\d{4})-(\d{2})$/); if (!m)
    return monthKey || ""; return `${m[1]}年${m[2]}月`; };
const formatYearDisplay = (yearKey = "") => yearKey ? `${yearKey}年` : "";
const toDate = (dateStr, timeStr = "00:00:00") => { if (!dateStr)
    return null; const safeDate = String(dateStr).replace(/\//g, "-"); const safeTime = timeStr || "00:00:00"; const dt = new Date(`${safeDate}T${safeTime.length === 5 ? safeTime + ":00" : safeTime}`); return Number.isNaN(dt.getTime()) ? null : dt; };
const getWeekInfo = (dateStr, timeStr = "00:00:00") => {
    const dt = toDate(dateStr, timeStr);
    if (!dt)
        return null;
    const clone = new Date(dt);
    clone.setHours(0, 0, 0, 0);
    const day = clone.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(clone);
    monday.setDate(clone.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const firstThursday = new Date(monday);
    firstThursday.setDate(monday.getDate() + 3);
    const weekYear = firstThursday.getFullYear();
    const jan4 = new Date(weekYear, 0, 4);
    const jan4Day = jan4.getDay() || 7;
    const firstWeekMonday = new Date(jan4);
    firstWeekMonday.setDate(jan4.getDate() - jan4Day + 1);
    const weekNo = Math.floor((monday - firstWeekMonday) / 604800000) + 1;
    return {
        weekKey: `${weekYear}-W${String(weekNo).padStart(2, "0")}`,
        weekLabel: `${monday.getFullYear()}/${monday.getMonth() + 1}/${monday.getDate()} ~ ${sunday.getFullYear()}/${sunday.getMonth() + 1}/${sunday.getDate()}`,
        monday: formatDateKey(monday),
        sunday: formatDateKey(sunday)
    };
};
const getCalendarMonthKey = (dateStr) => { if (!dateStr)
    return ""; const safe = String(dateStr).replace(/\//g, "-"); const m = safe.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); return m ? `${m[1]}-${String(m[2]).padStart(2, "0")}` : ""; };
const getCalendarYearKey = (dateStr) => { if (!dateStr)
    return ""; const safe = String(dateStr).replace(/\//g, "-"); const m = safe.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); return m ? m[1] : ""; };
const isValidCalendarDate = (dateStr) => {
    const safe = String(dateStr || "").replace(/\//g, "-");
    const m = safe.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!m)
        return false;
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31)
        return false;
    const dt = new Date(y, mo - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
};
const getPeriodKeyForDate = (dateStr, viewType) => {
    if (!dateStr)
        return "";
    if (viewType === "weeks") {
        const info = getWeekInfo(dateStr);
        return info ? info.weekKey : "";
    }
    if (viewType === "months")
        return getCalendarMonthKey(dateStr);
    return getCalendarYearKey(dateStr);
};
const normalizePeriodKeyInput = (raw) => {
    const v = String(raw || "").trim();
    if (!v)
        return "";
    const week = v.match(/^(\d{4})-?[wW](\d{1,2})$/);
    if (week) {
        const weekNo = Number(week[2]);
        if (weekNo < 1 || weekNo > 53)
            return null;
        return `${week[1]}-W${week[2].padStart(2, "0")}`;
    }
    const month = v.match(/^(\d{4})[-\/.](\d{1,2})$/);
    if (month) {
        const monthNo = Number(month[2]);
        if (monthNo < 1 || monthNo > 12)
            return null;
        return `${month[1]}-${month[2].padStart(2, "0")}`;
    }
    const year = v.match(/^(\d{4})$/);
    if (year)
        return year[1];
    return null;
};
const keyToDateRange = (key) => {
    const v = String(key || "").trim();
    let m = v.match(/^(\d{4})-W(\d{2})$/);
    if (m) {
        const year = Number(m[1]), weekNo = Number(m[2]);
        const jan4 = new Date(year, 0, 4);
        const jan4Day = jan4.getDay() || 7;
        const firstWeekMonday = new Date(jan4);
        firstWeekMonday.setDate(jan4.getDate() - jan4Day + 1);
        const monday = new Date(firstWeekMonday);
        monday.setDate(firstWeekMonday.getDate() + (weekNo - 1) * 7);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        return { start: formatDateKey(monday), end: formatDateKey(sunday) };
    }
    m = v.match(/^(\d{4})-(\d{2})$/);
    if (m) {
        const year = Number(m[1]), month = Number(m[2]);
        const start = `${year}-${String(month).padStart(2, "0")}-01`;
        const lastDay = new Date(year, month, 0);
        return { start, end: formatDateKey(lastDay) };
    }
    m = v.match(/^(\d{4})$/);
    if (m)
        return { start: `${m[1]}-01-01`, end: `${m[1]}-12-31` };
    return null;
};
const isAgentEffectiveForPeriod = (agentName, periodKey, periodType, effectiveRules) => {
    const name = String(agentName || "").trim();
    if (!name)
        return false;
    const rule = (effectiveRules || {})[name];
    if (!rule)
        return true;
    const currentRange = keyToDateRange(periodKey);
    if (!currentRange)
        return true;
    if (rule.start) {
        const startRange = keyToDateRange(rule.start);
        if (startRange && currentRange.end < startRange.start)
            return false;
    }
    if (rule.end) {
        const endRange = keyToDateRange(rule.end);
        if (endRange && currentRange.start > endRange.end)
            return false;
    }
    return true;
};
const isAgentEffectiveForRow = (agentName, row, effectiveRules) => {
    if (!row)
        return false;
    // V42.5：有日期時用「電話當天」判斷。原本用整週判斷，有效期間設到 9 月時，10/1（跟 9/29 同一週）會被當成還在期間內。
    const day = normalizeDateKey(row.date || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
        const name = String(agentName || "").trim();
        if (!name) return false;
        const rule = (effectiveRules || {})[name];
        if (!rule) return true;
        const startRange = rule.start ? keyToDateRange(rule.start) : null;
        const endRange = rule.end ? keyToDateRange(rule.end) : null;
        if (startRange && day < startRange.start) return false;
        if (endRange && day > endRange.end) return false;
        return true;
    }
    if (row.weekKey)
        return isAgentEffectiveForPeriod(agentName, row.weekKey, "weeks", effectiveRules);
    if (row.monthKey)
        return isAgentEffectiveForPeriod(agentName, row.monthKey, "months", effectiveRules);
    if (row.yearKey)
        return isAgentEffectiveForPeriod(agentName, row.yearKey, "years", effectiveRules);
    return true;
};
const parseDuration = (val) => window.V41Core.parseDuration(val);
const normalizeHeaderText = (s) => String(s || "").trim().replace(/\s+/g, "").replace(/[：:]/g, "");
const DIRECTION_ALIASES = ["初始方向", "方向", "Initial direction"];
// 有「初始方向」欄位時只收「傳入」；整份檔案沒有這一欄時（已篩好的彙整檔），全部視為傳入。
const hasDirectionColumn = (rawRows) => window.V41Core.hasAnyColumn(rawRows, DIRECTION_ALIASES, normalizeHeaderText);
const isIncomingRow = (data, directionColumn) => !directionColumn || String(data.direction || "").trim() === "傳入";
// 多檔上傳時每個檔案各自判斷有沒有「初始方向」欄位，結果記在每一列上（Symbol 不會被當成欄位讀到）。
const DIRECTION_FLAG = Symbol("hasDirectionColumn");
const tagDirectionColumn = (rawRows) => { const has = hasDirectionColumn(rawRows); rawRows.forEach((row) => { row[DIRECTION_FLAG] = has; }); return has; };
const rowHasDirection = (raw, fallback) => raw && typeof raw[DIRECTION_FLAG] === "boolean" ? raw[DIRECTION_FLAG] : fallback;
// 記下每一列來自哪個檔案、第幾列（Excel／CSV 的實際列號，標題在第 1 列）。
const SOURCE_FILE = Symbol("sourceFile");
const SOURCE_ROW = Symbol("sourceRow");
const tagSourceLocation = (rawRows, fileName) => { rawRows.forEach((row, i) => { row[SOURCE_FILE] = fileName; row[SOURCE_ROW] = typeof row.__rowNum__ === "number" ? row.__rowNum__ + 1 : i + 2; }); };
const isSupportedUploadFile = (file) => /\.(csv|xlsx|xls)$/i.test(String((file && file.name) || ""));
const getRowValueByAliases = (rawRow) => {
    const headers = Object.keys(rawRow || {});
    const indexMap = {};
    headers.forEach((h) => { indexMap[normalizeHeaderText(h)] = h; });
    const pick = (names) => { for (const n of names) {
        const hit = indexMap[normalizeHeaderText(n)];
        if (hit != null)
            return rawRow[hit];
    } return ""; };
    return {
        direction: pick(DIRECTION_ALIASES),
        datetime: pick(["日期", "日期時間", "Date"]),
        agent: pick(["使用者 - 已互動", "使用者-已互動", "使用者", "客服名稱"]),
        line: pick(["第一佇列", "佇列", "遊戲專線", "第一字句"]),
        handleTime: pick(["總處理時間", "處理時間"]),
        speakTime: pick(["總發話時間", "通話時長"]),
        tags: pick(["外部標籤", "滿意度"]),
        dialogId: pick(["對話 ID", "對話ID"])
    };
};
const parseDateTimeValue = (value) => {
    if (value == null || value === "")
        return { date: "", time: "" };
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        // Excel 時間是浮點數，讀進來常差 1 毫秒（10:20 變 10:19:59.999），先四捨五入到整秒，避免整點或午夜被算到前一小時／前一天。
        const d = new Date(Math.round(value.getTime() / 1000) * 1000);
        return { date: formatDateKey(d), time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}` };
    }
    if (typeof value === "number" && window.XLSX && window.XLSX.SSF) {
        try {
            const parsed = window.XLSX.SSF.parse_date_code(value);
            if (parsed)
                return { date: `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`, time: `${String(parsed.H || 0).padStart(2, "0")}:${String(parsed.M || 0).padStart(2, "0")}:${String(Math.floor(parsed.S || 0)).padStart(2, "0")}` };
        }
        catch (e) { }
    }
    const raw = String(value || "").trim();
    if (!raw)
        return { date: "", time: "" };
    const normalized = raw.replace(/-/g, "/");
    const parts = normalized.split(/\s+/);
    let dateStr = parts[0];
    let timeStr = parts.length >= 2 ? parts[1].slice(0, 8) : "";
    const dParts = dateStr.split("/");
    if (dParts.length === 3)
        dateStr = `${dParts[0]}-${String(dParts[1]).padStart(2, "0")}-${String(dParts[2]).padStart(2, "0")}`;
    else
        dateStr = dateStr.replace(/\//g, "-");
    if (timeStr && timeStr.length === 5)
        timeStr += ":00";
    return { date: dateStr, time: timeStr };
};
const normalizeLineName = (value) => {
    const raw = String(value || "").trim();
    if (!raw)
        return "";
    const v = raw.replace(/^\d+[_-]?/, "");
    if (v.includes("GT"))
        return "GT專線";
    if (v.includes("儲值"))
        return "儲值專線";
    if (v.includes("滿貫"))
        return "滿貫專線";
    if (v.includes("金好運"))
        return "金好運專線";
    return v.endsWith("專線") ? v : `${v}專線`;
};
// 第一佇列有沒有「專線名稱」：空白，或只有電話號碼（含 tel:／sip: 開頭），都算沒有。
const queueHasLineName = (value) => { const t = String(value || "").trim(); return !!t && !/^((tel|sips?):)?[\s+\-()\d]+$/i.test(t); };
// 專線名稱規則（2026-09-29 使用者訂定）：
// 1. 第一佇列有專線名稱 → 用第一佇列。
// 2. 第一佇列沒有專線名稱、且「使用者 - 已互動」沒有客服名字（漏接）→ 用 DNIS（或第一佇列本身）的號碼對照專線名稱（V39Core.DEFAULT_LINE_PHONES）。
// 3. 第一佇列沒有專線名稱、但有客服名字 → 不補專線（維持未分類），並在驗證報告列出警示。
const resolveLineName = (value, rawRow, agent) => {
    if (queueHasLineName(value))
        return normalizeLineName(value);
    if (String(agent || "").trim())
        return "";
    const byPhone = window.V41Core.lineFromPhone(value) || window.V41Core.lineFromRowPhones(rawRow || {});
    return byPhone ? normalizeLineName(byPhone) : "";
};
const normalizeSurveyAnswer = (value) => { const t = String(value || "").trim(); return VALID_SURVEY.includes(t) ? t : "未回答"; };
const extractSatisfaction = (tagText) => {
    const text = String(tagText || "").trim();
    let q1 = "", q2 = "";
    if (text) {
        const parts = text.split(/[;,，]/).map((v) => v.trim()).filter(Boolean);
        for (const p of parts) {
            const m1 = p.match(/^問題?1(.+)$/);
            const m2 = p.match(/^問題?2(.+)$/);
            if (m1)
                q1 = m1[1].trim();
            if (m2)
                q2 = m2[1].trim();
        }
    }
    return { q1: normalizeSurveyAnswer(q1), q2: normalizeSurveyAnswer(q2) };
};
const makeRowUniqueKey = (row) => {
    const id = String(row.id || "").trim();
    if (id)
        return id;
    return [String(row.agent || "").trim(), String(row.date || "").trim(), String(row.time || "").trim(), String(row.line || "").trim(), String(row.q1 || "").trim(), String(row.q2 || "").trim()].join("||");
};
const dedupeRows = (rows = []) => { const map = new Map(); rows.forEach((row) => { const key = makeRowUniqueKey(row); const current = map.get(key); if (!current || (!String(current.agent || "").trim() && String(row.agent || "").trim()))
    map.set(key, row); }); return Array.from(map.values()).map((row) => ({ ...row, callOutcome: String(row.agent || "").trim() ? "answered" : "missed" })); };
const { findMissingWeekKeys, weightedSurveySummary, consolidateCalls, summarizeMissedCalls, RISK_RULES, classifyOperationalRisk, comparisonRange, comparisonCoverage } = window.V41Core;
const parseSimpleCsvLine = (line) => { const result = []; let cur = "", inQuotes = false; for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
        }
        else
            inQuotes = !inQuotes;
    }
    else if (ch === "," && !inQuotes) {
        result.push(cur);
        cur = "";
    }
    else
        cur += ch;
} result.push(cur); return result; };
// \u6BCF\u4E00\u5217\u8A18\u4E0B\u539F\u6A94\u7684\u5217\u865F\uFF08__rowNum__\uFF0C\u5F9E 0 \u8D77\u7B97\uFF0C\u8207 SheetJS \u8B80 Excel \u7684\u505A\u6CD5\u4E00\u81F4\uFF1B\u4E0D\u6703\u88AB\u7576\u6210\u6B04\u4F4D\u8B80\u5230\uFF09\uFF0C\u4F9B\u9A57\u8B49\u5831\u544A\u6307\u51FA\u91CD\u8907\u8CC7\u6599\u5728\u7B2C\u5E7E\u5217\u3002
const parseSimpleCsv = (text) => { const lines = String(text || "").replace(/^\uFEFF/, "").split(/\r?\n/).map((line, index) => ({ line, index })).filter((item) => item.line); if (!lines.length)
    return []; const headers = parseSimpleCsvLine(lines[0].line); return lines.slice(1).map(({ line, index }) => { const cols = parseSimpleCsvLine(line); const obj = {}; headers.forEach((h, i) => { var _a; obj[h] = (_a = cols[i]) !== null && _a !== void 0 ? _a : ""; }); Object.defineProperty(obj, "__rowNum__", { value: index, enumerable: false }); return obj; }); };
const readSpreadsheetRows = async (file) => {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (ext === "csv")
        return parseSimpleCsv(await file.text());
    if (ext === "xlsx" || ext === "xls") {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = window.XLSX.read(arrayBuffer, { type: "array", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName)
            return [];
        const sheet = workbook.Sheets[firstSheetName];
        return window.XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });
    }
    throw new Error("不支援的檔案格式");
};
const buildSummaryRowsFromSource = (rows = [], type = "speak") => {
    const map = new Map();
    const durationKey = type === "handle" ? "handleDuration" : "speakDuration";
    rows.forEach((row) => {
        const agent = row.agent || "";
        if (!agent)
            return;
        if (!map.has(agent))
            map.set(agent, { "客服名稱": agent, "班別": row.shift || "", "GT專線": 0, "儲值專線": 0, "GT+儲值專線": 0, "滿貫專線": 0, "金好運專線": 0, "未分類": 0, "總計": 0 });
        const target = map.get(agent);
        target["班別"] = target["班別"] || row.shift || "";
        const sec = Number(row[durationKey] || 0);
        if ((row.line || "").includes("GT")) {
            target["GT專線"] += sec;
            target["GT+儲值專線"] += sec;
        }
        if ((row.line || "").includes("儲值")) {
            target["儲值專線"] += sec;
            target["GT+儲值專線"] += sec;
        }
        if ((row.line || "").includes("滿貫"))
            target["滿貫專線"] += sec;
        if ((row.line || "").includes("金好運"))
            target["金好運專線"] += sec;
        if (!/GT|儲值|滿貫|金好運/.test(row.line || ""))
            target["未分類"] += sec;
        target["總計"] += sec;
    });
    return Array.from(map.values()).sort((a, b) => a["客服名稱"].localeCompare(b["客服名稱"], "zh-Hant"));
};
const summarizePreviewRows = (rows = []) => ({ detailRows: rows, handleRows: buildSummaryRowsFromSource(rows, "handle"), speakRows: buildSummaryRowsFromSource(rows, "speak") });
const paginateRows = (rows = [], page = 1, pageSize = 100) => {
    const safePageSize = Number(pageSize || 100);
    const totalPages = Math.max(1, Math.ceil((rows || []).length / safePageSize));
    const safePage = Math.min(Math.max(Number(page || 1), 1), totalPages);
    const start = (safePage - 1) * safePageSize;
    return { rows: rows.slice(start, start + safePageSize), safePage, totalPages, start };
};
// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Icon({ name, size = 18, className = "" }) {
    const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className, "aria-hidden": "true" };
    if (name === "cloud")
        return React.createElement("svg", { ...common },
            React.createElement("path", { d: "M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z" }));
    if (name === "refresh")
        return React.createElement("svg", { ...common },
            React.createElement("path", { d: "M21 12a9 9 0 0 0-15-6.7L3 8" }),
            React.createElement("path", { d: "M3 3v5h5" }),
            React.createElement("path", { d: "M3 12a9 9 0 0 0 15 6.7L21 16" }),
            React.createElement("path", { d: "M21 21v-5h-5" }));
    if (name === "upload")
        return React.createElement("svg", { ...common },
            React.createElement("path", { d: "M12 13v8" }),
            React.createElement("path", { d: "m8 17 4-4 4 4" }),
            React.createElement("path", { d: "M20.4 17.5A5 5 0 0 0 18 8h-1.3A7 7 0 1 0 5 15.5" }));
    if (name === "trash")
        return React.createElement("svg", { ...common },
            React.createElement("path", { d: "M3 6h18" }),
            React.createElement("path", { d: "M8 6V4h8v2" }),
            React.createElement("path", { d: "M19 6l-1 14H6L5 6" }),
            React.createElement("path", { d: "M10 11v6" }),
            React.createElement("path", { d: "M14 11v6" }));
    if (name === "list")
        return React.createElement("svg", { ...common },
            React.createElement("path", { d: "M8 6h13" }),
            React.createElement("path", { d: "M8 12h13" }),
            React.createElement("path", { d: "M8 18h13" }),
            React.createElement("path", { d: "M3 6h.01" }),
            React.createElement("path", { d: "M3 12h.01" }),
            React.createElement("path", { d: "M3 18h.01" }));
    if (name === "users")
        return React.createElement("svg", { ...common },
            React.createElement("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }),
            React.createElement("circle", { cx: "9", cy: "7", r: "4" }),
            React.createElement("path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }),
            React.createElement("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" }));
    if (name === "chart")
        return React.createElement("svg", { ...common },
            React.createElement("path", { d: "M3 3v18h18" }),
            React.createElement("path", { d: "m19 9-5 5-4-4-3 3" }));
    if (name === "db")
        return React.createElement("svg", { ...common },
            React.createElement("ellipse", { cx: "12", cy: "5", rx: "9", ry: "3" }),
            React.createElement("path", { d: "M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" }),
            React.createElement("path", { d: "M3 12c0 1.7 4 3 9 3s9-1.3 9-3" }));
    if (name === "download")
        return React.createElement("svg", { ...common },
            React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
            React.createElement("path", { d: "M7 10l5 5 5-5" }),
            React.createElement("path", { d: "M12 15V3" }));
    if (name === "history")
        return React.createElement("svg", { ...common },
            React.createElement("path", { d: "M3 12a9 9 0 1 0 3-6.7" }),
            React.createElement("path", { d: "M3 4v5h5" }),
            React.createElement("path", { d: "M12 7v5l4 2" }));
    if (name === "search")
        return React.createElement("svg", { ...common },
            React.createElement("circle", { cx: "11", cy: "11", r: "7" }),
            React.createElement("path", { d: "m21 21-4.3-4.3" }));
    return React.createElement("svg", { ...common },
        React.createElement("circle", { cx: "12", cy: "12", r: "9" }));
}
// ─── CRM DESIGN SYSTEM CONSTANTS ──────────────────────────────────────────────
const CRM = {
    card: { background: "var(--surface)", border: "0.5px solid var(--line)", borderRadius: "var(--radius-md)", overflow: "hidden", boxShadow: "var(--shadow-sm)" },
    cardLg: { background: "var(--surface)", border: "0.5px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-sm)" },
    hdr: { padding: "13px 20px", borderBottom: "0.5px solid var(--line-soft)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" },
    title: { fontSize: "11px", fontWeight: "700", color: "var(--ink-500)", letterSpacing: ".06em", textTransform: "uppercase" },
    body: { padding: "16px 20px" },
    kpi: { background: "var(--bg)", borderRadius: "8px", padding: "14px 16px", border: "0.5px solid var(--line-soft)" },
    th: { padding: "9px 14px", fontWeight: "700", color: "var(--ink-500)", background: "var(--bg)", borderBottom: "0.5px solid var(--line)", whiteSpace: "nowrap", fontSize: "11px", letterSpacing: ".02em", textAlign: "center" },
    td: { padding: "9px 14px", borderBottom: "0.5px solid var(--bg)", fontSize: "13px", textAlign: "center", color: "var(--ink-700)" },
    btn: (active) => ({ padding: "6px 16px", borderRadius: "7px", border: "0.5px solid var(--line)", background: active ? "var(--ink-900)" : "var(--surface)", color: active ? "#fff" : "var(--ink-500)", fontSize: "12px", fontWeight: active ? "600" : "400", cursor: "pointer", fontFamily: "inherit", transition: "all .15s", whiteSpace: "nowrap" }),
    btnPrimary: { padding: "8px 18px", borderRadius: "8px", border: "none", background: "var(--brand)", color: "#fff", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
    btnDanger: { padding: "8px 18px", borderRadius: "8px", border: "none", background: "#ef4444", color: "#fff", fontSize: "13px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" },
    btnGhost: { padding: "8px 18px", borderRadius: "8px", border: "0.5px solid var(--line)", background: "var(--surface)", color: "var(--ink-700)", fontSize: "13px", fontWeight: "500", cursor: "pointer", fontFamily: "inherit" },
    badge: (bg, tc) => ({ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "600", background: bg, color: tc, whiteSpace: "nowrap" }),
    input: { padding: "8px 12px", borderRadius: "8px", border: "0.5px solid var(--line)", background: "var(--surface)", color: "#1e293b", fontSize: "13px", fontFamily: "inherit", outline: "none", width: "100%" },
    select: { padding: "7px 10px", borderRadius: "8px", border: "0.5px solid var(--line)", background: "var(--surface)", color: "#1e293b", fontSize: "13px", fontFamily: "inherit", outline: "none", cursor: "pointer" },
    SHIFT: { "早班": { bg: "#eff6ff", tc: "#1e40af" }, "中班": { bg: "#f0fdf4", tc: "#14532d" }, "晚班": { bg: "#fff7ed", tc: "#9a3412" } },
};
// ─── V41：比例欄位的顏色依「門檻與目標設定」的目標值（達標綠、未達紅、沒設目標深灰、沒有資料淺灰）─────
const METRIC_TARGET_KEY = { q1VerySatRate: "q1Rate", q2VerySatRate: "q2Rate", q1SurRate: "q1SurveyRate", q2SurRate: "q2SurveyRate", "人員非常滿意度(Q1)": "q1Rate", "問題非常滿意度(Q2)": "q2Rate", "人員調查率(Q1)": "q1SurveyRate", "問題調查率(Q2)": "q2SurveyRate" };
const targetColor = (value, metricKey, targets) => {
    if (value == null) return "#94a3b8";
    const t = targets ? targets[METRIC_TARGET_KEY[metricKey]] : null;
    if (t == null || t === "" || !Number.isFinite(Number(t))) return "#334155";
    return Number(value) >= Number(t) ? "#15803d" : "#dc2626";
};
// ─── 可收合卡片（V39.2）──────────────────────────────────────────────────────
// 報表頁的卡片：第一個子元素是標題列（CRM.hdr），其餘是內容。標題列右側加「收合／展開」按鈕。
// 收合時只把內容藏起來（display:none），不移除，所以圖表、分頁、篩選等狀態都保留。
// 頁面上方「全部展開／全部收合」發出瀏覽器事件 REPORT_COLLAPSE_EVENT（detail = "open" 或 "closed"），目前頁面上的每張卡片都會收到。
const REPORT_COLLAPSE_EVENT = "weekly-call-report-collapse";
function CollapsibleCard({ style, children }) {
    const [open, setOpen] = useState(true);
    useEffect(() => {
        const handler = (e) => setOpen(e.detail === "open");
        window.addEventListener(REPORT_COLLAPSE_EVENT, handler);
        return () => window.removeEventListener(REPORT_COLLAPSE_EVENT, handler);
    }, []);
    const kids = React.Children.toArray(children);
    const header = kids[0], body = kids.slice(1);
    if (!header || !React.isValidElement(header)) return React.createElement("div", { style }, children);
    const headerKids = React.Children.toArray(header.props.children);
    const toggle = React.createElement("button", { type: "button", onClick: () => setOpen((v) => !v), "aria-expanded": open, title: open ? "收合這一區" : "展開這一區", style: { border: "0.5px solid var(--line)", background: "var(--surface)", color: "var(--ink-500)", borderRadius: "6px", padding: "2px 8px", fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit" } }, open ? "收合 ▲" : "展開 ▼");
    const newHeader = React.cloneElement(header, { style: { ...header.props.style, borderBottom: open ? (header.props.style || {}).borderBottom : "none" } },
        headerKids[0],
        React.createElement("span", { style: { display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto", flexWrap: "wrap", justifyContent: "flex-end" } }, ...headerKids.slice(1), toggle));
    return React.createElement("div", { style }, newHeader, React.createElement("div", { style: { display: open ? "block" : "none" } }, ...body));
}
// 報表頁上方的「全部展開／全部收合」。
function CollapseAllBar() {
    const send = (mode) => window.dispatchEvent(new CustomEvent(REPORT_COLLAPSE_EVENT, { detail: mode }));
    const btn = { border: "0.5px solid var(--line)", background: "var(--surface)", color: "var(--ink-700)", borderRadius: "7px", padding: "5px 12px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" };
    return React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "6px", marginBottom: "-6px" } },
        React.createElement("button", { type: "button", onClick: () => send("open"), style: btn }, "▼ 全部展開"),
        React.createElement("button", { type: "button", onClick: () => send("closed"), style: btn }, "▲ 全部收合"));
}
// ─── CRM TABLE: shared detail rows component ──────────────────────────────────
function CrmTableRows({ rows, start = 0 }) {
    const cols = ["客服名稱", "接聽狀態", "班別", "日期", "時間", "專線", "人員滿意(Q1)", "問題滿意(Q2)", "對話ID", "總發話時間", "總處理時間"];
    // 固定各欄寬度比例(對話ID是UUID需要較寬,其餘欄位內容都很短),避免短內容被瀏覽器預設的自動版面硬撐開、兩側留一大片空白。
    const colWidths = ["9%", "7%", "7%", "9%", "7%", "10%", "9%", "9%", "18%", "8%", "8%"];
    const td0 = { ...CRM.td, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
    return (React.createElement("div", { style: { overflowX: "auto" } },
        React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "13px", tableLayout: "fixed" } },
            React.createElement("colgroup", null, colWidths.map((w, i) => React.createElement("col", { key: cols[i], style: { width: w } }))),
            React.createElement("thead", null,
                React.createElement("tr", null, cols.map(c => React.createElement("th", { key: c, style: CRM.th }, c)))),
            React.createElement("tbody", null, rows.length === 0 ? (React.createElement("tr", null,
                React.createElement("td", { colSpan: cols.length, style: { ...CRM.td, padding: "40px", color: "#94a3b8", textAlign: "center" } }, "\u5C1A\u7121\u8CC7\u6599"))) : rows.map((r, i) => {
                const idx = start + i;
                const sc = CRM.SHIFT[r.shift] || { bg: "#f1f5f9", tc: "#64748b" };
                return (React.createElement("tr", { key: `${r.id || idx}-${idx}`, style: { background: idx % 2 === 0 ? "#fff" : "#f9fafb" }, onMouseEnter: e => e.currentTarget.style.background = "#f0f9ff", onMouseLeave: e => e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#f9fafb" },
                    React.createElement("td", { style: { ...td0, textAlign: "left", fontWeight: "500", color: "#1e293b" } }, r.agent || "—"),
                    React.createElement("td", { style: td0 }, React.createElement("span", { style: CRM.badge(r.agent ? "#f0fdf4" : "#fef2f2", r.agent ? "#15803d" : "#b91c1c") }, r.agent ? "已接聽" : "漏接")),
                    React.createElement("td", { style: td0 }, r.shift ? React.createElement("span", { style: CRM.badge(sc.bg, sc.tc) }, r.shift) : "—"),
                    React.createElement("td", { style: td0 }, formatCustomDate(r.date), React.createElement(HolidayBadge, { date: r.date })),
                    React.createElement("td", { style: td0 }, r.time),
                    React.createElement("td", { style: td0 }, r.line || "未分類"),
                    React.createElement("td", { style: td0 }, r.q1),
                    React.createElement("td", { style: td0 }, r.q2),
                    React.createElement("td", { style: { ...td0, textAlign: "left", fontSize: "11px", color: "#94a3b8", fontFamily: "monospace" } }, r.id),
                    React.createElement("td", { style: { ...td0, fontFamily: "monospace" } }, formatDurationClock(r.speakDuration)),
                    React.createElement("td", { style: { ...td0, fontFamily: "monospace" } }, formatDurationClock(r.handleDuration))));
            })))));
}
// ─── CRM PAGINATION ───────────────────────────────────────────────────────────
function CrmPagination({ total, page, pageSize, onPageChange, onPageSizeChange }) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const start = total ? (safePage - 1) * pageSize + 1 : 0;
    const end = Math.min(total, safePage * pageSize);
    const PBtn = ({ label, disabled, onClick }) => (React.createElement("button", { type: "button", disabled: disabled, onClick: onClick, style: { padding: "5px 12px", borderRadius: "6px", border: "0.5px solid #e2e8f0", background: disabled ? "#f8fafc" : "#fff", color: disabled ? "#cbd5e1" : "#475569", fontSize: "12px", cursor: disabled ? "default" : "pointer", fontFamily: "inherit" } }, label));
    return (React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "0.5px solid #f1f5f9", flexWrap: "wrap", gap: "8px" } },
        React.createElement("span", { style: { fontSize: "12px", color: "#94a3b8" } },
            "\u986F\u793A ",
            start,
            "\u2013",
            end,
            " / \u5171 ",
            total,
            " \u7B46"),
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" } },
            React.createElement("span", { style: { fontSize: "12px", color: "#64748b" } }, "\u6BCF\u9801"),
            React.createElement("select", { value: pageSize, onChange: e => { onPageSizeChange(+e.target.value); onPageChange(1); }, style: { ...CRM.select, padding: "4px 8px", fontSize: "12px" } }, [50, 100, 200, 500].map(s => React.createElement("option", { key: s, value: s }, s))),
            React.createElement(PBtn, { label: "\u00AB", disabled: safePage <= 1, onClick: () => onPageChange(1) }),
            React.createElement(PBtn, { label: "\u2039", disabled: safePage <= 1, onClick: () => onPageChange(safePage - 1) }),
            React.createElement("span", { style: { fontSize: "12px", color: "#475569", padding: "0 4px" } },
                safePage,
                " / ",
                totalPages),
            React.createElement(PBtn, { label: "\u203A", disabled: safePage >= totalPages, onClick: () => onPageChange(safePage + 1) }),
            React.createElement(PBtn, { label: "\u00BB", disabled: safePage >= totalPages, onClick: () => onPageChange(totalPages) }))));
}
// ─── CRM SUMMARY TABLE ────────────────────────────────────────────────────────
function CrmSummaryTable({ title, rows }) {
    const headers = SUMMARY_HEADERS;
    return (React.createElement(CollapsibleCard, { style: { ...CRM.cardLg, overflow: "hidden" } },
        React.createElement("div", { style: CRM.hdr },
            React.createElement("span", { style: CRM.title }, title),
            React.createElement("span", { style: CRM.badge("#f0fdf4", "#15803d") },
                rows.length,
                " \u4EBA")),
        React.createElement("div", { style: { overflowX: "auto" } },
            React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "13px" } },
                React.createElement("thead", null,
                    React.createElement("tr", null, headers.map(h => React.createElement("th", { key: h, style: h === "客服名稱" ? { ...CRM.th, textAlign: "left" } : CRM.th }, summaryLabel(h))))),
                React.createElement("tbody", null, rows.length === 0 ? (React.createElement("tr", null,
                    React.createElement("td", { colSpan: headers.length, style: { ...CRM.td, padding: "40px", color: "#94a3b8", textAlign: "center" } }, "\u5C1A\u7121\u8CC7\u6599"))) : rows.map((r, i) => {
                    const sc = CRM.SHIFT[r["班別"]] || { bg: "#f1f5f9", tc: "#64748b" };
                    return (React.createElement("tr", { key: i, style: { background: i % 2 === 0 ? "#fff" : "#f9fafb" }, onMouseEnter: e => e.currentTarget.style.background = "#f0f9ff", onMouseLeave: e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#f9fafb" }, headers.map(h => (React.createElement("td", { key: h, style: h === "客服名稱" ? { ...CRM.td, textAlign: "left", fontWeight: "500", color: "#1e293b" } : CRM.td }, h === "客服名稱" ? r[h] : h === "班別" ? (r[h] ? React.createElement("span", { style: CRM.badge(sc.bg, sc.tc) }, r[h]) : "—") : formatToHours(r[h]))))));
                }))))));
}
// ─── CRM ANALYSIS TABLE ───────────────────────────────────────────────────────
function CrmAnalysisTable({ rows, targets = {} }) {
    // V41：Q1、Q2 分開（拿掉 Q1+Q2 平均的「整體」欄）；「總通話數」改名「接聽數」（這裡只算該客服接起來的電話）；
    // 調查率＝該題回答數 ÷ 該客服接聽數；顏色依「門檻與目標設定」的目標值，沒人回答顯示「—」。
    const cols = [
        { key: "客服名稱", label: "客服人員", pct: false },
        { key: "班別", label: "班別", pct: false },
        { key: "總通話數", label: "接聽數", pct: false },
        { key: "人員非常滿意度(Q1)", label: "人員滿意(Q1)", pct: true },
        { key: "人員調查率(Q1)", label: "人員調查率(Q1)", pct: true },
        { key: "問題非常滿意度(Q2)", label: "問題滿意(Q2)", pct: true },
        { key: "問題調查率(Q2)", label: "問題調查率(Q2)", pct: true },
    ];
    return (React.createElement(CollapsibleCard, { style: { ...CRM.cardLg, overflow: "hidden" } },
        React.createElement("div", { style: CRM.hdr },
            React.createElement("span", { style: CRM.title }, "滿意度分析"),
            React.createElement("span", { style: CRM.badge("#eff6ff", "#1e40af") }, rows.length, " 人")),
        React.createElement("div", { style: { overflowX: "auto" } },
            React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "13px" } },
                React.createElement("thead", null,
                    React.createElement("tr", null, cols.map(c => React.createElement("th", { key: c.key, style: c.key === "客服名稱" ? { ...CRM.th, textAlign: "left" } : CRM.th }, c.label)))),
                React.createElement("tbody", null, rows.length === 0 ? (React.createElement("tr", null,
                    React.createElement("td", { colSpan: cols.length, style: { ...CRM.td, padding: "40px", color: "#94a3b8", textAlign: "center" } }, "尚無資料，請先到「地端資料匯入」匯入檔案"))) : rows.map((r, i) => {
                    const sc = CRM.SHIFT[r["班別"]] || { bg: "#f1f5f9", tc: "#64748b" };
                    return (React.createElement("tr", { key: i, style: { background: i % 2 === 0 ? "#fff" : "#f9fafb" }, onMouseEnter: e => e.currentTarget.style.background = "#f0f9ff", onMouseLeave: e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#f9fafb" }, cols.map(c => {
                        const v = r[c.key];
                        if (c.key === "客服名稱")
                            return React.createElement("td", { key: c.key, style: { ...CRM.td, textAlign: "left", fontWeight: "500", color: "#1e293b" } }, v);
                        if (c.key === "班別")
                            return React.createElement("td", { key: c.key, style: CRM.td }, v ? React.createElement("span", { style: CRM.badge(sc.bg, sc.tc) }, v) : "—");
                        if (c.key === "總通話數")
                            return React.createElement("td", { key: c.key, style: { ...CRM.td, fontWeight: "500" } }, v);
                        if (v == null)
                            return React.createElement("td", { key: c.key, style: { ...CRM.td, color: "#94a3b8" } }, "—");
                        const pct = Number(v) * 100;
                        return (React.createElement("td", { key: c.key, style: CRM.td },
                            React.createElement("span", { style: { fontWeight: "600", color: targetColor(pct, c.key, targets) } }, `${pct.toFixed(1)}%`)));
                    })));
                }))))));
}
// ─── CRM VALIDATION PANEL ─────────────────────────────────────────────────────
function CrmValidationPanel({ report }) {
    var _a, _b, _c, _d;
    if (!report)
        return null;
    const warns = report.warnings || [];
    return (React.createElement(CollapsibleCard, { style: { ...CRM.cardLg, overflow: "hidden" } },
        React.createElement("div", { style: CRM.hdr },
            React.createElement("span", { style: CRM.title }, "\u8CC7\u6599\u9A57\u8B49\u5831\u544A"),
            React.createElement("span", { style: CRM.badge(warns.length ? "#fef3c7" : "#f0fdf4", warns.length ? "#92400e" : "#15803d") }, warns.length ? `⚠ ${warns.length} 項提醒` : "✓ 驗證通過")),
        React.createElement("div", { style: { padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" } },
            React.createElement("div", { className: "rwd-multi-col", style: { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "10px" } }, [
                { l: report.appendedFrom ? "本次上傳原始資料" : "原始資料", v: report.rawCount },
                { l: "其中傳入", v: report.incomingCount },
                { l: report.appendedFrom ? "本次上傳有效（合併後）" : "有效資料（合併後）", v: report.validCount },
                { l: "目前全部資料", v: report.previewCount },
            ].map(k => (React.createElement("div", { key: k.l, style: CRM.kpi },
                React.createElement("div", { style: { fontSize: "10px", fontWeight: "700", color: "#94a3b8", letterSpacing: ".05em", textTransform: "uppercase", marginBottom: "6px" } }, k.l),
                React.createElement("div", { style: { fontSize: "22px", fontWeight: "600", color: "#1e293b" } }, k.v))))),
            React.createElement("div", { className: "rwd-multi-col", style: { display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: "8px", fontSize: "12px", color: "#64748b" } },
                React.createElement("div", { style: { background: "#f8fafc", borderRadius: "7px", padding: "10px 12px" } },
                    "\u65E5\u671F\u7BC4\u570D\uFF1A",
                    React.createElement("span", { style: { fontWeight: "600", color: "#1e293b" } }, report.dateRange || "—")),
                React.createElement("div", { style: { background: "#f8fafc", borderRadius: "7px", padding: "10px 12px" } },
                    "\u6392\u9664\u975E\u50B3\u5165\uFF1A",
                    React.createElement("span", { style: { fontWeight: "600", color: "#1e293b" } },
                        ((_a = report.excluded) === null || _a === void 0 ? void 0 : _a.notIncoming) || 0,
                        " \u7B46")),
                React.createElement("div", { style: { background: "#f8fafc", borderRadius: "7px", padding: "10px 12px" } },
                    "漏接（合併後）：",
                    React.createElement("span", { style: { fontWeight: "600", color: "#1e293b" } },
                        ((_b = report.excluded) === null || _b === void 0 ? void 0 : _b.missingAgent) || 0,
                        " 通")),
                React.createElement("div", { style: { background: "#f8fafc", borderRadius: "7px", padding: "10px 12px" } },
                    "有效期間外（已保留）：",
                    React.createElement("span", { style: { fontWeight: "600", color: "#1e293b" } },
                        ((_c = report.excluded) === null || _c === void 0 ? void 0 : _c.ineffective) || 0,
                        " \u7B46")),
                React.createElement("div", { style: { background: "#f8fafc", borderRadius: "7px", padding: "10px 12px" } },
                    "\u591A\u51FA\u7684\u91CD\u8907\u7D00\u9304\uFF1A",
                    React.createElement("span", { style: { fontWeight: "600", color: "#1e293b" } },
                        ((_d = report.excluded) === null || _d === void 0 ? void 0 : _d.duplicateWithinUpload) || 0,
                        " \u7B46"))),
            (report.files || []).length > 0 && React.createElement("div", { style: { border: "0.5px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" } },
                React.createElement("div", { style: { padding: "10px 14px", background: "#f8fafc", fontSize: "12px", fontWeight: "700", color: "#334155" } }, `\u672C\u6B21\u4E0A\u50B3\u6A94\u6848\uFF08${report.files.length} \u500B\uFF09`, report.appendedFrom ? `\uFF5C\u4F75\u5165\u539F\u6709 ${report.appendedFrom.toLocaleString()} \u7B46\uFF0C\u8207\u539F\u6709\u8CC7\u6599\u91CD\u8907 ${(report.overlapWithExisting || 0).toLocaleString()} \u7B46\u5DF2\u5408\u4F75` : ""),
                React.createElement("div", { style: { overflowX: "auto" } }, React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "12px" } },
                    React.createElement("thead", null, React.createElement("tr", null, ["\u6A94\u6848", "\u539F\u59CB\u7B46\u6578", "\u6709\u6548\u7B46\u6578", "\u65E5\u671F\u7BC4\u570D", "\u521D\u59CB\u65B9\u5411\u6B04\u4F4D", "\u72C0\u614B"].map((h) => React.createElement("th", { key: h, style: { ...CRM.th, whiteSpace: "nowrap" } }, h)))),
                    React.createElement("tbody", null, report.files.map((file, i) => React.createElement("tr", { key: `${file.name}-${i}` },
                        React.createElement("td", { style: { ...CRM.td, wordBreak: "break-all" } }, file.name),
                        React.createElement("td", { style: { ...CRM.td, textAlign: "right" } }, file.error ? "\u2014" : file.rawCount.toLocaleString()),
                        React.createElement("td", { style: { ...CRM.td, textAlign: "right" } }, file.error ? "\u2014" : file.validCount.toLocaleString()),
                        React.createElement("td", { style: { ...CRM.td, whiteSpace: "nowrap" } }, file.error ? "\u2014" : file.dateRange),
                        React.createElement("td", { style: CRM.td }, file.error ? "\u2014" : file.hasDirection ? "\u6709\uFF08\u53EA\u6536\u50B3\u5165\uFF09" : "\u7121\uFF08\u5168\u90E8\u8996\u70BA\u50B3\u5165\uFF09"),
                        React.createElement("td", { style: { ...CRM.td, color: file.error ? "#b91c1c" : file.validCount ? "#15803d" : "#a16207", fontWeight: "700" } }, file.error || (file.validCount ? "\u2713 \u5DF2\u8B80\u53D6" : "\u26A0 \u6C92\u6709\u6709\u6548\u8CC7\u6599")))))))),
            warns.length > 0 && (React.createElement("div", { style: { background: "#fffbeb", border: "0.5px solid #fde68a", borderRadius: "8px", padding: "12px 16px" } }, warns.map((w, i) => React.createElement("div", { key: i, style: { fontSize: "12px", color: "#92400e", lineHeight: "1.8" } },
                "\u26A0 ",
                w)))),
            (report.duplicateGroups || []).length > 0 && React.createElement(DuplicateDetail, { groups: report.duplicateGroups }),
            (report.answeredNoLine || []).length > 0 && React.createElement(AnsweredNoLineDetail, { items: report.answeredNoLine }))));
}
// 已接聽但缺專線名稱：有客服名字、第一佇列卻沒有專線名稱的資料，依規則不以 DNIS 補入，逐筆列出供回原檔確認。
function AnsweredNoLineDetail({ items }) {
    const [open, setOpen] = useState(true);
    const limit = 300;
    return React.createElement("div", { style: { border: "0.5px solid #fde68a", borderRadius: "8px", overflow: "hidden" } },
        React.createElement("button", { type: "button", onClick: () => setOpen((v) => !v), style: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", padding: "10px 14px", background: "#fffbeb", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "700", color: "#92400e", textAlign: "left" } },
            React.createElement("span", null, `⚠ 已接聽但缺專線名稱（${items.length} 筆）｜專線維持未分類，未用 DNIS 補入`),
            React.createElement("span", { style: { color: "#a16207" } }, open ? "收合 ▲" : "展開 ▼")),
        open && React.createElement("div", { style: { overflowX: "auto" } }, React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "12px" } },
            React.createElement("thead", null, React.createElement("tr", null, ["#", "檔案", "列號", "日期時間", "客服", "第一佇列原始內容", "DNIS", "對話 ID"].map((h) => React.createElement("th", { key: h, style: { ...CRM.th, whiteSpace: "nowrap" } }, h)))),
            React.createElement("tbody", null, items.slice(0, limit).map((o, i) => React.createElement("tr", { key: i },
                React.createElement("td", { style: CRM.td }, i + 1),
                React.createElement("td", { style: { ...CRM.td, wordBreak: "break-all" } }, o.file),
                React.createElement("td", { style: { ...CRM.td, textAlign: "right", whiteSpace: "nowrap" } }, o.row ? `第 ${o.row} 列` : "—"),
                React.createElement("td", { style: { ...CRM.td, whiteSpace: "nowrap" } }, `${o.date} ${o.time}`),
                React.createElement("td", { style: CRM.td }, o.agent),
                React.createElement("td", { style: CRM.td }, o.queue || "（空白）"),
                React.createElement("td", { style: { ...CRM.td, whiteSpace: "nowrap" } }, o.dnis || "—"),
                React.createElement("td", { style: { ...CRM.td, fontFamily: "monospace", fontSize: "11px", wordBreak: "break-all" } }, o.dialogId || "—")))))),
        open && items.length > limit && React.createElement("div", { style: { padding: "8px 14px", fontSize: "11px", color: "#a16207" } }, `只顯示前 ${limit} 筆，共 ${items.length} 筆。`));
}
// \u91CD\u8907\u7D00\u9304\u660E\u7D30\uFF1A\u540C\u4E00\u901A\u96FB\u8A71\uFF08\u540C\u4E00\u5C0D\u8A71 ID\uFF09\u51FA\u73FE\u591A\u7B46\u6642\uFF0C\u9010\u7B46\u5217\u51FA\u4F86\u6E90\u6A94\u6848\u8207\u5217\u865F\uFF0C\u65B9\u4FBF\u56DE\u539F\u6A94\u5C0D\u7167\u3002
function DuplicateDetail({ groups }) {
    const [open, setOpen] = useState(true);
    const limit = 300;
    const shown = groups.slice(0, limit);
    const sameFile = groups.filter((g) => !g.crossFile).length;
    return React.createElement("div", { style: { border: "0.5px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" } },
        React.createElement("button", { type: "button", onClick: () => setOpen((v) => !v), style: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", padding: "10px 14px", background: "#f8fafc", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "700", color: "#334155", textAlign: "left" } },
            React.createElement("span", null, `\u91CD\u8907\u7D00\u9304\u660E\u7D30\uFF08${groups.length} \u901A\uFF09\uFF5C\u540C\u4E00\u6A94\u6848\u5167 ${sameFile} \u901A\u3001\u8DE8\u6A94\u6848 ${groups.length - sameFile} \u901A`),
            React.createElement("span", { style: { color: "#64748b" } }, open ? "\u6536\u5408 \u25B2" : "\u5C55\u958B \u25BC")),
        open && React.createElement("div", { style: { padding: "8px 14px 12px", fontSize: "11px", color: "#64748b", lineHeight: 1.7 } }, "\u6BCF\u4E00\u901A\u96FB\u8A71\u7684\u7B2C\u4E00\u7B46\u4FDD\u7559\u8A08\u7B97\uFF0C\u5176\u9918\u4F75\u5165\u540C\u4E00\u901A\u3002\u300C\u5217\u865F\u300D\u662F\u539F\u59CB Excel\uFF0FCSV \u7684\u5217\u6578\uFF08\u6A19\u984C\u5728\u7B2C 1 \u5217\uFF09\uFF0C\u53EF\u76F4\u63A5\u56DE\u539F\u6A94\u5C0D\u7167\u3002"),
        open && React.createElement("div", { style: { overflowX: "auto" } }, React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "12px" } },
            React.createElement("thead", null, React.createElement("tr", null, ["#", "\u5C0D\u8A71 ID", "\u985E\u578B", "\u6A94\u6848", "\u5217\u865F", "\u65E5\u671F\u6642\u9593", "\u5BA2\u670D", "\u5C08\u7DDA", "Q1\uFF0FQ2"].map((h) => React.createElement("th", { key: h, style: { ...CRM.th, whiteSpace: "nowrap" } }, h)))),
            React.createElement("tbody", null, shown.flatMap((group, gi) => group.occurrences.map((o, oi) => React.createElement("tr", { key: `${gi}-${oi}`, style: { background: gi % 2 ? "#fafafa" : "#fff" } },
                React.createElement("td", { style: CRM.td }, oi === 0 ? gi + 1 : ""),
                React.createElement("td", { style: { ...CRM.td, fontFamily: "monospace", fontSize: "11px", wordBreak: "break-all" } }, oi === 0 ? (group.dialogId || "\uFF08\u7121\u5C0D\u8A71 ID\uFF0C\u4F9D\u65E5\u671F\u6642\u9593\u7B49\u6B04\u4F4D\u6BD4\u5C0D\uFF09") : ""),
                React.createElement("td", { style: { ...CRM.td, whiteSpace: "nowrap" } }, oi === 0 ? (group.crossFile ? "\u8DE8\u6A94\u6848" : "\u540C\u4E00\u6A94\u6848") : ""),
                React.createElement("td", { style: { ...CRM.td, wordBreak: "break-all" } }, o.file),
                React.createElement("td", { style: { ...CRM.td, textAlign: "right", whiteSpace: "nowrap" } }, o.row ? `\u7B2C ${o.row} \u5217` : "\u2014"),
                React.createElement("td", { style: { ...CRM.td, whiteSpace: "nowrap" } }, `${o.date} ${o.time}`),
                React.createElement("td", { style: CRM.td }, o.agent || "\uFF08\u7121\u5BA2\u670D\uFF09"),
                React.createElement("td", { style: CRM.td }, o.line || "\u2014"),
                React.createElement("td", { style: { ...CRM.td, whiteSpace: "nowrap" } }, `${o.q1}\uFF0F${o.q2}`))))))),
        open && groups.length > limit && React.createElement("div", { style: { padding: "8px 14px", fontSize: "11px", color: "#a16207" } }, `\u53EA\u986F\u793A\u524D ${limit} \u901A\uFF0C\u5171 ${groups.length} \u901A\u3002`));
}
// ─── CRM HISTORY TABLE ────────────────────────────────────────────────────────
function CrmHistoryTable({ rows = [], slice = [], viewType, targets = {} }) {
    // V41：改成「團隊」各期間總覽，算法與 AI 儀表板、漏接率分析相同（同一個對話 ID 只算一通）。
    // 漏接率只看團隊；調查率＝該題回答數 ÷ 已接聽；時數是「總發話時間」換算成小時，GT 與儲值合併（人力計算用）。
    const [showYoY, setShowYoY] = useState(true);
    const keyOf = (r) => viewType === "weeks" ? r.weekKey : viewType === "months" ? getCalendarMonthKey(r.date) : getCalendarYearKey(r.date);
    const span = useMemo(() => window.V41Core.dataSpan(rows), [rows]);
    const periods = useMemo(() => {
        const groups = {};
        rows.forEach((r) => { const k = keyOf(r); if (!k || !slice.includes(k)) return; (groups[k] = groups[k] || []).push(r); });
        return Object.keys(groups).sort().map((k) => {
            const currentRows = groups[k];
            // V42.3：月、週、年都比去年「同一段日期」（本期只到 8/20 就比去年 8/1～8/20）；去年資料不完整時不比。
            const ly = window.V41Core.lastYearComparison(rows, k, viewType, span);
            const previous = ly.status === "ok" ? ly.summary : null;
            const previousStatus = ly.status;
            const previousLabel = ly.range ? `${ly.range.start.replace(/-/g, "/")}～${ly.range.end.replace(/-/g, "/")}` : "";
            return { key: k, first: currentRows[0], s: window.V41Core.teamPeriodSummary(currentRows), previous, previousStatus, previousLabel };
        });
    }, [rows, slice, viewType, span]);
    const displayName = (p) => viewType === "weeks" ? formatWeekDisplay(p.key, p.first.weekLabel) : viewType === "months" ? formatMonthDisplay(p.key) : formatYearDisplay(p.key);
    const num = (v) => Number(v || 0).toLocaleString();
    const pctText = (v) => v == null ? "—" : `${v.toFixed(1)}%`;
    const hrs = (v) => Number(v || 0).toFixed(1);
    const missedColor = (v) => { const t = targets.missedRate; if (v == null) return "#94a3b8"; if (t == null || t === "" || !Number.isFinite(Number(t))) return "#334155"; return v <= Number(t) ? "#15803d" : "#dc2626"; };
    const cols = [
        { key: "offered", label: "有效進線", value: (s) => s.offered, fn: (s) => num(s.offered), compare: "percent", better: "neutral" },
        { key: "answered", label: "已接聽", value: (s) => s.answered, fn: (s) => num(s.answered), compare: "percent", better: "neutral" },
        { key: "missed", label: "漏接", value: (s) => s.missed, fn: (s) => num(s.missed), compare: "percent", better: "low" },
        { key: "missedRate", label: "漏接率", value: (s) => s.missedRate, fn: (s) => React.createElement("span", { style: { fontWeight: "600", color: missedColor(s.missedRate) } }, pctText(s.missedRate)), compare: "points", better: "low" },
        { key: "q1Rate", label: "Q1 人員非常滿意", value: (s) => s.q1Rate, fn: (s) => React.createElement("span", { style: { fontWeight: "600", color: targetColor(s.q1Rate, "q1VerySatRate", targets) } }, pctText(s.q1Rate)), compare: "points", better: "high" },
        { key: "q2Rate", label: "Q2 問題非常滿意", value: (s) => s.q2Rate, fn: (s) => React.createElement("span", { style: { fontWeight: "600", color: targetColor(s.q2Rate, "q2VerySatRate", targets) } }, pctText(s.q2Rate)), compare: "points", better: "high" },
        { key: "q1Sur", label: "Q1 調查率", value: (s) => s.q1SurveyRate, fn: (s) => React.createElement("span", { style: { fontWeight: "600", color: targetColor(s.q1SurveyRate, "q1SurRate", targets) } }, pctText(s.q1SurveyRate)), compare: "points", better: "high" },
        { key: "q2Sur", label: "Q2 調查率", value: (s) => s.q2SurveyRate, fn: (s) => React.createElement("span", { style: { fontWeight: "600", color: targetColor(s.q2SurveyRate, "q2SurRate", targets) } }, pctText(s.q2SurveyRate)), compare: "points", better: "high" },
        { key: "gt", label: "GT+儲值 發話時數", value: (s) => s.hours.gtStored, fn: (s) => hrs(s.hours.gtStored), compare: "percent", better: "neutral" },
        { key: "full", label: "滿貫 發話時數", value: (s) => s.hours.fullHouse, fn: (s) => hrs(s.hours.fullHouse), compare: "percent", better: "neutral" },
        { key: "lucky", label: "金好運 發話時數", value: (s) => s.hours.lucky, fn: (s) => hrs(s.hours.lucky), compare: "percent", better: "neutral" },
    ];
    // V42.3：方式 A——每格下方灰色小字寫「去年的數字（變化）」；比例看相差幾個百分點（▲／▼），通數與時數看增減 %。
    const comparison = (p, c) => {
        if (!showYoY)
            return null;
        const small = (children, color, title) => React.createElement("div", { title, style: { marginTop: "3px", fontSize: "11px", color: color || "#94a3b8", whiteSpace: "nowrap" } }, children);
        if (p.previousStatus === "partial")
            return small("去年資料不完整", null, `去年同期 ${p.previousLabel} 只有部分日期有資料，不拿來比`);
        if (!p.previous)
            return small("去年無資料");
        const now = c.value(p.s), before = c.value(p.previous);
        const beforeText = c.compare === "points" ? pctText(before) : (c.key === "gt" || c.key === "full" || c.key === "lucky") ? hrs(before) : num(before);
        let delta = null, diffText = "";
        if (now != null && before != null && Number.isFinite(Number(now)) && Number.isFinite(Number(before))) {
            if (c.compare === "points") { delta = now - before; diffText = Math.abs(delta) < 0.05 ? "持平" : `${delta > 0 ? "▲" : "▼"}${Math.abs(delta).toFixed(1)}`; }
            else if (Number(before) > 0) { delta = (now - before) / before * 100; diffText = Math.abs(delta) < 0.05 ? "持平" : `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)}%`; }
        }
        const better = delta == null || diffText === "持平" || c.better === "neutral" ? null : (c.better === "low" ? delta < 0 : delta > 0);
        const diffColor = better == null ? "#94a3b8" : better ? "#15803d" : "#dc2626";
        return small([`去年 ${beforeText}`, diffText ? React.createElement("span", { key: "d", style: { color: diffColor, fontWeight: "600" } }, `（${diffText}）`) : null], null, `去年同期：${p.previousLabel}`);
    };
    const yoyName = viewType === "weeks" ? "去年同週比較" : viewType === "months" ? "去年同月比較" : "前一年比較";
    const emptyText = rows.length ? "這個期間範圍內沒有資料，請調整上方的期間" : "尚無資料，請先到「地端資料匯入」匯入檔案";
    return (React.createElement(CollapsibleCard, { style: { ...CRM.cardLg, overflow: "hidden" } },
        React.createElement("div", { style: CRM.hdr },
            React.createElement("span", { style: CRM.title }, "團隊各期間總覽"),
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" } },
                React.createElement("button", { type: "button", onClick: () => setShowYoY((v) => !v), style: { ...CRM.btnGhost, padding: "5px 9px", fontSize: "11px" } }, `${yoyName}：${showYoY ? "開" : "關"}`),
                React.createElement("span", { style: CRM.badge("#f0f9ff", "#0284c7") }, periods.length, " 個期間"))),
        React.createElement("div", { style: { padding: "8px 16px", fontSize: "12px", color: "#64748b", borderBottom: "0.5px solid #f1f5f9" } },
            "漏接率＝漏接 ÷ 有效進線；非常滿意＝非常滿意 ÷ 該題回答數；調查率＝該題回答數 ÷ 已接聽；時數單位：小時（總發話時間）。顏色：綠＝達標、紅＝未達標、深灰＝未設目標。",
            showYoY && React.createElement("div", { style: { marginTop: "4px", color: "#475569" } }, "灰色小字是去年同期：比的是去年「同一段日期」（本期只匯入到 8/20，就比去年 8/1～8/20；週比去年同一週、年比前一年）。比例寫相差幾個百分點（▲ 上升、▼ 下降），通數與時數寫增減 %。綠色＝變好、紅色＝變差、灰色＝不分好壞。去年只有部分日期有資料時顯示「去年資料不完整」，不拿來比。")),
        React.createElement("div", { style: { overflowX: "auto" } },
            React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "13px" } },
                React.createElement("thead", null,
                    React.createElement("tr", null,
                        React.createElement("th", { style: { ...CRM.th, textAlign: "left" } }, "期間"),
                        cols.map(c => React.createElement("th", { key: c.key, style: CRM.th }, c.label)))),
                React.createElement("tbody", null, periods.length === 0 ? (React.createElement("tr", null,
                    React.createElement("td", { colSpan: cols.length + 1, style: { ...CRM.td, padding: "40px", color: "#94a3b8", textAlign: "center" } }, emptyText))) : periods.map((p, i) => (React.createElement("tr", { key: p.key, style: { background: i % 2 === 0 ? "#fff" : "#f9fafb" } },
                    React.createElement("td", { style: { ...CRM.td, textAlign: "left", fontWeight: "600", color: "#1d4ed8", whiteSpace: "nowrap" } }, displayName(p)),
                    cols.map(c => React.createElement("td", { key: c.key, style: { ...CRM.td, fontVariantNumeric: "tabular-nums" } }, c.fn(p.s), comparison(p, c)))))))))));
}
// ─── Period filter panel: shortcut buttons + custom range (A+C design) ────────
const PERIOD_SHORTCUTS = {
    weeks: [
        { key: "recent1", label: "最近 1 週", n: 1 },
        { key: "recent4", label: "最近 4 週", n: 4 },
        { key: "recent8", label: "最近 8 週", n: 8 },
        { key: "recent13", label: "最近 13 週", n: 13 },
        { key: "all", label: "全部週次", n: null },
        { key: "custom", label: "自訂範圍", n: null },
    ],
    months: [
        { key: "recent1", label: "最近 1 個月", n: 1 },
        { key: "recent3", label: "最近 3 個月", n: 3 },
        { key: "recent6", label: "最近 6 個月", n: 6 },
        { key: "thisYear", label: "資料最新年度", n: null },
        { key: "all", label: "全部月份", n: null },
        { key: "custom", label: "自訂範圍", n: null },
    ],
    years: [
        { key: "recent2", label: "最近 2 年", n: 2 },
        { key: "all", label: "全部年份", n: null },
        { key: "custom", label: "自訂範圍", n: null },
    ],
};
const DEFAULT_PERIOD_FILTERS = {
    weeks: { shortcut: "recent4", customFrom: "", customTo: "" },
    months: { shortcut: "recent3", customFrom: "", customTo: "" },
    years: { shortcut: "recent2", customFrom: "", customTo: "" },
};
const sliceListByRange = (list, from, to) => {
    if (!list.length)
        return [];
    const fi = list.indexOf(from), ti = list.indexOf(to);
    if (fi < 0 || ti < 0)
        return [];
    return list.slice(Math.min(fi, ti), Math.max(fi, ti) + 1);
};
const resolveCustomPeriodRange = (filterState, list) => {
    const wantFrom = filterState.customFrom, wantTo = filterState.customTo;
    if (!wantFrom || !wantTo)
        return { from: list[0], to: list[list.length - 1], resolution: "no-overlap" };
    const lo = wantFrom <= wantTo ? wantFrom : wantTo;
    const hi = wantFrom <= wantTo ? wantTo : wantFrom;
    const surviving = list.filter((k) => k >= lo && k <= hi);
    if (surviving.length) {
        const resolution = surviving[0] === wantFrom && surviving[surviving.length - 1] === wantTo ? "exact" : "clamped";
        return { from: surviving[0], to: surviving[surviving.length - 1], resolution };
    }
    return { from: list[0], to: list[list.length - 1], resolution: "no-overlap" };
};
// 每次都當場依「目前選的是哪個快捷鍵/自訂範圍」加上「目前實際有哪些週期」重新算出結果，
// 不維護任何需要手動同步的中間狀態，避免資料更新後選取範圍過期，也避免切換週/月/年時互相污染。
const resolvePeriodRange = (viewType, filterState, list) => {
    if (!list.length)
        return { from: "", to: "", resolution: "exact" };
    const last = list[list.length - 1];
    if (filterState.shortcut === "custom")
        return resolveCustomPeriodRange(filterState, list);
    const shortcuts = PERIOD_SHORTCUTS[viewType] || PERIOD_SHORTCUTS.weeks;
    const sc = shortcuts.find((s) => s.key === filterState.shortcut) || shortcuts[0];
    if (sc.key === "all")
        return { from: list[0], to: last, resolution: "exact" };
    if (sc.key === "thisYear") {
        // V41：用資料裡最新的年份（不看電腦日期），查看舊年度資料時也不會退回全部月份
        const thisY = String(last).slice(0, 4);
        const inYear = list.filter((k) => k.startsWith(thisY));
        return { from: inYear[0], to: inYear[inYear.length - 1], resolution: "exact" };
    }
    if (sc.n)
        return { from: list[Math.max(0, list.length - sc.n)], to: last, resolution: "exact" };
    return { from: list[0], to: last, resolution: "exact" };
};
function PeriodFilterPanel({ viewType, setViewType, list, filterState, range, selectedCount, onPickShortcut, onPickCustomRange }) {
    const fmtKey = useCallback((k) => {
        if (viewType === "weeks")
            return formatWeekKeyZh(k);
        if (viewType === "months")
            return formatMonthDisplay(k);
        return formatYearDisplay(k);
    }, [viewType]);
    const shortcuts = PERIOD_SHORTCUTS[viewType] || PERIOD_SHORTCUTS.weeks;
    const activeShortcut = filterState.shortcut;
    const fromKey = range.from;
    const toKey = range.to;
    const handleShortcut = (sc) => {
        if (sc.key === "custom") {
            // 只是切換成「自訂範圍」模式，先用目前實際顯示的區間當作起點，之後使用者再自行調整。
            onPickCustomRange(viewType, fromKey, toKey);
            return;
        }
        onPickShortcut(viewType, sc.key);
    };
    const handleFromChange = (val) => {
        const fi = list.indexOf(val);
        const ti = list.indexOf(toKey);
        const safeToKey = fi > ti ? val : toKey;
        onPickCustomRange(viewType, val, safeToKey);
    };
    const handleToChange = (val) => {
        const fi = list.indexOf(fromKey);
        const ti = list.indexOf(val);
        const safeFromKey = ti < fi ? val : fromKey;
        onPickCustomRange(viewType, safeFromKey, val);
    };
    const unit = viewType === "years" ? "年" : viewType === "months" ? "個月" : "週";
    const rangeCount = fromKey && toKey ? Math.abs(list.indexOf(toKey) - list.indexOf(fromKey)) + 1 : 0;
    const resolutionHint = activeShortcut === "custom" && range.resolution === "clamped" ? "自訂範圍部分週期目前無資料，已自動收斂顯示"
        : activeShortcut === "custom" && range.resolution === "no-overlap" ? "自訂範圍目前完全無資料，暫顯示全部"
            : "";
    return (React.createElement("div", { className: "tr-panel p-5 space-y-4" },
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" } },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
                React.createElement("span", { style: { fontSize: "13px", fontWeight: "600", color: "var(--color-text-primary)" } }, "\u671F\u9593\u7BE9\u9078"),
                selectedCount > 0 && (React.createElement("span", { style: { display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "500", background: "var(--brand-soft)", color: "var(--brand-dark)" } },
                    "\u5DF2\u9078 ",
                    selectedCount,
                    " ",
                    unit))),
            React.createElement("div", { style: { display: "flex", gap: "4px" } },
                React.createElement("button", { type: "button", onClick: () => setViewType("weeks"), className: `tr-ptab${viewType === "weeks" ? " on" : ""}` }, "\u9031"),
                React.createElement("button", { type: "button", onClick: () => setViewType("months"), className: `tr-ptab${viewType === "months" ? " on" : ""}` }, "\u6708"),
                React.createElement("button", { type: "button", onClick: () => setViewType("years"), className: `tr-ptab${viewType === "years" ? " on" : ""}` }, "\u5E74"))),
        React.createElement("div", { className: "tr-fbox" },
            React.createElement("div", { style: { fontSize: "11px", fontWeight: "500", color: "#94a3b8", marginBottom: "8px", userSelect: "none" } }, "\u5FEB\u901F\u9078\u53D6"),
            React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: "6px" } }, list.length === 0 ? (React.createElement("span", { style: { fontSize: "12px", color: "#94a3b8" } }, "尚無資料")) : shortcuts.map(sc => (React.createElement("button", { key: sc.key, type: "button", onClick: () => handleShortcut(sc), style: {
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    padding: "5px 14px", borderRadius: "20px", fontSize: "13px", cursor: "pointer",
                    fontFamily: "inherit", whiteSpace: "nowrap", transition: "all .15s",
                    border: activeShortcut === sc.key ? "0.5px solid var(--brand-dark)" : "0.5px solid #e2e8f0",
                    background: activeShortcut === sc.key ? "var(--brand-dark)" : "#f8fafc",
                    color: activeShortcut === sc.key ? "#fff" : "#64748b",
                    fontWeight: activeShortcut === sc.key ? "500" : "400",
                } },
                sc.key === "custom" && React.createElement("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", "aria-hidden": "true" },
                    React.createElement("path", { d: "M4 6h16M4 12h10M4 18h6" })),
                sc.label))))),
        React.createElement("div", { className: "tr-fbox" },
            React.createElement("div", { style: { fontSize: "11px", fontWeight: "500", color: "#94a3b8", marginBottom: "8px", userSelect: "none" } }, "\u81EA\u8A02\u7BC4\u570D"),
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" } },
                React.createElement("span", { style: { fontSize: "12px", color: "#64748b", whiteSpace: "nowrap" } }, "\u5F9E"),
                React.createElement("select", { value: fromKey, onChange: e => handleFromChange(e.target.value), style: { fontSize: "12px", padding: "5px 8px", borderRadius: "6px", border: "0.5px solid #e2e8f0", background: "#fff", color: "#334155", cursor: "pointer", fontFamily: "inherit", outline: "none" } }, list.map(k => React.createElement("option", { key: k, value: k }, fmtKey(k)))),
                React.createElement("span", { style: { fontSize: "12px", color: "#64748b", whiteSpace: "nowrap" } }, "\u5230"),
                React.createElement("select", { value: toKey, onChange: e => handleToChange(e.target.value), style: { fontSize: "12px", padding: "5px 8px", borderRadius: "6px", border: "0.5px solid #e2e8f0", background: "#fff", color: "#334155", cursor: "pointer", fontFamily: "inherit", outline: "none" } }, list.map(k => React.createElement("option", { key: k, value: k }, fmtKey(k)))),
                rangeCount > 0 && (React.createElement("span", { style: { fontSize: "12px", fontWeight: "500", color: "var(--brand-dark)", whiteSpace: "nowrap" } },
                    "\u5171 ",
                    rangeCount,
                    " ",
                    unit)),
                resolutionHint && (React.createElement("span", { style: { fontSize: "12px", color: "#d97706", whiteSpace: "nowrap" } }, resolutionHint))))));
}
// ─── TrendPanel: Professional CRM UI ─────────────────────────────────────────
function TrendPanel({ periodList, viewType, availableAgents, effectiveRules, includeHistoryAgents, setIncludeHistoryAgents, selectedTrendAgents, setSelectedTrendAgents, selectedMetric, setSelectedMetric, eventList, addEvent, deleteEvent, targets = {} }) {
    var _a;
    const chartRef = useRef(null);
    const chartInstRef = useRef(null);
    const [eventMarkers, setEventMarkers] = useState([]);
    const [chartResizeTick, setChartResizeTick] = useState(0);
    const [eventFilterTypes, setEventFilterTypes] = useState(() => EVENT_TYPES.map(t => t.key));
    const [showEventForm, setShowEventForm] = useState(false);
    const [eventDraft, setEventDraft] = useState({ date: "", type: EVENT_TYPES[0].key, title: "", note: "" });
    const AGENT_PALETTE = [
        { color: "#2563eb", bg: "#eff6ff", tc: "#1e40af" },
        { color: "#0891b2", bg: "#ecfeff", tc: "#155e75" },
        { color: "#7c3aed", bg: "#f5f3ff", tc: "#4c1d95" },
        { color: "#0d9488", bg: "#f0fdfa", tc: "#134e4a" },
        { color: "#dc2626", bg: "#fef2f2", tc: "#991b1b" },
        { color: "#ea580c", bg: "#fff7ed", tc: "#9a3412" },
        { color: "#d97706", bg: "#fffbeb", tc: "#92400e" },
        { color: "#65a30d", bg: "#f7fee7", tc: "#3f6212" },
        { color: "#9333ea", bg: "#faf5ff", tc: "#581c87" },
        { color: "#0284c7", bg: "#f0f9ff", tc: "#0c4a6e" },
        { color: "#be185d", bg: "#fdf2f8", tc: "#831843" },
        { color: "#1d4ed8", bg: "#eff6ff", tc: "#1e3a8a" },
        { color: "#b45309", bg: "#fef3c7", tc: "#78350f" },
    ];
    const DASH_PATTERNS = [[], [6, 3], [3, 3], [8, 3, 2, 3], [4, 2], [10, 3], [2, 2], [7, 2, 2, 2]];
    const SHIFT_STYLE = { "早班": { bg: "#eff6ff", tc: "#1e40af" }, "中班": { bg: "#f0fdf4", tc: "#14532d" }, "晚班": { bg: "#fff7ed", tc: "#9a3412" } };
    const agentColorMap = useMemo(() => {
        const map = {};
        availableAgents.forEach((name, i) => { map[name] = AGENT_PALETTE[i % AGENT_PALETTE.length]; });
        return map;
    }, [availableAgents]);
    const metricCfg = HISTORY_METRICS.find(m => m.key === selectedMetric) || HISTORY_METRICS[0];
    const isPct = metricCfg.format === "percent";
    const isHours = metricCfg.format === "hours";
    const activeAgents = useMemo(() => selectedTrendAgents.filter(n => availableAgents.includes(n)), [selectedTrendAgents, availableAgents]);
    const getVal = useCallback((periodItem, agentName) => {
        var _a;
        if (!periodItem)
            return null;
        if (!isAgentEffectiveForPeriod(agentName, periodItem.periodKey, viewType, effectiveRules))
            return null;
        const agentData = (periodItem.agents || []).find(a => a.name === agentName);
        if (!agentData || Number(agentData.totalCalls || 0) <= 0)
            return null;
        if (metricCfg.source === "lines") {
            const v = (_a = agentData.lines) === null || _a === void 0 ? void 0 : _a[metricCfg.key];
            return (v == null || Number(v) === 0) ? null : v;
        }
        const v = agentData[metricCfg.key];
        return v == null ? null : v;
    }, [periodList, selectedMetric, viewType, effectiveRules, metricCfg]);
    const fmt = useCallback((v) => {
        if (v == null)
            return "—";
        if (isPct)
            return `${Number(v).toFixed(2)}%`;
        if (isHours)
            return `${(Number(v) / 3600).toFixed(2)} 小時`;
        return Math.round(Number(v)).toLocaleString();
    }, [isPct, isHours]);
    const fmtChart = useCallback((v) => {
        if (v == null)
            return null;
        if (isHours)
            return Number(v) / 3600;
        return Number(v);
    }, [isHours]);
    const periodLabels = useMemo(() => periodList.map(p => {
        if (viewType === "years")
            return formatYearDisplay(p.periodKey);
        if (viewType === "months")
            return formatMonthDisplay(p.periodKey);
        return formatWeekKeyZh(p.periodKey);
    }), [periodList, viewType]);
    const lastPeriod = periodList[periodList.length - 1];
    const rankData = useMemo(() => {
        if (!lastPeriod)
            return [];
        return activeAgents
            .map(name => ({ name, v: getVal(lastPeriod, name), clr: agentColorMap[name] }))
            .filter(x => x.v != null)
            .sort((a, b) => b.v - a.v);
    }, [activeAgents, lastPeriod, getVal, agentColorMap]);
    const allPeriodVals = useMemo(() => activeAgents.flatMap(name => periodList.map(p => getVal(p, name))).filter(v => v != null), [activeAgents, periodList, getVal]);
    const kpiHigh = allPeriodVals.length ? Math.max(...allPeriodVals) : null;
    const kpiLow = allPeriodVals.length ? Math.min(...allPeriodVals) : null;
    const kpiAvg = allPeriodVals.length ? allPeriodVals.reduce((a, b) => a + b, 0) / allPeriodVals.length : null;
    const kpiHighName = useMemo(() => {
        if (kpiHigh == null)
            return "";
        for (const p of periodList) {
            for (const name of activeAgents) {
                if (getVal(p, name) === kpiHigh)
                    return `${name}｜${viewType === "weeks" ? formatWeekKeyZh(p.periodKey) : viewType === "months" ? formatMonthDisplay(p.periodKey) : formatYearDisplay(p.periodKey)}`;
            }
        }
        return "";
    }, [kpiHigh, periodList, activeAgents, getVal, viewType]);
    const kpiLowName = useMemo(() => {
        if (kpiLow == null)
            return "";
        for (const p of periodList) {
            for (const name of activeAgents) {
                if (getVal(p, name) === kpiLow)
                    return `${name}｜${viewType === "weeks" ? formatWeekKeyZh(p.periodKey) : viewType === "months" ? formatMonthDisplay(p.periodKey) : formatYearDisplay(p.periodKey)}`;
            }
        }
        return "";
    }, [kpiLow, periodList, activeAgents, getVal, viewType]);
    const periodAvgAt = useCallback((period) => {
        if (!period)
            return null;
        const vals = activeAgents.map(name => getVal(period, name)).filter(v => v != null);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }, [activeAgents, getVal]);
    const prevPeriod = periodList[periodList.length - 2];
    const currentPeriodAvg = useMemo(() => periodAvgAt(lastPeriod), [periodAvgAt, lastPeriod]);
    const prevPeriodAvg = useMemo(() => periodAvgAt(prevPeriod), [periodAvgAt, prevPeriod]);
    const periodDelta = (currentPeriodAvg != null && prevPeriodAvg != null) ? currentPeriodAvg - prevPeriodAvg : null;
    useEffect(() => {
        if (!chartRef.current || !window.Chart)
            return;
        if (chartInstRef.current)
            chartInstRef.current.destroy();
        if (!periodList.length || !activeAgents.length)
            return;
        const datasets = activeAgents.map((name, i) => {
            var _a, _b, _c;
            return ({
                label: name,
                data: periodList.map(p => fmtChart(getVal(p, name))),
                borderColor: ((_a = agentColorMap[name]) === null || _a === void 0 ? void 0 : _a.color) || "#2563eb",
                backgroundColor: (((_b = agentColorMap[name]) === null || _b === void 0 ? void 0 : _b.color) || "#2563eb") + "15",
                pointBackgroundColor: ((_c = agentColorMap[name]) === null || _c === void 0 ? void 0 : _c.color) || "#2563eb",
                pointRadius: 3, pointHoverRadius: 5,
                tension: 0.3, spanGaps: false, fill: false,
                borderDash: DASH_PATTERNS[i % DASH_PATTERNS.length],
                borderWidth: 2,
            });
        });
        const chartVals = datasets.flatMap(d => d.data).filter(v => v != null);
        const minV = chartVals.length ? Math.min(...chartVals) : 0;
        const maxV = chartVals.length ? Math.max(...chartVals) : 100;
        const pad = isPct ? 3 : Math.max((maxV - minV) * 0.12, 1);
        chartInstRef.current = new window.Chart(chartRef.current, {
            type: periodList.length <= 1 ? "bar" : "line",
            data: { labels: periodLabels, datasets },
            options: {
                responsive: true, maintainAspectRatio: false, spanGaps: false,
                onResize: () => setChartResizeTick((t) => t + 1),
                interaction: { mode: "index", intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => { const v = ctx.parsed.y; return v == null ? `${ctx.dataset.label}: —` : `${ctx.dataset.label}: ${fmt(isHours ? v * 3600 : v)}`; } } }
                },
                scales: {
                    x: { grid: { color: "rgba(148,163,184,0.1)" }, ticks: { font: { size: 11 }, color: "#94a3b8", maxRotation: 30 } },
                    y: {
                        grid: { color: "rgba(148,163,184,0.1)" },
                        ticks: { font: { size: 11 }, color: "#94a3b8", callback: v => isPct ? v.toFixed(0) + "%" : v.toLocaleString() },
                        min: chartVals.length ? Math.max(0, +(minV - pad).toFixed(1)) : undefined,
                        max: chartVals.length ? +(maxV + pad).toFixed(1) : undefined,
                    }
                }
            }
        });
        return () => { if (chartInstRef.current)
            chartInstRef.current.destroy(); };
    }, [activeAgents, periodList, selectedMetric, viewType, effectiveRules]);
    useEffect(() => {
        if (!chartInstRef.current || !periodList.length || !activeAgents.length) {
            setEventMarkers([]);
            return;
        }
        const visible = (eventList || []).filter(ev => eventFilterTypes.includes(ev.type));
        const chartArea = chartInstRef.current.chartArea || null;
        const idxCounts = {};
        const markers = [];
        visible.forEach(ev => {
            const key = getPeriodKeyForDate(ev.date, viewType);
            const idx = periodList.findIndex(p => p.periodKey === key);
            if (idx === -1)
                return;
            try {
                const baseX = chartInstRef.current.scales.x.getPixelForValue(idx);
                const dupOffset = (idxCounts[idx] || 0) * 6;
                idxCounts[idx] = (idxCounts[idx] || 0) + 1;
                markers.push({ ...ev, x: baseX + dupOffset, top: chartArea ? chartArea.top : 0, bottom: chartArea ? chartArea.bottom : null });
            }
            catch (e) { }
        });
        setEventMarkers(markers);
    }, [periodList, viewType, activeAgents, eventList, eventFilterTypes, selectedMetric, chartResizeTick]);
    const selAll = () => setSelectedTrendAgents([...availableAgents]);
    const clearAll = () => setSelectedTrendAgents([]);
    const toggleAgent = (name) => setSelectedTrendAgents(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);
    const cardStyle = { background: "#fff", border: "0.5px solid #e2e8f0", borderRadius: "12px", overflow: "hidden" };
    const cardHeaderStyle = { padding: "13px 20px", borderBottom: "0.5px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" };
    const cardTitleStyle = { fontSize: "11px", fontWeight: "700", color: "#64748b", letterSpacing: ".06em", textTransform: "uppercase" };
    const kpiCardStyle = { background: "#f8fafc", borderRadius: "8px", padding: "14px 16px", border: "0.5px solid #f1f5f9" };
    const METRIC_GROUPS = [
        { label: "滿意度指標", items: [
               { key: "q1VerySatRate", label: "人員滿意(Q1)", icon: "👤", bg: "#faf5ff", tc: "#7c3aed" },
                { key: "q2VerySatRate", label: "問題滿意(Q2)", icon: "💬", bg: "#fff7ed", tc: "#c2410c" },
                { key: "q1SurRate", label: "人員調查率(Q1)", icon: "📞", bg: "#faf5ff", tc: "#7c3aed" },
                { key: "q2SurRate", label: "問題調查率(Q2)", icon: "📞", bg: "#fff7ed", tc: "#c2410c" },
            ] },
        { label: "通話量與時數", items: [
                { key: "totalCalls", label: "接聽數", icon: "📱", bg: "#f0fdf4", tc: "#15803d" },
                { key: "GT+儲值專線", label: "GT+儲值發話時數", icon: "⏱", bg: "#f0f9ff", tc: "#0284c7", source: "lines" },
                { key: "滿貫專線", label: "滿貫發話時數", icon: "⏱", bg: "#f0f9ff", tc: "#0284c7", source: "lines" },
                { key: "金好運專線", label: "金好運發話時數", icon: "⏱", bg: "#f0f9ff", tc: "#0284c7", source: "lines" },
            ] },
    ];
    const metricLabel = ((_a = METRIC_GROUPS.flatMap(g => g.items).find(m => m.key === selectedMetric)) === null || _a === void 0 ? void 0 : _a.label) || metricCfg.label;
    const periodRangeLabel = periodLabels.length ? `${periodLabels[0]}${periodLabels.length > 1 ? " — " + periodLabels[periodLabels.length - 1] : ""}` : "—";
    return (React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "14px" } },
        React.createElement("div", { className: "tr-kpi-row" }, [
            { label: "本期（較上期）", val: fmt(currentPeriodAvg), sub: prevPeriod ? React.createElement("span", { style: { color: periodDelta == null ? "#94a3b8" : periodDelta > 0 ? "#15803d" : periodDelta < 0 ? "#b91c1c" : "#64748b", fontWeight: "700" } }, periodDelta == null ? "—" : `${periodDelta > 0 ? "▲" : periodDelta < 0 ? "▼" : "—"} ${fmt(Math.abs(periodDelta))} 較上期`) : "尚無上期資料可比對", color: "#0f172a", highlight: true },
            { label: "比對人數", val: activeAgents.length, sub: "人員已選取", color: "#1e293b" },
            { label: "期間最高", val: fmt(kpiHigh), sub: kpiHighName || "—", color: "#15803d" },
            { label: "期間平均", val: fmt(kpiAvg), sub: `${periodLabels[0] || ""}${periodLabels.length > 1 ? " — " + periodLabels[periodLabels.length - 1] : ""}`, color: "#1d4ed8" },
            { label: "期間最低", val: fmt(kpiLow), sub: kpiLowName || "—", color: "#b91c1c" },
        ].map(k => (React.createElement("div", { key: k.label, style: k.highlight ? { ...kpiCardStyle, background: "#eff6ff", border: "0.5px solid #bfdbfe" } : kpiCardStyle },
            React.createElement("div", { style: { fontSize: "10px", fontWeight: "700", color: "#94a3b8", letterSpacing: ".06em", textTransform: "uppercase", marginBottom: "8px" } }, k.label),
            React.createElement("div", { style: { fontSize: "22px", fontWeight: "600", color: k.color, lineHeight: 1 } }, k.val),
            React.createElement("div", { style: { fontSize: "11px", color: "#94a3b8", marginTop: "5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, k.sub || "—"))))),
        React.createElement(CollapsibleCard, { style: cardStyle },
            React.createElement("div", { style: cardHeaderStyle }, React.createElement("span", { style: cardTitleStyle }, "趨勢圖")),
            React.createElement("div", { className: "rwd-split", style: { display: "grid", gridTemplateColumns: "190px 1fr", minHeight: "340px" } },
                React.createElement("div", { style: { borderRight: "0.5px solid #f1f5f9", paddingTop: "8px", paddingBottom: "8px" } }, METRIC_GROUPS.map(group => (React.createElement("div", { key: group.label },
                    React.createElement("div", { style: { padding: "8px 16px 4px", fontSize: "10px", fontWeight: "700", color: "#cbd5e1", letterSpacing: ".08em", textTransform: "uppercase" } }, group.label),
                    group.items.map(item => {
                        const on = selectedMetric === item.key;
                        return (React.createElement("div", { key: item.key, onClick: () => setSelectedMetric(item.key), style: {
                                display: "flex", alignItems: "center", gap: "10px",
                                padding: "9px 16px", cursor: "pointer",
                                borderLeft: on ? "2.5px solid #3b82f6" : "2.5px solid transparent",
                                background: on ? "#f0f9ff" : "transparent",
                                transition: "all .12s",
                            }, onMouseEnter: e => { if (!on)
                                e.currentTarget.style.background = "#f8fafc"; }, onMouseLeave: e => { if (!on)
                                e.currentTarget.style.background = "transparent"; } },
                            React.createElement("div", { style: { width: "28px", height: "28px", borderRadius: "7px", background: item.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", flexShrink: 0 } }, item.icon),
                            React.createElement("div", { style: { fontSize: "12px", color: on ? "#1d4ed8" : "#64748b", fontWeight: on ? "600" : "400", lineHeight: 1.3 } }, item.label)));
                    }))))),
                React.createElement("div", { style: { padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" } },
                    React.createElement("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" } },
                        React.createElement("div", null,
                            React.createElement("div", { style: { fontSize: "14px", fontWeight: "600", color: "#1e293b" } },
                                metricLabel,
                                " \u8DA8\u52E2"),
                            React.createElement("div", { style: { fontSize: "11px", color: "#94a3b8", marginTop: "3px" } }, periodRangeLabel)),
                        React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: "10px" } }, activeAgents.map((name, i) => {
                            const clr = agentColorMap[name];
                            const dash = DASH_PATTERNS[i % DASH_PATTERNS.length];
                            return (React.createElement("span", { key: name, style: { display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: (clr === null || clr === void 0 ? void 0 : clr.color) || "#888" } },
                                React.createElement("span", { style: { width: "18px", height: "0", display: "inline-block", borderTop: dash.length ? `2px dashed ${clr === null || clr === void 0 ? void 0 : clr.color}` : `2px solid ${clr === null || clr === void 0 ? void 0 : clr.color}` } }),
                                React.createElement("span", { style: { fontWeight: "500" } }, name)));
                        }))),
                    activeAgents.length === 0 || periodList.length === 0 ? (React.createElement("div", { style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "13px", height: "200px" } }, availableAgents.length === 0 ? "尚無資料，請先到「地端資料匯入」匯入檔案" : periodList.length === 0 ? "這個期間範圍內沒有資料，請調整上方的期間" : "請在下方「人員篩選」勾選要比較的客服")) : (React.createElement("div", { style: { position: "relative", height: "200px", width: "100%" } },
                        React.createElement("canvas", { ref: chartRef, role: "img", "aria-label": "\u5BA2\u670D\u8DA8\u52E2\u6298\u7DDA\u5716" }, "\u8DA8\u52E2\u8CC7\u6599"),
                        eventMarkers.map((m, mi) => {
                            const cfg = EVENT_TYPES.find(t => t.key === m.type) || EVENT_TYPES[EVENT_TYPES.length - 1];
                            const lineTop = m.top != null ? m.top : 0;
                            const lineBottom = m.bottom != null ? m.bottom : "18px";
                            return React.createElement("div", { key: m.id || mi, style: { position: "absolute", left: `${m.x}px`, top: typeof lineTop === "number" ? `${lineTop}px` : lineTop, height: typeof lineBottom === "number" ? `${lineBottom - lineTop}px` : undefined, bottom: typeof lineBottom === "number" ? undefined : lineBottom, width: 0, borderLeft: `1.5px dashed ${cfg.color}`, pointerEvents: "none" } },
                                React.createElement("div", { title: `${m.date} \u30FB ${cfg.label}\n${m.title}${m.note ? "\n" + m.note : ""}`, style: { position: "absolute", bottom: "-8px", left: "-5px", width: "10px", height: "10px", borderRadius: "50%", background: cfg.color, border: "1.5px solid #fff", boxShadow: `0 0 0 1px ${cfg.color}`, pointerEvents: "auto", cursor: "pointer" } }));
                        }))),
                    React.createElement("div", { style: { borderTop: "0.5px solid #f1f5f9", paddingTop: "12px" } },
                        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" } },
                            React.createElement("span", { style: { fontSize: "10px", fontWeight: "700", color: "#cbd5e1", letterSpacing: ".06em", textTransform: "uppercase" } }, "\u4EBA\u54E1\u7BE9\u9078"),
                            React.createElement("div", { style: { display: "flex", gap: "6px" } },
                                React.createElement("button", { type: "button", onClick: selAll, style: { fontSize: "11px", padding: "2px 8px", border: "0.5px solid #e2e8f0", borderRadius: "5px", background: "#fff", cursor: "pointer", color: "#64748b", fontFamily: "inherit" } }, "\u5168\u9078"),
                                React.createElement("button", { type: "button", onClick: clearAll, style: { fontSize: "11px", padding: "2px 8px", border: "0.5px solid #e2e8f0", borderRadius: "5px", background: "#fff", cursor: "pointer", color: "#64748b", fontFamily: "inherit" } }, "\u6E05\u7A7A"),
                                React.createElement("label", { style: { display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#64748b", cursor: "pointer", padding: "2px 8px", border: "0.5px solid #e2e8f0", borderRadius: "5px" } },
                                    React.createElement("input", { type: "checkbox", checked: includeHistoryAgents, onChange: e => setIncludeHistoryAgents(e.target.checked), style: { accentColor: "#2563eb" } }),
                                    "\u4E5F\u986F\u793A\u5DF2\u96E2\u8077\u4EBA\u54E1"))),
                        React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: "6px" } }, availableAgents.map(name => {
                            const clr = agentColorMap[name];
                            const on = selectedTrendAgents.includes(name);
                            return (React.createElement("button", { key: name, type: "button", onClick: () => toggleAgent(name), style: {
                                    display: "inline-flex", alignItems: "center", gap: "5px",
                                    padding: "4px 10px", borderRadius: "20px", fontSize: "12px",
                                    cursor: "pointer", fontFamily: "inherit", transition: "all .12s",
                                    border: on ? `0.5px solid ${clr === null || clr === void 0 ? void 0 : clr.color}` : "0.5px solid #e2e8f0",
                                    background: on ? clr === null || clr === void 0 ? void 0 : clr.bg : "#f8fafc",
                                    color: on ? clr === null || clr === void 0 ? void 0 : clr.tc : "#64748b",
                                    fontWeight: on ? "500" : "400",
                                } },
                                React.createElement("span", { style: { width: "7px", height: "7px", borderRadius: "50%", background: (clr === null || clr === void 0 ? void 0 : clr.color) || "#888", flexShrink: 0 } }),
                                name));
                        })))))),
        React.createElement(CollapsibleCard, { style: cardStyle },
            React.createElement("div", { style: cardHeaderStyle },
                React.createElement("span", { style: cardTitleStyle }, "事件註記"),
                React.createElement("button", { type: "button", onClick: () => setShowEventForm(v => !v), style: { fontSize: "11px", padding: "3px 10px", border: "0.5px solid #e2e8f0", borderRadius: "6px", background: showEventForm ? "#eff6ff" : "#fff", color: showEventForm ? "#1d4ed8" : "#64748b", cursor: "pointer", fontFamily: "inherit" } }, showEventForm ? "收合" : "＋ 新增事件")),
            React.createElement("div", { style: { padding: "14px 20px", display: "flex", flexDirection: "column", gap: "10px" } },
                React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: "6px" } }, EVENT_TYPES.map(t => {
                    const on = eventFilterTypes.includes(t.key);
                    return React.createElement("button", { key: t.key, type: "button", onClick: () => setEventFilterTypes(prev => prev.includes(t.key) ? prev.filter(x => x !== t.key) : [...prev, t.key]), style: { display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit", border: on ? `0.5px solid ${t.color}` : "0.5px solid #e2e8f0", background: on ? t.color + "15" : "#f8fafc", color: on ? t.color : "#94a3b8", fontWeight: on ? "500" : "400" } },
                        React.createElement("span", { style: { width: "7px", height: "7px", borderRadius: "50%", background: t.color, flexShrink: 0 } }),
                        t.label);
                })),
                showEventForm && React.createElement("div", { style: { background: "#f8fafc", borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" } },
                    React.createElement("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
                        React.createElement("input", { type: "date", value: eventDraft.date, onChange: e => setEventDraft(d => ({ ...d, date: e.target.value })), style: { fontSize: "12px", padding: "6px 8px", border: "0.5px solid #e2e8f0", borderRadius: "6px", fontFamily: "inherit" } }),
                        React.createElement("select", { value: eventDraft.type, onChange: e => setEventDraft(d => ({ ...d, type: e.target.value })), style: { fontSize: "12px", padding: "6px 8px", border: "0.5px solid #e2e8f0", borderRadius: "6px", fontFamily: "inherit" } }, EVENT_TYPES.map(t => React.createElement("option", { key: t.key, value: t.key }, t.label))),
                        React.createElement("input", { type: "text", placeholder: "標題,例如:新進客服3名上線", value: eventDraft.title, onChange: e => setEventDraft(d => ({ ...d, title: e.target.value })), style: { flex: 1, minWidth: "160px", fontSize: "12px", padding: "6px 8px", border: "0.5px solid #e2e8f0", borderRadius: "6px", fontFamily: "inherit" } })),
                    React.createElement("textarea", { placeholder: "備註(選填)", value: eventDraft.note, onChange: e => setEventDraft(d => ({ ...d, note: e.target.value })), style: { fontSize: "12px", padding: "6px 8px", border: "0.5px solid #e2e8f0", borderRadius: "6px", fontFamily: "inherit", minHeight: "50px" } }),
                    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px" } },
                        React.createElement("button", { type: "button", disabled: !eventDraft.date || !eventDraft.title.trim(), onClick: () => { if (!eventDraft.date || !eventDraft.title.trim())
                                return; addEvent({ ...eventDraft, title: eventDraft.title.trim() }); setEventDraft({ date: "", type: EVENT_TYPES[0].key, title: "", note: "" }); setShowEventForm(false); }, style: { fontSize: "12px", padding: "6px 14px", border: "none", borderRadius: "6px", background: (!eventDraft.date || !eventDraft.title.trim()) ? "#cbd5e1" : "#2563eb", color: "#fff", cursor: (!eventDraft.date || !eventDraft.title.trim()) ? "not-allowed" : "pointer", fontFamily: "inherit", fontWeight: "500" } }, "儲存事件"),
                        (!eventDraft.date || !eventDraft.title.trim()) && React.createElement("span", { style: { fontSize: "11px", color: "#94a3b8" } }, "請填寫日期與標題"))),
                eventList.length === 0 ? React.createElement("div", { style: { fontSize: "12px", color: "#94a3b8", padding: "4px 0" } }, "尚無事件紀錄") : React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "4px", maxHeight: "140px", overflow: "auto" } }, eventList.slice().sort((a, b) => b.date.localeCompare(a.date)).map(ev => {
                    const cfg = EVENT_TYPES.find(t => t.key === ev.type) || EVENT_TYPES[EVENT_TYPES.length - 1];
                    return React.createElement("div", { key: ev.id, style: { display: "flex", alignItems: "center", gap: "8px", padding: "5px 8px", borderRadius: "6px", fontSize: "12px" } },
                        React.createElement("span", { style: { width: "7px", height: "7px", borderRadius: "50%", background: cfg.color, flexShrink: 0 } }),
                        React.createElement("span", { style: { color: "#94a3b8", flexShrink: 0 } }, ev.date),
                        React.createElement("span", { style: { color: "#1e293b", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, ev.title),
                        React.createElement("button", { type: "button", onClick: () => deleteEvent(ev.id), style: { fontSize: "11px", padding: "1px 7px", border: "0.5px solid #e2e8f0", borderRadius: "5px", background: "#fff", color: "#94a3b8", cursor: "pointer", fontFamily: "inherit" } }, "刪除"));
                })))),
        React.createElement("div", { className: "rwd-split", style: { display: "grid", gridTemplateColumns: "320px 1fr", gap: "12px", alignItems: "start" } },
            React.createElement(CollapsibleCard, { style: cardStyle },
                React.createElement("div", { style: cardHeaderStyle },
                    React.createElement("span", { style: cardTitleStyle }, "\u6700\u65B0\u671F\u9593\u6392\u540D"),
                    React.createElement("span", { style: { fontSize: "11px", color: "#94a3b8" } }, periodLabels[periodLabels.length - 1] || "—")),
                React.createElement("div", { style: { padding: "4px 0" } }, rankData.length === 0 ? (React.createElement("div", { style: { padding: "24px", textAlign: "center", fontSize: "12px", color: "#94a3b8" } }, "\u5C1A\u7121\u8CC7\u6599")) : rankData.map(({ name, v, clr }, i) => {
                    const rankBg = i === 0 ? "#fef3c7" : i === 1 ? "#f1f5f9" : i === 2 ? "#fef9f0" : "transparent";
                    const rankTc = i === 0 ? "#92400e" : i === 1 ? "#475569" : i === 2 ? "#78350f" : "#94a3b8";
                    const agentShift = periodList.map(p => { var _a; return (_a = (p.agents || []).find(a => a.name === name)) === null || _a === void 0 ? void 0 : _a.shift; }).find(Boolean) || "";
                    const sc = SHIFT_STYLE[agentShift] || { bg: "#f1f5f9", tc: "#475569" };
                    return (React.createElement("div", { key: name, style: { display: "grid", gridTemplateColumns: "36px 36px 1fr 80px", alignItems: "center", gap: "6px", padding: "9px 14px", borderBottom: i < rankData.length - 1 ? "0.5px solid #f8fafc" : "none", transition: "background .1s" }, onMouseEnter: e => e.currentTarget.style.background = "#f8fafc", onMouseLeave: e => e.currentTarget.style.background = "transparent" },
                        React.createElement("div", { style: { textAlign: "center" } },
                            React.createElement("span", { style: { display: "inline-block", width: "24px", height: "24px", lineHeight: "24px", textAlign: "center", borderRadius: "6px", fontSize: "12px", fontWeight: "700", background: rankBg, color: rankTc } }, i + 1)),
                        React.createElement("div", { style: { width: "30px", height: "30px", borderRadius: "50%", background: (clr === null || clr === void 0 ? void 0 : clr.bg) || "#f1f5f9", color: (clr === null || clr === void 0 ? void 0 : clr.tc) || "#334155", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${(clr === null || clr === void 0 ? void 0 : clr.color) || "#e2e8f0"}`, flexShrink: 0 } }, name[0]),
                        React.createElement("div", { style: { minWidth: 0 } },
                            React.createElement("div", { style: { fontSize: "13px", fontWeight: "500", color: "#1e293b", marginBottom: "3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } }, name),
                            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "6px" } },
                                agentShift && React.createElement("span", { style: { fontSize: "10px", fontWeight: "600", padding: "1px 6px", borderRadius: "8px", background: sc.bg, color: sc.tc, whiteSpace: "nowrap" } }, agentShift),
                                React.createElement("div", { style: { flex: 1, height: "4px", background: "#f1f5f9", borderRadius: "2px", overflow: "hidden" } },
                                    React.createElement("div", { style: { height: "100%", width: `${rankData[0].v ? Math.round((v / rankData[0].v) * 100) : 0}%`, background: (clr === null || clr === void 0 ? void 0 : clr.color) || "#2563eb", borderRadius: "2px", transition: "width .4s" } })))),
                        React.createElement("div", { style: { textAlign: "right" } },
                            React.createElement("span", { style: { fontSize: "12px", fontWeight: "600", color: (clr === null || clr === void 0 ? void 0 : clr.tc) || "#334155", background: (clr === null || clr === void 0 ? void 0 : clr.bg) || "#f1f5f9", padding: "3px 8px", borderRadius: "6px", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" } }, fmt(v)))));
                }))),
            React.createElement("div", { style: { ...cardStyle, overflow: "hidden" } },
                React.createElement("div", { style: cardHeaderStyle },
                    React.createElement("span", { style: cardTitleStyle }, "\u5404\u671F\u9593\u6578\u503C\u660E\u7D30"),
                    React.createElement("span", { style: { fontSize: "11px", color: "#94a3b8" } }, metricLabel)),
                React.createElement("div", { style: { overflowX: "auto" } },
                    React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "12px" } },
                        React.createElement("thead", null,
                            React.createElement("tr", { style: { background: "#f8fafc" } },
                                React.createElement("th", { style: { padding: "9px 14px", textAlign: "left", fontWeight: "700", color: "#64748b", borderBottom: "0.5px solid #e2e8f0", whiteSpace: "nowrap", fontSize: "11px", letterSpacing: ".02em" } }, "\u5BA2\u670D\u4EBA\u54E1"),
                                React.createElement("th", { style: { padding: "9px 10px", textAlign: "center", fontWeight: "700", color: "#64748b", borderBottom: "0.5px solid #e2e8f0", whiteSpace: "nowrap", fontSize: "11px" } }, "\u73ED\u5225"),
                                periodList.map((p, pi) => (React.createElement("th", { key: p.periodKey, style: { padding: "9px 12px", textAlign: "center", fontWeight: "700", color: pi === periodList.length - 1 ? "#1d4ed8" : "#64748b", borderBottom: "0.5px solid #e2e8f0", whiteSpace: "nowrap", fontSize: "11px", background: pi === periodList.length - 1 ? "#f0f9ff" : "#f8fafc" } }, viewType === "years" ? formatYearDisplay(p.periodKey) : viewType === "months" ? formatMonthDisplay(p.periodKey) : formatWeekKeyZh(p.periodKey)))),
                                React.createElement("th", { style: { padding: "9px 12px", textAlign: "center", fontWeight: "700", color: "#15803d", borderBottom: "0.5px solid #e2e8f0", whiteSpace: "nowrap", fontSize: "11px", background: "#f0fdf4", borderLeft: "0.5px solid #e2e8f0" } }, "\u5E73\u5747"))),
                        React.createElement("tbody", null,
                            activeAgents.map((name, ri) => {
                                const clr = agentColorMap[name];
                                const agentShift = periodList.map(p => { var _a; return (_a = (p.agents || []).find(a => a.name === name)) === null || _a === void 0 ? void 0 : _a.shift; }).find(Boolean) || "";
                                const sc = SHIFT_STYLE[agentShift] || { bg: "#f1f5f9", tc: "#475569" };
                                const agentVals = periodList.map(p => getVal(p, name)).filter(v => v != null);
                                const agentAvg = agentVals.length ? agentVals.reduce((a, b) => a + b, 0) / agentVals.length : null;
                                // V41：顏色依「門檻與目標設定」的目標值（達標綠、未達紅、沒設目標深灰）
                                const pctColor = (v) => isPct ? targetColor(v, selectedMetric, targets) : (v == null ? "#94a3b8" : "#475569");
                                return (React.createElement("tr", { key: name, style: { background: ri % 2 === 0 ? "#fff" : "#fafafa" }, onMouseEnter: e => e.currentTarget.style.background = "#f0f9ff", onMouseLeave: e => e.currentTarget.style.background = ri % 2 === 0 ? "#fff" : "#fafafa" },
                                    React.createElement("td", { style: { padding: "9px 14px", fontWeight: "500", whiteSpace: "nowrap", borderBottom: "0.5px solid #f8fafc", color: "#1e293b" } },
                                        React.createElement("span", { style: { display: "inline-flex", alignItems: "center", gap: "6px" } },
                                            React.createElement("span", { style: { width: "7px", height: "7px", borderRadius: "50%", background: (clr === null || clr === void 0 ? void 0 : clr.color) || "#888", flexShrink: 0 } }),
                                            name)),
                                    React.createElement("td", { style: { padding: "9px 10px", textAlign: "center", borderBottom: "0.5px solid #f8fafc" } }, agentShift && React.createElement("span", { style: { fontSize: "10px", fontWeight: "600", padding: "2px 7px", borderRadius: "9px", background: sc.bg, color: sc.tc, whiteSpace: "nowrap" } }, agentShift)),
                                    periodList.map((p, pi) => {
                                        const v = getVal(p, name);
                                        const isLast = pi === periodList.length - 1;
                                        return (React.createElement("td", { key: p.periodKey, style: { padding: "9px 12px", textAlign: "center", borderBottom: "0.5px solid #f8fafc", fontVariantNumeric: "tabular-nums", background: isLast ? "#f0f9ff" : "inherit" } }, v == null ? (React.createElement("span", { style: { color: "#cbd5e1" } }, "\u2014")) : isLast ? (React.createElement("span", { style: { fontSize: "12px", fontWeight: "600", color: clr === null || clr === void 0 ? void 0 : clr.tc, background: clr === null || clr === void 0 ? void 0 : clr.bg, padding: "3px 8px", borderRadius: "5px" } }, fmt(v))) : (React.createElement("span", { style: { color: pctColor(v), fontWeight: isPct ? "500" : "400" } }, fmt(v)))));
                                    }),
                                    React.createElement("td", { style: { padding: "9px 12px", textAlign: "center", borderBottom: "0.5px solid #f8fafc", fontVariantNumeric: "tabular-nums", background: "#f0fdf4", borderLeft: "0.5px solid #e2e8f0" } }, agentAvg == null ? (React.createElement("span", { style: { color: "#cbd5e1" } }, "\u2014")) : (React.createElement("span", { style: { fontSize: "12px", fontWeight: "600", color: pctColor(agentAvg), background: "#dcfce7", padding: "3px 8px", borderRadius: "5px" } }, fmt(agentAvg))))));
                            }),
                            React.createElement("tr", null,
                                React.createElement("td", { colSpan: periodList.length + 3, style: { padding: 0, borderTop: "2px solid #e2e8f0" } })),
                            (() => {
                                const colAvgs = periodList.map(p => {
                                    const vals = activeAgents.map(name => getVal(p, name)).filter(v => v != null);
                                    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
                                });
                                const agentAvgs = activeAgents.map(name => {
                                    const vals = periodList.map(p => getVal(p, name)).filter(v => v != null);
                                    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
                                }).filter(v => v != null);
                                const overallAvg = agentAvgs.length ? agentAvgs.reduce((a, b) => a + b, 0) / agentAvgs.length : null;
                                const pctColor = (v) => isPct ? targetColor(v, selectedMetric, targets) : (v == null ? "#94a3b8" : "#15803d");
                                return (React.createElement("tr", { style: { background: "#f0fdf4" } },
                                    React.createElement("td", { style: { padding: "10px 14px", fontWeight: "600", color: "#15803d", whiteSpace: "nowrap", fontSize: "12px" } }, "\u5168\u54E1\u5E73\u5747"),
                                    React.createElement("td", { style: { padding: "10px 10px", textAlign: "center", fontSize: "11px", color: "#94a3b8" } }, "\u2014"),
                                    colAvgs.map((v, pi) => {
                                        const isLast = pi === periodList.length - 1;
                                        return (React.createElement("td", { key: pi, style: { padding: "10px 12px", textAlign: "center", fontVariantNumeric: "tabular-nums", background: isLast ? "#dcfce7" : "#f0fdf4" } }, v == null ? React.createElement("span", { style: { color: "#cbd5e1" } }, "\u2014") : React.createElement("span", { style: { fontWeight: "600", color: pctColor(v) } }, fmt(v))));
                                    }),
                                    React.createElement("td", { style: { padding: "10px 12px", textAlign: "center", fontVariantNumeric: "tabular-nums", background: "#dcfce7", borderLeft: "0.5px solid #e2e8f0" } }, overallAvg == null ? React.createElement("span", { style: { color: "#cbd5e1" } }, "\u2014") : React.createElement("span", { style: { fontWeight: "700", color: pctColor(overallAvg), fontSize: "13px" } }, fmt(overallAvg)))));
                            })())))))));
}
// ─── APP COMPONENT ────────────────────────────────────────────────────────────
// KPI 卡片裡的「近 12 週」小趨勢線。better = "low"（越低越好，例如漏接率）或 "high"（越高越好，例如滿意度）。
// V41：只算到本期最後一天（endLabel，例如 08/31）；最後一週沒走完時畫空心點，而且不拿來判斷趨勢。
// 顏色與文字比較第一個與最後一個「完整週」：變好綠色「改善中」、變差紅色「變差中」、差距小於 0.5 個百分點灰色「持平」。
function Sparkline({ points = [], better = "high", endLabel = "" }) {
    const vals = points.map((p) => p.value);
    const idx = vals.map((v, i) => v == null ? null : i).filter((i) => i != null);
    const caption = endLabel ? `截至 ${endLabel}・近 12 週` : "近 12 週";
    if (idx.length < 2) return React.createElement("div", { style: { fontSize: "10px", color: "#94a3b8", marginTop: "8px", position: "relative", zIndex: 1 } }, `${caption}資料不足`);
    const nums = idx.map((i) => vals[i]);
    const min = Math.min(...nums), max = Math.max(...nums), span = max - min || 1;
    const W = 120, H = 30;
    const x = (i) => vals.length > 1 ? i / (vals.length - 1) * W : 0;
    const y = (v) => H - 3 - (v - min) / span * (H - 6);
    const segments = []; let current = [];
    vals.forEach((v, i) => { if (v == null) { if (current.length) segments.push(current); current = []; } else current.push(`${x(i).toFixed(1)},${y(v).toFixed(1)}`); });
    if (current.length) segments.push(current);
    const fullIdx = idx.filter((i) => !points[i].partial);
    const judge = fullIdx.length >= 2 ? fullIdx : idx;
    const diff = vals[judge[judge.length - 1]] - vals[judge[0]];
    const flat = Math.abs(diff) < 0.5;
    const improving = better === "low" ? diff < 0 : diff > 0;
    const color = flat ? "#64748b" : improving ? "#16a34a" : "#dc2626";
    const lastIndex = idx[idx.length - 1];
    const lastPartial = !!points[lastIndex].partial;
    return React.createElement("div", { style: { marginTop: "8px", position: "relative", zIndex: 1 }, title: points.map((p) => `${p.label}：${p.value == null ? "—" : `${p.value.toFixed(1)}%`}`).join("\n") },
        React.createElement("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", height: "30", preserveAspectRatio: "none", style: { display: "block", overflow: "visible" }, role: "img", "aria-label": caption },
            segments.map((seg, k) => seg.length === 1
                ? React.createElement("circle", { key: k, cx: seg[0].split(",")[0], cy: seg[0].split(",")[1], r: "1.5", fill: color })
                : React.createElement("polyline", { key: k, points: seg.join(" "), fill: "none", stroke: color, strokeWidth: "2", vectorEffect: "non-scaling-stroke", strokeLinejoin: "round", strokeLinecap: "round" })),
            React.createElement("circle", { cx: x(lastIndex), cy: y(vals[lastIndex]), r: "2.6", fill: lastPartial ? "#fff" : color, stroke: color, strokeWidth: "1.5", vectorEffect: "non-scaling-stroke" })),
        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "10px", fontWeight: "700", color: "#94a3b8", marginTop: "2px" } },
            React.createElement("span", null, caption),
            React.createElement("span", { style: { color } }, flat ? "持平" : improving ? "改善中" : "變差中")));
}
function NumberExplanationDialog({ onClose, rangeLabel, calls, satisfaction, targets, validationReport }) {
    const percent = (value) => Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}%` : "—";
    const formulaRows = [
        ["有效進線", calls.offered.toLocaleString(), "同一對話 ID 合併後的全部傳入電話"],
        ["已接聽", calls.answered.toLocaleString(), "同一對話任一筆有客服名稱即算已接聽"],
        ["漏接", calls.missed.toLocaleString(), "有效進線 − 已接聽"],
        ["漏接率", percent(calls.missedRate), `${calls.missed.toLocaleString()} 漏接 ÷ ${calls.offered.toLocaleString()} 有效進線`],
        ["Q1 人員非常滿意", satisfaction.q1.answered ? percent(satisfaction.q1.rate) : "—", `${satisfaction.q1.verySatisfied.toLocaleString()} 非常滿意 ÷ ${satisfaction.q1.answered.toLocaleString()} 個 Q1 有效回答`],
        ["Q2 問題非常滿意", satisfaction.q2.answered ? percent(satisfaction.q2.rate) : "—", `${satisfaction.q2.verySatisfied.toLocaleString()} 非常滿意 ÷ ${satisfaction.q2.answered.toLocaleString()} 個 Q2 有效回答`],
        ["Q1 調查率", calls.answered ? percent(satisfaction.q1.surveyRate) : "—", `${satisfaction.q1.answered.toLocaleString()} 個 Q1 回答 ÷ ${calls.answered.toLocaleString()} 已接聽`],
        ["Q2 調查率", calls.answered ? percent(satisfaction.q2.surveyRate) : "—", `${satisfaction.q2.answered.toLocaleString()} 個 Q2 回答 ÷ ${calls.answered.toLocaleString()} 已接聽`],
    ];
    const excluded = (validationReport && validationReport.excluded) || {};
    const targetText = [["漏接率", targets.missedRate, "≤"], ["Q1", targets.q1Rate, "≥"], ["Q2", targets.q2Rate, "≥"], ["Q1調查率", targets.q1SurveyRate, "≥"], ["Q2調查率", targets.q2SurveyRate, "≥"]]
        .map(([label, value, symbol]) => value == null || value === "" ? `${label}未設定` : `${label} ${symbol} ${value}%`).join("｜");
    const header = React.createElement("div", { style: { padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" } },
        React.createElement("div", null,
            React.createElement("div", { style: { fontSize: "17px", fontWeight: "900", color: "#0f172a" } }, "數字怎麼算"),
            React.createElement("div", { style: { marginTop: "3px", fontSize: "12px", color: "#64748b" } }, `目前畫面期間：${rangeLabel}`)),
        React.createElement("button", { type: "button", onClick: onClose, "aria-label": "關閉數字說明", style: { border: 0, background: "#f1f5f9", borderRadius: "8px", width: "32px", height: "32px", cursor: "pointer", fontSize: "18px" } }, "×"));
    const table = React.createElement("div", { style: { overflowX: "auto" } },
        React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "12px" } },
            React.createElement("thead", null, React.createElement("tr", null, ["指標", "本期數字", "計算方式"].map((heading) => React.createElement("th", { key: heading, style: CRM.th }, heading)))),
            React.createElement("tbody", null, formulaRows.map((row) => React.createElement("tr", { key: row[0] }, row.map((value, index) => React.createElement("td", { key: index, style: { ...CRM.td, textAlign: index === 1 ? "right" : "left", fontWeight: index === 1 ? "800" : "500" } }, value)))))));
    const info = React.createElement("div", { style: { marginTop: "14px", padding: "12px 14px", borderRadius: "10px", background: "#f8fafc", color: "#475569", fontSize: "12px", lineHeight: 1.8 } },
        React.createElement("b", null, "目前目標："), targetText,
        validationReport && React.createElement(React.Fragment, null, React.createElement("br"), React.createElement("b", null, "本次匯入處理："), `原始 ${Number(validationReport.rawCount || 0).toLocaleString()} 筆；排除非傳入 ${Number(excluded.notIncoming || 0).toLocaleString()} 筆、日期異常 ${Number(excluded.missingDate || 0).toLocaleString()} 筆；合併重複 ${Number(excluded.duplicateWithinUpload || 0).toLocaleString()} 筆。`));
    const actions = React.createElement("div", { style: { marginTop: "12px", textAlign: "right" } }, React.createElement("button", { type: "button", onClick: onClose, style: CRM.btnPrimary }, "關閉"));
    return React.createElement("div", { role: "dialog", "aria-modal": "true", "aria-label": "數字說明", onClick: onClose, style: { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,23,42,.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" } },
        React.createElement("div", { onClick: (event) => event.stopPropagation(), style: { width: "min(820px,100%)", maxHeight: "88vh", overflow: "auto", background: "#fff", borderRadius: "18px", boxShadow: "0 24px 70px rgba(15,23,42,.22)" } },
            header,
            React.createElement("div", { style: { padding: "16px 20px" } }, table, info, actions)));
}

function DashboardHomeV38({ cloudMasterStore, eventList, onNavigate, missingWeekKeys = [], settings = DEFAULT_ANALYSIS_SETTINGS, addEvent, deleteEvent, validationReport }) {
    const rows = (cloudMasterStore && cloudMasterStore.rows) || [];
    const [showEventForm, setShowEventForm] = useState(false);
    const [eventDraft, setEventDraft] = useState({ date: "", title: "", note: "" });
    const [eventMessage, setEventMessage] = useState("");
    const EXECUTIVE_ACTIONS_KEY = "weekly_call_project_executive_actions_v394";
    const [executiveActions, setExecutiveActions] = useState(() => {
        try { const saved = JSON.parse(localStorage.getItem(EXECUTIVE_ACTIONS_KEY) || "[]"); return Array.isArray(saved) ? saved : []; }
        catch (error) { return []; }
    });
    const [actionDraft, setActionDraft] = useState({ action: "", owner: "", dueDate: "", status: "待處理" });
    // V40：「下一步」可以改寫成實際對策；依期間（起訖日）分別記在本機，改寫過的顯示為「本期對策」。
    const NEXT_STEPS_KEY = "weekly_call_project_v40_next_steps";
    const [nextSteps, setNextSteps] = useState(() => { try { const saved = JSON.parse(localStorage.getItem(NEXT_STEPS_KEY) || "{}"); return saved && typeof saved === "object" ? saved : {}; } catch (error) { return {}; } });
    const [editingNextStep, setEditingNextStep] = useState(false);
    const [nextStepDraft, setNextStepDraft] = useState("");
    const saveNextSteps = (next) => { setNextSteps(next); try { localStorage.setItem(NEXT_STEPS_KEY, JSON.stringify(next)); } catch (error) {} };
    const saveExecutiveActions = (next) => {
        setExecutiveActions(next);
        try { localStorage.setItem(EXECUTIVE_ACTIONS_KEY, JSON.stringify(next)); } catch (error) {}
    };
    // V39：門檻與樣本下限由「門檻與目標設定」頁控制。
    const riskRules = useMemo(() => window.V41Core.buildRiskRules(settings.rules), [settings.rules]);
    const availableDates = useMemo(() => rows.map((row) => String(row.date || "").replace(/\//g, "-")).filter(Boolean).sort(), [rows]);
    const latestDate = availableDates[availableDates.length - 1] || formatDateKey(new Date());
    const [selectedDate, setSelectedDate] = useState(latestDate);
    const [rangeMode, setRangeMode] = useState("day");
    const [view, setView] = useState("metrics");
    const [showHelp, setShowHelp] = useState(false);
    const [showNumberInfo, setShowNumberInfo] = useState(false);
    useEffect(() => { if (availableDates.length && !availableDates.includes(selectedDate)) setSelectedDate(latestDate); }, [latestDate]);
    const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const range = useMemo(() => {
        const end = new Date(`${selectedDate}T12:00:00`);
        const start = new Date(end);
        if (rangeMode === "yesterday") { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); }
        if (rangeMode === "7d") start.setDate(start.getDate() - 6);
        if (rangeMode === "30d") start.setDate(start.getDate() - 29);
        if (rangeMode === "ytd") start.setMonth(0, 1);
        if (rangeMode === "lastYear") { start.setFullYear(end.getFullYear() - 1, 0, 1); end.setFullYear(end.getFullYear() - 1, 11, 31); }
        if (rangeMode === "3y") start.setFullYear(start.getFullYear() - 2, 0, 1);
        // V41：本月＝1 號到所選日期；上個月＝所選日期前一個月的整個月。
        if (rangeMode === "month") start.setDate(1);
        if (rangeMode === "lastMonth") return window.V41Core.monthBounds(window.V41Core.shiftMonthKey(dateKey(end), -1));
        return { start: dateKey(start), end: dateKey(end) };
    }, [selectedDate, rangeMode]);
    const rangeRows = useMemo(() => rows.filter((row) => { const d = String(row.date || "").replace(/\//g, "-"); return d >= range.start && d <= range.end; }), [rows, range]);
    const compare = useMemo(() => comparisonRange(range.start, range.end, rangeMode), [range, rangeMode]);
    // 比較期間若早於匯入資料的最早日期，代表只有部分資料：通數類不比較、不判定爆量；比例類（漏接率、滿意度）照常比較。
    const coverage = comparisonCoverage(compare, availableDates[0] || "");
    const previousRows = useMemo(() => rows.filter((row) => { const d = String(row.date || "").replace(/\//g, "-"); return d >= compare.start && d <= compare.end; }), [rows, compare]);
    const calls = useMemo(() => summarizeMissedCalls(rangeRows), [rangeRows]);
    const previousCalls = useMemo(() => summarizeMissedCalls(previousRows), [previousRows]);
    // 問卷兩題分開統計：Q1 人員滿意度、Q2 問題滿意度；調查率＝該題有效回答 ÷ 有效進線。
    const summarizeQuestion = (list, field, offered) => {
        let answered = 0, verySatisfied = 0, fair = 0, veryUnsatisfied = 0;
        list.forEach((row) => { const answer = row[field]; if (VALID_SURVEY.includes(answer)) { answered += 1; if (answer === "非常滿意") verySatisfied += 1; if (answer === "尚可") fair += 1; if (answer === "非常不滿意") veryUnsatisfied += 1; } });
        const pct = (n) => answered ? n / answered * 100 : 0;
        return { answered, verySatisfied, fair, veryUnsatisfied, rate: pct(verySatisfied), fairRate: pct(fair), veryUnsatRate: pct(veryUnsatisfied), surveyRate: offered ? answered / offered * 100 : 0 };
    };
    const summarizeSurvey = (list, offered) => ({ q1: summarizeQuestion(list, "q1", offered), q2: summarizeQuestion(list, "q2", offered) });
    const SURVEY_QUESTIONS = [{ key: "q1", label: "Q1 人員", title: "人員非常滿意度(Q1)" }, { key: "q2", label: "Q2 問題", title: "問題非常滿意度(Q2)" }];
    const satisfaction = useMemo(() => summarizeSurvey(rangeRows, calls.answered), [rangeRows, calls.answered]); // V41：調查率 ÷ 已接聽
    const previousSatisfaction = useMemo(() => summarizeSurvey(previousRows, previousCalls.answered), [previousRows, previousCalls.answered]);
    const allIncidents = (eventList || []).filter((event) => event.type === "incident");
    const incidents = allIncidents.filter((event) => event.date && event.date >= range.start && event.date <= range.end);
    const undatedIncidents = allIncidents.filter((event) => !event.date);
    const numberChange = (current, previous) => previous ? (current - previous) / previous * 100 : null;
    const volumeChangePct = numberChange(calls.offered, previousCalls.offered);
    const classifiedRisk = classifyOperationalRisk({
        volumeChangePct, volumeComparable: coverage.complete, missedRate: calls.missedRate, currentCalls: calls.offered, previousCalls: previousCalls.offered, compareLabel: compare.label,
        incidentCount: incidents.length, undatedIncidentCount: undatedIncidents.length,
        surveys: SURVEY_QUESTIONS.map((q) => ({ key: q.key, label: q.label, rate: satisfaction[q.key].rate, previousRate: previousSatisfaction[q.key].rate, sample: satisfaction[q.key].answered, previousSample: previousSatisfaction[q.key].answered, surveyRate: satisfaction[q.key].surveyRate, veryUnsatisfiedRate: satisfaction[q.key].veryUnsatRate })),
        rules: riskRules, minCalls: settings.sample.minCalls, minAnswers: settings.sample.minAnswers,
    });
    const riskItems = [...classifiedRisk.items];
    const skippedNotes = classifiedRisk.skipped || [];
    // 缺漏週次只看「本期」與「比較期間」涵蓋到的週；整份資料其他時段的缺漏不列入本期風險。
    const periodWeekKeys = new Set();
    [[range.start, range.end], [compare.start, compare.end]].forEach(([from, to]) => {
        const cursor = new Date(`${from}T12:00:00`), end = new Date(`${to}T12:00:00`);
        for (let guard = 0; cursor <= end && guard < 2000; guard++) { const info = getWeekInfo(dateKey(cursor)); if (info && info.weekKey) periodWeekKeys.add(info.weekKey); cursor.setDate(cursor.getDate() + 1); }
    });
    const relevantMissingWeeks = missingWeekKeys.filter((key) => periodWeekKeys.has(key));
    if (relevantMissingWeeks.length) riskItems.push({ key: "missing-weeks", level: "watch", category: "資料完整性", title: `本期或比較期間缺漏 ${relevantMissingWeeks.length} 個週次`, detail: relevantMissingWeeks.map(formatWeekKeyZh).join("、") });
    const riskRank = { normal: 0, watch: 1, medium: 2, high: 3 };
    const overallRiskLevel = riskItems.reduce((level, item) => riskRank[item.level] > riskRank[level] ? item.level : level, "normal");
    const riskMeta = {
        normal: { label: "系統穩定安全", color: "#047857", bg: "#ecfdf5", border: "#a7f3d0", dot: "#34d399" },
        watch: { label: "注意觀察", color: "#a16207", bg: "#fefce8", border: "#fef08a", dot: "#eab308" },
        medium: { label: "中度風險", color: "#b45309", bg: "#fff7ed", border: "#fed7aa", dot: "#f97316" },
        high: { label: "需要立即關注", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca", dot: "#ef4444" },
    };
    const risk = riskMeta[overallRiskLevel];
    const targets = settings.targets || {};
    // V41：目標值留空＝未設目標，不再自動用 5%；相關卡片顯示「未設目標」。
    const hasTargetValue = (v) => v != null && v !== "" && Number.isFinite(Number(v));
    const missedTarget = hasTargetValue(targets.missedRate) ? Number(targets.missedRate) : null;
    const allowedMissed = calls.offered && missedTarget != null ? Math.floor(calls.offered * missedTarget / 100) : 0;
    const excessMissed = missedTarget == null ? 0 : Math.max(0, calls.missed - allowedMissed);
    const surveyDelta = (k) => calls.answered && previousCalls.answered ? satisfaction[k].surveyRate - previousSatisfaction[k].surveyRate : null;
    const fmtDelta = (v) => v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(1)}`;
    // V40：近 12 週走勢（到本期最後一天所在的那一週為止），給漏接率、Q1、Q2 卡片畫小趨勢線。
    const weekly = useMemo(() => window.V41Core.weeklySeries(rows, range.end, 12), [rows, range.end]);
    const sparkPoints = (field) => weekly.map((w) => ({ label: `${w.start.slice(5).replace("-", "/")} 週${w.partial ? "（未滿一週）" : ""}`, value: w[field], partial: w.partial }));
    const sparkEnd = range.end.slice(5).replace("-", "/");
    const cards = [
        { label: "有效進線量", value: calls.offered, icon: "☎", delta: volumeChangePct, unit: "%", countBased: true },
        { label: "漏接率", value: `${calls.missedRate.toFixed(1)}%`, icon: "◷", delta: previousCalls.offered ? calls.missedRate - previousCalls.missedRate : null, unit: "個百分點", badUp: true, sub: `漏接 ${calls.missed.toLocaleString()}／${calls.offered.toLocaleString()} 通｜${missedTarget == null ? "未設目標" : `目標 ≤ ${missedTarget}%`}`, spark: { points: sparkPoints("missedRate"), better: "low", endLabel: sparkEnd } },
        { label: "超出目標漏接", value: missedTarget == null ? "—" : excessMissed, icon: "!", foot: missedTarget == null ? "未設漏接率目標（到「門檻與目標設定」設定）" : excessMissed ? `若達 ${missedTarget}% 目標，本期可少約 ${excessMissed} 通漏接` : "目前漏接通數在目標範圍內", accent: missedTarget == null ? "#94a3b8" : excessMissed ? "#dc2626" : "#15803d" },
        ...SURVEY_QUESTIONS.map((q) => {
            const cur = satisfaction[q.key], prev = previousSatisfaction[q.key];
            return { label: q.title, value: cur.answered ? `${cur.rate.toFixed(1)}%` : "—", icon: "♡", delta: cur.answered && prev.answered ? cur.rate - prev.rate : null, unit: "個百分點", sub: `有效回答 n=${cur.answered.toLocaleString()}`, accent: "#4f46e5", spark: { points: sparkPoints(`${q.key}Rate`), better: "high", endLabel: sparkEnd } };
        }),
        { label: "調查率 Q1／Q2", value: calls.answered ? `${satisfaction.q1.surveyRate.toFixed(1)}%／${satisfaction.q2.surveyRate.toFixed(1)}%` : "—", valueSize: "21px", icon: "✎", foot: `較${compare.label}（百分點）\nQ1 ${fmtDelta(surveyDelta("q1"))}｜Q2 ${fmtDelta(surveyDelta("q2"))}`, footFixedLines: true, sub: `回答數 ÷ 已接聽 ${calls.answered.toLocaleString()} 通`, accent: "#0f766e" },
    ];
    const fmtCompare = `${compare.start.replace(/-/g, "/")} ～ ${compare.end.replace(/-/g, "/")}`;
    const fmtRange = `${range.start.replace(/-/g, "/")} ～ ${range.end.replace(/-/g, "/")}`;
    const dateDisplay = range.start === range.end ? range.end.replace(/-/g, "/") : fmtRange;
    // V40：「本期重點」＝三行結論（原本的「本期三件事」與「主管決策摘要」合併）＋一行「下一步」。
    const lines = useMemo(() => window.V41Core.lineBreakdown(rangeRows, previousRows), [rangeRows, previousRows]);
    // V41：漏接率風險燈號（沒設目標時，本期重點與下一步改看這個）
    const missedLevel = (riskItems.find((i) => i.key === "missed") || {}).level || "normal";
    const highlights = window.V41Core.executiveHighlights({
        missedLevel,
        current: { offered: calls.offered, missed: calls.missed, missedRate: calls.offered ? calls.missedRate : null },
        previous: { offered: previousCalls.offered, missedRate: previousCalls.offered ? previousCalls.missedRate : null },
        lines, targets, incidents, minCalls: settings.sample.minCalls, minAnswers: settings.sample.minAnswers, volumeComparable: coverage.complete,
        volumeWatch: (riskRules.find((r) => r.key === "volume") || {}).watch,
        satisfaction: { q1: satisfaction.q1, q2: satisfaction.q2 },
    });
    // 「下一步」提到的專線，跟三行結論裡的「最嚴重專線」用同一個規則（來電 10 通以上、漏接率最高），避免兩處講不同的專線。
    const topLine = lines.filter((l) => l.line !== "未分類" && l.offered >= 10 && l.missedRate != null).sort((a, b) => b.missedRate - a.missedRate || b.missed - a.missed)[0] || null;
    const topLinePeakHour = useMemo(() => {
        if (!topLine) return null;
        const hours = summarizeMissedCalls(rangeRows.filter((row) => row.line === topLine.line)).byHour.filter((h) => h.missed > 0 && h.key !== "未分類");
        return hours.sort((a, b) => b.missed - a.missed || b.missedRate - a.missedRate)[0] || null;
    }, [rangeRows, topLine && topLine.line]);
    const satisfactionBelow = ["q1", "q2"].some((k) => satisfaction[k].answered > 0 && targets[`${k}Rate`] != null && targets[`${k}Rate`] !== "" && satisfaction[k].rate < Number(targets[`${k}Rate`]));
    const suggestedNextStep = window.V41Core.nextStepSuggestion({ excessMissed, missedAlert: missedTarget == null && missedLevel !== "normal", worstLine: topLine && (missedTarget == null ? missedLevel !== "normal" : topLine.missedRate > missedTarget) ? topLine.line : "", peakHour: topLinePeakHour ? topLinePeakHour.key : "", incidents, satisfactionBelow });
    const periodKey = `${range.start}_${range.end}`;
    // V41：改寫「下一步」時若切換期間，自動取消編輯，避免文字存到另一個期間。
    useEffect(() => { setEditingNextStep(false); }, [periodKey]);
    const customNextStep = (nextSteps[periodKey] || "").trim();
    const nextStepText = customNextStep || suggestedNextStep;
    const dataConfidence = !calls.offered ? "無可分析資料" : relevantMissingWeeks.length ? `需注意：本期／比較期缺 ${relevantMissingWeeks.length} 週` : !coverage.complete ? "比較期間資料不完整" : satisfaction.q1.answered < Number(settings.sample.minAnswers || 0) || satisfaction.q2.answered < Number(settings.sample.minAnswers || 0) ? "問卷樣本偏少" : "資料範圍完整";
    const toneMeta = { bad: { dot: "🔴", color: "#b91c1c", bg: "#fef2f2" }, warn: { dot: "🟡", color: "#a16207", bg: "#fefce8" }, good: { dot: "🟢", color: "#15803d", bg: "#f0fdf4" } };
    const offTarget = (value, target, better) => value != null && hasTargetValue(target) && (better === "low" ? value > Number(target) : value < Number(target));
    // V41：沒設目標不上紅綠色；樣本太少（來電不到 10 通）的業務線一律灰色、不判斷。
    const cellPct = (value, target, better, lowSample) => React.createElement("span", { style: { fontWeight: "800", color: value == null || lowSample ? "#94a3b8" : !hasTargetValue(target) ? "#334155" : offTarget(value, target, better) ? "#dc2626" : "#15803d" } }, value == null ? "—" : `${value.toFixed(1)}%`);
    const LINE_MIN_CALLS = 10;
    const targetLegend = [["漏接率", targets.missedRate], ["Q1", targets.q1Rate], ["Q2", targets.q2Rate]].filter((x) => hasTargetValue(x[1])).map((x) => `${x[0]} ${x[1]}%`).join("、");
    const presetStyle = (key) => ({ border: "none", background: rangeMode === key ? "#eef2ff" : "transparent", color: rangeMode === key ? "#4f46e5" : "#64748b", padding: "8px 12px", borderRadius: "10px", fontWeight: "700", fontSize: "12px", cursor: "pointer" });
    const viewStyle = (key) => ({ flex: 1, minWidth: "190px", border: "none", borderBottom: view === key ? "3px solid #6366f1" : "3px solid transparent", background: view === key ? "#fff" : "transparent", color: view === key ? "#4f46e5" : "#94a3b8", padding: "16px 18px", fontWeight: "800", fontSize: "14px", cursor: "pointer" });
    const panel = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "22px", boxShadow: "0 8px 24px rgba(15,23,42,.04)" };
    return React.createElement("div", { style: { background: "#f4f7fb", borderRadius: "24px", padding: "14px", display: "flex", flexDirection: "column", gap: "18px" } },
        React.createElement("div", { style: { ...panel, borderRadius: "16px", overflow: "hidden" } },
            React.createElement("div", { style: { padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", background: "#f8fafc" } },
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" } },
                    React.createElement("label", { title: "點此選擇截止日期", style: { position: "relative", display: "flex", alignItems: "center", gap: "8px", minWidth: range.start === range.end ? "150px" : "235px", background: "#fff", border: "1px solid #dbe3ef", borderRadius: "12px", padding: "9px 12px", cursor: "pointer", overflow: "hidden" } },
                        React.createElement("span", { style: { color: "#4f46e5", flexShrink: 0 } }, "▣"),
                        React.createElement("span", { style: { fontWeight: "800", color: "#334155", fontSize: "13px", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } }, dateDisplay),
                        React.createElement("span", { style: { color: "#64748b", marginLeft: "auto", flexShrink: 0 } }, "▾"),
                        React.createElement("input", { type: "date", value: rangeMode === "yesterday" ? range.end : selectedDate, max: latestDate, "aria-label": "選擇分析截止日期", onChange: (event) => { setSelectedDate(event.target.value); if (rangeMode === "yesterday") setRangeMode("day"); }, style: { position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" } })),
                    [["day", "當日"], ["yesterday", "昨日"], ["7d", "近 7 日"], ["30d", "近 30 日"], ["month", "本月"], ["lastMonth", "上個月"], ["ytd", "本年度"], ["lastYear", "去年度"], ["3y", "近三個年度"]].map(([key, label]) => React.createElement("button", { key, onClick: () => setRangeMode(key), style: presetStyle(key) }, label))),
                React.createElement("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
                    React.createElement("button", { onClick: () => setShowNumberInfo(true), style: { border: "1px solid #dbe3ef", background: "#fff", color: "#475569", borderRadius: "12px", padding: "8px 13px", fontWeight: "700", cursor: "pointer" } }, "ⓘ 數字說明"),
                    React.createElement("button", { onClick: () => setShowHelp((value) => !value), style: { border: "1px solid #dbe3ef", background: "#fff", color: "#64748b", borderRadius: "12px", padding: "8px 13px", fontWeight: "700", cursor: "pointer" } }, "看板使用說明"))),
            React.createElement("div", { style: { display: "flex", alignItems: "stretch", flexWrap: "wrap", borderTop: "1px solid #eef2f7" } },
                [["metrics", "▦  1. 全專案服務指標"], ["diagnosis", "⌁  2. 漏接與滿意度診斷"], ["events", "ϟ  3. 重大事件一覽表"], ["versions", "☰  4. 版本歷程"]].map(([key, label]) => React.createElement("button", { key, onClick: () => setView(key), style: viewStyle(key) }, label)))),
        showNumberInfo && React.createElement(NumberExplanationDialog, { onClose: () => setShowNumberInfo(false), rangeLabel: fmtRange, calls, satisfaction, targets, validationReport }),
        showHelp && React.createElement("div", { style: { ...panel, padding: "14px 18px", fontSize: "12px", color: "#475569", lineHeight: 1.8 } }, "有效進線以對話 ID 去重；任一段有客服即為已接聽，全部沒有客服才算漏接。選「當日／昨日」時與上週同一天比較；「本年度」與去年同期比較；「去年度」與前一年度比較；其他期間與緊鄰的同長度前期比較。比較期間若早於匯入資料的最早日期，通數不比較、不判定來電爆量。完整門檻請見「2. 漏接與滿意度診斷」下方的「風險定義與分類規則」。"),
        React.createElement("div", { style: { ...panel, padding: "18px 20px", display: "flex", alignItems: "center", gap: "15px", background: risk.bg, borderColor: risk.border } },
            React.createElement("div", { style: { width: "44px", height: "44px", borderRadius: "13px", background: "#fff", color: risk.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: "900" } }, overallRiskLevel === "normal" ? "✓" : "!"),
            React.createElement("div", null,
                React.createElement("div", { style: { color: risk.color, fontSize: "16px", fontWeight: "900" } }, "營運狀態： ", React.createElement("span", { style: { color: risk.dot } }, "●"), " ", risk.label),
                React.createElement("div", { style: { color: "#475569", fontSize: "13px", fontWeight: "600", marginTop: "5px" } }, !calls.offered ? "目前期間沒有可分析的資料：還沒匯入請先到「地端資料匯入」，已匯入請換一個日期或期間。" : riskItems.length ? `${riskItems.length} 項觸發：${riskItems.slice(0, 2).map((item) => item.title).join("；")}${riskItems.length > 2 ? "…" : ""}${skippedNotes.length ? `（另有 ${skippedNotes.length} 項樣本不足未判定）` : ""}` : skippedNotes.length ? `目前未觸發風險門檻，但有 ${skippedNotes.length} 項因樣本不足未判定（詳見「2. 漏接與滿意度診斷」）。` : "目前未觸發任何風險門檻。"))),
        view === "metrics" && React.createElement(React.Fragment, null,
            // V40：本期重點（合併原本的「本期三件事」與「主管決策摘要」）＋ 期間與資料可信度（縮成標題列上的小字）。
            calls.offered > 0 && React.createElement("div", { style: { ...panel, padding: "16px 20px" } },
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "10px" } },
                    React.createElement("div", { style: { fontSize: "14px", fontWeight: "900", color: "#172033" } }, "本期重點"),
                    React.createElement("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" } },
                        React.createElement("span", { style: CRM.badge("#f8fafc", "#64748b") }, `${fmtRange}｜比較 ${compare.label}`),
                        dataConfidence !== "資料範圍完整" && React.createElement("span", { style: CRM.badge("#fefce8", "#a16207") }, `⚠ ${dataConfidence}`))),
                React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } },
                    highlights.map((h, i) => React.createElement("div", { key: i, style: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "12px", background: toneMeta[h.tone].bg, color: toneMeta[h.tone].color, fontSize: "16px", fontWeight: "800" } }, React.createElement("span", null, toneMeta[h.tone].dot), h.text)),
                    // 下一步：預設是系統建議（標示「僅供參考」）；改寫後存成「本期對策」。
                    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "12px", background: "#eef2ff", border: "1px dashed #c7d2fe", flexWrap: "wrap" } },
                        React.createElement("span", { style: { fontSize: "16px" } }, "👉"),
                        React.createElement("span", { style: { fontSize: "13px", fontWeight: "900", color: "#3730a3", whiteSpace: "nowrap" } }, "下一步"),
                        editingNextStep
                            ? React.createElement("input", { autoFocus: true, value: nextStepDraft, maxLength: 40, onChange: (e) => setNextStepDraft(e.target.value), onKeyDown: (e) => { if (e.key === "Enter") { saveNextSteps({ ...nextSteps, [periodKey]: nextStepDraft.trim() }); setEditingNextStep(false); } if (e.key === "Escape") setEditingNextStep(false); }, placeholder: "寫下本期實際要做的對策，例如：週五晚班增加 1 席", style: { ...CRM.input, flex: 1, minWidth: "220px", fontSize: "14px" } })
                            : React.createElement("span", { style: { fontSize: "16px", fontWeight: "800", color: "#1e1b4b", flex: 1, minWidth: "160px" } }, nextStepText),
                        !editingNextStep && React.createElement("span", { style: CRM.badge(customNextStep ? "#dcfce7" : "#f1f5f9", customNextStep ? "#15803d" : "#64748b") }, customNextStep ? "本期對策" : "系統建議，僅供參考"),
                        editingNextStep
                            ? React.createElement(React.Fragment, null,
                                React.createElement("button", { type: "button", onClick: () => { saveNextSteps({ ...nextSteps, [periodKey]: nextStepDraft.trim() }); setEditingNextStep(false); }, style: { ...CRM.btnPrimary, padding: "6px 12px", fontSize: "12px" } }, "儲存"),
                                React.createElement("button", { type: "button", onClick: () => setEditingNextStep(false), style: { ...CRM.btnGhost, padding: "6px 12px", fontSize: "12px" } }, "取消"))
                            : React.createElement(React.Fragment, null,
                                React.createElement("button", { type: "button", onClick: () => { setNextStepDraft(customNextStep || suggestedNextStep); setEditingNextStep(true); }, style: { ...CRM.btnGhost, padding: "5px 10px", fontSize: "12px" } }, "改寫"),
                                customNextStep && React.createElement("button", { type: "button", onClick: () => { const next = { ...nextSteps }; delete next[periodKey]; saveNextSteps(next); }, style: { ...CRM.btnGhost, padding: "5px 10px", fontSize: "12px" } }, "改回系統建議"),
                                React.createElement("button", { type: "button", onClick: () => setActionDraft((draft) => ({ ...draft, action: nextStepText })), style: { ...CRM.btnGhost, padding: "5px 10px", fontSize: "12px" } }, "帶入行動追蹤"))))),
            React.createElement("div", { className: "v37-kpi-grid v40-kpi-grid", style: { display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: "12px" } }, cards.map((card) => {
                const deltaColor = card.delta == null ? "#94a3b8" : ((card.badUp ? card.delta > 0 : card.delta < 0) ? "#f43f5e" : "#10b981");
                return React.createElement("div", { key: card.label, style: { ...panel, minHeight: "140px", padding: "16px 18px", position: "relative", overflow: "hidden" } },
                    React.createElement("div", { style: { fontSize: "11px", color: "#64748b", fontWeight: "800" } }, card.label),
                    React.createElement("div", { style: { position: "absolute", right: "16px", top: "16px", width: "34px", height: "34px", borderRadius: "11px", background: "#f8fafc", color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900" } }, card.icon),
                    React.createElement("div", { style: { fontSize: card.valueSize || "30px", color: card.accent || "#172033", fontWeight: "900", marginTop: card.valueSize ? "36px" : "30px", whiteSpace: "nowrap" } }, typeof card.value === "number" ? card.value.toLocaleString() : card.value),
                    React.createElement("div", { style: { fontSize: "11px", color: card.foot ? (card.accent || "#64748b") : card.countBased && !coverage.complete ? "#94a3b8" : deltaColor, fontWeight: "800", marginTop: "4px", whiteSpace: card.footFixedLines ? "pre-line" : undefined, lineHeight: card.footFixedLines ? 1.55 : undefined } }, card.foot || (card.countBased && !coverage.complete ? `${compare.label}資料不完整，不比較` : card.delta == null ? `${compare.label}無比較資料` : `${card.delta >= 0 ? "↗" : "↘"} 較${compare.label} ${card.delta >= 0 ? "+" : ""}${card.delta.toFixed(1)} ${card.unit}`)),
                    card.sub && React.createElement("div", { style: { fontSize: "11px", color: "#94a3b8", fontWeight: "700", marginTop: "3px" } }, card.sub),
                    card.spark && React.createElement(Sparkline, card.spark),
                    React.createElement("div", { style: { position: "absolute", right: "-10px", bottom: "-30px", fontSize: "95px", color: "#f4f6f8", fontWeight: "900" } }, card.icon));
            })),
            React.createElement("div", { style: { ...panel, padding: "18px 20px" } },
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" } },
                    React.createElement("div", null, React.createElement("div", { style: { fontSize: "14px", fontWeight: "900", color: "#172033" } }, "改善行動追蹤"), React.createElement("div", { style: { fontSize: "11px", color: "#94a3b8", marginTop: "3px" } }, "把警示轉成負責人、期限與完成狀態；資料僅保存在這台電腦的瀏覽器。")),
                    React.createElement("span", { style: CRM.badge("#eff6ff", "#1d4ed8") }, `${executiveActions.filter((item) => item.status !== "已完成").length} 件未完成`)),
                React.createElement("div", { className: "v394-action-grid", style: { display: "grid", gridTemplateColumns: "minmax(280px,2fr) minmax(110px,.7fr) 150px 120px auto", gap: "8px", marginTop: "13px", alignItems: "center" } },
                    React.createElement("input", { value: actionDraft.action, onChange: (event) => setActionDraft((draft) => ({ ...draft, action: event.target.value })), placeholder: "改善措施，例如：晚班增加 1 席支援", style: CRM.input }),
                    React.createElement("input", { value: actionDraft.owner, onChange: (event) => setActionDraft((draft) => ({ ...draft, owner: event.target.value })), placeholder: "負責人", style: CRM.input }),
                    React.createElement("input", { type: "date", value: actionDraft.dueDate, onChange: (event) => setActionDraft((draft) => ({ ...draft, dueDate: event.target.value })), style: CRM.input }),
                    React.createElement("select", { value: actionDraft.status, onChange: (event) => setActionDraft((draft) => ({ ...draft, status: event.target.value })), style: CRM.input }, ["待處理", "處理中", "已完成", "暫緩"].map((status) => React.createElement("option", { key: status, value: status }, status))),
                    React.createElement("button", { type: "button", disabled: !actionDraft.action.trim(), onClick: () => { if (!actionDraft.action.trim()) return; saveExecutiveActions([{ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, ...actionDraft, action: actionDraft.action.trim(), owner: actionDraft.owner.trim(), createdAt: new Date().toISOString() }, ...executiveActions]); setActionDraft({ action: "", owner: "", dueDate: "", status: "待處理" }); }, style: { ...CRM.btnPrimary, opacity: actionDraft.action.trim() ? 1 : .5, whiteSpace: "nowrap" } }, "＋新增")),
                executiveActions.length ? React.createElement("div", { style: { marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" } }, executiveActions.map((item) => {
                    const overdue = item.dueDate && item.dueDate < formatDateKey(new Date()) && item.status !== "已完成";
                    return React.createElement("div", { key: item.id, className: "v394-action-grid", style: { display: "grid", gridTemplateColumns: "minmax(280px,2fr) minmax(110px,.7fr) 150px 120px auto", gap: "8px", alignItems: "center", padding: "10px 12px", borderRadius: "12px", background: item.status === "已完成" ? "#f0fdf4" : overdue ? "#fef2f2" : "#f8fafc", border: `1px solid ${item.status === "已完成" ? "#bbf7d0" : overdue ? "#fecaca" : "#e2e8f0"}` } },
                        React.createElement("div", { style: { fontSize: "13px", fontWeight: "800", color: item.status === "已完成" ? "#15803d" : "#334155", textDecoration: item.status === "已完成" ? "line-through" : "none" } }, item.action),
                        React.createElement("div", { style: { fontSize: "12px", color: "#64748b" } }, item.owner || "未指派"),
                        React.createElement("div", { style: { fontSize: "12px", color: overdue ? "#b91c1c" : "#64748b", fontWeight: overdue ? "800" : "600" } }, item.dueDate ? `${item.dueDate.replace(/-/g, "/")}${overdue ? "（逾期）" : ""}` : "未設期限"),
                        React.createElement("select", { value: item.status, onChange: (event) => saveExecutiveActions(executiveActions.map((row) => row.id === item.id ? { ...row, status: event.target.value } : row)), style: { ...CRM.input, padding: "6px 8px" } }, ["待處理", "處理中", "已完成", "暫緩"].map((status) => React.createElement("option", { key: status, value: status }, status))),
                        React.createElement("button", { type: "button", onClick: () => saveExecutiveActions(executiveActions.filter((row) => row.id !== item.id)), style: { ...CRM.btnGhost, padding: "6px 9px", color: "#b91c1c" } }, "刪除"));
                })) : React.createElement("div", { style: { marginTop: "12px", padding: "14px", borderRadius: "12px", background: "#f8fafc", color: "#94a3b8", fontSize: "12px", textAlign: "center" } }, "尚無改善行動；可先按上方「帶入行動追蹤」，再填寫負責人與期限。")),
            calls.offered > 0 && React.createElement("div", { style: { ...panel, overflow: "hidden" } },
                React.createElement("div", { style: { padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap", borderBottom: "1px solid #eef2f7" } },
                    React.createElement("span", { style: { fontSize: "13px", fontWeight: "900", color: "#172033" } }, "各業務線一覽"),
                    React.createElement("span", { style: { fontSize: "11px", color: "#94a3b8" } }, `${targetLegend ? `紅字＝未達目標（${targetLegend}）` : "尚未設定目標值"}｜灰色＝來電不到 ${LINE_MIN_CALLS} 通，樣本少不判斷`)),
                React.createElement("div", { style: { overflowX: "auto" } }, React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "13px" } },
                    React.createElement("thead", null, React.createElement("tr", null, ["業務線", "來電", `較${compare.label}`, "漏接率", "人員滿意 Q1", "問題滿意 Q2"].map((h, i) => React.createElement("th", { key: h, style: { ...CRM.th, textAlign: i ? "center" : "left" } }, h)))),
                    React.createElement("tbody", null, lines.map((l) => React.createElement("tr", { key: l.line },
                        React.createElement("td", { style: { ...CRM.td, textAlign: "left", fontWeight: "800" } }, l.line),
                        React.createElement("td", { style: { ...CRM.td, fontWeight: "700" } }, l.offered.toLocaleString()),
                        React.createElement("td", { style: { ...CRM.td, color: l.volumeChangePct == null || !coverage.complete ? "#94a3b8" : l.volumeChangePct > 0 ? "#b45309" : "#64748b", fontWeight: "700" } }, l.volumeChangePct == null || !coverage.complete ? "—" : `${l.volumeChangePct >= 0 ? "+" : ""}${Math.round(l.volumeChangePct)}%`),
                        React.createElement("td", { style: CRM.td }, cellPct(l.missedRate, targets.missedRate, "low", l.offered < LINE_MIN_CALLS), l.offered ? React.createElement("span", { style: { fontSize: "11px", color: "#94a3b8", marginLeft: "4px" } }, `(${l.missed})`) : null),
                        React.createElement("td", { style: CRM.td }, cellPct(l.q1Rate, targets.q1Rate, "high", l.offered < LINE_MIN_CALLS)),
                        React.createElement("td", { style: CRM.td }, cellPct(l.q2Rate, targets.q2Rate, "high", l.offered < LINE_MIN_CALLS))))))))),
        view === "diagnosis" && React.createElement(React.Fragment, null,
            React.createElement("div", { className: "v37-diagnosis-grid", style: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "16px" } },
                React.createElement("div", { style: { ...panel, padding: "22px" } }, React.createElement("h3", { style: { margin: 0, color: "#172033" } }, "漏接診斷"), React.createElement("div", { style: { fontSize: "38px", fontWeight: "900", color: window.V41Core.buildRiskRules(settings.rules).find((r) => r.key === "missed").high < calls.missedRate ? "#dc2626" : missedTarget != null && calls.missedRate > missedTarget ? "#ea580c" : "#4f46e5", marginTop: "22px" } }, `${calls.missedRate.toFixed(1)}%`), React.createElement("p", { style: { color: "#64748b" } }, `漏接 ${calls.missed} 通／有效進線 ${calls.offered} 通`), React.createElement("button", { onClick: () => onNavigate("missed"), style: CRM.btnPrimary }, "查看完整漏接分析")),
                React.createElement("div", { style: { ...panel, padding: "22px" } }, React.createElement("h3", { style: { margin: 0, color: "#172033" } }, "來電量比較"), React.createElement("div", { style: { fontSize: "38px", fontWeight: "900", color: volumeChangePct != null && coverage.complete && volumeChangePct >= ((riskRules.find((r) => r.key === "volume") || {}).medium || 25) ? "#dc2626" : "#4f46e5", marginTop: "22px" } }, volumeChangePct == null || !coverage.complete ? "—" : `${volumeChangePct >= 0 ? "+" : ""}${volumeChangePct.toFixed(1)}%`), React.createElement("p", { style: { color: "#64748b" } }, `本期 ${calls.offered} 通／${compare.label} ${previousCalls.offered} 通`, !coverage.complete && React.createElement("span", { style: { display: "block", color: "#a16207", fontSize: "12px", marginTop: "4px" } }, `${compare.label}只有 ${coverage.dataStart.replace(/-/g, "/")} 之後的資料，天數不同，不比較增減。`)), React.createElement("button", { onClick: () => onNavigate("trend"), style: CRM.btnGhost }, "查看長期趨勢")),
                React.createElement("div", { style: { ...panel, padding: "22px" } }, React.createElement("h3", { style: { margin: 0, color: "#172033" } }, "滿意度診斷"),
                    SURVEY_QUESTIONS.map((q) => {
                        const cur = satisfaction[q.key], prev = previousSatisfaction[q.key];
                        const diff = cur.answered && prev.answered ? cur.rate - prev.rate : null;
                        return React.createElement("div", { key: q.key, style: { marginTop: "16px", paddingTop: q.key === "q1" ? 0 : "14px", borderTop: q.key === "q1" ? "none" : "1px solid #eef2f7" } },
                            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px", flexWrap: "wrap" } },
                                React.createElement("div", { style: { fontSize: "12px", fontWeight: "800", color: "#475569" } }, q.title),
                                React.createElement("div", { style: { fontSize: "11px", fontWeight: "800", color: diff == null ? "#94a3b8" : diff < 0 ? "#f43f5e" : "#10b981" } }, diff == null ? `${compare.label}無問卷資料` : `較${compare.label} ${diff >= 0 ? "+" : ""}${diff.toFixed(1)} 個百分點`)),
                            React.createElement("div", { style: { fontSize: "30px", fontWeight: "900", color: "#4f46e5", marginTop: "4px" } }, cur.answered ? `${cur.rate.toFixed(1)}%` : "—"),
                            React.createElement("div", { style: { fontSize: "12px", color: "#64748b", lineHeight: 1.7 } }, cur.answered ? `非常滿意 ${cur.verySatisfied.toLocaleString()}｜尚可 ${cur.fair.toLocaleString()}（${cur.fairRate.toFixed(1)}%）｜非常不滿意 ${cur.veryUnsatisfied.toLocaleString()}（${cur.veryUnsatRate.toFixed(1)}%）` : "本期沒有有效回答", React.createElement("br"), `有效回答 n=${cur.answered.toLocaleString()}｜調查率 ${cur.surveyRate.toFixed(1)}%`));
                    }),
                    React.createElement("button", { onClick: () => onNavigate("trend"), style: { ...CRM.btnGhost, marginTop: "14px" } }, "查看滿意度趨勢"))),
            React.createElement("div", { style: { ...panel, padding: "22px" } },
                React.createElement("h3", { style: { margin: 0, color: "#172033" } }, `本期風險觸發原因（${riskItems.length}）`),
                riskItems.length ? riskItems.map((item) => { const meta = riskMeta[item.level] || riskMeta.watch; return React.createElement("div", { key: item.key, style: { marginTop: "12px", padding: "13px 15px", borderRadius: "12px", background: meta.bg, border: `1px solid ${meta.border}` } }, React.createElement("div", { style: { fontWeight: "900", color: meta.color } }, `${meta.label}｜${item.category}｜${item.title}`), React.createElement("div", { style: { marginTop: "5px", fontSize: "12px", color: "#64748b" } }, item.detail)); }) : React.createElement("div", { style: { padding: "28px 0", color: "#15803d", fontWeight: "800" } }, "✓ 本期沒有觸發任何風險門檻"),
                skippedNotes.length > 0 && React.createElement("div", { style: { marginTop: "12px", padding: "11px 14px", borderRadius: "12px", background: "#f8fafc", border: "1px dashed #cbd5e1", fontSize: "12px", color: "#64748b", lineHeight: 1.8 } }, React.createElement("div", { style: { fontWeight: "800", color: "#475569" } }, "樣本不足，以下未判定（下限可在「門檻與目標設定」調整）"), skippedNotes.map((note) => React.createElement("div", { key: note }, `・${note}`)))),
            React.createElement("div", { style: { ...panel, overflow: "hidden" } },
                React.createElement("div", { style: { padding: "16px 20px", fontWeight: "900", color: "#172033", borderBottom: "1px solid #eef2f7" } }, "風險定義與分類規則"),
                React.createElement("div", { style: { overflowX: "auto" } }, React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "12px" } },
                    React.createElement("thead", null, React.createElement("tr", null, ["指標", "注意", "中風險", "高風險", "比較基準"].map((heading) => React.createElement("th", { key: heading, style: CRM.th }, heading)))),
                    React.createElement("tbody", null, riskRules.map((rule) => [rule.category, ...rule.labels, rule.basis]).map((row) => React.createElement("tr", { key: row[0] }, row.map((value, index) => React.createElement("td", { key: index, style: { ...CRM.td, textAlign: index ? "center" : "left", fontWeight: index === 0 ? "800" : "500" } }, value))))))))),
        view === "events" && React.createElement("div", { style: { ...panel, padding: "22px" } },
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" } },
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px" } }, React.createElement("h3", { style: { margin: 0, color: "#172033" } }, "重大事件一覽表"), React.createElement("span", { style: CRM.badge(incidents.length ? "#fef2f2" : "#f0fdf4", incidents.length ? "#b91c1c" : "#15803d") }, `${incidents.length} 件`)),
                addEvent && React.createElement("button", { type: "button", onClick: () => { setShowEventForm((v) => !v); setEventMessage(""); }, style: showEventForm ? CRM.btnGhost : CRM.btnPrimary }, showEventForm ? "取消" : "＋ 新增重大事件")),
            // V39.3：在儀表板直接新增重大事件（寫入的就是趨勢分析「事件註記」的同一份資料，類型為「系統異常」）。
            showEventForm && React.createElement("div", { style: { marginTop: "14px", padding: "14px 16px", borderRadius: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "10px" } },
                React.createElement("div", { style: { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" } },
                    React.createElement("label", { style: { fontSize: "12px", color: "#475569", display: "flex", alignItems: "center", gap: "6px" } }, "日期", React.createElement("input", { type: "date", value: eventDraft.date || range.end, onChange: (e) => setEventDraft((d) => ({ ...d, date: e.target.value })), style: { ...CRM.input, width: "160px" } })),
                    React.createElement("input", { type: "text", placeholder: "標題（必填），例如：系統當機 2 小時", value: eventDraft.title, onChange: (e) => setEventDraft((d) => ({ ...d, title: e.target.value })), style: { ...CRM.input, flex: 1, minWidth: "220px" } })),
                React.createElement("textarea", { placeholder: "說明（選填）：發生什麼事、影響範圍、處理狀況", value: eventDraft.note, onChange: (e) => setEventDraft((d) => ({ ...d, note: e.target.value })), style: { ...CRM.input, minHeight: "60px", resize: "vertical" } }),
                React.createElement("div", { style: { display: "flex", gap: "10px", alignItems: "center" } },
                    React.createElement("button", { type: "button", disabled: !eventDraft.title.trim(), onClick: () => { const date = eventDraft.date || range.end; addEvent({ date, type: "incident", title: eventDraft.title.trim(), note: eventDraft.note.trim() }); setEventMessage(date >= range.start && date <= range.end ? "已新增。" : `已新增（${date.replace(/-/g, "/")} 不在目前期間，切換期間後可看到）。`); setEventDraft({ date: "", title: "", note: "" }); setShowEventForm(false); }, style: { ...CRM.btnPrimary, opacity: eventDraft.title.trim() ? 1 : 0.5, cursor: eventDraft.title.trim() ? "pointer" : "not-allowed" } }, "儲存"),
                    React.createElement("span", { style: { fontSize: "11px", color: "#94a3b8" } }, "存在這台電腦的瀏覽器；趨勢分析的「事件註記」也會看到。"))),
            eventMessage && React.createElement("div", { style: { marginTop: "10px", fontSize: "12px", color: "#15803d", fontWeight: "700" } }, eventMessage),
            incidents.length ? incidents.map((event) => React.createElement("div", { key: event.id, style: { marginTop: "13px", padding: "14px 16px", borderRadius: "12px", border: "1px solid #fee2e2", background: "#fff7f7", display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" } },
                React.createElement("div", null, React.createElement("div", { style: { fontWeight: "800", color: "#991b1b" } }, `${event.date || "未填日期"}｜${event.title || "未命名事件"}`), React.createElement("div", { style: { color: "#64748b", marginTop: "5px", fontSize: "12px" } }, event.note || "沒有補充說明")),
                deleteEvent && React.createElement("button", { type: "button", onClick: () => { if (window.confirm(`確定要刪除「${event.title || "未命名事件"}」嗎？`)) deleteEvent(event.id); }, style: { ...CRM.btnGhost, padding: "4px 10px", fontSize: "12px", color: "#b91c1c", flexShrink: 0 } }, "刪除"))) : React.createElement("div", { style: { padding: "60px 20px", textAlign: "center", color: "#94a3b8" } }, "此期間沒有重大事件"),
            undatedIncidents.length > 0 && React.createElement("div", { style: { marginTop: "22px", paddingTop: "16px", borderTop: "1px dashed #e2e8f0" } },
                React.createElement("div", { style: { fontWeight: "800", color: "#a16207" } }, `未填日期的重大事件（${undatedIncidents.length} 件，未列入本期判定）`),
                React.createElement("div", { style: { fontSize: "12px", color: "#64748b", marginTop: "4px" } }, "請到「趨勢分析」的事件註記補上日期，系統才能判斷它屬於哪個期間。"),
                undatedIncidents.map((event) => React.createElement("div", { key: event.id, style: { marginTop: "10px", padding: "12px 14px", borderRadius: "12px", border: "1px solid #fef08a", background: "#fefce8" } }, React.createElement("div", { style: { fontWeight: "800", color: "#854d0e" } }, event.title || "未命名事件"), React.createElement("div", { style: { color: "#64748b", marginTop: "4px", fontSize: "12px" } }, event.note || "沒有補充說明"))))),
        view === "versions" && React.createElement("div", { style: { ...panel, padding: "22px" } },
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" } }, React.createElement("h3", { style: { margin: 0, color: "#172033" } }, "版本歷程"), React.createElement("span", { style: CRM.badge("#eff6ff", "#1d4ed8") }, `目前版本 ${APP_VERSION}`)),
            React.createElement("div", { style: { fontSize: "12px", color: "#64748b", marginTop: "6px" } }, "每次改版都另存新檔，不覆蓋舊版本；完整紀錄同步保存在資料夾內的 VERSION_HISTORY.md。"),
            VERSION_HISTORY.map((item, index) => React.createElement("div", { key: item.version, style: { marginTop: "13px", padding: "14px 16px", borderRadius: "12px", border: `1px solid ${index === 0 ? "#c7d2fe" : "#e2e8f0"}`, background: index === 0 ? "#f5f7ff" : "#fff" } },
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" } }, React.createElement("div", { style: { fontWeight: "800", color: "#172033" } }, `${item.version}｜${item.title}`), React.createElement("div", { style: { fontSize: "12px", color: "#94a3b8", fontWeight: "700" } }, item.date)),
                React.createElement("ul", { style: { margin: "8px 0 0", paddingLeft: "18px", color: "#475569", fontSize: "12px", lineHeight: 1.8 } }, item.changes.map((change) => React.createElement("li", { key: change }, change)))))));
}

function MissedCallPanel({ rows = [], sourceLabel = "目前資料", settings = DEFAULT_ANALYSIS_SETTINGS }) {
    // V41：漏接率的顏色跟著「門檻與目標設定」：超過高風險門檻＝紅、超過目標（沒設目標時用注意門檻）＝橘、其餘＝綠。
    const missedRule = window.V41Core.buildRiskRules(settings.rules).find((r) => r.key === "missed");
    const missedGoal = settings.targets && settings.targets.missedRate !== "" && settings.targets.missedRate != null && Number.isFinite(Number(settings.targets.missedRate)) ? Number(settings.targets.missedRate) : missedRule.watch;
    const missedTone = (rate) => rate > missedRule.high ? { bg: "#fef2f2", fg: "#b91c1c" } : rate > missedGoal ? { bg: "#fff7ed", fg: "#c2410c" } : { bg: "#f0fdf4", fg: "#15803d" };
    // 期間篩選：沿用歷史總覽／趨勢分析的同一個篩選元件（週／月／年、快速選取、自訂範圍），但本頁的選擇獨立保存，不影響其他頁。
    const [viewType, setViewType] = useState("weeks");
    const [filters, setFilters] = useState(DEFAULT_PERIOD_FILTERS);
    const periodKeyOf = useCallback((row) => viewType === "years" ? (row.yearKey || getCalendarYearKey(row.date)) : viewType === "months" ? (row.monthKey || getCalendarMonthKey(row.date)) : row.weekKey, [viewType]);
    const periodList = useMemo(() => Array.from(new Set(rows.map(periodKeyOf).filter(Boolean))).sort(), [rows, periodKeyOf]);
    const filterState = filters[viewType] || DEFAULT_PERIOD_FILTERS[viewType];
    const periodRange = resolvePeriodRange(viewType, filterState, periodList);
    const selectedKeys = useMemo(() => sliceListByRange(periodList, periodRange.from, periodRange.to), [periodList, periodRange.from, periodRange.to]);
    const filteredRows = useMemo(() => { const keys = new Set(selectedKeys); return rows.filter((row) => keys.has(periodKeyOf(row))); }, [rows, selectedKeys, periodKeyOf]);
    const summary = useMemo(() => summarizeMissedCalls(filteredRows), [filteredRows]);
    const periodUnit = viewType === "years" ? "年度" : viewType === "months" ? "月份" : "週次";
    const formatPeriod = (key) => viewType === "years" ? formatYearDisplay(key) : viewType === "months" ? formatMonthDisplay(key) : formatWeekKeyZh(key);
    const byPeriod = useMemo(() => {
        const map = new Map();
        summary.calls.forEach((call) => { const key = periodKeyOf(call) || "未分類"; const item = map.get(key) || { key, offered: 0, answered: 0, missed: 0 }; item.offered += 1; item[call.callOutcome] += 1; map.set(key, item); });
        return Array.from(map.values()).map((item) => ({ ...item, missedRate: item.offered ? item.missed / item.offered * 100 : 0 })).sort((a, b) => a.key.localeCompare(b.key));
    }, [summary, periodKeyOf]);
    const selectedLabel = selectedKeys.length ? (selectedKeys.length === 1 ? formatPeriod(selectedKeys[0]) : `${formatPeriod(selectedKeys[0])} ～ ${formatPeriod(selectedKeys[selectedKeys.length - 1])}`) : "尚無資料";
    const pct = (value) => `${Number(value || 0).toFixed(1)}%`;
    const card = { ...CRM.cardLg, padding: "16px 18px" };
    const renderGroupTable = (title, items, keyLabel) => React.createElement(CollapsibleCard, { style: { ...CRM.cardLg, overflow: "hidden" } },
        React.createElement("div", { style: CRM.hdr }, React.createElement("span", { style: CRM.title }, title)),
        React.createElement("div", { style: { overflowX: "auto", maxHeight: "360px" } },
            React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "12px" } },
                React.createElement("thead", null, React.createElement("tr", null, [keyLabel, "有效進線", "已接聽", "漏接", "漏接率"].map((h) => React.createElement("th", { key: h, style: CRM.th }, h)))),
                React.createElement("tbody", null, items.length ? items.map((item) => React.createElement("tr", { key: item.key },
                    React.createElement("td", { style: { ...CRM.td, textAlign: "left", fontWeight: "600" } }, item.key === "未分類" ? item.key : keyLabel === "小時" ? `${item.key}:00–${item.key}:59` : keyLabel === periodUnit ? formatPeriod(item.key) : item.key),
                    React.createElement("td", { style: CRM.td }, item.offered),
                    React.createElement("td", { style: CRM.td }, item.answered),
                    React.createElement("td", { style: CRM.td }, item.missed),
                    React.createElement("td", { style: CRM.td }, React.createElement("span", { style: CRM.badge(missedTone(item.missedRate).bg, missedTone(item.missedRate).fg) }, pct(item.missedRate))))) : React.createElement("tr", null, React.createElement("td", { colSpan: 5, style: { ...CRM.td, padding: "32px", color: "#94a3b8" } }, "尚無資料"))))));
    // 漏接明細：所選期間的全部漏接，由早到晚排列；筆數多時分頁（預設每頁 100 筆）。換期間時回到第 1 頁。
    const [missedPage, setMissedPage] = useState(1);
    const [missedPageSize, setMissedPageSize] = useState(100);
    useEffect(() => setMissedPage(1), [viewType, selectedKeys.join(",")]);
    const allMissedRows = summary.calls.filter((row) => row.callOutcome === "missed").slice().sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    const missedPaging = paginateRows(allMissedRows, missedPage, missedPageSize);
    const missedRows = missedPaging.rows;
    return React.createElement(React.Fragment, null,
        React.createElement("div", null,
            React.createElement("h2", { style: { margin: 0, fontSize: "20px", color: "#0f172a" } }, "漏接率分析"),
            React.createElement("div", { style: { marginTop: "5px", fontSize: "12px", color: "#64748b" } }, `${sourceLabel}｜目前期間：${selectedLabel}｜以對話 ID 為單位合併判定`)),
        React.createElement(PeriodFilterPanel, { viewType, setViewType, list: periodList, filterState, range: periodRange, selectedCount: selectedKeys.length, onPickShortcut: (scope, key) => setFilters((prev) => ({ ...prev, [scope]: { shortcut: key, customFrom: "", customTo: "" } })), onPickCustomRange: (scope, from, to) => setFilters((prev) => ({ ...prev, [scope]: { shortcut: "custom", customFrom: from, customTo: to } })) }),
        React.createElement("div", { style: { background: "#eff6ff", border: "0.5px solid #bfdbfe", color: "#1e40af", borderRadius: "10px", padding: "12px 15px", fontSize: "12px", lineHeight: 1.7 } },
            "判定標準：傳入且日期有效；「使用者 - 已互動」沒有客服名字即為漏接（同一對話 ID 只要任一筆有客服名字就算已接聽）。漏接率＝漏接 ÷ 有效進線。專線：第一佇列有專線名稱就用第一佇列；漏接且第一佇列沒有專線名稱時，用 DNIS 號碼對照專線；有客服接聽但第一佇列沒有專線名稱時不補，維持未分類並在驗證報告列出警示。"),
        React.createElement("div", { className: "rwd-multi-col", style: { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: "12px" } }, [
            { label: "有效進線", value: summary.offered.toLocaleString(), color: "#1e293b" },
            { label: "已接聽", value: summary.answered.toLocaleString(), color: "#15803d" },
            { label: "漏接", value: summary.missed.toLocaleString(), color: "#b91c1c" },
            { label: "漏接率", value: pct(summary.missedRate), sub: `${summary.missed}／${summary.offered}`, color: missedTone(summary.missedRate).fg },
        ].map((item) => React.createElement("div", { key: item.label, style: card },
            React.createElement("div", { style: { fontSize: "11px", color: "#94a3b8", fontWeight: "700" } }, item.label),
            React.createElement("div", { style: { marginTop: "7px", fontSize: "25px", fontWeight: "700", color: item.color } }, item.value),
            item.sub && React.createElement("div", { style: { marginTop: "4px", fontSize: "11px", color: "#64748b" } }, item.sub)))),
        React.createElement("div", { className: "rwd-split", style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" } },
            renderGroupTable(`${periodUnit}漏接趨勢`, byPeriod, periodUnit),
            renderGroupTable("專線漏接排行", summary.byLine, "專線")),
        // 小時漏接熱區與漏接明細左右並排（窄螢幕時 rwd-split 會自動改成上下）。
        React.createElement("div", { className: "rwd-split", style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", alignItems: "start" } },
        renderGroupTable("小時漏接熱區", summary.byHour, "小時"),
        React.createElement(CollapsibleCard, { style: { ...CRM.cardLg, overflow: "hidden" } },
            React.createElement("div", { style: CRM.hdr },
                React.createElement("span", { style: CRM.title }, "漏接明細"),
                React.createElement("span", { style: CRM.badge("#fef2f2", "#b91c1c") }, `共 ${allMissedRows.length.toLocaleString()} 通｜時間由早到晚`)),
            React.createElement("div", { style: { overflowX: "auto", maxHeight: "420px" } },
                React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "12px" } },
                    React.createElement("thead", null, React.createElement("tr", null, ["日期", "星期", "時間", "專線", "對話 ID"].map((h) => React.createElement("th", { key: h, style: CRM.th }, h)))),
                    React.createElement("tbody", null, missedRows.length ? missedRows.map((row, index) => React.createElement("tr", { key: row.callKey || `${row.id}-${index}` },
                        React.createElement("td", { style: { ...CRM.td, whiteSpace: "nowrap" } }, formatCustomDate(row.date), React.createElement(HolidayBadge, { date: row.date })),
                        React.createElement("td", { style: CRM.td }, row.date ? window.V41Core.WEEKDAY_LABELS[window.V41Core.weekdayIndex(String(row.date).replace(/\//g, "-"))] : "—"),
                        React.createElement("td", { style: CRM.td }, row.time || "—"),
                        React.createElement("td", { style: CRM.td }, row.line || "未分類"),
                        React.createElement("td", { style: { ...CRM.td, fontFamily: "monospace", textAlign: "left" } }, row.id || "無對話 ID"))) : React.createElement("tr", null, React.createElement("td", { colSpan: 5, style: { ...CRM.td, padding: "32px", color: "#94a3b8" } }, "尚無漏接資料"))))),
            allMissedRows.length > 0 && React.createElement(CrmPagination, { total: allMissedRows.length, page: missedPaging.safePage, pageSize: missedPageSize, onPageChange: setMissedPage, onPageSizeChange: (size) => { setMissedPageSize(size); setMissedPage(1); } }))));
}

// ─── V39：分析設定（門檻、樣本數、目標值、預測參數）──────────────────────────────
// 「來電量與人力預測」頁暫時不用（2026-09-29 使用者決定先移掉）：改成 true 就會恢復選單項目、頁面與設定區塊。
const FEATURE_FORECAST = false;
const ANALYSIS_SETTINGS_KEY = "weekly_call_project_v39_analysis_settings";
const DEFAULT_ANALYSIS_SETTINGS = {
    rules: {},
    sample: { ...window.V41Core.DEFAULT_SAMPLE_RULES },
    targets: { missedRate: 5, q1Rate: 90, q2Rate: 85, q1SurveyRate: 50, q2SurveyRate: 50 },
    forecast: { weeksBack: 8, targetSL: 80, targetSec: 20, shrinkage: 30 },
};
const loadAnalysisSettings = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(ANALYSIS_SETTINGS_KEY) || "null");
        if (!saved) return DEFAULT_ANALYSIS_SETTINGS;
        return { rules: saved.rules || {}, sample: { ...DEFAULT_ANALYSIS_SETTINGS.sample, ...(saved.sample || {}) }, targets: { ...DEFAULT_ANALYSIS_SETTINGS.targets, ...(saved.targets || {}) }, forecast: { ...DEFAULT_ANALYSIS_SETTINGS.forecast, ...(saved.forecast || {}) } };
    }
    catch (e) { return DEFAULT_ANALYSIS_SETTINGS; }
};
const saveAnalysisSettingsToStorage = (settings) => { try { localStorage.setItem(ANALYSIS_SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { } };
const TARGET_FIELDS = [
    { key: "missedRate", label: "漏接率目標（上限）", unit: "%", better: "low" },
    { key: "q1Rate", label: "人員非常滿意度(Q1) 目標", unit: "%", better: "high" },
    { key: "q2Rate", label: "問題非常滿意度(Q2) 目標", unit: "%", better: "high" },
    { key: "q1SurveyRate", label: "人員調查率(Q1) 目標", unit: "%", better: "high" },
    { key: "q2SurveyRate", label: "問題調查率(Q2) 目標", unit: "%", better: "high" },
];

// 共用：頁面內的期間篩選（沿用 PeriodFilterPanel，選擇只存在該頁）。
function usePeriodFilteredRows(rows, defaultView = "weeks") {
    const [viewType, setViewType] = useState(defaultView);
    const [filters, setFilters] = useState(DEFAULT_PERIOD_FILTERS);
    const periodKeyOf = useCallback((row) => viewType === "years" ? (row.yearKey || getCalendarYearKey(row.date)) : viewType === "months" ? (row.monthKey || getCalendarMonthKey(row.date)) : row.weekKey, [viewType]);
    const periodList = useMemo(() => Array.from(new Set(rows.map(periodKeyOf).filter(Boolean))).sort(), [rows, periodKeyOf]);
    const filterState = filters[viewType] || DEFAULT_PERIOD_FILTERS[viewType];
    const range = resolvePeriodRange(viewType, filterState, periodList);
    const selectedKeys = useMemo(() => sliceListByRange(periodList, range.from, range.to), [periodList, range.from, range.to]);
    const filteredRows = useMemo(() => { const keys = new Set(selectedKeys); return rows.filter((row) => keys.has(periodKeyOf(row))); }, [rows, selectedKeys, periodKeyOf]);
    const fmt = (key) => viewType === "years" ? formatYearDisplay(key) : viewType === "months" ? formatMonthDisplay(key) : formatWeekKeyZh(key);
    const selectedLabel = selectedKeys.length ? (selectedKeys.length === 1 ? fmt(selectedKeys[0]) : `${fmt(selectedKeys[0])} ～ ${fmt(selectedKeys[selectedKeys.length - 1])}`) : "尚無資料";
    const panel = React.createElement(PeriodFilterPanel, { viewType, setViewType, list: periodList, filterState, range, selectedCount: selectedKeys.length, onPickShortcut: (scope, key) => setFilters((prev) => ({ ...prev, [scope]: { shortcut: key, customFrom: "", customTo: "" } })), onPickCustomRange: (scope, from, to) => setFilters((prev) => ({ ...prev, [scope]: { shortcut: "custom", customFrom: from, customTo: to } })) });
    return { panel, filteredRows, selectedLabel, viewType, periodKeyOf, selectedKeys, fmt };
}
const pageTitle = (title, sub) => React.createElement("div", null,
    React.createElement("h2", { style: { margin: 0, fontSize: "20px", color: "#0f172a" } }, title),
    sub && React.createElement("div", { style: { marginTop: "5px", fontSize: "12px", color: "#64748b" } }, sub));
const infoBox = (text) => React.createElement("div", { style: { background: "#eff6ff", border: "0.5px solid #bfdbfe", color: "#1e40af", borderRadius: "10px", padding: "12px 15px", fontSize: "12px", lineHeight: 1.7 } }, text);
const fmtPct = (v, digits = 1) => v == null || !Number.isFinite(v) ? "—" : `${v.toFixed(digits)}%`;
const fmtSec = (sec) => { const s = Math.round(Number(sec || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const numInput = (value, onChange, extra = {}) => React.createElement("input", { type: "number", value: value == null ? "" : value, onChange: (e) => onChange(e.target.value === "" ? "" : Number(e.target.value)), style: { width: "80px", fontSize: "12px", padding: "5px 7px", border: "0.5px solid #cbd5e1", borderRadius: "6px", textAlign: "right", ...extra.style }, step: extra.step || "any", min: extra.min });

// ─── 門檻設定頁 ────────────────────────────────────────────────────────────
function AnalysisSettingsPanel({ settings, onSave }) {
    const [draft, setDraft] = useState(settings);
    const [message, setMessage] = useState("");
    useEffect(() => setDraft(settings), [settings]);
    const rules = useMemo(() => window.V41Core.buildRiskRules(draft.rules), [draft.rules]);
    const errors = useMemo(() => {
        const list = window.V41Core.validateRiskRules(rules);
        if (!(draft.sample.minCalls >= 0) || !(draft.sample.minAnswers >= 0)) list.push("樣本數下限必須是 0 以上的數字");
        if (FEATURE_FORECAST && !(draft.forecast.targetSL > 0 && draft.forecast.targetSL < 100)) list.push("服務水準目標要介於 0 到 100 之間");
        if (FEATURE_FORECAST && !(draft.forecast.shrinkage >= 0 && draft.forecast.shrinkage < 100)) list.push("休息折損率要介於 0 到 99 之間");
        return list;
    }, [rules, draft]);
    const setRule = (key, level, value) => setDraft((d) => ({ ...d, rules: { ...d.rules, [key]: { ...(d.rules[key] || {}), [level]: value } } }));
    const setGroup = (group, key, value) => setDraft((d) => ({ ...d, [group]: { ...d[group], [key]: value } }));
    const section = (title, desc, body) => React.createElement("div", { style: { ...CRM.cardLg, overflow: "hidden" } },
        React.createElement("div", { style: CRM.hdr }, React.createElement("span", { style: CRM.title }, title)),
        React.createElement("div", { style: { padding: "14px 18px" } }, desc && React.createElement("div", { style: { fontSize: "12px", color: "#64748b", marginBottom: "12px", lineHeight: 1.7 } }, desc), body));
    const row = (label, input, hint) => React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px", padding: "6px 0", flexWrap: "wrap" } },
        React.createElement("div", { style: { width: "220px", fontSize: "13px", color: "#334155" } }, label), input, hint && React.createElement("span", { style: { fontSize: "12px", color: "#94a3b8" } }, hint));
    return React.createElement(React.Fragment, null,
        pageTitle("門檻與目標設定", `調整後按「儲存設定」，AI 儀表板、客服成績單、統計警示${FEATURE_FORECAST ? "、人力預測" : ""}都會使用新的數值；設定只存在這台電腦的瀏覽器。`),
        section("風險判定門檻", "決定 AI 儀表板的燈號。「中風險」可以留空（例如漏接率預設只分注意、高風險兩級）。", React.createElement("div", { style: { overflowX: "auto" } }, React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "12px" } },
            React.createElement("thead", null, React.createElement("tr", null, ["指標", "注意", "中風險", "高風險", "單位", "比較基準"].map((h) => React.createElement("th", { key: h, style: CRM.th }, h)))),
            React.createElement("tbody", null, rules.filter((r) => r.direction !== "flag").map((r) => React.createElement("tr", { key: r.key },
                React.createElement("td", { style: { ...CRM.td, textAlign: "left", fontWeight: "700" } }, r.category),
                ["watch", "medium", "high"].map((level) => React.createElement("td", { key: level, style: CRM.td }, React.createElement("span", { style: { fontSize: "11px", color: "#94a3b8", marginRight: "4px" } }, r.op), numInput(r[level], (v) => setRule(r.key, level, v === "" ? (level === "medium" ? null : "") : v)))),
                React.createElement("td", { style: CRM.td }, r.unit),
                React.createElement("td", { style: { ...CRM.td, textAlign: "left", color: "#64748b" } }, r.basis))))))),
        section("樣本數下限", "樣本太少時不判定風險，改顯示「樣本不足」，避免 3 通漏接 1 通就變成 33% 高風險。業界常用 30 當作基本門檻。",
            React.createElement(React.Fragment, null,
                row("最少有效進線（通）", numInput(draft.sample.minCalls, (v) => setGroup("sample", "minCalls", v), { min: 0 }), "低於此數：來電爆量、漏接率、調查率不判定；成績單標示樣本不足"),
                row("最少有效回答（筆）", numInput(draft.sample.minAnswers, (v) => setGroup("sample", "minAnswers", v), { min: 0 }), "低於此數：滿意度下降、非常不滿意不判定"))),
        section("目標值", "統計警示的圖表會畫出目標線，客服成績單也會標示有沒有達標。", React.createElement(React.Fragment, null, TARGET_FIELDS.map((f) => row(f.label, numInput(draft.targets[f.key], (v) => setGroup("targets", f.key, v), { min: 0 }), f.better === "low" ? `${f.unit}，越低越好` : `${f.unit}，越高越好`)))),
        FEATURE_FORECAST && section("人力預測參數", "服務水準目標是「多少比例的電話要在幾秒內接起」，業界常見 80% / 20 秒。休息折損率是休息、開會、訓練等不在線時間的比例，常見 25%～35%。",
            React.createElement(React.Fragment, null,
                row("參考過去幾週", React.createElement("select", { value: draft.forecast.weeksBack, onChange: (e) => setGroup("forecast", "weeksBack", Number(e.target.value)), style: { ...CRM.select, width: "100px" } }, [4, 8, 12, 26].map((n) => React.createElement("option", { key: n, value: n }, `${n} 週`)))),
                row("服務水準目標（%）", numInput(draft.forecast.targetSL, (v) => setGroup("forecast", "targetSL", v), { min: 1 })),
                row("在幾秒內接起", numInput(draft.forecast.targetSec, (v) => setGroup("forecast", "targetSec", v), { min: 1 })),
                row("休息折損率（%）", numInput(draft.forecast.shrinkage, (v) => setGroup("forecast", "shrinkage", v), { min: 0 })))),
        errors.length > 0 && React.createElement("div", { style: { background: "#fef2f2", border: "0.5px solid #fecaca", color: "#b91c1c", borderRadius: "10px", padding: "12px 15px", fontSize: "12px", lineHeight: 1.8 } }, errors.map((e) => React.createElement("div", { key: e }, `✕ ${e}`))),
        // V41：漏接率「注意」門檻和「目標值」不一樣時提醒（不擋儲存）
        (() => {
            const missedRule = rules.find((r) => r.key === "missed");
            const watch = missedRule ? Number(missedRule.watch) : NaN;
            const target = draft.targets.missedRate;
            if (!Number.isFinite(watch) || target === "" || target == null || !Number.isFinite(Number(target)) || Number(target) === watch) return null;
            return React.createElement("div", { style: { background: "#fffbeb", border: "0.5px solid #fde68a", color: "#92400e", borderRadius: "10px", padding: "10px 15px", fontSize: "12px", lineHeight: 1.7 } },
                `提醒：漏接率的「注意」門檻是 ${watch}%，「目標值」是 ${Number(target)}%。漏接率落在兩者之間時，儀表板燈號和「本期重點」的說法會不一樣，建議設成相同的數字（不設也可以儲存）。`);
        })(),
        message && React.createElement("div", { style: { background: "#f0fdf4", border: "0.5px solid #bbf7d0", color: "#15803d", borderRadius: "10px", padding: "10px 15px", fontSize: "12px" } }, message),
        React.createElement("div", { style: { display: "flex", gap: "10px", flexWrap: "wrap" } },
            React.createElement("button", { type: "button", disabled: errors.length > 0, onClick: () => { onSave(draft); setMessage("已儲存。"); }, style: { ...CRM.btnPrimary, opacity: errors.length ? 0.5 : 1, cursor: errors.length ? "not-allowed" : "pointer" } }, "儲存設定"),
            React.createElement("button", { type: "button", onClick: () => { setDraft(DEFAULT_ANALYSIS_SETTINGS); setMessage("已還原為預設值（尚未儲存，按「儲存設定」才會生效）。"); }, style: CRM.btnGhost }, "還原預設值")));
}

// ─── 人員班別歷程與換班前後比較（V42.7）──────────────────────────────────
// 選一位客服：上面是每個月上什麼班（時間線＋每月明細），下面是每次換班前後的表現比較。
// 只算「人員有效期間」內的電話；班別跟其他頁一樣讀班表設定（月份班表優先，沒有就看預設班表）。
function ShiftHistoryPanel({ rows = [], shiftRules = {}, getShiftInfo, isPendingMonth, settings, effectiveRules = {}, onOpenShiftMonth }) {
    const clean = (n) => String(n || "").replace(/[\s\u3000]+/g, "");
    const effRows = useMemo(() => rows.filter((r) => r.agent && isAgentEffectiveForRow(r.agent, r, effectiveRules)), [rows, effectiveRules]);
    const people = useMemo(() => {
        const calls = {};
        effRows.forEach((r) => { const n = String(r.agent).trim(); calls[n] = (calls[n] || 0) + 1; });
        Object.keys(shiftRules).filter((k) => /^\d{4}-\d{2}$/.test(k)).forEach((k) => ["早班", "中班", "晚班"].forEach((sh) => (shiftRules[k][sh] || []).forEach((n) => { const t = String(n).trim(); if (t && calls[t] == null) calls[t] = 0; })));
        return Object.keys(calls).sort((a, b) => calls[b] - calls[a] || a.localeCompare(b, "zh-Hant")).map((name) => ({ name, calls: calls[name] }));
    }, [effRows, shiftRules]);
    const [picked, setPicked] = useState("");
    const [win, setWin] = useState(3);
    const name = people.some((p) => p.name === picked) ? picked : (people[0] ? people[0].name : "");
    const months = useMemo(() => {
        if (!name) return [];
        const target = clean(name);
        const found = new Set();
        effRows.forEach((r) => { if (r.monthKey && clean(r.agent) === target) found.add(r.monthKey); });
        Object.keys(shiftRules).filter((k) => /^\d{4}-\d{2}$/.test(k)).forEach((k) => { if (["早班", "中班", "晚班"].some((sh) => (shiftRules[k][sh] || []).some((n) => clean(n) === target))) found.add(k); });
        const sorted = Array.from(found).sort();
        if (!sorted.length) return [];
        const out = [];
        for (let m = sorted[0]; m <= sorted[sorted.length - 1]; m = window.V41Core.shiftMonthKey(`${m}-01`, 1).slice(0, 7)) out.push(m);
        return out;
    }, [name, effRows, shiftRules]);
    const timeline = useMemo(() => window.V41Core.personShiftTimeline(effRows, name, months, (m) => { const info = getShiftInfo(name, m) || {}; return { ...info, pending: info.source === "月份班表" && isPendingMonth(m) }; }), [effRows, name, months, getShiftInfo, isPendingMonth]);
    const changes = useMemo(() => window.V41Core.shiftChangeComparisons(timeline, effRows, name, win), [timeline, effRows, name, win]);
    const changeMonths = new Set(changes.map((c) => c.month));
    const minAnswers = Number((settings && settings.sample && settings.sample.minAnswers) || 0);
    const ym = (m) => `${m.slice(0, 4)}/${Number(m.slice(5, 7))}`;
    const ymText = (list) => !list.length ? "—" : list.length === 1 ? ym(list[0]) : `${ym(list[0])}～${ym(list[list.length - 1])}`;
    const shiftBadge = (shift) => { const sc = CRM.SHIFT[shift] || { bg: "#f1f5f9", tc: "#94a3b8" }; return React.createElement("span", { style: CRM.badge(sc.bg, sc.tc) }, shift || "未設定"); };
    const pctOrDash = (v) => v == null ? "—" : `${v.toFixed(1)}%`;
    const emptyText = rows.length ? "目前資料裡沒有可以看的客服" : "尚無資料，請先到「地端資料匯入」匯入檔案";
    if (!people.length)
        return React.createElement(React.Fragment, null, pageTitle("人員班別歷程", "看一個人每個月上什麼班，以及換班前後的表現有沒有變"), React.createElement("div", { style: { ...CRM.cardLg, padding: "40px", textAlign: "center", color: "#94a3b8" } }, emptyText));
    // 換班前後比較的一列：變化的顏色——比例越高越好（綠）；接聽數、時間不分好壞（灰）
    const metrics = [
        { label: "每月平均接聽數", get: (s) => s.callsPerMonth, fmt: (v) => v == null ? "—" : v.toFixed(1), diff: (a, b) => { const d = b - a; return { text: `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(1)} 通`, good: null }; } },
        { label: "Q1 人員非常滿意", get: (s) => s.q1Rate, fmt: pctOrDash, rate: true, ans: "q1Answered" },
        { label: "Q2 問題非常滿意", get: (s) => s.q2Rate, fmt: pctOrDash, rate: true, ans: "q2Answered" },
        { label: "Q1 調查率", get: (s) => s.q1SurveyRate, fmt: pctOrDash, rate: true },
        { label: "Q2 調查率", get: (s) => s.q2SurveyRate, fmt: pctOrDash, rate: true },
        { label: "平均處理時間", get: (s) => s.avgHandleSec, fmt: (v) => v == null ? "—" : fmtSec(v), diff: (a, b) => { const d = b - a; return { text: `${d >= 0 ? "+" : "−"}${fmtSec(Math.abs(d))}`, good: null }; } },
        { label: "平均發話時間", get: (s) => s.avgSpeakSec, fmt: (v) => v == null ? "—" : fmtSec(v), diff: (a, b) => { const d = b - a; return { text: `${d >= 0 ? "+" : "−"}${fmtSec(Math.abs(d))}`, good: null }; } },
    ];
    const diffCell = (mt, before, after) => {
        const a = before ? mt.get(before) : null, b = after ? mt.get(after) : null;
        if (a == null || b == null) return React.createElement("span", { style: { color: "#94a3b8" } }, "—");
        let text, good;
        if (mt.rate) { const d = b - a; text = Math.abs(d) < 0.05 ? "持平" : `${d > 0 ? "▲" : "▼"}${Math.abs(d).toFixed(1)}`; good = Math.abs(d) < 0.05 ? null : d > 0; }
        else ({ text, good } = mt.diff(a, b));
        return React.createElement("span", { style: { fontWeight: "600", color: good == null ? "#64748b" : good ? "#15803d" : "#dc2626" } }, text);
    };
    const thStyle = { ...CRM.th, whiteSpace: "nowrap" };
    return React.createElement(React.Fragment, null,
        pageTitle("人員班別歷程", "看一個人每個月上什麼班，以及換班前後的表現有沒有變"),
        React.createElement("div", { style: { ...CRM.cardLg, padding: "14px 18px", display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" } },
            React.createElement("label", { style: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#334155" } }, "客服",
                React.createElement("select", { value: name, onChange: (e) => setPicked(e.target.value), style: { ...CRM.select, minWidth: "160px" } }, people.map((p) => React.createElement("option", { key: p.name, value: p.name }, `${p.name}（${p.calls.toLocaleString()} 通）`)))),
            React.createElement("label", { style: { display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#334155" } }, "換班前後各比",
                React.createElement("select", { value: win, onChange: (e) => setWin(Number(e.target.value)), style: CRM.select }, [1, 3, 6].map((n) => React.createElement("option", { key: n, value: n }, `${n} 個月`)))),
            React.createElement("span", { style: { fontSize: "12px", color: "#64748b" } }, "只算「人員有效期間」內的電話；班別讀班表設定（月份班表優先，沒有就看預設班表）。")),
        // 1. 班別時間線
        React.createElement(CollapsibleCard, { style: { ...CRM.cardLg, overflow: "hidden" } },
            React.createElement("div", { style: CRM.hdr },
                React.createElement("span", { style: CRM.title }, `${name} 的班別時間線`),
                React.createElement("span", { style: CRM.badge("#f0f9ff", "#0284c7") }, `${months.length} 個月、換班 ${changes.length} 次`)),
            React.createElement("div", { style: { padding: "14px 18px", display: "flex", flexWrap: "wrap", gap: "8px" } }, timeline.map((t) => {
                const sc = CRM.SHIFT[t.shift] || { bg: "#f8fafc", tc: "#94a3b8" };
                const changed = changeMonths.has(t.month);
                return React.createElement("button", { key: t.month, type: "button", title: `${ym(t.month)}：${t.shift || "未設定"}（${t.source || "未設定"}）${t.pending ? "，班表待確認" : ""}；點一下打開這個月的班表`, onClick: () => onOpenShiftMonth && onOpenShiftMonth(t.month),
                    style: { minWidth: "74px", padding: "7px 8px", borderRadius: "9px", border: t.pending ? `1.5px dashed ${sc.tc}` : changed ? `2px solid ${sc.tc}` : "1px solid #e2e8f0", background: sc.bg, color: sc.tc, cursor: "pointer", fontFamily: "inherit", textAlign: "center" } },
                    React.createElement("div", { style: { fontSize: "11px", color: "#64748b" } }, ym(t.month)),
                    React.createElement("div", { style: { fontSize: "13px", fontWeight: "700", marginTop: "2px" } }, t.shift || "未設定"),
                    React.createElement("div", { style: { fontSize: "10px", marginTop: "2px", color: changed ? sc.tc : "#94a3b8", fontWeight: changed ? "700" : "400" } }, changed ? "↻ 換班" : t.pending ? "待確認" : t.source === "預設班表" ? "預設" : t.stats ? `${t.stats.calls} 通` : "沒接電話"));
            }))),
        // 2. 每月明細
        React.createElement(CollapsibleCard, { style: { ...CRM.cardLg, overflow: "hidden" } },
            React.createElement("div", { style: CRM.hdr }, React.createElement("span", { style: CRM.title }, "每月明細")),
            React.createElement("div", { style: { overflowX: "auto" } },
                React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "13px" } },
                    React.createElement("thead", null, React.createElement("tr", null, ["月份", "班別", "接聽數", "Q1 人員非常滿意", "Q2 問題非常滿意", "Q1 調查率", "Q2 調查率", "平均處理時間"].map((h) => React.createElement("th", { key: h, style: thStyle }, h)))),
                    React.createElement("tbody", null, timeline.map((t, i) => React.createElement("tr", { key: t.month, style: { background: changeMonths.has(t.month) ? "#fffbeb" : i % 2 ? "#f9fafb" : "#fff" } },
                        React.createElement("td", { style: { ...CRM.td, whiteSpace: "nowrap", fontWeight: "600" } }, ym(t.month), changeMonths.has(t.month) ? React.createElement("span", { style: { marginLeft: "6px", fontSize: "11px", color: "#b45309" } }, "↻ 換班") : null),
                        React.createElement("td", { style: CRM.td }, shiftBadge(t.shift), t.pending ? React.createElement("span", { style: { marginLeft: "4px", fontSize: "11px", color: "#b45309" } }, "待確認") : null),
                        React.createElement("td", { style: CRM.td }, t.stats ? t.stats.calls.toLocaleString() : "—"),
                        ...["q1Rate", "q2Rate", "q1SurveyRate", "q2SurveyRate"].map((k) => React.createElement("td", { key: k, style: CRM.td }, t.stats ? pctOrDash(t.stats[k]) : "—")),
                        React.createElement("td", { style: CRM.td }, t.stats ? fmtSec(t.stats.avgHandleSec) : "—"))))))),
        // 3. 換班前後比較
        React.createElement(CollapsibleCard, { style: { ...CRM.cardLg, overflow: "hidden" } },
            React.createElement("div", { style: CRM.hdr },
                React.createElement("span", { style: CRM.title }, "換班前後比較"),
                React.createElement("span", { style: CRM.badge("#fffbeb", "#b45309") }, `前後各 ${win} 個月`)),
            React.createElement("div", { style: { padding: "8px 18px", fontSize: "12px", color: "#64748b", borderBottom: "0.5px solid #f1f5f9", lineHeight: 1.7 } }, "比較的是換班前、後同一個班別連續的月份（中間沒設定班別的月份會跳過）。滿意度與調查率寫相差幾個百分點：綠色＝變好、紅色＝變差；接聽數與時間不分好壞，用灰色。"),
            !changes.length ? React.createElement("div", { style: { padding: "28px", textAlign: "center", color: "#94a3b8", fontSize: "13px" } }, "這段期間沒有換過班") :
                React.createElement("div", { style: { padding: "12px 18px", display: "flex", flexDirection: "column", gap: "14px" } }, changes.map((c) => {
                    const lowSample = ["q1Answered", "q2Answered"].some((k) => (c.before && c.before[k] < minAnswers) || (c.after && c.after[k] < minAnswers));
                    return React.createElement("div", { key: c.month, style: { border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" } },
                        React.createElement("div", { style: { padding: "10px 14px", background: "#f8fafc", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" } },
                            React.createElement("b", { style: { fontSize: "14px", color: "#0f172a" } }, `${c.month.slice(0, 4)} 年 ${Number(c.month.slice(5, 7))} 月換班：`), shiftBadge(c.from), "→", shiftBadge(c.to),
                            React.createElement("span", { style: { fontSize: "12px", color: "#64748b" } }, `換班前 ${ymText(c.beforeMonths)}（${c.before ? c.before.calls.toLocaleString() : 0} 通）｜換班後 ${ymText(c.afterMonths)}（${c.after ? c.after.calls.toLocaleString() : 0} 通）`)),
                        React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "13px" } },
                            React.createElement("thead", null, React.createElement("tr", null, ["指標", `換班前（${c.from}）`, `換班後（${c.to}）`, "變化"].map((h) => React.createElement("th", { key: h, style: thStyle }, h)))),
                            React.createElement("tbody", null, metrics.map((mt) => React.createElement("tr", { key: mt.label },
                                React.createElement("td", { style: { ...CRM.td, textAlign: "left", fontWeight: "600" } }, mt.label),
                                React.createElement("td", { style: CRM.td }, c.before ? mt.fmt(mt.get(c.before)) : "—"),
                                React.createElement("td", { style: CRM.td }, c.after ? mt.fmt(mt.get(c.after)) : "—"),
                                React.createElement("td", { style: CRM.td }, diffCell(mt, c.before, c.after)))))),
                        lowSample && React.createElement("div", { style: { padding: "8px 14px", fontSize: "12px", color: "#a16207", background: "#fffbeb" } }, `有一邊的問卷回答少於 ${minAnswers} 筆，滿意度的變化僅供參考。`));
                }))));
}

// ─── 客服個人成績單 ────────────────────────────────────────────────────────
function AgentScorecardPanel({ rows = [], settings, effectiveRules = {} }) {
    const period = usePeriodFilteredRows(rows);
    const minCalls = Number(settings.sample.minCalls || 0);
    // V41：「人員有效期間」以外的電話不列入個人成績（電話本身仍保留在團隊數字裡）。
    const scoredRows = useMemo(() => period.filteredRows.filter((r) => r.agent && isAgentEffectiveForRow(r.agent, r, effectiveRules)), [period.filteredRows, effectiveRules]);
    const card = useMemo(() => window.V41Core.agentScorecard(scoredRows, { minCalls }), [scoredRows, minCalls]);
    // 有效期間外的人接的電話：只算在團隊數字（漏接率分析、歷史總覽、AI 儀表板），這頁的合計列改名，避免和團隊數字搞混
    const excludedCalls = useMemo(() => period.filteredRows.filter((r) => r.agent && !isAgentEffectiveForRow(r.agent, r, effectiveRules)).length, [period.filteredRows, effectiveRules]);
    const [sortKey, setSortKey] = useState("calls");
    const [sortDir, setSortDir] = useState(-1);
    const targets = settings.targets;
    const cols = [
        { key: "name", label: "客服", fmt: (a) => a.name },
        { key: "calls", label: "接聽數", fmt: (a) => `${a.calls.toLocaleString()}（${fmtPct(a.share, 0)}）` },
        { key: "avgHandleSec", label: "平均處理時間", fmt: (a) => fmtSec(a.avgHandleSec), diff: (a) => a.vsTeam && a.vsTeam.avgHandleSec, better: "neutral", diffFmt: (d) => `${d >= 0 ? "+" : "−"}${fmtSec(Math.abs(d))}` },
        { key: "avgSpeakSec", label: "平均發話時間", fmt: (a) => fmtSec(a.avgSpeakSec) },
        { key: "q1Rate", label: "人員非常滿意(Q1)", fmt: (a) => fmtPct(a.q1Rate), diff: (a) => a.vsTeam && a.vsTeam.q1Rate, better: "high", target: targets.q1Rate },
        { key: "q2Rate", label: "問題非常滿意(Q2)", fmt: (a) => fmtPct(a.q2Rate), diff: (a) => a.vsTeam && a.vsTeam.q2Rate, better: "high", target: targets.q2Rate },
        { key: "q1SurveyRate", label: "人員調查率(Q1)", fmt: (a) => fmtPct(a.q1SurveyRate), diff: (a) => a.vsTeam && a.vsTeam.q1SurveyRate, better: "high", target: targets.q1SurveyRate },
        { key: "q2SurveyRate", label: "問題調查率(Q2)", fmt: (a) => fmtPct(a.q2SurveyRate), diff: (a) => a.vsTeam && a.vsTeam.q2SurveyRate, better: "high", target: targets.q2SurveyRate },
        { key: "veryUnsatisfied", label: "非常不滿意 Q1／Q2（筆）", fmt: (a) => `${(a.q1VeryUnsat || 0).toLocaleString()}／${(a.q2VeryUnsat || 0).toLocaleString()}` },
    ];
    const sorted = card.agents.slice().sort((a, b) => { const x = a[sortKey], y = b[sortKey]; if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (typeof x === "string" ? x.localeCompare(y, "zh-Hant") : x - y) * sortDir; });
    const cell = (col, a, isTeam) => {
        const value = a[col.key];
        const below = col.target != null && col.target !== "" && value != null && (col.better === "high" ? value < col.target : value > col.target);
        const d = !isTeam && col.diff ? col.diff(a) : null;
        const diffColor = d == null || Math.abs(d) < 0.05 || col.better === "neutral" ? "#94a3b8" : (col.better === "high" ? d > 0 : d < 0) ? "#15803d" : "#b91c1c";
        return React.createElement("td", { key: col.key, style: { ...CRM.td, textAlign: col.key === "name" ? "left" : "right", fontWeight: col.key === "name" || isTeam ? "700" : "500", whiteSpace: "nowrap", color: below ? "#b91c1c" : "#1e293b" } },
            col.fmt(a),
            col.key === "name" && a.lowSample && React.createElement("span", { style: { ...CRM.badge("#f1f5f9", "#64748b"), marginLeft: "6px" } }, "樣本不足"),
            d != null && React.createElement("div", { style: { fontSize: "10px", color: diffColor, fontWeight: "700" } }, col.diffFmt ? col.diffFmt(d) : `${d >= 0 ? "+" : ""}${d.toFixed(1)}`));
    };
    return React.createElement(React.Fragment, null,
        pageTitle("客服個人成績單", `目前期間：${period.selectedLabel}｜共 ${card.agents.length} 位客服、${card.team.calls.toLocaleString()} 通已接聽${excludedCalls ? `（另有 ${excludedCalls.toLocaleString()} 通由「人員有效期間」以外的客服接聽，只算在團隊數字）` : ""}`),
        period.panel,
        infoBox(`每格下方的小字是「跟團隊平均的差距」：綠色較好、紅色較差（平均處理時間不分好壞，只列差距）。數字變紅代表未達「門檻與目標設定」裡的目標值。接聽數少於 ${minCalls} 通的客服標示「樣本不足」，比例容易大起大落，請保守解讀。漏接電話沒有客服，不列入個人成績；不在「人員有效期間」內的電話也不列入（但仍算在團隊數字裡）。調查率＝該題回答數 ÷ 該客服接聽數。點欄位名稱可以排序。`),
        React.createElement(CollapsibleCard, { style: { ...CRM.cardLg, overflow: "hidden" } },
            React.createElement("div", { style: CRM.hdr }, React.createElement("span", { style: CRM.title }, "客服成績表"), React.createElement("span", { style: CRM.badge("#f8fafc", "#64748b") }, `${card.agents.length} 位客服`)),
            React.createElement("div", { style: { overflowX: "auto" } }, React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "12px" } },
                React.createElement("thead", null, React.createElement("tr", null, cols.map((col) => React.createElement("th", { key: col.key, onClick: () => { if (sortKey === col.key) setSortDir((d) => -d); else { setSortKey(col.key); setSortDir(col.key === "name" ? 1 : -1); } }, style: { ...CRM.th, cursor: "pointer", whiteSpace: "nowrap", textAlign: col.key === "name" ? "left" : "right" } }, col.label, sortKey === col.key ? (sortDir > 0 ? " ▲" : " ▼") : "")))),
                React.createElement("tbody", null,
                    sorted.length ? sorted.map((a) => React.createElement("tr", { key: a.name, style: { opacity: a.lowSample ? 0.65 : 1 } }, cols.map((col) => cell(col, a, false)))) : React.createElement("tr", null, React.createElement("td", { colSpan: cols.length, style: { ...CRM.td, padding: "32px", color: "#94a3b8" } }, rows.length ? "這個期間沒有已接聽的電話，請調整上方的期間" : "尚無資料，請先到「地端資料匯入」匯入檔案")),
                    card.team.calls > 0 && React.createElement("tr", { style: { background: "#f8fafc", borderTop: "2px solid #e2e8f0" } }, cols.map((col) => cell(col, { ...card.team, name: excludedCalls ? "列入人員合計" : "團隊合計", share: 100 }, true))))))));
}

// ─── 星期 × 時段熱力圖 ─────────────────────────────────────────────────────
function HeatmapPanel({ rows = [] }) {
    const period = usePeriodFilteredRows(rows);
    const [metric, setMetric] = useState("avgOffered");
    // layout：weekday = 依星期幾彙總（排班用）；date = 依日期逐日（看單日狀況）
    const [layout, setLayout] = useState("weekday");
    // 漏接率模式：來電數低於此門檻的格子變灰、不上色，也不列入「最高」。
    const [minOffered, setMinOffered] = useState(5);
    const calls = useMemo(() => window.V41Core.consolidateCalls(period.filteredRows), [period.filteredRows]);
    const heat = useMemo(() => layout === "date" ? window.V41Core.dateHourMatrix(calls, 60) : window.V41Core.weekdayHourMatrix(calls, 60), [calls, layout]);
    const isRate = metric === "missedRate";
    const lowSample = (c) => isRate && c.offered > 0 && c.offered < minOffered;
    const metrics = {
        avgOffered: { label: layout === "date" ? "來電量" : "平均每日來電量", fmt: (c) => c.avgOffered ? (layout === "date" ? String(c.avgOffered) : c.avgOffered.toFixed(1)) : "", value: (c) => c.avgOffered },
        missed: { label: "漏接通數（合計）", fmt: (c) => c.missed ? String(c.missed) : "", value: (c) => c.missed },
        missedRate: { label: "漏接率（漏接／來電）", fmt: (c) => c.offered ? `${c.missed}/${c.offered}` : "", value: (c) => c.offered ? c.missedRate : 0 },
    };
    const m = metrics[metric];
    const activeHours = Array.from({ length: 24 }, (_, h) => h).filter((h) => heat.matrix.some((row) => row[h].offered > 0));
    const hours = activeHours.length ? Array.from({ length: activeHours[activeHours.length - 1] - activeHours[0] + 1 }, (_, i) => activeHours[0] + i) : [];
    const max = Math.max(0, ...heat.matrix.flatMap((row) => hours.map((h) => lowSample(row[h]) ? 0 : m.value(row[h]))));
    const color = (c) => { const v = m.value(c); if (lowSample(c)) return "#e2e8f0"; if (!v || !max) return "#f8fafc"; const t = v / max; const hue = metric === "avgOffered" ? 221 : 0; return `hsl(${hue}, 80%, ${Math.round(96 - t * 48)}%)`; };
    const textColor = (c) => lowSample(c) ? "#94a3b8" : max && m.value(c) / max > 0.55 ? "#fff" : "#334155";
    const peak = window.V41Core.heatmapPeak(heat.matrix.map((row) => hours.map((h) => row[h])), m.value, { minOffered: isRate ? minOffered : 0 });
    const hourLabel = (h) => `${String(h).padStart(2, "0")}:00–${String(h + 1).padStart(2, "0")}:00`;
    const rowBaseLabel = (r) => layout === "date" ? heat.labels[r] : `${heat.labels[r]}（${heat.dayCounts[r]} 天）`;
    const rowHoliday = (r) => layout === "date" ? getHolidayInfo(heat.dates[r]) : null;
    const rowLabel = (r) => {
        const holiday = rowHoliday(r);
        return `${rowBaseLabel(r)}${holiday ? `｜${holiday.name}` : ""}`;
    };
    const lowCount = isRate ? heat.matrix.reduce((s, row) => s + hours.filter((h) => lowSample(row[h])).length, 0) : 0;
    return React.createElement(React.Fragment, null,
        pageTitle("星期 × 時段熱力圖", `目前期間：${period.selectedLabel}｜${layout === "date" ? `逐日，共 ${heat.matrix.length} 天` : "依星期幾彙總"}｜以對話 ID 為單位`),
        period.panel,
        React.createElement("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" } },
            [["weekday", "依星期幾"], ["date", "依日期"]].map(([key, label]) => React.createElement("button", { key, type: "button", onClick: () => setLayout(key), style: key === layout ? CRM.btnPrimary : CRM.btnGhost }, label)),
            React.createElement("span", { style: { width: "1px", height: "22px", background: "#e2e8f0", margin: "0 4px" } }),
            Object.entries(metrics).map(([key, item]) => React.createElement("button", { key, type: "button", onClick: () => setMetric(key), style: key === metric ? CRM.btnPrimary : CRM.btnGhost }, item.label)),
            isRate && React.createElement("label", { style: { fontSize: "12px", color: "#475569", display: "flex", alignItems: "center", gap: "6px" } }, "來電少於", numInput(minOffered, (v) => setMinOffered(v === "" ? 0 : Math.max(0, v)), { min: 0, style: { width: "56px" } }), "通的格子變灰")),
        React.createElement("div", { style: { fontSize: "12px", color: "#475569" } }, peak ? `最高：${rowLabel(peak.row)} ${hourLabel(hours[peak.col])}（${isRate ? `漏接 ${peak.cell.missed}／來電 ${peak.cell.offered}，${peak.cell.missedRate.toFixed(1)}%` : m.fmt(peak.cell)}）${isRate ? `｜只比較來電 ${minOffered} 通以上的格子` : ""}` : "目前期間沒有可比較的格子"),
        infoBox(layout === "date"
            ? `每一天一列，看單日哪個時段出狀況。「漏接率」模式格子裡是「漏接／來電」通數，顏色依漏接率深淺；來電少於 ${minOffered} 通的格子變灰（比例容易大起大落，不上色）。日期旁會依政府行政機關辦公日曆自動標示國定假日、補假與補行上班；標示只供解讀，不影響計算。滑鼠移到格子上可看完整數字。`
            : `把期間內同一個星期幾合併起來看，適合拿來排班。「平均每日來電量」＝該星期幾、該小時的總來電 ÷ 期間內出現過幾個該星期幾。「漏接率」模式格子裡是「漏接／來電」通數，來電少於 ${minOffered} 通的格子變灰。滑鼠移到格子上可看完整數字。`),
        React.createElement(CollapsibleCard, { style: { ...CRM.cardLg, overflow: "hidden" } },
            React.createElement("div", { style: CRM.hdr }, React.createElement("span", { style: CRM.title }, "熱力圖"), isRate && lowCount > 0 ? React.createElement("span", { style: { fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px", textTransform: "none", letterSpacing: 0 } }, React.createElement("span", { style: { display: "inline-block", width: "14px", height: "14px", background: "#e2e8f0", borderRadius: "3px" } }), `灰色＝樣本少（共 ${lowCount} 格）`) : null),
            React.createElement("div", { style: { overflowX: "auto", maxHeight: layout === "date" ? "640px" : undefined, overflowY: layout === "date" ? "auto" : undefined } }, hours.length ? React.createElement("table", { style: { borderCollapse: "separate", borderSpacing: "2px", fontSize: "11px", margin: "10px" } },
                React.createElement("thead", null, React.createElement("tr", null, React.createElement("th", { style: { padding: "4px 8px", color: "#64748b", fontWeight: "600", position: "sticky", top: 0, background: "#fff" } }, ""), hours.map((h) => React.createElement("th", { key: h, style: { padding: "4px 2px", color: "#64748b", fontWeight: "600", minWidth: isRate ? "44px" : "38px", position: "sticky", top: 0, background: "#fff" } }, `${String(h).padStart(2, "0")}`)))),
                React.createElement("tbody", null, heat.matrix.map((row, r) => React.createElement("tr", { key: r },
                    React.createElement("th", { style: { padding: "4px 8px", color: "#334155", fontWeight: "700", whiteSpace: "nowrap", textAlign: "left" } }, rowBaseLabel(r), layout === "date" && React.createElement(HolidayBadge, { date: heat.dates[r] })),
                    hours.map((h) => { const c = row[h]; return React.createElement("td", { key: h, title: `${rowLabel(r)} ${hourLabel(h)}｜來電 ${c.offered} 通、漏接 ${c.missed} 通、漏接率 ${c.offered ? c.missedRate.toFixed(1) : 0}%${layout === "weekday" ? `、平均每日 ${c.avgOffered.toFixed(1)} 通` : ""}${lowSample(c) ? `（來電少於 ${minOffered} 通，樣本少）` : ""}`, style: { background: color(c), color: textColor(c), textAlign: "center", padding: "7px 3px", borderRadius: "4px", fontWeight: "600", whiteSpace: "nowrap" } }, m.fmt(c)); }))))) : React.createElement("div", { style: { padding: "40px", textAlign: "center", color: "#94a3b8" } }, rows.length ? "這個期間沒有資料，請調整上方的期間" : "尚無資料，請先到「地端資料匯入」匯入檔案"))));
}

// ─── 來電量與人力預測 ──────────────────────────────────────────────────────
function ForecastPanel({ rows = [], settings }) {
    const cfg = settings.forecast;
    const [weeksBack, setWeeksBack] = useState(cfg.weeksBack);
    const [ahtOverride, setAhtOverride] = useState("");
    const [selectedDate, setSelectedDate] = useState("");
    useEffect(() => setWeeksBack(cfg.weeksBack), [cfg.weeksBack]);
    const calls = useMemo(() => window.V41Core.consolidateCalls(rows), [rows]);
    const forecast = useMemo(() => window.V41Core.forecastVolume(calls, { weeksBack, horizonDays: 7, slotMinutes: 30 }), [calls, weeksBack]);
    // 平均處理時間：參考期間內已接聽電話的平均總處理時間。
    const autoAht = useMemo(() => {
        if (!forecast.baseDate) return 0;
        const from = new Date(`${forecast.baseDate}T12:00:00`); from.setDate(from.getDate() - weeksBack * 7);
        const fromKey = formatDateKey(from);
        const list = calls.filter((c) => c.callOutcome === "answered" && String(c.date).replace(/\//g, "-") > fromKey && Number(c.handleDuration) > 0);
        return list.length ? list.reduce((s, c) => s + Number(c.handleDuration), 0) / list.length : 0;
    }, [calls, forecast.baseDate, weeksBack]);
    const aht = ahtOverride === "" ? autoAht : Number(ahtOverride);
    const staff = (n) => window.V41Core.erlangCAgents({ calls: n, ahtSec: aht, intervalSec: 1800, targetSL: cfg.targetSL / 100, targetSec: cfg.targetSec, shrinkage: cfg.shrinkage / 100 });
    const days = forecast.days.map((d) => { const slots = d.slots.map((s) => ({ ...s, staff: staff(s.mean) })); const peak = slots.reduce((p, s) => s.staff.agents > (p ? p.staff.agents : -1) ? s : p, null); return { ...d, slots, peak }; });
    const current = days.find((d) => d.date === selectedDate) || days[0];
    const activeSlots = current ? current.slots.filter((s, i) => days.some((d) => d.slots[i].mean > 0)) : [];
    return React.createElement(React.Fragment, null,
        pageTitle("來電量與人力預測", forecast.baseDate ? `以資料最後一天 ${forecast.baseDate.replace(/-/g, "/")} 為基準，預測接下來 7 天` : "請先匯入資料"),
        infoBox(`預測方法：未來某一天的來電量＝過去 ${weeksBack} 週「同一個星期幾」的平均（那天沒來電就算 0 通）。人力用業界排班常用的 Erlang C 公式估算：要讓 ${cfg.targetSL}% 的電話在 ${cfg.targetSec} 秒內接起，每 30 分鐘需要幾位客服同時在線；「排班人數」再加上 ${cfg.shrinkage}% 的休息折損。目前沒有等候時間資料，所以這是依假設推算的參考值，參數可在「門檻與目標設定」調整。遇到國定假日、活動、改版等特殊日子，請自行加減。`),
        React.createElement("div", { style: { display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center", fontSize: "13px", color: "#334155" } },
            React.createElement("label", null, "參考過去 ", React.createElement("select", { value: weeksBack, onChange: (e) => setWeeksBack(Number(e.target.value)), style: { ...CRM.select, width: "90px", display: "inline-block" } }, [4, 8, 12, 26].map((n) => React.createElement("option", { key: n, value: n }, `${n} 週`)))),
            React.createElement("label", null, "平均處理時間（秒）", numInput(ahtOverride === "" ? Math.round(autoAht) : ahtOverride, (v) => setAhtOverride(v)), React.createElement("span", { style: { fontSize: "12px", color: "#94a3b8", marginLeft: "6px" } }, ahtOverride === "" ? `自動：過去 ${weeksBack} 週平均 ${fmtSec(autoAht)}` : "手動輸入"), ahtOverride !== "" && React.createElement("button", { type: "button", onClick: () => setAhtOverride(""), style: { ...CRM.btnGhost, marginLeft: "6px", padding: "3px 8px" } }, "改回自動"))),
        React.createElement(CollapsibleCard, { style: { ...CRM.cardLg, overflow: "hidden" } },
            React.createElement("div", { style: CRM.hdr }, React.createElement("span", { style: CRM.title }, "未來 7 天預測"), React.createElement("span", { style: { fontSize: "12px", color: "#94a3b8" } }, "點一列看該天每 30 分鐘明細")),
            React.createElement("div", { style: { overflowX: "auto" } }, React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "12px" } },
                React.createElement("thead", null, React.createElement("tr", null, ["日期", "星期", "預測來電", "過去最低～最高", "參考天數", "尖峰時段", "尖峰需在線", "尖峰排班人數"].map((h) => React.createElement("th", { key: h, style: { ...CRM.th, whiteSpace: "nowrap" } }, h)))),
                React.createElement("tbody", null, days.length ? days.map((d) => React.createElement("tr", { key: d.date, onClick: () => setSelectedDate(d.date), style: { cursor: "pointer", background: current && current.date === d.date ? "#eef2ff" : undefined } },
                    React.createElement("td", { style: CRM.td }, d.date.replace(/-/g, "/")),
                    React.createElement("td", { style: CRM.td }, d.weekday),
                    React.createElement("td", { style: { ...CRM.td, fontWeight: "700" } }, `${Math.round(d.total).toLocaleString()} 通`),
                    React.createElement("td", { style: CRM.td }, `${d.low.toLocaleString()}～${d.high.toLocaleString()}`),
                    React.createElement("td", { style: { ...CRM.td, color: d.samples < 4 ? "#b45309" : undefined } }, `${d.samples} 天${d.samples < 4 ? "（偏少）" : ""}`),
                    React.createElement("td", { style: CRM.td }, d.peak && d.peak.mean > 0 ? d.peak.label : "—"),
                    React.createElement("td", { style: { ...CRM.td, fontWeight: "700" } }, d.peak ? `${d.peak.staff.agents} 人` : "—"),
                    React.createElement("td", { style: CRM.td }, d.peak ? `${d.peak.staff.scheduled} 人` : "—"))) : React.createElement("tr", null, React.createElement("td", { colSpan: 8, style: { ...CRM.td, padding: "32px", color: "#94a3b8" } }, "尚無資料")))))),
        current && React.createElement(CollapsibleCard, { style: { ...CRM.cardLg, overflow: "hidden" } },
            React.createElement("div", { style: CRM.hdr }, React.createElement("span", { style: CRM.title }, `${current.date.replace(/-/g, "/")}（${current.weekday}）每 30 分鐘明細`)),
            React.createElement("div", { style: { overflowX: "auto", maxHeight: "480px" } }, React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "12px" } },
                React.createElement("thead", null, React.createElement("tr", null, ["時段", "預測來電", "需同時在線", "排班人數（含折損）", "預估服務水準", "客服忙碌度"].map((h) => React.createElement("th", { key: h, style: { ...CRM.th, whiteSpace: "nowrap" } }, h)))),
                React.createElement("tbody", null, activeSlots.length ? activeSlots.map((s) => React.createElement("tr", { key: s.slot },
                    React.createElement("td", { style: CRM.td }, s.label),
                    React.createElement("td", { style: CRM.td }, s.mean.toFixed(1)),
                    React.createElement("td", { style: { ...CRM.td, fontWeight: "700" } }, s.staff.agents),
                    React.createElement("td", { style: CRM.td }, s.staff.scheduled),
                    React.createElement("td", { style: CRM.td }, s.mean > 0 ? fmtPct(s.staff.serviceLevel * 100, 0) : "—"),
                    React.createElement("td", { style: CRM.td }, s.mean > 0 ? fmtPct(s.staff.occupancy * 100, 0) : "—"))) : React.createElement("tr", null, React.createElement("td", { colSpan: 6, style: { ...CRM.td, padding: "32px", color: "#94a3b8" } }, "這天預測沒有來電")))))));
}

// ─── 統計警示（目標線、管制界限、樣本不足）───────────────────────────────────
function ControlChart({ chart, title, target, better }) {
    const ref = useRef(null);
    const inst = useRef(null);
    useEffect(() => {
        if (!ref.current || !window.Chart) return;
        if (inst.current) inst.current.destroy();
        const pts = chart.points;
        const labels = pts.map((p) => p.label);
        const pointColor = pts.map((p) => p.signal || p.run ? "#dc2626" : p.lowSample ? "#cbd5e1" : "#2563eb");
        const datasets = [
            { label: "實際值", data: pts.map((p) => p.rate), borderColor: "#2563eb", backgroundColor: "#2563eb", pointBackgroundColor: pointColor, pointBorderColor: pointColor, pointRadius: pts.map((p) => p.signal || p.run ? 5 : 3), tension: 0.2, spanGaps: true, borderWidth: 2, order: 1 },
            { label: "平均（中心線）", data: pts.map(() => chart.center), borderColor: "#64748b", borderWidth: 1, pointRadius: 0, borderDash: [2, 2], order: 3 },
            { label: "管制上限", data: pts.map((p) => p.ucl), borderColor: "#f59e0b", borderWidth: 1, pointRadius: 0, borderDash: [6, 4], spanGaps: true, order: 4 },
            { label: "管制下限", data: pts.map((p) => p.lcl), borderColor: "#f59e0b", borderWidth: 1, pointRadius: 0, borderDash: [6, 4], spanGaps: true, order: 4 },
        ];
        if (target != null && target !== "") datasets.push({ label: "目標", data: pts.map(() => Number(target)), borderColor: "#16a34a", borderWidth: 2, pointRadius: 0, order: 2 });
        inst.current = new window.Chart(ref.current, {
            type: "line", data: { labels, datasets },
            options: { responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, plugins: { legend: { position: "bottom", labels: { boxWidth: 14, font: { size: 11 } } }, tooltip: { callbacks: { label: (ctx) => { const v = ctx.parsed.y; if (v == null) return `${ctx.dataset.label}: —`; const p = pts[ctx.dataIndex]; return ctx.datasetIndex === 0 ? `實際值: ${v.toFixed(1)}%（${p.x}/${p.n}${p.lowSample ? "，樣本不足" : ""}）` : `${ctx.dataset.label}: ${v.toFixed(1)}%`; } } } }, scales: { x: { ticks: { font: { size: 10 }, color: "#94a3b8", maxRotation: 45 } }, y: { ticks: { font: { size: 11 }, color: "#94a3b8", callback: (v) => `${v}%` } } } },
        });
        return () => { if (inst.current) inst.current.destroy(); };
    }, [chart, target]);
    const signals = chart.points.filter((p) => p.signal || p.run);
    const lowCount = chart.points.filter((p) => p.lowSample && p.n > 0).length;
    const latest = chart.points.slice().reverse().find((p) => p.rate != null && !p.lowSample);
    const offTarget = latest && target != null && target !== "" && (better === "low" ? latest.rate > target : latest.rate < target);
    return React.createElement(CollapsibleCard, { style: { ...CRM.cardLg, overflow: "hidden" } },
        React.createElement("div", { style: CRM.hdr }, React.createElement("span", { style: CRM.title }, title),
            React.createElement("span", { style: { display: "flex", gap: "6px", flexWrap: "wrap" } },
                latest && React.createElement("span", { style: CRM.badge(offTarget ? "#fef2f2" : "#f0fdf4", offTarget ? "#b91c1c" : "#15803d") }, `${latest === chart.points[chart.points.length - 1] ? "最新" : `最新可判斷（${latest.label}）`} ${latest.rate.toFixed(1)}%${target != null && target !== "" ? (offTarget ? "・未達標" : "・達標") : ""}`),
                React.createElement("span", { style: CRM.badge(signals.length ? "#fef2f2" : "#f8fafc", signals.length ? "#b91c1c" : "#64748b") }, `異常點 ${signals.length}`),
                lowCount > 0 && React.createElement("span", { style: CRM.badge("#f1f5f9", "#64748b") }, `樣本不足 ${lowCount}`))),
        React.createElement("div", { style: { height: "260px", padding: "10px 14px" } }, React.createElement("canvas", { ref, role: "img", "aria-label": title })),
        signals.length > 0 && React.createElement("div", { style: { padding: "0 16px 14px", fontSize: "12px", color: "#b91c1c", lineHeight: 1.8 } }, signals.slice(-6).map((p) => React.createElement("div", { key: p.key }, `● ${p.label}：${p.rate.toFixed(1)}%（${p.x}/${p.n}）${p.signal === "above" ? "超出管制上限" : p.signal === "below" ? "低於管制下限" : p.run === "above" ? "連續 7 期以上高於平均" : "連續 7 期以上低於平均"}`))));
}
function StatAlertsPanel({ rows = [], settings }) {
    const [viewType, setViewType] = useState("weeks");
    const [count, setCount] = useState(26);
    const minCalls = Number(settings.sample.minCalls || 0), minAnswers = Number(settings.sample.minAnswers || 0);
    const calls = useMemo(() => window.V41Core.consolidateCalls(rows), [rows]);
    const keyOf = (c) => viewType === "months" ? (c.monthKey || getCalendarMonthKey(c.date)) : c.weekKey;
    const fmt = (k) => viewType === "months" ? formatMonthDisplay(k) : (formatWeekKeyZh(k) || "").replace(/（.*$/, "");
    const groups = useMemo(() => {
        const map = new Map();
        calls.forEach((c) => { const k = keyOf(c); if (!k) return; const g = map.get(k) || { key: k, offered: 0, missed: 0, q1: { n: 0, very: 0 }, q2: { n: 0, very: 0 } }; g.offered += 1; if (c.callOutcome === "missed") g.missed += 1; ["q1", "q2"].forEach((q) => { if (VALID_SURVEY.includes(c[q])) { g[q].n += 1; if (c[q] === "非常滿意") g[q].very += 1; } }); map.set(k, g); });
        // V41：「最近 N 期」以日曆計算，中間沒資料的週／月補成空白點（不會因為缺週而往前多抓）。
        const keys = Array.from(map.keys()).sort();
        if (!keys.length) return [];
        let full = keys;
        if (viewType === "months") {
            full = []; let [y, m] = keys[0].split("-").map(Number); const [ly, lm] = keys[keys.length - 1].split("-").map(Number);
            while (y < ly || (y === ly && m <= lm)) { full.push(`${y}-${String(m).padStart(2, "0")}`); m += 1; if (m > 12) { m = 1; y += 1; } }
        }
        else full = Array.from(new Set(keys.concat(findMissingWeekKeys(keys)))).sort();
        const empty = (k) => ({ key: k, offered: 0, missed: 0, q1: { n: 0, very: 0 }, q2: { n: 0, very: 0 } });
        return full.slice(-count).map((k) => map.get(k) || empty(k));
    }, [calls, viewType, count]);
    const t = settings.targets;
    // 圖表資料只在期間資料或設定改變時重算，避免每次畫面更新都重畫圖表。
    const charts = useMemo(() => {
        const make = (getX, getN, minN) => { const c = window.V41Core.pChart(groups.map((g) => ({ key: g.key, x: getX(g), n: getN(g) })), { minN, runLength: 7 }); return { ...c, points: c.points.map((p) => ({ ...p, label: fmt(p.key) })) }; };
        return [
            { title: "漏接率", chart: make((g) => g.missed, (g) => g.offered, minCalls), target: t.missedRate, better: "low" },
            { title: "人員非常滿意度(Q1)", chart: make((g) => g.q1.very, (g) => g.q1.n, minAnswers), target: t.q1Rate, better: "high" },
            { title: "問題非常滿意度(Q2)", chart: make((g) => g.q2.very, (g) => g.q2.n, minAnswers), target: t.q2Rate, better: "high" },
            { title: "人員調查率(Q1)", chart: make((g) => g.q1.n, (g) => g.offered - g.missed, minCalls), target: t.q1SurveyRate, better: "high" }, // V41：調查率 ÷ 已接聽
            { title: "問題調查率(Q2)", chart: make((g) => g.q2.n, (g) => g.offered - g.missed, minCalls), target: t.q2SurveyRate, better: "high" },
        ];
    }, [groups, minCalls, minAnswers, t.missedRate, t.q1Rate, t.q2Rate, t.q1SurveyRate, t.q2SurveyRate, viewType]);
    return React.createElement(React.Fragment, null,
        pageTitle("統計警示", `最近 ${groups.length} ${viewType === "months" ? "個月" : "週"}｜目標值與樣本下限可在「門檻與目標設定」調整`),
        React.createElement("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" } },
            [["weeks", "每週"], ["months", "每月"]].map(([k, label]) => React.createElement("button", { key: k, type: "button", onClick: () => setViewType(k), style: viewType === k ? CRM.btnPrimary : CRM.btnGhost }, label)),
            React.createElement("select", { value: count, onChange: (e) => setCount(Number(e.target.value)), style: { ...CRM.select, width: "120px" } }, [13, 26, 52, 104].map((n) => React.createElement("option", { key: n, value: n }, `最近 ${n} 期`)))),
        infoBox("看法：綠線是目標；灰色虛線是這段期間的平均；橘色虛線是「管制界限」（平均 ± 3 個標準差，樣本越少界限越寬）。落在界限內的起伏多半是正常波動，不必追；紅點代表「超出管制界限」或「連續 7 期都在平均同一側」，這才是值得追查的真實變化。灰點代表樣本不足，不列入判斷。"),
        React.createElement("div", { className: "rwd-split", style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" } }, charts.map((c) => React.createElement(ControlChart, { key: c.title, ...c }))));
}

function ImportPreviewDialog({ preview, onConfirm, onCancel }) {
    const report = preview.report || {};
    const excluded = report.excluded || {};
    const failedFiles = (preview.fileStats || []).filter((file) => file.error).length;
    const abnormalCount = Number(excluded.missingDate || 0) + failedFiles;
    const cards = [
        ["選擇檔案", `${preview.fileStats.length} 個`],
        ["原始紀錄", Number(report.rawCount || 0).toLocaleString()],
        ["非傳入電話", Number(excluded.notIncoming || 0).toLocaleString()],
        ["重複紀錄", Number(excluded.duplicateWithinUpload || 0).toLocaleString()],
        ["異常／失敗", abnormalCount.toLocaleString()],
        ["可使用電話", Number(preview.newRowsMerged.length || 0).toLocaleString()],
    ];
    return React.createElement("div", { role: "dialog", "aria-modal": "true", "aria-label": "匯入前預覽", style: { position: "fixed", inset: 0, zIndex: 1100, background: "rgba(15,23,42,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" } },
        React.createElement("div", { style: { width: "min(820px,100%)", maxHeight: "90vh", overflow: "auto", background: "#fff", borderRadius: "18px", boxShadow: "0 24px 70px rgba(15,23,42,.25)" } },
            React.createElement("div", { style: { padding: "18px 22px", borderBottom: "1px solid #e2e8f0" } },
                React.createElement("div", { style: { fontSize: "18px", fontWeight: "900", color: "#0f172a" } }, "匯入前預覽"),
                React.createElement("div", { style: { marginTop: "5px", fontSize: "12px", color: "#64748b" } }, "目前尚未套用資料，請確認後選擇取代或追加。")),
            React.createElement("div", { style: { padding: "18px 22px" } },
                React.createElement("div", { className: "v37-kpi-grid", style: { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: "10px" } }, cards.map(([label, value]) => React.createElement("div", { key: label, style: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "12px 14px" } },
                    React.createElement("div", { style: { fontSize: "11px", color: "#64748b", fontWeight: "700" } }, label),
                    React.createElement("div", { style: { marginTop: "5px", fontSize: "22px", color: "#0f172a", fontWeight: "900" } }, value)))),
                React.createElement("div", { style: { marginTop: "14px", padding: "12px 14px", borderRadius: "10px", background: "#eff6ff", color: "#1e40af", fontSize: "12px", lineHeight: 1.8 } },
                    React.createElement("b", null, "新資料期間："), report.dateRange || "—", React.createElement("br"),
                    React.createElement("b", null, "目前資料："), `${preview.existingCount.toLocaleString()} 通`, React.createElement("br"),
                    preview.existingCount > 0 && React.createElement(React.Fragment, null, React.createElement("b", null, "與目前資料重複："), `${preview.overlapWithExisting.toLocaleString()} 通（追加時會自動合併）`)),
                ((report.missingDates || []).length > 0 || (preview.existingCount > 0 && (report.appendMissingDates || []).length > 0)) && React.createElement("div", { style: { marginTop: "12px", border: "1px solid #fcd34d", background: "#fffbeb", borderRadius: "10px", padding: "10px 14px", fontSize: "12px", color: "#92400e", lineHeight: 1.8 } },
                    (report.missingDates || []).length > 0 && React.createElement("div", null,
                        React.createElement("b", null, `⚠ 這批資料中間有 ${report.missingDates.reduce((n, g) => n + g.days, 0)} 天完全沒有電話，可能少匯出了：`),
                        React.createElement("ul", { style: { margin: "4px 0 0", paddingLeft: "20px" } }, report.missingDates.slice(0, 10).map((g) => { const d = describeMissingDates(g); return React.createElement("li", { key: g.start, style: d.allHoliday ? { color: "#a16207" } : { fontWeight: "700" } }, d.text); }), report.missingDates.length > 10 ? React.createElement("li", null, `還有 ${report.missingDates.length - 10} 段`) : null)),
                    preview.existingCount > 0 && (report.appendMissingDates || []).length > 0 && React.createElement("div", { style: { marginTop: (report.missingDates || []).length ? "8px" : 0 } },
                        React.createElement("b", null, "⚠ 如果選「追加」，目前資料和這批資料之間會空掉："),
                        React.createElement("ul", { style: { margin: "4px 0 0", paddingLeft: "20px" } }, report.appendMissingDates.slice(0, 10).map((g) => { const d = describeMissingDates(g); return React.createElement("li", { key: g.start, style: d.allHoliday ? { color: "#a16207" } : { fontWeight: "700" } }, d.text); }))),
                    React.createElement("div", { style: { marginTop: "6px", color: "#a16207" } }, "如果那幾天客服中心有上班，請回 Genesys 補匯出那幾天的資料；確定本來就沒有電話（例如休息日），可以直接繼續。")),
                (report.warnings || []).length > 0 && React.createElement("details", { style: { marginTop: "12px", border: "1px solid #fde68a", background: "#fffbeb", borderRadius: "10px", padding: "10px 12px", fontSize: "12px", color: "#92400e" } },
                    React.createElement("summary", { style: { cursor: "pointer", fontWeight: "800" } }, `查看 ${report.warnings.length} 項資料提醒`),
                    React.createElement("ul", { style: { margin: "8px 0 0", paddingLeft: "20px", lineHeight: 1.7 } }, report.warnings.map((warning, index) => React.createElement("li", { key: index }, warning)))),
                React.createElement("div", { style: { marginTop: "18px", display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" } },
                    React.createElement("button", { type: "button", onClick: onCancel, style: CRM.btnGhost }, "取消"),
                    preview.existingCount > 0 && React.createElement("button", { type: "button", onClick: () => onConfirm("replace"), style: { ...CRM.btnDanger, padding: "8px 14px" } }, `取代目前 ${preview.existingCount.toLocaleString()} 通資料`),
                    React.createElement("button", { type: "button", onClick: () => onConfirm(preview.existingCount > 0 ? "append" : "replace"), style: CRM.btnPrimary }, preview.existingCount > 0 ? "追加並合併" : "使用這批資料")))));
}

// V42.8：登入畫面（Email＋密碼）。也可以先不登入，只在這台電腦用。
function LoginScreen({ onLocal }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const cloudOk = !!(window.CloudStore && window.CloudStore.available());
    const submit = async (e) => {
        e.preventDefault();
        if (!email.trim() || !password) return setError("請輸入 Email 和密碼。");
        setBusy(true); setError("");
        try { await window.CloudStore.signIn(email, password); }
        catch (err) { setError(window.CloudStore.errorText(err)); setBusy(false); }
    };
    const input = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit" };
    return React.createElement("div", { style: { minHeight: "100vh", background: "var(--bg, #f1f5f9)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", fontFamily: "'Inter','PingFang TC','Microsoft JhengHei',sans-serif" } },
        React.createElement("form", { onSubmit: submit, style: { width: "100%", maxWidth: "380px", background: "#fff", border: "0.5px solid #e2e8f0", borderRadius: "14px", padding: "28px", boxShadow: "0 10px 25px rgba(15,23,42,.08)", display: "flex", flexDirection: "column", gap: "12px" } },
            React.createElement("div", { style: { fontSize: "18px", fontWeight: "700", color: "#0f172a" } }, "客服電話紀錄長期觀察系統"),
            React.createElement("div", { style: { fontSize: "11px", fontWeight: "700", color: "#1d4ed8" } }, APP_VERSION),
            cloudOk ? React.createElement(React.Fragment, null,
                React.createElement("label", { style: { fontSize: "12px", color: "#475569", fontWeight: "600" } }, "Email",
                    React.createElement("input", { type: "email", autoComplete: "username", value: email, onChange: (e) => setEmail(e.target.value), style: { ...input, marginTop: "4px" } })),
                React.createElement("label", { style: { fontSize: "12px", color: "#475569", fontWeight: "600" } }, "密碼",
                    React.createElement("input", { type: "password", autoComplete: "current-password", value: password, onChange: (e) => setPassword(e.target.value), style: { ...input, marginTop: "4px" } })),
                error && React.createElement("div", { role: "alert", style: { fontSize: "12px", color: "#b91c1c", background: "#fef2f2", border: "0.5px solid #fecaca", borderRadius: "8px", padding: "8px 10px" } }, error),
                React.createElement("button", { type: "submit", disabled: busy, style: { padding: "10px", border: "none", borderRadius: "8px", background: "#2563eb", color: "#fff", fontSize: "14px", fontWeight: "700", cursor: busy ? "wait" : "pointer", fontFamily: "inherit" } }, busy ? "登入中…" : "登入"),
                React.createElement("div", { style: { fontSize: "11px", color: "#94a3b8", lineHeight: 1.6 } }, "登入後，電話資料、班表、人員有效期間會存在雲端，換電腦也看得到。"))
            : React.createElement("div", { style: { fontSize: "12px", color: "#92400e", background: "#fffbeb", border: "0.5px solid #fde68a", borderRadius: "8px", padding: "10px", lineHeight: 1.6 } }, "雲端功能載入失敗（可能沒有網路，或是直接開啟本機檔案）。現在只能在這台電腦使用。"),
            React.createElement("button", { type: "button", onClick: onLocal, style: { padding: "8px", border: "0.5px solid #e2e8f0", borderRadius: "8px", background: "#fff", color: "#64748b", fontSize: "12px", cursor: "pointer", fontFamily: "inherit" } }, "先不登入（資料只在這台電腦，不會存到雲端）")));
}
function App() {
    const [syncStatus, setSyncStatus] = useState("資料只在這台電腦的瀏覽器中分析");
    // V42.8：雲端。cloudUser：undefined＝確認中、null＝沒登入；cloudReady＝雲端資料讀完了。
    const [cloudUser, setCloudUser] = useState(undefined);
    const [localOnly, setLocalOnly] = useState(false);
    const [cloudReady, setCloudReady] = useState(false);
    const [cloudError, setCloudError] = useState("");
    const [cloudReloadTick, setCloudReloadTick] = useState(0);
    const cloudOnRef = useRef(false);
    const cloudSavingRef = useRef(0);
    const cloudQueueRef = useRef(Promise.resolve());
    const skipUnloadRef = useRef(false);
    const cloudSaveSetting = (key, value) => {
        if (!cloudOnRef.current) return;
        window.CloudStore.saveSetting(key, value).then(() => setSyncStatus("已存到雲端")).catch((e) => { console.error(e); setSyncStatus("雲端儲存失敗：" + window.CloudStore.errorText(e)); });
    };
    // V39：門檻、樣本數下限、目標值、人力預測參數（存在本機瀏覽器）。
    const [analysisSettings, setAnalysisSettings] = useState(loadAnalysisSettings);
    // V39.2：左側選單各分組的收合狀態（記在本機）。
    const SIDEBAR_COLLAPSE_KEY = "weekly_call_project_v39_sidebar_collapsed";
    const [collapsedGroups, setCollapsedGroups] = useState(() => { try { return JSON.parse(localStorage.getItem(SIDEBAR_COLLAPSE_KEY) || "{}") || {}; } catch (e) { return {}; } });
    const updateCollapsedGroups = (next) => { setCollapsedGroups(next); try { localStorage.setItem(SIDEBAR_COLLAPSE_KEY, JSON.stringify(next)); } catch (e) { } };
    const saveAnalysisSettings = (next) => { setAnalysisSettings(next); saveAnalysisSettingsToStorage(next); setSyncStatus("門檻與目標設定已儲存（本機）"); };
    const [activeTab, setActiveTab] = useState("dashboard");
    const [shiftRules, setShiftRules] = useState(EMPTY_SHIFT_RULES);
    const [effectiveRules, setEffectiveRules] = useState(EMPTY_EFFECTIVE_RULES);
    const [eventList, setEventList] = useState(EMPTY_EVENT_LIST);
    const [shiftEditorMonth, setShiftEditorMonth] = useState("default");
    const [shiftMonthInput, setShiftMonthInput] = useState("");
    const [shiftDraft, setShiftDraft] = useState({ "早班": "", "中班": "", "晚班": "" });
    const [effectiveDraft, setEffectiveDraft] = useState({ name: "", start: "", end: "", note: "" });
    const [cloudMasterStore, setCloudMasterStore] = useState(EMPTY_CLOUD_STORE);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [previewRows, setPreviewRows] = useState([]);
    const [previewMeta, setPreviewMeta] = useState(EMPTY_PREVIEW_META);
    const [csvFileName, setCsvFileName] = useState("");
    const [uploadMessage, setUploadMessage] = useState("");
    const [pendingImport, setPendingImport] = useState(null);
    const [loadedFileNames, setLoadedFileNames] = useState([]);
    const [validationReport, setValidationReport] = useState(null);
    const [viewType, setViewType] = useState("weeks");
    const [selectedMetric, setSelectedMetric] = useState("q1VerySatRate");
    const [selectedTrendAgents, setSelectedTrendAgents] = useState([]);
    const [includeHistoryAgents, setIncludeHistoryAgents] = useState(false);
    const [periodFilters, setPeriodFilters] = useState(DEFAULT_PERIOD_FILTERS);
    const handlePeriodShortcut = useCallback((scope, key) => {
        setPeriodFilters((prev) => ({ ...prev, [scope]: { shortcut: key, customFrom: "", customTo: "" } }));
    }, []);
    const handlePeriodCustomRange = useCallback((scope, from, to) => {
        setPeriodFilters((prev) => ({ ...prev, [scope]: { shortcut: "custom", customFrom: from, customTo: to } }));
    }, []);
    const [detailMode, setDetailMode] = useState("weeks");
    const [detailKey, setDetailKey] = useState("");
    const [previewPage, setPreviewPage] = useState(1);
    const [previewPageSize, setPreviewPageSize] = useState(100);
    const [detailPage, setDetailPage] = useState(1);
    const [detailPageSize, setDetailPageSize] = useState(100);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    const knownTrendAgentsRef = useRef(new Set());
    const getAllAgentsFromRules = useCallback((rules = shiftRules) => {
        const set = new Set();
        Object.values(rules || {}).forEach((group) => { Object.values(group || {}).forEach((names) => (names || []).forEach((n) => set.add(n))); });
        return Array.from(set).sort((a, b) => a.localeCompare(b, "zh-Hant"));
    }, [shiftRules]);
    const getShiftInfoFromRules = useCallback((rules, agentName, monthKey, existingShift = "") => {
        const activeRules = rules || EMPTY_SHIFT_RULES;
        const normalizedMonth = normalizeMonthKey(monthKey);
        const monthRules = activeRules[normalizedMonth];
        if (monthRules) {
            for (const [shift, names] of Object.entries(monthRules)) {
                if ((names || []).includes(agentName))
                    return { shift, source: "月份班表" };
            }
        }
        const defaultRules = activeRules.default || EMPTY_SHIFT_RULES.default;
        for (const [shift, names] of Object.entries(defaultRules)) {
            if ((names || []).includes(agentName))
                return { shift, source: "預設班表" };
        }
        if (existingShift)
            return { shift: existingShift, source: "資料原始班別" };
        return { shift: "", source: "未設定" };
    }, []);
    const getShiftInfoByMonth = useCallback((agentName, monthKey, existingShift = "") => getShiftInfoFromRules(shiftRules, agentName, monthKey, existingShift), [getShiftInfoFromRules, shiftRules]);
    // V42.2：記錄「哪個月是自動從哪個月沿用、還沒確認」，例如 { "2026-11": "2026-10" }。
    const SHIFT_AUTO_KEY = "weekly_call_project_shift_auto_months";
    const [shiftAutoMonths, setShiftAutoMonths] = useState(() => { try { return JSON.parse(localStorage.getItem(SHIFT_AUTO_KEY) || "{}") || {}; } catch (e) { return {}; } });
    const saveShiftAutoMonths = (map) => { setShiftAutoMonths(map); try { localStorage.setItem(SHIFT_AUTO_KEY, JSON.stringify(map)); } catch (e) { } cloudSaveSetting("shift_auto_months", map); };
    const isShiftPending = (monthKey) => Object.prototype.hasOwnProperty.call(shiftAutoMonths, monthKey); // 來源可能是空字串（新增、還沒儲存）
    const markShiftMonthConfirmed = (monthKey) => { if (isShiftPending(monthKey)) { const next = { ...shiftAutoMonths }; delete next[monthKey]; saveShiftAutoMonths(next); } };
    const saveShiftRules = async (rules) => {
        setShiftRules(rules);
        localStorage.setItem("weekly_call_project_shift_rules", JSON.stringify(rules));
        if (cloudOnRef.current) cloudSaveSetting("shift_rules", rules); else setSyncStatus("班表已儲存（本機）");
    };
    const persistEvents = async (events) => {
        localStorage.setItem("weekly_call_project_events", JSON.stringify(events));
        if (cloudOnRef.current) cloudSaveSetting("events", events); else setSyncStatus("事件註記已儲存（本機）");
    };
    const addEvent = (draft) => {
        const id = `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const newEvent = { id, date: draft.date, type: draft.type, title: draft.title, note: draft.note || "" };
        setEventList((prev) => { const next = [...prev, newEvent]; persistEvents(next); return next; });
    };
    const deleteEvent = (id) => {
        setEventList((prev) => { const next = prev.filter((ev) => ev.id !== id); persistEvents(next); return next; });
    };
    const saveEffectiveRules = async (rules) => {
        setEffectiveRules(rules);
        localStorage.setItem("weekly_call_project_effective_rules", JSON.stringify(rules));
        if (cloudOnRef.current) cloudSaveSetting("effective_rules", rules); else setSyncStatus("人員有效期間已儲存（本機）");
    };
    // V41：兩個比例的平均，忽略「無資料」(null)；兩個都沒有就是 null。
    const avgOf = (...vals) => { const v = vals.filter((x) => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
    const buildAgentStats = useCallback((rows, periodMonthKey = "", rulesOverride = null, effectiveOverride = null, periodKey = "", periodType = "weeks", forceIncludeHistory = false) => {
        const activeRules = rulesOverride || shiftRules;
        const activeEffective = effectiveOverride || effectiveRules;
        const agentBase = {};
        const shouldSeedAgent = (name) => forceIncludeHistory ? true : isAgentEffectiveForPeriod(name, periodKey, periodType, activeEffective);
        // V41：只列出這段期間實際有接電話的客服（不再從班表規則預先塞人名，避免資料裡沒有的人出現在名單上）。
        rows.forEach((d) => {
            if (!d.agent)
                return;
            if (!isAgentEffectiveForRow(d.agent, d, activeEffective))
                return;
            if (!agentBase[d.agent]) {
                agentBase[d.agent] = { name: d.agent, shift: d.shift || getShiftInfoFromRules(activeRules, d.agent, d.monthKey).shift, totalCalls: 0, q1Answered: 0, q1VerySatisfied: 0, q1Ok: 0, q1VeryUnsatisfied: 0, q2Answered: 0, q2VerySatisfied: 0, q2Ok: 0, q2VeryUnsatisfied: 0, lines: { "GT專線": 0, "儲值專線": 0, "GT+儲值專線": 0, "滿貫專線": 0, "金好運專線": 0 } };
            }
            const a = agentBase[d.agent];
            a.shift = d.shift || a.shift;
            a.totalCalls += 1;
            if (VALID_SURVEY.includes(d.q1)) {
                a.q1Answered += 1;
                if (d.q1 === "非常滿意")
                    a.q1VerySatisfied += 1;
                if (d.q1 === "尚可")
                    a.q1Ok += 1;
                if (d.q1 === "非常不滿意")
                    a.q1VeryUnsatisfied += 1;
            }
            if (VALID_SURVEY.includes(d.q2)) {
                a.q2Answered += 1;
                if (d.q2 === "非常滿意")
                    a.q2VerySatisfied += 1;
                if (d.q2 === "尚可")
                    a.q2Ok += 1;
                if (d.q2 === "非常不滿意")
                    a.q2VeryUnsatisfied += 1;
            }
            const sec = Number(d.speakDuration || d.duration || 0);
            if ((d.line || "").includes("GT")) {
                a.lines["GT專線"] += sec;
                a.lines["GT+儲值專線"] += sec;
            }
            if ((d.line || "").includes("儲值")) {
                a.lines["儲值專線"] += sec;
                a.lines["GT+儲值專線"] += sec;
            }
            if ((d.line || "").includes("滿貫"))
                a.lines["滿貫專線"] += sec;
            if ((d.line || "").includes("金好運"))
                a.lines["金好運專線"] += sec;
        });
        return Object.values(agentBase).map((a) => {
            const q1VerySatRate = a.q1Answered ? (a.q1VerySatisfied / a.q1Answered) * 100 : null;
            const q1OkRate = a.q1Answered ? (a.q1Ok / a.q1Answered) * 100 : null;
            const q1VeryUnsatRate = a.q1Answered ? (a.q1VeryUnsatisfied / a.q1Answered) * 100 : null;
            const q1SurRate = a.totalCalls ? (a.q1Answered / a.totalCalls) * 100 : 0;
            const q1UnansweredRate = a.totalCalls ? ((a.totalCalls - a.q1Answered) / a.totalCalls) * 100 : 0;
            const q2VerySatRate = a.q2Answered ? (a.q2VerySatisfied / a.q2Answered) * 100 : null;
            const q2OkRate = a.q2Answered ? (a.q2Ok / a.q2Answered) * 100 : null;
            const q2VeryUnsatRate = a.q2Answered ? (a.q2VeryUnsatisfied / a.q2Answered) * 100 : null;
            const q2SurRate = a.totalCalls ? (a.q2Answered / a.totalCalls) * 100 : 0;
            const q2UnansweredRate = a.totalCalls ? ((a.totalCalls - a.q2Answered) / a.totalCalls) * 100 : 0;
            return { ...a, q1SurRate, q1UnansweredRate, q1VerySatRate, q1OkRate, q1VeryUnsatRate, q2SurRate, q2UnansweredRate, q2VerySatRate, q2OkRate, q2VeryUnsatRate, overallVerySatAvg: avgOf(q1VerySatRate, q2VerySatRate), overallOkAvg: avgOf(q1OkRate, q2OkRate), overallVeryUnsatAvg: avgOf(q1VeryUnsatRate, q2VeryUnsatRate), overallSurAvg: (q1SurRate + q2SurRate) / 2, overallUnansweredAvg: (q1UnansweredRate + q2UnansweredRate) / 2 };
        });
    }, [shiftRules, effectiveRules, getAllAgentsFromRules, getShiftInfoFromRules]);
    const buildPeriodSummary = useCallback((rows, periodKey, periodLabel, extra = {}, rulesOverride = null, effectiveOverride = null, periodType = "weeks") => {
        var _a;
        const activeEffective = effectiveOverride || effectiveRules;
        const filteredRows = (rows || []).filter((r) => isAgentEffectiveForRow(r.agent, r, activeEffective));
        const periodMonthKey = ((_a = filteredRows[0]) === null || _a === void 0 ? void 0 : _a.monthKey) || extra.month || "";
        const agents = buildAgentStats(filteredRows, periodMonthKey, rulesOverride, activeEffective, periodKey, periodType);
        const lineTotals = { "GT專線": 0, "儲值專線": 0, "GT+儲值專線": 0, "滿貫專線": 0, "金好運專線": 0 };
        let verySatTotal = 0, okTotal = 0, veryUnsatTotal = 0, surTotal = 0, unansweredTotal = 0, countSat = 0, countSur = 0, teamTotalCalls = 0;
        agents.forEach((a) => {
            teamTotalCalls += a.totalCalls;
            Object.keys(lineTotals).forEach((k) => { lineTotals[k] += a.lines[k]; });
            if (a.totalCalls > 0 && a.overallVerySatAvg != null) {
                verySatTotal += a.overallVerySatAvg;
                okTotal += a.overallOkAvg;
                veryUnsatTotal += a.overallVeryUnsatAvg;
                surTotal += a.overallSurAvg;
                unansweredTotal += a.overallUnansweredAvg;
                countSat += 1;
                countSur += 1;
            }
        });
        const weighted = weightedSurveySummary(agents);
        return { periodKey, periodLabel, agents, teamTotalCalls, teamLineTime: lineTotals, overallVerySatAvg: countSat ? verySatTotal / countSat : 0, overallOkAvg: countSat ? okTotal / countSat : 0, overallVeryUnsatAvg: countSat ? veryUnsatTotal / countSat : 0, overallSurAvg: countSur ? surTotal / countSur : 0, overallUnansweredAvg: countSur ? unansweredTotal / countSur : 0, weightedVerySatAvg: weighted.weightedVerySatAvg, weightedVeryUnsatAvg: weighted.weightedVeryUnsatAvg, weightedSurAvg: weighted.weightedSurAvg, surveySampleSize: weighted.surveySampleSize, ...extra };
    }, [buildAgentStats, effectiveRules]);
    useEffect(() => { try {
        const s = localStorage.getItem("weekly_call_project_shift_rules");
        if (s)
            setShiftRules(JSON.parse(s));
    }
    catch (e) { } try {
        const s = localStorage.getItem("weekly_call_project_effective_rules");
        if (s)
            setEffectiveRules(JSON.parse(s));
    }
    catch (e) { } try {
        const s = localStorage.getItem("weekly_call_project_events");
        if (s)
            setEventList(JSON.parse(s));
    }
    catch (e) { } }, []);
    useEffect(() => { const rule = shiftRules[shiftEditorMonth] || { "早班": [], "中班": [], "晚班": [] }; setShiftDraft({ "早班": stringifyNameList(rule["早班"]), "中班": stringifyNameList(rule["中班"]), "晚班": stringifyNameList(rule["晚班"]) }); }, [shiftEditorMonth, shiftRules]);
    const getMonthExpectedRange = (monthKey) => {
        const m = String(monthKey || "").match(/^(\d{4})-(\d{2})$/);
        if (!m)
            return { start: "", end: "", label: "" };
        const y = Number(m[1]), month = Number(m[2]);
        const start = `${y}-${String(month).padStart(2, "0")}-01`;
        const last = new Date(y, month, 0);
        const end = formatDateKey(last);
        return { start, end, label: `${formatCustomDate(start)}～${formatCustomDate(end)}` };
    };
    const buildUploadRows = (rawRows) => {
        const detailRows = [];
        const directionColumn = hasDirectionColumn(rawRows);
        for (const raw of rawRows) {
            const data = getRowValueByAliases(raw);
            const agent = String(data.agent || "").trim();
            if (!isIncomingRow(data, rowHasDirection(raw, directionColumn)))
                continue;
            const { date, time } = parseDateTimeValue(data.datetime);
            if (!date || !isValidCalendarDate(date))
                continue;
            const monthKey = getCalendarMonthKey(date);
            const yearKey = getCalendarYearKey(date);
            const weekInfo = getWeekInfo(date, time || "00:00:00");
            const shiftInfo = agent ? getShiftInfoByMonth(agent, monthKey) : { shift: "", source: "missed-call" };
            const sat = extractSatisfaction(data.tags);
            const row = { agent, shift: shiftInfo.shift, shiftSource: shiftInfo.source, date, time, monthKey, yearKey, weekKey: (weekInfo === null || weekInfo === void 0 ? void 0 : weekInfo.weekKey) || "", weekLabel: (weekInfo === null || weekInfo === void 0 ? void 0 : weekInfo.weekLabel) || "", weekStart: (weekInfo === null || weekInfo === void 0 ? void 0 : weekInfo.monday) || "", weekEnd: (weekInfo === null || weekInfo === void 0 ? void 0 : weekInfo.sunday) || "", line: resolveLineName(data.line, raw, agent), q1: sat.q1, q2: sat.q2, id: String(data.dialogId || "").trim(), handleDuration: parseDuration(data.handleTime), speakDuration: parseDuration(data.speakTime), callOutcome: agent ? "answered" : "missed" };
            // V41：不刪任何電話。「人員有效期間」只影響個人排行與趨勢線，不影響團隊的進線、接聽、漏接。
                detailRows.push(row);
        }
        return dedupeRows(detailRows).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    };
    const buildValidationReport = (rawRows = [], validRows = [], previewRowsForReport = [], sourceName = "目前資料") => {
        const excluded = { notIncoming: 0, missingAgent: 0, missingDate: 0, ineffective: 0, duplicateWithinUpload: 0 };
        const rawWeekMap = {}, validWeekMap = {}, previewWeekMap = {}, monthMap = {};
        const validDates = [];
        const seenKeysThisUpload = new Map();
        const answeredNoLine = [];
        const directionColumn = hasDirectionColumn(rawRows);
        rawRows.forEach((raw) => {
            const data = getRowValueByAliases(raw);
            const agent = String(data.agent || "").trim();
            const { date, time } = parseDateTimeValue(data.datetime);
            if (!isIncomingRow(data, rowHasDirection(raw, directionColumn))) {
                excluded.notIncoming += 1;
                return;
            }
            const weekInfo = getWeekInfo(date, time || "00:00:00");
            if (weekInfo === null || weekInfo === void 0 ? void 0 : weekInfo.weekKey) {
                if (!rawWeekMap[weekInfo.weekKey])
                    rawWeekMap[weekInfo.weekKey] = { count: 0, label: weekInfo.weekLabel };
                rawWeekMap[weekInfo.weekKey].count += 1;
            }
            if (!date || !isValidCalendarDate(date)) {
                excluded.missingDate += 1;
                return;
            }
            const monthKey = getCalendarMonthKey(date);
            const yearKey = getCalendarYearKey(date);
            // V41：有效期間外的電話照常保留，這裡只計數提醒（不再 return）。
            if (agent && !isAgentEffectiveForRow(agent, { weekKey: (weekInfo === null || weekInfo === void 0 ? void 0 : weekInfo.weekKey) || "", monthKey, yearKey }, effectiveRules))
                excluded.ineffective += 1;
            const sat = extractSatisfaction(data.tags);
            const dialogId = String(data.dialogId || "").trim();
            const dupKey = makeRowUniqueKey({ id: dialogId, agent, date, time, line: resolveLineName(data.line, raw, agent), q1: sat.q1, q2: sat.q2 });
            const occurrence = { file: raw[SOURCE_FILE] || sourceName, row: raw[SOURCE_ROW] || null, date, time, agent, line: resolveLineName(data.line, raw, agent), q1: sat.q1, q2: sat.q2 };
            if (seenKeysThisUpload.has(dupKey)) {
                excluded.duplicateWithinUpload += 1;
                seenKeysThisUpload.get(dupKey).occurrences.push(occurrence);
                return;
            }
            seenKeysThisUpload.set(dupKey, { dialogId, occurrences: [occurrence] });
            // 規則 3：有客服接聽，但第一佇列沒有專線名稱 → 不用 DNIS 補，列入警示清單。
            // V41：放在去除重複之後，同一通電話只列一次，日期錯誤的資料也不列入。
            if (agent && !queueHasLineName(data.line))
                answeredNoLine.push({ file: raw[SOURCE_FILE] || sourceName, row: raw[SOURCE_ROW] || null, date, time, agent, queue: String(data.line || "").trim(), dnis: String(raw["DNIS"] || "").trim(), dialogId });
        });
        // V41：「漏接」以合併同一對話 ID 之後的通數計算，與漏接率分析一致。
        excluded.missingAgent = validRows.filter((r) => r.callOutcome === "missed").length;
        // 同一通電話（同一對話 ID）出現多筆的明細；第一筆為保留計算的那筆以外的其他筆一併列出，方便回原檔對照。
        const duplicateGroups = Array.from(seenKeysThisUpload.values()).filter((group) => group.occurrences.length > 1).map((group) => ({ ...group, crossFile: new Set(group.occurrences.map((o) => o.file)).size > 1 }));
        validRows.forEach((r) => {
            if (r.date)
                validDates.push(r.date);
            if (r.weekKey) {
                if (!validWeekMap[r.weekKey])
                    validWeekMap[r.weekKey] = { count: 0, label: r.weekLabel };
                validWeekMap[r.weekKey].count += 1;
            }
            if (r.monthKey) {
                if (!monthMap[r.monthKey])
                    monthMap[r.monthKey] = { dates: [], count: 0 };
                monthMap[r.monthKey].dates.push(r.date);
                monthMap[r.monthKey].count += 1;
            }
        });
        previewRowsForReport.forEach((r) => { if (r.weekKey) {
            if (!previewWeekMap[r.weekKey])
                previewWeekMap[r.weekKey] = { count: 0, label: r.weekLabel };
            previewWeekMap[r.weekKey].count += 1;
        } });
        const allWeekKeys = Array.from(new Set([...Object.keys(rawWeekMap), ...Object.keys(validWeekMap), ...Object.keys(previewWeekMap)])).sort();
        const weekStats = allWeekKeys.map((weekKey) => { var _a, _b, _c, _d, _e, _f; const rawIncomingCount = ((_a = rawWeekMap[weekKey]) === null || _a === void 0 ? void 0 : _a.count) || 0, validCount = ((_b = validWeekMap[weekKey]) === null || _b === void 0 ? void 0 : _b.count) || 0, previewCount = ((_c = previewWeekMap[weekKey]) === null || _c === void 0 ? void 0 : _c.count) || 0; return { weekKey, weekLabel: ((_d = rawWeekMap[weekKey]) === null || _d === void 0 ? void 0 : _d.label) || ((_e = validWeekMap[weekKey]) === null || _e === void 0 ? void 0 : _e.label) || ((_f = previewWeekMap[weekKey]) === null || _f === void 0 ? void 0 : _f.label) || "", rawIncomingCount, validCount, previewCount, ok: validCount === 0 || previewCount > 0 }; });
        const monthStats = Object.keys(monthMap).sort().map((monthKey) => { const dates = monthMap[monthKey].dates.filter(Boolean).sort(); const first = dates[0] || "", last = dates[dates.length - 1] || "", expected = getMonthExpectedRange(monthKey); return { monthKey, expectedRange: expected.label, actualRange: first && last ? `${formatCustomDate(first)}～${formatCustomDate(last)}` : "-", validCount: monthMap[monthKey].count, ok: first <= expected.start && last >= expected.end }; });
        const warnings = [];
        if (answeredNoLine.length > 0)
            warnings.push(`有 ${answeredNoLine.length} 筆有客服接聽，但「第一佇列」沒有專線名稱：依規則不以 DNIS 補入，專線維持「未分類」。逐筆請看下方「已接聽但缺專線名稱」。`);
        const noDirectionRows = rawRows.filter((raw) => !rowHasDirection(raw, directionColumn)).length;
        if (noDirectionRows > 0)
            warnings.push(`有 ${noDirectionRows} 筆資料來自沒有「初始方向」欄位的檔案，已全部視為傳入電話；若檔案內含撥出電話，請改用含「初始方向」欄位的原始匯出檔。`);
        const missingWeeks = weekStats.filter((w) => w.validCount > 0 && w.previewCount === 0);
        if (missingWeeks.length)
            warnings.push(`有效資料含 ${missingWeeks.map((w) => formatWeekKeyZh(w.weekKey)).join("、")}，但目前預覽沒有顯示。`);
        monthStats.filter((m) => !m.ok).forEach((m) => warnings.push(`${formatMonthDisplay(m.monthKey)} 目前不是完整月份資料，應抓 ${m.expectedRange}。`));
        if (excluded.missingAgent > 0)
            warnings.push(`有 ${excluded.missingAgent} 通漏接（沒有客服名稱；同一對話 ID 只要任一筆有客服就算已接聽，已先合併）。`);
        if (excluded.missingDate > 0)
            warnings.push(`有 ${excluded.missingDate} 筆傳入資料缺少日期或日期格式錯誤，已從地端分析排除。`);
        if (excluded.ineffective > 0)
            warnings.push(`有 ${excluded.ineffective} 筆是「人員有效期間」以外的客服接聽：資料已保留，團隊的進線、接聽、漏接照算，只是不列入當期的個人排行與趨勢線。`);
        if (excluded.duplicateWithinUpload > 0)
            warnings.push(`有 ${duplicateGroups.length} 通電話在資料中出現不只一筆（共多出 ${excluded.duplicateWithinUpload} 筆），已合併為每通 1 筆計算。同一檔案內多筆通常是轉接；不同檔案之間代表檔案日期重疊。逐筆位置請看下方「重複紀錄明細」。`);
        const sortedDates = validDates.filter(Boolean).sort();
        // V42.6：資料中間完全沒有電話的日子（可能少匯出）
        const missingDates = window.V41Core.findMissingDates(sortedDates);
        if (missingDates.length) {
            const total = missingDates.reduce((n, g) => n + g.days, 0);
            const list = missingDates.slice(0, 8).map((g) => describeMissingDates(g).text).join("、");
            warnings.push(`資料期間內有 ${total} 天完全沒有電話：${list}${missingDates.length > 8 ? ` 等 ${missingDates.length} 段` : ""}。如果那幾天客服中心有上班，可能是少匯出了，請回 Genesys 補匯出。`);
        }
        return { sourceName, rawCount: rawRows.length, incomingCount: rawRows.length - excluded.notIncoming, validCount: validRows.length, previewCount: previewRowsForReport.length, excluded, dateRange: sortedDates.length ? `${formatCustomDate(sortedDates[0])}～${formatCustomDate(sortedDates[sortedDates.length - 1])}` : "-", missingDates, weekStats, monthStats, warnings, duplicateGroups, answeredNoLine };
    };
    const buildLocalMasterStore = useCallback((rows) => {
        const grouped = { weeks: {}, months: {}, years: {} };
        (rows || []).forEach((row) => {
            const monthKey = getCalendarMonthKey(row.date);
            const yearKey = getCalendarYearKey(row.date);
            if (row.weekKey) (grouped.weeks[row.weekKey] || (grouped.weeks[row.weekKey] = [])).push(row);
            if (monthKey) (grouped.months[monthKey] || (grouped.months[monthKey] = [])).push(row);
            if (yearKey) (grouped.years[yearKey] || (grouped.years[yearKey] = [])).push(row);
        });
        const weeks = {}, months = {}, years = {}, detailByWeek = {};
        Object.entries(grouped.weeks).forEach(([key, list]) => {
            const first = list[0] || {};
            weeks[key] = buildPeriodSummary(list, key, first.weekLabel || "", { year: first.yearKey, month: first.monthKey, weekStart: first.weekStart, weekEnd: first.weekEnd }, shiftRules, effectiveRules, "weeks");
            detailByWeek[key] = { rows: list };
        });
        Object.entries(grouped.months).forEach(([key, list]) => {
            months[key] = buildPeriodSummary(list, key, key, { year: key.slice(0, 4), month: key }, shiftRules, effectiveRules, "months");
        });
        Object.entries(grouped.years).forEach(([key, list]) => {
            years[key] = buildPeriodSummary(list, key, key, { year: key }, shiftRules, effectiveRules, "years");
        });
        return { rows: rows || [], weeks, months, years, detailByWeek };
    }, [buildPeriodSummary, shiftRules, effectiveRules]);
    // V42.2：班表自動沿用。使用者每個月都會建立班表；新的月份到了還沒建立時，先沿用最後一個已確認月份的名單，
    // 並在每一頁上方提醒去確認。還沒確認的月份，如果來源月份被修改，會跟著更新；按「確認無誤」或「儲存」後就固定下來。
    const latestDataMonth = useMemo(() => (cloudMasterStore.rows || []).reduce((m, r) => r.monthKey && r.monthKey > m ? r.monthKey : m, ""), [cloudMasterStore.rows]);
    useEffect(() => {
        // V42.5：計算搬到核心（planShiftAutoMonths），中間缺的月份也會補上並列為待確認。
        const isMonth = (k) => /^\d{4}-\d{2}$/.test(k);
        const target = [formatDateKey(new Date()).slice(0, 7), latestDataMonth].filter(isMonth).sort().pop();
        const plan = window.V41Core.planShiftAutoMonths(shiftRules, shiftAutoMonths, target);
        if (JSON.stringify(plan.auto) !== JSON.stringify(shiftAutoMonths)) saveShiftAutoMonths(plan.auto);
        if (JSON.stringify(plan.rules) !== JSON.stringify(shiftRules)) {
            setShiftRules(plan.rules);
            try { localStorage.setItem("weekly_call_project_shift_rules", JSON.stringify(plan.rules)); } catch (e) { }
            cloudSaveSetting("shift_rules", plan.rules);
            setSyncStatus("班表已自動沿用，請到班表設定確認");
        }
    }, [shiftRules, shiftAutoMonths, latestDataMonth]);
    const pendingShiftMonths = Object.keys(shiftAutoMonths).filter((m) => shiftRules[m]).sort();
    // V42.4：班表裡找不到的人。某位客服在某個月有接電話，但那個月的班表沒有他（那個月沒建立班表時看預設班表）。
    // 超過「人員有效期間」的人不列入（他們本來就不算在個人排行裡）。
    const missingFromShift = useMemo(() => window.V41Core.missingFromShiftTable(cloudMasterStore.rows || [], shiftRules, (name, row) => isAgentEffectiveForRow(name, row, effectiveRules)), [cloudMasterStore.rows, shiftRules, effectiveRules]);
    const missingPeopleCount = missingFromShift.reduce((n, m) => n + m.people.length, 0);
    const openShiftMonth = (month) => { setShiftEditorMonth(shiftRules[month] ? month : "default"); setActiveTab("shift"); };
    const fmtYm = (m) => `${m.slice(0, 4)} 年 ${Number(m.slice(5, 7))} 月`;
    // V42.5：每個待確認月份的來源說明，例如「（沿用 8 月）」「（沿用 8 月，8 月已刪除）」「（新增，還沒儲存）」
    const shiftSourceText = (m) => { const src = shiftAutoMonths[m]; if (!src) return "（新增，還沒儲存）"; const label = src.slice(0, 4) === m.slice(0, 4) ? `${Number(src.slice(5, 7))} 月` : fmtYm(src); return shiftRules[src] ? `（沿用 ${label}）` : `（沿用 ${label}，${label}已刪除）`; };
    // V42.0.1：班別只讀取班表設定；修改班表或人員有效期間後，自動重算已匯入資料。
    const rulesAppliedRef = useRef(false);
    useEffect(() => {
        if (!rulesAppliedRef.current) { rulesAppliedRef.current = true; return; }
        const current = cloudMasterStore.rows || [];
        if (!current.length) return;
        const refreshed = current.map((row) => row.agent ? { ...row, shift: getShiftInfoByMonth(row.agent, row.monthKey).shift } : row);
        setPreviewRows(refreshed);
        setCloudMasterStore(buildLocalMasterStore(refreshed));
    }, [shiftRules, effectiveRules]);
    // V42.8：登入狀態與雲端讀取
    useEffect(() => {
        if (!window.CloudStore) { setCloudUser(null); return; }
        return window.CloudStore.onAuth((user) => setCloudUser(user || null));
    }, []);
    useEffect(() => {
        cloudOnRef.current = false;
        setCloudReady(false);
        if (!cloudUser) return;
        let cancelled = false;
        (async () => {
            setCloudError("");
            setSyncStatus("正在從雲端讀取資料…");
            try {
                const cloud = await window.CloudStore.loadSettings();
                if (cancelled) return;
                const SETTING_KEYS = [
                    ["shift_rules", "weekly_call_project_shift_rules", setShiftRules, EMPTY_SHIFT_RULES],
                    ["effective_rules", "weekly_call_project_effective_rules", setEffectiveRules, EMPTY_EFFECTIVE_RULES],
                    ["events", "weekly_call_project_events", setEventList, EMPTY_EVENT_LIST],
                    ["shift_auto_months", SHIFT_AUTO_KEY, setShiftAutoMonths, {}],
                ];
                const values = {};
                if (!SETTING_KEYS.some(([k]) => cloud[k] != null)) {
                    // 第一次用雲端：問要不要把這台電腦的設定傳上去
                    const local = SETTING_KEYS.map(([k, lk]) => { try { return [k, JSON.parse(localStorage.getItem(lk) || "null")]; } catch (e) { return [k, null]; } }).filter(([, v]) => v != null);
                    if (local.length && window.confirm("雲端還沒有班表、人員有效期間等設定。\n要把這台電腦目前的設定傳到雲端嗎？\n\n按「確定」＝傳上去；按「取消」＝雲端從空白開始。")) {
                        for (const [k, v] of local) { await window.CloudStore.saveSetting(k, v); values[k] = v; }
                    }
                }
                else Object.assign(values, cloud);
                if (cancelled) return;
                SETTING_KEYS.forEach(([k, lk, set, empty]) => { const v = values[k] != null ? values[k] : empty; set(v); try { localStorage.setItem(lk, JSON.stringify(v)); } catch (e) { } });
                const calls = await window.CloudStore.loadCalls();
                if (cancelled) return;
                const rulesForRows = values.shift_rules || EMPTY_SHIFT_RULES;
                const rows = calls.rows.map((r) => { if (!r.agent) return { ...r, shift: "", shiftSource: "missed-call" }; const info = getShiftInfoFromRules(rulesForRows, r.agent, r.monthKey); return { ...r, shift: info.shift, shiftSource: info.source }; });
                const fileNames = calls.fileNames || [];
                const sourceName = fileNames.length > 1 ? `${fileNames[0]} 等 ${fileNames.length} 個檔案` : (fileNames[0] || (rows.length ? "雲端資料" : ""));
                setCsvFileName(sourceName);
                setLoadedFileNames(fileNames);
                setPreviewRows(rows);
                setCloudMasterStore(rows.length ? buildLocalMasterStore(rows) : EMPTY_CLOUD_STORE);
                setPreviewMeta(rows.length ? { mode: "multi_week", title: sourceName, weekKeys: Array.from(new Set(rows.map((r) => r.weekKey).filter(Boolean))).sort(), monthKeys: Array.from(new Set(rows.map((r) => r.monthKey).filter(Boolean))).sort(), yearKeys: Array.from(new Set(rows.map((r) => r.yearKey).filter(Boolean))).sort(), sourceCount: fileNames.length, recordCountBeforeDedupe: rows.length, recordCountAfterDedupe: rows.length } : EMPTY_PREVIEW_META);
                setValidationReport(null);
                cloudOnRef.current = true;
                setCloudReady(true);
                setSyncStatus(rows.length ? `已從雲端讀回 ${rows.length.toLocaleString()} 筆電話資料` : "已連上雲端（還沒有電話資料）");
                if (rows.length) setActiveTab("weekly");
            }
            catch (e) {
                console.error(e);
                if (!cancelled) setCloudError(window.CloudStore.errorText(e));
            }
        })();
        return () => { cancelled = true; };
    }, [cloudUser, cloudReloadTick]);
    // 電話資料存到雲端：一次只存一批，避免兩批同時寫入互相打架
    const saveCallsToCloud = (rows, fileNames) => {
        if (!cloudOnRef.current) return;
        cloudSavingRef.current += 1;
        setSyncStatus("正在把電話資料存到雲端…（先不要關掉網頁）");
        cloudQueueRef.current = cloudQueueRef.current.then(() => window.CloudStore.saveCalls(rows, fileNames))
            .then(() => setSyncStatus(`電話資料已存到雲端（共 ${rows.length.toLocaleString()} 筆）`))
            .catch((e) => { console.error(e); setSyncStatus("電話資料存到雲端失敗"); alert("電話資料存到雲端失敗：" + window.CloudStore.errorText(e) + "\n資料還在畫面上，可以重新匯入一次再試。"); })
            .finally(() => { cloudSavingRef.current -= 1; });
    };
    // V42.8.1：手動同步。把目前畫面上的資料與設定全部重新存一次，再去雲端查一次筆數給使用者看。
    const [manualSyncing, setManualSyncing] = useState(false);
    const syncNowToCloud = async () => {
        if (!cloudOnRef.current) return alert("還沒登入雲端，不能同步。");
        if (manualSyncing) return;
        // V42.8.2：雙重確認。先查雲端現在有幾筆，跟畫面上的比給使用者看。
        const screenRows = cloudMasterStore.rows || [];
        const screenMonths = new Set(screenRows.map((r) => r.monthKey).filter(Boolean)).size;
        let before = null;
        try { before = await window.CloudStore.cloudSummary(); }
        catch (e) { console.error(e); return alert("連不上雲端，沒有同步：" + window.CloudStore.errorText(e)); }
        const shrink = screenRows.length > 0 && screenRows.length < before.total;
        const first = window.confirm(`【第 1 次確認】要同步到雲端嗎？\n\n畫面上要存的資料：\n・電話資料 ${screenRows.length.toLocaleString()} 筆（${screenMonths} 個月）${screenRows.length ? "" : "（沒有電話資料，只存設定，雲端的電話資料不會動）"}\n・班表、人員有效期間、事件\n\n雲端現在有：電話資料 ${before.total.toLocaleString()} 筆（${before.months} 個月）${shrink ? `\n\n⚠ 注意：畫面上比雲端少 ${(before.total - screenRows.length).toLocaleString()} 筆，同步後雲端會變成跟畫面一樣（變少）。` : ""}\n\n同步後，雲端會變成跟畫面上一樣。`);
        if (!first) return setSyncStatus("已取消同步，雲端沒有變更");
        const second = window.confirm(`【第 2 次確認】最後確認：真的要同步嗎？\n\n按「確定」就開始同步；按「取消」什麼都不會改。`);
        if (!second) return setSyncStatus("已取消同步，雲端沒有變更");
        setManualSyncing(true);
        cloudSavingRef.current += 1;
        setSyncStatus("正在同步到雲端…（先不要關掉網頁）");
        try {
            await cloudQueueRef.current.catch(() => { }); // 先等自動儲存做完
            const rows = cloudMasterStore.rows || [];
            await Promise.all([
                window.CloudStore.saveSetting("shift_rules", shiftRules),
                window.CloudStore.saveSetting("effective_rules", effectiveRules),
                window.CloudStore.saveSetting("events", eventList),
                window.CloudStore.saveSetting("shift_auto_months", shiftAutoMonths),
            ]);
            // 畫面上沒有電話資料時不動雲端的電話資料（避免不小心清空）
            if (rows.length) await window.CloudStore.saveCalls(rows, loadedFileNames, true);
            const sum = await window.CloudStore.cloudSummary();
            const time = new Date().toLocaleString("zh-TW", { hour12: false });
            setSyncStatus(`已同步到雲端（${time}）`);
            const mismatch = rows.length && sum.total !== rows.length;
            alert(`${mismatch ? "⚠ 同步完成，但筆數對不起來" : "✅ 同步完成"}\n\n雲端現在有：\n・電話資料 ${sum.total.toLocaleString()} 筆（${sum.months} 個月）\n・班表、人員有效期間、事件：已存好\n\n畫面上的電話資料：${rows.length.toLocaleString()} 筆\n同步時間：${time}${mismatch ? "\n\n請截圖給 Claude 看。" : ""}`);
        }
        catch (e) {
            console.error(e);
            setSyncStatus("同步到雲端失敗");
            alert("同步到雲端失敗：" + window.CloudStore.errorText(e) + "\n資料還在畫面上，可以再按一次「同步到雲端」。");
        }
        finally {
            cloudSavingRef.current -= 1;
            setManualSyncing(false);
        }
    };
    const logoutCloud = () => {
        if (cloudSavingRef.current > 0) return alert("資料還在存到雲端，請等右上角顯示「已存到雲端」再登出。");
        if (!window.confirm("確定要登出嗎？\n登出後畫面上的資料會清掉，雲端的資料還在，下次登入會再讀回來。")) return;
        skipUnloadRef.current = true;
        window.CloudStore.signOut().finally(() => window.location.reload());
    };
    // V41：資料只存在這次開啟的頁面；有資料時，重新整理或關閉分頁前先提醒。
    // V42.8：已登入雲端、而且已經存好時不提醒；還在存的時候會提醒。
    useEffect(() => {
        const handler = (e) => { if (skipUnloadRef.current) return; if ((cloudMasterStore.rows || []).length && (!cloudOnRef.current || cloudSavingRef.current > 0)) { e.preventDefault(); e.returnValue = ""; } };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [cloudMasterStore]);
    // V42：選檔後只分析並顯示預覽；使用者確認「取代」或「追加」後才套用到目前資料。
    const handleDataUpload = async (input) => {
        const picked = Array.from(input && input.length != null ? input : [input]).filter(Boolean);
        if (!picked.length)
            return;
        const files = picked.filter(isSupportedUploadFile);
        const skippedNames = picked.filter((f) => !isSupportedUploadFile(f)).map((f) => f.name);
        if (!files.length)
            return alert(`不支援的檔案格式：${skippedNames.join("、")}。請上傳 csv / xlsx / xls。`);
        try {
            const raw = [], newRows = [], fileStats = [];
            for (const file of files) {
                try {
                    const fileRaw = await readSpreadsheetRows(file);
                    tagSourceLocation(fileRaw, file.name);
                    const hasDirection = tagDirectionColumn(fileRaw);
                    const fileRows = buildUploadRows(fileRaw);
                    const dates = fileRows.map((r) => r.date).filter(Boolean).sort();
                    raw.push(...fileRaw);
                    newRows.push(...fileRows);
                    fileStats.push({ name: file.name, rawCount: fileRaw.length, validCount: fileRows.length, hasDirection, dateRange: dates.length ? `${formatCustomDate(dates[0])}～${formatCustomDate(dates[dates.length - 1])}` : "-" });
                }
                catch (e) {
                    console.error(e);
                    fileStats.push({ name: file.name, error: "讀取失敗，請確認檔案格式" });
                }
            }
            skippedNames.forEach((name) => fileStats.push({ name, error: "不支援的檔案格式，已略過" }));
            if (!raw.length && fileStats.every((s) => s.error))
                return alert("所有檔案都讀取失敗，請確認格式是否為 csv / xlsx / xls。");
            const sortRows = (list) => list.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
            const newRowsMerged = sortRows(dedupeRows(newRows));
            const existingRows = cloudMasterStore.rows || [];
            const combinedRows = existingRows.length ? sortRows(dedupeRows([...existingRows, ...newRowsMerged])) : newRowsMerged;
            const overlapWithExisting = existingRows.length + newRowsMerged.length - combinedRows.length;
            const selectedFileNames = fileStats.filter((s) => !s.error).map((s) => s.name);
            const sourceName = selectedFileNames.length > 1 ? `${selectedFileNames[0]} 等 ${selectedFileNames.length} 個檔案` : (selectedFileNames[0] || "上傳資料");
            const report = { ...buildValidationReport(raw, newRowsMerged, newRowsMerged, sourceName), files: fileStats, appendedFrom: existingRows.length, overlapWithExisting };
            // V42.6：追加時，檢查舊資料和新資料合起來之後，中間有沒有空掉（只列新增的空檔）
            if (existingRows.length) {
                // 舊資料本來就缺的日子、這批本身缺的日子都不重複列，只列「合起來之後才多出來的空檔」
                const existingGaps = window.V41Core.findMissingDates(existingRows.map((r) => r.date));
                const batchGapKeys = new Set([...(report.missingDates || []), ...existingGaps].map((g) => `${g.start}|${g.end}`));
                report.appendMissingDates = window.V41Core.findMissingDates(combinedRows.map((r) => r.date)).filter((g) => !batchGapKeys.has(`${g.start}|${g.end}`));
            }
            setPendingImport({ raw, newRowsMerged, fileStats, selectedFileNames, sourceName, report, existingCount: existingRows.length, overlapWithExisting });
            setUploadMessage(`已完成 ${selectedFileNames.length} 個檔案的匯入前分析；資料尚未套用。`);
        }
        catch (e) {
            console.error(e);
            alert("檔案讀取失敗，請確認格式是否為 csv / xlsx / xls。");
        }
    };
    const applyPendingImport = (action) => {
        if (!pendingImport) return;
        const append = action === "append";
        const baseRows = append ? (cloudMasterStore.rows || []) : [];
        const sortRows = (list) => list.sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
        const rows = baseRows.length ? sortRows(dedupeRows([...baseRows, ...pendingImport.newRowsMerged])) : sortRows(pendingImport.newRowsMerged.slice());
        const fileNames = [...(append ? loadedFileNames : []), ...pendingImport.selectedFileNames];
        const sourceName = fileNames.length > 1 ? `${fileNames[0]} 等 ${fileNames.length} 個檔案` : (fileNames[0] || "上傳資料");
        const mode = "multi_week";
        setCsvFileName(sourceName);
        setLoadedFileNames(fileNames);
        setPreviewRows(rows);
        setCloudMasterStore(buildLocalMasterStore(rows));
        setPreviewMeta({ mode, title: sourceName, weekKeys: Array.from(new Set(rows.map((r) => r.weekKey).filter(Boolean))).sort(), monthKeys: Array.from(new Set(rows.map((r) => r.monthKey).filter(Boolean))).sort(), yearKeys: Array.from(new Set(rows.map((r) => r.yearKey).filter(Boolean))).sort(), sourceCount: fileNames.length, recordCountBeforeDedupe: baseRows.length + pendingImport.raw.length, recordCountAfterDedupe: rows.length });
        setValidationReport({ ...pendingImport.report, sourceName, previewCount: rows.length, files: pendingImport.fileStats, appendedFrom: baseRows.length, overlapWithExisting: append ? pendingImport.overlapWithExisting : 0 });
        const failCount = pendingImport.fileStats.filter((s) => s.error).length;
        setUploadMessage(`已${append ? "追加" : "取代"} ${pendingImport.selectedFileNames.length} 個檔案${failCount ? `（${failCount} 個失敗，請看驗證報告）` : ""}，目前共 ${rows.length.toLocaleString()} 筆有效資料${append && pendingImport.overlapWithExisting ? `；與原有資料重複 ${pendingImport.overlapWithExisting.toLocaleString()} 筆已合併` : ""}。`);
        setPendingImport(null);
        setActiveTab("weekly");
        saveCallsToCloud(rows, fileNames);
    };
    const buildSatisfactionAnalysisRows = (rows = []) => {
        const map = new Map();
        rows.forEach((r) => {
            if (!r.agent)
                return;
            if (!map.has(r.agent))
                map.set(r.agent, { "客服名稱": r.agent, "班別": r.shift || "", "總通話數": 0, "Q1非常滿意": 0, "Q1尚可": 0, "Q1非常不滿意": 0, "Q2非常滿意": 0, "Q2尚可": 0, "Q2非常不滿意": 0 });
            const t = map.get(r.agent);
            t["班別"] = t["班別"] || r.shift || "";
            t["總通話數"] += 1;
            if (r.q1 === "非常滿意")
                t["Q1非常滿意"] += 1;
            if (r.q1 === "尚可")
                t["Q1尚可"] += 1;
            if (r.q1 === "非常不滿意")
                t["Q1非常不滿意"] += 1;
            if (r.q2 === "非常滿意")
                t["Q2非常滿意"] += 1;
            if (r.q2 === "尚可")
                t["Q2尚可"] += 1;
            if (r.q2 === "非常不滿意")
                t["Q2非常不滿意"] += 1;
        });
        return Array.from(map.values()).sort((a, b) => a["客服名稱"].localeCompare(b["客服名稱"], "zh-Hant")).map((r) => {
            const q1Answered = r["Q1非常滿意"] + r["Q1尚可"] + r["Q1非常不滿意"];
            const q2Answered = r["Q2非常滿意"] + r["Q2尚可"] + r["Q2非常不滿意"];
            // V41：沒人回答的題目是 null（畫面顯示「—」、Excel 留空），不再當成 0%
            const q1VerySatRate = q1Answered ? r["Q1非常滿意"] / q1Answered : null, q2VerySatRate = q2Answered ? r["Q2非常滿意"] / q2Answered : null;
            const q1Sur = r["總通話數"] ? q1Answered / r["總通話數"] : 0, q2Sur = r["總通話數"] ? q2Answered / r["總通話數"] : 0;
            return { ...r, "人員非常滿意度(Q1)": q1VerySatRate, "人員調查率(Q1)": q1Sur, "問題非常滿意度(Q2)": q2VerySatRate, "問題調查率(Q2)": q2Sur };
        });
    };
    const exportRowsBundleToExcel = async (rows, filenamePrefix = "資料匯出") => {
        if (!rows.length)
            return alert("目前沒有資料可以匯出。");
        if (!window.XLSX)
            return alert("Excel 匯出模組尚未載入完成，請重新整理頁面後再試。");
        try {
            const workbook = window.XLSX.utils.book_new();
            const safeSheetName = (name) => String(name || "Sheet").replace(/[\\/?*\[\]:]/g, "").slice(0, 31) || "Sheet";
            const setWorksheetFormat = (sheet, rowCount, colCount, percentColumns = []) => {
                sheet["!cols"] = Array.from({ length: colCount }, () => ({ wch: 18 }));
                if (rowCount > 0 && colCount > 0) {
                    const range = window.XLSX.utils.encode_range({
                        s: { r: 0, c: 0 },
                        e: { r: rowCount - 1, c: colCount - 1 }
                    });
                    sheet["!autofilter"] = { ref: range };
                }

                const borderThin = {
                    top: { style: "thin", color: { rgb: "E2E8F0" } },
                    bottom: { style: "thin", color: { rgb: "E2E8F0" } },
                    left: { style: "thin", color: { rgb: "E2E8F0" } },
                    right: { style: "thin", color: { rgb: "E2E8F0" } }
                };
                const baseStyle = {
                    alignment: { horizontal: "center", vertical: "center" },
                    border: borderThin
                };
                const headerStyle = {
                    font: { bold: true, color: { rgb: "FFFFFF" } },
                    fill: { patternType: "solid", fgColor: { rgb: "0F172A" } },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: borderThin
                };
                const lightBlueRowStyle = {
                    fill: { patternType: "solid", fgColor: { rgb: "E0F2FE" } },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: borderThin
                };

                for (let r = 0; r < rowCount; r++) {
                    for (let c = 0; c < colCount; c++) {
                        const cellAddress = window.XLSX.utils.encode_cell({ r, c });
                        if (!sheet[cellAddress])
                            sheet[cellAddress] = { t: "s", v: "" };
                        const isHeader = r === 0;
                        const isEvenDataRow = r > 0 && r % 2 === 0;
                        sheet[cellAddress].s = isHeader ? headerStyle : (isEvenDataRow ? lightBlueRowStyle : baseStyle);
                    }
                }

                for (let r = 1; r < rowCount; r++) {
                    percentColumns.forEach((colNumber) => {
                        const cellAddress = window.XLSX.utils.encode_cell({ r, c: colNumber - 1 });
                        if (sheet[cellAddress]) {
                            sheet[cellAddress].t = "n";
                            sheet[cellAddress].z = "0.00%";
                        }
                    });
                }
            };
            const createSheet = (sheetName, headers, dataRows, percentColumns = []) => {
                const aoa = [headers, ...dataRows];
                const sheet = window.XLSX.utils.aoa_to_sheet(aoa);
                setWorksheetFormat(sheet, aoa.length, headers.length, percentColumns);
                window.XLSX.utils.book_append_sheet(workbook, sheet, safeSheetName(sheetName));
            };
            createSheet("客服通話明細表", ["客服名稱", "接聽狀態", "班別", "日期", "時間", "專線", "人員滿意(Q1)", "問題滿意(Q2)", "對話ID", "總發話時間", "總處理時間"], rows.map((r) => [r.agent || "", r.agent ? "已接聽" : "漏接", r.shift || "", formatCustomDate(r.date), r.time, r.line || "未分類", r.q1, r.q2, r.id, formatDurationClock(r.speakDuration), formatDurationClock(r.handleDuration)]));
            createSheet("總處理時間(小時)", SUMMARY_HEADERS.map(summaryLabel), buildSummaryRowsFromSource(rows, "handle").map((r) => SUMMARY_HEADERS.map((h) => ["客服名稱", "班別"].includes(h) ? (r[h] || "") : Number(formatToHours(r[h])))));
            createSheet("總發話時間(小時)", SUMMARY_HEADERS.map(summaryLabel), buildSummaryRowsFromSource(rows, "speak").map((r) => SUMMARY_HEADERS.map((h) => ["客服名稱", "班別"].includes(h) ? (r[h] || "") : Number(formatToHours(r[h])))));
            const analysisHeaders = ["客服名稱", "班別", "接聽數", "人員非常滿意度(Q1)", "人員調查率(Q1)", "問題非常滿意度(Q2)", "問題調查率(Q2)"];
            createSheet("滿意度分析", analysisHeaders, buildSatisfactionAnalysisRows(rows).map((r) => [r["客服名稱"], r["班別"], r["總通話數"], r["人員非常滿意度(Q1)"], r["人員調查率(Q1)"], r["問題非常滿意度(Q2)"], r["問題調查率(Q2)"]]), [4, 5, 6, 7]);
            const today = formatDateKey(new Date()).replace(/-/g, "");
            window.XLSX.writeFile(workbook, `${filenamePrefix}_${today}.xlsx`, { bookType: "xlsx", compression: true });
        }
        catch (err) {
            console.error("Excel 匯出失敗:", err);
            alert("匯出 Excel 時發生錯誤。");
        }
    };
    // ── Computed values ──────────────────────────────────────────────────────────
    const allYears = useMemo(() => Object.keys(cloudMasterStore.years || {}).sort(), [cloudMasterStore]);
    const allMonths = useMemo(() => Object.keys(cloudMasterStore.months || {}).sort(), [cloudMasterStore]);
    const allWeeks = useMemo(() => Object.keys(cloudMasterStore.weeks || {}).sort(), [cloudMasterStore]);
    const missingWeekKeys = useMemo(() => findMissingWeekKeys(allWeeks), [allWeeks]);
    // 目前這個 viewType 對應的「已選期間」不再是需要手動維護的狀態，而是每次都用
    // periodFilters（每個維度各自的篩選意圖）+ 目前實際可用的週/月/年清單當場算出來，
    // 資料更新後自然套用最新結果，切換週/月/年也不會互相污染。
    const activePeriod = useMemo(() => {
        const list = viewType === "years" ? allYears : viewType === "months" ? allMonths : allWeeks;
        const filterState = periodFilters[viewType] || DEFAULT_PERIOD_FILTERS[viewType];
        const range = resolvePeriodRange(viewType, filterState, list);
        const slice = sliceListByRange(list, range.from, range.to);
        return { list, range, slice };
    }, [viewType, periodFilters, allYears, allMonths, allWeeks]);
    // V41：重新匯入後，原本選的期間如果已不在資料裡，改回最新一期（避免明細查詢整頁空白）
    useEffect(() => { const list = detailMode === "weeks" ? allWeeks : detailMode === "months" ? allMonths : allYears; if (detailKey && list.length && !list.includes(detailKey)) setDetailKey(""); }, [detailMode, detailKey, allWeeks, allMonths, allYears]);
    useEffect(() => { if (!detailKey) {
        if (detailMode === "weeks" && allWeeks.length)
            setDetailKey(allWeeks[allWeeks.length - 1]);
        if (detailMode === "months" && allMonths.length)
            setDetailKey(allMonths[allMonths.length - 1]);
        if (detailMode === "years" && allYears.length)
            setDetailKey(allYears[allYears.length - 1]);
    } }, [detailMode, detailKey, allWeeks, allMonths, allYears]);
    const periodList = useMemo(() => {
        const sourceRows = cloudMasterStore.rows || [];
        if (!sourceRows.length)
            return [];
        if (!activePeriod.slice.length)
            return [];
        const filteredRows = sourceRows.filter((row) => {
            if (viewType === "weeks") {
                // 週模式只依 weekKey 過濾。不可再用 monthKey，避免 6/29～7/5 這種跨月週漏算 7 月資料。
                return activePeriod.slice.includes(row.weekKey);
            }
            if (viewType === "months") {
                // 月模式：依 date 的實際月份過濾，避免跨週資料被漏算。月份 key 本身已內含年份，不需另外比對年份。
                const calMonth = getCalendarMonthKey(row.date);
                return activePeriod.slice.includes(calMonth);
            }
            // 年模式：依 date 的實際年份過濾
            const calYear = getCalendarYearKey(row.date);
            return activePeriod.slice.includes(calYear);
        });
        const groups = {};
        filteredRows.forEach((row) => {
            let key = row.weekKey;
            if (viewType === "months")
                key = getCalendarMonthKey(row.date);
            if (viewType === "years")
                key = getCalendarYearKey(row.date);
            if (!key)
                return;
            if (!groups[key])
                groups[key] = [];
            groups[key].push(row);
        });
        return Object.keys(groups).sort().map((key) => {
            const rows = groups[key], first = rows[0] || {};
            if (viewType === "weeks")
                return buildPeriodSummary(rows, key, first.weekLabel || "", { year: first.yearKey, month: first.monthKey, weekStart: first.weekStart, weekEnd: first.weekEnd }, shiftRules, effectiveRules, "weeks");
            if (viewType === "months")
                return buildPeriodSummary(rows, key, key, { year: getCalendarYearKey(first.date), month: key }, shiftRules, effectiveRules, "months");
            return buildPeriodSummary(rows, key, key, { year: key }, shiftRules, effectiveRules, "years");
        });
    }, [cloudMasterStore.rows, viewType, activePeriod, buildPeriodSummary, shiftRules, effectiveRules]);
    const availableAgents = useMemo(() => {
        const set = new Set();
        if (includeHistoryAgents) {
            (cloudMasterStore.rows || []).forEach((r) => { if (r.agent)
                set.add(r.agent); });
            // V41：只列資料裡真的有接過電話的人，不再從規則帶入沒有資料的名字
        }
        else {
            const latestPeriod = viewType === "years" ? allYears[allYears.length - 1] : viewType === "months" ? allMonths[allMonths.length - 1] : allWeeks[allWeeks.length - 1];
            (cloudMasterStore.rows || []).forEach((r) => { if (r.agent && isAgentEffectiveForPeriod(r.agent, latestPeriod || r.weekKey || r.monthKey || r.yearKey, viewType, effectiveRules))
                set.add(r.agent); });
       }
        return Array.from(set).sort((a, b) => a.localeCompare(b, "zh-Hant"));
    }, [cloudMasterStore, getAllAgentsFromRules, includeHistoryAgents, effectiveRules, viewType, allYears, allMonths, allWeeks]);
    useEffect(() => {
        const newlyAppeared = availableAgents.filter((name) => !knownTrendAgentsRef.current.has(name));
        availableAgents.forEach((name) => knownTrendAgentsRef.current.add(name));
        if (newlyAppeared.length)
            setSelectedTrendAgents((prev) => Array.from(new Set([...prev, ...newlyAppeared])));
    }, [availableAgents]);
    const detailRows = useMemo(() => {
        var _a, _b;
        let rows = [];
        if (detailMode === "weeks")
            rows = ((_b = (_a = cloudMasterStore.detailByWeek) === null || _a === void 0 ? void 0 : _a[detailKey]) === null || _b === void 0 ? void 0 : _b.rows) || [];
        else if (detailMode === "months") {
            const expected = getMonthExpectedRange(detailKey);
            rows = (cloudMasterStore.rows || []).filter((r) => { const d = String(r.date || "").replace(/\//g, "-"); return d >= expected.start && d <= expected.end; });
        }
        else
            rows = (cloudMasterStore.rows || []).filter((r) => r.yearKey === detailKey);
        return rows.slice().sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
    }, [cloudMasterStore, detailMode, detailKey]);
    const previewSummary = useMemo(() => summarizePreviewRows(previewRows), [previewRows]);
    const detailSummary = useMemo(() => summarizePreviewRows(detailRows), [detailRows]);
    const previewAnalysisRows = useMemo(() => buildSatisfactionAnalysisRows(previewRows), [previewRows]);
    const previewPaging = useMemo(() => paginateRows(previewRows, previewPage, previewPageSize), [previewRows, previewPage, previewPageSize]);
    const detailPaging = useMemo(() => paginateRows(detailRows, detailPage, detailPageSize), [detailRows, detailPage, detailPageSize]);
    useEffect(() => setPreviewPage(1), [previewRows]);
    useEffect(() => setDetailPage(1), [detailRows]);
    const shiftMonthKeys = useMemo(() => ["default", ...Object.keys(shiftRules).filter((k) => k !== "default").sort()], [shiftRules]);
    const addShiftMonth = async () => { const normalized = normalizeMonthKey(shiftMonthInput); if (!normalized)
        return alert("請輸入正確格式，例如 2026-04"); if (shiftRules[normalized]) { setShiftEditorMonth(normalized); setShiftMonthInput(""); return; }
        // V42.5：新增的月份先帶入它之前最近一個月的名單，列為待確認；按「儲存」或「確認無誤」才算確認。
        const prev = Object.keys(shiftRules).filter((k) => /^\d{4}-\d{2}$/.test(k) && k < normalized).sort().pop();
        const base = prev ? shiftRules[prev] : {};
        const next = { ...shiftRules, [normalized]: { "早班": [...(base["早班"] || [])], "中班": [...(base["中班"] || [])], "晚班": [...(base["晚班"] || [])] } };
        saveShiftAutoMonths({ ...shiftAutoMonths, [normalized]: prev || "" }); await saveShiftRules(next); setShiftEditorMonth(normalized); setShiftMonthInput(""); };
    const saveCurrentShiftMonth = async () => { const target = shiftEditorMonth || "default"; const next = { ...shiftRules, [target]: { "早班": parseNameList(shiftDraft["早班"]), "中班": parseNameList(shiftDraft["中班"]), "晚班": parseNameList(shiftDraft["晚班"]) } }; markShiftMonthConfirmed(target); await saveShiftRules(next); alert("班表已儲存"); };
    const deleteShiftMonth = async (monthKey) => { if (monthKey === "default")
        return alert("預設班表不可刪除"); if (!window.confirm(`確定刪除 ${monthKey} 的班表設定嗎？`))
        return; const next = { ...shiftRules }; delete next[monthKey]; markShiftMonthConfirmed(monthKey); await saveShiftRules(next); setShiftEditorMonth("default"); };
    // V42.2：名單沒問題時，按「確認無誤」就算確認（不改名單）
    const confirmShiftMonth = (monthKey) => { markShiftMonthConfirmed(monthKey); setSyncStatus(`${fmtYm(monthKey)}班表已確認`); };
    const addEffectiveRule = async () => {
        const name = effectiveDraft.name.trim();
        if (!name)
            return alert("請輸入客服名稱");
        const rawStart = effectiveDraft.start.trim();
        const rawEnd = effectiveDraft.end.trim();
        const start = normalizePeriodKeyInput(rawStart);
        const end = normalizePeriodKeyInput(rawEnd);
        if (rawStart && start == null)
            return alert(`「起始」欄位看不懂這個格式：${rawStart}\n請用 2025-W09（週）、2025-11（月）或 2025（年）這種格式。`);
        if (rawEnd && end == null)
            return alert(`「結束」欄位看不懂這個格式：${rawEnd}\n請用 2025-W35（週）、2025-11（月）或 2025（年）這種格式。`);
        if (start && end) {
            const startRange = keyToDateRange(start);
            const endRange = keyToDateRange(end);
            if (startRange && endRange && startRange.start > endRange.end)
                return alert(`「起始」（${start}）比「結束」（${end}）還晚，請檢查一下順序。`);
        }
        const next = { ...effectiveRules, [name]: { start: start || "", end: end || "", note: effectiveDraft.note.trim() } };
        await saveEffectiveRules(next);
        setEffectiveDraft({ name: "", start: "", end: "", note: "" });
        alert("人員有效期間已儲存");
    };
    const editEffectiveRule = (name, rule) => setEffectiveDraft({ name, start: rule.start || "", end: rule.end || "", note: rule.note || "" });
    const deleteEffectiveRule = async (name) => { if (!window.confirm(`確定刪除「${name}」的人員有效期間設定嗎？`))
        return; const next = { ...effectiveRules }; delete next[name]; await saveEffectiveRules(next); };
    // ── Main render ──────────────────────────────────────────────────────────────
    const tabGroups = [
        { label: "總覽", items: [
            { id: "dashboard", name: "AI 儀表板", icon: "chart" },
        ] },
        { label: "資料處理", items: [
            { id: "upload", name: "地端資料匯入", icon: "upload" },
        ] },
        { label: "報表分析", items: [
            { id: "missed", name: "漏接率分析", icon: "chart" },
            { id: "scorecard", name: "客服成績單", icon: "users" },
            { id: "shiftHistory", name: "人員班別歷程", icon: "users" },
            { id: "heatmap", name: "星期 × 時段熱力圖", icon: "chart" },
            { id: "alerts", name: "統計警示", icon: "chart" },
            ...(FEATURE_FORECAST ? [{ id: "forecast", name: "來電量與人力預測", icon: "chart" }] : []),
            { id: "weekly", name: "本次匯入預覽", icon: "search" },
            { id: "history", name: "歷史總覽", icon: "history" },
            { id: "trend", name: "趨勢分析", icon: "chart" },
            { id: "detail", name: "明細查詢", icon: "list" },
        ] },
        { label: "系統設定", items: [
            { id: "thresholds", name: "門檻與目標設定", icon: "list" },
            { id: "shift", name: "班表設定", icon: "users" },
        ] },
    ];
    const pageStyle = { minHeight: "100vh", background: "var(--bg)", fontFamily: "'Inter','PingFang TC','Microsoft JhengHei',sans-serif" };
    const topbarStyle = { background: "var(--surface)", borderBottom: "0.5px solid var(--line)", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "60px", position: "sticky", top: 0, zIndex: 50 };
    const sideTabStyle = (active) => ({ display: "flex", alignItems: "center", gap: "9px", padding: "9px 14px", borderRadius: "var(--radius-sm)", fontSize: "13px", fontWeight: active ? "600" : "500", color: active ? "var(--brand-dark)" : "var(--ink-500)", background: active ? "var(--brand-soft)" : "transparent", cursor: "pointer", border: "none", fontFamily: "inherit", width: "100%", textAlign: "left", transition: "all .12s" });
    const sideGroupLabelStyle = { fontSize: "10.5px", fontWeight: "700", color: "var(--ink-400)", letterSpacing: ".06em", textTransform: "uppercase", padding: "14px 14px 6px" };
    const mainStyle = { display: "grid", gridTemplateColumns: "224px 1fr", minHeight: "calc(100vh - 60px)" };
    const sideStyle = { background: "var(--surface)", borderRight: "0.5px solid var(--line)", padding: "10px 8px 16px", display: "flex", flexDirection: "column" };
    const contentStyle = { padding: "24px 28px", display: "flex", flexDirection: "column", gap: "16px", overflow: "auto" };
    const PageHeader = ({ title, subtitle, actions }) => (React.createElement("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "4px" } },
        React.createElement("div", null,
            React.createElement("h2", { style: { fontSize: "18px", fontWeight: "700", color: "#0f172a", margin: 0 } }, title),
            subtitle && React.createElement("p", { style: { fontSize: "12px", color: "#94a3b8", marginTop: "4px" } }, subtitle)),
        actions && React.createElement("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } }, actions)));
    // V42.8：還沒登入先顯示登入畫面；登入後等雲端資料讀完再進入系統
    const centerBox = (children) => React.createElement("div", { style: { ...pageStyle, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" } }, React.createElement("div", { style: { background: "#fff", border: "0.5px solid #e2e8f0", borderRadius: "14px", padding: "24px 28px", maxWidth: "420px", width: "100%", display: "flex", flexDirection: "column", gap: "12px", color: "#334155", fontSize: "14px", lineHeight: 1.7 } }, children));
    if (cloudUser === undefined && !localOnly) return centerBox("正在確認登入狀態…");
    if (!cloudUser && !localOnly) return React.createElement(LoginScreen, { onLocal: () => setLocalOnly(true) });
    if (cloudUser && !cloudReady) return centerBox(cloudError ? [
        React.createElement("div", { key: "t", style: { fontWeight: "700", color: "#b91c1c" } }, "讀取雲端資料失敗"),
        React.createElement("div", { key: "m" }, cloudError),
        React.createElement("div", { key: "b", style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
            React.createElement("button", { type: "button", onClick: () => setCloudReloadTick((n) => n + 1), style: CRM.btnPrimary }, "再試一次"),
            React.createElement("button", { type: "button", onClick: () => { skipUnloadRef.current = true; window.CloudStore.signOut().finally(() => window.location.reload()); }, style: CRM.btnSecondary || CRM.btnPrimary }, "登出"))
    ] : `正在從雲端讀取資料…（${cloudUser.email}）`);
    return (React.createElement("div", { style: pageStyle },
        pendingImport && React.createElement(ImportPreviewDialog, { preview: pendingImport, onConfirm: applyPendingImport, onCancel: () => { setPendingImport(null); setUploadMessage("已取消，資料沒有變更。"); } }),
        React.createElement("div", { className: "app-topbar", style: topbarStyle },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "12px" } },
                React.createElement("button", { type: "button", className: "mobile-menu-btn", onClick: () => setMobileMenuOpen((v) => !v), "aria-label": "切換選單", style: { width: "30px", height: "30px", alignItems: "center", justifyContent: "center", border: "0.5px solid #e2e8f0", borderRadius: "7px", background: "#fff", cursor: "pointer" } }, "☰"),
                React.createElement("div", { style: { width: "30px", height: "30px", borderRadius: "var(--radius-sm)", background: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center" } },
                    React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "#fff", strokeWidth: "2", "aria-hidden": "true" },
                        React.createElement("path", { d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" }))),
                React.createElement("span", { style: { fontSize: "14px", fontWeight: "700", color: "var(--ink-900)" } }, "\u5BA2\u670D\u96FB\u8A71\u7D00\u9304\u9577\u671F\u89C0\u5BDF\u7CFB\u7D71"),
                React.createElement("span", { style: { fontSize: "10px", fontWeight: "700", color: "#1d4ed8", background: "#eff6ff", border: "0.5px solid #bfdbfe", borderRadius: "999px", padding: "2px 7px" } }, APP_VERSION)),
            React.createElement("div", { className: "app-topbar-actions", style: { display: "flex", alignItems: "center", gap: "10px" } },
                React.createElement("span", { className: "app-syncstatus", style: { fontSize: "11px", color: "#94a3b8" } }, syncStatus),
                cloudUser
                    ? React.createElement("span", { style: { display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#475569" } },
                        React.createElement("span", { title: "已登入雲端", style: { color: "#15803d", fontWeight: "700" } }, `☁ ${cloudUser.email}`),
                        React.createElement("button", { type: "button", onClick: syncNowToCloud, disabled: manualSyncing, title: "把目前的電話資料、班表、人員有效期間、事件全部重新存到雲端", style: { border: "0.5px solid #86efac", background: "#f0fdf4", color: "#15803d", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", fontWeight: "700", cursor: manualSyncing ? "wait" : "pointer", fontFamily: "inherit" } }, manualSyncing ? "同步中…" : "⟳ 同步到雲端"),
                        React.createElement("button", { type: "button", onClick: logoutCloud, style: { border: "0.5px solid var(--line)", background: "var(--surface)", color: "var(--ink-500)", borderRadius: "6px", padding: "4px 8px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" } }, "登出"))
                    : React.createElement("button", { type: "button", onClick: () => setLocalOnly(false), title: "目前資料只在這台電腦", style: { border: "0.5px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", borderRadius: "6px", padding: "4px 8px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" } }, "本機模式｜登入雲端"),
                React.createElement("button", { "data-eyecare-btn": "true", "data-eyecare-idle-color": "var(--ink-500)", ref: (el) => el && window.__eyecareSyncButton && window.__eyecareSyncButton(el), type: "button", title: "\u8B77\u773C\u6A21\u5F0F", "aria-label": "\u8B77\u773C\u6A21\u5F0F\u5207\u63DB", style: { width: "32px", height: "32px", borderRadius: "7px", border: "0.5px solid var(--line)", background: "var(--surface)", color: "var(--ink-500)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" } },
                    React.createElement("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
                        React.createElement("path", { d: "M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" }),
                        React.createElement("circle", { cx: "12", cy: "12", r: "3" }))))),
        React.createElement("div", { className: "app-main", style: mainStyle },
            React.createElement("div", { className: `app-sidebar${mobileMenuOpen ? "" : " mobile-hidden"}`, style: sideStyle },
                React.createElement("div", { style: { flex: 1, display: "flex", flexDirection: "column", gap: "2px" } },
                    React.createElement("div", { style: { display: "flex", gap: "6px", padding: "4px 8px 0" } },
                        [["open", "全部展開"], ["closed", "全部收合"]].map(([mode, label]) => React.createElement("button", { key: mode, type: "button", onClick: () => updateCollapsedGroups(mode === "open" ? {} : Object.fromEntries(tabGroups.map((g) => [g.label, true]))), style: { flex: 1, border: "0.5px solid var(--line)", background: "var(--surface)", color: "var(--ink-500)", borderRadius: "6px", padding: "4px 6px", fontSize: "11px", cursor: "pointer", fontFamily: "inherit" } }, label))),
                    tabGroups.map(g => {
                        const collapsed = !!collapsedGroups[g.label];
                        // 收合的分組仍顯示目前所在的頁面，避免找不到自己在哪一頁。
                        const visibleItems = collapsed ? g.items.filter((t) => t.id === activeTab) : g.items;
                        return React.createElement(React.Fragment, { key: g.label },
                            React.createElement("button", { type: "button", onClick: () => updateCollapsedGroups({ ...collapsedGroups, [g.label]: !collapsed }), "aria-expanded": !collapsed, style: { ...sideGroupLabelStyle, display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit" } },
                                React.createElement("span", null, g.label),
                                React.createElement("span", { style: { fontSize: "10px", letterSpacing: 0 } }, collapsed ? `▸ ${g.items.length}` : "▾")),
                            visibleItems.map(t => (React.createElement("button", { key: t.id, className: "app-sidebar-btn", onClick: () => { setActiveTab(t.id); setMobileMenuOpen(false); }, style: sideTabStyle(activeTab === t.id) },
                                React.createElement(Icon, { name: t.icon, size: 15 }),
                                t.name))));
                    })),
                React.createElement("div", { style: { marginTop: "12px", padding: "12px 8px 0", borderTop: "0.5px solid var(--line-soft)" } },
                    React.createElement("div", { style: sideGroupLabelStyle }, "\u8CC7\u6599\u6982\u6CC1"),
                    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", padding: "0 6px" } }, [
                        { l: "已匯入年份", v: allYears.length },
                        { l: "已匯入月份", v: allMonths.length },
                        { l: "已匯入週數", v: allWeeks.length },
                        { l: "本次匯入筆數", v: previewRows.length },
                    ].map(s => (React.createElement("div", { key: s.l, style: { background: "var(--bg)", borderRadius: "var(--radius-sm)", padding: "8px 10px" } },
                        React.createElement("div", { style: { fontSize: "10px", color: "var(--ink-400)", fontWeight: "600", letterSpacing: ".04em", textTransform: "uppercase" } }, s.l),
                        React.createElement("div", { style: { fontSize: "17px", fontWeight: "700", color: "var(--ink-900)", lineHeight: 1.2, marginTop: "3px" } }, s.v))))),
                    uploadMessage && React.createElement("div", { style: { margin: "8px 6px 0", padding: "8px 10px", background: "#f0fdf4", border: "0.5px solid #bbf7d0", borderRadius: "var(--radius-sm)", fontSize: "11px", color: "#15803d", lineHeight: "1.5" } }, uploadMessage))),
            React.createElement("div", { style: contentStyle },
                pendingShiftMonths.length > 0 && React.createElement("div", { role: "alert", style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "10px", padding: "10px 14px", color: "#92400e", fontSize: "13px", lineHeight: 1.6 } },
                    React.createElement("span", null, "⚠ 班表提醒：以下月份的班表還沒確認——", pendingShiftMonths.map((m, i) => React.createElement("span", { key: m }, i ? "、" : "", React.createElement("b", null, fmtYm(m)), shiftSourceText(m))), "。請確認人員和班別是否正確。"),
                    activeTab !== "shift" && React.createElement("button", { type: "button", onClick: () => { setShiftEditorMonth(pendingShiftMonths[0]); setActiveTab("shift"); }, style: { ...CRM.btnPrimary, padding: "5px 14px", fontSize: "12px", background: "#d97706", borderColor: "#d97706" } }, "去確認班表")),
                missingFromShift.length > 0 && React.createElement("div", { role: "alert", style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", background: "#fff7ed", border: "1px solid #fdba74", borderRadius: "10px", padding: "10px 14px", color: "#9a3412", fontSize: "13px", lineHeight: 1.6 } },
                    React.createElement("span", null, "⚠ 班表裡找不到的人：",
                        missingFromShift.slice(0, 3).map((m, i) => React.createElement("span", { key: m.month }, i ? "；" : "", React.createElement("b", null, fmtYm(m.month)), "：", m.people.slice(0, 4).map((p) => p.name).join("、"), m.people.length > 4 ? ` 等 ${m.people.length} 人` : "")),
                        missingFromShift.length > 3 ? `；還有 ${missingFromShift.length - 3} 個月份` : "",
                        "。這些人有接電話，但不在那個月的班表裡，班別會是空白，請到班表設定補上。"),
                    activeTab !== "shift" && React.createElement("button", { type: "button", onClick: () => openShiftMonth(missingFromShift[0].month), style: { ...CRM.btnPrimary, padding: "5px 14px", fontSize: "12px", background: "#ea580c", borderColor: "#ea580c" } }, "去班表設定")),
                ((tabGroups.find((g) => g.label === "報表分析") || { items: [] }).items.some((t) => t.id === activeTab)) && React.createElement(CollapseAllBar, { key: `collapse-bar-${activeTab}` }),
                activeTab === "dashboard" && React.createElement(DashboardHomeV38, { cloudMasterStore: cloudMasterStore, eventList: eventList, onNavigate: setActiveTab, missingWeekKeys: missingWeekKeys, settings: analysisSettings, addEvent: addEvent, deleteEvent: deleteEvent, validationReport: validationReport }),
                activeTab === "missed" && React.createElement(MissedCallPanel, { rows: cloudMasterStore.rows || [], sourceLabel: "目前匯入的地端資料", settings: analysisSettings }),
                activeTab === "scorecard" && React.createElement(AgentScorecardPanel, { rows: cloudMasterStore.rows || [], settings: analysisSettings, effectiveRules: effectiveRules }),
                activeTab === "shiftHistory" && React.createElement(ShiftHistoryPanel, { rows: cloudMasterStore.rows || [], shiftRules: shiftRules, getShiftInfo: getShiftInfoByMonth, isPendingMonth: isShiftPending, settings: analysisSettings, effectiveRules: effectiveRules, onOpenShiftMonth: (m) => { setShiftEditorMonth(shiftRules[m] ? m : "default"); setActiveTab("shift"); } }),
                activeTab === "heatmap" && React.createElement(HeatmapPanel, { rows: cloudMasterStore.rows || [] }),
                activeTab === "alerts" && React.createElement(StatAlertsPanel, { rows: cloudMasterStore.rows || [], settings: analysisSettings }),
                FEATURE_FORECAST && activeTab === "forecast" && React.createElement(ForecastPanel, { rows: cloudMasterStore.rows || [], settings: analysisSettings }),
                activeTab === "thresholds" && React.createElement(AnalysisSettingsPanel, { settings: analysisSettings, onSave: saveAnalysisSettings }),
                activeTab === "upload" && (React.createElement(React.Fragment, null,
                    React.createElement(PageHeader, { title: "地端資料匯入", subtitle: "支援 CSV / XLSX / XLS；資料只在這台電腦的瀏覽器中分析，不會上傳；重新整理頁面後需要重新匯入" }),
                    React.createElement("div", { className: "rwd-split", style: { display: "grid", gridTemplateColumns: "240px 1fr", gap: "16px", alignItems: "start" } },
                        React.createElement("div", { style: { ...CRM.cardLg, overflow: "hidden" } },
                            React.createElement("div", { style: CRM.hdr },
                                React.createElement("span", { style: CRM.title }, "\u4E0A\u50B3\u8A2D\u5B9A")),
                            React.createElement("div", { style: { padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" } },
                                React.createElement("div", { style: { fontSize: "12px", color: "#334155", lineHeight: "1.7", background: "#eff6ff", borderRadius: "7px", padding: "10px 12px" } },
                                    React.createElement("b", null, "匯入前會先預覽"), React.createElement("br"),
                                    (cloudMasterStore.rows || []).length ? `目前已有 ${(cloudMasterStore.rows || []).length.toLocaleString()} 筆（${loadedFileNames.length} 個檔案）；分析完成後再選擇「追加」或「取代」。` : "目前沒有資料；分析完成後確認才會正式套用。"),
                                React.createElement("div", { style: { fontSize: "12px", color: "#64748b", lineHeight: "1.7", background: "#f8fafc", borderRadius: "7px", padding: "10px 12px" } },
                                    React.createElement("div", { style: { fontWeight: "600", color: "#475569", marginBottom: "4px" } }, "\u8AAA\u660E"),
                                    "匯入的電話全部保留；「人員有效期間」以外的客服，只是不列入當期的個人排行與趨勢線。", React.createElement("br"), "\u53EF\u4E00\u6B21\u9078\u53D6\u6216\u62D6\u66F3\u591A\u500B\u6A94\u6848\uFF0C\u6709\u7121\u300C\u521D\u59CB\u65B9\u5411\u300D\u6B04\u4F4D\u7684\u6A94\u6848\u53EF\u4EE5\u6DF7\u8457\u4E0A\u50B3\uFF1B\u540C\u4E00\u5C0D\u8A71 ID \u51FA\u73FE\u5728\u591A\u500B\u6A94\u6848\u6642\u53EA\u7B97\u4E00\u6B21\u3002"))),
                        React.createElement("div", { onDragOver: e => { e.preventDefault(); e.stopPropagation(); }, onDragEnter: e => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, onDragLeave: e => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, onDrop: e => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); const list = Array.from(e.dataTransfer.files || []); if (list.length)
                                handleDataUpload(list); }, style: { borderRadius: "12px", border: `2px dashed ${isDragging ? "#2563eb" : "#e2e8f0"}`, background: isDragging ? "#eff6ff" : "#fafafa", padding: "48px 24px", textAlign: "center", cursor: "pointer", transition: "all .2s" } },
                            React.createElement("div", { style: { fontSize: "32px", marginBottom: "12px", opacity: .4 } }, "\u2B06"),
                            React.createElement("div", { style: { fontSize: "15px", fontWeight: "600", color: "#475569", marginBottom: "6px" } }, "\u62D6\u66F3\u4E00\u500B\u6216\u591A\u500B\u6A94\u6848\u5230\u6B64\u5340\u57DF"),
                            React.createElement("div", { style: { fontSize: "12px", color: "#94a3b8", marginBottom: "20px" } }, "\u6216\u9EDE\u9078\u6309\u9215\u9078\u64C7\u6A94\u6848\uFF08\u53EF\u591A\u9078\uFF09\uFF0C\u652F\u63F4 CSV / XLSX / XLS"),
                            React.createElement("button", { onClick: () => { var _a; return (_a = fileInputRef.current) === null || _a === void 0 ? void 0 : _a.click(); }, style: CRM.btnPrimary }, "\u9078\u64C7\u6A94\u6848"),
                            React.createElement("input", { ref: fileInputRef, type: "file", multiple: true, accept: ".csv,.xlsx,.xls", style: { display: "none" }, onChange: e => { const list = Array.from(e.target.files || []); if (list.length)
                                    handleDataUpload(list); e.target.value = ""; } }))))),
                activeTab === "weekly" && (React.createElement(React.Fragment, null,
                    React.createElement(PageHeader, { title: "本次匯入預覽", subtitle: `${csvFileName || "尚未匯入"}　共 ${previewRows.length} 筆　期間：${previewMeta.weekKeys.length ? (previewMeta.weekKeys.length === 1 ? formatWeekKeyZh(previewMeta.weekKeys[0]) : `${formatWeekKeyZh(previewMeta.weekKeys[0])} ～ ${formatWeekKeyZh(previewMeta.weekKeys[previewMeta.weekKeys.length - 1])}（共 ${previewMeta.weekKeys.length} 週）`) : "—"}`, actions: [
                            React.createElement("button", { key: "export", onClick: () => exportRowsBundleToExcel(previewRows, "本次匯入預覽"), style: CRM.btnPrimary },
                                React.createElement("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", style: { verticalAlign: "-2px", marginRight: "5px" } },
                                    React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
                                    React.createElement("path", { d: "M7 10l5 5 5-5" }),
                                    React.createElement("path", { d: "M12 15V3" })),
                                "\u532F\u51FA Excel")
                        ] }),
                    React.createElement(CrmValidationPanel, { report: validationReport }),
                    React.createElement(CollapsibleCard, { style: { ...CRM.cardLg, overflow: "hidden" } },
                        React.createElement("div", { style: CRM.hdr },
                            React.createElement("span", { style: CRM.title }, "\u901A\u8A71\u660E\u7D30"),
                            React.createElement("span", { style: CRM.badge("#f8fafc", "#64748b") },
                                previewRows.length,
                                " \u7B46")),
                        React.createElement(CrmTableRows, { rows: previewPaging.rows, start: previewPaging.start }),
                        React.createElement(CrmPagination, { total: previewRows.length, page: previewPage, pageSize: previewPageSize, onPageChange: setPreviewPage, onPageSizeChange: setPreviewPageSize })),
                    React.createElement(CrmSummaryTable, { title: "電話接聽時數 — 總處理時間（小時）", rows: previewSummary.handleRows }),
                    React.createElement(CrmSummaryTable, { title: "電話接聽時數 — 總發話時間（小時）", rows: previewSummary.speakRows }),
                    React.createElement(CrmAnalysisTable, { rows: previewAnalysisRows, targets: analysisSettings.targets }))),
                activeTab === "history" && (React.createElement(React.Fragment, null,
                    React.createElement(PageHeader, { title: "歷史總覽", subtitle: "團隊每一週／月／年的進線、漏接、滿意度與發話時數；月報可直接和去年同月比較" }),
                    React.createElement(PeriodFilterPanel, { viewType: viewType, setViewType: setViewType, list: activePeriod.list, filterState: periodFilters[viewType], range: activePeriod.range, selectedCount: activePeriod.slice.length, onPickShortcut: handlePeriodShortcut, onPickCustomRange: handlePeriodCustomRange }),
                    React.createElement(CrmHistoryTable, { rows: cloudMasterStore.rows || [], slice: activePeriod.slice, viewType: viewType, targets: analysisSettings.targets }))),
                activeTab === "trend" && (React.createElement(React.Fragment, null,
                    React.createElement(PageHeader, { title: "\u8DA8\u52E2\u5206\u6790", subtitle: "\u591A\u4EBA\u6307\u6A19\u6BD4\u5C0D\u3001\u671F\u9593\u5FEB\u901F\u7BE9\u9078\u3001\u6392\u540D\u8207\u660E\u7D30" }),
                    React.createElement(PeriodFilterPanel, { viewType: viewType, setViewType: setViewType, list: activePeriod.list, filterState: periodFilters[viewType], range: activePeriod.range, selectedCount: activePeriod.slice.length, onPickShortcut: handlePeriodShortcut, onPickCustomRange: handlePeriodCustomRange }),
                    React.createElement(TrendPanel, { periodList: periodList, viewType: viewType, availableAgents: availableAgents, effectiveRules: effectiveRules, includeHistoryAgents: includeHistoryAgents, setIncludeHistoryAgents: setIncludeHistoryAgents, selectedTrendAgents: selectedTrendAgents, setSelectedTrendAgents: setSelectedTrendAgents, selectedMetric: selectedMetric, setSelectedMetric: setSelectedMetric, eventList: eventList, addEvent: addEvent, deleteEvent: deleteEvent, targets: analysisSettings.targets }))),
                activeTab === "detail" && (React.createElement(React.Fragment, null,
                    React.createElement(PageHeader, { title: "\u660E\u7D30\u67E5\u8A62", subtitle: `共 ${detailRows.length} 筆`, actions: [
                            React.createElement("select", { key: "mode", value: detailMode, onChange: e => { setDetailMode(e.target.value); setDetailKey(""); }, style: CRM.select },
                                React.createElement("option", { value: "weeks" }, "\u9031"),
                                React.createElement("option", { value: "months" }, "\u6708"),
                                React.createElement("option", { value: "years" }, "\u5E74")),
                            React.createElement("select", { key: "key", value: detailKey, onChange: e => setDetailKey(e.target.value), style: { ...CRM.select, minWidth: "160px" } },
                                React.createElement("option", { value: "" }, "\u8ACB\u9078\u64C7\u671F\u9593"),
                                (detailMode === "weeks" ? allWeeks : detailMode === "months" ? allMonths : allYears).map(k => {
                                    var _a, _b;
                                    return (React.createElement("option", { key: k, value: k }, detailMode === "weeks" ? formatWeekDisplay(k, ((_b = (_a = cloudMasterStore.weeks) === null || _a === void 0 ? void 0 : _a[k]) === null || _b === void 0 ? void 0 : _b.periodLabel) || "") : detailMode === "months" ? formatMonthDisplay(k) : formatYearDisplay(k)));
                                })),
                            React.createElement("button", { key: "export", onClick: () => exportRowsBundleToExcel(detailRows, "明細查詢"), style: CRM.btnPrimary },
                                React.createElement("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", style: { verticalAlign: "-2px", marginRight: "5px" } },
                                    React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
                                    React.createElement("path", { d: "M7 10l5 5 5-5" }),
                                    React.createElement("path", { d: "M12 15V3" })),
                                "\u532F\u51FA Excel"),
                        ] }),
                    detailMode === "weeks" && detailKey && (React.createElement("div", { style: { background: "#eff6ff", border: "0.5px solid #bfdbfe", borderRadius: "8px", padding: "10px 16px", fontSize: "12px", color: "#1d4ed8" } },
                        "週次查詢使用完整日期區間：",
                        formatWeekDisplay(detailKey, (((cloudMasterStore.weeks || {})[detailKey] || {}).periodLabel || "")))),
                    detailMode === "months" && detailKey && (React.createElement("div", { style: { background: "#eff6ff", border: "0.5px solid #bfdbfe", borderRadius: "8px", padding: "10px 16px", fontSize: "12px", color: "#1d4ed8" } },
                        "\u6708\u4EFD\u67E5\u8A62\u4F7F\u7528\u5B8C\u6574\u65E5\u671F\u5340\u9593\uFF1A",
                        getMonthExpectedRange(detailKey).label)),
                    React.createElement(CollapsibleCard, { style: { ...CRM.cardLg, overflow: "hidden" } },
                        React.createElement("div", { style: CRM.hdr },
                            React.createElement("span", { style: CRM.title }, "\u901A\u8A71\u660E\u7D30"),
                            React.createElement("span", { style: CRM.badge("#f8fafc", "#64748b") },
                                detailRows.length,
                                " \u7B46")),
                        React.createElement(CrmTableRows, { rows: detailPaging.rows, start: detailPaging.start }),
                        React.createElement(CrmPagination, { total: detailRows.length, page: detailPage, pageSize: detailPageSize, onPageChange: setDetailPage, onPageSizeChange: setDetailPageSize })),
                    React.createElement(CrmSummaryTable, { title: "電話接聽時數 — 總處理時間（小時）", rows: detailSummary.handleRows }),
                    React.createElement(CrmSummaryTable, { title: "電話接聽時數 — 總發話時間（小時）", rows: detailSummary.speakRows }),
                    React.createElement(CrmAnalysisTable, { rows: buildSatisfactionAnalysisRows(detailRows), targets: analysisSettings.targets }))),
                activeTab === "shift" && (React.createElement(React.Fragment, null,
                    React.createElement(PageHeader, { title: "\u73ED\u8868\u8207\u4EBA\u54E1\u6709\u6548\u671F\u9593", subtitle: "\u8A2D\u5B9A\u5404\u6708\u4EFD\u73ED\u5225\u540D\u55AE\u53CA\u4EBA\u54E1\u6709\u6548\u670D\u52D9\u671F\u9593" }),
                    React.createElement("div", { className: "rwd-split", style: { display: "grid", gridTemplateColumns: "220px 1fr", gap: "16px", alignItems: "start" } },
                        React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } },
                            React.createElement("div", { style: { ...CRM.cardLg, overflow: "hidden" } },
                                React.createElement("div", { style: CRM.hdr },
                                    React.createElement("span", { style: CRM.title }, "\u65B0\u589E\u6708\u4EFD\u73ED\u8868")),
                                React.createElement("div", { style: { padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px" } },
                                    React.createElement("input", { value: shiftMonthInput, onChange: e => setShiftMonthInput(e.target.value), placeholder: "\u4F8B\u5982 2026-04", style: CRM.input }),
                                    React.createElement("button", { onClick: addShiftMonth, style: CRM.btnPrimary }, "\u65B0\u589E\u6708\u4EFD"))),
                            React.createElement("div", { style: { background: "#fffbeb", border: "0.5px solid #fde68a", borderRadius: "10px", padding: "12px 14px", fontSize: "12px", color: "#92400e", lineHeight: "1.7" } },
                                React.createElement("div", { style: { fontWeight: "700", marginBottom: "4px" } }, "\u6709\u6548\u671F\u9593\u898F\u5247"),
                                "\u8D85\u904E\u6709\u6548\u671F\u9593\uFF1A\u4E0D\u88DC\u73ED\u5225\u3001\u4E0D\u9032\u6392\u884C\u699C\u3001\u4E0D\u756B\u8DA8\u52E2\u7DDA\u3002",
                                React.createElement("br", null),
                                "\u9031\uFF1A2025-W35\uFF0C\u6708\uFF1A2025-09\uFF0C\u5E74\uFF1A2025")),
                        React.createElement("div", { style: { ...CRM.cardLg, overflow: "hidden" } },
                            React.createElement("div", { style: CRM.hdr },
                                React.createElement("span", { style: CRM.title }, "\u73ED\u8868\u7DE8\u8F2F"),
                                React.createElement("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap" } },
                                    React.createElement("select", { value: shiftEditorMonth, onChange: e => setShiftEditorMonth(e.target.value), style: CRM.select }, shiftMonthKeys.map(k => React.createElement("option", { key: k, value: k }, k === "default" ? "預設（沒有設定月份時使用）" : isShiftPending(k) ? `${k}（${shiftAutoMonths[k] ? "自動沿用" : "新增"}，待確認）` : k))),
                                    isShiftPending(shiftEditorMonth) && React.createElement("button", { onClick: () => confirmShiftMonth(shiftEditorMonth), style: { ...CRM.btnPrimary, padding: "5px 12px", fontSize: "12px", background: "#16a34a", borderColor: "#16a34a" } }, "確認無誤"),
                                    shiftEditorMonth !== "default" && React.createElement("button", { onClick: () => deleteShiftMonth(shiftEditorMonth), style: { ...CRM.btnDanger, padding: "5px 12px", fontSize: "12px" } }, "\u522A\u9664"),
                                    React.createElement("button", { onClick: saveCurrentShiftMonth, style: { ...CRM.btnPrimary, padding: "5px 14px", fontSize: "12px" } }, "\u5132\u5B58"))),
                            isShiftPending(shiftEditorMonth) ? React.createElement("div", { style: { margin: "12px 20px 0", padding: "9px 12px", background: "#fffbeb", border: "0.5px solid #fcd34d", borderRadius: "8px", fontSize: "12px", color: "#92400e", lineHeight: 1.7 } }, `這個月的班表還沒確認${shiftSourceText(shiftEditorMonth)}。沒問題請按「確認無誤」；有人員或班別變動，直接修改後按「儲存」。`) : React.createElement("div", { style: { margin: "12px 20px 0", fontSize: "12px", color: "#64748b" } }, "新的月份還沒建立班表時，系統會先自動沿用上一個月的名單，並在每一頁上方提醒你確認。"),
                            React.createElement("div", { className: "rwd-multi-col", style: { padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" } }, ["早班", "中班", "晚班"].map(shift => {
                                const sc = CRM.SHIFT[shift] || { bg: "#f1f5f9", tc: "#475569" };
                                return (React.createElement("div", { key: shift, style: { background: "#f9fafb", borderRadius: "8px", padding: "12px 14px", border: "0.5px solid #e2e8f0" } },
                                    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" } },
                                        React.createElement("span", { style: CRM.badge(sc.bg, sc.tc) }, shift)),
                                    React.createElement("textarea", { rows: "8", value: shiftDraft[shift], onChange: e => setShiftDraft(prev => ({ ...prev, [shift]: e.target.value })), placeholder: "\u8ACB\u8F38\u5165\u540D\u55AE\uFF0C\u53EF\u7528 \u3001 \u6216\u63DB\u884C\u5206\u9694", style: { ...CRM.input, resize: "vertical", fontSize: "12px", lineHeight: "1.7" } })));
                            })))),
                    missingFromShift.length > 0 && React.createElement("div", { style: { ...CRM.cardLg, overflow: "hidden", border: "1px solid #fdba74" } },
                        React.createElement("div", { style: CRM.hdr },
                            React.createElement("span", { style: { ...CRM.title, color: "#9a3412" } }, "班表裡找不到的人"),
                            React.createElement("span", { style: CRM.badge("#fff7ed", "#9a3412") }, `${missingFromShift.length} 個月份、${missingPeopleCount} 人次`)),
                        React.createElement("div", { style: { padding: "8px 16px", fontSize: "12px", color: "#64748b", borderBottom: "0.5px solid #f1f5f9" } }, "這些客服在那個月有接電話，但那個月的班表裡沒有他們（那個月還沒建立班表時，看預設班表）。請打開那個月，把他們加到正確的班別後按「儲存」。超過人員有效期間的人不會列在這裡。"),
                        React.createElement("div", { style: { overflowX: "auto" } },
                            React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "13px" } },
                                React.createElement("thead", null, React.createElement("tr", null, ["月份", "客服（接聽數）", "操作"].map((h) => React.createElement("th", { key: h, style: h === "客服（接聽數）" ? { ...CRM.th, textAlign: "left" } : CRM.th }, h)))),
                                React.createElement("tbody", null, missingFromShift.map((m) => React.createElement("tr", { key: m.month },
                                    React.createElement("td", { style: { ...CRM.td, whiteSpace: "nowrap", fontWeight: "600" } }, fmtYm(m.month), m.hasTable ? null : React.createElement("div", { style: { fontSize: "11px", color: "#94a3b8", fontWeight: "400" } }, "這個月還沒建立班表")),
                                    React.createElement("td", { style: { ...CRM.td, textAlign: "left" } }, m.people.map((p) => `${p.name}（${p.calls.toLocaleString()} 通）`).join("、")),
                                    React.createElement("td", { style: CRM.td }, React.createElement("button", { type: "button", onClick: () => openShiftMonth(m.month), style: { ...CRM.btnGhost, padding: "4px 10px", fontSize: "12px" } }, m.hasTable ? "打開這個月" : "打開預設班表")))))))),
                    React.createElement("div", { style: { ...CRM.cardLg, overflow: "hidden" } },
                        React.createElement("div", { style: CRM.hdr },
                            React.createElement("span", { style: CRM.title }, "\u4EBA\u54E1\u6709\u6548\u671F\u9593"),
                            React.createElement("span", { style: CRM.badge("#f8fafc", "#64748b") },
                                Object.keys(effectiveRules).length,
                                " \u4EBA")),
                        React.createElement("div", { className: "effective-rule-row", style: { padding: "14px 20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 100px", gap: "8px", borderBottom: "0.5px solid #f1f5f9" } },
                            React.createElement("input", { value: effectiveDraft.name, onChange: e => setEffectiveDraft(p => ({ ...p, name: e.target.value })), placeholder: "\u5BA2\u670D\u540D\u7A31", style: CRM.input }),
                            React.createElement("input", { value: effectiveDraft.start, onChange: e => setEffectiveDraft(p => ({ ...p, start: e.target.value })), placeholder: "\u8D77\u59CB \u4F8B 2025-W09", style: CRM.input }),
                            React.createElement("input", { value: effectiveDraft.end, onChange: e => setEffectiveDraft(p => ({ ...p, end: e.target.value })), placeholder: "\u7D50\u675F \u4F8B 2025-W35", style: CRM.input }),
                            React.createElement("input", { value: effectiveDraft.note, onChange: e => setEffectiveDraft(p => ({ ...p, note: e.target.value })), placeholder: "\u5099\u8A3B", style: CRM.input }),
                            React.createElement("button", { className: "effective-rule-submit", onClick: addEffectiveRule, style: CRM.btnPrimary }, "\u65B0\u589E/\u66F4\u65B0")),
                        React.createElement("div", { style: { overflowX: "auto" } },
                            React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "13px" } },
                                React.createElement("thead", null,
                                    React.createElement("tr", null, ["客服名稱", "起始", "結束", "備註", "操作"].map(h => React.createElement("th", { key: h, style: h === "客服名稱" ? { ...CRM.th, textAlign: "left" } : CRM.th }, h)))),
                                React.createElement("tbody", null, Object.keys(effectiveRules).length === 0 ? (React.createElement("tr", null,
                                    React.createElement("td", { colSpan: "5", style: { ...CRM.td, padding: "40px", color: "#94a3b8", textAlign: "center" } }, "\u5C1A\u7121\u8A2D\u5B9A"))) : Object.entries(effectiveRules).map(([name, rule], i) => (React.createElement("tr", { key: name, style: { background: i % 2 === 0 ? "#fff" : "#f9fafb" }, onMouseEnter: e => e.currentTarget.style.background = "#f0f9ff", onMouseLeave: e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#f9fafb" },
                                    React.createElement("td", { style: { ...CRM.td, textAlign: "left", fontWeight: "500", color: "#1e293b" } }, name),
                                    React.createElement("td", { style: CRM.td },
                                        React.createElement("span", { style: CRM.badge("#f0f9ff", "#0284c7") }, rule.start || "—")),
                                    React.createElement("td", { style: CRM.td },
                                        React.createElement("span", { style: CRM.badge("#fef3c7", "#92400e") }, rule.end || "—")),
                                    React.createElement("td", { style: { ...CRM.td, fontSize: "12px", color: "#64748b" } }, rule.note || "—"),
                                    React.createElement("td", { style: CRM.td },
                                        React.createElement("div", { style: { display: "flex", gap: "6px", justifyContent: "center" } },
                                            React.createElement("button", { onClick: () => editEffectiveRule(name, rule), style: { ...CRM.btnGhost, padding: "4px 12px", fontSize: "12px" } }, "\u7DE8\u8F2F"),
                                            React.createElement("button", { onClick: () => deleteEffectiveRule(name), style: { ...CRM.btnDanger, padding: "4px 12px", fontSize: "12px" } }, "\u522A\u9664"))))))))))))))));
}
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App, null));

//# sourceURL=weekly-call-report-main.precompiled.js
