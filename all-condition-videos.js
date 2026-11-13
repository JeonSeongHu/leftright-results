// Add condition-level examples while preserving all existing dashboard sections.
(async () => {
  const anchor = document.getElementById('leaderboard-video-view');
  if (!anchor) return;
  const card = document.createElement('section');
  card.className = 'lr-card'; card.id = 'all-condition-videos'; anchor.after(card);
  const add = (tag, text, parent = card) => {
    const e = document.createElement(tag); e.textContent = text; parent.append(e); return e;
  };
  add('h2', '모델 × Task × 상대 조건 · 성공/실패 영상');
  try {
    const response = await fetch('all-condition-videos.json');
    if (!response.ok) throw new Error('data');
    const data = await response.json();
    add('p', `검증 영상 ${data.available}/${data.selected}개 · ${data.updated_utc} 갱신`).className = 'lr-note';
    add('p', 'π0.5 20k · Oracle + S1 50k · VPP2 10,400. Fabrica를 포함한 11개 task입니다. 원 평가에서 성공/실패를 하나씩 선택해 저장된 행동을 재생했습니다. 실제 영상이 검증된 칸만 재생할 수 있습니다.').className = 'lr-note';
    add('p', '기존 평가의 Lift Pot은 구 성공 기준(v1)을 보존합니다. 새 시간 변화 평가는 v2를 사용하며, 두 기준의 성공률을 합산하지 않습니다.').className = 'lr-note';
    add('p', '새 4종은 task당 2개 seed의 소규모 파일럿입니다. Tempo Shift는 감속·가속, Start Offset은 지연·가능한 경우 앞당김을 확인하며, expert가 성공한 동일 조건에서 세 모델을 비교합니다. 기존 50회 평가와 표본 수를 구분해 읽어 주세요.').className = 'lr-note';
    const controls = add('div', ''); controls.style.cssText = 'display:flex;gap:16px;flex-wrap:wrap;margin:16px 0';
    function select(label, values) {
      const l = add('label', label + ' ', controls), s = add('select', '', l);
      s.setAttribute('aria-label', '전체 조건 영상 ' + label);
      for (const [key, text] of values) { const o = add('option', text, s); o.value = key; }
      return s;
    }
    const model = select('모델', Object.entries(data.models));
    const task = select('Task', Object.entries(data.tasks));
    const group = select('상대 조건', Object.entries(data.groups));
    const score = add('p', ''); score.className = 'lr-note';
    const panel = add('div', ''); panel.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px';
    const statusText = r => !r || ['planned', 'evaluating', 'awaiting_expert'].includes(r.status) ? '평가 준비/진행 중 · 아직 결과 없음' :
      r.status === 'no_outcome' ? `완료된 ${r.n}회 평가에 ${r.success ? '성공' : '실패'} 사례 없음` :
      r.status === 'ineligible' ? 'expert 검증에서 성립하지 않은 조건 · 모델 실패로 집계하지 않음' :
      r.status === 'unevaluated' ? '해당 조건 미평가' :
      r.status === 'replay_mismatch' ? '원 평가와 재생 불일치 · 영상 게시 제외' :
      r.status === 'render_error' ? '영상 생성 오류 · 확인 중' : '원본 기록 확보 · 영상 생성 중';
    function draw() {
      panel.querySelectorAll('video').forEach(v => v.pause()); panel.replaceChildren();
      const rows = data.clips.filter(r => r.model === model.value && r.task === task.value && r.group === group.value);
      const first = rows[0];
      const pilot = Object.keys(data.groups).indexOf(group.value) >= 6;
      score.textContent = first?.n ? `성공 ${first.correct}/${first.n}회 · SR ${(100 * first.correct / first.n).toFixed(1)}% · 사례 영상은 전체 평가 중 선택한 장면입니다.` : '새 조건은 동일 장면의 expert 유효성 확인 후 세 모델을 평가합니다. 성립하지 않는 조건은 따로 표시합니다.';
      if (pilot && first) { score.textContent += ` · expert 유효 ${first.expert_valid || 0}/${first.expert_checked || 0}조건 확인`; if (first.n) score.textContent += ` · 동일 장면 clean ${first.paired_clean_correct || 0}/${first.paired_clean_n || 0}회 성공`; }
      for (const success of [true, false]) {
        const r = rows.find(r => r.success === success), box = add('div', '', panel);
        add('h3', success ? '성공 사례' : '실패 사례', box);
        if (r?.status !== 'available') { add('p', statusText(r), box); continue; }
        const video = add('video', '', box); video.controls = true; video.preload = 'metadata'; video.src = r.url; video.style.width = '100%';
        add('p', `${r.key} · ${r.protocol} · ${(r.phys_steps / 250).toFixed(2)}초`, box).className = 'lr-note';
        const link = add('a', '영상 새 창으로 열기', box); link.href = r.url; link.target = '_blank'; link.rel = 'noopener';
        if (r.commands?.length) {
          const active = add('p', '', box); active.style.cssText = 'padding:10px;border:1px solid #90a4b8;border-radius:8px;overflow-wrap:anywhere';
          function update() { let c = r.commands[0]; for (const x of r.commands) { if (x.seconds > video.currentTime) break; c = x; } active.textContent = `Oracle · ${c.seconds.toFixed(2)}초부터 · ${c.stage}: ${c.text}`; }
          video.addEventListener('timeupdate', update); video.addEventListener('seeked', update); update();
          const details = add('details', '', box); add('summary', `Oracle 명령 이력 (${r.commands.length}구간)`, details);
          for (const c of r.commands) {
            const b = add('button', `${c.seconds.toFixed(2)}초 · ${c.stage}: ${c.text}`, details); b.type = 'button';
            b.style.cssText = 'display:block;text-align:left;white-space:normal;padding:8px;margin:4px 0;width:100%';
            b.onclick = () => { video.currentTime = c.seconds; update(); };
          }
        }
        add('p', '원 평가의 성공 여부와 종료 물리 시점 일치 · 모델 재추론 없음', box).className = 'lr-note';
      }
    }
    model.onchange = task.onchange = group.onchange = draw; draw();
    const details = add('details', ''); add('summary', '조건별 전체 영상 준비 현황', details);
    const wrap = add('div', '', details); wrap.style.overflowX = 'auto';
    const table = add('table', '', wrap); table.className = 'lr-table';
    const header = add('tr', '', add('thead', '', table));
    for (const label of ['모델', '조건', '게시', '영상 대상', '해당 결과 없음', '미평가/진행 중/미적용']) add('th', label, header);
    const body = add('tbody', '', table);
    for (const [m, name] of Object.entries(data.models)) for (const [g, condition] of Object.entries(data.groups)) {
      const rows = data.clips.filter(r => r.model === m && r.group === g);
      const tr = add('tr', '', body);
      const vals = [name, condition, rows.filter(r => r.status === 'available').length,
        rows.filter(r => r.key).length, rows.filter(r => r.status === 'no_outcome').length,
        rows.filter(r => ['planned', 'unevaluated', 'ineligible', 'evaluating', 'awaiting_expert'].includes(r.status)).length];
      for (const v of vals) add('td', String(v), tr);
    }
  } catch (error) { add('p', '영상 목록을 불러오지 못했습니다. 새로고침해 주세요.'); }
})();
