# VDOM · Diff · Patch 데모 (React 폴더 워크숍)

이 저장소는 **브라우저 DOM**을 **VNode(순수 데이터 트리)**로 변환하고, 두 VNode의 차이를 **diff**로 계산한 뒤, 그 결과를 **patch**로 실제 DOM에 반영하는 흐름을 데모/과제 형태로 구현한 프로젝트입니다.

특히 다음을 웹페이지에서 직접 확인할 수 있습니다.
- DOM → VNode 변환 (`js/vdom.js`)
- VNode → DOM 렌더링 (`js/vdom.js`)
- VNode 트리 비교(diff) → patches 계산 (`js/diff.js`)
- patches 실행으로 실제 DOM 반영 (`js/patch.js`)
- 실제/테스트 영역 분리 + Patch/히스토리 되돌리기(`phase5`)
- 웹페이지 내 단위테스트 PASS/FAIL 표시(`phase6`)

---

## 빠른 시작

1. 이 폴더에서 `index.html`(Week 3) 또는 `week4.html`(Week 4)을 브라우저로 실행합니다.
2. 상단 메뉴로 두 페이지를 오갈 수 있습니다.
3. Week 3는 단계별 UI를 순서대로, Week 4는 미니 React 데모·테스트만 확인하면 됩니다.

권장 사용:
- 개발자 도구(F12)에서 `Elements` 탭으로 DOM 변경을 확인
- 4단계는 Shadow DOM 내부를 확인해야 할 수 있습니다.

---

## 폴더/파일 구성

- `index.html`: Week 3 — 1~6단계 데모/워크숍 UI
- `week4.html`: Week 4 — 미니 React 데모·단위테스트 전용
- `css/base.css`: 데모 레이아웃/스타일
- `js/vdom.js`: `domToVNode`, `vnodeToDom`, `renderVNodeInto`, `vnodeToHTMLString`
- `js/diff.js`: `diffVNode`(patches 계산)
- `js/patch.js`: `applyPatches`, `applyOnePatch`(DOM에 실행)
- `js/phase1-demo.js`: 1~4단계 데모 UI 연동
- `js/phase5-workshop.js`: 5단계 통합 워크숍(실제/테스트 + 히스토리)
- `js/unit-tests.js`: 6단계 브라우저 내 단위테스트 러너
- `js/mini-react.js`: Week 4 — `FunctionComponent`, `useState` / `useEffect` / `useMemo`, `h` / `hText`
- `js/week4-demo.js`: Week 4 미니 React 데모(`week4.html`)
- `js/week4-unit-tests.js`: Week 4 단위테스트(`week4.html`)

문서(주차별): [`docs/README.md`](docs/README.md)
- Week 3 (VDOM·Diff·Patch): [`docs/week03-vdom/`](docs/week03-vdom/) — 요구사항, 구현 단계, 학습·발표 대본
- Week 4 (컴포넌트·훅): [`docs/week04-mini-react/`](docs/week04-mini-react/) — [`requirements.md`](docs/week04-mini-react/requirements.md), [`implementation-phases.md`](docs/week04-mini-react/implementation-phases.md)

---

## 단계별 사용법 요약

### 1단계: DOM → VNode
- `container-phase-1-sample`의 HTML을 읽어 VNode JSON으로 변환 결과를 확인합니다.

### 2단계: VNode → DOM
- 1단계 VNode를 `container-phase-2-mount`에 렌더링합니다.

### 3단계: Diff
- `control-phase-3-scenario`로 비교 시나리오를 바꾸고, `output-phase-3-vnode-old` / `output-phase-3-vnode-new`에 diff에 들어가는 두 스냅샷을, `output-phase-3-patches`에 patches 결과를 확인합니다.

### 4단계: Patch
- 왼쪽은 Shadow DOM 호스트(`container-phase-4-mount`) 시각 영역, 오른쪽은 Shadow 안 루트의 `outerHTML`(`output-phase-4-shadow-html`)으로 id 제거 등을 **문자열에서** 바로 비교합니다.

### 5단계: 통합 워크숍(실제/테스트 + 히스토리)
- 왼쪽(`container-phase-5-real-mount`): 실제 영역은 **Patch만**으로 갱신
- 오른쪽(`control-phase-5-test-html`): textarea HTML은 자유롭게 수정
- 버튼:
  - `Patch`: textarea 상태를 VNode로 만들고 diff → patch로 실제 영역 갱신 + 히스토리 커밋
  - `뒤로`/`앞으로`: VNode 히스토리 스냅샷으로 실제/textarea를 함께 복원

### 6단계: 단위테스트
- 페이지 로드 시 자동 실행되며 PASS/FAIL과 로그가 표시됩니다.
- `테스트 실행` 버튼으로 재실행할 수 있습니다.

### Week 4 페이지 (`week4.html`)
- 상단 메뉴 **Week 4 · 미니 React** 또는 `week4.html`을 직접 엽니다.
- **1~5단계** 데모(마운트 → useState → useMemo → useEffect → 무상태 자식)를 순서대로 두고, 하단에 **Week4 테스트 실행**이 있습니다.

---

## 동작/학습 포인트(한 줄)

diff는 **“변경 계산기”**이고, patch는 **“실제 DOM 실행기”**입니다.

---

## 알려진 한계(학습 범위)

- 리스트 key 기반 최적화(삽입 위치 재사용)는 범위 밖이며, 자식 길이가 다르면 `REPLACE_CHILDREN`로 단순화합니다.
- 이벤트 리스너/복잡한 프로퍼티 바인딩은 처리하지 않고 `setAttribute` 중심의 단순 props 반영만 사용합니다.

