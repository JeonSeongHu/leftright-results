// Fixed common-case comparison and verified media, inside the existing results panel.
(async () => {
  const host = document.getElementById('abc-leaderboard');
  if (!host) return;
  const root = document.createElement('section'); root.id = 'abc-current-results'; host.prepend(root);
  const add = (tag, text, parent = root) => {
    const e = document.createElement(tag); e.textContent = text; parent.append(e); return e;
  };
  const note = (text, parent = root) => { const e = add('p', text, parent); e.className = 'lr-note'; return e; };
  const table = (parent, title, headings) => {
    const wrap = add('div', '', parent); wrap.className = 'lr-scroll';
    const t = add('table', '', wrap); add('caption', title, t);
    const tr = add('tr', '', add('thead', '', t));
    headings.forEach(h => { add('th', h, tr).scope = 'col'; });
    return add('tbody', '', t);
  };
  const value = row => row && row.n > 0 ? `${row.correct}/${row.n} (${(100 * row.correct / row.n).toFixed(1)}%)` : '평가 대기';
  const stamp = text => text ? text.slice(0, 19).replace('T', ' ') + ' UTC' : '집계 대기';
  const stateLabel = text => ({RUNNING: '실행 중', PENDING: '대기', COMPLETED: '완료', FAILED: '오류 종료', CANCELLED: '사용자 요청 중단 · 기록 보존'}[String(text).split(' ')[0]] || text);
  const style = add('style', '');
  style.textContent = '#abc-current-results{display:grid;gap:20px}#abc-current-results section{display:grid;gap:10px}#abc-current-results .current-selects{display:flex;gap:16px;flex-wrap:wrap}#abc-current-results label{display:grid;gap:6px}#abc-current-results select{font:inherit;max-width:100%;padding:8px}#abc-current-results .current-videos{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:16px}#abc-current-results video{width:100%;max-height:420px;background:#111}#abc-current-results .current-video{border:1px solid var(--color-border,#d4d4d4);border-radius:8px;padding:12px}#abc-current-results button{font:inherit}#abc-current-results .current-selected{font-weight:700;text-decoration:underline}#abc-current-results .pause-ood{background:color-mix(in srgb,var(--color-warn,#be123c) 8%,transparent)}';
  try {
    const response = await fetch('abc-current-results.json', {cache: 'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const d = await response.json();
    const nav = document.querySelector('#new-pause [data-panel="abc"]');
    if (nav) nav.textContent = 'ABC / M1 비교';

    if(d.active_evaluation){
      const a=d.active_evaluation;const section=add('section','');section.id='active10k-execution-section';
      add('h3','현재 실행 / M1 10k fixed 대 adaptive',section);
      note(`집계 ${stamp(a.snapshot_utc)}. Adaptive 저장 완료 ${a.completed}/2,200건, 성공 ${a.correct}건. GPU ${a.gpu}장, GPU당16환경·batch상한16으로 실행 중입니다.`,section);
      note('평가 계획은 각 run 동일 2,200건으로 고정돼 있습니다. 아래 비교표 n은 fixed와 adaptive가 모두 완료한 공통 장면 수이며, 계획 건수가 달라진 것이 아닙니다. Fixed10k는 사용자 요청으로 중단한 저장1,642건만 재사용합니다.',section);
      const matched=table(section,`같은 ${a.matched_n}case / 성공·완료와 SR`,['Suite','공통 n','M1 10k fixed K32','M1 10k adaptive']);
      for(const s of [...d.suites,{id:'TOTAL',label:'합계'}]){
        const fixed=a.matched.fixed10k[s.id],adaptive=a.matched.adaptive10k[s.id];
        const tr=add('tr','',matched);add('th',s.label,tr).scope='row';add('td',fixed.completed,tr);
        add('td',value({correct:fixed.correct,n:fixed.completed}),tr);add('td',value({correct:adaptive.correct,n:adaptive.completed}),tr);
        if(s.id==='Pause-OOD')tr.className='pause-ood';
      }
      note('공통 비교 구성: '+Object.entries(a.matched_by_task).map(([id,n])=>`${d.tasks.find(t=>t.id===id)?.label||id} ${n}건`).join(', ')+'. Pause-OOD는 아직 Mic25건만 공통 완료했으며 전체 task의 최종 결과가 아닙니다. Speed는 아직 공통 완료가 없습니다.',section);
      const raw=table(section,'원시 저장 진행 / 모델별 완료 구성은 서로 다름',['Suite','fixed10k 보존 완료','adaptive10k 저장 완료']);
      for(const s of [...d.suites,{id:'TOTAL',label:'합계'}]){
        const tr=add('tr','',raw);add('th',s.label,tr).scope='row';
        for(const id of ['fixed10k','adaptive10k']){const row=a.raw[id][s.id];add('td',value({correct:row.correct,n:row.completed}),tr);}
      }
      note('위 원시 진행 표는 저장 상태를 보여 줍니다. 두 모델의 성능 비교는 공통 case 표를 사용합니다. 15k fixed·adaptive6개 잡은 모두 중단했고 기존 결과를 아래에 보존했습니다.',section);
      const rows=table(section,'10k adaptive 실행 lane',['Job','Task','저장 완료 / 담당 계획','노드','상태']);
      for(const r of a.jobs){const tr=add('tr','',rows);add('td',r.id,tr);add('td',r.tasks.map(id=>d.tasks.find(t=>t.id===id)?.label||id).join(' · '),tr);add('td',`${r.completed}/${r.planned}`,tr);add('td',r.node,tr);add('td',stateLabel(r.state),tr);}
      note('H32 전체가 현재 명령 근처의 유지 동작이면4개만 실행하고 새 RGB로 다시 예측하며, 그 외에는32개를 실행합니다. 기존 fixed10k 기본 noise 설정을 유지했습니다.',section);
    }

    add('h3', 'ABC, M1 평가 / 같은 1,000case 중간 비교');
    note(`Partner A, 고정 2,200case 계획 중 다섯 모델이 모두 완료한 같은 ${d.shared_completed.toLocaleString()}case만 비교합니다. 결과 스냅샷 ${stamp(d.snapshot_utc)}. 이 표는 전체 평가의 최종 SR이 아닙니다.`);
    note('Demo는 정지 없음, Pause-ID는 1초와 2초, Pause-OOD는 8초와 16초입니다. Speed는 파트너 재생 속도입니다. 모든 SR에 성공 수와 실제 완료 수를 함께 적었습니다.');
    const suiteMap = new Map(d.suites.map(s => [s.id, s]));
    const totals = new Map(d.comparison.map(r => [r.suite, r]));
    const comparison = table(root, '동일 task, condition, scene의 완료 교집합 1,000case', ['모델', ...d.suites.map(s => s.label), '같은 1,000case 합계']);
    for (const m of d.models) {
      const tr = add('tr', '', comparison); add('th', m.label, tr).scope = 'row';
      for (const s of [...d.suites, {id: 'TOTAL'}]) {
        const td = add('td', value(totals.get(s.id).models[m.id]), tr);
        if (s.id === 'Pause-OOD') td.className = 'pause-ood';
      }
    }
    note('B의 추가 완료 Roller와 Plumber 400case는 아래 전체 진행에만 포함하고, 같은 1,000case 비교에서는 제외했습니다. 재개 후 추가 Mug 완료분도 이 고정 비교표에는 합치지 않습니다. A/B/C는 20k, M1과 M1+M2는 10k checkpoint입니다.');


    if (d.current_matched) {
      const section = add('section', ''); add('h3', '최신 집계 / ABC 20k 동일 case 비교', section);
      const c = d.current_matched.cohorts.ABC20k; const group = d.current_matched.groups.ABC20k;
      note(`집계 ${stamp(d.current_matched.snapshot_utc)}. A·B·C 모두 저장한 같은 고정 ${c.completed.toLocaleString()}case만 비교합니다. B는 사용자 요청으로 중단한 시점까지의 결과를 보존했습니다. 전체 11task 최종 SR이 아닙니다.`, section);
      note('평가 계획은 각 run 동일 2,200건으로 고정합니다. 비교표 n은 현재 세 모델 또는 두 모델이 모두 완료한 공통 장면 수이며, 계획 건수가 달라진 것이 아닙니다.', section);
      note('현재 비교의 task 구성: ' + Object.entries(c.by_task).map(([task,n]) => `${d.tasks.find(t => t.id === task)?.label || task} ${n}건`).join(', '), section);
      const body = table(section, 'ABC 20k · 같은 case의 성공 / 완료 및 SR', ['모델', ...d.suites.map(s => s.label), '공통 합계']);
      for (const id of ['A','B','C']) {
        const tr = add('tr', '', body); add('th', d.models.find(m => m.id === id)?.label || id, tr).scope = 'row';
        for (const s of [...d.suites,{id:'TOTAL'}]) { const r = group[s.id][id]; const td = add('td', value({n:r.completed,correct:r.correct}), tr); if (s.id === 'Pause-OOD') td.className = 'pause-ood'; }
      }
    }

    if (d.adaptive_m1_15k) {
      const a = d.adaptive_m1_15k;
      const section = add('section', ''); add('h3', 'M1 15k / Fixed K32 대 Adaptive / 중단 전 보존 결과', section);
      note(`Partner A의 같은 고정 2,200case, 같은 M1 15k 가중치와 정규화입니다. 중단 전 설정은 각 조건 GPU ${a.gpu_per_arm}장이었습니다. Fixed jobs ${a.baseline_parallel_jobs.join(', ')}, adaptive jobs ${a.parallel_jobs.join(', ')}. Adaptive ${a.correct}/${a.n} 저장 완료, 집계 ${stamp(a.snapshot_utc)}. 위 공통 1,000case 표와 이전 candidate60 실험에는 합치지 않습니다.`, section);
      note('현재 같은 case 비교의 task 구성: ' + Object.entries(a.paired_cohort.by_task).map(([id,n]) => `${d.tasks.find(t => t.id === id)?.label || id} ${n}건`).join(', ') + '. 일부 task와 조건이 진행 중이므로 전체 11task 최종 SR로 해석하지 않습니다.', section);
      note(`동일 case 비교 기준 ${stamp(a.paired_snapshot_utc)} / 원시 저장 진행 기준 ${stamp(a.snapshot_utc)}. 두 집계의 기준 시각을 구분합니다.`, section);
      note('H32 전체 예측이 현재 명령의 팔 관절 0.01rad·gripper 0.01 안에 있으면 4개만 실행하고 나머지를 버린 뒤 새 RGB로 다시 예측합니다. 움직임이 포함되면 32개를 실행합니다. 같은 M1 15k의 K32 baseline과 비교합니다.', section);
      const body = table(section, '현재 저장 완료분 / baseline과 같은 case 교집합', ['Suite', 'Adaptive 성공 / 완료', '계획', '짝지은 case', 'K32 성공', 'Adaptive 성공', 'K4 / K32 횟수']);
      for (const s of a.suites) {
        const tr = add('tr', '', body); add('th', suiteMap.get(s.suite)?.label || s.suite, tr).scope = 'row';
        add('td', value(s), tr); add('td', s.planned, tr); add('td', s.paired_n, tr);
        add('td', value({correct: s.paired_baseline_correct, n: s.paired_n}), tr);
        add('td', value({correct: s.paired_adaptive_correct, n: s.paired_n}), tr);
        add('td', `${s.K4_chunks} / ${s.K32_chunks}`, tr);
      }
      note('첫 실제 K4는 control 224 / physics 3360에서 실행됐고, control 228 / physics 3420에서 새 RGB와 새 추론이 확인됐습니다. 아직 전체 SR의 차이를 판단할 단계는 아닙니다.', section);
    }


    {
      const response = await fetch('abc-demo250-analysis.json', {cache:'no-store'});
      if (!response.ok) throw new Error('Checkpoint tables HTTP ' + response.status);
      const a = await response.json(); const section = add('section',''); section.id = 'demo250-analysis-section';
      add('h3','같은 Demo 250건 / M1 10k와 15k 정량 비교',section);
      note(`05:59:51 UTC 비교표의 Demo 250건을 고정했습니다. Block·Mic·Mug·Beam·Basket 각50건이며, 모든 모델에 저장된 같은 case입니다. 집계 ${stamp(a.table_analysis_utc)}.`,section);
      const cols=[['m1','M1 10k'],['m1-15k','M1 15k'],['m1-adaptive-15k','M1 15k adaptive'],['C','C 20k']];
      const body=table(section,'동일 Demo case의 성공 / 완료 및 SR',['Task',...cols.map(x=>x[1])]);
      for(const r of a.demo_task_rows){
        const tr=add('tr','',body);add('th',r.task==='TOTAL'?'합계':d.tasks.find(t=>t.id===r.task)?.label||r.task,tr).scope='row';
        for(const [id]of cols)add('td',value(r.models[id]),tr);
      }
      add('h3','M1 10k와 15k / 같은 case의 suite별 비교',section);
      note(`두 fixed K32 평가가 모두 저장한 같은1,216case입니다. 집계 ${stamp(a.suite_snapshot_utc)}. Demo250 표와 task 구성이 다르므로 두 표의 전체 SR을 직접 비교하지 않습니다.`,section);
      note('구성: '+Object.entries(a.suite_task_counts).map(([id,n])=>`${d.tasks.find(t=>t.id===id)?.label||id} ${n}건`).join(', '),section);
      const suiteBody=table(section,'동일 case 교집합의 성공 / 완료 및 SR',['Suite','M1 10k','M1 15k']);
      for(const r of a.suite_rows){
        const tr=add('tr','',suiteBody);add('th',r.suite==='TOTAL'?'합계':suiteMap.get(r.suite)?.label||r.suite,tr).scope='row';
        for(const id of ['m1','m1-15k'])add('td',value(r.models[id]),tr);
      }
      note('평가 계획은 각 run 동일2,200건으로 고정돼 있습니다. 250과1,216은 이 표에서 같은 case로 비교할 수 있는 저장 완료 수입니다.',section);
    }

    const progress = add('section', ''); add('h3', '고정 2,200case 평가 진행', progress);
    const progressRows = table(progress, `완료 수 스냅샷 ${stamp(d.progress_snapshot_utc || d.snapshot_utc)} / job 상태 ${stamp(d.jobs_checked_utc)}`, ['모델', '성공 / 저장 완료', '계획', '현재 job', '실행 상태']);
    for (const m of d.progress_models || [...d.models, ...d.pending_models]) {
      const tr = add('tr', '', progressRows); add('th', m.label, tr).scope = 'row';
      add('td', m.progress ? `${m.progress.correct}/${m.progress.n}` : '이 비교 스냅샷에 미포함', tr);
      add('td', '2,200', tr); add('td', m.job.parallel_ids ? m.job.parallel_ids.join(', ') : m.job.id, tr); add('td', stateLabel(m.job.state), tr);
    }
    if (d.latest_m1_scope) note(d.latest_m1_scope.explanation + ' 현재 활성 평가는10k adaptive이며, 각 run의 계획2200건과 공통 완료 비교 분모를 구분합니다.', progress);
    note('전체 저장 진행과 같은 1,000case 비교의 확인 시각을 구분했습니다. 15k M1, M1+M2는 중단 전 기록이며 공통 1,000case 표에는 합치지 않습니다. 현재 10k adaptive 진행은 맨 위에 따로 표시합니다. 기록된 task 결과는 아래 영상 선택에서 확인할 수 있습니다.', progress);
    note('Mug export의 초기 상태 메타데이터를 원 수집 기록과 일치시켜 재개했습니다. 원 source, 2,200case ID, 성공조건과 물리 budget은 유지했습니다. Mug 원 clean expert는 50scene 중 26성공, 24실패였고, 모두 기록된 RIGHT tape와 정지 anchor를 갖춘 원 고정 case로 평가에 포함합니다.', progress);

    const taskSection = add('section', ''); add('h3', '모델별 task와 suite 결과', taskSection);
    note('아래 task 표는 같은 1,000case 비교 범위입니다. 재개 후 추가 완료분과 15k의 현재 결과는 전체 진행과 영상 선택 표에 따로 표시합니다.', taskSection);
    const controls = add('div', '', taskSection); controls.className = 'current-selects';
    function select(label, values, parent = controls) {
      const l = add('label', label, parent); const s = add('select', '', l);
      for (const v of values) { const o = add('option', v.label, s); o.value = v.id; }
      return s;
    }
    const modelChoice = select('모델', d.models);
    const taskWrap = add('div', '', taskSection);
    function drawTasks() {
      taskWrap.replaceChildren(); const model = d.models.find(m => m.id === modelChoice.value);
      const body = table(taskWrap, `${model.label} / 같은 1,000case 내 task별 비교`, ['Task', ...d.suites.map(s => s.label), '합계']);
      for (const task of d.tasks) {
        const tr = add('tr', '', body); add('th', task.label, tr).scope = 'row';
        for (const suite of [...d.suites, {id: 'TOTAL'}]) {
          const row = d.task_comparison.find(r => r.model_id === model.id && r.task === task.id && r.suite === suite.id);
          const td = add('td', value(row), tr); if (suite.id === 'Pause-OOD') td.className = 'pause-ood';
        }
      }
    }
    modelChoice.addEventListener('change', drawTasks); drawTasks();

    const gallery = add('section', ''); add('h3', '모델 → suite → task 성공·실패 영상', gallery);
    note('원 평가의 저장 행동을 재생해 결과와 종료를 확인한 영상만 연결합니다. 평가 대기, 현재 완료분에 해당 결과 없음, 영상 준비 중을 구분합니다. 각 영상에는 실제 1/2/8/16초 조건을 표시합니다.', gallery);
    const gc = add('div', '', gallery); gc.className = 'current-selects';
    const galleryModels = d.gallery_models || d.models;
    const gm = select('모델', galleryModels, gc); const gs = select('Suite', d.suites, gc); const gt = select('Task', d.tasks, gc);
    const grid = add('div', '', gallery); const viewer = add('div', '', gallery); viewer.className = 'current-videos';
    let clips = [];
    try { const r = await fetch('abc-current-videos.json', {cache: 'no-store'}); if (r.ok) clips = (await r.json()).clips || []; } catch {}
    const cell = (model, suite, task) => d.gallery_cells.find(r => r.model_id === model && r.suite === suite && r.task === task);
    function slot(model, suite, task, success) {
      const row = cell(model, suite, task);
      if (!row || !row.n) return {status: '평가 대기'};
      const count = success ? row.correct : row.n - row.correct;
      if (!count) return {status: `현재 완료분에 ${success ? '성공' : '실패'} 사례 없음`};
      const clip = clips.find(c => c.model_id === model && c.suite === suite && c.task === task && c.success === success && ['published','available'].includes(c.status) && /^(https:\/\/|assets\/)/.test(c.url));
      return clip ? {status: '재생 가능', clip} : {status: '영상 준비 중'};
    }
    function drawGallery() {
      grid.replaceChildren(); viewer.replaceChildren();
      const model = galleryModels.find(m => m.id === gm.value); const suite = suiteMap.get(gs.value);
      const body = table(grid, `${model.label} / ${suite.label} / 전체 11task`, ['Task', '성공 / 완료', '성공 영상', '실패 영상']);
      for (const task of d.tasks) {
        const tr = add('tr', '', body); const th = add('th', '', tr); th.scope = 'row';
        const b = add('button', task.label, th); b.type = 'button'; if (task.id === gt.value) b.className = 'current-selected';
        b.addEventListener('click', () => { gt.value = task.id; drawGallery(); });
        add('td', value(cell(gm.value, gs.value, task.id)), tr);
        for (const success of [true, false]) {
          const s = slot(gm.value, gs.value, task.id, success); const td = add('td', '', tr);
          if (s.clip) { const b = add('button', success ? '성공 재생' : '실패 재생', td); b.type = 'button'; b.addEventListener('click', () => { gt.value = task.id; drawGallery(); viewer.scrollIntoView({block: 'nearest'}); }); }
          else add('span', s.status, td);
        }
      }
      const task = d.tasks.find(t => t.id === gt.value);
      for (const success of [true, false]) {
        const box = add('article', '', viewer); box.className = 'current-video'; add('h4', `${task.label} / ${success ? '성공' : '실패'}`, box);
        const s = slot(gm.value, gs.value, gt.value, success);
        if (!s.clip) { note(s.status, box); continue; }
        const c = s.clip; const v = document.createElement('video'); v.controls = true; v.preload = 'none'; v.src = c.url; if (c.poster_url) v.poster = c.poster_url; box.append(v);
        note(`${model.label} / ${suite.label} / ${c.condition_label || c.condition} / seed ${c.scene_seed}. 원 저장 행동 재생 영상.`, box);
      }
    }
    for (const s of [gm, gs, gt]) s.addEventListener('change', drawGallery); drawGallery();

    const adaptive = add('section', ''); add('h3', 'Adaptive waiting / 별도 고정60쌍 실험 완료', adaptive);
    note('candidate1 wait-protected π0.5 10k의 원1925 roster에서 Mic/Block/Stack/Basket × P0/2s/8s 각 첫5case를 선택했습니다. 위 M1 학습 비교와 별도 실험입니다.', adaptive);
    const ab = table(adaptive, 'K32와 adaptive joint .01rad / gripper .01, H32, wait4 / motion32', ['실행', '성공 / 완료', 'K4 활성', '새예측 / freshRGB']);
    for (const r of [{name: 'fresh K32', n: 60, correct: 25, triggers: '0회', calls: '1,160'}, {name: 'adaptive K4', n: 60, correct: 25, triggers: '50case / 509회', calls: '1,643'}]) {
      const tr = add('tr', '', ab); [r.name, value(r), r.triggers, r.calls].forEach(v => add('td', v, tr));
    }
    note('509/509회 다음 freshRGB를 +4control/+60physics tick에서 확인했습니다. Infra 오류0. 실제 partner-ready 시점을 측정하지 않았고, 첫 재관측 전부터 명령값이 다른 case가 있어 전체 SR 차이를 K4의 인과효과로 단정하지 않습니다.', adaptive);

    const comparisonSection = add('section', '');
    add('h3', 'A의 Pause 성공 사례 비교', comparisonSection);
    note('같은 장면의 A/B/C 저장 행동을 물리 시각 0초에 맞춰 비교합니다. 짧은 실행은 종료 이후 마지막 프레임을 유지합니다.', comparisonSection);
    const comparisonGrid = add('div', '', comparisonSection); comparisonGrid.className = 'current-videos';
    const comparisonData = await (await fetch('abc-pause-comparisons.json')).json();
    for (const c of comparisonData.comparisons) {
      const box = add('article', '', comparisonGrid); box.className = 'current-video';
      const [taskId, seed, condition] = c.paired_key.split('/');
      const label = d.tasks.find(t => t.id === taskId)?.label || taskId;
      add('h4', `${label} / ${condition} / seed ${seed}`, box);
      const v = document.createElement('video'); v.controls = true; v.preload = 'none'; v.src = c.video; v.poster = c.poster; box.append(v);
    }
    const download = add('a', '현재 집계 JSON 다운로드'); download.href = 'abc-current-results.json'; download.download = 'leftright-current-results.json';
  } catch (error) {
    note('현재 결과를 불러오지 못했습니다. 아래 보존된 이전 결과와 구분해 확인해 주세요.');
    console.error('Leftright current results', error);
  }
})();
