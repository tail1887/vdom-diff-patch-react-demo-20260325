# 구현 단계 문서 (Virtual DOM / Diff 과제)

과제 **원문 요구사항·발표 조건**은 [`requirements.md`](requirements.md)에 정리해 두었다.

이 문서는 **무엇을 어느 단계에서 했는지**와 **다음에 무엇을 할지**만 짧게 남긴다.  
질문하며 따라가기 좋게, 코드의 상세 설명은 각 파일 주석을 우선한다.

---

## 학습 노트 (대화 중 질문에서 보강한 내용)

스스로 질문했던 내용을 문서에도 남겨, 나중에 README·발표로 옮기기 쉽게 한다.  
같은 내용은 `js/vdom.js` 파일 최상단 주석에 더 길게 적어 두었다.

### “VNode 는 JSON 으로 복사·비교(diff) 하기 쉬워야 한다” — 왜 그 조건이 나오나?

- **Diff 는 값 비교**다. 알고리즘이 보는 것은 “이전 트리의 데이터”와 “다음 트리의 데이터”의 차이이지, 브라우저가 들고 있는 **살아 있는 Node 참조** 자체가 아니다.
- 과제의 **히스토리(뒤로/앞으로)** 는 “그 시점의 UI 설명”을 **스냅샷으로 저장**해야 하므로, 순수 객체 트리(VNode)가 **깊은 복사·저장**에 유리하다.
- **JSON** 은 조건의 핵심이라기보다 대표적인 표현이다. 핵심은 **직렬화에 가깝고 순환 참조가 없는 순수 스냅샷**이다. `JSON.stringify` 로 덤프가 된다면 디버깅·데모·테스트에 편하다.

### 그럼 **실제 DOM** 으로 diff 하면 왜 곤란한가?

- DOM 노드는 **네이티브 객체**이고 **부모·자식·형제로 서로 참조**하는 **그래프**에 가깝다. “두 DOM 트리를 값으로만 비교”하려면 결국 **추출한 데이터**가 필요해진다(그게 `domToVNode`).
- 화면이 같아 보여도 **노드를 새로 만들면 참조는 전부 달라진다.** 참조 동등성으로는 “구조가 같은지”를 말하기 어렵다.
- DOM 에는 **속성 문자열 밖의 상태**(리스너 등)도 붙을 수 있어, 과제가 말하는 “구조·속성·텍스트” 중심의 비교 단위와 맞추기 어렵다.

### 연관 개념 (이전에 헷갈렸던 포인트 짧게)

- **동적 화면 = 전체 새로고침이 없다:** 자바스크립트로 DOM 을 바꾸는 것 자체가 새로고침이 아니다. React 전용 기능이 아니다.
- **React 가 “다시 그림”을 없애지는 않는다:** 픽셀이 바뀌면 브라우저는 그릴 수 있다. 다만 **실제 DOM 을 어떻게·얼마나 건드리느냐**를 줄이려는 전략이 재조정에 가깝다.
- **추상화(React 등):** DOM 조작이 기술적으로 불가능해서가 아니라, 큰 앱에서 **상태와 화면을 맞추기·유지하기** 쉽게 하려는 층이다.

---

## 프로젝트 파일 맵 (현재)

| 경로 | 설명 |
|------|------|
| `index.html` | 데모 페이지 — `demo-phase`, `container-phase-N-*`, `output-phase-N-*`, `control-phase-N-*` |
| `css/base.css` | 레이아웃·스타일 |
| `js/vdom.js` | **1~2단계** — `domToVNode`, `vnodeToDom`, `renderVNodeInto` |
| `js/diff.js` | **3단계** — `diffVNode` |
| `js/patch.js` | **4단계** — `getDomNodeAtPath`, `applyPatches` |
| `js/phase1-demo.js` | 1~4단계 UI 연동(Shadow 4단계) |
| `js/phase5-workshop.js` | **5단계** — 실제/테스트 분리, Patch, VNode 히스토리(뒤로/앞으로) |
| `docs/implementation-phases.md` | 이 문서 |
| `docs/requirements.md` | 과제 요구사항·중점·발표 조건 정리본 |

---

## 전체 로드맵 (과제 기준)

1. **완료: DOM → Virtual DOM** (`domToVNode`)
2. **완료: Virtual DOM → DOM** (`container-phase-2-mount`)
3. **완료: Diff** (`output-phase-3-patches`, `control-phase-3-scenario`)
4. **완료: Patch** (`applyPatches`, `container-phase-4-mount` + Shadow)
5. **완료: 과제용 UI** — 실제/테스트 영역 분리, 통합 Patch, 되돌리기·앞으로(히스토리) — `phase5-workshop.js`
6. **완료: 테스트 UI** — 브라우저 내 단위테스트 러너(PASS/FAIL 표시) — `js/unit-tests.js`

---

## 1단계 — 실제 DOM → Virtual DOM (VNode)

### 목표

