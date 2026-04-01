/**
 * Week 4 단계별 데모 — 각 섹션마다 별도 FunctionComponent 마운트
 */
(function () {
  if (typeof FunctionComponent !== 'function') return;

  function mountIf(container, renderFn) {
    if (!container) return;
    new FunctionComponent(renderFn).mount(container);
  }

  // ---------- 1단계: 훅 없음 ----------
  mountIf(document.getElementById('container-week4-1-mount'), function Week4Phase1() {
    return h('div', { class: 'week4-app' }, [
      h('p', { class: 'week4-line' }, hText('render() → VNode 트리 → vnodeToDom → 컨테이너에 append')),
      h(
        'p',
        { class: 'panel-note' },
        hText('hooks 배열은 비어 있습니다. 2단계에서 useState로 같은 컴포넌트에 상태를 붙입니다.')
      ),
    ]);
  });

  // ---------- 2단계: useState ----------
  mountIf(document.getElementById('container-week4-2-mount'), function Week4Phase2() {
    var st = useState(0);
    var n = st[0];
    var setN = st[1];
    return h('div', { class: 'week4-app' }, [
      h('p', { class: 'week4-line' }, hText('n = ' + n)),
      h('div', { class: 'week4-toolbar' }, [
        h(
          'button',
          {
            type: 'button',
            class: 'btn-phase5 btn-phase5--primary',
            onClick: function () {
              setN(function (x) {
                return x + 1;
              });
            },
          },
          hText('+1')
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'btn-phase5',
            onClick: function () {
              setN(0);
            },
          },
          hText('reset')
        ),
      ]),
    ]);
  });

  // ---------- 3단계: useMemo (count vs tick) ----------
  mountIf(document.getElementById('container-week4-3-mount'), function Week4Phase3() {
    var stC = useState(0);
    var count = stC[0];
    var setCount = stC[1];
    var stT = useState(0);
    var tick = stT[0];
    var setTick = stT[1];

    var derived = useMemo(
      function () {
        return count * 10 + 1;
      },
      [count]
    );

    return h('div', { class: 'week4-app' }, [
      h(
        'p',
        { class: 'week4-line' },
        hText('count = ' + count + ', tick = ' + tick + ' → useMemo 결과 = ' + derived + ' (deps: [count]만)')
      ),
      h('div', { class: 'week4-toolbar' }, [
        h(
          'button',
          {
            type: 'button',
            class: 'btn-phase5 btn-phase5--primary',
            onClick: function () {
              setCount(function (c) {
                return c + 1;
              });
            },
          },
          hText('count +1')
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'btn-phase5',
            onClick: function () {
              setTick(function (t) {
                return t + 1;
              });
            },
          },
          hText('tick +1 (리렌더만, count 불변)')
        ),
      ]),
      h(
        'p',
        { class: 'panel-note' },
        hText('tick만 올리면 derived는 변하지 않아야 합니다(캐시). count를 바꾸면 derived가 같이 바뀝니다.')
      ),
    ]);
  });

  // ---------- 4단계: useEffect ----------
  mountIf(document.getElementById('container-week4-4-mount'), function Week4Phase4() {
    var stT = useState('light');
    var theme = stT[0];
    var setTheme = stT[1];
    var stM = useState('안녕');
    var msg = stM[0];
    var setMsg = stM[1];

    useEffect(
      function () {
        var el = document.getElementById('output-week4-4-effect');
        if (el) {
          el.textContent = '[effect] theme=' + theme + ', msg=' + msg;
        }
        return function () {};
      },
      [theme, msg]
    );

    return h('div', { class: 'week4-app' }, [
      h('p', { class: 'week4-line' }, hText('theme = ' + theme + ', msg = ' + msg)),
      h('div', { class: 'week4-toolbar' }, [
        h(
          'button',
          {
            type: 'button',
            class: 'btn-phase5',
            onClick: function () {
              setTheme(function (t) {
                return t === 'light' ? 'dark' : 'light';
              });
            },
          },
          hText('theme 토글')
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'btn-phase5',
            onClick: function () {
              setMsg('미니 React');
            },
          },
          hText('msg: 미니 React')
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'btn-phase5',
            onClick: function () {
              setMsg('안녕');
            },
          },
          hText('msg: 안녕')
        ),
      ]),
    ]);
  });

  // ---------- 5단계: 무상태 Header + 통합 ----------
  function Header(props) {
    return h(
      'header',
      { class: 'week4-panel__head' },
      h('h3', { class: 'week4-panel__title' }, hText(props.title)),
      h('p', { class: 'panel-note' }, hText(props.subtitle))
    );
  }

  mountIf(document.getElementById('container-week4-5-mount'), function Week4Phase5() {
    var st = useState(0);
    var count = st[0];
    var setCount = st[1];
    var st2 = useState('통합 데모');
    var label = st2[0];
    var setLabel = st2[1];

    var doubled = useMemo(
      function () {
        return count * 2;
      },
      [count]
    );

    useEffect(
      function () {
        var el = document.getElementById('output-week4-5-effect');
        if (el) {
          el.textContent = '[effect] count=' + count + ', label=' + label + ', doubled=' + doubled;
        }
        return function () {};
      },
      [count, label, doubled]
    );

    return h('div', { class: 'week4-app' }, [
      h(Header, {
        title: '5단계 · Stateless Header',
        subtitle: 'props만 받음 · 훅 없음',
      }),
      h('p', { class: 'week4-line' }, hText('count = ' + count + ' · useMemo×2 = ' + doubled)),
      h('p', { class: 'week4-line' }, hText('label = ' + label)),
      h('div', { class: 'week4-toolbar' }, [
        h(
          'button',
          {
            type: 'button',
            class: 'btn-phase5 btn-phase5--primary',
            onClick: function () {
              setCount(function (c) {
                return c + 1;
              });
            },
          },
          hText('+1')
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'btn-phase5',
            onClick: function () {
              setCount(0);
            },
          },
          hText('reset')
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'btn-phase5',
            onClick: function () {
              setLabel('통합 데모');
            },
          },
          hText('라벨 A')
        ),
        h(
          'button',
          {
            type: 'button',
            class: 'btn-phase5',
            onClick: function () {
              setLabel('Lifting state');
            },
          },
          hText('라벨 B')
        ),
      ]),
    ]);
  });
})();
