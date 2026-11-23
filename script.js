const CART_KEY="xiangAnJapandiCart";
let PRODUCTS=[],cart=[];const $=id=>document.getElementById(id),money=n=>"NT$ "+Number(n).toLocaleString("zh-TW");
try{cart=JSON.parse(localStorage.getItem(CART_KEY)||"[]")}catch{cart=[]}
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeUrl=s=>{try{const value=String(s||"").trim();if(/^data:image\/(png|jpeg|webp|gif);base64,/i.test(value))return value;let u=new URL(value||"#",location.href);return ["http:","https:"].includes(u.protocol)?u.href:"#"}catch{return "#"}};

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
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("讀取 Google 試算表庫存逾時。"));
    }, 12000);

    window[callbackName] = data => {
      cleanup();
      if (!data || data.ok !== true || !Array.isArray(data.items)) {
        reject(new Error(data && data.error ? data.error : "庫存 API 回傳格式錯誤。"));
        return;
      }
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("無法連線 Google 試算表庫存 API。"));
    };

    try {
      const url = new URL(endpoint);
      url.searchParams.set("action", "inventory");
      url.searchParams.set("callback", callbackName);
      url.searchParams.set("_", String(Date.now()));
      script.src = url.toString();
      document.head.appendChild(script);
    } catch (err) {
      cleanup();
      reject(err);
    }
  });
}

async function refreshLiveInventory() {
  const data = await requestLiveInventorySnapshot();
  const stockByBarcode = new Map();
  const duplicateBarcodes = new Set((data.duplicates || []).map(normalizeClientInventoryBarcode));

  data.items.forEach(item => {
    const barcode = normalizeClientInventoryBarcode(item.barcode);
    const stock = Number(item.stock);
    if (barcode && Number.isInteger(stock) && stock >= 0 && !duplicateBarcodes.has(barcode)) {
      stockByBarcode.set(barcode, stock);
    }
  });

  let matched = 0;
  let missing = 0;
  let duplicated = 0;
  PRODUCTS.forEach(product => {
    (Array.isArray(product.variants) ? product.variants : []).forEach(variant => {
      const barcode = normalizeClientInventoryBarcode(variant.barcode || variant.internationalBarcode || "");
      variant.__sheetStockSynced = false;
      variant.__sheetStockIssue = "missing";
      if (!barcode) { missing++; return; }
      if (duplicateBarcodes.has(barcode)) {
        variant.__sheetStockIssue = "duplicate";
        duplicated++;
        return;
      }
      if (!stockByBarcode.has(barcode)) { missing++; return; }
      variant.stock = stockByBarcode.get(barcode);
      variant.__sheetStockSynced = true;
      variant.__sheetStockIssue = "";
      matched++;
    });
  });

  INVENTORY_SYNC_READY = true;
  INVENTORY_SYNC_UPDATED_AT = data.updatedAt || new Date().toISOString();
  INVENTORY_SYNC_REPORT = { matched, missing, duplicated, sourceRows: Number(data.sourceRows) || 0 };
  return INVENTORY_SYNC_REPORT;
}

function getLiveStockState(variant) {
  if (!INVENTORY_SYNC_READY || !variant || variant.__sheetStockSynced !== true) {
    const issue = variant && variant.__sheetStockIssue;
    return {
      known: false,
      stock: null,
      available: false,
      label: issue === "duplicate" ? "條碼重複，暫停販售" : (INVENTORY_SYNC_READY && issue === "missing" ? "試算表尚未建檔，暫停販售" : "庫存尚未同步")
    };
  }
  const stock = Number(variant.stock);
  return {
    known: Number.isInteger(stock) && stock >= 0,
    stock,
    available: Number.isInteger(stock) && stock > 0,
    label: stock > 0 ? "庫存：" + stock : "已售完"
  };
}

