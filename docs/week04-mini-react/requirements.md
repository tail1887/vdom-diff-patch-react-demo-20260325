# Week 4 요구사항 정리 (미니 React)

수요 코딩회 4주차 과제 원문을 **이 레포 구현**과 대응시킨 체크리스트입니다. 상세 구현 단계는 [`implementation-phases.md`](implementation-phases.md)를 참고하세요.

---

## 목표

- **Component · State · Hooks**를 외부 프레임워크 없이 직접 구현하고, **Week 3 VDOM + diff + patch**로 실제 DOM을 갱신한다.
- **Virtual DOM → Diff → Patch** 흐름을 유지해, 통째 innerHTML 갱신이 아닌 **변경분 반영**을 목표로 한다.

---

## Component (함수형)

| 요구 | 이 레포 |
|------|---------|
| 함수형 컴포넌트 | 루트: `new FunctionComponent(renderFn)` + `mount(container)` |
| `FunctionComponent` 클래스, `hooks` 배열, `mount` / `update` | `js/mini-react.js` |
| 훅·상태는 **루트만** | `useState` / `useEffect` / `useMemo`는 `activeComponent`가 있을 때만 허용, 그 외 `throw` |
| 자식은 **Stateless**, props만 | `h(자식함수, props)` 호출 시 `activeComponent`를 잠시 끄고 `자식함수(props)`만 실행 |

---

## State

| 요구 | 이 레포 |
|------|---------|
| 상태 변경 시 화면 갱신 | `setState` → `scheduleUpdate` → `update()` → `diffVNode` → `applyPatches` |
| Lifting state up | 데모에서 모든 `useState`는 `App` 루트에만 두고, `Header` 등은 props만 수신 |

---

## Hooks (최소)

| 훅 | 동작 요약 |
|----|-----------|
| `useState` | `hooks[i]`에 값 보관, `setState`는 **microtask 한 번**에 `update` 배칭(선택 과제 성격) |
| `useEffect` | `mount` / `update` 끝에서 `queueMicrotask`로 flush, deps 변경 시 cleanup 후 재실행. deps 생략 시 매 커밋마다 실행 |
| `useMemo` | deps 얕은 비교(`Object.is`) 후 같으면 캐시 값 반환 |

**핵심 질문** “함수는 매번 새로 실행되는데 상태는?” → 렌더마다 `hookIndex`를 0으로 되돌리고, **같은 순서의 `hooks[i]` 슬롯**에서 이전 값을 읽는다.

---

## Virtual DOM · Diff · Patch

| 요구 | 이 레포 |
|------|---------|
| Week 3 VDOM 활용 | `js/vdom.js`, `js/diff.js`, `js/patch.js` 그대로 사용 |
| 이벤트 | `onClick` 등 **함수 prop**은 `vnodeAttachPropHandler` / 패치 `SET_PROP`에서 `addEventListener` (`js/vdom.js`, `js/patch.js`) |

---

## 테스트 페이지 · 검증

| 요구 | 이 레포 |
|------|---------|
| 입력/클릭으로 화면 변경 | **`week4.html`** — 2~5단계 데모에서 클릭·토글로 화면 갱신 (`js/week4-demo.js`) |
| 단위 테스트 | `js/week4-unit-tests.js` (`week4.html`), Week 3는 `index.html` 6단계 `js/unit-tests.js` |

---

## 기술 제한

- JavaScript, HTML, CSS만 사용 (React/Vue 등 금지) — 준수.

---

## 실제 React와의 차이 (발표용 메모)

- 동시성·Fiber·우선순위 스케줄링 없음.
- 이벤트 합성·버블링 추상화 없음(네이티브 리스너 직접 등록).
- 자식 배열 길이 변경 시 `REPLACE_CHILDREN` 등 Week 3 diff 정책 그대로.
- `setState` 배칭은 **microtask 1회** 수준의 단순화만 적용.

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| `js/mini-react.js` | `FunctionComponent`, `h`, `hText`, 훅 |
| `js/week4-demo.js` | 통합 데모 UI |
| `js/week4-unit-tests.js` | Week 4 단위 테스트 |
| `docs/week04-mini-react/implementation-phases.md` | 개발 페이즈·역할 분담 |
