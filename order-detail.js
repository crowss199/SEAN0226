const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>"NT$ "+(Number(n)||0).toLocaleString("zh-TW");
function splitItemText(text){return String(text||"").split(/\r?\n|[；;]/).map(x=>x.trim()).filter(Boolean)}
function resolveLines(order,products){
 const segments=splitItemText(order.item);
 const lines=[];
 for(const segment of (segments.length?segments:[String(order.item||"")])){
  const product=products.filter(p=>segment.includes(String(p.name||""))).sort((a,b)=>String(b.name||"").length-String(a.name||"").length)[0];
  if(!product)continue;
  const variants=Array.isArray(product.variants)?product.variants:[];
  const variant=variants.find(v=>v.name&&segment.includes(v.name))||variants[0]||{};
  lines.push({product,variant,segment});
 }
 if(!lines.length){
  const product=products.filter(p=>order.item&&String(order.item).includes(String(p.name||""))).sort((a,b)=>String(b.name||"").length-String(a.name||"").length)[0];
  if(product){const variants=product.variants||[];lines.push({product,variant:variants[0]||{},segment:String(order.item)})}
 }
 return lines;
}
async function init(){
 let order;
 try{order=JSON.parse(decodeURIComponent(location.hash.slice(1)))}catch{}
 if(!order||!order.orderNo){$("page-status").textContent="找不到訂單資料。請從訂單管理頁重新開啟該筆訂單。";return}
 $("page-status").textContent="訂單資料已載入";
 $("order-meta").hidden=false;
 $("order-meta").innerHTML=[
 ["訂單編號",order.orderNo],["訂購人",order.buyer||"—"],["訂單日期",order.date||"—"],["訂單數量",order.qty||"—"],["訂單金額",money(order.amount)]
 ].map(([k,v])=>`<div class="meta-item"><small>${esc(k)}</small><strong>${esc(v)}</strong></div>`).join("");
 try{
  const r=await fetch("./products.json",{cache:"no-store"});if(!r.ok)throw Error("商品資料讀取失敗");const products=await r.json();
  const lines=resolveLines(order,products);
  $("order-items").innerHTML=lines.length?lines.map(({product,variant,segment})=>{
   const image=variant.image||product.image||"";
   return `<article class="item-card">${image?`<img src="${esc(image)}" alt="${esc(product.name)} ${esc(variant.name||"")}">`:`<div class="empty">尚未上傳規格照片</div>`}<div><h3>${esc(product.name)}</h3><p>商品規格：${esc(variant.name||"未辨識規格")}</p><p>國際條碼：${esc(variant.barcode||"—")}</p><p>售價：${money(variant.price??product.price)}</p><p>訂單明細：${esc(segment)}</p></div></article>`;
  }).join(""):`<div class="empty">目前無法從訂單商品文字自動對應到官網商品。訂單原始明細：${esc(order.item||"—")}<br>請確認訂單商品名稱包含官網商品名稱，且商品規格已上傳照片。</div>`;
 }catch(err){$("order-items").innerHTML=`<div class="empty">${esc(err.message||"無法載入商品照片。")}</div>`}
}
init();