async function loadProducts(){
 try{
  const r=await fetch("./products.json",{cache:"no-store"});
  if(!r.ok)throw Error("商品資料下載失敗");
  PRODUCTS=await r.json();
  try{
   const report=await refreshLiveInventory();
   const note=document.querySelector(".product-disclaimer");
   if(note)note.textContent=`庫存已連接 Google 試算表「文具資料」：成功同步 ${report.matched} 個規格；尚未建檔 ${report.missing} 個；重複條碼 ${report.duplicated} 個。未同步商品會暫停販售；每 60 秒及重新切回頁面時更新。`;
  }catch(err){
   INVENTORY_SYNC_READY=false;
   const note=document.querySelector(".product-disclaimer");
   if(note)note.textContent="目前無法讀取試算表即時庫存，為避免超賣，暫停加入選購清單。請重新整理或稍後再試。";
   console.error("即時庫存同步失敗",err);
  }
  populateProductFilters();
  renderProducts();
  renderCart();
 }catch(err){
  $("product-grid").innerHTML='<p class="empty-cart">商品資料暫時無法載入，請稍後重新整理。</p>';
  console.error(err);
 }
}
function getVariants(p){return Array.isArray(p.variants)&&p.variants.length?p.variants:[{name:"一般規格",price:Number(p.price)||0,stock:null}]}
function variantPrice(p,v){const n=Number(v?.price??p.price??0);return Number.isFinite(n)&&n>=0?n:0}
function variantInStock(v){return v?.stock===null||v?.stock===undefined||v?.stock===""||Number(v.stock)>0}
function populateProductFilters(){const brands=[...new Set(PRODUCTS.map(p=>p.brand).filter(Boolean))].sort(),funcs=[...new Set(PRODUCTS.map(p=>p.functionCategory).filter(Boolean))].sort();$("brand-filter").innerHTML='<option value="">全部廠牌</option>'+brands.map(x=>`<option>${esc(x)}</option>`).join("");$("function-filter").innerHTML='<option value="">全部功能</option>'+funcs.map(x=>`<option>${esc(x)}</option>`).join("")}
function productStockText(v){return getLiveStockState(v).label}
function updateVisibleProductInventoryUI(){
 document.querySelectorAll(".variant-select").forEach(sel=>{
  const productId=Number(sel.dataset.variantFor);
  const product=PRODUCTS.find(p=>Number(p.id)===productId);
  if(!product)return;
  const variants=getVariants(product);
  Array.from(sel.options).forEach((option,index)=>{
   const variant=variants[index];
   if(!variant)return;
   const state=getLiveStockState(variant);
   option.textContent=`${variant.name}｜${money(variantPrice(product,variant))}｜${state.label}`;
  });
  const selected=variants[Number(sel.value)||0];
  if(selected)updateProductStockControls(productId,selected);
 });
}
function updateProductStockControls(productId,variant){
 const state=getLiveStockState(variant);
 const note=document.querySelector(`[data-stock-for="${productId}"]`);
 const button=document.querySelector(`[data-add="${productId}"]`);
 const input=document.querySelector(`[data-quantity-for="${productId}"]`);
 if(note){note.textContent=state.label;note.classList.toggle("is-sold-out",state.known&&!state.available);note.classList.toggle("is-unverified",!state.known)}
 if(button){button.disabled=!state.known||!state.available;button.textContent=!state.known?"庫存待確認":(!state.available?"暫無庫存":"加入購物車 ＋")}
 if(input){if(state.known)input.max=String(state.stock);else input.removeAttribute("max");if(state.known&&Number(input.value)>state.stock)input.value=String(Math.max(1,state.stock));}
}
function renderProducts(){
 const q=$("product-search").value.trim().toLowerCase(),brand=$("brand-filter").value,func=$("function-filter").value;
 const arr=PRODUCTS.filter(p=>(!brand||p.brand===brand)&&(!func||p.functionCategory===func)&&(p.name+p.desc+p.brand+p.functionCategory).toLowerCase().includes(q));
 $("product-grid").innerHTML=arr.length?arr.map(p=>{
  const variants=getVariants(p),first=variants[0],firstState=getLiveStockState(first);
  const stockUrl=String(p.url||"").trim(),stockHref=stockUrl?safeUrl(stockUrl):"#",stockLink=stockUrl&&stockHref!=="#"?`<a class="product-mall-link" href="${esc(stockHref)}" target="_blank" rel="noopener noreferrer">庫存查詢 ↗</a>`:"";
  const options=variants.map((v,i)=>{const st=getLiveStockState(v);return `<option value="${i}">${esc(v.name)}｜${money(variantPrice(p,v))}｜${esc(st.label)}</option>`}).join("");
  const buttonLabel=!firstState.known?"庫存待確認":(!firstState.available?"暫無庫存":"加入購物車 ＋");
  const galleryImages=Array.isArray(p.images)&&p.images.length?p.images.filter(Boolean):[p.image].filter(Boolean);
  const gallery=galleryImages.length?`<img src="${safeUrl(galleryImages[0])}" alt="${esc(p.name)}" loading="lazy" data-gallery-image>${galleryImages.length>1?`<button type="button" class="gallery-arrow gallery-prev" data-gallery-prev="${p.id}" aria-label="上一張圖片">‹</button><button type="button" class="gallery-arrow gallery-next" data-gallery-next="${p.id}" aria-label="下一張圖片">›</button><span class="gallery-count" data-gallery-count="${p.id}">1 / ${galleryImages.length}</span><div class="gallery-dots">${galleryImages.map((_,i)=>`<button type="button" class="gallery-dot ${i===0?"active":""}" data-gallery-dot="${p.id}" data-gallery-index="${i}" aria-label="第 ${i+1} 張圖片"></button>`).join("")}</div>`:""}`:`<span class="product-image-empty" aria-hidden="true"></span>`;
  return `<article class="product-card"><div class="product-image" data-gallery="${p.id}" data-gallery-images="${esc(JSON.stringify(galleryImages))}" data-gallery-index="0">${gallery}</div><div class="product-details"><h3>${esc(p.name)}</h3><p>${esc(p.desc||"")}</p><span class="product-price" data-price-for="${p.id}">規格價格 ${money(variantPrice(p,first))}</span><label class="variant-select-label">選擇規格<select class="variant-select" data-variant-for="${p.id}">${options}</select></label><p class="live-stock-label ${!firstState.known?"is-unverified":""} ${firstState.known&&!firstState.available?"is-sold-out":""}" data-stock-for="${p.id}">${esc(firstState.label)}</p>${stockLink}</div><div class="product-actions"><label class="product-quantity-label">數量 <input class="product-quantity" type="number" min="1" ${firstState.known?`max="${firstState.stock}"`:""} step="1" value="1" data-quantity-for="${p.id}"></label><button class="add-button" data-add="${p.id}" ${!firstState.known||!firstState.available?"disabled":""}>${buttonLabel}</button></div></article>`;
 }).join(""):'<p class="no-results">找不到符合的商品。</p>';
}
function persist(){localStorage.setItem(CART_KEY,JSON.stringify(cart));renderCart()}
function selectedVariant(p,variantName){return getVariants(p).find(v=>v.name===variantName)||getVariants(p)[0]}
function renderCart(){
 cart=cart.filter(x=>PRODUCTS.some(p=>Number(p.id)===Number(x.id))&&x.qty>0);
 const n=cart.reduce((a,x)=>a+x.qty,0),total=cart.reduce((a,x)=>{const p=PRODUCTS.find(p=>Number(p.id)===Number(x.id)),v=selectedVariant(p,x.variant);return a+x.qty*variantPrice(p,v)},0);
 $("cart-count").textContent=n;$("cart-total").textContent=money(total);
 $("cart-items").innerHTML=cart.length?cart.map(x=>{
  const p=PRODUCTS.find(p=>Number(p.id)===Number(x.id)),v=selectedVariant(p,x.variant),price=variantPrice(p,v),state=getLiveStockState(v);
  const stockText=state.known?`庫存 ${state.stock}`:state.label;
  const plusDisabled=!state.known||x.qty>=state.stock;
  return `<div class="cart-line"><div><h4>${esc(p.name)}</h4><p>${esc(x.variant||"一般規格")}｜${money(price)} × ${x.qty}｜${esc(stockText)}</p><div class="quantity-control"><button data-qty="${p.id}" data-variant="${esc(x.variant||"一般規格")}" data-delta="-1">−</button><span>${x.qty}</span><button data-qty="${p.id}" data-variant="${esc(x.variant||"一般規格")}" data-delta="1" ${plusDisabled?"disabled":""}>＋</button><button class="remove-button" data-remove="${p.id}" data-variant="${esc(x.variant||"一般規格")}">移除</button></div></div><strong>${money(price*x.qty)}</strong></div>`;
 }).join(""):'<div class="empty-cart">選購清單目前是空的，去看看日常選物吧。</div>';
}
$("product-grid").addEventListener("change",e=>{
 const sel=e.target.closest(".variant-select");if(!sel)return;
 const id=Number(sel.dataset.variantFor),p=PRODUCTS.find(x=>Number(x.id)===id),v=getVariants(p)[Number(sel.value)];
 const priceNode=document.querySelector(`[data-price-for="${id}"]`);
 if(priceNode&&v)priceNode.textContent=`規格價格 ${money(variantPrice(p,v))}`;
 if(v)updateProductStockControls(id,v);
});
$("product-grid").addEventListener("click",e=>{
 const b=e.target.closest("[data-add]");if(!b)return;e.preventDefault();
 const id=Number(b.dataset.add),p=PRODUCTS.find(x=>Number(x.id)===id),sel=document.querySelector(`[data-variant-for="${id}"]`),variant=getVariants(p)[Number(sel?.value||0)];
 if(!variant){alert("請先選擇商品規格。");return}
 const state=getLiveStockState(variant);
 if(!state.known){alert("此商品庫存尚未從 Google 試算表同步，暫時不能加入購物車。");return}
 if(!state.available){alert("此商品目前已售完。");return}
 const qtyInput=document.querySelector(`[data-quantity-for="${id}"]`),addQty=Math.max(1,Math.floor(Number(qtyInput?.value)||1));
 const x=cart.find(v=>Number(v.id)===id&&v.variant===variant.name),already=x?x.qty:0;
 if(already+addQty>state.stock){alert(`目前庫存只有 ${state.stock} 件，購物車已有 ${already} 件。`);return}
 x?x.qty+=addQty:cart.push({id,variant:variant.name,qty:addQty});persist();
 const old=b.textContent;b.textContent="已加入 ✓";setTimeout(()=>{if(document.contains(b))b.textContent=old},900);
});
$("cart-items").addEventListener("click",e=>{
 let q=e.target.closest("[data-qty]"),r=e.target.closest("[data-remove]");
 if(q){
  let x=cart.find(v=>Number(v.id)===Number(q.dataset.qty)&&v.variant===q.dataset.variant);
  if(x){
   const delta=Number(q.dataset.delta),p=PRODUCTS.find(v=>Number(v.id)===Number(x.id)),variant=selectedVariant(p,x.variant),state=getLiveStockState(variant);
   if(delta>0&&(!state.known||x.qty+delta>state.stock)){alert(state.known?`目前庫存只有 ${state.stock} 件，無法再增加數量。`:"尚未取得最新庫存，暫時不能增加數量。");return;}
   x.qty+=delta;if(x.qty<1)cart=cart.filter(v=>v!==x);persist();
  }
 }
 if(r){cart=cart.filter(v=>!(Number(v.id)===Number(r.dataset.remove)&&v.variant===r.dataset.variant));persist()}
});
function openCart(){$("cart-drawer").classList.add("open");$("overlay").classList.add("show")}function closeCart(){$("cart-drawer").classList.remove("open");$("overlay").classList.remove("show")}
$("open-cart").onclick=openCart;$("close-cart").onclick=closeCart;$("overlay").onclick=closeCart;
$("menu-toggle").onclick=()=>{let n=$("main-nav").classList.toggle("open");$("menu-toggle").setAttribute("aria-expanded",String(n))};$("main-nav").onclick=e=>{if(e.target.closest("a"))$("main-nav").classList.remove("open")};
$("product-search").oninput=renderProducts;$("brand-filter").onchange=renderProducts;$("function-filter").onchange=renderProducts;$("year").textContent=new Date().getFullYear();loadProducts();
let inventoryRefreshBusy=false;
async function refreshWebsiteInventory(){
 if(inventoryRefreshBusy||!PRODUCTS.length)return;
 inventoryRefreshBusy=true;
 try{
  const report=await refreshLiveInventory();
  const note=document.querySelector(".product-disclaimer");
  if(note)note.textContent=`庫存已連接 Google 試算表「文具資料」：成功同步 ${report.matched} 個規格；尚未建檔 ${report.missing} 個；重複條碼 ${report.duplicated} 個。未同步商品會暫停販售；每 60 秒及重新切回頁面時更新。`;
 }catch(err){
  INVENTORY_SYNC_READY=false;
  const note=document.querySelector(".product-disclaimer");
  if(note)note.textContent="目前無法取得試算表最新庫存，已暫停加入選購清單。請重新整理頁面後再試。";
  console.error("庫存重新同步失敗",err);
 }
 updateVisibleProductInventoryUI();
 renderCart();
 inventoryRefreshBusy=false;
}
window.addEventListener("focus",refreshWebsiteInventory);
setInterval(refreshWebsiteInventory,60000);
// Checkout now lives on a dedicated page.
$("checkout-open").addEventListener("click",()=>{
 if(!cart.length){alert("請先加入商品再結帳。");return}
 location.href="checkout.html";
});

