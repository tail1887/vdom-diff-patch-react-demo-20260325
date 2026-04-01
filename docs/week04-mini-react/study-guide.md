# Week 4 공부 가이드 — Week 3 다음에 오는 이유와 개념

Week 3(VDOM · Diff · Patch)과 Week 4(미니 React)를 **한 줄로 잇는** 정리 문서입니다. 발표·복습용으로 읽고, 코드는 `js/mini-react.js`, `js/week4-demo.js`, `week4.html`과 대조하면 좋습니다.

---

## 1. 이번 수요 코딩회(Week 4)를 하는 이유 — Week 3 코드에 무엇이 있었고, 무엇이 부족했는가

### Week 3에서 이미 갖춘 것

Week 3 레포는 **“화면을 데이터로 표현하고, 바뀐 만큼만 DOM에 반영한다”**는 능력을 갖췄습니다.

- **VNode**: DOM을 순수 객체 트리로 옮긴 스냅샷 (`js/vdom.js`)
- **Diff**: 이전 트리와 다음 트리를 비교해 “무엇을 바꿀지” 목록으로 만듦 (`js/diff.js`)
- **Patch**: 그 목록을 실제 DOM에 적용 (`js/patch.js`)
- **5단계 워크숍**: 테스트 영역의 HTML을 바꾼 뒤 **Patch** 버튼으로 “새 VNode → diff → patch”를 한 번 돌리는 흐름 (`js/phase5-workshop.js`)

즉, **엔진(비교·적용)** 은 있습니다.

### 그런데 부족한 것 — “앱을 짜는 층”

Week 3 데모에서 UI가 바뀌는 경로를 보면, 대체로 이런 식입니다.

- 사용자가 **직접** “다음 화면을 설명하는 VNode(또는 HTML)”를 만들거나 고르고,
- **언제** `diff` / `patch`를 돌릴지도 **버튼·스크립트가 명시적으로** 결정합니다.

여기에는 **문제가 없는 것이 아니라**, “학습용 데모”로는 오히려 정직합니다. 다만 **실제 앱**을 만들 때는 보통 다음이 반복됩니다.

1. **어떤 값**이 바뀌었다 (예: 카운트, 입력값, 탭 인덱스)
2. 그 값에 따라 **같은 규칙**으로 VNode 트리를 **다시 계산**하고 싶다
3. 그 계산과 이벤트 처리가 **한 덩어리**로 유지되면 좋다

Week 3 코드만으로도 1~3을 **매번 손으로** 짤 수 있습니다. `oldVNode`를 변수에 들고, 클릭 핸들러에서 새 VNode를 만들고, `diffVNode` → `applyPatches`를 호출하면 됩니다.

**부족한 것은 능력이 아니라 “반복되는 구조의 이름과 자리”입니다.**

- “이 화면 조각을 다시 그리는 함수”를 **컴포넌트**라고 부르지 않았고,
- “시간에 따라 변하는 값”을 **state**로 묶어 두지 않았으며,
- “함수가 매번 새로 실행되는데 그 값은 어디에 남나?”를 **훅**으로 정리하지 않았습니다.

Week 4 과제는 그 **한 단계 위** — UI를 나누는 단위, 상태, 갱신 루프 — 를 **직접 구현**해 보고, Week 3 엔진과 **맞물리게** 하는 것입니다.

---

## 2. 이를 해결·정리하기 위한 기본 개념

아래 개념은 “React만의 마법”이 아니라, **Week 3 엔진 위에 얹는 해석 프레임**에 가깝습니다.

### 컴포넌트(Component)

- UI의 한 조각을 **“입력 → VNode 트리”** 로 표현하는 단위입니다.
- 이 레포에서는 **함수 하나**가 그 역할을 합니다. 호출되면 곧바로 VNode를 반환합니다.
- **재사용·분할**의 기준: 헤더, 카운터, 목록 행처럼 “같은 규칙으로 여러 번 그릴 부분”을 함수로 빼 둡니다.

### 상태(State)

- 화면에 반영되어야 하는 **시간에 따라 변할 수 있는 값**입니다.
- 상태가 바뀌면, 그 상태를 “소유”하는 단위의 렌더 규칙을 **다시 실행**해 새 VNode를 만들어야 합니다.
- Week 3만 쓸 때는 이걸 전역 변수·클로저·객체 필드 등으로 흩뿌릴 수 있었고, Week 4에서는 **`hooks` 슬롯**으로 한 줄로 모읍니다.

### 선언적 UI(Declarative UI)

- “지금 상태가 이렇다면 화면은 이렇게 생겨야 한다”를 **한 함수 본문**에 적어 두는 스타일입니다.
- **어떻게** DOM 노드를 하나하나 고칠지가 아니라, **무엇이 보여야 하는지(VNode)** 를 매번 새로 선언합니다.
- 실제 “최소 변경”은 Week 3의 **diff / patch**가 맡습니다.

### 렌더 루프(Render loop)

대략적인 순서는 다음과 같습니다.

1. 상태 갱신 요청 (`setState` 등)
2. 컴포넌트 함수 **재호출** → 새 VNode
3. 이전 VNode와 **diff** → patches
4. **patch**로 DOM 반영
5. (이 레포에서는) **useEffect** flush를 microtask로 이어 붙임

