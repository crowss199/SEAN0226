(function(){
 const allowed=new Set(["sage","navy","terracotta","sky","plum","rose","charcoal","lemon","forest"]);
 const apply=name=>{document.body.dataset.theme=allowed.has(name)?name:"sage";};
 apply("forest");
 fetch("./site-settings.json",{cache:"no-store"})
  .then(r=>r.ok?r.json():{})
  .then(settings=>apply(settings.theme))
  .catch(()=>apply("forest"));
})();
