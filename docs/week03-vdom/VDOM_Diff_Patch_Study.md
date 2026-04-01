# VDOM Diff Patch 과제 단계별 학습 문서 (1~5)

## 목표 한 줄 요약
브라우저의 **DOM(실제 화면 트리)**을 **VNode(순수 데이터 트리)**로 바꾸고, **diff로 변화(patches[])를 계산한 뒤**, **patch로 실제 DOM을 최소 변경 갱신**하는 흐름을 이해한다.

---

## 0. 핵심 개념 3개
- **VNode**: DOM을 그대로 들고 있는 게 아니라 `type / props / children / value`로 표현한 “값 트리(스냅샷)”
- **diff**: 이전 VNode 스냅샷과 다음 VNode 스냅샷을 비교해서 **patches[](명령 목록)** 생성 (DOM은 건드리지 않음)
- **patch**: 명령 목록(patches[])을 실제 DOM에 적용 (DOM 변경 발생)

---

## 1단계: DOM → VNode (domToVNode)
### 하는 일
실제 DOM 트리를 읽어 **VNode 스냅샷**으로 변환한다.

### 포인트(표현 규칙)
- 요소(Element): `type`은 태그명, `props`는 속성들의 값, `children`은 자식 VNode들
- 텍스트(Text): `type`은 텍스트 노드, `value`는 텍스트 내용
- Fragment(확장): 겉에 감싸는 태그 없이 자식들만 묶어서 표현

### 왜 VNode에 공백 텍스트도 들어가나?
DOM에는 “보이지 않는 줄바꿈/공백”도 텍스트 노드로 존재할 수 있다.  
이 프로젝트의 VNode 변환은 자식 노드를 그대로 수집하기 때문에, 줄바꿈/들여쓰기 같은 정보까지 스냅샷에 포함될 수 있다.

### 학습 체크포인트
- 초기 샘플의 VNode 출력에서 텍스트 노드가 어떻게 나타나는지 확인

---

## 2단계: VNode → DOM (vnodeToDom, renderVNodeInto)
### 하는 일
VNode 스냅샷을 다시 실제 DOM 노드로 복원한다. 즉, “렌더링”을 수행한다.

### 입력/출력 관점
- 입력: VNode
- 출력: 브라우저의 실제 Node(요소/텍스트/fragment)

### 포인트
- 텍스트 VNode는 텍스트 노드로 복원한다.
- fragment VNode는 fragment로 만들고 자식들을 함께 붙인다.
- 요소 VNode는 태그를 만들고 `props`를 `setAttribute`로 반영한 뒤 자식을 재귀적으로 붙인다.
- `renderVNodeInto(container, vnode)`는 컨테이너를 비운 뒤 루트 VNode를 통째로 붙이는 “전체 렌더” 흐름이다.

### 학습 체크포인트
- 히스토리 복원처럼 “통째로 다시 그리는” 상황에서 2단계가 쓰이는지 관찰

---

## 3단계: Diff (diffVNode)
### 하는 일
이전 VNode와 다음 VNode의 차이를 비교해서 **patches[](연산 목록)**을 만든다.

이 단계에서는 DOM 변경이 일어나지 않는다.  
결과물은 “어디를, 어떻게 바꿀지”를 담은 명령 목록이다.

### patches[]의 연산(op) 종류
- `SET_TEXT`: 텍스트 노드의 내용을 교체
- `SET_PROP`: 요소 속성을 추가/변경
- `REMOVE_PROP`: 요소 속성 제거
- `REPLACE_CHILDREN`: 자식 목록을 통째로 교체(단순화 정책)
- `REPLACE_NODE`: 해당 노드(서브트리)를 통째로 새 VNode로 교체
- `REMOVE_NODE`: 노드를 제거

### path(주소 체계)
- `path: []`는 루트 위치
- `path: [0, 2]`는 루트의 0번째 자식 → 그 자식의 2번째 자식 위치

### 학습 포인트
- 같은 요소 타입이면:
  1) 먼저 `props` 차이를 찾고
  2) 다음으로 `children` 차이를 찾는다.
- 자식 개수가 다르면 중간 정렬 최적화 대신 자식을 통째로 교체한다.

### 학습 체크포인트
- 3단계 데모에서 시나리오를 바꿔 patches(op 종류/개수)가 어떻게 달라지는지 비교

---

## 4단계: Patch (applyPatches, applyOnePatch)
### 하는 일
diff가 만든 patches[]를 실제 DOM에 적용한다.

### 입력/출력
- 입력: `(domRoot, patches[])`
- 출력: 루트가 교체되는 경우 새 루트를 반환(호출부에서 처리)

### 동작 포인트
- `path`를 기준으로 실제 DOM에서 해당 노드를 찾아 들어간다.
- `SET_TEXT / SET_PROP / REMOVE_PROP`는 해당 노드의 값/속성만 수정한다.
- `REPLACE_CHILDREN / REPLACE_NODE` 같은 교체 연산은 필요 시 내부적으로 새 DOM을 생성한다.

### 학습 체크포인트
- DevTools에서 path가 가리키는 위치에서 실제로 변경이 발생하는지 확인

---

## 5단계: 과제형 통합 워크숍 (phase5-workshop.js: initWorkshop/onPatch/onBack/onForward)
주요 구성 요소
- **실제 영역**: `container-phase-5-real-mount`
- **테스트 영역**: `control-phase-5-test-html`(textarea)
- **버튼**: `control-phase-5-patch`, `control-phase-5-back`, `control-phase-5-forward`
- **제어 로직**: `js/phase5-workshop.js`

### 목표
- 실제 영역 DOM은 **Patch로만** 갱신한다.
- 테스트 영역은 사용자가 HTML을 자유롭게 편집한다.
- 히스토리를 저장해 **뒤로/앞으로** 이동할 수 있어야 한다.

### 핵심 흐름(버튼 기준)
1. 초기화(`initWorkshop`)
   - 1단계 샘플 DOM을 VNode로 만들고
   - id 충돌 방지를 위해 id 제거 복제본을 만든 뒤
   - history에 커밋 스냅샷을 저장한다.
2. 사용자 입력
   - textarea 편집은 문자열 입력 단계이며, 실제 DOM은 즉시 바뀌지 않는다.
3. Patch 버튼 클릭(`onPatch`)
   - committed VNode(현재 history 커밋)
   - test VNode(textarea HTML을 파싱한 VNode)
   - `diffVNode(committed, testVNode)`로 patches 계산
   - `applyPatches(realRoot, patches)`로 실제 영역만 갱신
   - test VNode 스냅샷을 history에 새 커밋으로 저장
4. 뒤로/앞으로 버튼
   - historyIndex만 이동하고
   - `syncUIFromHistory()`로 실제 영역과 textarea를 함께 복원한다.

### 학습 체크포인트
- textarea 입력만으로 실제 영역이 즉시 바뀌지 않는지 확인
- Patch 후 상태 메시지에 patch 개수/커밋 수가 갱신되는지 확인
- 뒤로/앞으로에서 실제 영역과 textarea가 같이 복원되는지 확인

---

## 결론(한 문장)
DOM을 VNode 스냅샷으로 표현하고(diff 준비), 두 VNode의 차이를 patches로 계산한 뒤(patch 명령 생성), 실제 DOM에는 필요한 부분만 적용한다(minimal update).