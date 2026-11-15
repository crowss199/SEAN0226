const CART_KEY="xiangAnJapandiCart",ORDER_KEY="xiangAnLastOrder",STORE_CACHE_KEY="xiangAn711Stores",STORE_DATA_URL="https://raw.githubusercontent.com/Cojad/taiwan-7Eleven-store/master/stores.json",STORE_CUSTOM_URL="./stores-custom.json";
const $=id=>document.getElementById(id),money=n=>"NT$ "+Number(n).toLocaleString("zh-TW");
let PRODUCTS=[],cart=[],STORE_LIST=[],selectedStore=null;
try{cart=JSON.parse(localStorage.getItem(CART_KEY)||"[]")}catch{cart=[]}
async function init(){
 $("year").textContent=new Date().getFullYear();
 try{const r=await fetch("./products.json");if(!r.ok)throw Error();PRODUCTS=await r.json()}catch{$("checkout-items").innerHTML="<p>商品資料暫時無法載入，請返回商品頁稍後重試。</p>";return}
 cart=cart.filter(x=>PRODUCTS.some(p=>Number(p.id)===Number(x.id))&&Number(x.qty)>0);
 for(const x of cart){const p=PRODUCTS.find(p=>Number(p.id)===Number(x.id));const v=(p.variants||[{name:"一般規格",stock:null}]).find(v=>v.name===(x.variant||"一般規格"));if(!v||(v.stock!==null&&v.stock!==undefined&&Number(x.qty)>Number(v.stock))){$("checkout-status").textContent=`${p.name}（${x.variant||"一般規格"}）庫存不足，請返回商品頁調整數量。`; $("checkout-submit").disabled=true;}}
 renderSummary();
 if(!cart.length){$("checkout-status").textContent="選購清單是空的，請返回商品頁加入商品。";$("checkout-submit").disabled=true}
}
function subtotal(){return cart.reduce((s,x)=>s+Number(PRODUCTS.find(p=>Number(p.id)===Number(x.id)).price)*x.qty,0)}
function renderSummary(){
 $("checkout-items").innerHTML=cart.length?cart.map(x=>{const p=PRODUCTS.find(p=>Number(p.id)===Number(x.id));return `<div class="checkout-item"><span>${escapeHtml(p.name)}<br><small>${escapeHtml(x.variant||"一般規格")} × ${x.qty}</small></span><strong>${money(Number(p.price)*x.qty)}</strong></div>`}).join(""):'<p>目前沒有商品。</p>';
 $("checkout-subtotal").textContent=money(subtotal());updateTotal();
}
function updateTotal(){const fee=Number(document.querySelector('[name="shippingFee"]').value||0);$("checkout-shipping").textContent=money(fee);$("checkout-grand-total").textContent=money(subtotal()+fee)}
function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
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
 if(!endpoint||endpoint.includes("請填入")){$("checkout-status").textContent="尚未設定 Google 試算表接收網址。";return}
 const f=new FormData(e.currentTarget),fee=Number(f.get("shippingFee")),productAmount=subtotal();
 if(!/^\d{6}$/.test(String(f.get("storeId")||""))||!String(f.get("storeName")||"").trim()||!selectedStore||selectedStore.id!==String(f.get("storeId")||"")){$("checkout-status").textContent="請先搜尋並選擇 7-ELEVEN 門市，系統會自動帶入門市名稱及地址。";return}
 if(productAmount+fee<55||productAmount+fee>20000){$("checkout-status").textContent="商品金額加運費需介於 55 至 20,000 元。";return}
 const items=cart.map(x=>{const p=PRODUCTS.find(p=>Number(p.id)===Number(x.id));const variantName=x.variant||"一般規格";const v=(p.variants||[]).find(v=>String(v.name||"一般規格")===variantName)||{};return{productCode:p.productCode||("P"+p.id),name:p.name,variant:variantName,barcode:String(v.barcode||v.internationalBarcode||""),quantity:x.qty,unitPrice:Number(p.price),amount:Number(p.price)*x.qty}});
 const order={orderId:"XAFW"+Date.now(),createdAt:new Date().toISOString(),recipient:String(f.get("recipient")).trim(),phone:String(f.get("phone")).trim(),email:String(f.get("email")).trim(),storeId:String(f.get("storeId")).trim(),storeName:String(f.get("storeName")||"").trim(),storeAddress:String(f.get("storeAddress")||"").trim(),temperature:f.get("temperature"),items,productAmount,shippingFee:fee,totalAmount:productAmount+fee,note:String(f.get("note")||""),social:String(f.get("social")||"")};
 const btn=$("checkout-submit");btn.disabled=true;btn.textContent="送出中…";$("checkout-status").textContent="正在送出訂單…";
 try{
  await fetch(endpoint,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(order)});
  localStorage.setItem(ORDER_KEY,JSON.stringify({orderId:order.orderId,totalAmount:order.totalAmount,recipient:order.recipient,createdAt:order.createdAt}));
  localStorage.removeItem(CART_KEY);
  location.href="order-success.html";
 }catch(err){$("checkout-status").textContent="送出失敗，請確認網路後再試。";btn.disabled=false;btn.textContent="確認送出訂單"}
});
init();
