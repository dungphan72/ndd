# Zalo Bot relay (Cloudflare Worker)

Trình duyệt không gọi được thẳng Zalo Bot API (không có CORS), nên worker
này đứng giữa: website gọi worker → worker gọi Zalo Bot API bằng token bí mật.

## Triển khai

1. Cài Wrangler (một lần):
   ```
   npm install -g wrangler
   wrangler login
   ```

2. Trong thư mục `cloudflare-worker/`, tạo 3 secret (nhập giá trị khi được hỏi).
   KHÔNG bao giờ ghi thẳng bot token vào file này hay bất kỳ file nào trong repo
   (repo này là public trên GitHub) — chỉ nhập qua `wrangler secret put`, giá trị
   được Cloudflare lưu riêng, không lộ ra source code:
   ```
   wrangler secret put ZALO_BOT_TOKEN
   ```
   → dán bot token lấy từ Zalo Bot Manager (mục "Bot Token", bấm Reset để xem).

   ```
   wrangler secret put ZALO_CHAT_ID
   ```
   → dán chat_id của người nhận thông báo. Cách lấy: vì bot dạng "BASIC" không hỗ
   trợ `getUpdates`, dùng cách sau — tạm thời dán 1 URL từ https://webhook.site
   vào ô "Webhook URL" trong Zalo Bot Manager (mục Thiết lập chung), đặt tạm
   1 Secret Token bất kỳ (≥8 ký tự), Lưu thay đổi, rồi nhắn tin cho bot. Mở lại
   webhook.site, tìm request POST vừa nhận, lấy giá trị `message.chat.id` trong
   JSON. Xong thì quay lại Zalo Bot Manager bấm "Xóa Webhook" để gỡ webhook tạm.

   ```
   wrangler secret put RELAY_SHARED_SECRET
   ```
   → dán một chuỗi ngẫu nhiên tự đặt, ví dụ tạo bằng lệnh:
   ```
   node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
   ```

3. Deploy:
   ```
   wrangler deploy
   ```
   Wrangler sẽ in ra URL dạng `https://ndd-zalo-relay.<subdomain>.workers.dev` — gửi URL này lại để cập nhật vào front-end (`js/data.js`).

4. Nếu domain đích (`ALLOWED_ORIGIN` trong `zalo-relay.js`) không đúng là
   `https://nhomdinhduong.vn`, sửa lại cho khớp domain thật của site trước khi deploy.

## Test nhanh sau khi deploy

```
curl -X POST https://ndd-zalo-relay.nhomdinhduong-ndd.workers.dev \
  -H "Content-Type: application/json" \
  -H "X-Relay-Secret: <RELAY_SHARED_SECRET vừa đặt>" \
  -d '{"text":"Test tu worker"}'
```
Nếu thấy tin nhắn xuất hiện trong Zalo là đã chạy đúng.