// Load editable store notice from announcement.json
async function loadAnnouncement(){
 try{
  const res=await fetch("./announcement.json",{cache:"no-store"});
  if(!res.ok)throw Error();
  const notice=await res.json();
  const title=document.getElementById("notice-title");
  const message=document.getElementById("notice-message");
  const updated=document.getElementById("notice-updated");
  if(title)title.textContent=notice.title||"翔安富文具公告";
  if(message)message.textContent=notice.message||"";
  if(updated&&notice.updatedAt)updated.textContent="更新："+notice.updatedAt;
 }catch(err){console.warn("公告資料讀取失敗",err)}
}
loadAnnouncement();

async function loadSiteSettings(){
 try{
  const r=await fetch("./site-settings.json",{cache:"no-store"});
  if(!r.ok)return;
  const settings=await r.json();
  if(settings.logo){
   document.querySelectorAll(".site-logo-mark").forEach(el=>{
    el.textContent="";
    el.style.backgroundImage=`url("${settings.logo}")`;
    el.style.backgroundSize="contain";
    el.style.backgroundPosition="center";
    el.style.backgroundRepeat="no-repeat";
    el.classList.add("has-site-logo");
   });
  }
 }catch(err){console.warn("網站設定讀取失敗",err)}
}
loadSiteSettings();

