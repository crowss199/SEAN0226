const SHEET_NAME = "官網訂單";
const DETAIL_SHEET_NAME = "訂單商品明細";
const DETAIL_HEADERS = ["訂單編號","下單時間","商品編號","商品名稱","商品規格","銷售條碼","銷售數量","銷售單價","銷售金額"];
const HEADERS = ["訂單編號","下單時間","取件人姓名","取件人手機","電子郵件","郵件通知狀態","取件門市店號","溫層","商品","商品金額","運費金額","備註","其他資訊","訂單狀態"];

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("請從連結的 Google 試算表開啟 Apps Script 後再執行 setup()。");
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);

  // 全新工作表直接建立完整標題列；既有工作表只補欄，不重排或覆寫訂單資料。
  if (sh.getLastRow() === 0 || sh.getLastColumn() === 0) {
    sh.getRange(1, 1, 1, HEADERS.length + 2).setValues([HEADERS.concat(["出貨通知狀態", "寄件編號", "折扣金額"])]);
    sh.setFrozenRows(1);
  } else {
    removeStoreNameAddressColumns_(sh);
    ensureEmailColumn_(sh);
    ensureMailStatusColumn_(sh);
    repairKnownShipmentHeaderCollision_(sh);
    ensureShipmentStatusColumn_(sh);
    ensureTrackingNumberColumn_(sh);
    ensureDiscountColumn_(sh);
  }

  // 手機與寄件編號固定為純文字，保留開頭的 0 及英數字格式。
  const phoneCol = getHeaderColumn_(sh, "取件人手機");
  if (phoneCol > 0 && sh.getLastRow() >= 1) sh.getRange(1, phoneCol, sh.getLastRow(), 1).setNumberFormat("@");
  const trackingCol = getHeaderColumn_(sh, "寄件編號");
  if (trackingCol > 0 && sh.getLastRow() >= 1) sh.getRange(1, trackingCol, sh.getLastRow(), 1).setNumberFormat("@");

  const required = ["訂單編號", "電子郵件", "出貨通知狀態", "寄件編號"];
  const missing = required.filter(name => getHeaderColumn_(sh, name) < 1);
  if (missing.length) {
    throw new Error("setup() 無法建立必要欄位：" + missing.join("、") + "。請確認「官網訂單」第 1 列是欄位標題，且未合併儲存格。");
  }

  // 建立／補齊逐項商品明細工作表；「銷售條碼」欄存放商品規格的國際條碼。
  ensureOrderDetailSheet_();

  // 觸發郵件授權提示；請由試算表擁有者手動執行 setup() 完成授權。
  MailApp.getRemainingDailyQuota();
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === "onEdit").forEach(t => ScriptApp.deleteTrigger(t));
  sh.setFrozenRows(1);
  ss.toast("欄位檢查完成：出貨通知狀態、寄件編號均已存在。", "翔安富文具", 8);
}

// 標題正規化：忽略前後空格、全形空格及零寬字元，避免標題看似相同卻比對不到。
function normalizeHeader_(value) {
  return String(value == null ? "" : value).replace(/[\uFEFF\u200B\u200C\u200D]/g, "").replace(/[\s　]+/g, "").trim();
}

function readHeaders_(sh) {
  if (sh.getLastColumn() < 1) return [];
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0].map(normalizeHeader_);
}

function getHeaderColumn_(sh, headerName) {
  const headers = readHeaders_(sh);
  return headers.indexOf(normalizeHeader_(headerName)) + 1;
}

// 新欄位直接寫入最後一個已使用欄位的下一欄；不可在 insertColumnAfter() 後再次用 getLastColumn() 定位，
// 因為新插入的空白欄尚未有內容，getLastColumn() 仍可能回傳舊欄號，造成覆蓋「訂單狀態」等既有標題。
function appendHeaderColumn_(sh, headerName, plainText) {
  const existing = getHeaderColumn_(sh, headerName);
  if (existing > 0) return existing;
  const newCol = Math.max(sh.getLastColumn(), 0) + 1;
  if (newCol > sh.getMaxColumns()) sh.insertColumnAfter(sh.getMaxColumns());
  sh.getRange(1, newCol).setValue(headerName);
  if (plainText) sh.getRange(1, newCol, Math.max(sh.getMaxRows(), 1), 1).setNumberFormat("@");
  return newCol;
}

