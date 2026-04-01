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

### (예상 질문·내가 정리한 답) “DOM도 정교하게 조작할 수 있다고 들었는데, 그러면 VDOM은 왜 있나요?”

“말씀하신 대로, 브라우저 API만으로도 DOM은 **아주 정교하게** 바꿀 수 있고, 성능이 중요하면 `DocumentFragment`나 읽기/쓰기 배치 같은 기법도 씁니다.

VDOM이 생긴 이유는 ‘DOM이 못 해서’가 아니라 **앱을 짜는 방식**에 가깝습니다.

- 상태가 바뀔 때마다 ‘지금 화면이 이렇게 생겼으면 좋겠다’를 **데이터(트리)로 표현**하면, 개발자가 매번 **어떤 노드를 어디서 고칠지**를 수동으로 추적하지 않아도 됩니다. VDOM은 그 목표 화면을 **값**으로 두기 위한 중간 표현이에요.
- **이전 트리 vs 다음 트리**를 비교해 **필요한 최소 변경**만 DOM에 반영하는 **규칙(reconciliation)**을 코드로 고정하기 쉽습니다. 규모가 커질수록 ‘직접 DOM’은 동기화 누락 버그가 나기 쉽고, VDOM 스타일은 보통 **상태 → 렌더 트리 → DOM** 한 방향을 강하게 가져갑니다.
- 성능만 놓고 보면 **항상** VDOM이 직접 DOM보다 빠른 건 아닙니다. 다만 프레임워크는 대부분의 화면에 **무난한 기본 업데이트 전략**을 주고, 필요하면 메모이제이션 등으로 좁히는 식이죠.

한 줄로 말하면, DOM은 **도구**이고 VDOM은 **‘원하는 UI를 데이터로 말한 뒤, 차이를 규칙적으로 실제 DOM에 반영하는 설계’**에 가깝습니다.”

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

4) **Document 노드**(`document` 자체가 들어온 경우)라면  
- 최상위를 `document.documentElement`(보통 `<html>`)로 잡고, 그 노드에 대해 `domToVNode`를 **한 번 더** 호출합니다.

5) **인자가 null/undefined**이면  
- `null`을 반환합니다.

6) **그 외 nodeType**(주석, 처리명령 등, 과제 범위 밖으로 보는 노드)  
- `null`을 반환하고, 부모 쪽 `childNodesToVNodes`에서는 `children` 배열에 **넣지 않습니다**.

### (예상 질문·내가 정리한 답) “`domToVNode`는 몇 가지 경우로 나뉘나요?”

“맨 앞에서 `node == null`이면 **null** 하나로 끝이고, 그다음 **`switch (node.nodeType)`**로 갑니다. 정리하면 **① 요소 ② 텍스트 ③ document(→루트 요소로 재귀) ④ document-fragment ⑤ 그 외(→null)** 다섯 갈래이고, **입력 null**까지 포함하면 **‘최상위 분기’는 여섯 흐름**이라고 말해도 됩니다.

자식을 모을 때는 `childNodes`를 돌면서 각각 `domToVNode`를 부르는데, 여기서 **null이 나온 노드**(예: 주석)는 최종 `children`에서 빠집니다.”

### (예상 질문·다른 조·청중) “`domToVNode`/`VNode` 모양을 이렇게 정한 **근거**는 무엇인가요?”

“발표에서 짧게 답할 수 있는 버전은 이렇게 잡을 수 있습니다.

- **diff 입력**으로 쓰려면 태그명·속성 문자열·텍스트·자식 순서만 **순수 객체**로 뽑아야 해서, `getAttributeNames` + `getAttribute`, 텍스트는 `nodeValue`, 자식은 **`childNodes`**(텍스트 노드까지 포함)로 모았습니다. `children` 프로퍼티만 쓰면 공백 텍스트가 사라져 원본 DOM과 어긋날 수 있어요.
- **`#text`, `#document-fragment`**처럼 `#` 접두사는 **실제 HTML 태그명과 충돌하지 않게** 하려는 약속입니다.
- 주석 등은 범위 밖으로 **`null`로 버리는 것**도 ‘과제에서 비교할 필드’를 줄이기 위한 선택입니다.

