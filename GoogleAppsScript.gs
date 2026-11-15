const SHEET_NAME = "官網訂單";
const HEADERS = ["訂單編號","下單時間","取件人姓名","取件人手機","電子郵件","取件門市店號","溫層","商品","商品金額","運費金額","備註","其他資訊","訂單狀態"];

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  removeStoreNameAddressColumns_(sh);
  ensureEmailColumn_(sh);
  const hasEditTrigger = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === "onEdit");
  if (!hasEditTrigger) ScriptApp.newTrigger("onEdit").forSpreadsheet(ss).onEdit().create();
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
  } else {
    // 確保既有試算表欄位順序與新版一致，不覆寫訂單資料。
    const current = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), HEADERS.length)).getDisplayValues()[0];
    if (current.every(v => !String(v).trim())) {
      sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      sh.setFrozenRows(1);
    }
  }
}

// 舊試算表若尚無電子郵件欄，插入在手機號碼之後，不覆寫既有資料。
function ensureEmailColumn_(sh) {
  if (sh.getLastRow() === 0) return;
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map(v => String(v).trim());
  if (headers.includes("電子郵件")) return;
  const phoneIndex = headers.indexOf("取件人手機");
  if (phoneIndex < 0) throw Error("找不到取件人手機欄位，請確認標題列");
  sh.insertColumnAfter(phoneIndex + 1);
  sh.getRange(1, phoneIndex + 2).setValue("電子郵件");
}

// 自動移除舊版試算表中的「門市名稱」與「門市地址」欄，保留「取件門市店號」。
function removeStoreNameAddressColumns_(sh) {
  if (sh.getLastRow() < 1 || sh.getLastColumn() < 1) return;
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  const targets = new Set(["門市名稱", "門市地址"]);
  for (let col = headers.length - 1; col >= 0; col--) {
    if (targets.has(String(headers[col]).trim())) sh.deleteColumn(col + 1);
  }
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    ["orderId","recipient","phone","email","storeId","temperature","items","productAmount","shippingFee","totalAmount"].forEach(k => {
      if (d[k] === undefined || d[k] === "") throw Error("缺少欄位：" + k);
    });
    if (!/^\d{10}$/.test(String(d.phone))) throw Error("手機格式錯誤");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.email))) throw Error("電子郵件格式錯誤");
    if (!/^\d{6}$/.test(String(d.storeId))) throw Error("門市店號格式錯誤");
    if (!["常溫","冷凍"].includes(d.temperature)) throw Error("溫層錯誤");

    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sh) throw Error("找不到官網訂單工作表，請先執行 setup()");
    removeStoreNameAddressColumns_(sh);
    ensureEmailColumn_(sh);

    const ids = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues().flat() : [];
    if (ids.includes(String(d.orderId))) throw Error("重複訂單");
    const goods = d.items.map(i => `${i.name}x${i.quantity}`).join("、");

    // 門市只記錄六碼店號，不再寫入門市名稱及地址。
    sh.appendRow([
      String(d.orderId), new Date(d.createdAt || Date.now()), String(d.recipient),
      String(d.phone), String(d.email), String(d.storeId), String(d.temperature), goods,
      Number(d.productAmount), Number(d.shippingFee), String(d.note || ""),
      String(d.social || ""), "新訂單"
    ]);
    try {
      MailApp.sendEmail({
        to: String(d.email),
        subject: "翔安富文具｜訂單成立通知 " + String(d.orderId),
        body: "您好，您的訂單已成立。\n訂單編號：" + d.orderId + "\n商品：" + goods + "\n商品金額：NT$" + d.productAmount + "\n運費：NT$" + d.shippingFee + "\n應付金額：NT$" + d.totalAmount + "\n取件門市店號：" + d.storeId + "\n我們將於出貨狀態更新時再寄送通知。\n翔安富文具"
      });
    } catch (mailErr) { console.error("訂單成立郵件寄送失敗", mailErr); }
    return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ok:false,error:String(err)})).setMimeType(ContentService.MimeType.JSON);
  }
}


// 以手機號碼查詢訂單；回傳精簡訂單資訊。前端使用 JSONP 避免跨網域讀取限制。
function doGet(e) {
  const phone = String(e && e.parameter && e.parameter.phone || "").replace(/\D/g, "");
  const callback = String(e && e.parameter && e.parameter.callback || "").replace(/[^a-zA-Z0-9_.$]/g, "");
  let result;
  try {
    if (!/^\d{10}$/.test(phone)) throw Error("請輸入 10 碼手機號碼");
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sh || sh.getLastRow() < 2) { result = { ok:true, orders:[] }; }
    else {
      const values = sh.getDataRange().getDisplayValues();
      const headers = values[0].map(v => String(v).trim());
      const col = name => headers.indexOf(name);
      const phoneCol = col("取件人手機");
      if (phoneCol < 0) throw Error("試算表找不到取件人手機欄位");
      const orders = values.slice(1).filter(row => String(row[phoneCol]).replace(/\D/g, "") === phone).map(row => ({
        orderId: row[col("訂單編號")] || "", createdAt: row[col("下單時間")] || "", recipient: row[col("取件人姓名")] || "",
        storeId: row[col("取件門市店號")] || "", goods: row[col("商品")] || "", productAmount: row[col("商品金額")] || "",
        shippingFee: row[col("運費金額")] || "", status: row[col("訂單狀態")] || "新訂單"
      })).reverse();
      result = { ok:true, orders:orders };
    }
  } catch (err) { result = { ok:false, error:String(err.message || err) }; }
  const json = JSON.stringify(result);
  return ContentService.createTextOutput(callback ? callback + "(" + json + ");" : json)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}


// 管理員將「訂單狀態」改為「已出貨」時，自動寄送出貨通知。
function onEdit(e) {
  try {
    const sh = e.range.getSheet();
    if (sh.getName() !== SHEET_NAME || e.range.getRow() < 2) return;
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map(v => String(v).trim());
    const statusCol = headers.indexOf("訂單狀態") + 1;
    if (!statusCol || e.range.getColumn() !== statusCol || String(e.value || "").trim() !== "已出貨") return;
    const row = e.range.getRow();
    const emailCol = headers.indexOf("電子郵件") + 1;
    const orderCol = headers.indexOf("訂單編號") + 1;
    const recipientCol = headers.indexOf("取件人姓名") + 1;
    const storeCol = headers.indexOf("取件門市店號") + 1;
    if (!emailCol || !orderCol) return;
    const email = String(sh.getRange(row, emailCol).getDisplayValue()).trim();
    if (!email) return;
    MailApp.sendEmail({
      to: email, subject: "翔安富文具｜您的訂單已出貨",
      body: "您好 " + (sh.getRange(row, recipientCol).getDisplayValue() || "") + "，您的訂單已出貨。\n訂單編號：" + sh.getRange(row, orderCol).getDisplayValue() + "\n取件門市店號：" + sh.getRange(row, storeCol).getDisplayValue() + "\n請留意物流及到店通知。\n翔安富文具"
    });
  } catch (err) { console.error("出貨通知寄送失敗", err); }
}