- 브라우저가 들고 있는 **실제 DOM 서브트리**를 읽어, **순수 JS 객체/배열 트리**로 옮긴다.
- 이 트리는 나중에 **스냅샷 저장·비교(diff)** 하기 쉬운 **값(value) 트리**여야 한다. (JSON 은 그걸 드러내는 대표 예시 — 이유는 위 「학습 노트」 참고)

### 구현 내용

- **`domToVNode(node)`** (`js/vdom.js`)
  - `ELEMENT_NODE` → `{ type, props, children }`
  - `TEXT_NODE` → `{ type: '#text', value }`
  - `DOCUMENT_NODE` → `document.documentElement` 만 재귀 (루트가 document 일 때 편의)
  - `DOCUMENT_FRAGMENT_NODE` → `{ type: '#document-fragment', children }`
  - 그 외(예: 주석) → `null`, 부모 `children` 에 포함하지 않음
- **자식 수집:** `childNodes` 사용 (텍스트·요소 모두 포함, 원본 DOM 에 충실)
- **속성:** `getAttributeNames` / `getAttribute` 로 문자열 맵 `props` 에 저장

### 검증 방법

1. `index.html` 을 브라우저로 연다.
2. 가운데 열에서 `outerHTML`·트리 요약, 오른쪽에서 VNode JSON 이 채워지는지 본다.
3. 샘플 HTML 을 고치고 새로고침 → JSON 구조가 기대와 맞게 바뀌는지 본다.
4. **엣지로 볼 것:** 태그 사이 줄바꿈 때문에 **공백 전용 텍스트 노드**가 VNode 에 나타날 수 있음 (브라우저 파싱 특성).

### 알려진 한계 / 이후 결정 사항

- `style` 은 문자열 그대로 — 나중에 객체 분리할지 선택.
- 주석 노드 무시 — 필요 시 확장.
- 네임스페이스(XML/SVG) 고급 처리는 생략 가능.

---

## 2단계 — Virtual DOM → DOM (완료)

### 목표

- VNode 순수 객체 트리를 `createElement` / `createTextNode` 로 **실제 Node 트리**로 복원한다.
- 컨테이너를 비운 뒤 한 번에 붙이는 **`renderVNodeInto(container, vnode)`** 로 과제의 “테스트 영역 초기 렌더” 흐름을 연습한다.

### 구현 내용 (`js/vdom.js`)

- **`vnodeToDom(vnode)`** — `TEXT` / 요소 태그 / `#document-fragment` 분기, 미지원 type 은 `null`.
- **`vnodeElementToDom`** — `props` 를 `setAttribute` 로 반영 (`true` → 빈 문자열 속성).
- **`vnodeAppendChildren`** — 자식 VNode 를 재귀적으로 DOM 에 연결.
- **`renderVNodeInto(container, vnode)`** — `container.replaceChildren()` 후 루트 노드(또는 fragment) 부착.

### 데모

- `container-phase-2-mount` — `domToVNode(container-phase-1-sample)` 의 **id 제거 복제본** 렌더.

### 검증 방법

1. 새로고침 후 하단 **2단계** 패널에 왼쪽 샘플과 거의 같은 모양이 보이는지 확인한다.
2. 개발자 도구 Elements 로 샘플 루트와 mount 내부 트리를 비교한다(텍스트·속성·중첩).
3. `id`는 복제본에서 빠져 있음을 확인한다.

### 알려진 한계 / 이후

- `innerHTML` / 이벤트 리스너는 2단계 범위 밖. Diff·Patch 단계에서 최소 갱신으로 발전.

---

## 3단계 — Diff (완료)

### 목표

- 이전·다음 VNode 를 트리 순회로 비교해 **적용 가능한 패치 연산 배열**로 만든다.

### 구현 내용 (`js/diff.js`)

- **`diffVNode(oldVNode, newVNode)`** — 루트에서 `diffWalk` 시작, `path`는 자식 인덱스 배열(`[]` = 루트).
- **텍스트**: 내용만 다르면 `SET_TEXT`.
- **타입 불일치**(태그 변경, 텍스트↔요소 등): `REPLACE_NODE`.
- **요소 동일 태그**: `diffProps` → `REMOVE_PROP` / `SET_PROP`.
- **자식**: 길이 같으면 인덱스마다 재귀; **길이 다르면** `REPLACE_CHILDREN`(전체 자식 교체).

### 데모 ([`index.html`](../index.html))

- `control-phase-3-scenario` — 동일 / id 제거 / 제목 수정.
- `output-phase-3-patches` — `patchCount`, `patches`.

### 알려진 한계

- 리스트 **key 없음** → 중간 삽입 최적화 없음(`REPLACE_CHILDREN` 사용).

---

## 4단계 — Patch (완료)

### 목표

- `diffVNode` 결과를 **같은 path 규칙**으로 실제 DOM 노드에 반영한다.

### 구현 (`js/patch.js`)