// 修復舊版 setup() 曾把最後一個基本欄位標題覆蓋成出貨欄位名稱的情況。
// 只有在「訂單狀態」標題缺失、其原定第 14 欄標題被覆蓋，且該欄資料內容符合訂單狀態時才還原標題。
function repairKnownShipmentHeaderCollision_(sh) {
  const orderStatusCol = HEADERS.indexOf("訂單狀態") + 1;
  if (orderStatusCol < 1 || sh.getLastColumn() < orderStatusCol) return;
  const headers = readHeaders_(sh);
  if (headers.includes(normalizeHeader_("訂單狀態"))) return;
  const damagedHeader = headers[orderStatusCol - 1];
  if (![normalizeHeader_("出貨通知狀態"), normalizeHeader_("寄件編號")].includes(damagedHeader)) return;
  const dataRows = Math.max(sh.getLastRow() - 1, 0);
  const values = dataRows ? sh.getRange(2, orderStatusCol, dataRows, 1).getDisplayValues().flat().map(v => String(v).trim()).filter(Boolean) : [];
  const knownStatuses = new Set(["新訂單", "已出貨", "已取消", "取消訂單", "待出貨", "未出貨", "處理中", "已完成", "待處理", "待付款", "已付款", "已取貨", "已取件", "已送達", "已退貨", "退貨中"]);
  if (values.length === 0 || values.every(value => knownStatuses.has(value))) {
    sh.getRange(1, orderStatusCol).setValue("訂單狀態");
  }
}

// 舊試算表若尚無電子郵件欄，插入在手機號碼之後，不覆寫既有資料。
function ensureEmailColumn_(sh) {
  if (sh.getLastRow() === 0) return;
  const headers = readHeaders_(sh);
  if (headers.includes(normalizeHeader_("電子郵件"))) return;
  const phoneIndex = headers.indexOf(normalizeHeader_("取件人手機"));
  if (phoneIndex < 0) throw Error("找不到取件人手機欄位，請確認「官網訂單」第 1 列標題");
  sh.insertColumnAfter(phoneIndex + 1);
  sh.getRange(1, phoneIndex + 2).setValue("電子郵件");
}

// 在電子郵件欄後新增郵件通知狀態欄，保留既有訂單資料。
function ensureMailStatusColumn_(sh) {
  if (sh.getLastRow() === 0) return;
  const headers = readHeaders_(sh);
  if (headers.includes(normalizeHeader_("郵件通知狀態"))) return;
  const emailIndex = headers.indexOf(normalizeHeader_("電子郵件"));
  if (emailIndex < 0) throw Error("找不到電子郵件欄位");
  sh.insertColumnAfter(emailIndex + 1);
  sh.getRange(1, emailIndex + 2).setValue("郵件通知狀態");
}

// 新增獨立出貨通知狀態欄，避免與訂單成立通知混淆。
function ensureShipmentStatusColumn_(sh) {
  if (sh.getLastRow() === 0) return;
  appendHeaderColumn_(sh, "出貨通知狀態", false);
}

// 新增寄件編號欄，供出貨通知記錄使用；既有訂單資料不會被覆寫。
function ensureTrackingNumberColumn_(sh) {
  if (sh.getLastRow() === 0) return;
  appendHeaderColumn_(sh, "寄件編號", true);
}

function ensureDiscountColumn_(sh) {
  if (sh.getLastRow() === 0) return;
  appendHeaderColumn_(sh, "折扣金額", false);
}

// 建立或補齊訂單商品明細工作表。保留既有欄位及資料，不重排使用者欄位。
function ensureOrderDetailSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let detail = ss.getSheetByName(DETAIL_SHEET_NAME);
  if (!detail) detail = ss.insertSheet(DETAIL_SHEET_NAME);
  if (detail.getLastRow() === 0 || detail.getLastColumn() === 0) {
    detail.getRange(1, 1, 1, DETAIL_HEADERS.length).setValues([DETAIL_HEADERS]);
  } else {
    let headers = readHeaders_(detail);
    DETAIL_HEADERS.forEach(name => {
      if (!headers.includes(normalizeHeader_(name))) {
        appendHeaderColumn_(detail, name, name === "銷售條碼");
        headers = readHeaders_(detail);
      }
    });
  }
  const headers = readHeaders_(detail);
  const barcodeCol = headers.indexOf(normalizeHeader_("銷售條碼")) + 1;
  if (barcodeCol > 0 && detail.getMaxRows() > 0) {
    detail.getRange(1, barcodeCol, detail.getMaxRows(), 1).setNumberFormat("@");
  }
  detail.setFrozenRows(1);
  return detail;
}

