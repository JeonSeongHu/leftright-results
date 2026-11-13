// Browser-local adapter for the recovered dashboard. No Claude session or API is needed.
(()=>{const data=window.LEFTRIGHT_DATA,params={},draws=new Map(),calcs=new Map(),states=new WeakMap();let queued=false;
function refresh(){queued=false;for(const [id,c] of calcs){if(c.inputs.every(k=>Array.isArray(data[k]))){try{data[id]=c.fn(...c.inputs.map(k=>data[k]))}catch(e){console.error('Calculation',id,e)}}}for(const [name,fn] of draws){for(const el of document.querySelectorAll('[data-draw="'+name+'"]')){try{if(typeof fn==='function')fn(el);else{if(!states.has(el))states.set(el,fn.mount?.(el));fn.update?.(el,states.get(el))}}catch(e){console.error('Drawing',name,e)}}}}
function schedule(){if(!queued){queued=true;requestAnimationFrame(refresh)}}
window.dash={colors:['#397d71','#c48c4c','#7f79a7','#b56e75','#668ba5'],data:id=>Array.isArray(data[id])?{status:'ok',data:data[id]}:{status:'missing',data:[]},params:()=>({...params}),setParams:p=>{Object.assign(params,p);schedule()},setLink:x=>history.replaceState(null,'','#'+x),calc:(id,c)=>{calcs.set(id,c);schedule()},draw:(id,f)=>{draws.set(id,f);schedule()}};
window.addEventListener('DOMContentLoaded',schedule);
})();