// 手機號碼查詢訂單（Apps Script JSONP）
function lookupOrders(phone){const endpoint=window.CHECKOUT_CONFIG?.WEB_APP_URL||"";if(!endpoint){$("lookup-status").textContent="尚未設定訂單查詢網址。";return}const callback="orderLookup"+Date.now();window[callback]=data=>{delete window[callback];script.remove();if(!data.ok){$("lookup-status").textContent=data.error||"查詢失敗";return}const rows=data.orders||[];$("lookup-status").textContent=rows.length?`查到 ${rows.length} 筆訂單`:"查無此手機號碼的訂單。";$("lookup-results").innerHTML=rows.map(o=>`<article class="lookup-order"><strong>${esc(o.orderId)}</strong><span>${esc(o.createdAt)}</span><p>${esc(o.goods)}</p><p>門市店號：${esc(o.storeId)}｜商品金額：NT$ ${esc(o.productAmount)}｜運費：NT$ ${esc(o.shippingFee)}</p><b>狀態：${esc(o.status)}</b></article>`).join("")};const script=document.createElement("script");script.src=endpoint+"?phone="+encodeURIComponent(phone)+"&callback="+callback;script.onerror=()=>{$("lookup-status").textContent="查詢服務暫時無法連線，請稍後再試。";delete window[callback]};document.body.appendChild(script)}
$("order-lookup-form").addEventListener("submit",e=>{e.preventDefault();const phone=$("lookup-phone").value.replace(/\D/g,"");$("lookup-results").innerHTML="";if(!/^\d{10}$/.test(phone)){$("lookup-status").textContent="請輸入正確的 10 碼手機號碼。";return}$("lookup-status").textContent="查詢中…";lookupOrders(phone)});