// 每個購買規格各寫一列；銷售條碼來源為結帳頁從 products.json 規格 barcode 帶來的國際條碼。
function appendOrderItemDetails_(order, orderDate) {
  if (!Array.isArray(order.items) || order.items.length === 0) return;
  const detail = ensureOrderDetailSheet_();
  const headers = readHeaders_(detail);
  const col = name => headers.indexOf(normalizeHeader_(name));
  const rows = order.items.map(item => {
    const values = new Array(detail.getLastColumn()).fill("");
    const barcode = String(item.barcode || item.internationalBarcode || item.salesBarcode || "").trim();
    const data = {
      "訂單編號": String(order.orderId || ""),
      "下單時間": orderDate,
      "商品編號": String(item.productCode || item.code || ""),
      "商品名稱": String(item.name || ""),
      "商品規格": String(item.variant || "一般規格"),
      "銷售條碼": barcode,
      "銷售數量": Number(item.quantity || 0),
      "銷售單價": Number(item.unitPrice || 0),
      "銷售金額": Number(item.amount || 0)
    };
    Object.keys(data).forEach(name => {
      const index = col(name);
      if (index >= 0) values[index] = data[name];
    });
    return values;
  });
  const startRow = detail.getLastRow() + 1;
  const barcodeCol = col("銷售條碼") + 1;
  if (barcodeCol > 0) detail.getRange(startRow, barcodeCol, rows.length, 1).setNumberFormat("@");
  detail.getRange(startRow, 1, rows.length, detail.getLastColumn()).setValues(rows);
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu("翔安富文具")
    .addItem("定位目前訂單的寄件編號欄", "selectTrackingCellForSelectedRow")
    .addItem("通知目前選取訂單已出貨", "sendShipmentNotificationForSelectedRow")
    .addToUi();
}

// 將郵件欄位安全轉成 HTML 文字，避免特殊字元影響郵件版面。
function escapeShipmentHtml_(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function(ch) {
    return ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"})[ch];
  });
}

// 將目前選取訂單的游標移到「寄件編號」欄，方便直接在試算表手動輸入。
function selectTrackingCellForSelectedRow() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getActiveSheet();
  const row = sh.getActiveRange() ? sh.getActiveRange().getRow() : 0;
  const ui = SpreadsheetApp.getUi();
  if (sh.getName() !== SHEET_NAME || row < 2) {
    ui.alert("請先到「官網訂單」工作表，點選要出貨的訂單資料列，再執行此功能。");
    return;
  }
  const trackingCol = getHeaderColumn_(sh, "寄件編號");
  if (trackingCol < 1) {
    ui.alert("找不到「寄件編號」欄，請先執行 setup()。");
    return;
  }
  const cell = sh.getRange(row, trackingCol);
  cell.setNumberFormat("@");
  sh.setActiveRange(cell);
  ss.toast("請直接在目前選取的儲存格輸入寄件編號，輸入後再按「通知目前選取訂單已出貨」。", "翔安富文具", 8);
}

