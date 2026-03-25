# 발표용 대본 (1~6단계) — DOM ↔ VNode · Diff · Patch · 히스토리

## 전체 한 줄 목표 (오프닝용)
브라우저의 **실제 DOM**을 **VNode 스냅샷**으로 바꾸고, 이전/다음 상태의 차이를 **diff**로 **patches[](명령 목록)**로 계산한 뒤, **patch**로 변경된 부분만 **실제 DOM에 반영**하는 흐름을 보여준다.

---
## 1) 오프닝 (45~60초) — DOM 다루기 / 변화 감지 / Reflow·Repaint / 왜 VDOM인가
[화면: 상단 설명 + 데모 전체]

“먼저 여기서 말하는 `DOM`은 브라우저가 화면을 그릴 때 사용하는 **실제 화면 트리**입니다.  
그리고 자바스크립트에서는 이 DOM에 접근할 때 보통 `Document`와 `Window`를 씁니다.

- `window`는 브라우저 환경의 전역 객체이고, 이벤트나 타이머 같은 ‘브라우저 실행 컨텍스트’를 다룹니다.
- `document`는 현재 페이지의 DOM 트리에 접근하는 객체예요. `createElement`, `createTextNode`, `querySelector`, `getElementById` 같은 API가 여기에 있습니다.

이 데모에서도 `document`를 이용해 DOM을 만들고(`createElement` 등), DOM을 비우고(`replaceChildren`), 바꾸는(`replaceChild`, `removeChild`) 동작을 합니다.

그런데 왜 DOM을 직접 자주 바꾸면 느려질 수 있을까요?
브라우저는 DOM이 바뀌면 곧바로 화면을 업데이트해야 합니다. 이때 대표적인 비용이 `Reflow`와 `Repaint`입니다.

- **Reflow**: 레이아웃을 다시 계산하는 비용입니다. 화면의 위치/크기/흐름이 달라지면 브라우저는 다시 계산해야 합니다.
- **Repaint**: 레이아웃이 거의 같아도 픽셀을 다시 칠해야 하는 비용입니다. 색, 배경, 그림자 등이 바뀌면 다시 그립니다.

그래서 ‘DOM을 바꾸는 횟수’와 ‘한 번에 바꾸는 범위’를 줄이는 전략이 중요합니다.”

“그럼 ‘DOM이 바뀌는 걸 감지’하려면 어떻게 할까요?  
대표적인 브라우저 API가 `MutationObserver`입니다.
MutationObserver는 DOM에서 `childList`, `attributes`, `characterData` 같은 변화가 생기면 콜백을 실행합니다.

다만 이 프로젝트는 MutationObserver처럼 ‘자동 감지’를 쓰기보다는, **사용자가 Patch 버튼을 누르는 시점**에 old/new를 만들고 **diff를 실행**합니다.  
즉, 여기서의 diff/patch는 ‘자동 감지기’가 아니라 ‘명시적 업데이트 엔진’ 역할을 합니다.”

“마지막으로 Virtual DOM이 왜 나오냐면, DOM을 그대로 비교/저장하기가 어렵기 때문입니다.
DOM은 브라우저가 관리하는 **변이 가능한 객체**이고, 부모/자식 관계가 얽힌 구조라서 ‘값(value) 트리처럼 비교’하기가 까다롭습니다.
그래서 DOM을 그대로 쓰지 않고, 같은 정보를 `VNode`라는 **순수 데이터 구조**로 변환해서 스냅샷처럼 다루고, diff/patch의 입력으로 사용합니다.”

---
## 2) 1단계 — DOM → VNode (약 1분) : 구조 / 공백 텍스트 / 필요한 이유
[화면: `container-phase-1-sample` + `output-phase-1-vdom-json`]

“1단계는 `DOM → VNode`입니다.  
여기서는 `container-phase-1-sample`에 이미 적혀 있는 HTML이 실제 DOM으로 존재하고, 이 DOM을 읽어서 VNode 스냅샷으로 만듭니다.

