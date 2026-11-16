(function(){
 const allowed=new Set(["sage","navy","terracotta","sky"]);
 const apply=name=>{document.body.dataset.theme=allowed.has(name)?name:"sage";};
 apply("sage");
 fetch("./site-settings.json",{cache:"no-store"})
  .then(r=>r.ok?r.json():{})
  .then(settings=>apply(settings.theme))
  .catch(()=>apply("sage"));
})();
