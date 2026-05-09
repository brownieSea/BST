// ============================================================
//  설정 파일 — 본인 정보로 수정하세요
// ============================================================

const CONFIG = {

  // 1) Google Sheets 공개 CSV URL
  //    시트 → 파일 → 공유 → "링크 있는 모든 사용자 보기 가능" 설정 후
  //    아래 형식으로 URL을 만들어 주세요:
  //    https://docs.google.com/spreadsheets/d/1gWwvknhYm7VBbzRNl2dA561QD5NdlIiB3KkRTcxmau0/gviz/tq?tqx=out:csv
  SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/1gWwvknhYm7VBbzRNl2dA561QD5NdlIiB3KkRTcxmau0/gviz/tq?tqx=out:csv",

  // 2) Google Apps Script 웹앱 URL (새 행 추가용)
  //    아래 SETUP.md 참고해서 배포 후 URL 붙여넣기
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",

  // 3) 시트 컬럼 순서 (0-indexed) — 기존 시트 구조에 맞게 조정
  COLUMNS: {
    date:       0,   // 날짜 (2026-04-07 또는 "오후 12:00" 앞의 날짜)
    time:       1,   // 측정 시간
    glucose:    2,   // 혈당 수치
    lastMealTime: 3, // 전일 마지막 식사 시간
    meal:       4,   // 식사 내용
    oilYN:      5,   // 전일 오일 섭취 여부 (Y/N)
    meta:       6,   // 메타파워 방울 수
    lemon:      7,   // 레몬 방울 수
    note:       8,   // 비고
    sleep:      9,   // 수면 시간
    prevMed:   10,   // 전날 당뇨약
    lastOil:   11,   // 오일 마지막 식후
  },
};
