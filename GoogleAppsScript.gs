
const SHEET_NAME="官網訂單";
function setup(){
 const ss=SpreadsheetApp.getActiveSpreadsheet();let sh=ss.getSheetByName(SHEET_NAME);
 if(!sh)sh=ss.insertSheet(SHEET_NAME);
 if(sh.getLastRow()===0){sh.appendRow(["訂單編號","下單時間","取件人姓名","取件人手機","取件門市店號","門市名稱","門市地址","溫層","商品","商品金額","運費金額","備註","其他資訊","訂單狀態"]);sh.setFrozenRows(1);}
}
function doPost(e){
 try{
  const d=JSON.parse(e.postData.contents);
  ["orderId","recipient","phone","storeId","temperature","items","productAmount","shippingFee","totalAmount"].forEach(k=>{if(d[k]===undefined||d[k]==="")throw Error("缺少欄位："+k)});
  if(!/^\d{10}$/.test(String(d.phone)))throw Error("手機格式錯誤");
  if(!/^\d{6}$/.test(String(d.storeId)))throw Error("門市店號格式錯誤");
  if(!["常溫","冷凍"].includes(d.temperature))throw Error("溫層錯誤");
  const sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const ids=sh.getLastRow()>1?sh.getRange(2,1,sh.getLastRow()-1,1).getDisplayValues().flat():[];
  if(ids.includes(String(d.orderId)))throw Error("重複訂單");
  const goods=d.items.map(i=>`${i.name}x${i.quantity}`).join("");
  sh.appendRow([String(d.orderId),new Date(d.createdAt||Date.now()),String(d.recipient),String(d.phone),String(d.storeId),String(d.storeName||""),String(d.storeAddress||""),String(d.temperature),goods,Number(d.productAmount),Number(d.shippingFee),String(d.note||""),String(d.social||""),"新訂單"]);
  return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
 }catch(err){return ContentService.createTextOutput(JSON.stringify({ok:false,error:String(err)})).setMimeType(ContentService.MimeType.JSON)}
}