더 깊이 물으면 `vdom.js` 파일 맨 위 블록 주석에 **‘DOM을 그대로 diff에 쓰기 어려운 이유’**와 **VNode 규칙**을 적어 둔 것을 근거로 제시할 수 있습니다.”

### (예상 질문) “VNode 구조를 바꾸거나 다른 트리 모델을 쓰면, 다시 DOM과 맞출 수 있다는 **확신**은 어디서 오나요?”

“**이론적 확신**이라기보다 **짝을 맞춘 두 함수 + 검증**입니다.

- 이 프로젝트에서는 **`domToVNode`와 `vnodeToDom`**가 같은 필드 약속을 공유합니다. 구조를 바꾸면 **둘 다 같이 바꿔야** 하고, 그러지 않으면 라운드트립이 깨집니다.
- **6단계 단위테스트**와 1·2단계 데모처럼 ‘DOM → VNode → DOM’을 눈으로 보는 흐름이 **회귀 확인** 역할을 합니다.
- **diff/patch**는 `diffVNode`·`applyPatches`가 **같은 VNode 스키마**를 전제로 하므로, 스키마를 바꾸면 diff 분기와 patch op 처리도 **함께** 수정해야 합니다.

즉 ‘한 번 정한 추상화는 영원하다’가 아니라, **변환 쌍과 diff/patch를 같은 규약으로 묶어 두고, 테스트·데모로 깨지는 지점을 줄인다**가 현실적인 답에 가깝습니다.”

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

### diff가 patch 코드(객체)를 만드는 방식 (`diff.js` 흐름)

“조금만 코드 관점으로 붙이면, 패치는 **재귀를 돌면서 `patches` 배열에 객체를 push** 해서 만듭니다.

- **`diffVNode(oldVNode, newVNode)`**는 맨 처음 **`diffWalk(oldV, newV, [])`**를 부릅니다.  
  세 번째 인자 `path`가 **처음에는 빈 배열 `[]`**이고, 이게 곧 ‘지금 비교하는 쌍이 **루트 VNode**에 해당한다’는 뜻입니다. (`diff.js` 주석대로, **컨테이너의 단일 자식에 해당하는 VNode**가 곧 diff의 루트일 때 그 노드의 path는 `[]`.)

- **`diffWalk` 안에서** 타입이 다른지·텍스트 값이 다른지·한쪽이 null인지를 보면서, 필요할 때마다  
  `{ op: 'SET_TEXT', path: path.slice(), value: ... }` 처럼 **flat object 한 개**를 만들어 **`patches`에 넣고 return** 합니다.  
  `path.slice()`는 **지금 시점의 path 배열을 복사**해서 패치에 고정해 두는 것이라, 나중에 재귀가 path를 바꿔도 이미 만들어 둔 패치의 좌표는 안 바뀝니다.

- **같은 요소 타입**이면 `diffProps`로 속성 차이만큼 `SET_PROP` / `REMOVE_PROP`를 push하고, 이어서 `diffChildren`으로 자식을 봅니다.

- **`diffChildren`**에서 자식 배열 길이가 **같으면**, 인덱스 `i`마다  
  **`diffWalk(oc[i], nc[i], path.concat(i))`** 를 호출합니다.  
  즉 **‘부모까지의 path’ 뒤에 자식 방번호 `i`를 이어 붙인 path’**로 한 단계 더 들어가 비교합니다.  
  그래서 패치에 실리는 `path`는 **항상 `[첫째 자식 인덱스, 둘째 자식 인덱스, …]` 형태의 숫자 배열**이 됩니다.

