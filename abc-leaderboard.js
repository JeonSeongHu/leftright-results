// Add the frozen ABC comparison inside the existing results view; retain all prior data/media.
(async () => {
  const rootPanel = document.getElementById('abc-leaderboard');
  const button = document.querySelector('#new-pause [data-panel="abc"]');
  if (!rootPanel || !button || rootPanel.dataset.loaded) return;
  rootPanel.dataset.loaded = 'true';
  const historySection = document.createElement('details');
  const historyTitle = document.createElement('summary');
  historyTitle.textContent = '이전 결과 보존 · 2026-11-12 기존 표본 진단';
  historySection.append(historyTitle);
  const panel = document.createElement('div'); historySection.append(panel); rootPanel.append(historySection);
  const add = (tag, text, parent = panel) => {
    const node = document.createElement(tag); node.textContent = text; parent.append(node); return node;
  };
  const note = (text, parent = panel) => { const node = add('p', text, parent); node.className = 'lr-note'; return node; };
  const table = (parent, headings, caption) => {
    const wrap = add('div', '', parent); wrap.className = 'lr-scroll';
    const t = add('table', '', wrap); if (caption) add('caption', caption, t);
    const row = add('tr', '', add('thead', '', t));
    headings.forEach(([label, ood]) => { const cell = add('th', label, row); cell.scope = 'col'; if (ood) cell.className = 'pause-ood'; });
    return add('tbody', '', t);
  };
  const summary = (row, parent) => {
    if (!row || row.n == null) { add('span', '미평가', parent); return; }
    add('b', row.n > 0 ? `${(100 * row.correct / row.n).toFixed(2)}%` : '—', parent);
    add('span', `${row.correct}/${row.n}`, parent).className = 'source-note';
    if (row.pending > 0) add('span', `미실행 ${row.pending}건 · 계획 ${row.planned}건`, parent).className = 'source-note';
  };
  const stamp = text => text ? text.slice(0, 19).replace('T', ' ') + ' UTC' : '확인 시각 없음';
  const style = add('style', '');
  style.textContent = '#abc-leaderboard{scroll-margin-top:5rem;display:grid;gap:var(--cds-gap-md)} #abc-leaderboard .abc-section{display:grid;gap:var(--cds-gap-sm)} #abc-leaderboard .abc-status{border-left:3px solid var(--cds-chart-muted);padding:8px 12px;background:color-mix(in srgb,var(--cds-chart-muted) 8%,transparent)} #abc-leaderboard .abc-link{display:inline-block;width:fit-content} #abc-leaderboard progress{display:block;max-width:100%;width:130px;height:6px;margin-top:7px;accent-color:var(--cds-chart-muted)} #abc-leaderboard .abc-matrix th:first-child{min-width:115px} #abc-leaderboard .abc-matrix .matrix-cell{min-width:130px} #abc-leaderboard .abc-pending{color:var(--color-warn)} #abc-leaderboard .abc-selected{outline:2px solid var(--color-fg);outline-offset:-2px}';
  add('h3', 'ABC π0.5 · 진단 결과 (정식 비교 보류)');
  const deepLink = add('a', '이 리더보드 바로가기', panel); deepLink.href = '#abc-leaderboard'; deepLink.className = 'abc-link';

  function openFromHash() {
    if (location.hash !== '#abc-leaderboard') return;
    document.querySelector('.lr-tab[data-tab="partners"]')?.click();
    button.click();
    rootPanel.scrollIntoView({block: 'start'});
  }
  const nav = button.parentElement;
  nav.addEventListener('click', event => {
    const target = event.target.closest('[data-panel]'); if (!target) return;
    if (target.dataset.panel === 'abc') history.replaceState(null, '', '#abc-leaderboard');
    else if (location.hash === '#abc-leaderboard') history.replaceState(null, '', '#partners');
  });
  window.addEventListener('hashchange', openFromHash);
  deepLink.addEventListener('click', () => { if (location.hash === '#abc-leaderboard') openFromHash(); });
  openFromHash();

  try {
    const response = await fetch('abc-leaderboard-data.json', {cache: 'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const suites = Object.keys(data.suites);
    const totals = new Map(data.suite_aggregates.map(row => [row.suite, row]));
    const cells = new Map(data.cells.map(row => [[row.model_id, row.partner, row.task, row.suite].join('|'), row]));
    const status = note(`고정 25/50 배정 미충족 · 정식 비교 보류. 아래 B 20k ${data.overall.n.toLocaleString()}건은 기존 조건별 표본의 진단 결과입니다. 성공 ${data.overall.correct}건 · 실패 ${data.policy_failure_count}건을 모두 포함했습니다.`);
    status.classList.add('abc-status');
    note(`고정 배정 명단 ${data.canonical_coverage.canonical_individual_cases.toLocaleString()}건 중 현재 결과와 조건·seed가 일치하는 표본은 ${data.canonical_coverage.canonical_roster_matches.toLocaleString()}건입니다. 명단 미실행 ${data.canonical_coverage.canonical_missing}건과 조건 배정 밖 추가 진단 ${data.canonical_coverage.current_extra_outside_canonical_condition_roster}건을 구분합니다. 이 일치 수는 source·설정의 최종 재사용 검증 수와 다릅니다.`);
    note(`파트너 A · ${data.partner_label}. 조건별 seed 구성이 다른 기존 표본이며 정식 고정 배정 비교가 아닙니다. 평가 ${stamp(data.evaluation_updated_utc)} · 학습 진행 ${stamp(data.training_counters_updated_utc)}.`);

    const tiles = add('div', ''); tiles.className = 'lr-tiles';
    for (const [label, row, emphasized] of [
      ['B · 기존 표본 진단 SR (micro)', data.overall, false],
      ['B · Pause-OOD · 8/16초', totals.get('P1-OOD'), true],
    ]) {
      const card = add('div', '', tiles); card.className = 'lr-tile' + (emphasized ? ' pause-ood' : '');
      add('span', label, card).className = 'lr-label';
      add('span', `${row.sr_pct.toFixed(2)}%`, card).className = 'lr-num';
      add('span', `${row.correct.toLocaleString()}/${row.n.toLocaleString()} 성공`, card).className = 'lr-sub';
    }
    const pendingTile = add('div', '', tiles); pendingTile.className = 'lr-tile';
    add('span', '정식 비교 상태', pendingTile).className = 'lr-label';
    add('span', '고정 배정 미충족', pendingTile).className = 'lr-num';
    add('span', 'P0 각 50 · 개별 정지/속도 각 25건 기준', pendingTile).className = 'lr-sub';

    const board = add('section', ''); board.className = 'abc-section';
    add('h3', '1. ABC 모델 비교 · 진단', board);
    const body = table(board, [['모델'], ['학습 update'], ['체크포인트'], ...suites.map(s => [data.suites[s], s === 'P1-OOD']), ['전체 · micro'], ['상태']], 'ABC π0.5 · Partner A · 목표 20,000 update');
    for (const model of data.models) {
      const tr = add('tr', '', body); tr.dataset.modelId = model.id;
      add('th', `π0.5 ${model.training_dataset}`, tr).scope = 'row';
      const train = add('td', '', tr);
      add('span', `${model.training.optimizer_update.toLocaleString()}/${model.training.target.toLocaleString()}`, train);
      const progress = add('progress', '', train); progress.max = model.training.target; progress.value = model.training.optimizer_update;
      progress.setAttribute('aria-label', `${model.training_dataset} 학습 update`);
      add('span', model.training.status === 'completed' ? '학습 완료' : '학습 중 · 스냅샷', train).className = 'source-note';
      const checkpoint = add('td', model.checkpoint ? '20k' : '미완료', tr);
      if (model.checkpoint) checkpoint.title = model.checkpoint;
      for (const suite of suites) {
        const td = add('td', '', tr); if (suite === 'P1-OOD') td.className = 'pause-ood';
        summary(model.training_dataset === 'B' ? totals.get(suite) : null, td);
      }
      summary(model.evaluation, add('td', '', tr));
      add('td', model.training_dataset === 'B' ? '기존 표본 진단 · 정식 비교 보류' : '학습 중 · 평가 미시작', tr);
    }
    note('각 SR은 현재 진단 표본의 성공 수 ÷ 실제 평가 수(micro)입니다. 정식 기준은 task마다 P0 50건, 1·2·8·16초와 0.5·1.5× 각각 25건입니다. 현재 값은 이 고정 quota와 seed 배정을 충족하지 않으므로 정식 SR·순위로 확정하지 않습니다. A·C는 미평가입니다.', board);

    const breakdown = add('section', ''); breakdown.className = 'abc-section';
    add('h3', '2. B 20k · task × 조건 · 기존 표본 진단', breakdown);
    note('조건 셀을 누르면 1초·2초, 8초·16초의 개별 집계를 볼 수 있습니다. 이번 평가는 영상을 저장하지 않았습니다.', breakdown);
    const matrix = table(breakdown, [['Task'], ...suites.map(s => [data.suites[s], s === 'P1-OOD'])], '같은 체크포인트 · Partner A · 조건별 기존 표본 (고정 배정 비교 아님)');
    matrix.closest('table').className = 'abc-matrix';
    const detail = add('section', ''); detail.className = 'abc-section'; detail.id = 'abc-condition-detail';
    let selectedButton = null;
    function drawDetail(task, suite, selected) {
      if (selectedButton) selectedButton.classList.remove('abc-selected');
      selectedButton = selected; selectedButton.classList.add('abc-selected');
      matrix.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === selected)));
      detail.replaceChildren();
      add('h3', `B 20k · ${data.tasks[task]} · ${data.suites[suite]}`, detail);
      const rows = data.condition_cells.filter(row => row.task === task && row.suite === suite && row.partner === 'A' && row.model_id === 'pi05-abc-B-20k');
      const t = table(detail, [['개별 조건'], ['SR'], ['평가 완료'], ['전체 계획'], ['상태']]);
      const labels = {Demo: 'P0', Pause1: 'Pause · 1초', Pause2: 'Pause · 2초', Pause8: 'Pause · 8초', Pause16: 'Pause · 16초', 'Speed0.5': 'Speed 0.5×', 'Speed1.5': 'Speed 1.5×'};
      for (const row of rows) {
        const tr = add('tr', '', t); add('th', labels[row.condition] || row.condition, tr).scope = 'row';
        summary(row, add('td', '', tr)); add('td', String(row.n), tr); add('td', String(row.planned), tr);
        add('td', row.pending ? `미실행 ${row.pending}건` : '평가 완료', tr);
      }
      note('이번 평가 영상 미저장 · 기존 영상은 이 ABC B 20k 평가의 영상으로 연결하지 않습니다.', detail);
    }
    for (const [task, label] of Object.entries(data.tasks)) {
      const tr = add('tr', '', matrix); tr.dataset.task = task;
      add('th', label, tr).scope = 'row';
      for (const suite of suites) {
        const row = cells.get(['pi05-abc-B-20k', 'A', task, suite].join('|'));
        const td = add('td', '', tr); if (suite === 'P1-OOD') td.className = 'pause-ood';
        const cell = add('button', '', td); cell.type = 'button'; cell.className = 'matrix-cell';
        cell.dataset.task = task; cell.dataset.suite = suite; cell.setAttribute('aria-pressed', 'false');
        cell.setAttribute('aria-label', `B 20k · ${label} · ${data.suites[suite]} · 개별 조건 집계`);
        summary(row, cell); cell.addEventListener('click', () => drawDetail(task, suite, cell));
      }
    }
    drawDetail('hanging_mug', 'P1-speed0.5', matrix.querySelector('button[data-task="hanging_mug"][data-suite="P1-speed0.5"]'));

    const refs = add('details', ''); add('summary', '전문가 baseline 실패 4건 · 정책 평가에 포함', refs);
    note('Mug의 Speed 0.5× 1건, Speed 1.5× 3건입니다. 전문가 baseline도 실패했지만 B 정책을 네 건 모두 실제 실행했습니다. 네 정책 실패는 위 진단 SR에 포함되어 있으며 제외하거나 미실행으로 처리하지 않았습니다.', refs);
    const refTable = table(refs, [['Task'], ['조건'], ['Scene seed'], ['전문가 baseline'], ['B 정책']]);
    for (const row of data.expert_baseline_failures) {
      const tr = add('tr', '', refTable); [data.tasks[row.task], row.condition, String(row.scene_seed), row.expert_reference_baseline_success ? '성공' : '실패', row.policy_success ? '성공' : '실패'].forEach(text => add('td', text, tr));
    }
    const protocol = add('details', ''); add('summary', '평가 버전·체크포인트·집계 기준', protocol);
    note(`공통 버전: ${data.common_version}`, protocol);
    note(`평가 범위: ${data.evaluation_profile} · 정식 고정 배정 미충족`, protocol);
    note('B 체크포인트: step_020000 · B 학습 분포: 기존 위치 분포의 1초·2초 정지 · Partner A만 평가', protocol);
    note(`텍스트 ${data.source_profiles.text} · Fabrica ${data.source_profiles.fabrica_assets} / ${data.source_profiles.fabrica_left}`, protocol);
    note('현재 ABC 목표·물리 설정의 진단 결과입니다. 조건마다 다른 legacy seed 배정을 이어받았으므로 원 full50 고정 25/50 배정을 다시 확인하고 있습니다. 기존 리더보드·Role 결과와 합산하지 않습니다.', protocol);
    const download = add('a', 'ABC 집계 JSON 다운로드', protocol); download.href = 'abc-leaderboard-data.json'; download.download = 'abc-leaderboard-data.json';
    if (location.hash === '#abc-leaderboard') rootPanel.scrollIntoView({block: 'start'});
  } catch (error) {
    note('ABC 리더보드 데이터를 불러오지 못했습니다. 페이지를 새로고침해 주세요.');
    console.error('ABC leaderboard', error);
  }
})();