코드에서 핵심은 `domToVNode`입니다.  
이 함수는 DOM 노드의 종류에 따라 VNode 형태를 다르게 만듭니다.

1) 요소(Element)라면
- `type`: 태그명
- `props`: 속성 문자열 맵
- `children`: 자식 노드를 다시 VNode로 바꾼 배열

2) 텍스트(Text)라면
- `type`: `#text`
- `value`: 텍스트 내용

3) DocumentFragment라면
- `type`: `#document-fragment`
- `children`: fragment 내부 자식 VNode들

그리고 중요한 포인트가 하나 더 있어요.  
이 구현은 자식을 모을 때 `childNodes`를 사용합니다.
`childNodes`는 **요소 자식뿐 아니라 텍스트 노드도 포함**합니다.
그래서 HTML을 예쁘게 보기 위해 줄바꿈/들여쓰기까지 넣어두면 DOM 파서 입장에서는 그것이 텍스트 노드가 될 수 있고, 결과적으로 VNode에도 `#text`가 등장합니다.”

“여기서 누군가는 ‘공백 텍스트를 굳이 포함하냐’고 물을 수 있어요.  
다른 구현들은 학습 노이즈를 줄이기 위해 공백-only 텍스트를 필터링하기도 합니다.
하지만 이 데모는 입력 DOM을 최대한 있는 그대로 스냅샷에 반영해서, ‘diff가 어떤 노드를 기준으로 바꾸는지’를 투명하게 보여주려는 선택을 했습니다.
즉, 공백 텍스트는 불필요하다고 단정하기보다, 현재 구현의 “정직한 파싱 결과”로 받아들이면 됩니다.”

“정리하면 1단계는 diff를 수행하기 위한 **스냅샷 재료(VNode)**를 만드는 단계입니다.”

---
## 3) 2단계 — VNode → DOM (약 40~50초) : 렌더링 / 검증용 복원
[화면: `container-phase-2-mount`]

“2단계는 반대 흐름입니다.  
VNode 스냅샷을 다시 실제 DOM 노드로 복원해서 화면에 렌더합니다.

여기서 핵심 함수는 `vnodeToDom`이고, 컨테이너에 붙이는 역할을 `renderVNodeInto`가 합니다.

- 텍스트 VNode는 `document.createTextNode`로 텍스트 노드를 만들고
- fragment VNode는 `document.createDocumentFragment`로 자식들을 붙인 뒤
- 요소 VNode는 `document.createElement(type)`로 만든 다음 `props`를 `setAttribute`로 반영하고 자식들을 재귀적으로 붙입니다.

그리고 `renderVNodeInto(container, vnode)`는 `container.replaceChildren()`로 컨테이너를 비운 뒤, 루트 VNode를 통째로 붙이는 방식이라서 ‘초기 렌더/복원’에 적합합니다.”

“이 단계는 patch 기반 업데이트의 ‘최종 확인’을 위해서도 중요합니다.  
즉 ‘VNode로 표현한 구조가 실제 DOM으로도 동일하게 복원되는지’를 보여줍니다.”

---
## 4) 3단계 — Diff 알고리즘 (약 1분 10초) : 동작 방식 + 5가지 핵심 케이스
[화면: `control-phase-3-scenario` + `output-phase-3-patches`]

“3단계는 diff입니다.  
diff는 DOM을 직접 바꾸지 않고, **oldVNode vs newVNode**를 비교해서 patches[]라는 **명령 목록**을 계산합니다.
즉, diff의 결과물은 ‘무엇을 바꿀지’이지, 실제 ‘바꾸는 동작’은 아닙니다.”

“이 데모에서 patches[]에 등장하는 주요 op는 다음과 같습니다.
- `SET_TEXT`: 텍스트 노드의 value 교체
- `SET_PROP`: 속성 설정(추가/변경)
- `REMOVE_PROP`: 속성 제거
- `REPLACE_CHILDREN`: 자식 목록 전체 교체
- `REPLACE_NODE`: 해당 노드(서브트리)를 통째로 교체
- `REMOVE_NODE`: 해당 노드 제거

