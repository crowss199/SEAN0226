# 翔安富文具｜日系簡約風官網與商品管理頁

## 網站內容
- Japandi 日系簡約視覺：米白、鼠尾草綠、暖灰、留白排版。
- 首頁、品牌介紹、購物指南、導覽列與頁尾全面更新。
- 商品卡片、分類篩選、關鍵字搜尋、圖片、商品連結。
- 選購清單支援加入、增減數量、移除與參考小計。
- 手機版導覽、商品雙欄排版、購物清單抽屜。
- 商品資料集中於 `products.json`，不用改商品程式碼。
- 管理頁 `admin.html`：登入、增加、修改、刪除、匯入及下載商品資料。

## 官方賣場
https://mall.iopenmall.tw/011553/

## 安裝與設定簡易密碼
1. 解壓縮 ZIP。
2. 開啟 `admin-config.js`，將 `window.ADMIN_PASSWORD` 的文字改成你自己的密碼。
3. 將 ZIP 內所有檔案（`index.html`、`style.css`、`script.js`、`products.json`、`admin.html`、`admin.css`、`admin.js`、`admin-config.js`、`README.md`）上傳到 GitHub Repository 根目錄。
4. 覆蓋同名檔案並 Commit changes。
5. 官網：https://crowss199.github.io/SEAN0226/
6. 管理頁：https://crowss199.github.io/SEAN0226/admin.html

## 如何新增商品
1. 開啟管理頁，輸入你在 `admin-config.js` 設定的密碼。
2. 填商品名稱與價格；其他欄位可選填。
3. 按「加入商品清單」；要修改或刪除可在商品清單操作。
4. 按「下載更新檔」，下載 `products.json`。
5. 回到 GitHub Repository，將新 `products.json` 上傳根目錄覆蓋舊檔，Commit changes。
6. 等待 GitHub Pages 更新。

## 簡易密碼的重要安全限制
此密碼驗證在瀏覽器端執行，`admin-config.js` 會公開下載，任何人都可能檢視原始碼取得密碼或繞過登入。因此這只是防止一般訪客誤入的簡易門檻，不是真正的帳號權限或安全驗證。請勿在管理頁輸入客戶個資、訂單機密、金流資訊或任何敏感資料。若未來要真正保護管理功能，應改用伺服器端驗證或具權限控管的身份驗證服務。

## 購物車與 iOPEN Mall
官網選購清單只在瀏覽器暫存，不會自動同步 iOPEN Mall 購物車。實際下單、付款、配送、會員及訂單均由 iOPEN Mall 處理。商品參考價請以賣場即時資訊為準。GitHub Pages 是靜態網站，本版本沒有串接 iOPEN Mall 私有 API。
