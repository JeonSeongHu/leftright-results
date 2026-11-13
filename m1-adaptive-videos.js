// Saved-action replays from the fixed subset550. Keep the existing six tabs and galleries.
(async () => {
  const host = document.getElementById('abc-leaderboard');
  if (!host) return;
  const root = document.createElement('section');
  root.id = 'm1-adaptive-videos';
  host.prepend(root);
  const add = (tag, text, parent = root) => {
    const node = document.createElement(tag); node.textContent = text; parent.append(node); return node;
  };
  const style = add('style', '');
  style.textContent = `
    #m1-adaptive-videos{display:grid;gap:16px;scroll-margin-top:24px}
    #m1-adaptive-videos .m1-controls{display:flex;gap:12px;flex-wrap:wrap}
    #m1-adaptive-videos label{display:grid;gap:5px;font-size:.9rem}
    #m1-adaptive-videos select{font:inherit;padding:8px;max-width:100%}
    #m1-adaptive-videos .m1-clips{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:16px}
    #m1-adaptive-videos article{border:1px solid var(--color-border-line,#ddd);border-radius:8px;padding:16px;min-width:0}
    #m1-adaptive-videos video{display:block;width:100%;max-height:500px;background:#111;border-radius:4px}
    #m1-adaptive-videos .m1-track{position:relative;height:32px;margin-top:12px;background:#e5e7eb;border-radius:4px;cursor:crosshair;overflow:hidden;touch-action:none}
    #m1-adaptive-videos .m1-track:focus-visible{outline:2px solid currentColor;outline-offset:3px}
    #m1-adaptive-videos .m1-segment{position:absolute;top:0;height:100%;min-width:1px}
    #m1-adaptive-videos .m1-cursor{position:absolute;top:0;bottom:0;width:2px;background:#111;box-shadow:0 0 0 1px #fff;pointer-events:none;z-index:2}
    #m1-adaptive-videos .m1-legend{display:flex;gap:16px;align-items:center;flex-wrap:wrap;font-size:.85rem;margin:8px 0}
    #m1-adaptive-videos .m1-swatch{display:inline-block;width:12px;height:12px;border-radius:2px;margin-right:5px}
    #m1-adaptive-videos .m1-readout{font-variant-numeric:tabular-nums;font-size:.9rem;margin:6px 0;min-height:1.5em}
    #m1-adaptive-videos .m1-links{display:flex;gap:16px;flex-wrap:wrap;font-size:.85rem}
    #m1-adaptive-videos .m1-note{font-size:.85rem;color:var(--color-fg-muted,#555);line-height:1.6}
    #m1-adaptive-videos .m1-empty{padding:24px 0;color:var(--color-fg-muted,#555)}
    #m1-adaptive-videos .m1-counts{font-variant-numeric:tabular-nums}
  `;
  add('h3', 'M1 10k adaptive 영상과 K4/K32 실행 구간');
  const summary = add('p', '영상 목록을 불러오는 중입니다.'); summary.className = 'm1-note m1-counts';
  const controls = add('div', ''); controls.className = 'm1-controls';
  const grid = add('div', ''); grid.className = 'm1-clips';
  const note = add('p', '같은 subset550의 저장 행동을 재생한 대표 영상입니다. 원 평가 SR은 145/550이며, 대표 영상의 성공 비율을 전체 SR로 사용하지 않습니다.'); note.className = 'm1-note';
  const downloads = add('div', ''); downloads.className = 'm1-links';
  const manifestLink = add('a', '영상 목록과 결과 JSON', downloads);
  manifestLink.href = 'm1-adaptive-videos.json'; manifestLink.download = 'm1-adaptive-subset550-videos.json';
  const choose = (label, id, options) => {
    const wrap = add('label', label, controls), select = add('select', '', wrap); select.id = id;
    for (const [value, text] of options) { const option = add('option', text, select); option.value = value; }
    return select;
  };
  let request, players = [];
  try {
    const response = await fetch('m1-adaptive-videos.json', {cache: 'no-store'});
    if (!response.ok) throw new Error(`목록 HTTP ${response.status}`);
    const data = await response.json();
    if (data.evaluation?.manifest_sha256 !== 'af9601a0eb612e1a550b4fed604af7c76e5461afd076dad8d0b0a63b8f433e55') throw new Error('subset550 manifest가 일치하지 않습니다.');
    const ready = (data.clips || []).filter(clip => clip.status === 'ready' && clip.verified === true && clip.video_url && clip.timeline_url);
    const first = ready[0];
    const model = choose('모델과 평가 범위', 'm1-video-model', [['M1Adaptive10kSubset', 'M1 10k adaptive / H32, K4/32 / subset550']]);
    const task = choose('Task', 'm1-video-task', data.tasks.map(item => [item.id, item.label]));
    const suite = choose('Suite', 'm1-video-suite', data.suites.map(item => [item.id, item.label]));
    const outcome = choose('결과', 'm1-video-outcome', [['all', '성공과 실패'], ['success', '성공'], ['failure', '실패']]);
    if (first) { task.value = first.task; suite.value = first.suite; }
    const selectedCount = data.selection.selected_clips;
    summary.textContent = `평가 145/550 (26.36%). 대표 영상 ${ready.length}/${selectedCount ?? data.selection.eligible_slots}개 게시. 결과가 존재하는 조합 ${data.selection.eligible_slots}/110개, 사례가 없는 조합 ${data.selection.absent_slots}개. 목록 갱신 ${data.updated_utc.slice(0, 19).replace('T', ' ')} UTC.`;

    async function timeline(video, clip, card, signal) {
      const response = await fetch(clip.timeline_url, {cache: 'no-store', signal});
      if (!response.ok) throw new Error(`타임라인 HTTP ${response.status}`);
      const trace = await response.json();
      const segments = trace.segments || [];
      if (!segments.length || segments.some(segment => ![4, 32].includes(segment.K_exec))) throw new Error('유효한 K4/K32 실행 기록이 없습니다.');
      const frameTicks = trace.video_frame_ticks;
      const fps = Number(trace.fps || trace.video_fps || clip.fps);
      const physicsHz = Number(trace.physics_hz || 250);
      if (!Array.isArray(frameTicks) || !frameTicks.length || !(fps > 0)) throw new Error('실제 영상 frame tick 기록이 없습니다.');
      const duration = frameTicks.length / fps;
      const frameAtTick = tick => {
        let left = 0, right = frameTicks.length;
        while (left < right) { const middle = (left + right) >>> 1; if (frameTicks[middle] < tick) left = middle + 1; else right = middle; }
        return left;
      };
      const tickAtTime = seconds => frameTicks[Math.min(frameTicks.length - 1, Math.max(0, Math.floor(seconds * fps)))];
      const passive = trace.passive_intervals || [];
      const intervalAt = (intervals, tick) => intervals.find(interval => tick >= interval.start_tick && tick < interval.end_tick);
      const legend = add('div', '', card); legend.className = 'm1-legend';
      for (const [label, color] of [['K4', '#22c7b8'], ['K32', '#f59e0b']]) {
        const item = add('span', '', legend), swatch = add('i', '', item); swatch.className = 'm1-swatch'; swatch.style.background = color; item.append(label);
      }
      add('span', '저장된 실행 K, 1배속 simulation time', legend);
      if (passive.length) { const item = add('span', '', legend), swatch = add('i', '', item); swatch.className = 'm1-swatch'; swatch.style.background = '#9ca3af'; item.append('수동 settle'); }
      const track = add('div', '', card); track.className = 'm1-track'; track.tabIndex = 0;
      track.setAttribute('role', 'slider'); track.setAttribute('aria-label', 'K4/K32 실행 구간, 클릭하거나 방향키로 영상 이동');
      track.setAttribute('aria-valuemin', '0'); track.setAttribute('aria-valuemax', String(duration));
      for (const segment of [...segments, ...passive]) {
        const bar = add('span', '', track); bar.className = 'm1-segment';
        const start = frameAtTick(segment.start_tick) / fps, end = frameAtTick(segment.end_tick) / fps;
        bar.style.left = `${100 * start / duration}%`; bar.style.width = `${100 * (end - start) / duration}%`;
        bar.style.background = segment.K_exec === 4 ? '#22c7b8' : segment.K_exec === 32 ? '#f59e0b' : '#9ca3af';
        bar.title = `${segment.K_exec ? `K${segment.K_exec}` : '수동 settle'}, source ${(segment.start_tick / physicsHz).toFixed(2)}–${(segment.end_tick / physicsHz).toFixed(2)}초`;
      }
      const cursor = add('span', '', track); cursor.className = 'm1-cursor';
      const readout = add('p', '', card); readout.className = 'm1-readout';
      const hover = add('p', '구간에 마우스를 올려 시각과 K를 확인하고, 클릭하면 그 시각으로 이동합니다.', card); hover.className = 'm1-note';
      const update = () => {
        const seconds = Math.max(0, Math.min(duration, video.currentTime || 0)), tick = tickAtTime(seconds), active = intervalAt(segments, tick);
        cursor.style.left = `${100 * seconds / duration}%`; track.setAttribute('aria-valuenow', seconds.toFixed(2));
        readout.textContent = `영상 ${seconds.toFixed(2)} / ${duration.toFixed(2)}초 | source ${(tick / physicsHz).toFixed(3)}초 | 현재 ${active ? `K${active.K_exec}` : intervalAt(passive, tick) ? '수동 settle' : '실행 구간 밖'}`;
      };
      const timeAt = event => Math.max(0, Math.min(duration, (event.clientX - track.getBoundingClientRect().left) / track.clientWidth * duration));
      track.addEventListener('pointermove', event => { const seconds = timeAt(event), tick = tickAtTime(seconds), active = intervalAt(segments, tick); hover.textContent = `영상 ${seconds.toFixed(2)}초, source ${(tick / physicsHz).toFixed(3)}초, ${active ? `K${active.K_exec}, query ${active.query_index}` : intervalAt(passive, tick) ? '수동 settle' : '실행 기록이 없는 구간'}`; });
      track.addEventListener('click', event => { video.currentTime = Math.min(frameAtTick(tickAtTime(timeAt(event))) / fps, (frameTicks.length - 1) / fps); update(); });
      track.addEventListener('keydown', event => {
        const steps = {ArrowLeft: -0.5, ArrowRight: 0.5, Home: -duration, End: duration};
        if (!(event.key in steps)) return;
        event.preventDefault(); video.currentTime = Math.max(0, Math.min(duration, video.currentTime + steps[event.key])); update();
      });
      for (const event of ['timeupdate', 'seeking', 'loadedmetadata', 'pause']) video.addEventListener(event, update);
      const frame = () => { if (!video.paused && video.isConnected) { update(); requestAnimationFrame(frame); } };
      video.addEventListener('play', frame); update();
    }

    async function draw() {
      request?.abort(); request = new AbortController();
      for (const player of players) { player.pause(); player.removeAttribute('src'); player.load(); }
      players = []; grid.replaceChildren();
      const row = data.task_breakdown[task.value][suite.value];
      const outcomes = outcome.value === 'all' ? [true, false] : [outcome.value === 'success'];
      for (const success of outcomes) {
        const count = success ? row.correct : row.completed - row.correct;
        const card = add('article', '', grid);
        add('h4', `${data.tasks.find(item => item.id === task.value).label} / ${data.suites.find(item => item.id === suite.value).label} / ${success ? '성공' : '실패'}`, card);
        const counts = add('p', `같은 subset의 ${success ? '성공' : '실패'} ${count}/${row.completed}건`, card); counts.className = 'm1-note';
        if (!count) { add('p', `이 subset에 ${success ? '성공' : '실패'} 사례가 없습니다.`, card).className = 'm1-empty'; continue; }
        const clip = ready.find(item => item.task === task.value && item.suite === suite.value && item.success === success);
        if (!clip) { add('p', '원 평가 결과는 있으며, 대표 영상은 준비 중입니다.', card).className = 'm1-empty'; continue; }
        const video = add('video', '', card); video.controls = true; video.preload = 'metadata'; video.playsInline = true; video.src = clip.video_url;
        if (clip.poster_url) video.poster = clip.poster_url;
        players.push(video);
        const caption = add('p', `${clip.condition}, seed ${clip.scene_seed}. 저장 행동 재생, 새 정책 추론 없음.`, card); caption.className = 'm1-note';
        try { await timeline(video, clip, card, request.signal); } catch (error) { if (error.name !== 'AbortError') add('p', `타임라인 확인 필요: ${error.message}`, card); }
        const links = add('div', '', card); links.className = 'm1-links';
        for (const [label, url] of [['영상 다운로드', clip.video_url], ['타임라인 JSON', clip.timeline_url]]) {
          const link = add('a', label, links); link.href = url; link.download = url.split('/').pop();
        }
      }
    }
    for (const select of [model, task, suite, outcome]) select.addEventListener('change', draw);
    draw();
    function openHash() {
      if (location.hash !== '#m1-adaptive-videos') return;
      document.querySelector('.lr-tab[data-tab="partners"]')?.click();
      document.querySelector('#new-pause [data-panel="abc"]')?.click();
      history.replaceState(null, '', '#m1-adaptive-videos');
      requestAnimationFrame(() => root.scrollIntoView({block: 'start'}));
    }
    window.addEventListener('hashchange', openHash); openHash();
  } catch (error) {
    summary.textContent = `영상 목록 확인 필요: ${error.message}`;
  }
})();
