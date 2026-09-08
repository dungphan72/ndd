# Quy tắc Phím Tắt của Người Dùng (User Shortcuts)

- Khi người dùng gửi tin nhắn chỉ chứa số `1` (hoặc yêu cầu bấm `1`), đó là lệnh phím tắt **"up github"**.
- Khi nhận được số `1`:
  1. Kiểm tra `git status`
  2. Tự động `git add .` (nếu có file chỉnh sửa/mới)
  3. `git commit` với thông điệp ngắn gọn mô tả thay đổi vừa thực hiện
  4. Thực hiện `git push origin main` để cập nhật toàn bộ mã nguồn lên GitHub
  5. Báo cáo kết quả đẩy code cho người dùng.