// 在「官網訂單」工作表選取一筆訂單資料列，先在「寄件編號」欄輸入編號，再按出貨通知。
function sendShipmentNotificationForSelectedRow() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const row = sh.getActiveRange() ? sh.getActiveRange().getRow() : 0;
  if (sh.getName() !== SHEET_NAME || row < 2) {
    SpreadsheetApp.getUi().alert("請先到「官網訂單」工作表，點選要通知的訂單資料列。");
    return;
  }
  // 先補齊欄位並修復舊版標題覆蓋問題，再讀取欄位位置。
  repairKnownShipmentHeaderCollision_(sh);
  ensureShipmentStatusColumn_(sh);
  ensureTrackingNumberColumn_(sh);
  const headers = readHeaders_(sh);
  const col = name => headers.indexOf(normalizeHeader_(name)) + 1;
  const emailCol=col("電子郵件"), orderCol=col("訂單編號"), recipientCol=col("取件人姓名"), storeCol=col("取件門市店號"), statusCol=col("出貨通知狀態"), trackingCol=col("寄件編號"), orderStatusCol=col("訂單狀態");
  if ([emailCol,orderCol,statusCol,trackingCol].some(v => v < 1)) { SpreadsheetApp.getUi().alert("必要欄位仍不完整。請確認「官網訂單」第 1 列是欄位標題，沒有合併儲存格，再執行新版 setup()。"); return; }
  const email=String(sh.getRange(row,emailCol).getDisplayValue()).trim();
  const orderId=String(sh.getRange(row,orderCol).getDisplayValue()).trim();
  const previous=String(sh.getRange(row,statusCol).getDisplayValue()).trim();
  const infoCol=col("其他資訊");
  let extraInfo={};
  if(infoCol>0){
    const rawInfo=String(sh.getRange(row,infoCol).getDisplayValue()||"").trim();
    try{extraInfo=rawInfo?JSON.parse(rawInfo):{};}catch(_){extraInfo={};}
  }
  // 相容不同版本曾使用的欄位名稱或巢狀資料格式。
  const legacyStoreNameCol = col("取件門市名稱") || col("門市名稱");
  const legacyStoreAddressCol = col("取件門市地址") || col("門市地址");
  const storeId=storeCol>0?String(sh.getRange(row,storeCol).getDisplayValue()||"").trim():"";
  const storeName=String(extraInfo.storeName || extraInfo.store_name || (extraInfo.store && extraInfo.store.name) || (legacyStoreNameCol>0?sh.getRange(row,legacyStoreNameCol).getDisplayValue():"") || "").trim();
  const storeAddress=String(extraInfo.storeAddress || extraInfo.store_address || (extraInfo.store && extraInfo.store.address) || (legacyStoreAddressCol>0?sh.getRange(row,legacyStoreAddressCol).getDisplayValue():"") || "").trim();
  if (!email || !orderId) { SpreadsheetApp.getUi().alert("此訂單缺少電子郵件或訂單編號，無法寄送。"); return; }
  // 寄件編號直接從目前訂單的試算表儲存格讀取，不再使用彈出輸入視窗。
  const trackingCell = sh.getRange(row, trackingCol);
  const trackingNumber = String(trackingCell.getDisplayValue() || "").trim();
  if (!trackingNumber) {
    sh.setActiveRange(trackingCell);
    SpreadsheetApp.getUi().alert("尚未輸入寄件編號。已將游標移到本筆訂單的「寄件編號」欄，請輸入編號後，再按一次「通知目前選取訂單已出貨」。");
    return;
  }
  if (previous.indexOf("已寄送") === 0) {
    const answer = SpreadsheetApp.getUi().alert("此訂單已寄送過出貨通知。是否仍要再次寄送？", SpreadsheetApp.getUi().ButtonSet.YES_NO);
    if (answer !== SpreadsheetApp.getUi().Button.YES) return;
  }
  const ui = SpreadsheetApp.getUi();
  // 保持寄件編號欄為純文字，避免開頭的 0 或英文字母被轉換。
  trackingCell.setNumberFormat("@");
  try {
    const recipient = recipientCol>0 ? String(sh.getRange(row,recipientCol).getDisplayValue() || "").trim() : "顧客";
    const displayStoreName = storeName || "（訂單未保存門市名稱）";
    const displayStoreAddress = storeAddress || "（訂單未保存門市地址）";
    const displayStoreId = storeId || "（無資料）";
    const body = "您好 " + recipient + "，您的訂單已出貨。\n\n" +
      "訂單編號：" + orderId + "\n" +
      "7-11取件門市名稱：" + displayStoreName + "\n" +
      "7-11取件門市編號：" + displayStoreId + "\n" +
      "7-11取件門市地址：" + displayStoreAddress + "\n" +
      "寄件編號：" + trackingNumber + "\n" +
      "7-ELEVEN物流查詢：https://eservice.7-11.com.tw/e-tracking/search.aspx\n\n" +
      "請開啟查詢頁並輸入寄件編號，即可查看配送進度。\n翔安富文具";
    const htmlBody = '<div style="font-family:Arial,Microsoft JhengHei,sans-serif;line-height:1.8;color:#222;max-width:620px">' +
      '<h2 style="font-size:20px">您的訂單已出貨</h2>' +
      '<p>您好 ' + escapeShipmentHtml_(recipient) + '，您的訂單已出貨。</p>' +
      '<div style="border:1px solid #ddd;border-radius:8px;padding:16px;margin:16px 0">' +
      '<p><strong>訂單編號：</strong>' + escapeShipmentHtml_(orderId) + '</p>' +
      '<p><strong>7-11取件門市名稱：</strong>' + escapeShipmentHtml_(displayStoreName) + '</p>' +
      '<p><strong>7-11取件門市編號：</strong>' + escapeShipmentHtml_(displayStoreId) + '</p>' +
      '<p><strong>7-11取件門市地址：</strong>' + escapeShipmentHtml_(displayStoreAddress) + '</p>' +
      '<p><strong>寄件編號：</strong>' + escapeShipmentHtml_(trackingNumber) + '</p>' +
      '</div><p><a href="https://eservice.7-11.com.tw/e-tracking/search.aspx" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#087a42;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">前往 7-ELEVEN 物流查詢</a></p>' +
      '<p>開啟查詢頁後，請輸入上方寄件編號查詢配送進度。</p><p>翔安富文具</p></div>';
    MailApp.sendEmail({to:email,subject:"翔安富文具｜您的訂單已出貨 " + orderId,body:body,htmlBody:htmlBody});
    sh.getRange(row,statusCol).setValue("已寄送 " + new Date().toLocaleString("zh-TW") + "｜寄件編號：" + trackingNumber);
    if (orderStatusCol > 0) sh.getRange(row,orderStatusCol).setValue("已出貨");
    ui.alert("出貨通知已寄送至：" + email + "\n寄件編號：" + trackingNumber);
  } catch(err) {
    sh.getRange(row,statusCol).setValue("寄送失敗：" + String(err.message || err).slice(0,120));
    SpreadsheetApp.getUi().alert("寄送失敗：" + String(err.message || err));
  }
}

