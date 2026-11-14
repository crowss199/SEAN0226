// 翔安富文賜購物網站：商品可在下方 PRODUCTS 陣列修改
const PRODUCTS = [
  {id:1,name:"日常質感選物 A",desc:"簡約設計，適合日常使用。",price:390,tag:"POPULAR",symbol:"A"},
  {id:2,name:"生活風格選物 B",desc:"兼具實用與美感的生活好物。",price:590,tag:"NEW",symbol:"B"},
  {id:3,name:"經典實用選物 C",desc:"細節講究，簡單耐看。",price:790,tag:"SELECT",symbol:"C"},
  {id:4,name:"質感配件 D",desc:"為日常搭配增添亮點。",price:290,tag:"",symbol:"D"},
  {id:5,name:"居家生活選物 E",desc:"讓生活空間更舒適自在。",price:490,tag:"",symbol:"E"},
  {id:6,name:"人氣精選商品 F",desc:"值得細細品味的日常好物。",price:990,tag:"LIMITED",symbol:"F"}
];
// 請將上方第 5 項的 price:490 改成實際數字，例如 price:490
const CART_KEY = "xiangAnCartV1";
let cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
const $ = id => document.getElementById(id);
const money = n => "NT$ " + Number(n).toLocaleString("zh-TW");
const save = () => { localStorage.setItem(CART_KEY, JSON.stringify(cart)); renderCart(); };
function renderProducts(){
  $("product-grid").innerHTML = PRODUCTS.map(p=>`
    <article class="product-card">
      <div class="product-image">${p.tag?`<span class="product-tag">${p.tag}</span>`:""}<span class="product-symbol">${p.symbol}</span></div>
      <div class="product-details"><h3>${p.name}</h3><p>${p.desc}</p><span class="product-price">${money(p.price)}</span><button class="add-button" data-add="${p.id}">加入購物車 +</button></div>
    </article>`).join("");
}
function addToCart(id){const item=cart.find(x=>x.id===id);if(item)item.qty++;else cart.push({id,qty:1});save();}
function renderCart(){
  const count=cart.reduce((s,x)=>s+x.qty,0), total=cart.reduce((s,x)=>s+x.qty*PRODUCTS.find(p=>p.id===x.id).price,0);
  $("cart-count").textContent=count;$("cart-total").textContent=money(total);$("checkout-total").textContent=money(total);
  $("cart-items").innerHTML=cart.length?cart.map(x=>{const p=PRODUCTS.find(p=>p.id===x.id);return `<div class="cart-line"><div><h4>${p.name}</h4><p>${money(p.price)} × ${x.qty}</p><div class="quantity-control"><button data-qty="${p.id}" data-delta="-1">−</button><span>${x.qty}</span><button data-qty="${p.id}" data-delta="1">+</button><button class="remove-button" data-remove="${p.id}">移除</button></div></div><strong>${money(p.price*x.qty)}</strong></div>`}).join(""):'<div class="empty-cart">購物車目前是空的，去挑選喜歡的商品吧。</div>';
}
function openCart(){ $("cart-drawer").classList.add("open");$("overlay").classList.add("show"); }
function closeCart(){ $("cart-drawer").classList.remove("open");$("overlay").classList.remove("show"); }
$("product-grid").addEventListener("click",e=>{const b=e.target.closest("[data-add]");if(b){addToCart(Number(b.dataset.add));b.textContent="已加入 ✓";setTimeout(()=>b.textContent="加入購物車 +",900)}});
$("cart-items").addEventListener("click",e=>{const q=e.target.closest("[data-qty]"),r=e.target.closest("[data-remove]");if(q){const id=Number(q.dataset.qty),item=cart.find(x=>x.id===id);item.qty+=Number(q.dataset.delta);if(item.qty<=0)cart=cart.filter(x=>x.id!==id);save()}if(r){cart=cart.filter(x=>x.id!==Number(r.dataset.remove));save()}});
$("open-cart").onclick=openCart;$("close-cart").onclick=closeCart;$("overlay").onclick=closeCart;
$("checkout-button").onclick=()=>{if(!cart.length){alert("購物車目前是空的");return}closeCart();$("checkout-modal").classList.add("show")};
$("close-checkout").onclick=()=>$("checkout-modal").classList.remove("show");
$("checkout-form").addEventListener("submit",e=>{
  e.preventDefault();if(!cart.length)return;
  const data=Object.fromEntries(new FormData(e.target).entries());
  const lines=cart.map(x=>{const p=PRODUCTS.find(p=>p.id===x.id);return `${p.name} × ${x.qty}　${money(p.price*x.qty)}`});
  const total=cart.reduce((s,x)=>s+x.qty*PRODUCTS.find(p=>p.id===x.id).price,0);
  const order=`【翔安富文賜｜訂單需求】\n日期：${new Date().toLocaleString("zh-TW")}\n姓名：${data.name}\n電話：${data.phone}\n地址：${data.address}\n\n商品明細：\n${lines.join("\n")}\n\n訂單總額：${money(total)}\n備註：${data.note||"無"}\n\n此為訂單需求，尚待商家確認。`;
  $("order-output").textContent=order;$("checkout-modal").classList.remove("show");$("success-modal").classList.add("show");
  cart=[];save();e.target.reset();
});
$("copy-order").onclick=async()=>{const text=$("order-output").textContent;try{await navigator.clipboard.writeText(text);$("copy-order").textContent="已複製 ✓"}catch{const r=document.createRange();r.selectNodeContents($("order-output"));const s=window.getSelection();s.removeAllRanges();s.addRange(r);$("copy-order").textContent="請長按選取並複製"}};
$("finish-order").onclick=()=>$("success-modal").classList.remove("show");
$("year").textContent=new Date().getFullYear();
renderProducts();renderCart();
