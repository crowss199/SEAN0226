const CART_KEY="xiangAnJapandiCart",ORDER_KEY="xiangAnLastOrder";
const $=id=>document.getElementById(id),money=n=>"NT$ "+Number(n).toLocaleString("zh-TW");
let PRODUCTS=[],cart=[];
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
$("store-id").addEventListener("input",e=>{e.target.value=e.target.value.replace(/\D/g,"").slice(0,6)});
$("checkout-form").addEventListener("submit",async e=>{
 e.preventDefault();if(!cart.length)return;
 const endpoint=window.CHECKOUT_CONFIG?.WEB_APP_URL||"";
 if(!endpoint||endpoint.includes("請填入")){$("checkout-status").textContent="尚未設定 Google 試算表接收網址。";return}
 const f=new FormData(e.currentTarget),fee=Number(f.get("shippingFee")),productAmount=subtotal();
 if(productAmount+fee<55||productAmount+fee>20000){$("checkout-status").textContent="商品金額加運費需介於 55 至 20,000 元。";return}
 const items=cart.map(x=>{const p=PRODUCTS.find(p=>Number(p.id)===Number(x.id));return{productCode:p.productCode||("P"+p.id),name:p.name,variant:x.variant||"一般規格",quantity:x.qty,unitPrice:Number(p.price),amount:Number(p.price)*x.qty}});
 const order={orderId:"XAFW"+Date.now(),createdAt:new Date().toISOString(),recipient:String(f.get("recipient")).trim(),phone:String(f.get("phone")).trim(),storeId:String(f.get("storeId")).trim(),temperature:f.get("temperature"),items,productAmount,shippingFee:fee,totalAmount:productAmount+fee,note:String(f.get("note")||""),social:String(f.get("social")||"")};
 const btn=$("checkout-submit");btn.disabled=true;btn.textContent="送出中…";$("checkout-status").textContent="正在送出訂單…";
 try{
  await fetch(endpoint,{method:"POST",mode:"no-cors",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(order)});
  localStorage.setItem(ORDER_KEY,JSON.stringify({orderId:order.orderId,totalAmount:order.totalAmount,recipient:order.recipient,createdAt:order.createdAt}));
  localStorage.removeItem(CART_KEY);
  location.href="order-success.html";
 }catch(err){$("checkout-status").textContent="送出失敗，請確認網路後再試。";btn.disabled=false;btn.textContent="確認送出訂單"}
});
init();