- 자식 **개수가 다르면** 인덱스별 재귀를 포기하고, **`REPLACE_CHILDREN` 하나**만 push 합니다(이때도 `path`는 ‘자식들을 통째로 갈아끼울 **그 부모 요소**’를 가리킴).

정리하면, **patch 코드 = `{ op, path, …payload }` 모양의 평범한 객체**이고, diff는 **트리를 DFS처럼 내려가며 ‘어디(path)에서 무엇(op)을 할지’만 적어 낸 목록**입니다. 실제 DOM 손대기는 **다음 단계 `applyPatches`** 입니다.”

### path를 따라 ‘한 단계씩 내려가기’ — diff는 쌓고, patch는 따라간다

“`path`를 한 번에 이해하려면 **‘트리를 내려가는 방향’**을 두 갈래로 나누면 됩니다. **diff는 내려갈 때마다 숫자를 뒤에 붙여 기록**하고, **patch는 기록된 숫자를 앞에서부터 읽으며 같은 길을 따라 내려가** 실제 노드를 잡습니다.

**(1) diff 쪽 — 재귀로 내려갈수록 path가 길어진다**

- 처음: `diffWalk(old, new, [])` → 지금 보고 있는 쌍은 **루트**이므로 path는 **`[]`** (빈 배열).
- 루트의 자식을 인덱스 순으로 볼 때, **0번 자식 쌍**으로 들어가면 `path.concat(0)` → **`[0]`**.  
  여기서 또 자식 **2번**으로 들어가면 `path.concat(2)` → **`[0, 2]`**.
- 그래서 실제 코드 흐름은 ‘루트에서 출발 → 0번 방으로 들어감 → 그 안에서 2번 방으로 들어감’과 같고, **맨 아래에서 차이가 났다**면 패치에는 **`path: [0, 2]`**처럼 **그 깊이까지의 방 번호가 순서대로 저장**됩니다.

**(2) 작은 예 — VNode 관점에서 한 줄로 따라가 보기**

- 루트가 `div`이고, `children[0]`이 `section`, 그 `section`의 `children[2]`가 **텍스트 노드**라고 합시다.  
  그 텍스트만 old/new에서 달라지면, 패치는 대략 **`{ op: 'SET_TEXT', path: [0, 2], value: '…' }`** 형태가 됩니다.
- 읽는 법: **`0`** → 루트 `div`의 첫 자식(`section`)까지 내려감 → **`2`** → 그 `section`의 세 번째 자식(인덱스 2)까지 내려감 → 그 노드가 바로 **바꿀 텍스트 노드**.

**(3) patch 쪽 — `getDomNodeAtPath`는 배열을 앞에서부터 한 칸씩 내려간다**

- `path`가 `[]`이면 **루트 자신**이 대상입니다. 내려가지 않습니다.
- `path`가 `[0, 2]`이면, **`patch.js`의 `getDomNodeAtPath`**와 같이  
  `node = root`에서 시작해서  
  `node = node.childNodes[0]` (첫 번째 숫자만큼 내려감) →  
  `node = node.childNodes[2]` (두 번째 숫자만큼 또 내려감)  
  …를 **순서대로 반복**합니다.
- 즉 diff가 재귀 들어갈 때 붙였던 인덱스 순서와, patch가 `childNodes[i]`로 따라가는 순서가 **같은 길**입니다.”

### `path`와 숫자 하나(예: `path: [1]`)는 무엇을 의미하나요?

- **`path`**: 이 데모에서 **`applyPatches`에 넘긴 DOM 루트**를 기준으로, **`childNodes`의 인덱스를 순서대로 따라 내려가는 길**입니다.  
  - `path: []` → 루트 **자기 자신**  
  - `path: [0]` → 루트의 **0번째 자식 노드**(`childNodes[0]`)  
  - `path: [0, 2]` → 루트의 0번 자식으로 간 뒤, 그 노드의 **2번째 자식**

