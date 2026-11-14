const KEY="xiangAnLastOrder",money=n=>"NT$ "+Number(n).toLocaleString("zh-TW");
document.getElementById("year").textContent=new Date().getFullYear();
try{const o=JSON.parse(localStorage.getItem(KEY)||"null");if(o){document.getElementById("success-order-id").textContent=o.orderId||"—";document.getElementById("success-total").textContent=money(o.totalAmount||0);document.getElementById("success-recipient").textContent=o.recipient||"—"}else{document.getElementById("success-order-id").textContent="目前沒有本次訂單資料"}}catch{document.getElementById("success-order-id").textContent="目前沒有本次訂單資料"}
