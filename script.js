const CART_KEY="xiangAnJapandiCart";
let PRODUCTS=[],cart=[];const $=id=>document.getElementById(id),money=n=>"NT$ "+Number(n).toLocaleString("zh-TW");
try{cart=JSON.parse(localStorage.getItem(CART_KEY)||"[]")}catch{cart=[]}
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeUrl=s=>{try{let u=new URL(s||"#",location.href);return ["http:","https:"].includes(u.protocol)?u.href:"#"}catch{return "#"}};
async function loadProducts(){try{let r=await fetch("./products.json");if(!r.ok)throw Error();PRODUCTS=await r.json();renderProducts();renderCart()}catch{$("product-grid").innerHTML='<p class="empty-cart">商品資料暫時無法載入，請稍後重新整理。</p>'}}
function renderProducts(){let cat=document.querySelector(".category-tab.active")?.dataset.category||"all",q=$("product-search").value.trim().toLowerCase();let arr=PRODUCTS.filter(p=>(cat==="all"||p.category===cat)&&(p.name+p.desc).toLowerCase().includes(q));$("product-grid").innerHTML=arr.length?arr.map(p=>`<article class="product-card"><div class="product-image">${p.tag?`<span class="product-tag">${esc(p.tag)}</span>`:""}${p.image?`<img src="${safeUrl(p.image)}" alt="${esc(p.name)}" loading="lazy">`:`<span class="product-symbol">${esc(p.symbol||"文具")}</span>`}</div><div class="product-details"><h3>${esc(p.name)}</h3><p>${esc(p.desc||"")}</p><span class="product-price">參考價 ${money(p.price)}</span></div><div class="product-actions"><button class="add-button" data-add="${p.id}">加入選購清單 ＋</button></div></article>`).join(""):'<p class="no-results">找不到符合的商品。</p>'}
function persist(){localStorage.setItem(CART_KEY,JSON.stringify(cart));renderCart()}
function renderCart(){cart=cart.filter(x=>PRODUCTS.some(p=>p.id===x.id)&&x.qty>0);let n=cart.reduce((a,x)=>a+x.qty,0),total=cart.reduce((a,x)=>a+x.qty*Number(PRODUCTS.find(p=>p.id===x.id).price),0);$("cart-count").textContent=n;$("cart-total").textContent=money(total);$("cart-items").innerHTML=cart.length?cart.map(x=>{let p=PRODUCTS.find(p=>p.id===x.id);return `<div class="cart-line"><div><h4>${esc(p.name)}</h4><p>參考價 ${money(p.price)} × ${x.qty}</p><div class="quantity-control"><button data-qty="${p.id}" data-delta="-1">−</button><span>${x.qty}</span><button data-qty="${p.id}" data-delta="1">＋</button><button class="remove-button" data-remove="${p.id}">移除</button></div></div><strong>${money(p.price*x.qty)}</strong></div>`}).join(""):'<div class="empty-cart">選購清單目前是空的，去看看日常選物吧。</div>'}
$("product-grid").addEventListener("click",e=>{let b=e.target.closest("[data-add]");if(!b)return;e.preventDefault();let id=Number(b.dataset.add),x=cart.find(v=>v.id===id);x?x.qty++:cart.push({id,qty:1});persist();b.textContent="已加入 ✓";setTimeout(()=>b.textContent="加入選購清單 ＋",900)});
$("cart-items").addEventListener("click",e=>{let q=e.target.closest("[data-qty]"),r=e.target.closest("[data-remove]");if(q){let x=cart.find(v=>v.id===Number(q.dataset.qty));x.qty+=Number(q.dataset.delta);if(x.qty<1)cart=cart.filter(v=>v!==x);persist()}if(r){cart=cart.filter(v=>v.id!==Number(r.dataset.remove));persist()}});
function openCart(){$("cart-drawer").classList.add("open");$("overlay").classList.add("show")}function closeCart(){$("cart-drawer").classList.remove("open");$("overlay").classList.remove("show")}
$("open-cart").onclick=openCart;$("close-cart").onclick=closeCart;$("overlay").onclick=closeCart;
$("menu-toggle").onclick=()=>{let n=$("main-nav").classList.toggle("open");$("menu-toggle").setAttribute("aria-expanded",String(n))};$("main-nav").onclick=e=>{if(e.target.closest("a"))$("main-nav").classList.remove("open")};
document.querySelectorAll("[data-category]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-category]").forEach(x=>x.classList.toggle("active",x===b));renderProducts()});$("product-search").oninput=renderProducts;$("year").textContent=new Date().getFullYear();loadProducts();
function cartSubtotal(){return cart.reduce((sum,x)=>sum+x.qty*Number(PRODUCTS.find(p=>p.id===x.id)?.price||0),0)}
function updateGrandTotal(){const fee=Number(document.querySelector('[name="shippingFee"]')?.value||0);const el=$("checkout-grand-total");if(el)el.textContent=money(cartSubtotal()+fee)}
$("checkout-open").onclick=()=>{if(!cart.length){$("checkout-status").textContent="請先加入商品再結帳。";return}$("checkout-form").hidden=false;updateGrandTotal();$("checkout-form").scrollIntoView({behavior:"smooth",block:"nearest"})};
document.querySelector('[name="shippingFee"]').addEventListener("input",updateGrandTotal);
$("checkout-form").addEventListener("submit",async e=>{
 e.preventDefault();if(!cart.length)return;
 const endpoint=window.CHECKOUT_CONFIG?.WEB_APP_URL||"";
 if(!endpoint||endpoint.includes("請填入")){$("checkout-status").textContent="尚未設定 Google 試算表接收網址，請先完成 README 設定。";return}
 const f=new FormData(e.currentTarget),fee=Number(f.get("shippingFee")),subtotal=cartSubtotal();
 if(subtotal+fee<55||subtotal+fee>20000){$("checkout-status").textContent="商品金額加運費需介於 55 至 20,000 元。";return}
 const items=cart.map(x=>{const p=PRODUCTS.find(p=>p.id===x.id);return{name:p.name,quantity:x.qty,unitPrice:Number(p.price),amount:Number(p.price)*x.qty}});
 const order={orderId:"XAFW"+Date.now(),createdAt:new Date().toISOString(),recipient:String(f.get("recipient")).trim(),phone:String(f.get("phone")).trim(),storeId:String(f.get("storeId")).trim(),storeName:String(f.get("storeName")||"").trim(),storeAddress:String(f.get("storeAddress")||"").trim(),temperature:f.get("temperature"),items,productAmount:subtotal,shippingFee:fee,totalAmount:subtotal+fee,note:String(f.get("note")||""),social:String(f.get("social")||"")};
 const btn=$("checkout-submit");btn.disabled=true;btn.textContent="送出中…";$("checkout-status").textContent="正在送出訂單…";
 try{await fetch(endpoint,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(order)});$("checkout-status").textContent="已送出訂單請求，請保留編號："+order.orderId+"；店家會核對試算表。";cart=[];persist();e.currentTarget.reset();updateGrandTotal()}
 catch(err){$("checkout-status").textContent="送出失敗，請稍後再試。"}
 finally{btn.disabled=false;btn.textContent="確認送出訂單"}
});

// 7-ELEVEN official store map: open separately; user copies the selected store ID back.
$("open-store-map").addEventListener("click",()=>{
 window.open("https://emap.pcsc.com.tw/ecmap/default.aspx","_blank","noopener");
});
$("store-id").addEventListener("input",e=>{
 e.target.value=e.target.value.replace(/\D/g,"").slice(0,6);
});