이제 ‘최소 변경을 찾기 위한 5가지 핵심 케이스’를 실제 코드의 분기 관점으로 설명하겠습니다.”

### (Diff 5가지 핵심 케이스)
“diffWalk의 주요 결정을 5개로 정리하면 다음과 같습니다.

1) **텍스트(Text) → 텍스트(Text)**  
   - `type`이 둘 다 `#text`이고, value가 다르면 `SET_TEXT`를 만든다.
   - value가 같으면 아무 것도 하지 않고 종료한다.

2) **노드 종류(Type)가 다름**  
   - 예: `div` ↔ `p`, `text` ↔ `element`처럼 `type`이 다르면  
   - 하위 비교를 더 해도 의미가 줄어들기 때문에 `REPLACE_NODE`로 통째 교체한다.

3) **요소 타입이 같음 → 속성 차이**  
   - `type`이 같은 요소라면 먼저 `diffProps`로 속성 차이를 계산한다.
   - 속성이 빠지면 `REMOVE_PROP`, 생기거나 값이 바뀌면 `SET_PROP`가 나온다.

4) **요소 타입이 같음 → 자식 비교(길이가 같을 때)**  
   - 자식 배열 길이가 같으면 인덱스별로 재귀 diff를 돈다.
   - 그래서 특정 깊이의 텍스트만 바뀌는 경우에는 `SET_TEXT`처럼 “국소 수정” 패치가 만들어질 수 있다.

5) **자식 길이가 다름 → 구조 교체**  
   - 자식 길이가 다르면 삽입 최적화 같은 복잡한 재배치를 하지 않고,
   - `REPLACE_CHILDREN`로 자식들을 통째로 갈아끼우는 정책을 사용한다.

이 5가지 케이스 덕분에 diff가 “최소 변경에 가까운” patch 목록을 만들 수 있습니다.”

“그리고 여기서 중요한 운영 원칙은 ‘diff 단계는 계산만 한다’는 점입니다.  
DOM에 실제로 적용하는 건 다음 단계의 patch입니다.”

---
## 5) 4단계 — Patch로 실제 DOM 반영 (약 50~60초)
[화면: `container-phase-4-mount` + 상태 메시지]

“4단계는 `patch`입니다.
여기서는 patches[]를 실제 DOM에 적용합니다.

패치 적용 함수는 `applyPatches(domRoot, patches)`입니다.
applyPatches는 patches를 순서대로 실행하고, 각 op마다 `applyOnePatch`에서 switch로 처리합니다.

patch의 핵심은 `path`입니다.
- path는 루트 기준 childNodes 인덱스 경로
- `path: []`는 루트 자신
- `path: [0, 2]`는 루트의 0번째 자식 → 그 자식의 2번째 자식 위치

`getDomNodeAtPath(root, path)`로 실제 DOM 노드를 찾아서,
- `SET_TEXT`는 `nodeValue`만 바꾸고
- `SET_PROP`/`REMOVE_PROP`는 `setAttribute`/`removeAttribute`로 속성만 바꿉니다.

반면 구조 교체가 필요할 때는
- `REPLACE_CHILDREN`: 해당 요소의 자식들을 비우고 새 children을 다시 렌더
- `REPLACE_NODE`: 해당 노드를 새 VNode로 만들고 실제 DOM에서 교체

즉, 실제 DOM 반영은 패치 op의 종류에 따라 ‘값 수정’ 또는 ‘서브트리 교체’로 나뉩니다.”

---
## 6) 5단계 — 통합 워크숍: 실제/테스트 분리 + 히스토리 (약 1분 20초)
[화면: `container-phase-5-real-mount`, `control-phase-5-test-html`, `Patch/뒤로/앞으로`]

“이제 5단계는 과제형 UI 흐름입니다.
여기서는 “실제 영역”과 “테스트 영역”을 분리합니다.

