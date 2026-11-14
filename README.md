# 翔安富文具｜GitHub Pages 購物網站

本網站包含商品展示、購物車、數量調整、LocalStorage 購物車保存、結帳表單及 Email 訂單通知。

## Email 訂單通知
訂單會透過 FormSubmit 寄送到 `crowss199@hotmail.com`。
第一次部署後，請到網站送出一筆測試訂單，並查看該信箱（包含垃圾郵件資料夾），點擊 FormSubmit 寄來的啟用確認連結。完成確認後，之後的訂單通知才會正常寄送。

顧客送出的姓名、電話、收件地址與訂單內容會經由 FormSubmit 第三方服務處理。正式營運前請閱讀其隱私與服務說明，並妥善保管顧客資料。

## 修改商品
打開 `script.js`，修改最上方 `PRODUCTS` 陣列中的 `name`、`desc`、`price`、`tag`、`symbol`。新增商品時請使用不同的 `id`。

## 更新 GitHub Pages
1. 打開 https://github.com/crowss199/SEAN0226
2. 點選 `Add file` → `Upload files`。
3. 上傳新版 `index.html`、`script.js`、`README.md`、`style.css`。
4. 覆蓋同名檔案並按 `Commit changes`。
5. 等待 GitHub Pages 部署完成，再重新整理網站。

網站網址：https://crowss199.github.io/SEAN0226/

## 重要限制
GitHub Pages 只提供靜態網站託管。本版本沒有會員、庫存管理或線上付款。Email 通知仰賴 FormSubmit 第三方服務與首次信箱啟用確認；請先用測試訂單驗證收件正常，再正式對外營運。