Week 3에서 이미 3·4가 있었고, Week 4는 **1·2·5를 “컴포넌트 + 훅” 규약**으로 묶습니다.

### 훅(Hooks)

- 함수형 컴포넌트는 **호출될 때마다 본문이 처음부터 다시 실행**됩니다.
- 그런데 `useState`의 “이전 값”은 어딘가에 남아 있어야 합니다.
- 해결: 컴포넌트 인스턴스에 **`hooks` 배열**을 두고, 호출 순서대로 `hooks[0]`, `hooks[1]`, … 슬롯에 메모리를 둡니다. 매 렌더마다 **인덱스만 0에서 다시 올라가며** 같은 슬롯을 읽고 씁니다.
- 이게 “훅은 최상위에서만, 순서를 바꾸지 말 것”으로 규정되는 이유와 직결됩니다.

### Lifting state up (과제에서의 제약)

- 자식은 **props만** 받는 무상태 함수로 두고, `useState` 등은 **루트 한 곳**에만 둡니다.
- 실제 React에서는 자식도 훅을 쓰지만, 이번 과제는 **상태 위치 설계**와 **데이터 흐름**을 분명히 하기 위한 제약으로 이해하면 됩니다.

---

## 3. 이 개념을 이 레포에서 어떻게 구현하는가

### 파일 역할 한눈에

| 파일 | 역할 |
|------|------|
| `js/mini-react.js` | `FunctionComponent`, `mount` / `update`, `useState` / `useEffect` / `useMemo`, `h` / `hText` |
| `js/vdom.js` | VNode → DOM, `onClick` 같은 **함수 prop**은 리스너로 연결 |
| `js/diff.js` | 두 VNode 트리 비교 |
| `js/patch.js` | patches를 DOM에 적용(함수 prop도 갱신 시 리스너 교체) |
| `js/week4-demo.js` | 단계별로 여러 `FunctionComponent`를 각 컨테이너에 마운트 |
| `week4.html` | 단계별 데모 UI |

### `FunctionComponent` — 컴포넌트 인스턴스

- **`hooks`**: 상태·이펙트·메모 슬롯 배열
- **`mount`**: 첫 렌더에서 VNode를 만들고 `vnodeToDom`으로 붙임, 이후 `domRoot` / `oldVNode` 보관
- **`update`**: `renderFn()`으로 새 VNode → `diffVNode(this.oldVNode, newVNode)` → `applyPatches(this.domRoot, patches)` → `oldVNode` 갱신

여기서 Week 3 엔진이 **그대로** 호출됩니다.

### `useState`

- 현재 컴포넌트(`activeComponent`)의 `hookIndex` 위치에 `{ type: 'state', value }` 저장
- `setState`는 값이 바뀌면 **`scheduleUpdate`** 로 `update`를 microtask에 한 번 묶어서 호출(단순 배칭)

### `useMemo`

- 같은 인덱스 슬롯에 `deps`와 `value` 저장
- `deps` 배열을 얕게 비교해 같으면 factory를 다시 호출하지 않음

### `useEffect`

- 슬롯에 `fn`, `deps`, `cleanup`, `pendingRun` 등 저장
- `mount` / `update` 끝의 **`flushEffects`** 가 `queueMicrotask` 안에서 `pendingRun`인 이펙트만 실행
- deps가 바뀌기 전에 이전 `cleanup` 호출 후 새 `fn` 실행

### `h(함수, props)` — 무상태 자식

- 자식 함수를 호출할 때 **`activeComponent`를 잠시 끕니다.** 그래서 자식 안에서 `useState`를 호출하면 루트 훅 배열이 아니라 **에러**가 나거나(이 레포는 루트 밖에서 훅 호출 시 throw), 실수로 부모 슬롯을 오염시키지 않습니다.
- 과제의 “자식은 props만”을 코드 구조로 뒷받침합니다.

### 이벤트

- VNode의 `props.onClick`처럼 **함수**는 `setAttribute`로는 표현할 수 없으므로, `vdom.js` / `patch.js`에서 **`addEventListener`** 로 붙입니다.

---

## 읽는 순서 제안

1. 이 문서 1절 → `docs/week03-vdom/implementation-phases.md`에서 “우리가 이미 가진 것” 상기  
2. 2절 → `js/mini-react.js`를 위에서부터 `FunctionComponent` / `useState` 중심으로 읽기  
3. `week4.html` 1~5단계를 스크롤하며 `js/week4-demo.js`의 해당 `mountIf` 블록과 대응  
4. 마지막으로 `useEffect` / `useMemo` 슬롯과 `flushEffects` 흐름을 추적  

질문 하나를 스스로에게 던져 보면 학습이 잘 됩니다.

> “`update`가 불리지 않으면 `useEffect`의 `fn`은 새로 등록만 되고 실행은 언제 되는가?”

답은 **`flushEffects`가 `mount` / `update` 끝에서 microtask로 예약되기 때문**입니다.

---

## 관련 문서

- [`requirements.md`](requirements.md) — 과제 항목과 코드 대응  
- [`implementation-phases.md`](implementation-phases.md) — 구현 순서 페이즈  
- [`../week03-vdom/VDOM_Diff_Patch_Study.md`](../week03-vdom/VDOM_Diff_Patch_Study.md) — Week 3 개념 복습  
