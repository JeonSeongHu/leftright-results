/* Collection diagnostics only. Existing leaderboard data and handlers stay intact. */
(async () => {
  const anchor = document.querySelector('.lr-head');
  if (!anchor || document.getElementById('abc-collection-diagnosis')) return;
  const panel = document.createElement('details');
  panel.id = 'abc-collection-diagnosis';
  panel.className = 'lr-card';
  const summary = document.createElement('summary');
  summary.textContent = 'ABC 수집 오류 진단';
  summary.style.cursor = 'pointer';
  summary.style.fontWeight = '600';
  panel.append(summary);
  const note = document.createElement('p');
  note.className = 'lr-note';
  note.textContent = '전문가 데이터 수집 과정의 물리 엔진과 export 오류를 확인한 기록입니다. 학습 모델의 성공률에 합산하지 않습니다.';
  panel.append(note);
  anchor.after(panel);
  try {
    const response = await fetch('abc-collection-diagnosis.json');
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();
    const cause = document.createElement('p');
    cause.className = 'lr-note';
    cause.textContent = data.engine_explanation;
    panel.append(cause);
    const grid = document.createElement('div');
    grid.className = 'lr-grid2';
    for (const clip of data.clips) {
      const card = document.createElement('article');
      card.className = 'lr-player';
      const title = document.createElement('h3');
      title.textContent = clip.title;
      const video = document.createElement('video');
      video.controls = true;
      video.preload = 'none';
      video.playsInline = true;
      video.poster = clip.poster;
      video.src = clip.video;
      video.setAttribute('aria-label', clip.title);
      const text = document.createElement('p');
      text.className = 'lr-note';
      text.textContent = clip.description;
      card.append(title, video, text);
      grid.append(card);
    }
    panel.append(grid);
    for (const line of data.notes || []) {
      const text = document.createElement('p');
      text.className = 'lr-note';
      text.textContent = line;
      panel.append(text);
    }
  } catch (error) {
    const text = document.createElement('p');
    text.className = 'lr-note';
    text.textContent = '진단 영상 목록을 불러오지 못했습니다. 페이지를 새로고침해 주세요.';
    panel.append(text);
  }
})();
