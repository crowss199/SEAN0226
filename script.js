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
