# 발표용 대본 (4분 고정) — DOM ↔ VNode · Diff · Patch · React · 테스트

## 0) 전체 목표 (오프닝 10초)
“DOM을 직접 다루는 비용과 비교의 어려움을, VNode 스냅샷 + diff(patches[]) + patch로 ‘변경만 최소 적용’하는 흐름으로 설명합니다. React도 같은 큰 방향으로 동작한다는 관점을 연결합니다.”

---

## 1) DOM 다루기 + 왜 VDOM이 필요한가 (0:00~0:50)
[화면: 상단 데모 설명 + 1단계 `DOM → VNode`]

“여기서 `DOM`은 브라우저가 화면을 구성하는 **실제 트리**입니다. 자바스크립트에서는 주로 `document`와 `window`를 통해 DOM에 접근하고 조작합니다.  
`document`로 `createElement`, `createTextNode`, `replaceChildren` 같은 API를 쓰고, 실제 DOM을 변경하면 브라우저는 화면을 다시 반영합니다.”

“그런데 DOM은 값이 아니라 브라우저가 관리하는 **객체**이고, 변경 비용도 큽니다. 그래서 화면 업데이트를 할 때는 ‘무엇이 바뀌었는지’를 잘 계산해서, 필요한 만큼만 바꾸는 전략이 필요합니다.”

---

## 2) DOM 변화 감지 (0:50~1:10)
[화면: Patch 버튼/5단계 워크숍]

“DOM 변화 감지는 보통 브라우저 API로 해결합니다. 대표가 `MutationObserver`입니다.  
하지만 이 데모는 자동 감지가 아니라, **Patch 버튼을 누른 순간**에 textarea의 입력을 ‘다음 상태’로 만들고, 이전 상태와 비교해서 diff를 실행합니다.  
즉 ‘감지’는 자동이 아니라 ‘트리거(명시적 실행)’ 방식으로 설계된 학습 데모입니다.”

---

## 3) 실제 DOM이 느린 이유 (1:10~1:35)
[화면: 개념 설명 전환]

“DOM을 직접 크게 바꾸면 브라우저가 다시 계산하고 다시 그리는 비용이 생깁니다.  
대표적으로 `Reflow`(레이아웃 재계산)와 `Repaint`(화면 재페인팅) 비용입니다.  
그래서 업데이트의 핵심은 ‘변경을 최소 범위로 만들기’입니다.”

---

## 4) Virtual DOM: 구조 + 필요한 이유 (1:35~2:20)
[화면: 1단계의 VNode JSON]

“`Virtual DOM`은 실제 DOM 대신, 같은 UI를 표현하는 **VNode 스냅샷**입니다.  
이 프로젝트의 VNode는 구조가 명확합니다.
- 요소 VNode: `type / props / children`
- 텍스트 VNode: `type '#text' / value`
- Fragment VNode: `type '#document-fragment' / children`”

“필요한 이유는 두 가지입니다.  
첫째, VNode는 **값(value)처럼 비교/저장**하기 쉽습니다.  
둘째, diff가 계산한 결과를 patch가 실제 DOM에 적용하므로, 변경을 최소화하는 방향으로 업데이트를 설계할 수 있습니다.”

---

## 5) Diff 알고리즘: 동작 방식 + 5가지 핵심 케이스 (2:20~3:15)
[화면: 3단계 `Diff` + `output-phase-3-patches`]

“이제 `Diff`입니다. `diffVNode(oldVNode, newVNode)`는 DOM을 바꾸지 않고, **patches[]**라는 명령 목록을 계산합니다.  
patches[]의 op는 예를 들어 `SET_TEXT`, `SET_PROP`, `REMOVE_PROP`, `REPLACE_CHILDREN`, `REPLACE_NODE`, `REMOVE_NODE`입니다.”

“최소 변경을 찾기 위한 핵심 케이스는 5가지로 정리됩니다. diffWalk의 분기 흐름대로 말하면:
1) **둘 다 null**이면 변경 없음
2) **old만 존재 / new만 존재**이면 삽입/삭제를 `REPLACE_NODE` 또는 `REMOVE_NODE`로 처리
3) **둘 다 텍스트(#text)**이고 value만 다르면 `SET_TEXT`
4) **type이 다르면** 하위 비교 대신 `REPLACE_NODE`로 서브트리를 통째로 교체
5) **type이 같고 요소라면**  
   - props 차이면 `SET_PROP` / `REMOVE_PROP`  
   - children 차이면 children 길이 같을 땐 인덱스별 재귀 diff, 길이가 다르면 `REPLACE_CHILDREN`로 자식 목록을 통째로 교체”

“즉 diff는 ‘어디(path)에서 무엇(op)으로 바꿀지’를 계산해서 patch에 전달합니다.”

---

## 6) 실제 DOM 반영(= Patch) 방법 (3:15~3:40)
[화면: 4단계 `Patch` 또는 5단계 `Patch` 버튼]

“`Patch`는 patches[]를 실제 DOM에 적용합니다.  
`applyPatches(domRoot, patches)`는 patches를 순서대로 실행하고, 각 op는 `applyOnePatch`의 switch로 처리됩니다.
- `path`는 루트 기준 `childNodes` 인덱스 경로
- `SET_TEXT`는 Text 노드의 `nodeValue`만 변경
- `SET_PROP` / `REMOVE_PROP`는 `setAttribute` / `removeAttribute`
- `REPLACE_CHILDREN` / `REPLACE_NODE`는 실제로 노드를 재구성하거나 교체가 필요할 때 실행”

“구조 교체가 언제 필요한가?  
대표적으로 `type이 달라지는 경우`와 `children 길이가 달라지는 경우`입니다.”

---

## 7) React 연결(개념·흐름) + 5/6단계로 다시 묶기 (3:40~4:00)
[화면: 5단계 + 6단계 PASS/FAIL]

“React도 같은 큰 방향을 갖습니다. 상태 변경이 발생하면 새로운 UI 표현 트리를 만들고, 이전 표현과 비교해서 변경이 필요한 부분만 계산한 뒤, 실제 DOM을 최소로 커밋합니다.  
차이점은 이 데모는 그 계산을 우리가 직접 구현해서 diff/patch를 눈으로 보여주고, React는 그 과정을 내부의 reconciliation이 수행한다는 점입니다.”

“5단계에서는 textarea 입력을 new VNode로 만들고 diff/patch로 실제 영역만 갱신합니다.  
6단계에서는 핵심 함수들의 PASS/FAIL을 브라우저에서 확인해 검증까지 보여줍니다.”

---

## 마무리 한 문장(마지막 3~5초)
“정리하면 VNode는 스냅샷, diff는 patches 계산기, patch는 path 기반 실행기이고, React도 결국 ‘차이 계산 후 최소 변경 커밋’의 방향성을 같습니다.”