// 自動移除舊版試算表中的「門市名稱」與「門市地址」欄，保留「取件門市店號」。
function removeStoreNameAddressColumns_(sh) {
  if (sh.getLastRow() < 1 || sh.getLastColumn() < 1) return;
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  const targets = new Set(["門市名稱", "門市地址"]);
  for (let col = headers.length - 1; col >= 0; col--) {
    if (targets.has(normalizeHeader_(headers[col]))) sh.deleteColumn(col + 1);
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
    ensureMailStatusColumn_(sh);
    repairKnownShipmentHeaderCollision_(sh);
    ensureShipmentStatusColumn_(sh);
    ensureTrackingNumberColumn_(sh);
    ensureDiscountColumn_(sh);
    ensureOrderDetailSheet_();

    const ids = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues().flat() : [];
    if (ids.includes(String(d.orderId))) throw Error("重複訂單");
    const goods = d.items.map(i => `${i.name}x${i.quantity}`).join("、");

    // 門市只記錄六碼店號，不再寫入門市名稱及地址。
    // 先將手機欄設為純文字，再寫入完整字串，保留開頭的 0。
    const newRow = sh.getLastRow() + 1;
    const phoneCol = HEADERS.indexOf("取件人手機") + 1;
    const trackingNumberCol = getHeaderColumn_(sh, "寄件編號");
    sh.getRange(newRow, phoneCol).setNumberFormat("@");
    if (trackingNumberCol > 0) sh.getRange(newRow, trackingNumberCol).setNumberFormat("@");
    const orderDate = new Date(d.createdAt || Date.now());
    sh.getRange(newRow, 1, 1, HEADERS.length).setValues([[
      String(d.orderId), orderDate, String(d.recipient),
      String(d.phone), String(d.email), "待寄送", String(d.storeId), String(d.temperature), goods,
      Number(d.productAmount), Number(d.shippingFee), String(d.note || ""),
      JSON.stringify({social:String(d.social || ""),storeName:String(d.storeName || ""),storeAddress:String(d.storeAddress || ""),discountAmount:Math.max(0,Number(d.discountAmount)||0),discountThreshold:Math.max(0,Number(d.discountThreshold)||0),discountPercent:Math.max(0,Number(d.discountPercent)||0)}), "新訂單"
    ]]);
    const discountCol=getHeaderColumn_(sh,"折扣金額");
    if(discountCol>0)sh.getRange(newRow,discountCol).setValue(Math.max(0,Number(d.discountAmount)||0));
    appendOrderItemDetails_(d, orderDate);
    let mailStatus = "寄送失敗";
    try {
      const displayStoreName = String(d.storeName || "（未提供門市名稱）").trim();
      const displayStoreId = String(d.storeId || "（未提供門市編號）").trim();
      const displayStoreAddress = String(d.storeAddress || "（未提供門市地址）").trim();
      const orderMailBody = "您好，您的訂單已成立。\n" +
        "訂單編號：" + d.orderId + "\n" +
        "商品：" + goods + "\n" +
        "商品金額：NT$" + d.productAmount + "\n" +
        "滿額折扣（" + (Number(d.discountPercent)||0) + "%）：-NT$" + (Number(d.discountAmount)||0) + "\n" +
        "運費：NT$" + d.shippingFee + "\n" +
        "應付金額：NT$" + d.totalAmount + "\n\n" +
        "7-11取件門市名稱：" + displayStoreName + "\n" +
        "7-11取件門市編號：" + displayStoreId + "\n" +
        "7-11取件門市地址：" + displayStoreAddress + "\n\n" +
        "我們將於出貨狀態更新時再寄送通知。\n翔安富文具";
      const orderMailHtml = '<div style="font-family:Arial,Microsoft JhengHei,sans-serif;line-height:1.8;color:#222;max-width:620px">' +
        '<h2 style="font-size:20px">您的訂單已成立</h2>' +
        '<p>您好，您的訂單已成立。</p>' +
        '<div style="border:1px solid #ddd;border-radius:8px;padding:16px;margin:16px 0">' +
        '<p><strong>訂單編號：</strong>' + escapeShipmentHtml_(d.orderId) + '</p>' +
        '<p><strong>商品：</strong>' + escapeShipmentHtml_(goods) + '</p>' +
        '<p><strong>商品金額：</strong>NT$' + escapeShipmentHtml_(d.productAmount) + '</p>' +
        '<p><strong>滿額折扣（' + escapeShipmentHtml_(Number(d.discountPercent)||0) + '%）：</strong>-NT$' + escapeShipmentHtml_(Number(d.discountAmount)||0) + '</p>' +
        '<p><strong>運費：</strong>NT$' + escapeShipmentHtml_(d.shippingFee) + '</p>' +
        '<p><strong>應付金額：</strong>NT$' + escapeShipmentHtml_(d.totalAmount) + '</p>' +
        '<hr style="border:0;border-top:1px solid #eee;margin:14px 0">' +
        '<p><strong>7-11取件門市名稱：</strong>' + escapeShipmentHtml_(displayStoreName) + '</p>' +
        '<p><strong>7-11取件門市編號：</strong>' + escapeShipmentHtml_(displayStoreId) + '</p>' +
        '<p><strong>7-11取件門市地址：</strong>' + escapeShipmentHtml_(displayStoreAddress) + '</p>' +
        '</div><p>我們將於出貨狀態更新時再寄送通知。</p><p>翔安富文具</p></div>';
      MailApp.sendEmail({
        to: String(d.email).trim(),
        subject: "翔安富文具｜訂單成立通知 " + String(d.orderId),
        body: orderMailBody,
        htmlBody: orderMailHtml
      });
      mailStatus = "已提交寄送";
    } catch (mailErr) {
      mailStatus = "寄送失敗：" + String(mailErr.message || mailErr).slice(0, 180);
      console.error("訂單成立郵件寄送失敗", mailErr);
    }
    const mailStatusCol = HEADERS.indexOf("郵件通知狀態") + 1;
    sh.getRange(newRow, mailStatusCol).setValue(mailStatus);
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


// 出貨通知改為手動按選單寄送，避免修改狀態時意外重複寄信。
