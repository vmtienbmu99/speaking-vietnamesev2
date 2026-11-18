/**
 * Bảng xếp hạng cho game "Nói để nhảy" — dán toàn bộ file này vào Google Apps Script của Sheet.
 * (Mở Sheet > Tiện ích mở rộng > Apps Script, xóa code mẫu, dán file này, rồi Triển khai dạng Ứng dụng web. Xem HUONG_DAN.md.)
 *
 * Sheet "Dashboard" có 3 cột: A = thoi_gian | B = ten | C = diem.
 * Nếu sheet đang trống, script tự tạo dòng tiêu đề. Mỗi lượt chơi Thử thách là một dòng mới; trùng tên không sao.
 */
const SHEET_NAME = 'Dashboard';
const TOP_N = 5;          // số người đứng đầu trả về cho game
const MAX_SCORE = 100000; // điểm lớn hơn mức này bị coi là không hợp lệ

function doGet(e) {
  const p = (e && e.parameter) || {};
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  let myRow = null;

  if (p.action === 'submit') {
    const name = String(p.name || '').replace(/[\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 30);
    const score = parseInt(p.score, 10);
    if (!name || !(score >= 0) || score > MAX_SCORE) return out({ ok: false, error: 'invalid input' });
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      if (sh.getLastRow() === 0) sh.appendRow(['thoi_gian', 'ten', 'diem']);
      const r = sh.getLastRow() + 1;
      sh.getRange(r, 2).setNumberFormat('@');                       // cột tên là văn bản, tránh bị hiểu thành công thức (=, +, -, @)
      sh.getRange(r, 1, 1, 3).setValues([[new Date(), name, score]]);
      myRow = r;
    } finally {
      lock.releaseLock();
    }
  }

  const last = sh.getLastRow();
  const values = last > 1 ? sh.getRange(2, 1, last - 1, 3).getValues() : [];
  const list = values
    .map((v, i) => ({ row: i + 2, name: String(v[1]), score: Number(v[2]) || 0 }))
    .filter(x => x.name);
  list.sort((a, b) => b.score - a.score || a.row - b.row);          // điểm cao xuống thấp; bằng điểm thì ai ghi trước xếp trước

  const top = list.slice(0, TOP_N).map((x, i) => ({ rank: i + 1, name: x.name, score: x.score }));
  let me = null;
  if (myRow) {
    const i = list.findIndex(x => x.row === myRow);
    if (i >= 0) me = { rank: i + 1, name: list[i].name, score: list[i].score };
  }
  return out({ ok: true, top: top, me: me, total: list.length });
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
