# Week 4 구현 페이즈

Week 3(`docs/week03-vdom/`) 위에 **미니 React 레이어**를 쌓는 순서입니다. 실제 코드는 대부분 `js/mini-react.js`에 모여 있습니다.

---

## Phase 1 — `FunctionComponent` 뼈대 + `mount`

**목표:** 함수를 호출해 VNode 트리를 얻고, Week 3의 `vnodeToDom` / `renderVNodeInto`와 동일하게 컨테이너에 붙인다.

- `hooks` 배열, 렌더 시마다 0으로 리셋하는 `hookIndex`
- `mount(container)`: `activeComponent = this` 후 `renderFn()` → `container.replaceChildren()` + `appendChild(vnodeToDom(vnode))`
- `this.domRoot = container.firstChild` (이후 patch 기준 루트)

**상태:** 완료 (`mini-react.js`)

---

## Phase 2 — `update` + `diffVNode` / `applyPatches`

**목표:** 리렌더 시 통째 교체가 아니라 diff 결과만 DOM에 반영한다.

- `oldVNode`와 새 VNode를 `diffVNode`로 비교
- `this.domRoot = applyPatches(this.domRoot, patches)` 로 루트 참조 갱신
- `oldVNode` 갱신

**상태:** 완료

---

## Phase 3 — `useState`

**목표:** “매 렌더 새 함수”와 “유지되는 상태”를 `hooks[i]` 슬롯으로 연결한다.

- 초기 슬롯 생성, 이후 같은 인덱스에서 값 읽기
- `setState`: `Object.is`로 동일 값이면 스킵, 아니면 `scheduleUpdate(comp)`

**상태:** 완료

---

## Phase 4 — Stateless 자식 + `h(함수, props)`

**목표:** 과제 제약 “자식은 훅 없음”을 구조로 강제한다.

- `h(type, props, ...children)`에서 `typeof type === 'function'`이면 `activeComponent = null`로 호출해 자식 안에서 `useState` 등이 루트 훅 배열을 오염시키지 않게 함
- 자식은 `(props) => VNode` 순수 함수로만 작성

**상태:** 완료 (`week4-demo.js`의 `Header`)

---

## Phase 5 — `useEffect`

**목표:** 커밋(DOM 반영) 이후 부수 효과 실행, deps 변경 시 cleanup.

- 훅 슬롯: `fn`, `deps`, `cleanup`, `pendingRun`
- `deps === undefined` → 매 업데이트마다 실행(React의 deps 생략과 유사)
- `mount` / `update` 마지막에 `flushEffects` → `queueMicrotask`에서 `pendingRun`인 훅만 처리

**상태:** 완료

---

## Phase 6 — `useMemo`

**목표:** deps가 같을 때 factory 재실행을 생략한다.

- 슬롯에 `deps`, `value` 저장
- 얕은 배열 비교(`Object.is` per item)
- **의도적으로** `deps`는 배열 필수(생략 시 `throw`) — `undefined`끼리 같다고 보는 실수를 막기 위함

**상태:** 완료

---

## Phase 7 — 테스트 페이지 + 단위 테스트

**목표:** 브라우저에서 상호작용 데모와 자동 테스트로 검증한다.

- `week4.html`(1~5단계 **데모** 섹션 + 하단 단위테스트), `js/week4-demo.js`(단계별 `FunctionComponent` 마운트)
- `js/week4-unit-tests.js`: `h` / stateless child / `useState`+microtask / `useMemo` / `useEffect`

**상태:** 완료

---

## Phase 8 — 배칭 (선택)

**목표:** 짧은 시간에 여러 `setState`가 나와도 렌더는 한 번만.

- `scheduleUpdate`에서 이미 예약된 microtask가 있으면 중복 예약하지 않음 → 한 틱의 갱신이 한 번의 `update`로 합쳐짐

**상태:** 완료 (microtask 단위)

---

## Week 3과의 접점 (이벤트)

VNode `props`에 문자열만 있으면 `setAttribute`로 충분하지만, 클릭 핸들러는 **함수**여야 하므로 다음을 추가했다.

| 파일 | 변경 |
|------|------|
| `js/vdom.js` | `vnodeAttachPropHandler` / `vnodeDetachPropHandler`, `vnodeElementToDom`에서 `on*` + 함수 → 리스너 |
| `js/patch.js` | `SET_PROP` / `REMOVE_PROP`에서 동일 규칙 |

---

## 다음에 확장한다면

- `useReducer`, `useRef`, `useCallback`
- diff의 key 기반 리스트 재배치(Week 3 한계 보완)
- SSR/하이드레이션 없음 유지 여부 결정
