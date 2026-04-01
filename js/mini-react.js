/**
 * mini-react.js — Week 4: FunctionComponent · useState · useEffect · useMemo
 *
 * - Week 3의 VNode / diffVNode / applyPatches 와 연결한다.
 * - 훅·상태는 루트 FunctionComponent 에서만 사용(과제 제약).
 * - 자식은 h(ChildFn, props) 형태로 호출되며, 호출 시 activeComponent 를 끄 stateless 만 허용.
 */
// ─── 구현 본문 시작 ───
(function (global) {
  // 전역 IIFE: 아래에서 만든 걸 global(보통 window)에 붙인다
  var activeComponent = null; // 지금 renderFn 실행 중인 FunctionComponent 인스턴스(훅이 이걸 본다)

  function shallowDepsEqual(a, b) {
    // useEffect/useMemo 의 deps 배열을 얕게 비교
    if (a === b) return true; // 같은 참조면 무조건 같음
    if (a == null || b == null) return false; // 하나만 null/undefined 면 다름
    if (!Array.isArray(a) || !Array.isArray(b)) return false; // 배열 아니면 비교 안 함
    if (a.length !== b.length) return false; // 길이 다르면 다름
    for (var i = 0; i < a.length; i++) {
      // deps 원소 단위 순회
      if (!Object.is(a[i], b[i])) return false; // 인덱스마다 Object.is 로 비교
    }
    return true; // 모든 칸이 같음
  } // shallowDepsEqual 끝

  function assignProps(target, src) {
    // h() 에서 props 복사용: target 을 변형해 반환
    if (!src) return target; // src 없으면 target 그대로
    for (var k in src) {
      // src 의 열거 가능 키
      if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k]; // 자기 상속 키만 복사
    }
    return target; // 합쳐진 객체
  } // assignProps 끝

  function normalizeChildren(args) {
    // h 의 3번째 인자부터 가변 인자를 평탄한 자식 배열로
    var out = []; // 최종 VNode 자식 목록
    function walk(x) {
      // 자식 하나(또는 배열)를 재귀로 펼침
      if (x == null || x === false) return; // React 스타일: 렌더 스킵
      if (Array.isArray(x)) {
        // 중첩 배열 허용
        for (var i = 0; i < x.length; i++) walk(x[i]); // 배열이면 재귀로 펼침
      } else {
        out.push(x); // 리프 VNode 하나
      }
    } // walk 끝
    for (var j = 0; j < args.length; j++) walk(args[j]); // 인자마다 walk
    return out; // 평탄화된 children
  } // normalizeChildren 끝

  /**
   * 요소 또는 무상태 자식 컴포넌트(함수)를 VNode 로 만든다.
   * @param {string|function} type
   * @param {object|null|undefined} props
   */
  function h(type, props) {
    // 태그명 문자열 또는 자식 함수(컴포넌트)를 VNode 트리로 만든다
    var childArgs = Array.prototype.slice.call(arguments, 2); // 3번째~ 가 자식들
    props = props == null ? {} : assignProps({}, props); // null 이면 빈 객체, 아니면 얕은 복사

    if (typeof type === 'function') {
      // 자식 컴포넌트: 훅 못 쓰게 activeComponent 를 잠깐 끈다
      var prev = activeComponent; // 부모 렌더 컨텍스트 저장
      activeComponent = null; // 자식 안에서는 useState 등 금지
      try {
        return type(props); // 자식 함수(props) → 그 반환이 VNode
      } finally {
        activeComponent = prev; // 부모 컨텍스트 복구 (성공/실패 무관)
      }
    } // function type 분기 끝

    return {
      // 일반 요소 VNode
      type: type, // 태그명 예: 'div'
      props: props, // 속성·이벤트
      children: normalizeChildren(childArgs), // 정규화된 자식 VNode 배열
    }; // VNode 객체 반환
  } // h 끝

  function hText(text) {
    // 텍스트 잎 노드 VNode
    var t = typeof VDOM_TEXT !== 'undefined' ? VDOM_TEXT : '#text'; // Week3 텍스트 타입 심볼
    return { type: t, value: text == null ? '' : String(text) }; // value 만 가짐
  } // hText 끝

  function scheduleUpdate(comp) {
    // setState 등에서 같은 틱의 update 를 microtask 한 번으로 묶음
    if (comp._updateScheduled) return; // 이미 예약됨 → 중복 스킵
    comp._updateScheduled = true; // 예약 플래그 올림
    queueMicrotask(function () {
      // 현재 스택이 끝난 직후 실행
      comp._updateScheduled = false; // 실행 직전 플래그 내림
      comp.update(); // 실제 diff/patch 리렌더
    }); // microtask 콜백 끝
  } // scheduleUpdate 끝

  /** VNode를 return 하는 렌더 함수(renderFn)를 감싸는 컴포넌트 인스턴스 생성자 */
  function FunctionComponent(renderFn) { // 선언부
    if (typeof renderFn !== 'function') throw new Error('FunctionComponent: renderFn required'); // renderFn 은 반드시 함수
    this.renderFn = renderFn; // mount/update 때 호출해 새 VNode 를 얻음
    this.hooks = []; // useState / useEffect / useMemo 슬롯이 순서대로 쌓임
    this.container = null; // mount 시 전달된 DOM 컨테이너
    this.domRoot = null; // patch 기준 루트 DOM 노드(container 첫 자식)
    this.oldVNode = null; // 직전 렌더의 VNode (diff 대상)
    this.hookIndex = 0; // 렌더마다 0부터 올려 훅 호출 순서와 hooks[i] 를 맞춤
    this._updateScheduled = false; // scheduleUpdate 중복 microtask 방지 플래그
  }

  /** 첫 렌더: renderFn → vnodeToDom → 컨테이너에 붙임 */
  FunctionComponent.prototype.mount = function (container) {
    if (!container) throw new Error('mount: container required'); // 붙일 대상 필수
    this.container = container; // 이후 update 에서 동일 컨테이너 사용
    this.hookIndex = 0; // 훅을 처음부터 순회
    activeComponent = this; // renderFn·훅이 이 인스턴스를 가리키게 함
    var vnode;
    try {
      vnode = this.renderFn(); // VNode 트리 계산 (내부에서 h / useState 등)
    } finally {
      activeComponent = null; // 렌더 종료 후 전역 활성 컴포넌트 해제
    }
    this.oldVNode = vnode; // 다음 diff 를 위해 보관
    container.replaceChildren(); // 컨테이너 비움
    var n = vnodeToDom(vnode); // Week 3: VNode → 실제 DOM
    if (n) container.appendChild(n); // 루트 노드 한 개 붙임
    this.domRoot = container.firstChild; // patch 진입점
    this.flushEffects(); // useEffect 는 DOM 반영 뒤 microtask 에서 실행
  };

  /** 이후 렌더: 새 VNode 생성 후 diff/patch 로 DOM 최소 변경 */
  FunctionComponent.prototype.update = function () {
    if (!this.container || this.domRoot == null) return; // 마운트 전이면 무시
    this.hookIndex = 0; // 훅 순서를 렌더마다 동일하게 재현
    activeComponent = this;
    var newVNode;
    try {
      newVNode = this.renderFn(); // 상태 반영된 최신 VNode
    } finally {
      activeComponent = null;
    }
    var patches = diffVNode(this.oldVNode, newVNode); // Week 3: 변경 목록
    this.domRoot = applyPatches(this.domRoot, patches); // Week 3: DOM 적용 후 루트 갱신
    this.oldVNode = newVNode; // 다음 diff 용 스냅샷
    this.flushEffects(); // 이번 커밋에 돌 effect 예약 처리
  };

  /** mount/update 직후 예약: effect 본문은 queueMicrotask 안에서 실행 */
  FunctionComponent.prototype.flushEffects = function () {
    var self = this;
    queueMicrotask(function () {
      for (var i = 0; i < self.hooks.length; i++) {
        var hook = self.hooks[i];
        if (!hook || hook.type !== 'effect' || !hook.pendingRun) continue; // effect 아니거나 이번에 안 돌 슬롯 스킵
        if (hook.cleanup) {
          try {
            hook.cleanup(); // 이전 effect 가 반환한 정리 함수
          } catch (e) {
            console.error('[mini-react] effect cleanup', e);
          }
          hook.cleanup = null;
        }
        try {
          var ret = hook.fn(); // effect 본문
          if (typeof ret === 'function') hook.cleanup = ret; // 반환 함수는 다음 실행 전 cleanup
        } catch (e2) {
          console.error('[mini-react] effect', e2);
        }
        hook.pendingRun = false; // 이번 틱에서 처리 완료
      }
    });
  };

  /** 상태 슬롯: [값, setState] 반환, setState 시 scheduleUpdate 로 리렌더 */
  function useState(initial) {
    var comp = activeComponent; // 반드시 renderFn 실행 중(활성 컴포넌트)이어야 함
    if (!comp) throw new Error('useState: 루트 컴포넌트에서만 사용할 수 있습니다.');

    var i = comp.hookIndex++; // 이번 렌더에서 몇 번째 훅인지
    if (!comp.hooks[i]) {
      var initVal = typeof initial === 'function' ? initial() : initial; // 초기값 또는 lazy 초기화
      comp.hooks[i] = { type: 'state', value: initVal }; // 첫 렌더에서만 슬롯 생성
    }
    var hook = comp.hooks[i];
    if (hook.type !== 'state') throw new Error('useState: 훅 순서가 바뀌었습니다.'); // if 로 훅 건너뛰면 깨짐

    var setState = function (next) {
      var nextVal = typeof next === 'function' ? next(hook.value) : next; // setCount(c => c+1) 형태 지원
      if (Object.is(nextVal, hook.value)) return; // 같으면 리렌더 생략
      hook.value = nextVal; // 슬롯에 반영
      scheduleUpdate(comp); // microtask 에서 update 예약
    };

    return [hook.value, setState];
  }

  /** 부수 효과 슬롯: deps 변경 여부에 따라 pendingRun 설정, flushEffects 에서 실행 */
  function useEffect(effectFn, deps) {
    var comp = activeComponent;
    if (!comp) throw new Error('useEffect: 루트 컴포넌트에서만 사용할 수 있습니다.');

    var i = comp.hookIndex++;
    var hook = comp.hooks[i];
    if (!hook) {
      comp.hooks[i] = hook = {
        type: 'effect', // 슬롯 종류 구분
        fn: effectFn, // 최신 클로저 유지 위해 렌더마다 교체
        deps: deps, // 직전 렌더 deps (비교용)
        cleanup: null, // 이전 effect 가 반환한 정리 함수
        pendingRun: true, // 마운트 직후 첫 effect 실행
      };
      return;
    }
    if (hook.type !== 'effect') throw new Error('useEffect: 훅 순서가 바뀌었습니다.');

    hook.fn = effectFn;
    var run;
    if (deps === undefined) {
      run = true; // deps 생략: 매 커밋마다 실행(React 느낌)
    } else {
      run = !shallowDepsEqual(hook.deps, deps); // 얕은 배열 비교로 변경 감지
    }
    hook.deps = deps;
    hook.pendingRun = run; // true 인 슬롯만 flushEffects 에서 본문 실행
  }

  /** 파생 값 캐시: deps 같으면 factory 재호출 없이 value 반환 */
  function useMemo(factory, deps) {
    var comp = activeComponent;
    if (!comp) throw new Error('useMemo: 루트 컴포넌트에서만 사용할 수 있습니다.');
    if (!Array.isArray(deps)) throw new Error('useMemo: 두 번째 인자 deps 배열이 필요합니다.'); // undefined deps 캐시 버그 방지

    var i = comp.hookIndex++;
    var hook = comp.hooks[i];
    if (!hook || hook.type !== 'memo' || !shallowDepsEqual(hook.deps, deps)) {
      var computed = factory(); // deps 바뀜 또는 첫 실행: 다시 계산
      comp.hooks[i] = { type: 'memo', deps: deps, value: computed };
      return computed;
    }
    return hook.value; // deps 동일: 캐시
  }

  global.FunctionComponent = FunctionComponent; // 브라우저에서 new FunctionComponent(...)
  global.h = h; // VNode 생성 헬퍼
  global.hText = hText; // 텍스트 노드 VNode
  global.useState = useState;
  global.useEffect = useEffect;
  global.useMemo = useMemo;
})(typeof window !== 'undefined' ? window : this);
