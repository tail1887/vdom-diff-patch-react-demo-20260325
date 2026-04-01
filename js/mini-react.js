/**
 * mini-react.js — Week 4: FunctionComponent · useState · useEffect · useMemo
 *
 * - Week 3의 VNode / diffVNode / applyPatches 와 연결한다.
 * - 훅·상태는 루트 FunctionComponent 에서만 사용(과제 제약).
 * - 자식은 h(ChildFn, props) 형태로 호출되며, 호출 시 activeComponent 를 끄 stateless 만 허용.
 */

(function (global) {
  var activeComponent = null;

  function shallowDepsEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) return false;
    }
    return true;
  }

  function assignProps(target, src) {
    if (!src) return target;
    for (var k in src) {
      if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
    }
    return target;
  }

  function normalizeChildren(args) {
    var out = [];
    function walk(x) {
      if (x == null || x === false) return;
      if (Array.isArray(x)) {
        for (var i = 0; i < x.length; i++) walk(x[i]);
      } else {
        out.push(x);
      }
    }
    for (var j = 0; j < args.length; j++) walk(args[j]);
    return out;
  }

  /**
   * 요소 또는 무상태 자식 컴포넌트(함수)를 VNode 로 만든다.
   * @param {string|function} type
   * @param {object|null|undefined} props
   */
  function h(type, props) {
    var childArgs = Array.prototype.slice.call(arguments, 2);
    props = props == null ? {} : assignProps({}, props);

    if (typeof type === 'function') {
      var prev = activeComponent;
      activeComponent = null;
      try {
        return type(props);
      } finally {
        activeComponent = prev;
      }
    }

    return {
      type: type,
      props: props,
      children: normalizeChildren(childArgs),
    };
  }

  function hText(text) {
    var t = typeof VDOM_TEXT !== 'undefined' ? VDOM_TEXT : '#text';
    return { type: t, value: text == null ? '' : String(text) };
  }

  function scheduleUpdate(comp) {
    if (comp._updateScheduled) return;
    comp._updateScheduled = true;
    queueMicrotask(function () {
      comp._updateScheduled = false;
      comp.update();
    });
  }

  function FunctionComponent(renderFn) {
    if (typeof renderFn !== 'function') throw new Error('FunctionComponent: renderFn required');
    this.renderFn = renderFn;
    this.hooks = [];
    this.container = null;
    this.domRoot = null;
    this.oldVNode = null;
    this.hookIndex = 0;
    this._updateScheduled = false;
  }

  FunctionComponent.prototype.mount = function (container) {
    if (!container) throw new Error('mount: container required');
    this.container = container;
    this.hookIndex = 0;
    activeComponent = this;
    var vnode;
    try {
      vnode = this.renderFn();
    } finally {
      activeComponent = null;
    }
    this.oldVNode = vnode;
    container.replaceChildren();
    var n = vnodeToDom(vnode);
    if (n) container.appendChild(n);
    this.domRoot = container.firstChild;
    this.flushEffects();
  };

  FunctionComponent.prototype.update = function () {
    if (!this.container || this.domRoot == null) return;
    this.hookIndex = 0;
    activeComponent = this;
    var newVNode;
    try {
      newVNode = this.renderFn();
    } finally {
      activeComponent = null;
    }
    var patches = diffVNode(this.oldVNode, newVNode);
    this.domRoot = applyPatches(this.domRoot, patches);
    this.oldVNode = newVNode;
    this.flushEffects();
  };

  FunctionComponent.prototype.flushEffects = function () {
    var self = this;
    queueMicrotask(function () {
      for (var i = 0; i < self.hooks.length; i++) {
        var hook = self.hooks[i];
        if (!hook || hook.type !== 'effect' || !hook.pendingRun) continue;
        if (hook.cleanup) {
          try {
            hook.cleanup();
          } catch (e) {
            console.error('[mini-react] effect cleanup', e);
          }
          hook.cleanup = null;
        }
        try {
          var ret = hook.fn();
          if (typeof ret === 'function') hook.cleanup = ret;
        } catch (e2) {
          console.error('[mini-react] effect', e2);
        }
        hook.pendingRun = false;
      }
    });
  };

  function useState(initial) {
    var comp = activeComponent;
    if (!comp) throw new Error('useState: 루트 컴포넌트에서만 사용할 수 있습니다.');

    var i = comp.hookIndex++;
    if (!comp.hooks[i]) {
      var initVal = typeof initial === 'function' ? initial() : initial;
      comp.hooks[i] = { type: 'state', value: initVal };
    }
    var hook = comp.hooks[i];
    if (hook.type !== 'state') throw new Error('useState: 훅 순서가 바뀌었습니다.');

    var setState = function (next) {
      var nextVal = typeof next === 'function' ? next(hook.value) : next;
      if (Object.is(nextVal, hook.value)) return;
      hook.value = nextVal;
      scheduleUpdate(comp);
    };

    return [hook.value, setState];
  }

  function useEffect(effectFn, deps) {
    var comp = activeComponent;
    if (!comp) throw new Error('useEffect: 루트 컴포넌트에서만 사용할 수 있습니다.');

    var i = comp.hookIndex++;
    var hook = comp.hooks[i];
    if (!hook) {
      comp.hooks[i] = hook = {
        type: 'effect',
        fn: effectFn,
        deps: deps,
        cleanup: null,
        pendingRun: true,
      };
      return;
    }
    if (hook.type !== 'effect') throw new Error('useEffect: 훅 순서가 바뀌었습니다.');

    hook.fn = effectFn;
    var run;
    if (deps === undefined) {
      run = true;
    } else {
      run = !shallowDepsEqual(hook.deps, deps);
    }
    hook.deps = deps;
    hook.pendingRun = run;
  }

  function useMemo(factory, deps) {
    var comp = activeComponent;
    if (!comp) throw new Error('useMemo: 루트 컴포넌트에서만 사용할 수 있습니다.');
    if (!Array.isArray(deps)) throw new Error('useMemo: 두 번째 인자 deps 배열이 필요합니다.');

    var i = comp.hookIndex++;
    var hook = comp.hooks[i];
    if (!hook || hook.type !== 'memo' || !shallowDepsEqual(hook.deps, deps)) {
      var computed = factory();
      comp.hooks[i] = { type: 'memo', deps: deps, value: computed };
      return computed;
    }
    return hook.value;
  }

  global.FunctionComponent = FunctionComponent;
  global.h = h;
  global.hText = hText;
  global.useState = useState;
  global.useEffect = useEffect;
  global.useMemo = useMemo;
})(typeof window !== 'undefined' ? window : this);
