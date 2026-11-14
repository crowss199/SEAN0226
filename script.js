// 翔安富文具官方網站：iOPEN Mall 導購版本
const MALL_URL = "https://mall.iopenmall.tw/011553/";
// 商品名稱與參考價格依目前公開賣場頁面整理；實際規格、售價與庫存請以 iOPEN Mall 即時頁面為準。
const PRODUCTS = [
  {id:1,name:"三菱鉛筆 UNI HI-UNI GRCT 自動鉛筆筆芯",desc:"0.3mm／0.5mm｜賣場熱門推薦",price:75,tag:"人氣商品",symbol:"UNI"},
  {id:2,name:"KOKUYO Campus Junior Pencil 自動鉛筆",desc:"六角軸｜0.9mm／1.3mm",price:45,tag:"KOKUYO",symbol:"K"},
  {id:3,name:"三菱 Jetstream EDGE 原子筆筆芯",desc:"SXR-203-28｜0.28mm",price:50,tag:"三菱鉛筆",symbol:"JET"},
  {id:4,name:"三菱 2.0mm 筆芯專用削鉛筆機",desc:"型號 DPS600",price:157,tag:"實用文具",symbol:"2.0"},
  {id:5,name:"PENTEL PG-METAL350 自動鉛筆",desc:"PG315｜0.5mm 製圖筆",price:99,tag:"PENTEL",symbol:"PG"},
  {id:6,name:"三菱 JETSTREAM 4+1 機能筆",desc:"MSXE5-1000-07｜0.7系列",price:243,tag:"人氣推薦",symbol:"4+1"}
];
const CART_KEY = "xiangAnMallShortlistV1";
let cart = [];
try { cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { cart = []; }
const $ = id => document.getElementById(id);
const money = n => "NT$ " + Number(n).toLocaleString("zh-TW");
const save = () => { localStorage.setItem(CART_KEY, JSON.stringify(cart)); renderCart(); };

function renderProducts(){
  $("product-grid").innerHTML = PRODUCTS.map(p=>`
    <article class="product-card">
      <a class="product-card-link" href="${MALL_URL}" target="_blank" rel="noopener noreferrer" aria-label="前往 iOPEN Mall 查看${p.name}">
        <div class="product-image">${p.tag?`<span class="product-tag">${p.tag}</span>`:""}<span class="product-symbol">${p.symbol}</span></div>
        <div class="product-details"><h3>${p.name}</h3><p>${p.desc}</p><span class="product-price">參考價 ${money(p.price)}</span></div>
      </a>
      <div class="product-actions"><button class="add-button" data-add="${p.id}">加入選購清單 +</button><a class="product-mall-link" href="${MALL_URL}" target="_blank" rel="noopener noreferrer">賣場查看 ↗</a></div>
    </article>`).join("");
}
function addToCart(id){const item=cart.find(x=>x.id===id);if(item)item.qty++;else cart.push({id,qty:1});save();}
function renderCart(){
  cart = cart.filter(x=>PRODUCTS.some(p=>p.id===x.id) && Number.isInteger(x.qty) && x.qty>0);
  const count=cart.reduce((s,x)=>s+x.qty,0), total=cart.reduce((s,x)=>s+x.qty*PRODUCTS.find(p=>p.id===x.id).price,0);
  $("cart-count").textContent=count;$("cart-total").textContent=money(total);
  $("cart-items").innerHTML=cart.length?cart.map(x=>{const p=PRODUCTS.find(p=>p.id===x.id);return `<div class="cart-line"><div><h4>${p.name}</h4><p>參考價 ${money(p.price)} × ${x.qty}</p><div class="quantity-control"><button data-qty="${p.id}" data-delta="-1" aria-label="減少數量">−</button><span>${x.qty}</span><button data-qty="${p.id}" data-delta="1" aria-label="增加數量">+</button><button class="remove-button" data-remove="${p.id}">移除</button></div></div><strong>${money(p.price*x.qty)}</strong></div>`}).join(""):'<div class="empty-cart">選購清單目前是空的，去看看精選商品吧。</div>';
}
function openCart(){ $("cart-drawer").classList.add("open");$("overlay").classList.add("show"); }
function closeCart(){ $("cart-drawer").classList.remove("open");$("overlay").classList.remove("show"); }
$("product-grid").addEventListener("click",e=>{const b=e.target.closest("[data-add]");if(b){e.preventDefault();addToCart(Number(b.dataset.add));b.textContent="已加入 ✓";setTimeout(()=>b.textContent="加入選購清單 +",900)}});
$("cart-items").addEventListener("click",e=>{const q=e.target.closest("[data-qty]"),r=e.target.closest("[data-remove]");if(q){const id=Number(q.dataset.qty),item=cart.find(x=>x.id===id);if(item){item.qty+=Number(q.dataset.delta);if(item.qty<=0)cart=cart.filter(x=>x.id!==id);save()}}if(r){cart=cart.filter(x=>x.id!==Number(r.dataset.remove));save()}});
$("open-cart").onclick=openCart;$("close-cart").onclick=closeCart;$("overlay").onclick=closeCart;
$("year").textContent=new Date().getFullYear();
renderProducts();renderCart();
