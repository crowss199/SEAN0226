const $=id=>document.getElementById(id),MALL="#";let products=[];


// Upload product image locally and embed it in products.json as a data URL.
let selectedProductImage="";
function readImageFile(file,maxBytes=1500000){
 return new Promise((resolve,reject)=>{
  if(!file||!file.type.startsWith("image/"))return reject(Error("請選擇圖片檔案。"));
  if(file.size>maxBytes)return reject(Error("圖片太大，請壓縮至 1.5 MB 以下。"));
  const reader=new FileReader();
  reader.onload=()=>resolve(String(reader.result));
  reader.onerror=()=>reject(Error("圖片讀取失敗。"));
  reader.readAsDataURL(file);
 });
}
$("image-file").addEventListener("change",async e=>{
 const file=e.target.files[0];if(!file)return;
 try{
  selectedProductImage=await readImageFile(file);
  $("image").value=selectedProductImage;
  $("image-preview").hidden=false;
  $("image-preview").innerHTML=`<img alt="商品圖片預覽" src="${selectedProductImage}">`;
  $("status").textContent="商品圖片已載入，提交商品後會一併放入 products.json。";
 }catch(err){$("status").textContent=err.message}
});

const AUTH_KEY="xiangAnAdminSession";
function showAdmin(){ $("login-panel").hidden=true;$("admin-app").hidden=false;loadProducts();loadOrders();loadAnnouncementAdmin();loadSiteSettingsAdmin();loadStoreAdmin();}
function logout(){sessionStorage.removeItem(AUTH_KEY);$("admin-app").hidden=true;$("login-panel").hidden=false;$("password").value="";$("admin-id").value="";}
$("login-form").addEventListener("submit",e=>{
 e.preventDefault();
 const configuredId=String(window.ADMIN_ID??"").trim();
 const configuredPassword=String(window.ADMIN_PASSWORD??"").trim();
 const enteredId=String($("admin-id").value??"").trim();
 const enteredPassword=String($("password").value??"").trim();
 if(!configuredId || !configuredPassword){
  $("login-error").textContent="管理員 ID 或密碼尚未設定，請檢查 admin-config.js。";
  return;
 }
 if(enteredId===configuredId && enteredPassword===configuredPassword){
  sessionStorage.setItem(AUTH_KEY,"yes");
  $("login-error").textContent="";
  showAdmin();
 }else{
  $("login-error").textContent="管理員 ID 或密碼錯誤，請重新確認。";
 }
});
$("toggle-password").addEventListener("click",()=>{
 const input=$("password"),button=$("toggle-password");
 const visible=input.type==="text";
 input.type=visible?"password":"text";
 button.textContent=visible?"顯示":"隱藏";
});
$("logout").addEventListener("click",logout);
const fields=["productCode","name","price","tag","desc","symbol","image","url"];
function normalizeProduct(p){
 const variants=Array.isArray(p.variants)&&p.variants.length?p.variants:[{name:"一般規格",stock:null}];
 return {...p,productCode:String(p.productCode||p.code||("P"+String(p.id).padStart(4,"0"))),variants:variants.map((v,i)=>({name:String(v.name||("規格"+(i+1))),stock:v.stock===null||v.stock===undefined?null:Math.max(0,Number(v.stock)||0)}))};
}
function variantRows(list=[{name:"一般規格",stock:0}]){
 $("variant-rows").innerHTML=list.map((v,i)=>`<div class="variant-row"><label>規格名稱<input class="variant-name" maxlength="60" required value="${esc(v.name)}" placeholder="例如：0.5mm 黑色"></label><label>庫存數量<input class="variant-stock" type="number" min="0" step="1" required value="${v.stock===null?0:Number(v.stock)}"></label><button type="button" class="delete remove-variant" aria-label="刪除此規格" ${list.length===1?"disabled":""}>刪除</button></div>`).join("");
}
$("add-variant").addEventListener("click",()=>{
 const list=[...$("variant-rows").querySelectorAll(".variant-row")].map(r=>({name:r.querySelector(".variant-name").value,stock:Number(r.querySelector(".variant-stock").value)||0}));
 list.push({name:"",stock:0});variantRows(list);
});
$("variant-rows").addEventListener("click",e=>{
 if(!e.target.closest(".remove-variant"))return;
 const rows=[...$("variant-rows").querySelectorAll(".variant-row")];
 if(rows.length<=1)return;
 const list=rows.filter(r=>r!==e.target.closest(".variant-row")).map(r=>({name:r.querySelector(".variant-name").value,stock:Number(r.querySelector(".variant-stock").value)||0}));
 variantRows(list);
});
async function loadProducts(){try{let r=await fetch("./products.json",{cache:"no-store"});if(!r.ok)throw Error();products=(await r.json()).map(normalizeProduct);}catch{products=[];$("status").textContent="無法讀取 products.json；可按匯入按鈕載入商品資料。"}render()}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function downloadProducts(message="已下載 products.json，請上傳到 GitHub Repository 根目錄並覆蓋舊檔。"){
 const blob=new Blob([JSON.stringify(products,null,2)],{type:"application/json"});
 const url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="products.json";document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 $("status").textContent=message;
}
function render(){
 $("count").textContent=`（${products.length} 件）`;
 $("product-list").innerHTML=products.length?products.map(p=>`<div class="product-row"><div><strong>${esc(p.productCode)}｜${esc(p.name)}</strong><small>NT$ ${Number(p.price).toLocaleString("zh-TW")}　${esc(p.desc||"")}<br>${p.variants.map(v=>`${esc(v.name)}：${v.stock===null?"未設定":v.stock+" 件"}`).join("　／　")}</small></div><div class="row-actions"><button class="light" data-edit="${p.id}">修改</button><button class="delete" data-delete="${p.id}">刪除</button></div></div>`).join(""):'<p class="hint">目前沒有商品，請使用上方表單新增。</p>';
}
function reset(){
 $("product-form").reset();selectedProductImage="";$("image-preview").hidden=true;$("image-preview").innerHTML="";
 $("edit-id").value="";$("form-title").textContent="新增商品";$("submit-btn").textContent="＋ 加入商品清單";$("cancel-edit").hidden=true;
 variantRows([{name:"一般規格",stock:0}]);
}
$("product-form").addEventListener("submit",e=>{
 e.preventDefault();
 const id=Number($("edit-id").value)||Math.max(0,...products.map(p=>Number(p.id)||0))+1;
 const variants=[...$("variant-rows").querySelectorAll(".variant-row")].map(r=>({name:r.querySelector(".variant-name").value.trim(),stock:Number(r.querySelector(".variant-stock").value)}));
 if(!variants.length||variants.some(v=>!v.name||!Number.isInteger(v.stock)||v.stock<0)){$("status").textContent="請填寫每個規格名稱及有效的庫存整數。";return}
 const productCode=$("product-code").value.trim();
 if(products.some(p=>p.productCode===productCode&&Number(p.id)!==id)){$("status").textContent="商品編號已存在，請使用不同編號。";return}
 const p={id,productCode,name:$("name").value.trim(),price:Number($("price").value),tag:$("tag").value.trim(),desc:$("desc").value.trim(),symbol:$("symbol").value.trim()||"文具",image:$("image").value.trim(),url:$("url").value.trim()||"#",category:"writing",variants};
 if(!p.productCode||!p.name||!Number.isFinite(p.price)||p.price<0){$("status").textContent="請確認商品編號、名稱與價格。";return}
 let i=products.findIndex(x=>Number(x.id)===id);i>=0?products[i]=p:products.push(p);
 reset();render();downloadProducts("商品已儲存並下載 products.json。請將此檔案上傳 GitHub 根目錄並覆蓋舊檔，官網才會更新。");
});
$("product-list").addEventListener("click",e=>{
 let eb=e.target.closest("[data-edit]"),db=e.target.closest("[data-delete]");
 if(eb){
  let p=products.find(x=>Number(x.id)===Number(eb.dataset.edit));if(!p)return;
  fields.forEach(k=>$(k==="productCode"?"product-code":k).value=p[k]??"");
  $("edit-id").value=p.id;$("form-title").textContent="修改商品";$("submit-btn").textContent="儲存修改";$("cancel-edit").hidden=false;
  variantRows(p.variants||[{name:"一般規格",stock:0}]);scrollTo({top:0,behavior:"smooth"});
 }
 if(db){
  let id=Number(db.dataset.delete),p=products.find(x=>Number(x.id)===id);
  if(p&&confirm(`確定刪除「${p.productCode}｜${p.name}」？刪除後請下載 products.json 並上傳 GitHub 才會正式移除。`)){
   products=products.filter(p=>Number(p.id)!==id);if(Number($("edit-id").value)===id)reset();render();downloadProducts("商品已刪除並下載 products.json。請將此檔案上傳 GitHub 根目錄並覆蓋舊檔，官網才會更新。");
  }
 }
});
$("cancel-edit").onclick=reset;
$("download-btn").onclick=()=>downloadProducts();
$("import-btn").onclick=()=>$("import-file").click();
$("import-file").onchange=async e=>{
 let f=e.target.files[0];if(!f)return;
 try{let data=JSON.parse(await f.text());if(!Array.isArray(data))throw Error();products=data.map(normalizeProduct);render();$("status").textContent="匯入成功。舊商品已補上商品編號；尚未設定庫存的規格請編輯後填入庫存。"}
 catch{$("status").textContent="匯入失敗，請選擇正確的 products.json。"}
 e.target.value="";
};
variantRows([{name:"一般規格",stock:0}]);