- **배열 안의 숫자 `1`**은 “두 번째 자식”을 뜻합니다. **의미상 ‘DOM에서 1번째 요소’가 아니라, `childNodes` 목록에서 인덱스 1** 이에요.  
  그래서 HTML을 줄바꿈·들여쓰기로 예쁘게 쓰면, 태그 **앞에 공백만 있는 텍스트 노드**가 끼어 **0번이 `#text`**, **1번이 실제 `h2` 같은 요소**가 되는 일이 흔합니다. 그 경우 발표 JSON에 **`path: [1]`**이 찍히면, **“첫 줄바꿈 공백이 0번, 고치려는 제목이 1번”**이라고 설명하면 됩니다.

- diff 쪽은 VNode의 **`children` 배열 인덱스**로 path를 쌓지만, 이 프로젝트는 마운트된 DOM이 같은 구조를 따르기 때문에 **패치 적용 시 그 인덱스가 실제 `childNodes`와 맞물리도록** 맞춰 둔 그림이라고 이해하면 됩니다.”

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

“3단계 대본에서 말한 **‘path를 따라 내려가기’**가 여기서 구체화됩니다.  
`getDomNodeAtPath(root, path)`는 **`path` 배열을 0번 원소부터 순서대로** 읽으며, 매번 **`현재 노드.childNodes[그 인덱스]`**로 한 층씩 내려가 최종 노드를 얻습니다.  
중간에 **Text 노드**가 있어도 `childNodes` 목록의 한 칸이므로, 숫자만 맞으면 그대로 따라갑니다.”

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
## 9) 부록 — 내가 정리한 ‘청중·타팀 질문’과 권할 만한 표현

발표 연습이나 **다른 조 발표 후 질문**할 때, 톤은 짧고 정중하게 한 문장씩이 좋습니다. 아래는 내가 실제로 묻고 싶었던 것과, 대본 흐름에 맞게 다듬은 문장입니다.

### A. 구현 순서 (어떤 팀이든 공통으로 통할 만한 질문)

- “기능을 **어떤 순서로** 개발하셨는지 궁금합니다. 예를 들어 VNode 정의 → DOM↔VNode → diff → patch 순이었는지, 아니면 데모 UI부터 잡으셨는지요? 그 순서를 정한 **이유**가 있을까요?”

### B. DOM → VNode 설계 근거 (`domToVNode`에 해당)

- “DOM을 VNode로 옮기는 부분에서, 노드 타입·props·children을 **이렇게 모델링한 근거**나 참고한 자료(다른 구현, 문서 등)가 있었는지 여쭤보고 싶습니다.”

### C. 트리 구조 변경·라운드트립·검증

- “VNode 구조나 자식 표현을 **다르게 잡으면** DOM과의 대응이 어긋날 수 있을 것 같은데, **라운드트립(변환 왕복)**이나 패치 적용이 기대대로 되는지 **검증하신 방법**(테스트, 불변식, 시나리오)이 있었나요?”

### D. 질문할 때 보조 팁

- 코드 이름이 팀마다 다를 수 있으므로, **`domToVNode`** 대신 한 번 **“DOM에서 가상 트리로 옮기는 변환”**이라고 풀어 말한 뒤 함수명을 묻는 편이 안전합니다.
- “되돌림”은 **언두(undo)**와 **역변환(동일 DOM 재구성)**이 헷갈릴 수 있어, 의도에 맞게 위 C처럼 **라운드트립·검증**을 쓰는 것을 권합니다.

---
## 마무리 (20~25초)
“정리하면 VNode는 스냅샷이고, diff는 old/new 차이를 patches[]로 계산하며, patch는 path를 따라 실제 DOM을 수정합니다.  
5단계는 textarea 편집을 new 스냅샷으로 만들고 diff/patch로 실제 영역만 업데이트하며, 히스토리로 뒤로/앞으로 복원까지 보여줍니다.  
React도 같은 큰 방향—‘차이 계산 후 최소 변경 커밋’—을 사용한다는 점이 핵심입니다.”