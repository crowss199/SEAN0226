# 翔安富文賜｜GitHub Pages 購物網站

這是一個純前端購物網站，包含商品展示、購物車、數量調整、LocalStorage 購物車保存、結帳表單及可複製的訂單內容。

## 檔案
- `index.html`：網站頁面結構
- `style.css`：黑白簡約風格與手機版排版
- `script.js`：商品資料、購物車及訂單產生功能

## 修改商品
打開 `script.js`，修改最上方 `PRODUCTS` 陣列中的商品：
- `name`：商品名稱
- `desc`：商品描述
- `price`：商品價格（數字，單位新台幣）
- `tag`：商品標籤
- `symbol`：商品圖片位置目前使用的文字示意符號

要增加商品，複製一筆商品資料並使用不同的 `id`。

## 在 GitHub 建立網站
1. 登入 https://github.com/
2. 點右上角 `+`，選擇 `New repository`。
3. Repository name 建議輸入 `xiang-an-shop`。
4. 選擇 `Public`，按 `Create repository`。
5. 在新 Repository 頁面選 `Add file` → `Upload files`。
6. 將 `index.html`、`style.css`、`script.js`、`README.md` 四個檔案上傳（不是把外層資料夾再包一層）。
7. 按 `Commit changes`。
8. 進入 Repository 的 `Settings` → `Pages`。
9. 在 `Build and deployment` 的 `Source` 選 `Deploy from a branch`。
10. Branch 選 `main`，資料夾選 `/ (root)`，按 `Save`。
11. 等待部署完成，GitHub Pages 會顯示網站網址，格式通常是：
   `https://你的GitHub帳號.github.io/xiang-an-shop/`

## 重要限制
GitHub Pages 只提供靜態網站託管。本版本的訂單會在顧客瀏覽器中產生並提供複製功能，不會自動傳送到店家，也沒有會員、庫存、後台或線上付款。若要正式接單，請再串接表單服務、後端 API 或 LINE 官方帳號等接單管道。請勿在純前端程式碼中放置金流密鑰或私人 API 金鑰。