- **`getDomNodeAtPath(root, path)`** — `childNodes` 인덱스 체인.
- **`applyPatches(domRoot, patches)`** — 순차 적용, `REPLACE_NODE` 가 `path:[]` 이면 새 루트 반환.
- 지원 연산: `SET_TEXT`, `SET_PROP`, `REMOVE_PROP`, `REPLACE_CHILDREN`, `REPLACE_NODE`, `REMOVE_NODE`.

### 데모

- `container-phase-4-mount` 가 **ShadowRoot 호스트**; 안쪽 div 에 이전 VNode(id 포함)를 그린 뒤 패치 적용 → **문서 1단계 샘플과 `id` 충돌 없음**.
- `control-phase-4-reset` / `control-phase-4-apply`, `output-phase-4-status`.

### 알려진 한계

- 한 배치 안에서 루트 교체 후 **옛 path 기준** 후속 패치가 오면 깨짐(현재 diff 출력과 맞춰 둠).

---

## 5단계 — 과제용 통합 UI · 히스토리 (완료)

### 목표

- **실제 영역**(DOM): Patch 적용 대상만 갱신.
- **테스트 영역**: HTML 문자열 편집 → 파싱한 VNode와 현재 커밋을 비교.
- **Patch / 뒤로 / 앞으로**: VNode **깊은 복사** 스냅샷으로 히스토리 유지.

### 구현 (`js/phase5-workshop.js`)

- **초기화:** `cloneVNodeStripIds(domToVNode(container-phase-1-sample))` 로 실제·textarea 동기화.
- **`htmlStringToRootVNode`:** 단일 루트 요소만 허용(`innerHTML` 파싱 후 `domToVNode`).
- **Patch:** `committed = history[historyIndex]`, `testVNode` 와 `diffVNode` → `applyPatches(realRoot, …)` — **실제 마운트의 첫 요소**만 갱신. 이후 `history` 에 `vnodeDeepClone(testVNode)` 푸시, 미래 분기 잘라냄.
- **뒤로/앞으로:** `syncUIFromHistory` 로 `renderVNodeInto(realMount, …)` + `vnodeToHTMLString` 으로 textarea 동기화.

### 데모 (`index.html`)

- `container-phase-5-real-mount`, `control-phase-5-test-html`, `control-phase-5-patch|back|forward`, `output-phase-5-status`.
- 스타일: `css/base.css` — `workshop-split`, `workshop-textarea`, `phase5-toolbar`, `btn-phase5`, `demo-phase__header--accent-workshop` 등.

### 검증 방법

1. 페이지 열기 → 5단계 실제 영역이 1단계 샘플과 비슷하고(id 없음) textarea 내용이 맞는지 확인.
2. textarea에서 제목 텍스트만 수정 → **Patch** → 실제 영역만 바뀌고 상태에 패치 개수·히스토리 길이 표시.
3. **뒤로** → 실제·textarea 가 이전 스냅샷으로 복원; **앞으로** 로 다시 이동.
4. 루트가 0개/2개 이상이면 상태 메시지로 파싱 거부 확인.

### 알려진 한계

- 5단계는 **Shadow 4단계와 별도** — 문서 본문의 1단계 샘플과 id 충돌을 피하기 위해 복제 시 id 제거 유지.
- `htmlStringToRootVNode` 가 지원하는 HTML 은 브라우저 `innerHTML` 파싱 규칙에 따름.

---

## 6단계 — 테스트 · README (테스트 완료, README 예정)

- 브라우저 내 소형 테스트 러너(`js/unit-tests.js`)로 `domToVNode / vnodeToDom / diffVNode / applyPatches` 핵심 케이스를 검증.
- 웹페이지(`data-phase="6"`)에서 PASS/FAIL과 실패 로그를 함께 표시.
- README는 발표용 데모 시나리오/아키텍처/한계를 정리하는 단계로 남아 있다.

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| (초기) | 1단계 `vdom.js`, `phase1-demo.js`, `index.html`, `base.css`, 본 문서 작성 |
| (보강) | 질문 기반 정리: JSON/diff 조건, DOM 직접 비교의 어려움 — `vdom.js` 주석 + 본 문서 「학습 노트」 |
| (2단계) | `vnodeToDom`, `renderVNodeInto`, `container-phase-2-mount` |
| (3단계) | `diff.js`, `diffVNode`, 시나리오 UI |
| (4단계·리팩터) | `patch.js`, `applyPatches`, HTML ID·`demo-phase` 정리, Shadow 패치 데모 |
| (5단계) | `phase5-workshop.js`, 통합 워크숍 UI, 히스토리, `base.css` 워크숍 스타일 |
| (6단계) | `js/unit-tests.js` 단위테스트 러너, `index.html` phase6 테스트 UI |

문서를 업데이트할 때는 **해당 단계를 마칠 때마다** “구현 내용 / 검증 / 한계” 세 블록만 추가하면 된다.
