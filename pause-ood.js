// Pause diagnostic extends the existing Partner page without replacing its tables.
(async()=>{
const host=document.getElementById('leaderboard-video-view');if(!host)return;
const card=document.createElement('div');card.className='lr-card';card.id='pause-ood-diagnostic';host.after(card);
try{
const d=await(await fetch('pause-ood.json')).json();
const names={lift_pot:'Lift Pot',grab_roller:'Grab Roller',handover_block:'Handover Block',handover_mic:'Handover Mic',hanging_mug:'Hanging Mug',place_object_basket:'Place Object Basket',put_bottles_dustbin:'Put Bottles Dustbin',stack_blocks_three:'Stack Blocks Three'};
const models=['expert','dual-s1-schedoracle-v2-u10000','dual-s1-schedoracle-v2-u50000'];
const modelName=m=>m==='expert'?'전문가 기록 재생':m.endsWith('u10000')?'Oracle + S1 10k':'Oracle + S1 50k';
const add=(tag,text,parent=card)=>{const el=document.createElement(tag);el.textContent=text;parent.append(el);return el;};
add('h2','Pause-OOD · 전문가 검증과 실패 구간');
const warning=add('p','Lift Pot SR 기준 수정: 실제 양손 파지로 들어 올려도 탈락시키던 TCP–손잡이 3cm 조건을 제거했습니다. 아래 Lift Pot 영상 6개는 새 기준 재채점 결과를 함께 표시합니다. 전체 성공률 표의 Lift Pot 점수는 아직 구기준이며, 새 기준 SR로 해석하면 안 됩니다.');warning.className='lr-note';warning.style.cssText='padding:12px;border:2px solid #d0872c;border-radius:8px';

add('p','8개 task의 8·16초 정지 조건입니다. 아래 실패 구간 집계는 모델별 400회 전체 평가이며, 영상은 task·정지 길이별 10k 실패를 우선 선택한 16장면입니다. 동일 장면의 전문가·10k·50k를 비교합니다. Fabrica는 제외했습니다.').className='lr-note';
add('p',`영상 ${d.available}/${d.clips.length}개 · 전문가 재생 완료 ${d.expert.completed}/16개, 성공 ${d.expert.success}개. 선택된 사례의 결과이며 전문가 전체 SR이 아닙니다.`).className='lr-note';
add('p','전문가는 원래 왼팔 행동 기록에 상대와 같은 정지를 넣어 250 Hz로 재생했습니다. 장면·상대 기록·물리 엔진·성공 판정·시간 예산은 기존 평가와 같습니다. 정지 시점을 아는 기록 재생이므로, 온라인 반응형 전문가의 결과와 구분해야 합니다.').className='lr-note';
const choices=add('div','');choices.style.cssText='display:flex;gap:12px;flex-wrap:wrap;margin:16px 0';
const tl=add('label','Task ',choices),task=add('select','',tl);task.setAttribute('aria-label','Pause-OOD task');
for(const key of Object.keys(names)) {const o=add('option',names[key],task);o.value=key;}
const pl=add('label','정지 길이 ',choices),pause=add('select','',pl);pause.setAttribute('aria-label','상대 정지 시간');
for(const seconds of [8,16]){const o=add('option',`${seconds}초`,pause);o.value=seconds;}
task.value='lift_pot';pause.value='16';
const player=add('div','');player.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px';
function draw(){
player.querySelectorAll('video').forEach(v=>v.pause());player.replaceChildren();
for(const model of models){
 const r=d.clips.find(r=>r.task===task.value&&r.pause_seconds===Number(pause.value)&&r.model===model),box=add('div','',player);
 add('h3',modelName(model),box);
 if(!r){add('p','사례 없음',box);continue;}
 const outcome=r.v2_result?`새 기준 ${r.v2_result.success?'성공':'실패'} · 기존 기준 ${r.success?'성공':'실패'}`:r.status==='available'?(r.success?'성공':r.score_audit?'기존 거리 기준 미충족':'실패'):r.status==='replay_mismatch'?'재생 불일치 · 게시 제외':r.status==='error'?'실행 오류 · 확인 중':'생성 중';
 add('p',`${outcome} · ${r.episode_id}`,box).className='lr-note';
 let video=null;
 if(r.url){const v=add('video','',box);v.controls=true;v.preload='metadata';v.src=r.v2_result?.url||r.url;v.style.width='100%';video=v;
 if(r.commands_vtt){const track=document.createElement('track');track.kind='subtitles';track.label='Oracle 명령';track.srclang='en';track.src=r.commands_vtt;track.default=true;v.append(track);track.addEventListener('load',()=>{track.track.mode='showing';});}
 const a=add('a','영상 새 창으로 열기',box);a.href=r.v2_result?.url||r.url;a.target='_blank';a.rel='noopener';}
 if(r.v2_result){add('p',`새 기준 판정: ${r.v2_result.seconds.toFixed(3)}초 · 높이, 기울기, 실제 양손 파지, 외부 지지물 없음. TCP 거리 조건 제외.`,box).className='lr-note';const old=add('a','기존 기준 영상 보기',box);old.href=r.url;old.target='_blank';old.rel='noopener';}
 if(model==='expert')add('p','전문가 행동 기록을 직접 재생하므로 Oracle 명령은 사용하지 않습니다.',box).className='lr-note';
 if(model!=='expert'){
 if(r.commands?.length){
  const command=add('div','',box);command.style.cssText='padding:12px;margin:10px 0;border:1px solid #90a4b8;border-radius:8px;overflow-wrap:anywhere';
  const stamp=add('small','',command),text=add('p','',command);text.style.cssText='margin:6px 0;font-weight:600';
  const details=add('details','',box);add('summary',`Oracle 명령 이력 (${r.commands.length}구간)`,details);
  const buttons=[];
  for(const c of r.commands){const button=add('button',`${c.seconds.toFixed(2)}초 · ${c.stage} — ${c.text}`,details);button.type='button';button.style.cssText='display:block;width:100%;text-align:left;white-space:normal;padding:8px;margin:4px 0;cursor:pointer';button.disabled=!video;button.onclick=()=>{video.currentTime=c.seconds;updateCommand();};buttons.push(button);}
  function updateCommand(){const now=video?.currentTime||0;let index=0;for(let i=1;i<r.commands.length&&r.commands[i].seconds<=now;i++)index=i;
   const c=r.commands[index];stamp.textContent=`현재 Oracle 명령 · ${c.stage} · ${c.seconds.toFixed(2)}초부터`;text.textContent=c.text;
   buttons.forEach((b,i)=>{b.style.fontWeight=i===index?'700':'400';b.setAttribute('aria-current',i===index?'true':'false');});
  }
  video?.addEventListener('timeupdate',updateCommand);video?.addEventListener('seeked',updateCommand);updateCommand();
 }

 const stage=r.v2_result?.success?'새 기준 과제 완료':r.score_audit?'물리적 들어 올리기 관측 / 기존 거리 기준 미충족':r.category==='success'?'과제 완료':r.category==='no_observed_grasp'?'파지 신호 미관측':r.category==='grasp_without_completion'?'파지 관측 후 미완료':'접촉 정보 부족';
 add('p',`${stage} · 첫 파지 ${r.first_grasp_seconds===null?'미관측':r.first_grasp_seconds.toFixed(2)+'초'} · 기존 평가 종료 ${(r.phys_steps/250).toFixed(2)}초 · ${r.termination_reason}`,box).className='lr-note';
 if(r.stages?.length){const details=add('details','',box);add('summary','Oracle 단계 전환 시각',details);for(const s of r.stages)add('div',`${s.seconds.toFixed(2)}초: ${s.stage}${s.grasp_seen?' · 이전 파지 관측':''}`,details);}
 }else if(r.phys_steps){add('p',`종료 ${(r.phys_steps/250).toFixed(2)}초 · ${r.termination_reason}`,box).className='lr-note';}
 if(r.score_audit){
 const a=r.score_audit,last=a.last;const detail=add('details','',box);detail.open=true;add('summary','성공 판정 분해: 종료 시점 측정',detail);
 const measurements=[['냄비 높이',`${(last.z_m*100).toFixed(2)}cm`, '> 82cm'],['기울기 내적',last.upright_dot.toFixed(4),'> 0.8'],['왼손 TCP–손잡이',`${(last.left_distance_m*100).toFixed(2)}cm`,'< 3cm'],['오른손 TCP–손잡이',`${(last.right_distance_m*100).toFixed(2)}cm`,'< 3cm'],['양손 파지','충족','각 손의 양쪽 손가락 ≥ 0.1N'],['외부 지지물','없음','없어야 함']];
 for(const [key,value,threshold] of measurements)add('p',`${key}: ${value} (기준 ${threshold})`,detail).className='lr-note';
 add('p',`거리 조건을 제외한 높이·기울기·양손 파지·지지물 조건은 ${a.longest_continuous_physical.start_seconds.toFixed(2)}–${a.longest_continuous_physical.end_seconds.toFixed(2)}초에 연속 충족했습니다. 공식 결과의 실패 표기는 기존 기준을 보존한 것입니다.`,detail).className='lr-note';
 }
 if(r.note)add('p',r.note,box).className='lr-note';
 if(r.status==='available'&&model!=='expert')add('p','기존 기준 영상은 원 평가 결과·종료 시점과 일치합니다. 새 기준 영상은 동일 행동을 새 성공 조건에 도달할 때까지 재생했습니다. 모델 재추론은 없습니다.',box).className='lr-note';
}
}
task.onchange=draw;pause.onchange=draw;draw();
add('h3','전체 Pause-OOD 실패 구간 · 모델별 400회');
const wrap=add('div','');wrap.style.overflowX='auto';const table=add('table','',wrap);table.className='lr-table';const head=add('tr','',add('thead','',table));
for(const name of ['Task','모델','성공 / 전체','파지 미관측 실패','파지 후 미완료','시간 초과¹'])add('th',name,head);
const body=add('tbody','',table);
for(const key of Object.keys(names))for(const model of models.slice(1)){
 const r=d.summary.find(r=>r.task===key&&r.model===model);if(!r)continue;const tr=add('tr','',body);
 for(const val of [names[key],modelName(model),`${r.success||0} / ${r.n}`,r.no_observed_grasp||0,r.grasp_without_completion||0,r.timeout||0])add('td',String(val),tr);
}
add('p','파지는 S2 관측 시점에 양쪽 손가락 접촉이 각각 0.1 N 이상인 경우입니다. 짧은 파지는 누락될 수 있으며, 여러 물체 중 하나를 잡았다는 것만으로 후속 파지가 모두 성공했다는 뜻은 아닙니다. 따라서 “파지 후 미완료”는 실패 원인을 확정하는 분류가 아닙니다.').className='lr-note';
add('p','¹ 시간 초과(action_limit)는 앞의 실패 구간과 중복 집계합니다. Mug의 terminal_reserve_limit·terminal_settle_failure는 별도 종료 사유이므로 이 열에 넣지 않았습니다. 조립 task인 Fabrica는 이번 생성에서 제외했습니다.').className='lr-note';
}catch(error){addError(error);}
function addError(){card.textContent='Pause-OOD 진단 데이터를 불러오지 못했습니다. 새로고침해 주세요.';}
})();
