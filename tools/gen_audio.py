"""Sinh audio mẫu (giọng Bắc / Trung / Nam) cho các câu trong Google Sheet bằng VieNeu-TTS v3 Turbo (Apache-2.0).

Cách chạy (trên máy tính của bạn, CPU là đủ, lần đầu sẽ tải mô hình về):
    pip install vieneu
    python gen_audio.py              # sinh cả 6 giọng
    python gen_audio.py bac-f nam-m  # chỉ sinh một vài giọng (nên thử 1 giọng trước để nghe chất lượng)

Kết quả nằm trong thư mục  audio/<vùng>-<giới tính>  (mỗi câu một file .mp3), ví dụ audio/bac-f, audio/trung-m.
Upload thư mục `audio` lên GitHub, đặt cạnh index.html. Khi Sheet có câu mới, chạy lại script:
chỉ những câu chưa có file mới được sinh thêm.

Không muốn cài Python? Dùng GitHub Actions: file .github/workflows/audio.yml tự chạy script này trên máy chủ của GitHub
và tự đưa audio vào repo (xem hướng dẫn kèm theo). Biến môi trường AUDIO_BUDGET_MIN giới hạn số phút mỗi lần chạy.
"""
import csv, hashlib, io, os, re, sys, time, unicodedata, urllib.request
from pathlib import Path

SHEET_URL = 'https://docs.google.com/spreadsheets/d/1JHK1GFetL5xZchLkCRhDx7a_OuM7VEcJNkITi1CbzuQ/edit?gid=0'

# Mỗi vùng miền (bac / trung / nam) có một giọng nam (m) và một giọng nữ (f).
# Tên phải có trong danh sách giọng của phiên bản vieneu bạn cài (nếu sai, script sẽ in ra danh sách giọng hiện có).
# Muốn đổi giọng: xóa thư mục audio/<vùng>-<giới tính> tương ứng rồi chạy lại.
VOICES = {
    'bac-m': 'Phạm Tuyên', 'bac-f': 'Ngọc Huyền',
    'trung-m': 'Quang Sơn', 'trung-f': 'Ngọc Trân',
    'nam-m': 'Adam', 'nam-f': 'Thùy Dung',
}

OUT = Path('audio')


def sheet_csv(url):
    sid = re.search(r'/spreadsheets/d/([\w-]+)', url).group(1)
    gid = re.search(r'gid=(\d+)', url)
    u = f'https://docs.google.com/spreadsheets/d/{sid}/export?format=csv' + (f'&gid={gid.group(1)}' if gid else '')
    return urllib.request.urlopen(u).read().decode('utf-8')


def key(text):
    """Tên file = 12 ký tự đầu của SHA-1 của câu đã chuẩn hóa. Game dùng đúng công thức này để tìm file."""
    n = ' '.join(unicodedata.normalize('NFC', text).lower().split())
    return hashlib.sha1(n.encode('utf-8')).hexdigest()[:12]


def main():
    rows = list(csv.reader(io.StringIO(sheet_csv(SHEET_URL))))[1:]
    sentences, seen = [], set()
    for r in rows:
        if len(r) > 1 and r[1].strip() and key(r[1]) not in seen:
            seen.add(key(r[1]))
            sentences.append(r[1].strip())
    print(f'Có {len(sentences)} câu trong Sheet.')

    chosen = {k: v for k, v in VOICES.items() if not sys.argv[1:] or k in sys.argv[1:]}
    todo = [(region, voice, text) for region, voice in chosen.items() for text in sentences
            if not any((OUT / region / f'{key(text)}.{ext}').exists() for ext in ('mp3', 'wav'))]
    print(f'Còn {len(todo)} file audio cần sinh.')
    if not todo:
        print('Không có gì mới, không cần tải mô hình.')
        return

    from vieneu import Vieneu
    import soundfile as sf

    tts = Vieneu()
    ids = {voice_id for _, voice_id in tts.list_preset_voices()}
    for region, voice in chosen.items():
        if voice not in ids:
            sys.exit(f'Không có giọng "{voice}" ({region}). Các giọng hiện có: {sorted(ids)}')

    budget = float(os.environ.get('AUDIO_BUDGET_MIN') or 0)          # 0 = không giới hạn thời gian
    deadline = time.time() + budget * 60 if budget else None
    done = failed = 0
    for i, (region, voice, text) in enumerate(todo, 1):
        if deadline and time.time() > deadline:
            print('Hết thời gian của lần chạy này. Phần còn lại sẽ được sinh ở lần chạy sau.')
            break
        folder = OUT / region
        folder.mkdir(parents=True, exist_ok=True)
        k = key(text)
        print(f'[{region}] {i}/{len(todo)}  {text}', flush=True)
        try:
            audio = tts.infer(text, voice=voice)
            try:
                sf.write(str(folder / f'{k}.mp3'), audio, tts.sample_rate, format='MP3')
            except Exception:  # nếu máy không ghi được mp3 thì lưu wav (game vẫn đọc được, chỉ nặng hơn)
                tts.save(audio, folder / f'{k}.wav')
            done += 1
        except Exception as e:  # một câu lỗi thì bỏ qua, các câu khác vẫn tiếp tục
            failed += 1
            print(f'   ! Lỗi ở câu này, bỏ qua: {e}')
    print(f'Xong: {done} file mới, {failed} lỗi.')


if __name__ == '__main__':
    main()
