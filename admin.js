const $=id=>document.getElementById(id),MALL="#";let products=[];


// Upload product image locally and embed it in products.json as a data URL.
let selectedProductImage="";
function readImageFile(file,maxBytes=1500000){
 return new Promise((resolve,reject)=>{
  if(!file||!file.type.startsWith("image/"))return reject(Error("請選擇圖片檔案。"));
  if(file.size>maxBytes)return reject(Error("圖片太大，請壓縮至 1.5 MB 以下。"));
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result));
  reader.onerror=()=>reject(Error("圖片讀取失敗。"));
  reader.readAsDataURL(file);
 });
}
$("image-file").addEventListener("change",async e=>{
 const file=e.target.files[0];if(!file)return;
 try{
  selectedProductImage=await readImageFile(file);
  $("image").value=selectedProductImage;
  $("image-preview").hidden=false;
  $("image-preview").innerHTML=`<img alt="商品圖片預覽" src="${selectedProductImage}">`;
  $("status").textContent="商品圖片已載入，提交商品後會一併放入 products.json。";
 }catch(err){$("status").textContent=err.message}
});

const AUTH_KEY="xiangAnAdminSession";
function showAdmin(){ $("login-panel").hidden=true;$("admin-app").hidden=false;loadProducts();loadOrders();loadAnnouncementAdmin();loadSiteSettingsAdmin();loadStoreAdmin();loadFaqAdmin();}
function logout(){sessionStorage.removeItem(AUTH_KEY);$("admin-app").hidden=true;$("login-panel").hidden=false;$("password").value="";$("admin-id").value="";}
$("login-form").addEventListener("submit",e=>{
 e.preventDefault();
 const configuredId=String(window.ADMIN_ID??"").trim();
 const configuredPassword=String(window.ADMIN_PASSWORD??"").trim();
 const enteredId=String($("admin-id").value??"").trim();
 const enteredPassword=String($("password").value??"").trim();
 if(!configuredId || !configuredPassword){
  $("login-error").textContent="管理員 ID 或密碼尚未設定，請檢查 admin-config.js。";
  return;
 }
 if(enteredId===configuredId && enteredPassword===configuredPassword){
  sessionStorage.setItem(AUTH_KEY,"yes");
  $("login-error").textContent="";
  showAdmin();
 }else{
  $("login-error").textContent="管理員 ID 或密碼錯誤，請重新確認。";
 }
});
$("toggle-password").addEventListener("click",()=>{
 const input=$("password"),button=$("toggle-password");
 const visible=input.type==="text";
 input.type=visible?"password":"text";
 button.textContent=visible?"顯示":"隱藏";
});
$("logout").addEventListener("click",logout);
const fields=["name","brand","function-category","desc","image","url"];
function normalizeProduct(p){
 const source=Array.isArray(p.variants)&&p.variants.length?p.variants:[{name:"一般規格",stock:p.stock===undefined?null:p.stock,price:p.price}];
 return {...p,variants:source.map((v,i)=>{
  const rawPrice=v.price===undefined||v.price===null||v.price===""?p.price:v.price;
  const price=Number(rawPrice);
  const rawStock=v.stock;
  return {...v,name:String(v.name||("規格"+(i+1))),barcode:String(v.barcode||v.internationalBarcode||""),price:Number.isFinite(price)&&price>=0?price:0,stock:rawStock===null||rawStock===undefined||rawStock===""?null:Math.max(0,Number(rawStock)||0)};
 })};
}
function readVariantRows(){
 return [...$("variant-rows").querySelectorAll(".variant-row")].map(r=>{
  const stockValue=r.querySelector(".variant-stock").value.trim();
  const priceValue=r.querySelector(".variant-price").value.trim();
  return {name:r.querySelector(".variant-name").value.trim(),barcode:r.querySelector(".variant-barcode").value.trim(),price:priceValue===""?NaN:Number(priceValue),stock:stockValue===""?null:Math.max(0,Number(stockValue)||0)};
 });
}
function variantRows(list=[{name:"一般規格",barcode:"",price:"",stock:0}]){
 $("variant-rows").innerHTML=list.map((v,i)=>`<div class="variant-row"><label>規格名稱<input class="variant-name" maxlength="60" required value="${esc(v.name)}" placeholder="例如：0.5mm 黑色"></label><label>國際條碼（選填）<input class="variant-barcode" inputmode="numeric" maxlength="32" value="${esc(v.barcode||"")}" placeholder="例如：4710000000000"></label><label>規格價格（元）<input class="variant-price" type="number" min="0" step="1" required value="${v.price===undefined||v.price===null?"":esc(v.price)}" placeholder="例如：45"></label><label>庫存數量<input class="variant-stock" type="number" min="0" step="1" value="${v.stock===null||v.stock===undefined?0:esc(v.stock)}" placeholder="例如：20"></label><button type="button" class="delete remove-variant" aria-label="刪除此規格" ${list.length===1?"disabled":""}>刪除</button></div>`).join("");
}
$("add-variant").addEventListener("click",()=>{
 const list=readVariantRows();list.push({name:"",barcode:"",price:"",stock:0});variantRows(list);
});
$("variant-rows").addEventListener("click",e=>{
 if(!e.target.closest(".remove-variant"))return;
 const rows=readVariantRows();if(rows.length<=1)return;
 const index=[...$("variant-rows").querySelectorAll(".variant-row")].indexOf(e.target.closest(".variant-row"));
 rows.splice(index,1);variantRows(rows);
});
async function loadProducts(){
 let onlineLoaded=false;
 try{const r=await fetch("./products.json",{cache:"no-store"});if(!r.ok)throw Error();const data=await r.json();if(!Array.isArray(data))throw Error();products=data.map(normalizeProduct);onlineLoaded=true;}
 catch{products=[];$("status").textContent="無法讀取 products.json；可按匯入按鈕載入商品資料。";}
 try{
  // 線上商品檔為空代表已清空商品，不可再用舊的本機草稿復原。
  if(onlineLoaded && products.length===0){localStorage.removeItem("xiangAnProductDraft");}
  const draft=(onlineLoaded && products.length===0)?null:localStorage.getItem("xiangAnProductDraft");
  if(draft){
   const parsed=JSON.parse(draft);
   if(Array.isArray(parsed)){
    const draftProducts=parsed.map(normalizeProduct);
    const same=JSON.stringify(draftProducts)===JSON.stringify(products);
    if(!onlineLoaded){products=draftProducts;$("status").textContent="目前無法讀取線上商品檔，已載入本機草稿。請確認商品資料後再下載更新檔。";}
    else if(!same){
     const useDraft=confirm("發現上次尚未下載的本機商品草稿。載入草稿可能覆蓋目前 GitHub 的最新商品資料。\n\n按「確定」載入本機草稿；按「取消」保留目前線上 products.json 商品資料並刪除舊草稿。");
     if(useDraft){products=draftProducts;$("status").textContent="已載入本機未下載草稿。確認商品資料後，請下載更新檔。";}
     else{localStorage.removeItem("xiangAnProductDraft");$("status").textContent="已保留目前線上 products.json 商品資料，未載入舊草稿。";}
    }
   }
  }
 }catch(err){console.warn("本機商品草稿讀取失敗",err)}
 render();
}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function saveProductDraft(){try{localStorage.setItem("xiangAnProductDraft",JSON.stringify(products));}catch{}}
function downloadProducts(message="已下載 products.json，請上傳到 GitHub Repository 根目錄並覆蓋舊檔。"){
 const blob=new Blob([JSON.stringify(products,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="products.json";document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 $("status").textContent=message;
}
const selectedProductIds=new Set();
function updateBulkDeleteUI(){
 const count=selectedProductIds.size;
 $("selected-product-count").textContent=`已選取 ${count} 件`;
 $("bulk-delete-products").disabled=count===0;
 $("select-all-products").checked=products.length>0&&products.every(p=>selectedProductIds.has(String(p.id)));
 $("select-all-products").indeterminate=count>0&&!$("select-all-products").checked;
}
function render(){
 $("count").textContent=`（${products.length} 件）`;
 for(const id of [...selectedProductIds])if(!products.some(p=>String(p.id)===id))selectedProductIds.delete(id);
 $("product-list").innerHTML=products.length?products.map(p=>`<div class="product-row"><label class="product-select"><input type="checkbox" data-select-product="${esc(p.id)}" ${selectedProductIds.has(String(p.id))?"checked":""} aria-label="勾選${esc(p.name)}"> </label><div class="product-info"><strong>${esc(p.name)}</strong><small>${esc(p.brand||"未分類廠牌")}｜${esc(p.functionCategory||"未分類功能")}　${esc(p.desc||"")}<br>${p.variants.map(v=>`${esc(v.name)}：NT$ ${Number(v.price??p.price??0).toLocaleString("zh-TW")}`).join("　／　")}</small></div><div class="row-actions"><button class="light" data-edit="${p.id}">修改</button><button class="delete" data-delete="${p.id}">刪除</button></div></div>`).join(""):'<p class="hint">目前沒有商品，請使用上方表單新增。</p>';
 updateBulkDeleteUI();
}
function reset(){
 $("product-form").reset();selectedProductImage="";$("image-preview").hidden=true;$("image-preview").innerHTML="";
 $("edit-id").value="";$("form-title").textContent="新增商品";$("submit-btn").textContent="＋ 加入商品清單";$("cancel-edit").hidden=true;
 variantRows([{name:"一般規格",barcode:"",price:"",stock:0}]);
}
$("product-form").addEventListener("submit",e=>{
 e.preventDefault();
 const id=Number($("edit-id").value)||Math.max(0,...products.map(p=>Number(p.id)||0))+1;
 const variants=readVariantRows();
 if(!variants.length||variants.some(v=>!v.name||!Number.isInteger(v.price)||v.price<0)){$("status").textContent="請填寫每個規格名稱及有效的價格（0 元以上整數）。";return}
 const existing=products.find(x=>Number(x.id)===id)||{};
 const p={...existing,id,brand:$("brand").value.trim(),functionCategory:$("function-category").value.trim(),name:$("name").value.trim(),price:variants[0].price,desc:$("desc").value.trim(),image:$("image").value.trim(),url:$("url").value.trim(),category:existing.category||"writing",variants};
 if(!p.name){$("status").textContent="請填寫商品名稱。";return}
 let i=products.findIndex(x=>Number(x.id)===id);i>=0?products[i]=p:products.push(p);
 reset();render();saveProductDraft();$("status").textContent="商品已儲存。可繼續新增或修改其他商品，全部完成後再按「下載更新檔」一次下載 products.json。";
});
$("product-list").addEventListener("change",e=>{
 const box=e.target.closest("[data-select-product]");if(!box)return;
 const id=String(box.dataset.selectProduct);box.checked?selectedProductIds.add(id):selectedProductIds.delete(id);updateBulkDeleteUI();
});
$("select-all-products").addEventListener("change",e=>{
 selectedProductIds.clear();if(e.target.checked)products.forEach(p=>selectedProductIds.add(String(p.id)));render();
});
$("bulk-delete-products").addEventListener("click",()=>{
 const ids=new Set(selectedProductIds);if(!ids.size)return;
 const targets=products.filter(p=>ids.has(String(p.id)));
 if(!confirm(`確定批次刪除已勾選的 ${targets.length} 件商品？此操作會從目前商品資料中移除，請確認後再下載 products.json 並上傳 GitHub。`))return;
 products=products.filter(p=>!ids.has(String(p.id)));selectedProductIds.clear();
 if(ids.has(String($("edit-id").value)))reset();
 render();saveProductDraft();$("status").textContent=`已批次刪除 ${targets.length} 件商品。請按「下載更新檔」下載 products.json，再上傳 GitHub 根目錄才會正式生效。`;
});
$("product-list").addEventListener("click",e=>{
 let eb=e.target.closest("[data-edit]"),db=e.target.closest("[data-delete]");
 if(eb){
  let p=products.find(x=>Number(x.id)===Number(eb.dataset.edit));if(!p)return;
  fields.forEach(k=>{const value=p[k==="function-category"?"functionCategory":k];$(k).value=(k==="url"&&value==="#")?"":(value??"")});
  $("edit-id").value=p.id;$("form-title").textContent="修改商品";$("submit-btn").textContent="儲存修改";$("cancel-edit").hidden=false;
  variantRows(p.variants||[{name:"一般規格",barcode:"",price:p.price??0,stock:null}]);const editTarget=$("form-title");const top=editTarget.getBoundingClientRect().top+window.pageYOffset-90;window.scrollTo({top:Math.max(0,top),behavior:"smooth"});setTimeout(()=>{$("name").focus({preventScroll:true});},450);
 }
 if(db){
  let id=Number(db.dataset.delete),p=products.find(x=>Number(x.id)===id);
  if(p&&confirm(`確定刪除「${p.name}」？刪除後請下載 products.json 並上傳 GitHub 才會正式移除。`)){
   products=products.filter(p=>Number(p.id)!==id);if(Number($("edit-id").value)===id)reset();render();saveProductDraft();$("status").textContent="商品已刪除。可繼續修改其他商品，全部完成後再按「下載更新檔」一次下載 products.json。";
  }
 }
});
$("cancel-edit").onclick=reset;
$("download-btn").onclick=()=>downloadProducts("已一次下載目前全部商品修改的 products.json。請另存新檔備份，並上傳 GitHub 根目錄覆蓋舊檔。");
$("import-btn").onclick=()=>$("import-file").click();
$("import-file").onchange=async e=>{
 let f=e.target.files[0];if(!f)return;
 try{let data=JSON.parse(await f.text());if(!Array.isArray(data))throw Error();if(!confirm("匯入 products.json 會以檔案內容取代目前管理頁載入的整份商品清單。建議先下載備份。確定要取代嗎？"))return;products=data.map(normalizeProduct);render();saveProductDraft();$("status").textContent="匯入成功。請確認商品資料後，再下載更新檔。"}
 catch{$("status").textContent="匯入失敗，請選擇正確的 products.json。"}
 e.target.value="";
};
variantRows([{name:"一般規格",barcode:"",price:"",stock:0}]);

// 商品庫存試算表匯入：以每個規格的國際條碼對應庫存，只修改 variants[].stock。
const inventoryBarcodeAliases=["國際條碼","商品國際條碼","商品條碼","條碼","條碼號碼","EAN","EAN13","EAN-13","UPC","Barcode","Barcode No","Barcode Number","GTIN"];
const inventoryStockAliases=["庫存","庫存量","庫存數量","現有庫存","可用庫存","實際庫存","商品庫存","目前庫存","Stock","Qty","Quantity","Available","On Hand"];
let inventorySourceRows=[],inventoryHeaders=[],inventorySourceName="",inventoryHeaderAt=-1;
function normalizeInventoryBarcode(value){return String(value??"").trim().replace(/^'+/,"").replace(/[\s　-]/g,"").toUpperCase()}
// 從公開 Google 試算表指定的「庫存」工作表讀取 A 欄國際條碼及 D 欄庫存數。
const INVENTORY_SHEET_ID="1NBtKCn8Z4HNASak8g4EFGLNocnAYtR_mOIy-S_nU2e8";
let googleSheetCallbackSeq=0;
function loadPublicGoogleInventory(){
 return new Promise((resolve,reject)=>{
  const callbackName="__xiangAnInventoryCallback"+(++googleSheetCallbackSeq);
  const script=document.createElement("script");let settled=false;
  const cleanup=()=>{if(script.parentNode)script.parentNode.removeChild(script);try{delete window[callbackName]}catch{window[callbackName]=undefined}};
  const finish=(fn,value)=>{if(settled)return;settled=true;clearTimeout(timer);cleanup();fn(value)};
  window[callbackName]=response=>{
   if(!response||response.status!=="ok"||!response.table){finish(reject,new Error("Google 試算表未能回傳資料。請確認已將檔案設為「知道連結的任何人－檢視者」，且工作表名稱為「庫存」。"));return;}
   const rows=(response.table.rows||[]).map(row=>{
    const cells=row.c||[];
    const cellValue=(index)=>{const cell=cells[index];if(!cell)return "";return cell.f!==null&&cell.f!==undefined&&String(cell.f).trim()!==""?cell.f:(cell.v??"")};
    return [cellValue(0),"","",cellValue(3)];
   }).filter(row=>String(row[0]).trim()!==""||String(row[3]).trim()!=="");
   if(!rows.length){finish(reject,new Error("已連線，但「庫存」工作表 A、D 欄沒有可同步的資料。請確認第一列是欄位名稱，資料從第二列開始。"));return;}
   finish(resolve,rows);
  };
  const timer=setTimeout(()=>finish(reject,new Error("連線逾時。請確認試算表已公開為檢視者，並稍後再試。")),20000);
  const params=new URLSearchParams({sheet:"庫存",tqx:"out:json;responseHandler:"+callbackName});
  script.onerror=()=>finish(reject,new Error("無法讀取 Google 試算表。請檢查公開分享權限及網路連線。"));
  script.src="https://docs.google.com/spreadsheets/d/"+INVENTORY_SHEET_ID+"/gviz/tq?"+params.toString();
  document.head.appendChild(script);
 });
}
function inventoryHeaderScore(cells){
 const labels=cells.map(v=>norm(v));
 const barcode=labels.some(h=>inventoryBarcodeAliases.some(a=>h===norm(a)||h.includes(norm(a))));
 const stock=labels.some(h=>inventoryStockAliases.some(a=>h===norm(a)||h.includes(norm(a))));
 return (barcode?1:0)+(stock?1:0);
}
function findInventoryHeader(matrix){let best=-1,score=0;for(let i=0;i<Math.min(matrix.length,20);i++){const n=inventoryHeaderScore(matrix[i]);if(n>score){score=n;best=i;}if(n===2)break;}return score===2?best:-1}
function inventoryColumnOptions(){return inventoryHeaders.map((h,i)=>`<option value="${i}">${esc(h||`第${i+1}欄（未命名）`)}（第 ${i+1} 欄）</option>`).join("")}
function autoInventoryColumn(aliases){return inventoryHeaders.findIndex(h=>aliases.some(a=>norm(h)===norm(a)))>=0?inventoryHeaders.findIndex(h=>aliases.some(a=>norm(h)===norm(a))):inventoryHeaders.findIndex(h=>aliases.some(a=>norm(h).includes(norm(a))))}
function readInventoryStock(value){const s=String(value??"").trim().replace(/[，,\s　]/g,"");if(!s)return null;const n=Number(s);return Number.isInteger(n)&&n>=0?n:null}
function inventoryReport(){
 const barcodeCol=Number($("inventory-barcode-col").value),stockCol=Number($("inventory-stock-col").value);
 const imported=new Map();let invalid=0,blank=0;
 for(const row of inventorySourceRows){const barcode=normalizeInventoryBarcode(row[barcodeCol]);if(!barcode){blank++;continue;}const stock=readInventoryStock(row[stockCol]);if(stock===null){invalid++;continue;}if(!imported.has(barcode))imported.set(barcode,[]);imported.get(barcode).push(stock);}
 const website=new Map();for(const product of products)for(const variant of (product.variants||[])){const barcode=normalizeInventoryBarcode(variant.barcode);if(!barcode)continue;if(!website.has(barcode))website.set(barcode,[]);website.get(barcode).push({product,variant});}
 const plans=[],duplicateSource=[],duplicateWebsite=[],unmatched=[];
 for(const [barcode,stocks] of imported){if(stocks.length!==1){duplicateSource.push(barcode);continue;}const hits=website.get(barcode)||[];if(!hits.length){unmatched.push(barcode);continue;}if(hits.length!==1){duplicateWebsite.push(barcode);continue;}plans.push({barcode,stock:stocks[0],product:hits[0].product,variant:hits[0].variant});}
 return {plans,invalid,blank,duplicateSource,duplicateWebsite,unmatched,sourceCount:inventorySourceRows.length,validCount:imported.size};
}
function renderInventoryPreview(){
 const report=inventoryReport();const rows=inventorySourceRows.slice(0,8);const bcCol=Number($("inventory-barcode-col").value),stCol=Number($("inventory-stock-col").value);
 $("inventory-preview").querySelector("thead").innerHTML="<tr><th>國際條碼</th><th>試算表庫存</th><th>比對結果</th></tr>";
 $("inventory-preview").querySelector("tbody").innerHTML=rows.map(row=>{const bc=normalizeInventoryBarcode(row[bcCol]),stock=readInventoryStock(row[stCol]);const p=report.plans.find(x=>x.barcode===bc);let status=!bc?"缺少條碼":stock===null?"庫存不是非負整數":p?`匹配：${p.product.name}／${p.variant.name}`:report.duplicateSource.includes(bc)?"試算表條碼重複（略過）":report.duplicateWebsite.includes(bc)?"官網條碼重複（略過）":"官網找不到此條碼";return `<tr><td>${esc(bc)}</td><td>${stock===null?esc(row[stCol]):stock}</td><td>${esc(status)}</td></tr>`}).join("");
 $("inventory-summary").innerHTML=`<strong>讀取 ${report.sourceCount} 筆資料</strong>　可更新 <strong>${report.plans.length}</strong> 個官網規格　找不到條碼 ${report.unmatched.length} 筆　試算表重複 ${report.duplicateSource.length} 筆　官網條碼重複 ${report.duplicateWebsite.length} 筆　庫存格式錯誤 ${report.invalid} 筆`;
 $("inventory-sync-btn").disabled=report.plans.length===0;
 $("inventory-status").textContent=`預覽前 ${Math.min(8,rows.length)} 筆。套用時只會更新唯一匹配的國際條碼。`;
}
$("inventory-google-sync")?.addEventListener("click",async()=>{
 const button=$("inventory-google-sync");button.disabled=true;button.textContent="正在讀取 Google 試算表…";
 $("inventory-status").textContent="正在連線至公開試算表的「庫存」工作表，讀取 A 欄國際條碼及 D 欄庫存數。";
 try{
  const rows=await loadPublicGoogleInventory();
  inventoryHeaders=["國際條碼","欄B","欄C","庫存數"];
  inventorySourceRows=rows;inventorySourceName="Google 試算表－庫存";inventoryHeaderAt=0;
  $("inventory-barcode-col").innerHTML=inventoryColumnOptions();$("inventory-stock-col").innerHTML=inventoryColumnOptions();
  $("inventory-barcode-col").value="0";$("inventory-stock-col").value="3";
  $("inventory-mapping-area").hidden=false;renderInventoryPreview();
  $("inventory-status").textContent=`已讀取 Google 試算表「庫存」工作表，共 ${rows.length} 筆；固定使用 A 欄國際條碼及 D 欄庫存數。請確認預覽後按「套用匹配庫存至官網商品」。`;
 }catch(err){$("inventory-status").textContent=err.message||"讀取 Google 試算表失敗。";}
 finally{button.disabled=false;button.textContent="從 Google 試算表「庫存」工作表讀取";}
});
$("inventory-file")?.addEventListener("change",async e=>{
 const file=e.target.files[0];if(!file)return;
 try{
  if(!window.XLSX)throw Error("Excel／CSV 讀取元件載入失敗，請重新整理管理頁後再試。");
  const workbook=XLSX.read(await file.arrayBuffer(),{type:"array",cellDates:false});if(!workbook.SheetNames.length)throw Error("檔案沒有工作表。");
  const matrix=XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]],{header:1,defval:"",raw:false});if(!matrix.length)throw Error("第一個工作表沒有資料。");
  inventoryHeaderAt=findInventoryHeader(matrix);if(inventoryHeaderAt<0)throw Error("前 20 列找不到同時包含「國際條碼」及「庫存」的標題列。請確認第一個工作表有這兩個欄位名稱。");
  inventoryHeaders=matrix[inventoryHeaderAt].map((v,i)=>String(v??"").trim()||`第${i+1}欄`);
  inventorySourceRows=matrix.slice(inventoryHeaderAt+1).filter(r=>r.some(v=>String(v??"").trim()));inventorySourceName=file.name;
  if(!inventorySourceRows.length)throw Error("欄位標題下方沒有庫存資料。");
  const bc=autoInventoryColumn(inventoryBarcodeAliases),st=autoInventoryColumn(inventoryStockAliases);
  $("inventory-barcode-col").innerHTML=inventoryColumnOptions();$("inventory-stock-col").innerHTML=inventoryColumnOptions();
  $("inventory-barcode-col").value=String(bc>=0?bc:0);$("inventory-stock-col").value=String(st>=0?st:Math.min(1,inventoryHeaders.length-1));
  $("inventory-mapping-area").hidden=false;renderInventoryPreview();
  $("inventory-status").textContent=`已載入：${inventorySourceName}（工作表：${workbook.SheetNames[0]}）。請檢查欄位對應與預覽結果。`;
 }catch(err){$("inventory-mapping-area").hidden=true;$("inventory-status").textContent=err.message||"庫存試算表讀取失敗。";}
 e.target.value="";
});
$("inventory-barcode-col")?.addEventListener("change",renderInventoryPreview);
$("inventory-stock-col")?.addEventListener("change",renderInventoryPreview);
$("inventory-sync-btn")?.addEventListener("click",()=>{
 const report=inventoryReport();if(!report.plans.length){$("inventory-status").textContent="沒有可套用的唯一條碼匹配資料。";return;}
 if(!confirm(`準備更新 ${report.plans.length} 個官網商品規格的庫存。未匹配及重複條碼不會修改。確定套用？`))return;
 // 只寫入 variants[].stock，不重建或覆蓋商品物件及其其他欄位。
 const beforeSync=JSON.stringify(products);
 const dataWithoutStock=list=>list.map(product=>{const copy=JSON.parse(JSON.stringify(product));(copy.variants||[]).forEach(variant=>delete variant.stock);return copy;});
 const preserved=JSON.stringify(dataWithoutStock(products));
 for(const item of report.plans)item.variant.stock=item.stock;
 const intact=preserved===JSON.stringify(dataWithoutStock(products));
 if(!intact){products=JSON.parse(beforeSync).map(normalizeProduct);render();$("inventory-status").textContent="安全檢查未通過：除庫存以外的商品資料有變動，已還原原資料並停止套用。請重新載入 products.json 後再試。";return;}
 render();saveProductDraft();$("inventory-status").textContent=`庫存同步完成：已更新 ${report.plans.length} 個規格。安全檢查確認商品名稱、品牌、各規格價格、圖片、介紹、查詢網址、規格及國際條碼均未變動。請再按「下載更新檔」下載 products.json。`;
 $("inventory-sync-btn").disabled=true;
});
$("inventory-cancel-btn")?.addEventListener("click",()=>{$("inventory-mapping-area").hidden=true;inventorySourceRows=[];inventoryHeaders=[];inventorySourceName="";$("inventory-status").textContent="已取消庫存匯入。";});
$("inventory-template")?.addEventListener("click",()=>{const csv="國際條碼,庫存\r\n4710000000000,25\r\n4710000000001,8\r\n";const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="商品庫存範例.csv";a.click();URL.revokeObjectURL(url);});

// 7-ELEVEN 賣貨便訂單匯入（Excel／CSV）
const ORDER_KEY="xiangAnImportedOrdersV1";
const orderFields=[
 {key:"orderNo",label:"訂單編號",aliases:["訂單編號","訂單號碼","訂單單號","訂單編號(系統)","order no","order number","訂單序號"]},
 {key:"buyer",label:"訂購人",aliases:["訂購人","買家姓名","收件人","取件人姓名","會員姓名","姓名","buyer","recipient"]},
 {key:"item",label:"商品／明細",aliases:["商品名稱","商品明細","商品品名","品名","訂購商品","商品","規格","item","product"]},
 {key:"qty",label:"數量",aliases:["數量","訂購數量","商品數量","qty","quantity"]},
 {key:"amount",label:"訂單金額",aliases:["訂單金額","總金額","應付金額","實付金額","商品總額","金額","amount","total"]},
 {key:"date",label:"訂單日期",aliases:["訂單日期","成立時間","訂單成立時間","下單時間","建立日期","日期","order date","date"]}
];
let parsedOrderRows=[],orderHeaders=[],orderMapping={};
function getOrders(){try{return JSON.parse(localStorage.getItem(ORDER_KEY)||"[]")}catch{return []}}
function saveOrders(list){localStorage.setItem(ORDER_KEY,JSON.stringify(list))}
function loadOrders(){renderOrders()}
function renderOrders(){let list=getOrders();$("order-count").textContent=`（${list.length} 筆）`;$("orders-body").innerHTML=list.length?list.slice().reverse().map(o=>`<tr><td>${esc(o.orderNo)}</td><td>${esc(o.buyer)}</td><td>${esc(o.item)}</td><td>${esc(o.qty)}</td><td>${esc(o.amount)}</td><td>${esc(o.date)}</td></tr>`).join(""):'<tr><td colspan="6">尚未匯入訂單。</td></tr>'}
function norm(s){return String(s??"").toLowerCase().replace(/[\s　_()（）【】\[\]：:.-]/g,"")}
function autoMap(headers){let out={};for(const f of orderFields){let found=headers.find(h=>f.aliases.some(a=>norm(h)===norm(a)))||headers.find(h=>f.aliases.some(a=>norm(h).includes(norm(a))||norm(a).includes(norm(h))));out[f.key]=found||""}return out}
function showMapping(){let grid=$("mapping-grid");grid.innerHTML=orderFields.map(f=>`<label>${f.label}<select data-map="${f.key}"><option value="">（不匯入）</option>${orderHeaders.map(h=>`<option value="${esc(h)}" ${orderMapping[f.key]===h?"selected":""}>${esc(h)}</option>`).join("")}</select></label>`).join("");grid.querySelectorAll("select").forEach(sel=>sel.addEventListener("change",()=>{orderMapping[sel.dataset.map]=sel.value;renderPreview()}));$("mapping-area").hidden=false;renderPreview()}
function mappedRow(row){let o={};for(const f of orderFields)o[f.key]=orderMapping[f.key]?String(row[orderMapping[f.key]]??"").trim():"";o.qty=o.qty||"1";return o}
function renderPreview(){let rows=parsedOrderRows.slice(0,5).map(mappedRow);$("order-preview").querySelector("thead").innerHTML=`<tr>${orderFields.map(f=>`<th>${f.label}</th>`).join("")}</tr>`;$("order-preview").querySelector("tbody").innerHTML=rows.map(o=>`<tr>${orderFields.map(f=>`<td>${esc(o[f.key])}</td>`).join("")}</tr>`).join("");let noMap= !orderMapping.orderNo;$("confirm-import").disabled=noMap;$("order-import-status").textContent=noMap?"請指定訂單編號欄位，才能匯入並避免重複訂單。":`共讀取 ${parsedOrderRows.length} 筆資料，預覽前 5 筆。`}
$("order-file").addEventListener("change",async e=>{let file=e.target.files[0];if(!file)return;try{if(!window.XLSX)throw Error("Excel/CSV 讀取元件載入失敗，請重新整理頁面後再試。");let buf=await file.arrayBuffer(),wb=XLSX.read(buf,{type:"array",cellDates:true}),sheet=wb.Sheets[wb.SheetNames[0]],matrix=XLSX.utils.sheet_to_json(sheet,{header:1,defval:"",raw:false});if(!matrix.length)throw Error("檔案內沒有可讀取的訂單資料。");let headerAt=0,bestScore=-1;for(let i=0;i<Math.min(matrix.length,12);i++){let cells=matrix[i].map(v=>String(v??"").trim()).filter(Boolean),score=orderFields.filter(f=>cells.some(h=>f.aliases.some(a=>norm(h)===norm(a)||norm(h).includes(norm(a))))).length;if(score>bestScore){bestScore=score;headerAt=i}}orderHeaders=matrix[headerAt].map(v=>String(v??"").trim());if(!orderHeaders.some(Boolean))throw Error("找不到欄位標題列，請確認匯出檔案。");parsedOrderRows=matrix.slice(headerAt+1).filter(r=>r.some(v=>String(v??"").trim())).map(r=>Object.fromEntries(orderHeaders.map((h,i)=>[h,r[i]??""]).filter(([h])=>h)));if(!parsedOrderRows.length)throw Error("標題列下方沒有訂單資料。");orderMapping=autoMap(orderHeaders);showMapping()}catch(err){$("order-import-status").textContent=err.message||"讀取失敗，請確認檔案格式。";$("mapping-area").hidden=false}e.target.value=""});
$("confirm-import").addEventListener("click",()=>{let old=getOrders(),known=new Set(old.map(o=>String(o.orderNo))),added=0,skipped=0;for(const row of parsedOrderRows){let o=mappedRow(row);if(!o.orderNo){skipped++;continue}if(known.has(o.orderNo)){skipped++;continue}known.add(o.orderNo);old.push({...o,importedAt:new Date().toISOString()});added++}saveOrders(old);renderOrders();$("order-import-status").textContent=`匯入完成：新增 ${added} 筆，略過 ${skipped} 筆（包含重複或缺少訂單編號）。`;$("mapping-area").hidden=true;parsedOrderRows=[];orderHeaders=[];});
$("cancel-import").onclick=()=>{$("mapping-area").hidden=true;parsedOrderRows=[];orderHeaders=[]};
$("export-orders").onclick=()=>{let rows=getOrders(),cols=orderFields.map(f=>f.label),csv=[cols,...rows.map(o=>orderFields.map(f=>o[f.key]??""))].map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\r\n"),blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="xiang-an-orders.csv";a.click();URL.revokeObjectURL(a.href)};
$("clear-orders").onclick=()=>{if(confirm("確定清空這台裝置瀏覽器內的所有匯入訂單？此操作無法復原。")){saveOrders([]);renderOrders()}};

// Website logo uploader; exported as site-settings.json.
let siteSettings={logo:"",theme:"sage",discountTiers:[]};
async function loadSiteSettingsAdmin(){
 try{const r=await fetch("./site-settings.json",{cache:"no-store"});if(r.ok)siteSettings={...siteSettings,...await r.json()}}catch{}
 if(!["sage","navy","terracotta","sky","plum","rose","charcoal","lemon"].includes(siteSettings.theme))siteSettings.theme="sage";
 document.body.dataset.theme=siteSettings.theme;
 $("theme-select").value=siteSettings.theme;
 const tiers=Array.isArray(siteSettings.discountTiers)?siteSettings.discountTiers:[];
 for(let i=1;i<=3;i++){const t=tiers[i-1]||{};$("discount-threshold-"+i).value=t.threshold||"";$("discount-percent-"+i).value=t.amount||"";}
 if(siteSettings.logo){$("logo-preview").hidden=false;$("logo-preview").innerHTML=`<img alt="目前官網商標" src="${siteSettings.logo}">`;}
}
$("theme-select").addEventListener("change",e=>{
 siteSettings.theme=e.target.value;document.body.dataset.theme=siteSettings.theme;
 $("logo-status").textContent="主題已預覽。請按「下載 site-settings.json」，再上傳 GitHub 才會套用至顧客頁面。";
});
$("logo-file").addEventListener("change",async e=>{
 const file=e.target.files[0];if(!file)return;
 try{
  siteSettings.logo=await readImageFile(file,2000000);
  $("logo-preview").hidden=false;
  $("logo-preview").innerHTML=`<img alt="商標預覽" src="${siteSettings.logo}">`;
  $("logo-status").textContent="商標已載入，請下載設定檔並上傳 GitHub。";
 }catch(err){$("logo-status").textContent=err.message}
});
$("logo-download").addEventListener("click",()=>{
 siteSettings.discountTiers=[];
 for(let i=1;i<=3;i++){const threshold=Math.max(0,Math.floor(Number($("discount-threshold-"+i).value)||0)),percent=Math.min(100,Math.max(0,Number($("discount-percent-"+i).value)||0));if(threshold>0&&percent>0)siteSettings.discountTiers.push({threshold,percent});}
 siteSettings.discountTiers.sort((a,b)=>a.threshold-b.threshold);
 const blob=new Blob([JSON.stringify(siteSettings,null,2)],{type:"application/json;charset=utf-8"});
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");
 a.href=url;a.download="site-settings.json";a.style.display="none";
 document.body.appendChild(a);
 a.click();
 setTimeout(()=>{URL.revokeObjectURL(url);a.remove();},1500);
 $("logo-status").textContent="已送出 site-settings.json 下載。若瀏覽器詢問，請選擇儲存；若沒有出現下載，請允許此網站下載檔案或檢查瀏覽器下載列。下載後上傳至 GitHub Repository 根目錄。";
});

if(sessionStorage.getItem(AUTH_KEY)==="yes")showAdmin();

// Homepage announcement editor
let currentAnnouncement={title:"翔安富文具公告",message:"歡迎光臨！最新商品與營業資訊請留意本公告。",updatedAt:""};
async function loadAnnouncementAdmin(){
 try{const r=await fetch("./announcement.json",{cache:"no-store"});if(r.ok)currentAnnouncement=await r.json()}catch{}
 $("notice-admin-title").value=currentAnnouncement.title||"";
 $("notice-admin-message").value=currentAnnouncement.message||"";
}
$("announcement-form").addEventListener("submit",e=>{
 e.preventDefault();
 currentAnnouncement={title:$("notice-admin-title").value.trim(),message:$("notice-admin-message").value.trim(),updatedAt:new Date().toLocaleDateString("zh-TW")};
 $("notice-status").textContent="公告已在管理頁預覽資料中更新；請按「下載 announcement.json」，再上傳 GitHub 覆蓋舊檔，官網才會同步更新。";
});
$("notice-download").addEventListener("click",()=>{
 const blob=new Blob([JSON.stringify(currentAnnouncement,null,2)],{type:"application/json;charset=utf-8"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="announcement.json";a.click();URL.revokeObjectURL(a.href);
 $("notice-status").textContent="已下載 announcement.json，請上傳至 GitHub Repository 根目錄覆蓋舊檔。";
});


// 7-ELEVEN store overrides/custom records. Export stores-custom.json and publish it with the static site.
const STORE_CUSTOM_FILE="stores-custom.json";
let managedStores=[],disabledStoreIds=[];
function normalizeManagedStore(x){return {id:String(x.id||"").replace(/\D/g,"").slice(0,6),name:String(x.name||x.store||"").trim(),address:String(x.address||"").trim()}}
async function loadStoreAdmin(){
 try{
  const r=await fetch("./stores-custom.json",{cache:"no-store"});
  if(r.ok){const d=await r.json();managedStores=(Array.isArray(d.stores)?d.stores:[]).map(normalizeManagedStore).filter(x=>/^\d{6}$/.test(x.id)&&x.name);disabledStoreIds=Array.isArray(d.disabledIds)?d.disabledIds.map(String):[];}
 }catch{}
 renderManagedStores();
}
function renderManagedStores(){
 const box=$("managed-store-list");if(!box)return;
 const rows=[...managedStores.map(x=>({...x,disabled:false})),...disabledStoreIds.filter(id=>!managedStores.some(x=>x.id===id)).map(id=>({id,name:"（已停用外部門市）",address:"",disabled:true}))];
 box.innerHTML=rows.length?rows.map((x,i)=>`<div class="product-row"><div><strong>${escapeHtmlAdmin(x.name)}</strong><small>門市編號：${escapeHtmlAdmin(x.id)}${x.address?"｜"+escapeHtmlAdmin(x.address):""}${x.disabled?"｜已停用":""}</small></div><div class="row-actions">${x.disabled?`<button class="light" type="button" data-store-enable="${escapeHtmlAdmin(x.id)}">恢復</button>`:`<button class="light" type="button" data-store-edit="${escapeHtmlAdmin(x.id)}">編輯</button><button class="delete" type="button" data-store-delete="${escapeHtmlAdmin(x.id)}">刪除／停用</button>`}</div></div>`).join(""):'<p class="hint">尚未新增自訂或修改門市。全台外部清單仍可在結帳頁搜尋。</p>';
}
function escapeHtmlAdmin(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function resetStoreForm(){$("store-admin-form").reset();$("store-edit-original-id").value="";$("store-cancel-edit").hidden=true;$("store-save-btn").textContent="新增／儲存門市"}
$("store-admin-form")?.addEventListener("submit",e=>{
 e.preventDefault();const id=$("admin-store-id").value.replace(/\D/g,"").slice(0,6),name=$("admin-store-name").value.trim(),address=$("admin-store-address").value.trim(),oldId=$("store-edit-original-id").value;
 if(!/^\d{6}$/.test(id)||!name){$("store-admin-status").textContent="請輸入六碼門市編號及門市名稱。";return}
 if(managedStores.some(x=>x.id===id&&x.id!==oldId)){ $("store-admin-status").textContent="此門市編號已存在於自訂清單。";return }
 if(oldId){managedStores=managedStores.filter(x=>x.id!==oldId);if(oldId!==id&&!disabledStoreIds.includes(oldId))disabledStoreIds.push(oldId)}
 managedStores=managedStores.filter(x=>x.id!==id);managedStores.push({id,name,address});disabledStoreIds=disabledStoreIds.filter(x=>x!==id);
 resetStoreForm();renderManagedStores();$("store-admin-status").textContent="門市資料已更新。請下載 stores-custom.json 並上傳 GitHub 才會套用至官網。";
});
$("managed-store-list")?.addEventListener("click",e=>{
 const edit=e.target.closest("[data-store-edit]"),del=e.target.closest("[data-store-delete]"),enable=e.target.closest("[data-store-enable]");
 if(edit){const x=managedStores.find(v=>v.id===edit.dataset.storeEdit);if(!x)return;$("store-edit-original-id").value=x.id;$("admin-store-id").value=x.id;$("admin-store-name").value=x.name;$("admin-store-address").value=x.address;$("store-cancel-edit").hidden=false;$("store-save-btn").textContent="儲存門市修改";$("admin-store-id").focus()}
 if(del){const id=del.dataset.storeDelete;if(!confirm(`確定刪除／停用門市 ${id}？`))return;managedStores=managedStores.filter(x=>x.id!==id);if(!disabledStoreIds.includes(id))disabledStoreIds.push(id);renderManagedStores();$("store-admin-status").textContent="門市已刪除或停用；請下載 stores-custom.json 並上傳 GitHub。"}
 if(enable){disabledStoreIds=disabledStoreIds.filter(x=>x!==enable.dataset.storeEnable);renderManagedStores();$("store-admin-status").textContent="已取消停用；請下載 stores-custom.json 並上傳 GitHub。"}
});
$("store-cancel-edit")?.addEventListener("click",resetStoreForm);
$("store-download")?.addEventListener("click",()=>{const data={updatedAt:new Date().toISOString(),stores:managedStores,disabledIds:disabledStoreIds};const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=STORE_CUSTOM_FILE;a.click();URL.revokeObjectURL(a.href);$("store-admin-status").textContent="已下載 stores-custom.json。請上傳 GitHub Repository 根目錄並覆蓋舊檔。"});
$("store-import-btn")?.addEventListener("click",()=>$("store-import-file").click());
$("store-import-file")?.addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;try{const d=JSON.parse(await file.text());managedStores=(Array.isArray(d.stores)?d.stores:[]).map(normalizeManagedStore).filter(x=>/^\d{6}$/.test(x.id)&&x.name);disabledStoreIds=Array.isArray(d.disabledIds)?d.disabledIds.map(String).filter(x=>/^\d{6}$/.test(x)):[];renderManagedStores();$("store-admin-status").textContent="門市設定檔匯入完成，請檢查後下載。"}catch{$("store-admin-status").textContent="檔案格式錯誤，請選擇正確的 stores-custom.json。"}e.target.value=""});


// FAQ manager: edit faq.json in admin, then export and publish to GitHub Pages.
let faqItems=[];
async function loadFaqAdmin(){try{const r=await fetch("./faq.json",{cache:"no-store"});if(r.ok){const d=await r.json();if(Array.isArray(d))faqItems=d.map(x=>({q:String(x.q||""),a:String(x.a||"")}));}}catch{}renderFaqAdmin();}
function renderFaqAdmin(){const box=$("faq-admin-list");if(!box)return;box.innerHTML=faqItems.map((x,i)=>`<div class="faq-admin-row" data-faq-index="${i}"><label>問題 ${i+1}<input class="faq-question" maxlength="160" value="${esc(x.q)}" placeholder="輸入常見問題"></label><label>回答<textarea class="faq-answer" rows="3" maxlength="1500" placeholder="輸入回答">${esc(x.a)}</textarea></label><div class="actions"><button class="light faq-save" type="button">儲存此題</button><button class="delete faq-delete" type="button">刪除此題</button></div></div>`).join("")||'<p class="hint">目前沒有常見問題，請按「新增常見問題」。</p>';box.querySelectorAll(".faq-save").forEach(b=>b.addEventListener("click",()=>{const row=b.closest(".faq-admin-row"),i=Number(row.dataset.faqIndex);faqItems[i]={q:row.querySelector(".faq-question").value.trim(),a:row.querySelector(".faq-answer").value.trim()};$("faq-status").textContent="此題已暫存，完成全部編輯後請下載 faq.json。";}));box.querySelectorAll(".faq-delete").forEach(b=>b.addEventListener("click",()=>{const row=b.closest(".faq-admin-row"),i=Number(row.dataset.faqIndex);if(confirm("確定刪除此常見問題？")){faqItems.splice(i,1);renderFaqAdmin();$("faq-status").textContent="已刪除該題，請下載 faq.json 才會更新官網。";}}));}
$("faq-add")?.addEventListener("click",()=>{faqItems.push({q:"",a:""});renderFaqAdmin();const rows=$("faq-admin-list").querySelectorAll(".faq-admin-row");rows[rows.length-1]?.scrollIntoView({behavior:"smooth",block:"center"});rows[rows.length-1]?.querySelector(".faq-question")?.focus();$("faq-status").textContent="已新增空白題目，請填寫問題與回答並按「儲存此題」。";});
$("faq-download")?.addEventListener("click",()=>{const rows=[...$("faq-admin-list").querySelectorAll(".faq-admin-row")];faqItems=rows.map(row=>({q:row.querySelector(".faq-question").value.trim(),a:row.querySelector(".faq-answer").value.trim()}));if(faqItems.some(x=>!x.q||!x.a)){$("faq-status").textContent="每一題都需要填寫問題與回答，請確認後再下載。";return;}const blob=new Blob([JSON.stringify(faqItems,null,2)],{type:"application/json;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="faq.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);$("faq-status").textContent="已下載 faq.json。請上傳 GitHub Repository 根目錄覆蓋舊檔，常見問題頁面才會同步更新。";});


// V28：商品批次新增／更新；以國際條碼匹配規格，保留未匹配的既有規格與隱藏欄位。
(()=>{
 const aliases={
  name:["商品名稱","商品品名","品名","名稱","商品","product name","name"],
  brand:["品牌","廠牌","商品品牌","brand"],
  functionCategory:["功能分類","商品分類","分類","類別","category","function category"],
  desc:["商品介紹","商品描述","描述","說明","簡介","description"],
  image:["商品圖片網址","圖片網址","圖片連結","圖片","image","image url"],
  url:["庫存查詢網址","商品頁面網址","查詢網址","商品網址","url"],
  variant:["規格名稱","商品規格","規格","款式","variant","specification"],
  barcode:["國際條碼","商品國際條碼","商品條碼","條碼","EAN","EAN13","EAN-13","UPC","Barcode","GTIN"],
  price:["售價","價格","規格價格","單價","price"],
  stock:["庫存","庫存量","庫存數量","現有庫存","stock","qty"]
 };
 const labels={name:"商品名稱",brand:"品牌",functionCategory:"功能分類",desc:"商品介紹",image:"商品圖片網址",url:"庫存查詢網址",variant:"規格名稱",barcode:"國際條碼",price:"價格",stock:"庫存"};
 let rows=[],headers=[],mapping={};
 const norm=s=>String(s??"").trim().toLowerCase().replace(/[\s_\-（）()]/g,"");
 const area=$("product-batch-area"),file=$("product-batch-file");
 $("product-batch-template").addEventListener("click",()=>{
  if(!window.XLSX){$("product-batch-status").textContent="Excel 元件尚未載入，請重新整理管理頁後再下載。";return;}
  const headers=["商品名稱","品牌","功能分類","商品介紹","商品圖片網址","庫存查詢網址","規格名稱","國際條碼","價格","庫存"];
  const data=[headers,
   ["三菱 Jetstream 原子筆","三菱","書寫","0.5mm 黑色","https://example.com/image.jpg","","0.5mm 黑色","4710000000000",45,20],
   ["三菱 Jetstream 原子筆","三菱","書寫","0.5mm 藍色","","","0.5mm 藍色","4710000000001",45,15]];
  const ws=XLSX.utils.aoa_to_sheet(data);
  // 預設欄寬方便閱讀，使用者可在 Excel 直接拖曳欄界線調整。
  ws["!cols"]=[{wch:26},{wch:14},{wch:14},{wch:28},{wch:38},{wch:30},{wch:18},{wch:22},{wch:12},{wch:12}];
  ws["!freeze"]={xSplit:0,ySplit:1,topLeftCell:"A2",activePane:"bottomLeft",state:"frozen"};
  ws["!autofilter"]={ref:`A1:${XLSX.utils.encode_col(headers.length-1)}${data.length}`};
  // 國際條碼欄整欄以文字格式儲存，避免 Excel 轉成科學記號或通用格式。
  for(let r=2;r<=data.length;r++){const cell=ws[`H${r}`];if(cell){cell.t="s";cell.v=String(cell.v);cell.z="@";}}
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"商品匯入");
  XLSX.writeFile(wb,"翔安富文具_商品批次匯入範例.xlsx");
  $("product-batch-status").textContent="已下載 Excel 範例（.xlsx）。國際條碼欄已設定為文字格式，欄寬可在 Excel 中拖曳調整；請使用 Excel 的「另存新檔」保存修改。";
 });
 function findCol(key){return headers.find(h=>aliases[key].some(a=>norm(h)===norm(a)||norm(h).includes(norm(a))))||""}
 function value(row,key){return String(row[mapping[key]]??"").trim()}
 function barcode(s){return String(s??"").replace(/[\s-]/g,"").trim()}
 function drawMapping(){
  $("product-batch-mapping").innerHTML=Object.keys(labels).map(k=>`<label>${labels[k]}${["name","variant","price"].includes(k)?"＊":""}<select data-batch-map="${k}"><option value="">（不匯入）</option>${headers.map(h=>`<option value="${esc(h)}" ${mapping[k]===h?"selected":""}>${esc(h)}</option>`).join("")}</select></label>`).join("");
  $("product-batch-mapping").querySelectorAll("select").forEach(el=>el.addEventListener("change",()=>{mapping[el.dataset.batchMap]=el.value;preview()}));
 }
 function preview(){
  const required=["name","variant","barcode","price"],missing=required.filter(k=>!mapping[k]);
  const parsed=rows.map((r,i)=>({i,name:value(r,"name"),brand:value(r,"brand"),functionCategory:value(r,"functionCategory"),desc:value(r,"desc"),image:value(r,"image"),url:value(r,"url"),variant:value(r,"variant")||"一般規格",barcode:barcode(value(r,"barcode")),price:value(r,"price"),stock:value(r,"stock")}));
  const valid=parsed.filter(x=>x.name&&x.variant&&x.barcode&&x.price!==""&&Number.isFinite(Number(x.price))&&Number(x.price)>=0&&Number.isInteger(Number(x.price)));
  const existing=new Map();for(const p of products)for(const v of p.variants||[]){const b=barcode(v.barcode);if(b){if(!existing.has(b))existing.set(b,[]);existing.get(b).push({p,v})}}
  let update=0,add=0,invalid=parsed.length-valid.length,dupe=0;
  const seen=new Set();for(const x of valid){if(x.barcode&&seen.has(x.barcode)){dupe++;continue}if(x.barcode)seen.add(x.barcode);const hits=existing.get(x.barcode)||[];if(x.barcode&&hits.length===1)update++;else add++;}
  $("product-batch-summary").innerHTML=`讀取 <strong>${parsed.length}</strong> 列；可更新規格 <strong>${update}</strong> 個；預計新增規格／商品 <strong>${add}</strong> 個；格式錯誤 <strong>${invalid}</strong> 列；檔案內重複條碼 <strong>${dupe}</strong> 列（重複條碼會略過）。${missing.length?`<br>請指定必要欄位：${missing.map(k=>labels[k]).join("、")}`:""}`;
  const previewRows=parsed.slice(0,12);$("product-batch-preview").querySelector("thead").innerHTML="<tr><th>商品名稱</th><th>規格</th><th>國際條碼</th><th>價格</th><th>庫存</th><th>預計處理</th></tr>";
  $("product-batch-preview").querySelector("tbody").innerHTML=previewRows.map(x=>{const hits=existing.get(x.barcode)||[];const action=!x.name||!x.variant||!x.barcode||x.price===""||!Number.isInteger(Number(x.price))?"資料不完整／略過":hits.length===1?"依條碼更新":hits.length>1?"官網條碼重複／略過":"新增";return `<tr><td>${esc(x.name)}</td><td>${esc(x.variant)}</td><td>${esc(x.barcode)}</td><td>${esc(x.price)}</td><td>${esc(x.stock)}</td><td>${action}</td></tr>`}).join("");
  $("product-batch-apply").disabled=missing.length>0||valid.length===0;
 }
 file.addEventListener("change",async e=>{
  const f=e.target.files[0];if(!f)return;
  try{if(!window.XLSX)throw Error("Excel／CSV 讀取元件載入失敗，請重新整理頁面後再試。");const wb=XLSX.read(await f.arrayBuffer(),{type:"array",raw:true,cellText:false});const sh=wb.Sheets[wb.SheetNames[0]];const matrix=XLSX.utils.sheet_to_json(sh,{header:1,defval:"",raw:true});if(!matrix.length)throw Error("檔案沒有資料。");headers=matrix[0].map(v=>String(v??"").trim());rows=matrix.slice(1).filter(r=>r.some(v=>String(v??"").trim())).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??""]).filter(([h])=>h)));
   mapping={};Object.keys(labels).forEach(k=>mapping[k]=findCol(k));drawMapping();area.hidden=false;preview();$("product-batch-status").textContent=`已讀取 ${rows.length} 列，請確認欄位對應及預覽。`;
  }catch(err){$("product-batch-status").textContent=err.message||"檔案讀取失敗。";area.hidden=false}file.value="";
 });
 $("product-batch-apply").addEventListener("click",()=>{
  const parsed=rows.map(r=>({name:value(r,"name"),brand:value(r,"brand"),functionCategory:value(r,"functionCategory"),desc:value(r,"desc"),image:value(r,"image"),url:value(r,"url"),variant:value(r,"variant")||"一般規格",barcode:barcode(value(r,"barcode")),price:Number(value(r,"price")),stock:value(r,"stock")===""?null:Number(value(r,"stock"))}));
  const seen=new Set(),valid=parsed.filter(x=>x.name&&x.variant&&x.barcode&&Number.isInteger(x.price)&&x.price>=0&&(x.stock===null||(Number.isInteger(x.stock)&&x.stock>=0))).filter(x=>{if(seen.has(x.barcode))return false;seen.add(x.barcode);return true});
  if(!valid.length)return;
  const barcodeIndex=new Map();for(const p of products)for(const v of p.variants||[]){const b=barcode(v.barcode);if(b){if(!barcodeIndex.has(b))barcodeIndex.set(b,[]);barcodeIndex.get(b).push({p,v})}}
  const updates=[],newRows=[];let skipped=parsed.length-valid.length,ambiguous=0;
  for(const x of valid){const hits=barcodeIndex.get(x.barcode)||[];if(hits.length>1){ambiguous++;continue}if(hits.length===1){const {p,v}=hits[0];p.name=x.name;for(const k of ["brand","functionCategory","desc","image","url"])if(x[k]!=="")p[k]=x[k];v.name=x.variant;v.barcode=x.barcode;v.price=x.price;if(x.stock!==null)v.stock=x.stock;if(p.variants?.[0]===v)p.price=x.price;updates.push(x)}else newRows.push(x)}
  // 新條碼依商品名稱合併；同名商品已存在時新增規格到該商品。
  const grouped=new Map();for(const x of newRows){if(!grouped.has(x.name))grouped.set(x.name,[]);grouped.get(x.name).push(x)}
  let addedProducts=0,addedVariants=0;
  for(const [name,list] of grouped){const first=list[0];let target=products.find(p=>String(p.name).trim()===name);if(!target){const id=Math.max(0,...products.map(p=>Number(p.id)||0))+1;target={id,name,brand:first.brand,functionCategory:first.functionCategory,desc:first.desc,image:first.image,url:first.url,price:first.price,category:"writing",variants:[]};products.push(target);addedProducts++;}else{for(const k of ["brand","functionCategory","desc","image","url"])if(first[k]!=="")target[k]=first[k];}
   for(const x of list){target.variants=target.variants||[];target.variants.push({name:x.variant,barcode:x.barcode,price:x.price,stock:x.stock===null?0:x.stock});addedVariants++;}if(target.variants.length)target.price=target.variants[0].price;
  }
  render();saveProductDraft();$("product-batch-status").textContent=`批次匯入完成：更新 ${updates.length} 個既有規格；新增 ${addedProducts} 件商品（${addedVariants} 個規格）；略過 ${skipped+ambiguous} 列（包含資料錯誤、重複條碼或官網條碼重複）。請檢查商品清單，再按「下載更新檔」下載 products.json 並上傳 GitHub。`;
  area.hidden=true;rows=[];headers=[];mapping={};
 });
 $("product-batch-cancel").addEventListener("click",()=>{area.hidden=true;rows=[];headers=[];mapping={};file.value="";$("product-batch-status").textContent="已取消匯入，商品資料未變更。"});
})();
