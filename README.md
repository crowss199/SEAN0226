# 翔安富文具｜GitHub Pages × iOPEN Mall 導購官網

本版本將 GitHub Pages 官網與翔安富文具 iOPEN Mall 賣場連結整合：

- 官網品牌名稱統一為「翔安富文具」。
- 首頁、導覽列、商品卡片、選購清單及頁尾皆可前往 iOPEN Mall。
- 保留商品瀏覽、選購清單、數量調整及瀏覽器 LocalStorage 暫存功能。
- 商品精選資料以目前公開賣場頁面可見品項整理，價格為參考資訊；實際價格、規格及庫存以 iOPEN Mall 即時頁面為準。
- 本官網不收集買家個人資料、不處理付款，也不寄送訂單 Email。

## iOPEN Mall 賣場

https://mall.iopenmall.tw/011553/

## 重要說明：目前是導購連結整合，不是 API 自動串接

GitHub Pages 是靜態網站。這個版本的「選購清單」只保存在訪客自己的瀏覽器，不會自動匯入 iOPEN Mall 購物車。訪客點選「前往 iOPEN Mall 購物」後，需在 iOPEN Mall 重新選擇商品、規格及數量，再依平台流程付款與配送。

若未來要自動同步商品、庫存、訂單或購物車，需先向 iOPEN Mall 申請並取得官方 API 權限，再另行建置安全的後端服務；不可將 API Secret 放進 GitHub Pages 前端程式碼。

## 部署到 GitHub Repository

1. 開啟 https://github.com/crowss199/SEAN0226
2. 點選 `Add file` → `Upload files`。
3. 解壓 ZIP，將 `index.html`、`style.css`、`script.js`、`README.md` 四個檔案上傳至 Repository 根目錄。
4. 覆蓋同名檔案，按 `Commit changes`。
5. 等待 GitHub Pages 部署完成。

官網網址：https://crowss199.github.io/SEAN0226/

## 修改商品

打開 `script.js`，修改最上方 `PRODUCTS` 陣列中的 `name`、`desc`、`price`、`tag`、`symbol`。新增商品時請使用不同的 `id`。如要將商品連結改為各自的商品詳細頁，需取得該商品在 iOPEN Mall 的專屬網址，再將 `MALL_URL` 的共用連結改為每項商品各自的 URL。