- 실제 영역: `container-phase-5-real-mount`
  - 이곳은 patch 결과만 반영합니다.
- 테스트 영역: `control-phase-5-test-html`(textarea)
  - 사용자가 여기를 자유롭게 편집해 ‘다음 상태’를 입력합니다.

중요한 포인트는 타이밍입니다.
textarea를 수정하는 순간에는 DOM이 바뀌지 않습니다.
DOM 변경은 오로지 Patch 버튼 클릭 시점에 일어납니다.”

### Patch 버튼 클릭 시 내부 흐름
“Patch 버튼을 누르면 `phase5-workshop.js`의 `onPatch()`가 실행됩니다.

1) 기준 oldVNode  
   - `history[historyIndex]`에서 committed VNode를 가져옵니다.
2) 새 상태 newVNode  
   - textarea의 HTML을 `htmlStringToRootVNode()`로 파싱해서 VNode를 만듭니다.
3) diff  
   - `diffVNode(committed, testVNode)`로 patches[]를 계산합니다.
4) patch  
   - `applyPatches(realRoot, patches)`로 실제 영역만 갱신합니다.
5) history 커밋  
   - 이후 `history`에 testVNode 스냅샷을 저장하고, undo/redo가 되도록 커서를 이동합니다.”

### 뒤로/앞으로 버튼
“뒤로/앞으로는 다시 diff를 계산하지 않습니다.
저장해둔 history 스냅샷을 읽어서 `renderVNodeInto`로 실제 영역과 textarea를 동시에 복원합니다.
그래서 히스토리 이동은 ‘시간 여행 UI’처럼 보이게 됩니다.”

---
## 7) 6단계 — 단위테스트 PASS/FAIL 표시 (약 15~20초)
[화면: `단위테스트(6단계)`]

“마지막으로 6단계는 이 구현의 핵심 함수들에 대한 단위테스트 결과를 웹페이지에서 바로 보여주는 영역입니다.  
`js/unit-tests.js`가 브라우저 내에서 간단한 러너로 테스트를 실행하고, PASS/FAIL과 실패 로그를 `output-phase-6-status`, `output-phase-6-log`에 출력합니다.”

“이렇게 데모뿐 아니라 검증(테스트)을 같이 보여주는 것이 요구사항에도 맞습니다.”

---
## 8) React는 어떻게 이 흐름을 쓰나? (개념·흐름, 약 45~60초)
[화면: 데모 흐름 다시 한 번 요약]

“마지막으로 React는 실제 DOM을 바꿀 때 Virtual DOM과 diff 아이디어를 어떤 식으로 쓰냐를 정리하겠습니다.

React는 사용자의 상태 업데이트가 일어나면,
1) 새로운 UI 표현(가상 트리)을 만들고
2) 이전 표현과 비교해서 변경이 필요한 부분을 계산한 뒤
3) 실제 DOM을 최소한으로 갱신합니다.

내부적으로는 fiber 기반으로 작업을 쪼개고 스케줄링을 하지만,
큰 그림의 개념은 이 데모와 같습니다.
- ‘변경을 계산하는 단계’(diff/reconciliation)
- ‘실제 DOM에 커밋하는 단계’(patch/commit)

차이점은 이 데모가 diff/patch를 학습 목적에서 직접 드러내고, React는 그 과정을 내부 구현으로 숨겨놓는다는 점입니다.”

---
## 마무리 (20~25초)
“정리하면 VNode는 스냅샷이고, diff는 old/new 차이를 patches[]로 계산하며, patch는 path를 따라 실제 DOM을 수정합니다.  
5단계는 textarea 편집을 new 스냅샷으로 만들고 diff/patch로 실제 영역만 업데이트하며, 히스토리로 뒤로/앞으로 복원까지 보여줍니다.  
React도 같은 큰 방향—‘차이 계산 후 최소 변경 커밋’—을 사용한다는 점이 핵심입니다.”