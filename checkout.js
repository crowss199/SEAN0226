const CART_KEY="xiangAnJapandiCart",ORDER_KEY="xiangAnLastOrder",STORE_CACHE_KEY="xiangAn711Stores",STORE_DATA_URL="https://raw.githubusercontent.com/Cojad/taiwan-7Eleven-store/master/stores.json",STORE_CUSTOM_URL="./stores-custom.json";
const $=id=>document.getElementById(id),money=n=>"NT$ "+Number(n).toLocaleString("zh-TW");

// ===== 翔安富文具：即時讀取 Google 試算表庫存（只讀 API） =====
let INVENTORY_SYNC_READY = false;
let INVENTORY_SYNC_UPDATED_AT = null;
let INVENTORY_SYNC_REPORT = null;

function normalizeClientInventoryBarcode(value) {
  return String(value == null ? "" : value).trim().replace(/\.0+$/, "").replace(/\D/g, "");
}

function requestLiveInventorySnapshot() {
  const endpoint = window.CHECKOUT_CONFIG && window.CHECKOUT_CONFIG.WEB_APP_URL;
  if (!endpoint) return Promise.reject(new Error("未設定 Google Apps Script 網址。"));
  return new Promise((resolve, reject) => {
    const callbackName = "xafwInventory_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");
    let finished = false;
    const cleanup = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      script.remove();
      try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
    };
    const timer = setTimeout(() => { cleanup(); reject(new Error("讀取 Google 試算表庫存逾時。")); }, 12000);
    window[callbackName] = data => {
      cleanup();
      if (!data || data.ok !== true || !Array.isArray(data.items)) {
        reject(new Error(data && data.error ? data.error : "庫存 API 回傳格式錯誤。"));
        return;
      }
      resolve(data);
    };
    script.onerror = () => { cleanup(); reject(new Error("無法連線 Google 試算表庫存 API。")); };
    try {
      const url = new URL(endpoint);
      url.searchParams.set("action", "inventory");
      url.searchParams.set("callback", callbackName);
      url.searchParams.set("_", String(Date.now()));
      script.src = url.toString();
      document.head.appendChild(script);
    } catch (err) { cleanup(); reject(err); }
  });
}

async function refreshLiveInventory() {
  const data = await requestLiveInventorySnapshot();
  const stockByBarcode = new Map();
  const duplicateBarcodes = new Set((data.duplicates || []).map(normalizeClientInventoryBarcode));
  data.items.forEach(item => {
    const barcode = normalizeClientInventoryBarcode(item.barcode);
    const stock = Number(item.stock);
    if (barcode && Number.isInteger(stock) && stock >= 0 && !duplicateBarcodes.has(barcode)) stockByBarcode.set(barcode, stock);
  });
  let matched = 0, missing = 0, duplicated = 0;
  PRODUCTS.forEach(product => (Array.isArray(product.variants) ? product.variants : []).forEach(variant => {
    const barcode = normalizeClientInventoryBarcode(variant.barcode || variant.internationalBarcode || "");
    variant.__sheetStockSynced = false;
    variant.__sheetStockIssue = "missing";
    if (!barcode) { missing++; return; }
    if (duplicateBarcodes.has(barcode)) { variant.__sheetStockIssue = "duplicate"; duplicated++; return; }
    if (!stockByBarcode.has(barcode)) { missing++; return; }
    variant.stock = stockByBarcode.get(barcode);
    variant.__sheetStockSynced = true;
    variant.__sheetStockIssue = "";
    matched++;
  }));
  INVENTORY_SYNC_READY = true;
  INVENTORY_SYNC_UPDATED_AT = data.updatedAt || new Date().toISOString();
  INVENTORY_SYNC_REPORT = { matched, missing, duplicated, sourceRows: Number(data.sourceRows) || 0 };
  return INVENTORY_SYNC_REPORT;
}

function getLiveStockState(variant) {
  if (!INVENTORY_SYNC_READY || !variant || variant.__sheetStockSynced !== true) {
    return { known:false, stock:null, available:false, label:variant && variant.__sheetStockIssue === "duplicate" ? "條碼重複，暫停販售" : "庫存尚未同步" };
  }
  const stock = Number(variant.stock);
  return { known:Number.isInteger(stock) && stock >= 0, stock, available:Number.isInteger(stock) && stock > 0, label:stock > 0 ? "庫存：" + stock : "已售完" };
}

