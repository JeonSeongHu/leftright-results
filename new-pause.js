// Keep the original dashboard and media; separate the main results from individual experiments.
(async () => {
  const anchor = document.getElementById('board-a');
  if (!anchor || document.getElementById('new-pause')) return;
  const page = anchor.closest('[data-page="partners"]');
  const legacyNodes = [...page.children];
  const card = document.createElement('section');
  card.id = 'new-pause'; card.className = 'lr-card'; page.prepend(card);
  const add = (tag, text, parent = card) => { const e = document.createElement(tag); e.textContent = text; parent.append(e); return e; };
  const note = (text, parent = card) => { const e = add('p', text, parent); e.className = 'lr-note'; return e; };
  const select = (parent, label, entries) => {
    const wrap = add('label', label + ' ', parent), e = add('select', '', wrap); e.setAttribute('aria-label', label);
    for (const [value, label] of entries) { const o = add('option', label, e); o.value = value; }
    return e;
  };
  const table = (parent, headings) => {
    const wrap = add('div', '', parent); wrap.className = 'lr-scroll';
    const t = add('table', '', wrap), h = add('tr', '', add('thead', '', t)); headings.forEach(x => add('th', x, h));
    return add('tbody', '', t);
  };
  const score = r => r?.n ? `${(100 * r.correct / r.n).toFixed(1)}% (${r.correct}/${r.n})` : '미평가';
  const style = add('style', '');
  style.textContent = '#new-pause{scroll-margin-top:5rem} #new-pause .pause-ood{font-weight:750;background:color-mix(in srgb,var(--color-warn) 12%,transparent)} #new-pause .source-note{display:block;font-size:11px;font-weight:400;color:var(--color-fg-muted);margin-top:4px} #new-pause details>summary{cursor:pointer;padding:10px 0;font-weight:600} #new-pause .matrix-cell{display:block;width:100%;min-width:128px;border:1px solid transparent;background:transparent;color:inherit;border-radius:5px;padding:8px;text-align:left;cursor:pointer;font:inherit} #new-pause .matrix-cell:hover{background:color-mix(in srgb,currentColor 7%,transparent)} #new-pause .matrix-cell[aria-pressed="true"]{outline:2px solid currentColor;outline-offset:-2px} #new-pause .lr-controls{gap:12px;flex-wrap:wrap} #new-pause .subnav[aria-pressed="true"]{font-weight:750;text-decoration:underline} #new-pause [hidden]{display:none!important} #new-pause .experiment{margin-top:18px}';
  add('h2', '평가 결과');
  const nav = add('div', ''); nav.className = 'lr-controls';
  const panels = {};
  for (const [id, label] of [['main', '메인'], ['abc', 'ABC 리더보드'], ['experiments', '개별 실험'], ['legacy', '기존 결과 · Legacy']]) {
    const b = add('button', label, nav); b.className = 'lr-btn subnav'; b.dataset.panel = id;
    const p = add('div', ''); p.dataset.resultPanel = id; panels[id] = p;
    if (id === 'abc') p.id = 'abc-leaderboard';
    b.onclick = () => showPanel(id);
  }
  function showPanel(id) {
    Object.entries(panels).forEach(([key, e]) => { e.hidden = key !== id; if (e.hidden) e.querySelectorAll('video').forEach(v => v.pause()); });
    nav.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.panel === id)));
  }
  const legacy = add('details', '', panels.legacy);
  add('summary', '기존 리더보드·진단·영상 펼치기', legacy); legacyNodes.forEach(e => legacy.append(e));
  const legacySummary = document.getElementById('legacy-leader-summary');
  if (legacySummary) { legacySummary.hidden = false; legacy.append(legacySummary); }
  showPanel('main');
  function openMainOverall(){
    if(location.hash!=='#main-overall-start')return;
    document.querySelector('.lr-tab[data-tab="partners"]')?.click();showPanel('main');
    history.replaceState(null,'','#main-overall-start');
    (document.getElementById('main-overall-start')||card).scrollIntoView({block:'start'});
  }
  window.addEventListener('hashchange',openMainOverall);openMainOverall();
  try {
    const response = await fetch('new-pause-results.json', {cache: 'no-store'});
    if (!response.ok) throw new Error('results');
    const data = await response.json();
    let videos = {clips: [], available: 0};
    try { const r = await fetch('full-leaderboard-videos.json', {cache: 'no-store'}); if (r.ok) videos = await r.json(); } catch (_) {}
    const main = panels.main, experiments = panels.experiments;
    const models = {...data.models, ...data.additional_models};
    const modelOrder = ['pi05', 'vpp2', 'fastwam', 'dp', 'oracle', ...Object.keys(data.additional_models || {})].filter(m => models[m]);
    const groups = Object.keys(data.full_groups), tasks = Object.keys(data.full_tasks);
    const results = [...data.full_rows, ...(data.additional_rows || [])];
    const aIndex = new Map(results.map(r => [[r.model, r.task, r.group].join('|'), r]));
    const videoIndex = new Map();
    for (const clip of videos.clips) {
      const k = [clip.partner || 'A', clip.model, clip.task, clip.group].join('|');
      if (!videoIndex.has(k)) videoIndex.set(k, []); videoIndex.get(k).push(clip);
    }
    const clipsFor = (p, m, t, g) => {
      const clips = videoIndex.get([p, m, t, g].join('|')) || [];
      if (p === 'A' && g === 'P1-ID' && aIndex.get([m,t,g].join('|'))?.new_anchor_id) {
        return clips.filter(c => c.protocol === 'same-new-anchor-duration-v1');
      }
      const result = p === 'A' && aIndex.get([m,t,g].join('|'));
      if (result?.speed_expert_gate) return result.complete ? clips.filter(c => {
        if (result.speed_budget_multiplier===2 && c.protocol!=='mug-speed05-base2-v1') return false;
        const seed=c.scene_seed ?? Number(c.key?.match(/__s(\d+)/)?.[1]);
        return result.eligible_seeds?.includes(seed);
      }) : [];
      return clips;
    };
    const getResult = (p, m, t, g) => {
      if (p === 'A') return aIndex.get([m, t, g].join('|')) || {n: 0, correct: 0, expected: 0, complete: false, source: 'pending'};
      return clipsFor(p, m, t, g).find(r => r.n > 0) || clipsFor(p, m, t, g)[0] || {n: 0, correct: 0, expected: 0, complete: false, status: 'unevaluated'};
    };
    const statusLabel = (r, p) => {
      if (r.status === 'partial_saved') return `${r.n}/${r.expected} 보존 · 현재 실행 없음`;
      if (r.status === 'not_scheduled') return '후속 평가 보류 · 현재 실행 없음';
      if (r.status === 'validation_pending') return '같은 속도의 양팔 Expert 검증 중';
      if (r.status === 'budget_recheck_pending') return '예산 2배 · Expert 검증 통과 · 정책 재평가 대기';
      if (r.status === 'not_applicable' || (r.group === 'P2' && ['lift_pot', 'grab_roller'].includes(r.task)) || (r.complete && !r.n && r.source === 'historical')) return '해당 조건 없음';
      if (r.status === 'unsupported') return '현재 목표의 평가 없음';
      if (r.status === 'ineligible' || (r.complete && !r.n && r.source === 'new')) return '전문가 유효 장면 없음';
      if (!r.n) return p === 'B' || r.status === 'unevaluated' ? '미평가' : '평가 대기';
      if (r.errors) return `${r.n}/${r.expected} 완료 · 오류 ${r.errors}개`;
      if (!r.complete) return `${r.n}/${r.expected} 보존 · ${r.evaluation_state === 'running' ? '평가 실행 중' : '현재 평가 실행 없음'}`;
      return r.source === 'historical-B' ? '기존 B 평가' : r.source === 'historical' ? '기존 평가' : '새 평가';
    };
    note(`결과 스냅샷: ${data.updated_utc}`, main);
    const s1Groups = {'P0':'P0','P1-ID':'새 Pause-ID · 1/2초','P1-OOD':'새 Pause-OOD · 8/16초'};
    const s1PairedTable = parent => {
      const s=data.oracle_s1_recipe_eval,b=table(parent,['S1 + Oracle',...Object.values(s1Groups)]);
      b.parentElement.querySelectorAll('th')[3].className='pause-ood';
      for(const [m,label] of Object.entries(s.models)){
        const tr=add('tr','',b);add('td',label,tr);
        for(const g of Object.keys(s1Groups)){const r=s.paired.find(r=>r.group===g);const td=add('td',score({n:r.n,correct:r[m]}),tr);if(g==='P1-OOD')td.className='pause-ood';}
      }
    };
    if(data.current_runs){
      const s=data.current_runs;add('h3','현재 실험 진행',main);
      const b=table(main,['실험','현재 상태','확인 내용']);
      for(const r of s.rows){const tr=add('tr','',b);[r.label,r.status,r.detail].forEach(v=>add('td',v,tr));}
      note(`확인 ${s.updated_utc} · 저장 공간 ${s.storage_free_GB.toFixed(1)}GB 여유 · 중복 캐시·임시 산출물 ${s.storage_reclaimed_GB.toFixed(2)}GB 정리`,main);
    }
    if(data.oracle_s1_recipe_eval){
      add('h3','추가 S1 3조건 · 동일 장면 SR 비교',main);s1PairedTable(main);
      note('각 열에서 세 모델이 모두 완료한 동일 episode만 비교합니다. 각 체크포인트의 초기화·샘플링·target·prompt 설정을 함께 확인 중이며, 이 차이를 대기 처리만의 효과로 해석하지 않습니다. 아래 W2 학습 게이트와 별도 실험입니다. 기평가 새 ID 460건은 5개 task이며 전체 11-task Pause-ID 목표는 760건입니다.',main);
      const b=add('button','S1 task별 결과·전체 진행 보기',main);b.className='lr-btn';b.onclick=()=>{showPanel('experiments');document.getElementById('s1-recipe-results')?.scrollIntoView({behavior:'smooth'});};
    }
    if(data.hangang_50k){
      const s=data.hangang_50k;add('h3','FastWAM, VPP2 최종 50k 평가',main);
      const b=table(main,['모델','완료 episode','완료 표본 SR','실행 오류','평가 GPU','상태 / 남은 시간']);
      for(const r of s.rows){const tr=add('tr','',b);[r.label,`${r.completed.toLocaleString()}/${r.planned.toLocaleString()}`,score({n:r.completed,correct:r.correct}),String(r.errors),r.producer_gpus!=null?`${r.running_gpus}장 (추론 ${r.producer_gpus} · 캐시 ${r.cache_wait_gpus})`:String(r.running_gpus),r.complete?'전체 평가 완료':r.running_gpus?r.estimated_remaining_hours_recent!=null?`실행 중 · 약 ${r.estimated_remaining_hours_recent.toFixed(1)}시간`:'실행 중 · 측정 중':'현재 실행 없음'].forEach(v=>add('td',v,tr));}
      note(`${s.note} 파트너 A, 모델별 ${s.planned_per_model.toLocaleString()}건, 확인 ${s.updated_utc}.`,main);
      note('Lift Pot은 성공 판정 v2를 사용합니다. Mug는 별도 진단이며 0.5배 속도는 예산 2배와 유효 21 seed를 사용합니다. Beam 1.5배는 수정 궤적의 유효 24 seed를 사용합니다. 파트너 B는 미평가입니다.',main);
      const a=add('a','50k episode CSV 다운로드',main);a.href='hangang-50k-episodes.csv';a.download='hangang-50k-episodes.csv';
      note('남은 시간은 최근 약 20분 처리량으로 계산한 단순 추정입니다. Fabrica의 물리 계산과 초기화 시간에 따라 늘어날 수 있습니다.',main);
      note('캐시는 같은 평가 단위를 다른 작업이 계산한 뒤 결과를 재사용하거나 기다리는 GPU 할당입니다. 중복 추론을 실행하지 않습니다.',main);
      if(s.acceleration_note)note(s.acceleration_note,main);
      if(s.paired){
        add('h4','같은 episode의 기존 체크포인트 비교',main);
        const p=table(main,['모델','조건','같은 episode 수','기존 성공','50k 성공','SR 차이']);
        for(const r of s.paired.comparison_rows){const tr=add('tr','',p);[r.model==='fastwam'?'FastWAM 20,800 → 50k':'VPP2 10,400 → 50k',data.full_groups[r.group],String(r.n),r.n?`${r.old_correct}/${r.n}`:'미평가',r.n?`${r.new_correct}/${r.n}`:'미평가',r.delta_pp==null?'—':`${r.delta_pp>0?'+':''}${r.delta_pp.toFixed(1)}%p`].forEach(v=>add('td',v,tr));}
        note(`같은 task, 조건, episode의 완료 결과만 비교합니다. 새 정지 위치, Fabrica 중간 목표, 수정 Beam 속도, Mug 예산이 같은 기준 결과를 사용하며 Lift Pot v1/v2는 비교에서 제외합니다. 확인 ${s.paired.updated_utc}.`,main);
        const c=add('a','같은 episode 비교 CSV 다운로드',main);c.href='hangang-50k-paired-episodes.csv';c.download='hangang-50k-paired-episodes.csv';
      }
    }
    if (data.new_anchor_id) note((data.new_anchor_id.complete ? '새 지점 Pause-ID 재평가 완료. ' : '새 지점 Pause-ID 재평가 중. ')+'Basket·Stack·Block·Mic·Mug에서 새 OOD와 같은 지점의 1초·2초 정지를 각각 측정했습니다. 기준 다섯 모델의 이전 ID 값은 예전 지점의 결과이므로 개별 실험에 보존했습니다. SimpleSG의 ID는 아직 예전 지점입니다. 동일 seed의 길이별 비교는 개별 실험에서 확인하세요.', main);
    if (data.speed_audit) note('Speed 검증: Mug 두 속도·Mic 1.5×·Bottles 1.5×·Lift Pot 1.5×는 같은 속도의 양팔 Expert를 검증한 뒤 유효 seed만 집계합니다. Oracle S2는 명령만 제공하고 S1의 속도를 직접 제어하지 않으므로 Speed 성능 상한으로 보지 않습니다.',main);
    const overallSection=add('section','',main);overallSection.id='main-overall-start';overallSection.style.scrollMarginTop='5rem';main.prepend(overallSection);
    add('h3', '1. 전체 리더보드 · 전체와 조건별 SR', overallSection);
    const overallControls = add('div', '', overallSection); overallControls.className = 'lr-controls';
    const overallPartner = select(overallControls, '리더보드 파트너', [['A', 'A · 녹화 궤적 재생'], ['B', 'B · 온라인 전문가']]);
    const overall = table(overallSection, ['모델', '전체 SR', 'Demo', 'Pause · ID + OOD', 'Speed · 0.5× + 1.5×', 'Role']);
    overall.id='main-overall-rows';overall.parentElement.id='main-overall-table';
    const overallNote = note('', overallSection);
    note('각 조건은 기존 기준 모델들이 모두 완료한 공통 task만 합산합니다. 전체는 아래 조건들의 합계이며, 조건별 task 수와 평가 버전이 달라 전체 순위는 매기지 않습니다. 각 칸은 SR · 성공/완료 · 완료/계획입니다.', overallSection);
    function drawOverall() {
      overall.replaceChildren(); const p = overallPartner.value;
      const required = Object.keys(data.models).filter(m => tasks.some(t => groups.some(g => { const r = getResult(p, m, t, g); return r.complete && r.n > 0; })));
      const common = Object.fromEntries(groups.map(g => [g, required.length ? tasks.filter(t => required.every(m => { const r = getResult(p, m, t, g); return r.complete && r.n > 0; })) : []]));
      const combine=rows=>rows.reduce((a,r)=>({n:a.n+(r.n||0),correct:a.correct+(r.correct||0),expected:a.expected+(r.expected||0)}),{n:0,correct:0,expected:0});
      const metric=(parent,r)=>{add('strong',r.n?`${(100*r.correct/r.n).toFixed(1)}%`:'—',parent);add('span',r.n?`성공 ${r.correct} / 완료 ${r.n}`:'완료 결과 없음',parent).className='source-note';add('span',`완료 ${r.n} / 계획 ${r.expected}`,parent).className='source-note';};
      for (const m of modelOrder) {
        const tr = add('tr', '', overall);tr.dataset.model=m;
        const td = add('td', '', tr), b = add('button', models[m] + (m === 'oracle' ? ' · 참고' : ''), td); b.className = 'lr-btn';
        const actual = p === 'A' && data.model_evaluation_status?.[m];
        if(actual){const state=add('span',actual.status,td);state.className='source-note';state.title=actual.source_plan||'';add('span',actual.detail,td).className='source-note';if(actual.checked_utc)add('span',`마지막 집계 확인 ${actual.checked_utc.slice(0,19).replace('T',' ')} UTC`,td).className='source-note';}
        b.onclick = () => { model.value = m; partner.value = p; changeFilter(); matrixSection.scrollIntoView({behavior: 'smooth', block: 'nearest'}); };
        const totals=Object.fromEntries(groups.map(g=>[g,combine(common[g].map(t=>getResult(p,m,t,g)))]));
        for(const [id,keys] of [['TOTAL',groups],['Demo',['P0']],['Pause',['P1-ID','P1-OOD']],['Speed',['P1-speed0.5','P1-speed1.5']],['Role',['P2']]]){
          const cell=add('td','',tr);cell.dataset.condition=id;const r=combine(keys.map(g=>totals[g]).filter(Boolean));metric(cell,r);
          if(id==='Pause'||id==='Speed')for(const g of keys){const q=totals[g];add('span',`${data.full_groups[g]}: ${q?.n?score(q):'—'}`,cell).className='source-note';}
        }
      }
      overallNote.textContent = `${required.length > 1 ? required.length + '개 기준 모델의 공통 완료 task' : required.length ? models[required[0]] + '만 평가됨' : '완료된 평가 없음'} · ` + groups.map(g => `${data.full_groups[g]} ${common[g].length}개`).join(' · ');
    }
    overallPartner.onchange = drawOverall;
    note('Oracle + S1 10k · 기존/연속 target/대기 보호를 포함합니다. 추가 S1·SimpleSG의 Lift Pot 판정 v2와 기준 모델의 보존된 v1 결과를 구분합니다. 기존 실행 상태와 task별 영상은 아래에서 확인할 수 있습니다.',overallSection);
    const matrixSection = add('section', '', main); matrixSection.id = 'task-partner-matrix'; matrixSection.style.scrollMarginTop = '5rem';
    add('h3', '2. 모델별 task × 파트너 조건', matrixSection);
    note('성공률 셀을 누르면 같은 모델·task·파트너·조건의 성공·실패 영상이 열립니다. 조건을 선택하면 표의 열도 함께 바뀝니다.', matrixSection);
    const controls = add('div', '', matrixSection); controls.className = 'lr-controls';
    const model = select(controls, '모델', modelOrder.map(m => [m, models[m]]));
    const partner = select(controls, '파트너', [['all', 'A·B 함께'], ['A', 'A · 녹화 궤적 재생'], ['B', 'B · 온라인 전문가']]);
    const condition = select(controls, '조건', [['all', '전체 조건'], ...Object.entries(data.full_groups)]);
    condition.value = 'P1-OOD';
    const matrixTitle = add('h4', '', matrixSection), wrap = add('div', '', matrixSection); wrap.className = 'lr-scroll';
    const matrix = add('table', '', wrap), matrixHead = add('thead', '', matrix), matrixBody = add('tbody', '', matrix); matrix.id = 'task-partner-table';
    const player = add('section', '', main); player.id = 'selected-result-videos'; player.style.scrollMarginTop = '5rem';
    add('h3', '3. 선택한 셀의 성공·실패 영상', player);
    const playerTitle = add('h4', '위 표에서 성공률 셀을 선택하세요.', player), playerNote = note('', player), pair = add('div', '', player); pair.className = 'lr-grid2';
    let selected = null;
    const statuses = {pending: '완료된 평가 사례가 아직 없습니다', planned: '평가 예정 · 실제 실행 여부는 모델 상태 참조', no_outcome: '완료된 평가에 해당 결과 없음', unevaluated: '이 모델·체크포인트·파트너 조합은 미평가', unsupported: '현재 과제 목표에 맞는 평가 없음', ineligible: '전문가 유효 장면 없음 · 모델 실패로 집계하지 않음', not_applicable: '이 조건은 적용하지 않습니다', source_pending: '영상 생성 준비 중', trace_missing: '원 평가 행동 기록을 찾지 못해 영상 생성 보류', replay_mismatch: '재생 결과 불일치 · 게시 제외', render_error: '렌더 오류 확인 중', selected: '영상 생성 중', queued: '영상 생성 대기', rendering: '영상 생성 중'};
    function drawMatrix() {
      matrixHead.replaceChildren(); matrixBody.replaceChildren();
      const ps = partner.value === 'all' ? ['A', 'B'] : [partner.value], gs = condition.value === 'all' ? groups : [condition.value];
      matrixTitle.textContent = `${models[model.value]} · ${condition.value === 'all' ? '전체 조건' : data.full_groups[condition.value]}`;
      const h1 = add('tr', '', matrixHead), taskHeader = add('th', 'Task / 목표', h1); taskHeader.rowSpan = 2;
      for (const p of ps) { const th = add('th', p === 'A' ? '파트너 A · 녹화 궤적' : '파트너 B · 온라인 전문가', h1); th.colSpan = gs.length; }
      const h2 = add('tr', '', matrixHead);
      for (const p of ps) for (const g of gs) { const th = add('th', data.full_groups[g], h2); if (g === 'P1-OOD') th.className = 'pause-ood'; }
      for (const t of tasks) {
        const info = data.full_tasks[t], tr = add('tr', '', matrixBody), name = add('td', info.name + (info.diagnostic_only ? ' †' : ''), tr);
        if (t.startsWith('fabrica_') || info.diagnostic_only) add('span', info.definition, name).className = 'source-note';
        for (const p of ps) for (const g of gs) {
          const r = getResult(p, model.value, t, g), clips = clipsFor(p, model.value, t, g), td = add('td', '', tr);
          if (g === 'P1-OOD') td.className = 'pause-ood';
          const b = add('button', r.n ? score(r) : r.complete || ['not_applicable', 'unsupported', 'ineligible'].includes(r.status) ? 'N/A' : p === 'A' && r.source === 'pending' ? '대기' : '미평가', td);
          b.className = 'matrix-cell'; b.dataset.model = model.value; b.dataset.task = t; b.dataset.partner = p; b.dataset.group = g;
          b.setAttribute('aria-label', `${models[model.value]} · ${info.name} · 파트너 ${p} · ${data.full_groups[g]} · 성공·실패 영상`);
          b.setAttribute('aria-pressed', String(Boolean(selected && selected.model === model.value && selected.task === t && selected.partner === p && selected.group === g)));
          add('span', statusLabel(r, p) + (clips.some(c => c.status === 'available') ? ` · 영상 ${clips.filter(c => c.status === 'available').length}개` : ''), b).className = 'source-note';
          if (r.protocol_note) add('span', r.protocol_note, b).className = 'source-note';
          b.onclick = () => { selected = {model: model.value, task: t, partner: p, group: g}; drawMatrix(); drawPlayer(); player.scrollIntoView({behavior: 'smooth', block: 'nearest'}); };
        }
      }
    }
    function drawPlayer() {
      pair.querySelectorAll('video').forEach(v => v.pause()); pair.replaceChildren();
      if (!selected) return;
      const s = selected, info = data.full_tasks[s.task], result = getResult(s.partner, s.model, s.task, s.group), clips = clipsFor(s.partner, s.model, s.task, s.group);
      playerTitle.textContent = `${models[s.model]} · ${info.name} · 파트너 ${s.partner} · ${data.full_groups[s.group]}`;
      playerNote.textContent = `${result.n ? score(result) + ' · ' : ''}${statusLabel(result, s.partner)} · ${info.definition}${result.protocol_note ? ' · ' + result.protocol_note : ''}`;
      for (const success of [true, false]) {
        const clip = clips.find(c => c.success === success), box = add('div', '', pair); add('h4', success ? '성공 사례' : '실패 사례', box);
        if (!clip || clip.status !== 'available') {
          const missing = result.complete && result.n > 0 && (success ? result.correct === 0 : result.correct === result.n);
          const staleEligibility = clip?.status === 'ineligible' && result.expected > 0;
          const message = result.video_status === 'not_recorded' ? '이번 50k 평가는 영상을 수집하지 않았습니다.' : missing ? statuses.no_outcome : staleEligibility ? '수정된 조건의 영상 생성 대기' : statuses[clip?.status] || (result.n ? '영상 생성 대기' : statusLabel(result, s.partner));
          note(message, box); if (!staleEligibility && clip?.reason && clip.reason !== message) note(clip.reason, box); continue;
        }
        const video = add('video', '', box); video.controls = true; video.preload = 'metadata'; video.src = clip.url; video.style.width = '100%';
        const a = add('a', '영상 새 창으로 열기', box); a.href = clip.url; a.target = '_blank'; a.rel = 'noopener';
        note(`${clip.key} · ${(clip.phys_steps / 250).toFixed(2)}초`, box);
        if (clip.commands?.length) {
          const active = note('', box);
          const update = () => { let c = clip.commands[0]; for (const next of clip.commands) { if (next.seconds > video.currentTime) break; c = next; } active.textContent = `Oracle · ${c.seconds.toFixed(2)}초부터 · ${c.stage}: ${c.text}`; };
          video.addEventListener('timeupdate', update); video.addEventListener('seeked', update); update();
          const history = add('details', '', box); add('summary', `Oracle 명령 이력 (${clip.commands.length}구간)`, history);
          clip.commands.forEach(c => { const b = add('button', `${c.seconds.toFixed(2)}초 · ${c.stage}: ${c.text}`, history); b.className = 'lr-btn'; b.style.cssText = 'display:block;text-align:left;margin:4px 0;white-space:normal'; b.onclick = () => { video.currentTime = c.seconds; update(); }; });
        }
        note('저장된 행동 재생 · 모델 재추론 없음 · 원 평가와 성공 여부·종료 물리 tick 일치', box);
      }
    }
    const changeFilter = () => {
      if (selected) { selected.model = model.value; if (partner.value !== 'all') selected.partner = partner.value; if (condition.value !== 'all') selected.group = condition.value; }
      drawMatrix(); drawPlayer();
    };
    model.onchange = partner.onchange = condition.onchange = changeFilter;
    drawOverall(); drawMatrix();openMainOverall();
    note(`검증·게시 영상 ${videos.available}개. 미평가·진행 중·해당 결과 없음·영상 대기를 구분해 표시합니다.`, main);
    const experiment = (title, description) => { const d = add('details', '', experiments); d.className = 'experiment'; add('summary', title, d); if (description) note(description, d); return d; };
    if(data.simplesg_final){
      const s=data.simplesg_final,d=experiment('완료 · SimpleSG P0 / 새 Pause-OOD','S2는 고정된 SimpleSG Qwen3.5-9B입니다. 두 S1 checkpoint를 같은11개 task·같은517장면에서 비교했습니다. ID·Speed·Role의 남은 평가는 포함하지 않습니다.');
      d.open=true;const b=table(d,['모델','P0','새 Pause-OOD','P0+OOD 전체','오류']);
      for(const r of s.models){const p=r.P0,o=r['P1-OOD'],tr=add('tr','',b);[r.label,score({n:p.n,correct:p.success}),score({n:o.n,correct:o.success}),score({n:p.n+o.n,correct:p.success+o.success}),String(s.errors)].forEach(v=>add('td',v,tr));}
      note('총2,068건 완료. S1 10k와50k 모두 P0+OOD 성공157/1,034건으로 같습니다. Mug는 별도 진단, Lift Pot은 판정v2, Fabrica는 중간 조립 목표입니다.',d);
      const a=add('a','Task별 최종 CSV 다운로드',d);a.href='simplesg-p0-ood-final.csv';a.download='simplesg-p0-ood-final.csv';
      if(data.simplesg_saved){
        const saved=data.simplesg_saved;note(saved.note,d);
        const all=table(d,['모델',...Object.values(data.full_groups)]);
        for(const m of saved.models){const tr=add('tr','',all);add('td',m.label,tr);for(const g of groups){const r=m.groups[g];const td=add('td',score(r),tr);add('span',`${r.n}/${r.expected} 보존${r.n<r.expected?(saved.status==='resuming'?' · 후속 재개':' · 후속 미실행'):''}`,td).className='source-note';}}
      }
    }
    if(data.recent4_saved){
      const s=data.recent4_saved,d=experiment('recent-4-call 9B·27B · 저장된 full50 평가',s.protocol_note);d.open=true;
      const b=table(d,['모델','실행 상태','완료 / 전체','성공 / 완료','SR']);
      for(const r of s.models){const tr=add('tr','',b);[r.label,r.status,`${r.n}/${r.expected}`,`${r.correct}/${r.n}`,score(r)].forEach(v=>add('td',v,tr));}
      note('9B는 노드 장애로 중단됐습니다. 표본 구성과 완료 수가 다르므로 두 모델의 전체 중간 SR을 직접 비교하지 않습니다. 새 프로토콜의 리더보드와 별도로 보존합니다.',d);
      const detail=add('details','',d);add('summary','모델별 task × 조건 SR 펼치기',detail);
      for(const m of s.models){add('h4',m.label,detail);const tb=table(detail,['Task',...Object.values(data.full_groups)]);for(const t of tasks){const tr=add('tr','',tb);add('td',data.full_tasks[t].name,tr);for(const g of groups){const r=m.rows.find(r=>r.task===t&&r.group===g);const td=add('td',score(r),tr);if(r)add('span',`${r.n}/${r.expected} 보존`,td).className='source-note';}}}
    }
    if(data.oracle_s1_recipe_eval){
      const s=data.oracle_s1_recipe_eval,d=experiment('S1 10k 세 조건 + Oracle · 전체 진행과 같은 장면 비교','기존 S1 / 연속 target S1 / 대기 보호 S1을 비교합니다. Oracle v2·K32·batch1, P0/OOD 11개 task·새 지점 ID 5개 task입니다.');
      d.id='s1-recipe-results';d.open=true;s1PairedTable(d);
      const b=table(d,['S1 + Oracle','기평가 / 요청 범위','P0 원시 집계','새 ID 원시 집계','OOD 원시 집계','실행 상태']);
      for(const r of s.rows){const tr=add('tr','',b);add('td',s.models[r.model],tr);add('td',`${r.n}/${r.expected}`,tr);for(const g of Object.keys(s1Groups)){const q=r.groups[g];add('td',`${score(q)} · ${q.n}/${q.expected} 기평가`,tr);}add('td',r.status_text||(r.complete?'요청 범위 완료':`추가 평가 미실행 · 오류 ${r.errors}`),tr);}
      if(s.scope_note)note(s.scope_note,d);
      note('위 첫 표는 동일 완료 장면의 짝지은 비교입니다. 원시 집계는 모델별 완료 수가 달라 직접 비교하지 않습니다. 세 모델 모두 10k 학습 완료이며 학습 게이트 결과는 포함하지 않습니다.',d);
      const detail=add('details','',d);add('summary','Task별 동일 완료 장면 SR',detail);
      const tb=table(detail,['Task','조건','공통 완료 / 예정',...Object.values(s.models)]);
      for(const r of s.paired_tasks){if(!r.n)continue;const tr=add('tr','',tb);[data.full_tasks[r.task]?.name||r.task,s1Groups[r.group],`${r.n}/${r.expected}`,...Object.keys(s.models).map(m=>score({n:r.n,correct:r[m]}))].forEach(v=>add('td',v,tr));}
      const a=add('a','S1 비교 CSV 다운로드',d);a.href='s1-oracle-comparison.csv';a.download='s1-oracle-comparison.csv';
    }
    if(data.temporal_gate){
      const s=data.temporal_gate,d=experiment('W2 추가 데이터 · 실제 수집 구성과 학습 대기','기존 장면에서 오른팔만 교란하고, 왼팔 W2가 반응한 행동과 실제 대기 label을 다시 기록합니다. 기존 데이터로 학습한 S1 대기 보호 실험과 별개입니다.');d.open=true;
      note(`${s.native_production?'이전 7-task 코퍼스 보존':'현재 보존'}: ${s.n}/${s.expected}개 · train ${s.composition.train} / validation ${s.composition.validation}. ${s.scope}`,d);
      if(s.native_production){const n=s.native_production;note(`신규 native 4-task 선행 수집 ${n.accepted}/${n.scheduled_this_job}개 · job ${n.job}. 전체 11-task ${n.full11_expected}개는 계획이며 본학습은 아직 시작하지 않았습니다. 확인 ${s.checked_utc}.`,d);note(s.adapter_note,d);}
      note('현재 수집은 장면당 정지 1개(0.5~4초)와 감속 1개(0.3~0.8배, 1~4초)입니다. 각 task의 기존 train26·validation6 장면을 재사용했습니다. 새 장면을 446개 만든 것이 아닙니다.',d);
      const b=table(d,['Task','정지','감속','Train','Validation','완료 / 목표']);
      for(const r of s.tasks){const tr=add('tr','',b);[r.label,r.pause,r.slow,r.train,r.validation,`${r.n}/${r.expected}`].forEach(v=>add('td',String(v),tr));}
      note(`현재 gate 구간 안 ${s.composition.inside}개·구간 밖 ${s.composition.outside}개. 교란이 있다는 이유로 wait=1을 주지 않습니다. W2가 실제로 멈춘 frame만 대기 label입니다. Lift Pot 구간·실패 원인은 별도 검증 중입니다.`,d);
      if(s.scope_expanding)note(`확장 계획(미완료): 전체11task × 정지·감속·가속 × 32장면 = 신규 ${s.expanded_requested}개. Mug와 Fabrica3개, 가속은 아직 현재 수집 완료 수에 포함되지 않습니다. Fabrica는 Beam 첫column+같은쪽cap/왼손지지, Stool 지정 첫leg, Plumber 지정 첫tube까지입니다. 이전7-task 본학습 자동 시작은 중지했습니다.`,d);
      note('학습 구간이 현재 eval의 고정 정지 지점을 포함하는지, 실제 오른팔 명령 정지 구간과 일치하는지 task별 감사 중입니다. 물리 qpos 완전 정지는 기존 command trace만으로 검증하지 않습니다.',d);
      note(s.blocker,d);
      note('게이트 10k와 추가 데이터 π0.5 fresh20k는 아직 본학습을 시작하지 않았습니다. 기존 trainset은 유지하며, 교란·접촉·source clock 정보는 학생 모델 입력에 넣지 않습니다.',d);
    }
    if(data.oracle_gate_diagnostic){
      const s=data.oracle_gate_diagnostic,d=experiment('Oracle gate · 선택 16건 진단','Mic·Block 각각 두 seed의 P0/새ID/OOD를 사용한 privileged 진단입니다. 전체 리더보드 SR이나 학습 게이트 성능이 아닙니다.');
      const b=table(d,['Task','조건','π0.5 20k','위치 gate','Release-intent gate']);
      for(const r of s.rows){const tr=add('tr','',b);[data.full_tasks[r.task]?.name||r.task,s1Groups[r.group],...['baseline','pose_gate','release_intent'].map(m=>score({n:r.n,correct:r[m]}))].forEach(v=>add('td',v,tr));}
      note('개입 전 행동은 원래 π0.5와 동일함을 확인했습니다. Oracle gate는 실제 접촉 정보와 clean geometry를 사용하며 pause 길이·source clock은 사용하지 않습니다.',d);
    }
    if (data.experiment_status) {
      const s = data.experiment_status, d = experiment('전체 실험 진행 현황', `확인 시각 ${s.updated_utc} · 실행 잡과 원시 결과 기준. 학습 loss와 시뮬레이션 SR은 별도로 표시합니다.`);
      d.open = true;
      const b = table(d, ['실험', '상태', '진행·결과','확인 시각 UTC']);
      for (const r of s.rows) { const tr = add('tr', '', b); [r.label,r.status,r.detail,(r.checked_utc||s.updated_utc).replace('T',' ').slice(0,19)].forEach(v => add('td',v,tr)); }
    }
    if(data.stool_speed_audit){
      const s=data.stool_speed_audit,p=s.profile,d=experiment('Stool 속도 진단 · 완료 장면 보존 후 병렬화','모델 추론·영상 없이 저장된 행동을 재생해 측정한 중간 구간입니다. 전체 rollout 시간이나 SR이 아닙니다.');
      const b=table(d,['구간','측정 시간']);
      for(const [label,key] of [['진단 구간 전체','sample_seconds'],['물리 엔진','physics_seconds'],['조립 완료 판정','completion_check_seconds'],['초기 환경 생성','initialization_seconds']]){const tr=add('tr','',b);[label,p[key].toFixed(1)+'초'].forEach(v=>add('td',v,tr));}
      const q=s.parallel_supplement;note(q.status==='completed'?`Stool ${q.completed}/100건 병합 완료. 원 작업의 완료 ${q.original_results_preferred}건을 우선하고 보조 작업의 중복 없는 결과를 합쳤습니다. 대기 보호 S1 전체 1,494건을 확보한 뒤 원 중복 작업을 종료했습니다. S1 batch1, K32, 성공 기준과 물리 설정을 유지했습니다.`:`완료 ${q.preserved}건 보존, 남은 ${q.pending}건을 보조 GPU 2장에 분산했습니다. 각 8개 시뮬레이터, S1 batch1, K32, 성공 기준과 물리 설정을 유지합니다. 기존 결과를 우선하고 전체 장면을 확보한 뒤 중복 작업을 종료합니다.`,d);
      note('환경 재사용 실험에서는 초기 관절 위치가 달라져 공식 평가에 적용하지 않았습니다. 기존의 매 장면 초기화 방식을 유지합니다.',d);
    }
    if (data.new_anchor_id) {
      const s = data.new_anchor_id, d = experiment((s.complete ? '완료 · ' : '최우선 · ')+'같은 새 정지 지점의 1초·2초 재평가', s.interpretation);
      d.open = true;
      note(`Expert 검증 ${s.expert_checked}/${s.expert_planned}건 · 모델 평가 ${s.completed}/${s.expected}건. 각 seed에서 1초와 2초를 모두 평가하고, 두 expert 조건을 통과한 공통 seed로 P0·1초·2초·OOD를 비교합니다. Mug는 별도 진단입니다.`, d);
      const aggregate=table(d,['모델','같은 장면 P0','새 지점 1초','새 지점 2초','새 지점 8·16초']);
      for(const m of Object.keys(data.models)){
        const rows=s.paired_rows.filter(r=>r.model===m),tr=add('tr','',aggregate);
        add('td',models[m],tr);
        for(const group of ['P0','1','2','OOD']){
          const total=rows.reduce((a,r)=>({n:a.n+r[group].n,correct:a.correct+r[group].correct}),{n:0,correct:0});
          add('td',score(total),tr);
        }
      }
      note('위 합산은 Basket·Stack·Block·Mic·Mug의 공통 장면이며 진단용 Mug를 포함합니다. 메인 전체 task 리더보드와 분모가 다릅니다.',d);
      const b = table(d, ['모델','Task','동일 seed P0','새 지점 1초','새 지점 2초','동일 seed OOD','상태']);
      for (const r of s.paired_rows) {
        const tr=add('tr','',b), done=r.expert_checked && r['1'].n===r.expected_seeds && r['2'].n===r.expected_seeds;
        [models[r.model],data.full_tasks[r.task].name,score(r.P0),score(r['1']),score(r['2']),score(r.OOD),done?'완료':r.expert_checked?'모델 평가 대기·진행 중':'Expert 검증 중'].forEach(v=>add('td',v,tr));
      }
      const old=add('details','',d); add('summary','예전 정지 지점의 Pause-ID 결과 펼치기',old);
      note('새 OOD와 정지 위치가 다릅니다. 정지 길이 일반화의 근거로 직접 비교하지 않습니다.',old);
      const ob=table(old,['모델','Task','기존 Pause-ID']);
      for (const r of s.historical_rows) { const tr=add('tr','',ob); [models[r.model],data.full_tasks[r.task].name,score(r)].forEach(v=>add('td',v,tr)); }
    }
    const definitions = experiment('평가 설정과 버전', 'A는 녹화 궤적 재생, B는 온라인 전문가입니다. Pause·Speed·Role은 각각 별도 조건이며 A/B는 서로 합산하지 않습니다.');
    if (data.speed_audit) {
      const s=data.speed_audit, d=experiment('Speed · 시간 제한 감사와 양팔 Expert 검증','11/09 Oracle+S1 50k 원시 결과는 base_multiplier=1입니다. 한도 종료와 오른팔 기록 미완료를 구분합니다. Oracle은 S1의 진행 속도를 바꾸지 못하므로 Speed 성능 상한으로 해석하지 않습니다.');
      d.open=true;
      const ab=table(d,['Task','속도','기존 Oracle SR','실패','한도 종료·오른팔 미완료','한도 종료·오른팔 완료','실패 종료 사유']);
      for (const r of s.existing_oracle.filter(r=>!r.task.startsWith('fabrica_'))) {
        const tr=add('tr','',ab);[data.full_tasks[r.task].name,r.speed+'×',score({n:r.n,correct:r.success}),r.failures,r.limit_before_tape,r.limit_after_tape,Object.entries(r.terminations).map(([k,v])=>k+': '+v).join(' · ')].forEach(v=>add('td',String(v),tr));
      }
      note(`양팔 Expert 검증 ${s.expert_n}/${s.expert_expected}건. 기본 예산·2배 예산과 Lift Pot 판정 v1·v2는 별도 조건입니다.`,d);
      const gb=table(d,['Task','속도','기본 예산 배율','판정','Expert 성공 / 완료','계획','상태']);
      for (const r of s.gates) { const tr=add('tr','',gb);[data.full_tasks[r.task].name,r.speed+'×',r.base_multiplier,r.physical_completion,r.success+'/'+r.n,r.expected,r.complete?'완료':'진행 중'].forEach(v=>add('td',String(v),tr)); }
      const bb=table(d,['Stack 0.5× · Oracle+S1 50k','성공률','K','추론 batch']);
      for(const r of s.budget_rows){const tr=add('tr','',bb);['예산 '+r.multiplier+'×',score({n:r.n,correct:r.success}),r.K,r.batch_size].forEach(v=>add('td',String(v),tr));}
      note('Stack은 기존 실패 20건 모두 오른팔 기록 종료 후 한도로 끝났습니다. 예산 1배·2배를 같은 K32/batch1로 재평가해 남은 수행 시간의 영향을 별도로 확인합니다. 기존 batch12 값과 직접 차이를 계산하지 않습니다.',d);
      const old=add('details','',d);add('summary','검증 전 Speed 값 펼치기',old);const ob=table(old,['모델','Task','속도','기존 값']);
      for(const r of s.historical_rows){const tr=add('tr','',ob);[models[r.model],data.full_tasks[r.task].name,data.full_groups[r.group],score(r)].forEach(v=>add('td',v,tr));}
    }
    note('새 P0/OOD: K=32, 추론 batch=1. OOD 멈춤점은 π0.5 실패를 확인하며 선택한 진단 조건입니다. Mug는 전문가 재생 실패가 있어 별도 진단입니다. 기존 Lift Pot 점수는 v1이고, 새 실험의 v2와 구분합니다. Oracle은 정답 정보를 사용하는 참고치입니다.', definitions);
    if (data.beam_speed_repair) { const b = data.beam_speed_repair; note(`Beam Speed 1.5× 수정 검증: ${b.checked}/${b.planned}개 확인 · ${b.valid}개 성공. ${b.profile}. 기존 전체 tape 1.5× 전문가 ${b.original_uniform_expert}와 구분합니다.`, definitions); }
    const paired = experiment('같은 새 평가 설정끼리 비교 · P0 / Pause-OOD', '기존 조건을 섞지 않은 공통 완료 장면의 합산입니다.');
    const scopeControls = add('div', '', paired); scopeControls.className = 'lr-controls';
    const scope = select(scopeControls, '합산 범위', data.scopes.map(s => [s.id, `${s.models_required.length}개 모델 · ${s.tasks.length} task`]));
    const includeMug = add('label', '', scopeControls), mug = add('input', '', includeMug); mug.type = 'checkbox'; mug.checked = true; includeMug.append(' Mug 별도 진단 포함');
    const pairedBody = table(paired, ['모델', 'P0', 'Pause-OOD', '변화']);
    const drawPaired = () => {
      pairedBody.replaceChildren(); const ts = data.scopes.find(s => s.id === scope.value).tasks.filter(t => mug.checked || !data.tasks[t].diagnostic_only);
      for (const [m, label] of Object.entries(data.models)) {
        const sum = g => data.rows.filter(r => r.model === m && r.group === g && ts.includes(r.task)).reduce((a, r) => ({n: a.n + r.n, correct: a.correct + r.correct}), {n: 0, correct: 0});
        const p = sum('P0'), o = sum('P1-OOD'), tr = add('tr', '', pairedBody);
        [label, score(p), score(o), p.n && o.n ? ((o.correct / o.n - p.correct / p.n) * 100).toFixed(1) + '%p' : '—'].forEach(v => add('td', v, tr));
      }
    }; scope.onchange = mug.onchange = drawPaired; drawPaired();
    if (data.oracle_chunks) {
      const d = experiment('Oracle + S1 50k · 실행 chunk K 비교', '행동 horizon은 32, Oracle은 매 action 갱신합니다. 실제 한 번에 실행하는 길이 K=32/16/8/5만 바꾼 별도 실험입니다. 완료 수는 K별 반복 평가를 합한 수이며 메인 리더보드 장면 수가 아닙니다.');
      for (const part of data.oracle_chunks.parts) {
        const names={'oracle-chunks':'Basket · Stack · Block · Mug','oracle-chunks-mic':'Mic',fabrica_beam:'Fabrica Beam',fabrica_plumbers_block:'Fabrica Plumber',fabrica_stool:'Fabrica Stool'};
        add('h4', `${names[part.id] || part.id} · K 비교 ${part.n}/${part.expected} 완료`, d);
        if(part.status)note(part.status,d);
        const b = table(d, ['K', 'P0', 'Pause-OOD', '진행 상태']); const ts = [...new Set(part.rows.map(r => r.task))];
        for (const K of [32, 16, 8, 5]) {
          const rows = part.rows.filter(r => r.K === K), sum = g => rows.filter(r => r.group === g).reduce((a, r) => ({n: a.n + r.n, correct: a.correct + r.correct}), {n: 0, correct: 0});
          const p = sum('P0'), o = sum('P1-OOD'), complete = rows.length === ts.length * 2 && rows.every(r => r.n === r.expected), tr = add('tr', '', b);
          [String(K), score(p), score(o), complete ? '완료' : p.n + o.n ? '보존된 부분 집계' : part.status || '미평가'].forEach(v => add('td', v, tr));
        }
      }
    }
    if (data.temporal_small) {
      const s = data.temporal_small, d = experiment('π0.5 · 소규모 temporal 진단', `11개 task × 고정 2개 seed · ${s.n}/${s.expected}개 완료. 네 종류를 각각 평가하며 메인 리더보드에 합산하지 않습니다.`);
      const labels = {clean: 'Clean', 'random-tempo': 'Random Tempo', 'shift-slow': 'Tempo Shift 감속', 'shift-fast': 'Tempo Shift 가속', 'subtask-gaps': 'Subtask Gaps', 'start-delay': 'Start Offset 지연', 'start-advance': 'Start Offset 앞당김'};
      const b = table(d, ['조건', '성공률', '완료 / 유효', '상태']);
      for (const r of s.rows) { const tr = add('tr', '', b); [labels[r.condition], score(r), `${r.n}/${r.expected}`, r.complete ? '완료' : r.n ? '진행 중' : '대기'].forEach(v => add('td', v, tr)); }
    }
    if (data.training_latest) {
      const t = data.training_latest, d = experiment('π0.5 Main · 100k 연장 학습과 loss', '20k 가중치에서 optimizer를 초기화해 이어 학습했습니다. 메인의 π0.5 SR은 고정 20k 결과이며 새 checkpoint의 SR이 아닙니다.');
      const b = table(d, ['진행', 'GPU', '저장 checkpoint', '최근 검증 loss', '보존 상태']), tr = add('tr', '', b);
      [`${t.update.toLocaleString()}/${t.steps.toLocaleString()}`, String(t.gpus), String(t.checkpoint_update), String(t.latest_val_loss), t.replica_status === 'synced' ? 'Aurora 복제 확인' : '복제 확인 중'].forEach(v => add('td', v, tr));
      if (t.validation_trend) {
        const lb = table(d, ['Step', 'Train loss · 직전 약 1k 평균', 'Validation loss']);
        for (const r of t.validation_trend) { const tr = add('tr', '', lb); [r.update.toLocaleString(), r.train_loss_mean.toFixed(5), r.validation_loss.toFixed(5)].forEach(v => add('td', v, tr)); }
        note(`검증 기록 최저: ${t.best_validation_update.toLocaleString()} step · ${t.best_val_loss.toFixed(5)}. Train loss 감소와 달리 검증 loss 개선은 확인되지 않습니다. 실제 SR은 별도 평가가 필요합니다.`, d);
      }
      if(t.preempted_update) note(`이전 잡이 ${t.preempted_update.toLocaleString()} step에서 선점됐고, 저장된 ${(t.initial_update||80000).toLocaleString()} step의 가중치·optimizer로 재개했습니다. 현재 상태: ${t.status}. 미저장 계산은 복구되지 않았습니다.`,d);
      note(`상태 갱신: ${t.updated_utc}`, d);
    }
    const coverage = experiment('영상 준비 현황', `검증·게시 ${videos.available}개. 성공·실패 사례는 같은 모델·체크포인트·과제 목표의 기록만 연결합니다.`);
    const vb = table(coverage, ['파트너', '모델', '조건', '게시', '생성·기록 확인 중', '원 기록 미확보', '해당 결과 없음', '미평가·미적용']);
    for (const p of ['A', 'B']) for (const m of modelOrder) for (const g of groups) {
      const rows = tasks.flatMap(t => clipsFor(p, m, t, g)), ready = rows.filter(r => r.status === 'available').length, queue = rows.filter(r => ['queued', 'rendering', 'selected', 'source_pending', 'render_error', 'replay_mismatch'].includes(r.status)).length, missing = rows.filter(r => r.status === 'trace_missing').length, none = rows.filter(r => r.status === 'no_outcome').length;
      const tr = add('tr', '', vb); [p, models[m], data.full_groups[g], ready, queue, missing, none, rows.length - ready - queue - missing - none].forEach(v => add('td', String(v), tr));
    }
    const download = add('a', '평가 결과 JSON 다운로드', experiments); download.href = 'new-pause-results.json'; download.download = 'new-pause-results.json';
  } catch (error) { note('결과를 불러오지 못했습니다. 새로고침해 주세요.', panels.main); console.error(error); }
})();
