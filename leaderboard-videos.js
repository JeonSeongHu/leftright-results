// Controls extend the original task table; the original six tabs and data renderers remain intact.
(()=>{
const rows=()=>window.LEFTRIGHT_DATA.leaderboard_videos||[];
const label=r=>!r?'미평가':r.status==='available'?'영상 보기':r.status==='no_outcome'?(r.success?'성공 사례 없음':'실패 사례 없음'):r.status==='unevaluated'?'미평가':r.status==='excluded_by_user'?'영상 생성 보류':r.status==='trace_unavailable'?'원 로그 확인 중':r.status==='replay_mismatch'?'재생 불일치 · 검토 중':'녹화 대기';
let selected=null,shown=null;
function open(partner,model,task){selected={partner,model,task};dash.setParams({lbPartner:partner,lbModel:model});}
dash.draw('leaderboard-video-view',el=>{
  for(const tr of document.querySelectorAll('#board-task tbody tr')){
    const [partner,model,task]=tr.dataset.key.split(',').map(decodeURIComponent);
    for(const success of [true,false]){
      const td=document.createElement('td'),r=rows().find(r=>r.partner===partner&&r.model===model&&r.task===task&&r.success===success);
      if(r?.status==='available'){
        const button=document.createElement('button');button.type='button';button.className='lr-tab';button.textContent=success?'성공 ▶':'실패 ▶';
        button.onclick=()=>{open(partner,model,task);el.scrollIntoView({behavior:'smooth',block:'center'});};td.append(button);
      }else{td.textContent=label(r);td.className='na';}
      tr.append(td);
    }
  }
  for(const tr of document.querySelectorAll('tbody[data-draw="board"] tr')){
    const [partner,model]=tr.dataset.key.split(',').map(decodeURIComponent);
    const entry=(LR.rows('boards')||[]).find(r=>r.partner===partner&&r.model===model);
    if(!entry?.evaluated)continue;
    const button=document.createElement('button');button.type='button';button.className='lr-tag';button.textContent='Task별 영상';
    button.onclick=()=>{document.querySelector(`[data-lb-partner="${partner}"]`).click();dash.setParams({lbPartner:partner,lbModel:model});document.getElementById('board-task').scrollIntoView({behavior:'smooth'});};
    tr.children[1]?.append(button);
  }
  const p=dash.params();
  if(selected&&(selected.partner!==(p.lbPartner||'A')||selected.model!==p.lbModel)){selected=null;}
  const key=JSON.stringify(selected);if(key===shown)return;shown=key;
  const panel=document.getElementById('leaderboard-video-pair');panel.querySelectorAll('video').forEach(v=>v.pause());panel.replaceChildren();
  if(!selected)return;
  for(const success of [true,false]){
    const r=rows().find(r=>r.partner===selected.partner&&r.model===selected.model&&r.task===selected.task&&r.success===success);
    const box=document.createElement('div'),h=document.createElement('h3');h.textContent=(LR.names[selected.task]||selected.task)+' · '+(success?'성공':'실패');box.append(h);
    if(r?.status==='available'){
      const video=document.createElement('video');video.controls=true;video.preload='metadata';video.src=r.url;video.style.width='100%';box.append(video);
      const text=document.createElement('p');text.className='lr-note';text.textContent=[r.key,r.group,r.method,r.speedup?`${r.speedup}배속 녹화`:''].filter(Boolean).join(' · ');box.append(text);
      const link=document.createElement('a');link.href=r.url;link.textContent='영상 새 창으로 열기';link.target='_blank';link.rel='noopener';box.append(link);
    }else{const text=document.createElement('p');text.textContent=label(r);box.append(text);}
    panel.append(box);
  }
});
})();