let PRODUCTS=[],cart=[],STORE_LIST=[],selectedStore=null,SITE_SETTINGS={discountTiers:[]};
try{cart=JSON.parse(localStorage.getItem(CART_KEY)||"[]")}catch{cart=[]}
async function init(){
 $("year").textContent=new Date().getFullYear();
 try{const r=await fetch("./products.json",{cache:"no-store"});if(!r.ok)throw Error();PRODUCTS=await r.json()}catch{$("checkout-items").innerHTML="<p>商品資料暫時無法載入，請返回商品頁稍後重試。</p>";$("checkout-submit").disabled=true;return}
 try{const sr=await fetch("./site-settings.json",{cache:"no-store"});if(sr.ok)SITE_SETTINGS={...SITE_SETTINGS,...await sr.json()}}catch{}
 cart=cart.filter(x=>PRODUCTS.some(p=>Number(p.id)===Number(x.id))&&Number(x.qty)>0);
 try{
  const report=await refreshLiveInventory();
  $("checkout-status").textContent=`已從 Google 試算表「文具資料」同步 ${report.matched} 個規格；未建檔 ${report.missing} 個、重複條碼 ${report.duplicated} 個。購物車商品必須有對應庫存才可結帳。`;
 }catch(err){
  INVENTORY_SYNC_READY=false;
  $("checkout-status").textContent="目前無法讀取試算表即時庫存，為避免超賣，暫停送出訂單。請重新整理或稍後再試。";
  console.error("結帳頁庫存同步失敗",err);
 }
 renderSummary();
 if(!cart.length){$("checkout-status").textContent="選購清單是空的，請返回商品頁加入商品。";$("checkout-submit").disabled=true;}
 else if(!INVENTORY_SYNC_READY||getCartInventoryIssues().length){$("checkout-submit").disabled=true;}
 else{$("checkout-submit").disabled=false;}
}
function selectedVariant(p,name){return (p.variants||[{name:"一般規格",price:p.price,stock:null}]).find(v=>String(v.name||"一般規格")===String(name||"一般規格"))||(p.variants||[])[0]||{price:p.price};}
function variantPrice(p,v){const n=Number(v?.price??p.price??0);return Number.isFinite(n)&&n>=0?n:0}
function subtotal(){return cart.reduce((s,x)=>{const p=PRODUCTS.find(p=>Number(p.id)===Number(x.id)),v=selectedVariant(p,x.variant);return s+variantPrice(p,v)*x.qty},0)}
function discountFor(amount){const tiers=(Array.isArray(SITE_SETTINGS.discountTiers)?SITE_SETTINGS.discountTiers:[]).filter(t=>Number(t.threshold)>0&&Number(t.percent)>0&&Number(t.percent)<=100).sort((a,b)=>Number(a.threshold)-Number(b.threshold));let chosen=null;for(const t of tiers){if(amount>=Number(t.threshold))chosen=t;}if(!chosen)return{amount:0,threshold:0,percent:0};const percent=Number(chosen.percent);return{amount:Math.min(amount,Math.round(amount*percent/100)),threshold:Number(chosen.threshold),percent}}
function renderSummary(){
 $("checkout-items").innerHTML=cart.length?cart.map(x=>{
  const p=PRODUCTS.find(p=>Number(p.id)===Number(x.id)),v=selectedVariant(p,x.variant),price=variantPrice(p,v),state=getLiveStockState(v);
  return `<div class="checkout-item"><span>${escapeHtml(p.name)}<br><small>${escapeHtml(x.variant||"一般規格")}｜${money(price)} × ${x.qty}<br>${escapeHtml(state.label)}</small></span><strong>${money(price*x.qty)}</strong></div>`;
 }).join(""):'<p>目前沒有商品。</p>';
 $("checkout-subtotal").textContent=money(subtotal());updateTotal();
}
function getCartInventoryIssues(){
 const issues=[];
 cart.forEach(x=>{
  const p=PRODUCTS.find(p=>Number(p.id)===Number(x.id));
  const v=p?selectedVariant(p,x.variant):null;
  const state=getLiveStockState(v);
  const label=p?p.name:"購物車商品";
  if(!state.known)issues.push(label+"：條碼未能與試算表庫存匹配");
  else if(state.stock<=0)issues.push(label+"：目前已售完");
  else if(Number(x.qty)>state.stock)issues.push(label+"：購買數量 "+x.qty+"，目前庫存只有 "+state.stock);
 });
 return issues;
}
function updateCheckoutStockStatus(){
 const issues=getCartInventoryIssues(),btn=$("checkout-submit");
 if(!INVENTORY_SYNC_READY||!cart.length){btn.disabled=true;return;}
 if(issues.length){btn.disabled=true;$("checkout-status").textContent="庫存不足或尚未同步："+issues.join("；")+"。請返回商品頁調整購物車。";}
 else{btn.disabled=false;$("checkout-status").textContent="庫存已同步；送出訂單前將再次核對最新庫存。";}
}
function updateTotal(){const fee=Number(document.querySelector('[name="shippingFee"]').value||0),sub=subtotal(),discount=discountFor(sub);$("checkout-shipping").textContent=money(fee);$("checkout-discount-row").hidden=discount.amount<=0;$("checkout-discount").textContent="-"+money(discount.amount);$("checkout-discount-label").textContent=discount.amount?`滿 NT$${discount.threshold.toLocaleString("zh-TW")} 折 ${discount.percent}%`:"滿額折扣";$("checkout-grand-total").textContent=money(Math.max(0,sub-discount.amount)+fee)}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}

