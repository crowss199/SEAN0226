const CART_KEY="xiangAnJapandiCart";
let PRODUCTS=[],cart=[];const $=id=>document.getElementById(id),money=n=>"NT$ "+Number(n).toLocaleString("zh-TW");
try{cart=JSON.parse(localStorage.getItem(CART_KEY)||"[]")}catch{cart=[]}
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeUrl=s=>{try{let u=new URL(s||"#",location.href);return ["http:","https:"].includes(u.protocol)?u.href:"#"}catch{return "#"}};
async function loadProducts(){try{let r=await fetch("./products.json");if(!r.ok)throw Error();PRODUCTS=await r.json();renderProducts();renderCart()}catch{$("product-grid").innerHTML='<p class="empty-cart">商品資料暫時無法載入，請稍後重新整理。</p>'}}
function getVariants(p){return Array.isArray(p.variants)&&p.variants.length?p.variants:[{name:"一般規格",stock:null}]}
function renderProducts(){let cat=document.querySelector(".category-tab.active")?.dataset.category||"all",q=$("product-search").value.trim().toLowerCase();let arr=PRODUCTS.filter(p=>(cat==="all"||p.category===cat)&&(p.name+p.desc+p.productCode).toLowerCase().includes(q));$("product-grid").innerHTML=arr.length?arr.map(p=>{let vs=getVariants(p),available=vs.some(v=>v.stock===null||Number(v.stock)>0);return `<article class="product-card"><div class="product-image">${p.tag?`<span class="product-tag">${esc(p.tag)}</span>`:""}${p.image?`<img src="${safeUrl(p.image)}" alt="${esc(p.name)}" loading="lazy">`:`<span class="product-symbol">${esc(p.symbol||"文具")}</span>`}</div><div class="product-details"><small class="product-code">商品編號 ${esc(p.productCode||("P"+p.id))}</small><h3>${esc(p.name)}</h3><p>${esc(p.desc||"")}</p><span class="product-price">參考價 ${money(p.price)}</span><label class="variant-select-label">選擇規格<select class="variant-select" data-variant-for="${p.id}">${vs.map((v,i)=>`<option value="${i}" ${(v.stock!==null&&Number(v.stock)<=0)?"disabled":""}>${esc(v.name)}${v.stock===null?"":`（庫存 ${Number(v.stock)}）`}</option>`).join("")}</select></label></div><div class="product-actions"><button class="add-button" data-add="${p.id}" ${available?"":"disabled"}>${available?"加入選購清單 ＋":"目前缺貨"}</button></div></article>`}).join(""):'<p class="no-results">找不到符合的商品。</p>'}
function persist(){localStorage.setItem(CART_KEY,JSON.stringify(cart));renderCart()}
function selectedVariant(p,variantName){return getVariants(p).find(v=>v.name===variantName)||getVariants(p)[0]}
function renderCart(){
 cart=cart.filter(x=>PRODUCTS.some(p=>Number(p.id)===Number(x.id))&&x.qty>0);
 let n=cart.reduce((a,x)=>a+x.qty,0),total=cart.reduce((a,x)=>{let p=PRODUCTS.find(p=>Number(p.id)===Number(x.id));return a+x.qty*Number(p.price)},0);
 $("cart-count").textContent=n;$("cart-total").textContent=money(total);
 $("cart-items").innerHTML=cart.length?cart.map(x=>{let p=PRODUCTS.find(p=>Number(p.id)===Number(x.id));return `<div class="cart-line"><div><h4>${esc(p.name)}</h4><p>${esc(x.variant||"一般規格")}｜${money(p.price)} × ${x.qty}</p><div class="quantity-control"><button data-qty="${p.id}" data-variant="${esc(x.variant||"一般規格")}" data-delta="-1">−</button><span>${x.qty}</span><button data-qty="${p.id}" data-variant="${esc(x.variant||"一般規格")}" data-delta="1">＋</button><button type="button" class="remove-button" data-remove="${p.id}" data-variant="${esc(x.variant||"一般規格")}" aria-label="刪除${esc(p.name)}（${esc(x.variant||"一般規格")}）">刪除商品</button></div></div><strong>${money(p.price*x.qty)}</strong></div>`}).join(""):'<div class="empty-cart">選購清單目前是空的，去看看日常選物吧。</div>';
}
$("product-grid").addEventListener("click",e=>{
 let b=e.target.closest("[data-add]");if(!b)return;e.preventDefault();
 let id=Number(b.dataset.add),p=PRODUCTS.find(p=>Number(p.id)===id),sel=document.querySelector(`[data-variant-for="${id}"]`),variant=getVariants(p)[Number(sel?.value||0)];
 if(!variant){alert("請先選擇商品規格。");return}
 let x=cart.find(v=>Number(v.id)===id&&v.variant===variant.name),limit=variant.stock===null?Infinity:Number(variant.stock);
 if(x&&x.qty>=limit){alert("此規格庫存不足。");return}
 if(!x&&limit<1){alert("此規格目前缺貨。");return}
 x?x.qty++:cart.push({id,variant:variant.name,qty:1});persist();
 let old=b.textContent;b.textContent="已加入 ✓";setTimeout(()=>b.textContent=old,900);
});
$("cart-items").addEventListener("click",e=>{
 let q=e.target.closest("[data-qty]"),r=e.target.closest("[data-remove]");
 if(q){
  let x=cart.find(v=>Number(v.id)===Number(q.dataset.qty)&&v.variant===q.dataset.variant);
  if(x){let p=PRODUCTS.find(p=>Number(p.id)===Number(x.id)),v=selectedVariant(p,x.variant),limit=v?.stock===null?Infinity:Number(v?.stock??0);
   if(Number(q.dataset.delta)>0&&x.qty>=limit){alert("此規格庫存不足。");return}
   x.qty+=Number(q.dataset.delta);if(x.qty<1)cart=cart.filter(v=>v!==x);persist();
  }
 }
 if(r){cart=cart.filter(v=>!(Number(v.id)===Number(r.dataset.remove)&&v.variant===r.dataset.variant));persist()}
});
function openCart(){$("cart-drawer").classList.add("open");$("overlay").classList.add("show")}function closeCart(){$("cart-drawer").classList.remove("open");$("overlay").classList.remove("show")}
$("open-cart").onclick=openCart;$("close-cart").onclick=closeCart;$("overlay").onclick=closeCart;
$("menu-toggle").onclick=()=>{let n=$("main-nav").classList.toggle("open");$("menu-toggle").setAttribute("aria-expanded",String(n))};$("main-nav").onclick=e=>{if(e.target.closest("a"))$("main-nav").classList.remove("open")};
document.querySelectorAll("[data-category]").forEach(b=>b.onclick=()=>{document.querySelectorAll("[data-category]").forEach(x=>x.classList.toggle("active",x===b));renderProducts()});$("product-search").oninput=renderProducts;$("year").textContent=new Date().getFullYear();loadProducts();
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