// 多張商品圖片輪播：支援左右箭頭、圓點與觸控滑動。
(function setupProductGallery(){
 const grid=document.getElementById("product-grid");if(!grid)return;
 function show(box,index){
  let images=[];try{images=JSON.parse(box.dataset.galleryImages||"[]")}catch{}
  if(!images.length)return;
  index=(index+images.length)%images.length;
  box.dataset.galleryIndex=String(index);
  const img=box.querySelector("[data-gallery-image]");
  if(img){img.src=safeUrl(images[index]);img.alt=`商品圖片 ${index+1}`;}
  const count=box.querySelector("[data-gallery-count]");if(count)count.textContent=`${index+1} / ${images.length}`;
  box.querySelectorAll("[data-gallery-dot]").forEach((dot,i)=>dot.classList.toggle("active",i===index));
 }
 grid.addEventListener("click",e=>{
  const arrow=e.target.closest("[data-gallery-prev],[data-gallery-next]");
  const dot=e.target.closest("[data-gallery-dot]");
  if(arrow){const box=arrow.closest("[data-gallery]");show(box,Number(box.dataset.galleryIndex||0)+(arrow.hasAttribute("data-gallery-next")?1:-1));}
  else if(dot){show(dot.closest("[data-gallery]"),Number(dot.dataset.galleryIndex||0));}
 });
 let touchX=0;
 grid.addEventListener("touchstart",e=>{const box=e.target.closest("[data-gallery]");if(box)touchX=e.touches[0].clientX;},{passive:true});
 grid.addEventListener("touchend",e=>{
  const box=e.target.closest("[data-gallery]");if(!box||!touchX)return;
  const dx=e.changedTouches[0].clientX-touchX;touchX=0;
  if(Math.abs(dx)>35)show(box,Number(box.dataset.galleryIndex||0)+(dx<0?1:-1));
 },{passive:true});
})();

// V30：點擊商品圖片可放大檢視
(function setupProductImageZoom(){
 const grid=document.getElementById('product-grid');
 if(!grid)return;
 let modal=null;
 function closeZoom(){if(!modal)return;modal.classList.remove('is-open');document.body.classList.remove('image-zoom-open');}
 function openZoom(img){
  if(!modal){
   modal=document.createElement('div');modal.className='image-zoom-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','商品圖片放大檢視');
   modal.innerHTML='<button type="button" class="image-zoom-close" aria-label="關閉圖片">×</button><img class="image-zoom-full" alt=""><p class="image-zoom-hint">點擊圖片外圍或按 Esc 關閉</p>';
   document.body.appendChild(modal);
   modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('.image-zoom-close'))closeZoom();});
  }
  const large=modal.querySelector('.image-zoom-full');large.src=img.currentSrc||img.src;large.alt=img.alt||'商品圖片';
  modal.classList.add('is-open');document.body.classList.add('image-zoom-open');modal.querySelector('.image-zoom-close').focus();
 }
 grid.addEventListener('click',e=>{const img=e.target.closest('.product-image img');if(img){e.preventDefault();openZoom(img);}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeZoom();});
})();