// 透過既有 doGet(phone, callback) JSONP 確認訂單是否真的出現在「官網訂單」工作表。
function queryOrdersByPhone(endpoint,phone){
 return new Promise((resolve,reject)=>{
  const callbackName="__orderCheck_"+Date.now()+"_"+Math.random().toString(36).slice(2);
  const script=document.createElement("script");
  let finished=false;
  const cleanup=()=>{if(finished)return;finished=true;clearTimeout(timer);script.remove();try{delete window[callbackName]}catch(_){window[callbackName]=undefined}};
  const timer=setTimeout(()=>{cleanup();reject(new Error("查詢訂單逾時"))},10000);
  window[callbackName]=data=>{cleanup();resolve(data)};
  script.onerror=()=>{cleanup();reject(new Error("無法連線查詢訂單"))};
  const url=new URL(endpoint);
  url.searchParams.set("phone",phone);
  url.searchParams.set("callback",callbackName);
  url.searchParams.set("_",String(Date.now()));
  script.src=url.toString();
  document.head.appendChild(script);
 });
}
async function waitForOrderSaved(endpoint,phone,orderId){
 // doPost 使用 no-cors，瀏覽器不能讀取它的回應；改用既有手機訂單查詢 JSONP 核對訂單編號。
 for(let attempt=0;attempt<8;attempt++){
  if(attempt)await new Promise(resolve=>setTimeout(resolve,1200));
  const result=await queryOrdersByPhone(endpoint,phone);
  if(result&&result.ok&&Array.isArray(result.orders)&&result.orders.some(order=>String(order.orderId)===String(orderId)))return true;
  if(result&&!result.ok)throw new Error(result.error||"訂單查詢失敗");
 }
 return false;
}
document.querySelector('[name="shippingFee"]').addEventListener("input",updateTotal);
function clearSelectedStore(){
 selectedStore=null;
 $("store-name").value="";
 $("store-address").value="";
 $("store-selected").hidden=true;
}
$("store-id").addEventListener("input",e=>{
 e.target.value=e.target.value.replace(/\D/g,"").slice(0,6);
 if(selectedStore&&e.target.value!==selectedStore.id){clearSelectedStore()}
});
async function applyCustomStores(){
 try{const cr=await fetch(STORE_CUSTOM_URL,{cache:"no-store"});if(cr.ok){const custom=await cr.json();const disabled=new Set(Array.isArray(custom.disabledIds)?custom.disabledIds.map(String):[]);STORE_LIST=STORE_LIST.filter(x=>!disabled.has(x.id));for(const x of (Array.isArray(custom.stores)?custom.stores:[])){const item={id:String(x.id||""),name:String(x.name||""),address:String(x.address||"")};if(/^\d{6}$/.test(item.id)&&item.name){STORE_LIST=STORE_LIST.filter(v=>v.id!==item.id);STORE_LIST.push(item)}}}}catch(e){console.warn("自訂門市設定載入失敗，使用全台原始清單",e)}
}
async function loadStores(){
 const status=$("store-search-status");
 try{
  let cached=null;try{cached=JSON.parse(localStorage.getItem(STORE_CACHE_KEY)||"null")}catch{}
  if(cached&&Array.isArray(cached.list)&&cached.savedAt>Date.now()-24*60*60*1000){STORE_LIST=cached.list;await applyCustomStores();status.textContent=`已載入全台 ${STORE_LIST.length.toLocaleString("zh-TW")} 間門市（快取資料）`;return}
  status.textContent="正在下載全台門市資料，請稍候…";
  const response=await fetch(STORE_DATA_URL,{cache:"no-store"});if(!response.ok)throw Error("門市資料下載失敗");
  const raw=await response.json();
  STORE_LIST=Object.entries(raw).map(([id,v])=>({id:String(id).replace(/\D/g,""),name:String(v.store||v.name||""),address:String(v.address||"")})).filter(x=>/^\d{6}$/.test(x.id)&&x.name);
  await applyCustomStores();
  if(!STORE_LIST.length)throw Error("門市資料格式不符");
  try{localStorage.setItem(STORE_CACHE_KEY,JSON.stringify({savedAt:Date.now(),list:STORE_LIST}))}catch{}
  status.textContent=`全台 ${STORE_LIST.length.toLocaleString("zh-TW")} 間門市已載入，請輸入名稱或門市編號搜尋。`;
 }catch(err){status.textContent="全台門市清單暫時無法載入，請稍後重新整理頁面。";console.error(err)}
}
function renderStoreResults(){
 const q=$("store-search").value.trim().toLowerCase(),box=$("store-search-results"),status=$("store-search-status");box.innerHTML="";
 if(!q){if(STORE_LIST.length)status.textContent=`全台 ${STORE_LIST.length.toLocaleString("zh-TW")} 間門市已備妥，請輸入名稱或門市編號搜尋。`;return}
 if(q.length<2&&!/^\d+$/.test(q)){status.textContent="請至少輸入 2 個字搜尋門市名稱。";return}
 const found=STORE_LIST.filter(x=>x.name.toLowerCase().includes(q)||x.id.includes(q)).slice(0,30);
 status.textContent=found.length?`找到 ${found.length} 間符合門市${found.length===30?"（最多顯示 30 筆）":""}`:"找不到符合的門市，請更換搜尋關鍵字。";
 box.innerHTML=found.map((x,i)=>`<button type="button" class="store-result" data-store-index="${STORE_LIST.indexOf(x)}"><span><strong>${escapeHtml(x.name)}</strong><small>${escapeHtml(x.address)}</small></span><span class="store-code">${escapeHtml(x.id)}</span></button>`).join("");
}
$("store-search").addEventListener("input",()=>{
 if(selectedStore&&$("store-search").value.trim()!==selectedStore.name){$("store-id").value="";clearSelectedStore()}
 renderStoreResults();
});
$("store-search-results").addEventListener("click",e=>{
 const b=e.target.closest("[data-store-index]");if(!b)return;
 const x=STORE_LIST[Number(b.dataset.storeIndex)];if(!x)return;
 selectedStore=x;
 $("store-id").value=x.id;
 $("store-name").value=x.name;
 $("store-address").value=x.address;
 $("store-search").value=x.name;
 $("store-search-results").innerHTML="";
 $("store-search-status").textContent="已選取門市，門市名稱、編號及地址已自動帶入下方欄位。";
 $("store-selected").hidden=false;
 $("store-selected").innerHTML=`<strong>已選取：${escapeHtml(x.name)}</strong>門市編號：${escapeHtml(x.id)}${x.address?`<br>地址：${escapeHtml(x.address)}`:"<br>地址資料暫缺"}`;
});
loadStores();
$("checkout-form").addEventListener("submit",async e=>{
 e.preventDefault();if(!cart.length)return;
 const endpoint=window.CHECKOUT_CONFIG?.WEB_APP_URL||"";
 if(!endpoint||endpoint.includes("請填入")){$("checkout-status").textContent="尚未設定 Google 試算表接收網址。";return;}
 const f=new FormData(e.currentTarget),fee=Number(f.get("shippingFee")),productAmount=subtotal(),discount=discountFor(productAmount),totalAmount=Math.max(0,productAmount-discount.amount)+fee;
 if(!/^\d{6}$/.test(String(f.get("storeId")||""))||!String(f.get("storeName")||"").trim()||!selectedStore||selectedStore.id!==String(f.get("storeId")||"")){$("checkout-status").textContent="請先搜尋並選擇 7-ELEVEN 門市，系統會自動帶入門市名稱及地址。";return;}
 if(productAmount+fee<55||productAmount+fee>20000){$("checkout-status").textContent="商品金額加運費需介於 55 至 20,000 元。";return;}
 const btn=$("checkout-submit");btn.disabled=true;btn.textContent="確認庫存中…";$("checkout-status").textContent="正在重新讀取試算表最新庫存…";
 try{
  await refreshLiveInventory();
  const stockIssues=getCartInventoryIssues();
  renderSummary();
  if(stockIssues.length)throw new Error(stockIssues.join("；")+"。請返回商品頁調整購物車。");
 }catch(err){
  $("checkout-status").textContent="無法確認最新庫存或庫存不足："+String(err&&err.message||err)+"。尚未送出訂單，請勿重複操作。";
  btn.disabled=false;btn.textContent="確認送出訂單";return;
 }
 const items=cart.map(x=>{const p=PRODUCTS.find(p=>Number(p.id)===Number(x.id));const variantName=x.variant||"一般規格";const v=selectedVariant(p,variantName)||{};const unitPrice=variantPrice(p,v);return{productCode:p.productCode||("P"+p.id),name:p.name,variant:variantName,barcode:String(v.barcode||v.internationalBarcode||""),quantity:x.qty,unitPrice,amount:unitPrice*x.qty};});
 const order={orderId:"XAFW"+Date.now(),createdAt:new Date().toISOString(),recipient:String(f.get("recipient")).trim(),phone:String(f.get("phone")).trim(),email:String(f.get("email")).trim(),storeId:String(f.get("storeId")).trim(),storeName:String(f.get("storeName")||"").trim(),storeAddress:String(f.get("storeAddress")||"").trim(),temperature:f.get("temperature"),items,productAmount,discountAmount:discount.amount,discountThreshold:discount.threshold,discountPercent:discount.percent,shippingFee:fee,totalAmount,note:String(f.get("note")||""),social:String(f.get("social")||"")};
 btn.textContent="送出中…";$("checkout-status").textContent="庫存確認完成，正在送出訂單…";
 try{
  await fetch(endpoint,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(order)});
  const confirmed=await waitForOrderSaved(endpoint,order.phone,order.orderId);
  if(!confirmed){
   localStorage.setItem(ORDER_KEY,JSON.stringify({orderId:order.orderId,totalAmount:order.totalAmount,recipient:order.recipient,createdAt:order.createdAt,unconfirmed:true}));
   $("checkout-status").textContent=`尚未查到訂單 ${order.orderId}，可能仍在處理中。請先不要重複送出，保留此畫面並聯絡翔安富文具確認。`;
   btn.disabled=true;btn.textContent="訂單確認中";return;
  }
  localStorage.setItem(ORDER_KEY,JSON.stringify({orderId:order.orderId,totalAmount:order.totalAmount,recipient:order.recipient,createdAt:order.createdAt}));
  localStorage.removeItem(CART_KEY);
  location.href="order-success.html";
 }catch(err){
  localStorage.setItem(ORDER_KEY,JSON.stringify({orderId:order.orderId,totalAmount:order.totalAmount,recipient:order.recipient,createdAt:order.createdAt,unconfirmed:true}));
  $("checkout-status").textContent=`訂單送出後尚無法確認是否寫入試算表（訂單編號：${order.orderId}）。請先不要重複送出，稍後查詢訂單或聯絡翔安富文具確認。`;
  btn.disabled=true;btn.textContent="等待確認";console.error("訂單送出／確認失敗",err);
 }
});
let checkoutInventoryRefreshBusy=false;
async function refreshCheckoutInventoryOnReturn(){
 if(checkoutInventoryRefreshBusy||!PRODUCTS.length)return;
 checkoutInventoryRefreshBusy=true;
 try{await refreshLiveInventory();renderSummary();updateCheckoutStockStatus();}
 catch(err){INVENTORY_SYNC_READY=false;$("checkout-submit").disabled=true;$("checkout-status").textContent="無法取得試算表最新庫存，暫停送出訂單。";console.error(err);}
 checkoutInventoryRefreshBusy=false;
}
window.addEventListener("focus",refreshCheckoutInventoryOnReturn);
setInterval(refreshCheckoutInventoryOnReturn,60000);
init();
