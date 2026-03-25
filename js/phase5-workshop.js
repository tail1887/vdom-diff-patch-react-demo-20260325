/**
 * phase5-workshop.js — 5단계: 실제 영역 / 테스트 영역 / Patch · 히스토리
 *
 * 의존: vdom.js, diff.js, patch.js, phase1-demo.js (전역 cloneVNodeStripIds, vnodeDeepClone)
 *
 * 흐름 (과제 요구와 동일)
 * - 초기: 1단계 샘플과 같은 모양의 VNode(id 제거 복제로 전역 id 충돌 방지)를 실제·테스트에 맞춤.
 * - 테스트 영역: HTML 문자열(textarea) 편집.
 * - Patch: 직전 히스토리 커밋 VNode vs 테스트에서 파싱한 VNode → diff → 실제 영역 DOM 에만 applyPatches → 히스토리 push.
 * - 뒤로/앞으로: VNode 스냅샷으로 실제 영역 + textarea 동시 복원.
 */

(function () {
  // ===== DOM 핸들 캐시 =====
  // - 한 번만 query 해서 이후 핸들 재사용.
  // - id 네이밍은 index.html 의 phase-5 규칙과 1:1 매칭된다.
  var realMount = document.getElementById('container-phase-5-real-mount');
  var testTa = document.getElementById('control-phase-5-test-html');
  var btnPatch = document.getElementById('control-phase-5-patch');
  var btnBack = document.getElementById('control-phase-5-back');
  var btnFwd = document.getElementById('control-phase-5-forward');
  var statusEl = document.getElementById('output-phase-5-status');
  var sample = document.getElementById('container-phase-1-sample');

  // 필수 노드가 없으면 조용히 종료 (다른 페이지에서 이 파일이 로드될 가능성 대비)
  if (!realMount || !testTa || !sample) return;

  /** 단일 루트 요소만 허용 */
  function htmlStringToRootVNode(html) {
    var wrap = document.createElement('div');
    var t = (html || '').trim();
    if (!t) return null;
    // 브라우저 파서를 그대로 활용해 HTML 문자열을 DOM 으로 만든 뒤 VNode 로 변환.
    wrap.innerHTML = t;
    var el = wrap.firstElementChild;
    // 학습용 단순화를 위해 "단일 루트"만 허용.
    // 멀티 루트 지원을 하려면 fragment 스키마/patch 전략을 함께 확장해야 한다.
    if (!el || wrap.children.length !== 1) return null;
    return domToVNode(el);
  }

  // ===== State History =====
  // history: 커밋된 VNode 스냅샷 배열
  // historyIndex: 현재 가리키는 커밋 위치 (undo/redo 커서 역할)
  var history = [];
  var historyIndex = 0;

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg || '';
  }

  function syncUIFromHistory() {
    var snap = history[historyIndex];
    if (!snap) return;
    // 실제 영역은 스냅샷으로 "렌더링"해서 즉시 복원.
    renderVNodeInto(realMount, vnodeDeepClone(snap));
    // 테스트 textarea 는 같은 스냅샷을 HTML 문자열로 직렬화해 동기화.
    testTa.value = vnodeToHTMLString(snap);
    setStatus(
      '히스토리 ' + (historyIndex + 1) + '/' + history.length + ' — Patch 로 커밋하거나 뒤로/앞으로 이동하세요.'
    );
    updateNavButtons();
  }

  function updateNavButtons() {
    // undo 가능 여부 / redo 가능 여부를 커서 위치로 계산.
    if (btnBack) btnBack.disabled = historyIndex <= 0;
    if (btnFwd) btnFwd.disabled = historyIndex >= history.length - 1;
  }

  function initWorkshop() {
    if (typeof domToVNode !== 'function' || typeof cloneVNodeStripIds !== 'function') {
      setStatus('vdom / phase1-demo 로드 필요');
      return;
    }
    // 1단계 샘플을 시작점으로 사용하되, 문서 내 중복 id 충돌을 피하려고 id 제거 복제본을 채택.
    var v0 = cloneVNodeStripIds(domToVNode(sample));
    // 스냅샷은 항상 deep clone 으로 보관해, 이후 연산 중 참조 공유 부작용을 막는다.
    history = [vnodeDeepClone(v0)];
    historyIndex = 0;
    syncUIFromHistory();
  }

  function onPatch() {
    if (typeof diffVNode !== 'function' || typeof applyPatches !== 'function') {
      setStatus('diff.js / patch.js 필요');
      return;
    }
    // 기준점: "현재 커밋된 스냅샷"
    var committed = history[historyIndex];
    // 사용자가 textarea 에 입력한 현재 HTML 을 다음 스냅샷 후보로 변환.
    var testVNode = htmlStringToRootVNode(testTa.value);
    if (!testVNode) {
      setStatus('테스트 HTML 을 파싱할 수 없습니다. 단일 루트 요소(div 등)만 입력하세요.');
      return;
    }
    // committed -> testVNode 차이를 계산해 최소 연산 목록 생성.
    var patches = diffVNode(committed, testVNode);
    var realRoot = realMount.firstElementChild;
    if (!realRoot) {
      setStatus('실제 영역 루트 없음 — 페이지 새로고침');
      return;
    }
    // 실제 영역에만 patch 적용 (테스트 textarea 는 사용자가 직접 편집한 원본 유지)
    var newRoot = applyPatches(realRoot, patches);
    // 루트 교체가 발생한 경우 마운트 하위 루트 참조를 최신화.
    if (newRoot && newRoot !== realRoot && realMount.firstElementChild !== newRoot) {
      realMount.replaceChildren(newRoot);
    }
    // undo/redo 표준 동작: 현재 인덱스 뒤의 "미래 히스토리"는 잘라낸 뒤 새 커밋 추가.
    history = history.slice(0, historyIndex + 1);
    history.push(vnodeDeepClone(testVNode));
    historyIndex = history.length - 1;
    // 표면상 HTML도 커밋본 기준으로 정규화(브라우저 직렬화 스타일 반영)
    testTa.value = vnodeToHTMLString(testVNode);
    setStatus(
      'Patch 완료 — 패치 ' +
        patches.length +
        '개 적용(실제 영역). 히스토리 ' +
        history.length +
        ' 커밋.'
    );
    updateNavButtons();
  }

  function onBack() {
    // undo
    if (historyIndex <= 0) return;
    historyIndex--;
    syncUIFromHistory();
  }

  function onForward() {
    // redo
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    syncUIFromHistory();
  }

  // 버튼 이벤트 연결
  if (btnPatch) btnPatch.addEventListener('click', onPatch);
  if (btnBack) btnBack.addEventListener('click', onBack);
  if (btnFwd) btnFwd.addEventListener('click', onForward);

  // 페이지 진입 시 최초 스냅샷 로드
  initWorkshop();
})();
