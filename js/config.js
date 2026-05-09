// ============================================================
//  설정 파일 — 본인 정보로 수정하세요
// ============================================================

const CONFIG = {

  // ★ 비밀번호 — 원하는 것으로 변경하세요
  PASSWORD: "9988",

  // 1) Google Sheets 공개 CSV URL
  SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/gviz/tq?tqx=out:csv",

  // 2) Google Apps Script 웹앱 URL (새 행 추가용)
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",

  // 3) 시트 컬럼 순서 (0-indexed)
  COLUMNS: {
    date:         0,
    time:         1,
    glucose:      2,
    lastMealTime: 3,
    meal:         4,
    oilYN:        5,
    meta:         6,
    lemon:        7,
    note:         8,
    sleep:        9,
    prevMed:     10,
    lastOil:     11,
  },
};
