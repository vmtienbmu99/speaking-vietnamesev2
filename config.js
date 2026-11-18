// ===== CẤU HÌNH — mọi thứ cần chỉnh nằm trong file này =====

// 1) Link Google Sheet chứa các câu (dán link đang mở trên thanh địa chỉ).
//    Sheet phải để chế độ: Chia sẻ > Bất kỳ ai có đường liên kết > Người xem.
//    Cột: A = chu_de | B = cau | C = nghia | D = do_kho (số 1 đến 5, có thể để trống). Dòng 1 là tiêu đề.
//    Viết số bằng chữ (ví dụ "hai nghìn"), tránh chữ số và ký hiệu đặc biệt.
export const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1JHK1GFetL5xZchLkCRhDx7a_OuM7VEcJNkITi1CbzuQ/edit?gid=0';

// 2) Link "Web app" của Google Apps Script để ghi và đọc bảng xếp hạng (xem HUONG_DAN.md, phần 2).
//    Để trống thì game vẫn chạy bình thường nhưng không có bảng xếp hạng.
export const DASHBOARD_URL = 'https://script.google.com/macros/s/AKfycbyGSw5bZRYEtgnLxwPVI7aAiPA_awDgehmgPl0X2hdKFh9haClO_3fBg7GY8f7zBP6R/exec';

// 3) Bảng xếp hạng hiển thị bao nhiêu người đứng đầu.
export const TOP_N = 5;

// 4) Cách chia chặng: mỗi độ khó (1 đến 5) có PER_STAGE câu, bốc ngẫu nhiên từ Sheet.
//    Qua hết độ khó 1, 2, 3, 4 thì lên độ khó 5 và chơi liên tục không giới hạn để thi điểm cao.
export const PER_STAGE = 5;

// 5) Hàng nào trong Sheet chưa điền cột D thì độ khó tự tính theo số từ:
//    ≤2 từ = 1, ≤4 từ = 2, ≤6 từ = 3, ≤9 từ = 4, còn lại = 5.
export const LEVEL_MAX_WORDS = [2, 4, 6, 9];

// 6) Thời gian nói (đơn vị: giây). Muốn cho người học nói lâu hơn thì tăng các số này.
export const TIMING = {
  base: 15,      // thời gian tối thiểu được nói cho mỗi câu
  perWord: 2,    // cộng thêm cho mỗi từ trong câu (câu 2 từ: 15 + 2×2 = 19 giây; câu 10 từ: 15 + 2×10 = 35 giây)
  pause: 1.5,    // im lặng bao lâu thì máy coi là nói xong và chấm. Tăng lên nếu người học hay ngập ngừng giữa câu
  maxSpeech: 20  // độ dài tối đa của một lần nói liền
};