// 7-ELEVEN 賣貨便訂單匯入（Excel／CSV）
const ORDER_KEY="xiangAnImportedOrdersV1";
const orderFields=[
 {key:"orderNo",label:"訂單編號",aliases:["訂單編號","訂單號碼","訂單單號","訂單編號(系統)","order no","order number","訂單序號"]},
 {key:"buyer",label:"訂購人",aliases:["訂購人","買家姓名","收件人","取件人姓名","會員姓名","姓名","buyer","recipient"]},
 {key:"item",label:"商品／明細",aliases:["商品名稱","商品明細","商品品名","品名","訂購商品","商品","規格","item","product"]},
 {key:"qty",label:"數量",aliases:["數量","訂購數量","商品數量","qty","quantity"]},
 {key:"amount",label:"訂單金額",aliases:["訂單金額","總金額","應付金額","實付金額","商品總額","金額","amount","total"]},
 {key:"date",label:"訂單日期",aliases:["訂單日期","成立時間","訂單成立時間","下單時間","建立日期","日期","order date","date"]}
];
let parsedOrderRows=[],orderHeaders=[],orderMapping={};
function getOrders(){try{return JSON.parse(localStorage.getItem(ORDER_KEY)||"[]")}catch{return []}}
function saveOrders(list){localStorage.setItem(ORDER_KEY,JSON.stringify(list))}
function loadOrders(){renderOrders()}
function renderOrders(){let list=getOrders();$("order-count").textContent=`（${list.length} 筆）`;$("orders-body").innerHTML=list.length?list.slice().reverse().map(o=>`<tr><td>${esc(o.orderNo)}</td><td>${esc(o.buyer)}</td><td>${esc(o.item)}</td><td>${esc(o.qty)}</td><td>${esc(o.amount)}</td><td>${esc(o.date)}</td></tr>`).join(""):'<tr><td colspan="6">尚未匯入訂單。</td></tr>'}
function norm(s){return String(s??"").toLowerCase().replace(/[\s　_()（）【】\[\]：:.-]/g,"")}
function autoMap(headers){let out={};for(const f of orderFields){let found=headers.find(h=>f.aliases.some(a=>norm(h)===norm(a)))||headers.find(h=>f.aliases.some(a=>norm(h).includes(norm(a))||norm(a).includes(norm(h))));out[f.key]=found||""}return out}
function showMapping(){let grid=$("mapping-grid");grid.innerHTML=orderFields.map(f=>`<label>${f.label}<select data-map="${f.key}"><option value="">（不匯入）</option>${orderHeaders.map(h=>`<option value="${esc(h)}" ${orderMapping[f.key]===h?"selected":""}>${esc(h)}</option>`).join("")}</select></label>`).join("");grid.querySelectorAll("select").forEach(sel=>sel.addEventListener("change",()=>{orderMapping[sel.dataset.map]=sel.value;renderPreview()}));$("mapping-area").hidden=false;renderPreview()}
function mappedRow(row){let o={};for(const f of orderFields)o[f.key]=orderMapping[f.key]?String(row[orderMapping[f.key]]??"").trim():"";o.qty=o.qty||"1";return o}
function renderPreview(){let rows=parsedOrderRows.slice(0,5).map(mappedRow);$("order-preview").querySelector("thead").innerHTML=`<tr>${orderFields.map(f=>`<th>${f.label}</th>`).join("")}</tr>`;$("order-preview").querySelector("tbody").innerHTML=rows.map(o=>`<tr>${orderFields.map(f=>`<td>${esc(o[f.key])}</td>`).join("")}</tr>`).join("");let noMap= !orderMapping.orderNo;$("confirm-import").disabled=noMap;$("order-import-status").textContent=noMap?"請指定訂單編號欄位，才能匯入並避免重複訂單。":`共讀取 ${parsedOrderRows.length} 筆資料，預覽前 5 筆。`}
$("order-file").addEventListener("change",async e=>{let file=e.target.files[0];if(!file)return;try{if(!window.XLSX)throw Error("Excel/CSV 讀取元件載入失敗，請重新整理頁面後再試。");let buf=await file.arrayBuffer(),wb=XLSX.read(buf,{type:"array",cellDates:true}),sheet=wb.Sheets[wb.SheetNames[0]],matrix=XLSX.utils.sheet_to_json(sheet,{header:1,defval:"",raw:false});if(!matrix.length)throw Error("檔案內沒有可讀取的訂單資料。");let headerAt=0,bestScore=-1;for(let i=0;i<Math.min(matrix.length,12);i++){let cells=matrix[i].map(v=>String(v??"").trim()).filter(Boolean),score=orderFields.filter(f=>cells.some(h=>f.aliases.some(a=>norm(h)===norm(a)||norm(h).includes(norm(a))))).length;if(score>bestScore){bestScore=score;headerAt=i}}orderHeaders=matrix[headerAt].map(v=>String(v??"").trim());if(!orderHeaders.some(Boolean))throw Error("找不到欄位標題列，請確認匯出檔案。");parsedOrderRows=matrix.slice(headerAt+1).filter(r=>r.some(v=>String(v??"").trim())).map(r=>Object.fromEntries(orderHeaders.map((h,i)=>[h,r[i]??""]).filter(([h])=>h)));if(!parsedOrderRows.length)throw Error("標題列下方沒有訂單資料。");orderMapping=autoMap(orderHeaders);showMapping()}catch(err){$("order-import-status").textContent=err.message||"讀取失敗，請確認檔案格式。";$("mapping-area").hidden=false}e.target.value=""});
$("confirm-import").addEventListener("click",()=>{let old=getOrders(),known=new Set(old.map(o=>String(o.orderNo))),added=0,skipped=0;for(const row of parsedOrderRows){let o=mappedRow(row);if(!o.orderNo){skipped++;continue}if(known.has(o.orderNo)){skipped++;continue}known.add(o.orderNo);old.push({...o,importedAt:new Date().toISOString()});added++}saveOrders(old);renderOrders();$("order-import-status").textContent=`匯入完成：新增 ${added} 筆，略過 ${skipped} 筆（包含重複或缺少訂單編號）。`;$("mapping-area").hidden=true;parsedOrderRows=[];orderHeaders=[];});
$("cancel-import").onclick=()=>{$("mapping-area").hidden=true;parsedOrderRows=[];orderHeaders=[]};
$("export-orders").onclick=()=>{let rows=getOrders(),cols=orderFields.map(f=>f.label),csv=[cols,...rows.map(o=>orderFields.map(f=>o[f.key]??""))].map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\r\n"),blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="xiang-an-orders.csv";a.click();URL.revokeObjectURL(a.href)};
$("clear-orders").onclick=()=>{if(confirm("確定清空這台裝置瀏覽器內的所有匯入訂單？此操作無法復原。")){saveOrders([]);renderOrders()}};

// Website logo uploader; exported as site-settings.json.
let siteSettings={logo:""};
async function loadSiteSettingsAdmin(){
 try{const r=await fetch("./site-settings.json",{cache:"no-store"});if(r.ok)siteSettings=await r.json()}catch{}
 if(siteSettings.logo){$("logo-preview").hidden=false;$("logo-preview").innerHTML=`<img alt="目前官網商標" src="${siteSettings.logo}">`;}
}
$("logo-file").addEventListener("change",async e=>{
 const file=e.target.files[0];if(!file)return;
 try{
  siteSettings.logo=await readImageFile(file,2000000);
  $("logo-preview").hidden=false;
  $("logo-preview").innerHTML=`<img alt="商標預覽" src="${siteSettings.logo}">`;
  $("logo-status").textContent="商標已載入，請下載設定檔並上傳 GitHub。";
 }catch(err){$("logo-status").textContent=err.message}
});
$("logo-download").addEventListener("click",()=>{
 const blob=new Blob([JSON.stringify(siteSettings,null,2)],{type:"application/json;charset=utf-8"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="site-settings.json";a.click();URL.revokeObjectURL(a.href);
 $("logo-status").textContent="已下載 site-settings.json，請上傳至 GitHub Repository 根目錄。";
});

if(sessionStorage.getItem(AUTH_KEY)==="yes")showAdmin();

// Homepage announcement editor
let currentAnnouncement={title:"翔安富文具公告",message:"歡迎光臨！最新商品與營業資訊請留意本公告。",updatedAt:""};
async function loadAnnouncementAdmin(){
 try{const r=await fetch("./announcement.json",{cache:"no-store"});if(r.ok)currentAnnouncement=await r.json()}catch{}
 $("notice-admin-title").value=currentAnnouncement.title||"";
 $("notice-admin-message").value=currentAnnouncement.message||"";
}
$("announcement-form").addEventListener("submit",e=>{
 e.preventDefault();
 currentAnnouncement={title:$("notice-admin-title").value.trim(),message:$("notice-admin-message").value.trim(),updatedAt:new Date().toLocaleDateString("zh-TW")};
 $("notice-status").textContent="公告已在管理頁預覽資料中更新；請按「下載 announcement.json」，再上傳 GitHub 覆蓋舊檔，官網才會同步更新。";
});
$("notice-download").addEventListener("click",()=>{
 const blob=new Blob([JSON.stringify(currentAnnouncement,null,2)],{type:"application/json;charset=utf-8"});
 const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="announcement.json";a.click();URL.revokeObjectURL(a.href);
 $("notice-status").textContent="已下載 announcement.json，請上傳至 GitHub Repository 根目錄覆蓋舊檔。";
});


// 7-ELEVEN store overrides/custom records. Export stores-custom.json and publish it with the static site.
const STORE_CUSTOM_FILE="stores-custom.json";
let managedStores=[],disabledStoreIds=[];
function normalizeManagedStore(x){return {id:String(x.id||"").replace(/\D/g,"").slice(0,6),name:String(x.name||x.store||"").trim(),address:String(x.address||"").trim()}}
async function loadStoreAdmin(){
 try{
  const r=await fetch("./stores-custom.json",{cache:"no-store"});
  if(r.ok){const d=await r.json();managedStores=(Array.isArray(d.stores)?d.stores:[]).map(normalizeManagedStore).filter(x=>/^\d{6}$/.test(x.id)&&x.name);disabledStoreIds=Array.isArray(d.disabledIds)?d.disabledIds.map(String):[];}
 }catch{}
 renderManagedStores();
}
function renderManagedStores(){
 const box=$("managed-store-list");if(!box)return;
 const rows=[...managedStores.map(x=>({...x,disabled:false})),...disabledStoreIds.filter(id=>!managedStores.some(x=>x.id===id)).map(id=>({id,name:"（已停用外部門市）",address:"",disabled:true}))];
 box.innerHTML=rows.length?rows.map((x,i)=>`<div class="product-row"><div><strong>${escapeHtmlAdmin(x.name)}</strong><small>門市編號：${escapeHtmlAdmin(x.id)}${x.address?"｜"+escapeHtmlAdmin(x.address):""}${x.disabled?"｜已停用":""}</small></div><div class="row-actions">${x.disabled?`<button class="light" type="button" data-store-enable="${escapeHtmlAdmin(x.id)}">恢復</button>`:`<button class="light" type="button" data-store-edit="${escapeHtmlAdmin(x.id)}">編輯</button><button class="delete" type="button" data-store-delete="${escapeHtmlAdmin(x.id)}">刪除／停用</button>`}</div></div>`).join(""):'<p class="hint">尚未新增自訂或修改門市。全台外部清單仍可在結帳頁搜尋。</p>';
}
function escapeHtmlAdmin(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function resetStoreForm(){$("store-admin-form").reset();$("store-edit-original-id").value="";$("store-cancel-edit").hidden=true;$("store-save-btn").textContent="新增／儲存門市"}
$("store-admin-form")?.addEventListener("submit",e=>{
 e.preventDefault();const id=$("admin-store-id").value.replace(/\D/g,"").slice(0,6),name=$("admin-store-name").value.trim(),address=$("admin-store-address").value.trim(),oldId=$("store-edit-original-id").value;
 if(!/^\d{6}$/.test(id)||!name){$("store-admin-status").textContent="請輸入六碼門市編號及門市名稱。";return}
 if(managedStores.some(x=>x.id===id&&x.id!==oldId)){ $("store-admin-status").textContent="此門市編號已存在於自訂清單。";return }
 if(oldId){managedStores=managedStores.filter(x=>x.id!==oldId);if(oldId!==id&&!disabledStoreIds.includes(oldId))disabledStoreIds.push(oldId)}
 managedStores=managedStores.filter(x=>x.id!==id);managedStores.push({id,name,address});disabledStoreIds=disabledStoreIds.filter(x=>x!==id);
 resetStoreForm();renderManagedStores();$("store-admin-status").textContent="門市資料已更新。請下載 stores-custom.json 並上傳 GitHub 才會套用至官網。";
});
$("managed-store-list")?.addEventListener("click",e=>{
 const edit=e.target.closest("[data-store-edit]"),del=e.target.closest("[data-store-delete]"),enable=e.target.closest("[data-store-enable]");
 if(edit){const x=managedStores.find(v=>v.id===edit.dataset.storeEdit);if(!x)return;$("store-edit-original-id").value=x.id;$("admin-store-id").value=x.id;$("admin-store-name").value=x.name;$("admin-store-address").value=x.address;$("store-cancel-edit").hidden=false;$("store-save-btn").textContent="儲存門市修改";$("admin-store-id").focus()}
 if(del){const id=del.dataset.storeDelete;if(!confirm(`確定刪除／停用門市 ${id}？`))return;managedStores=managedStores.filter(x=>x.id!==id);if(!disabledStoreIds.includes(id))disabledStoreIds.push(id);renderManagedStores();$("store-admin-status").textContent="門市已刪除或停用；請下載 stores-custom.json 並上傳 GitHub。"}
 if(enable){disabledStoreIds=disabledStoreIds.filter(x=>x!==enable.dataset.storeEnable);renderManagedStores();$("store-admin-status").textContent="已取消停用；請下載 stores-custom.json 並上傳 GitHub。"}
});
$("store-cancel-edit")?.addEventListener("click",resetStoreForm);
$("store-download")?.addEventListener("click",()=>{const data={updatedAt:new Date().toISOString(),stores:managedStores,disabledIds:disabledStoreIds};const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=STORE_CUSTOM_FILE;a.click();URL.revokeObjectURL(a.href);$("store-admin-status").textContent="已下載 stores-custom.json。請上傳 GitHub Repository 根目錄並覆蓋舊檔。"});
$("store-import-btn")?.addEventListener("click",()=>$("store-import-file").click());
$("store-import-file")?.addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;try{const d=JSON.parse(await file.text());managedStores=(Array.isArray(d.stores)?d.stores:[]).map(normalizeManagedStore).filter(x=>/^\d{6}$/.test(x.id)&&x.name);disabledStoreIds=Array.isArray(d.disabledIds)?d.disabledIds.map(String).filter(x=>/^\d{6}$/.test(x)):[];renderManagedStores();$("store-admin-status").textContent="門市設定檔匯入完成，請檢查後下載。"}catch{$("store-admin-status").textContent="檔案格式錯誤，請選擇正確的 stores-custom.json。"}e.target.value=""});
