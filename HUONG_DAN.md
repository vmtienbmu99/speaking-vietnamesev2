# Nói để nhảy · Speak to Jump: hướng dẫn cài đặt

## Trong gói này có gì
| File / thư mục | Dùng để làm gì |
|---|---|
| `index.html` | Game |
| `config.js` | **Mọi thứ cần chỉnh nằm ở đây** (link Sheet, link bảng xếp hạng, thời gian nói, cách chia chặng) |
| `asr.mjs`, `models/` | Bộ nhận giọng chạy ngay trên máy người chơi |
| `tools/dashboard.gs` | Mã Google Apps Script cho bảng xếp hạng (dán vào Sheet, không upload lên web) |
| `tools/gen_audio.py` | Script sinh audio mẫu (GitHub tự chạy, không cần cài Python) |
| `.github/workflows/audio.yml` | Cho GitHub tự sinh audio mỗi ngày |

## 1. Upload lên GitHub
1. Giải nén file zip.
2. Vào repo → **Add file → Upload files**, kéo toàn bộ nội dung đã giải nén vào (cả các thư mục), bấm **Commit changes**.
3. Nếu repo đã có sẵn `models/` thì chỉ cần upload `index.html`, `config.js`, `HUONG_DAN.md` và thư mục `tools`.
4. Chờ 1–2 phút, mở trang bằng **Ctrl+F5**.

## 2. Bảng xếp hạng (làm một lần)
Bảng xếp hạng ghi vào sheet **Dashboard** trong cùng file Google Sheet với các câu hỏi.

1. Mở Google Sheet → **Tiện ích mở rộng → Apps Script**.
2. Xóa hết code mẫu, mở file `tools/dashboard.gs`, copy toàn bộ rồi dán vào. Bấm 💾 Lưu.
3. Bấm **Triển khai → Tùy chọn triển khai mới**. Ở biểu tượng bánh răng chọn loại **Ứng dụng web**:
   - *Thực thi với tư cách*: **Tôi**
   - *Người có quyền truy cập*: **Bất kỳ ai**
4. Bấm **Triển khai**, cấp quyền khi Google hỏi (nếu hiện "Google chưa xác minh ứng dụng này" thì chọn *Nâng cao → Đi tới ... (không an toàn)*; đây là script của chính bạn).
5. Copy **URL ứng dụng web** (kết thúc bằng `/exec`).
6. Trên GitHub, mở file `config.js` → bấm ✏️ → dán URL vào `DASHBOARD_URL` → **Commit changes**.

Sheet **Dashboard** cần 3 cột `thoi_gian | ten | diem`. Nếu sheet trống, script tự tạo tiêu đề.

**Khi sửa mã Apps Script về sau:** Triển khai → Quản lý bản triển khai → ✏️ → Phiên bản: *Phiên bản mới* → Triển khai. URL giữ nguyên.

## 3. Cách bảng xếp hạng hoạt động
- Mỗi lần mở trang, người chơi nhập tên một lần (không lưu lại).
- Chỉ lượt **Thử thách** được ghi điểm (điểm ≥ 1) khi thua. Trùng tên không sao, mỗi lượt là một dòng.
- Bảng hiện top 5. Nếu người chơi ngoài top 5, hàng thứ 5 mờ dần, rồi tới "• • •" và hàng thứ hạng, tên, điểm của người chơi.
- Điểm bằng nhau thì ai ghi trước xếp trước.
- Nút 🏆 trên thanh trên cùng cho xem bảng bất cứ lúc nào.
- Điểm do trình duyệt gửi lên nên học viên rành kỹ thuật có thể gửi điểm giả. Với lớp học thì chấp nhận được.

## 4. Thêm câu hỏi vào Sheet
Sheet "Trường học" (tab đầu tiên) có các cột: `chu_de | cau | nghia | do_kho`.
- Cột D là độ khó từ 1 đến 5 (ô trống thì game tự tính theo số từ).
- Mỗi độ khó nên có từ 10 đến 15 câu trở lên, để mỗi chặng 5 câu không bị lặp.
- Viết số bằng chữ, tránh chữ số và ký hiệu đặc biệt.
- Từ mượn như "X-quang", "blouse", "visa" dễ bị nhận sai, nên viết theo cách đọc tiếng Việt.

## 5. Audio mẫu (tự động)
GitHub Actions tự sinh audio cho câu mới mỗi ngày. Chạy ngay: tab **Actions → Tự động tạo audio mẫu → Run workflow**.
Cần bật *Settings → Actions → General → Workflow permissions → Read and write permissions*.

## 6. Chỉnh thời gian nói
Mở `config.js`, sửa khối `TIMING`:
- `base`, `perWord`: tổng thời gian được nói mỗi câu (`base + perWord × số từ`).
- `pause`: im lặng bao lâu thì coi như nói xong.
- `maxSpeech`: độ dài tối đa một lần nói.
