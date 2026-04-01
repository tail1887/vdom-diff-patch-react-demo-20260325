/**
 * Week 4 단계별 데모 — 각 섹션마다 별도 FunctionComponent 마운트
 */
(function () {
  if (typeof FunctionComponent !== 'function') return;
  var phase4RenderRuns = 0;
  var phase4EffectRuns = 0;
  var phase4CleanupRuns = 0;

  function phase4AppendTimeline(text) {
    var list = document.getElementById('output-week4-4-timeline');
    if (!list) return;
    var li = document.createElement('li');
    li.textContent = text;
    list.prepend(li);
    while (list.children.length > 8) list.removeChild(list.lastChild);
  }

  function mountIf(container, renderFn) {
    if (!container) return;
    new FunctionComponent(renderFn).mount(container);
  }

  // ---------- 1단계: 훅 없음 (시각적 파이프라인) ----------
  mountIf(document.getElementById('container-week4-1-mount'), function Week4Phase1() {
    function pipelineStep(num, title, sub) {
      return h('div', { class: 'week4-pipeline__step' }, [
        h('span', { class: 'week4-pipeline__step-num' }, hText(num)),
        h('span', { class: 'week4-pipeline__step-title' }, hText(title)),
        h('span', { class: 'week4-pipeline__step-sub' }, hText(sub)),
      ]);
    }
    function arrow() {
      return h('span', { class: 'week4-pipeline__arrow', 'aria-hidden': 'true' }, hText('\u2192'));
    }
    return h('div', { class: 'week4-app week4-app--phase1' }, [
      h(
        'p',
        { class: 'week4-phase1-lead' },
        hText(
          '①~②는 컴포넌트 함수(renderFn) 안에서 끝나고, ③~④는 mini-react의 mount()가 renderFn이 반환한 뒤에 이어집니다. 오른쪽 끝이 브라우저에 붙은 실제 DOM입니다.'
        )
      ),
      h(
        'p',
        { class: 'panel-note week4-phase1-myth' },
        hText(
          '헷갈리기 쉬운 점: Week 3의 domToVNode는 이미 있는 DOM을 읽어 VNode로 만드는 함수입니다. renderFn은 그 반대가 아니라, h()/hText로 VNode를 처음부터 적어 return 하는 함수입니다(읽기 X, 만들기 O).'
        )
      ),
      h(
        'div',
        {
          class: 'week4-pipeline',
          role: 'group',
          'aria-label': '마운트 파이프라인: 렌더에서 DOM까지',
        },
        [
          pipelineStep('1', '렌더', 'renderFn() — 화면을 VNode 트리로 계산'),
          arrow(),
          pipelineStep('2', '가상 트리', 'VNode — 태그·속성·자식이 든 JS 객체'),
          arrow(),
          pipelineStep('3', 'DOM 변환', 'vnodeToDom() — Week 3가 객체→진짜 노드'),
          arrow(),
          h('div', { class: 'week4-pipeline__step week4-pipeline__step--dom' }, [
            h('span', { class: 'week4-pipeline__step-num' }, hText('4')),
            h('span', { class: 'week4-pipeline__step-title' }, hText('실제 화면')),
            h('span', { class: 'week4-pipeline__step-sub' }, hText('append — 컨테이너에 붙은 결과')),
          ]),
        ]
      ),
      h('div', { class: 'week4-phase1-hooks' }, [
        h('span', { class: 'week4-phase1-hooks__label' }, hText('훅 슬롯 (hooks 배열)')),
        h('span', { class: 'week4-phase1-hooks__value' }, hText('비어 있음 · 0개')),
        h('span', { class: 'week4-phase1-hooks__hint' }, hText('2단계에서 useState()가 여기에 상태 칸을 만듭니다.')),
      ]),
    ]);
  });

  // ---------- 2단계: useState ----------
  mountIf(document.getElementById('container-week4-2-mount'), function Week4Phase2() {
    var st = useState(0);
    var n = st[0];
    var setN = st[1];
    return h('div', { class: 'week4-app' }, [
      h('div', { class: 'week4-phase-meta', role: 'group', 'aria-label': '2단계 용어' }, [
        h('p', { class: 'week4-phase-meta__item' }, [
          h('strong', { class: 'week4-phase-meta__name' }, hText('상태 ')),
          hText('(useState) — 리렌더 후에도 유지되는 값. 아래 n.'),
        ]),
        h('p', { class: 'week4-phase-meta__item' }, [
          h('strong', { class: 'week4-phase-meta__name' }, hText('갱신 ')),
          hText('(setState / setN) — 값을 바꾸고, 나중에 update→diff→patch로 화면 맞춤.'),
        ]),
      ]),
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
      h('div', { class: 'week4-phase-meta', role: 'group', 'aria-label': '3단계 용어' }, [
        h('p', { class: 'week4-phase-meta__item' }, [
          h('strong', { class: 'week4-phase-meta__name' }, hText('파생 값 ')),
          hText('(useMemo) — factory 함수로 계산한 결과를 캐시. deps가 같으면 factory를 다시 안 돌림.'),
        ]),
        h('p', { class: 'week4-phase-meta__item' }, [
          h('strong', { class: 'week4-phase-meta__name' }, hText('의존 배열 ')),
          hText('(deps) — 여기 적은 값이 바뀔 때만 캐시를 버리고 다시 계산. 예: [count].'),
        ]),
      ]),
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
    phase4RenderRuns += 1;
    var renderId = phase4RenderRuns;
    var stT = useState('light');
    var theme = stT[0];
    var setTheme = stT[1];
    var stM = useState('안녕');
    var msg = stM[0];
    var setMsg = stM[1];

    useEffect(
      function () {
        phase4EffectRuns += 1;
        var el = document.getElementById('output-week4-4-effect');
        if (el) {
          el.textContent =
            '[effect #' +
            phase4EffectRuns +
            '] render#' +
            renderId +
            ' 이후 실행 · theme=' +
            theme +
            ', msg=' +
            msg;
        }
        phase4AppendTimeline(
          '[effect #' +
            phase4EffectRuns +
            '] render#' +
            renderId +
            ' 뒤 실행 (theme=' +
            theme +
            ', msg=' +
            msg +
            ')'
        );
        return function () {
          phase4CleanupRuns += 1;
          var cleanupEl = document.getElementById('output-week4-4-cleanup');
          if (cleanupEl) {
            cleanupEl.textContent =
              '[cleanup #' +
              phase4CleanupRuns +
              '] 다음 effect 실행 전에 정리 · 이전 theme=' +
              theme +
              ', 이전 msg=' +
              msg;
          }
          phase4AppendTimeline(
            '[cleanup #' +
              phase4CleanupRuns +
              '] 이전 effect 정리 (theme=' +
              theme +
              ', msg=' +
              msg +
              ')'
          );
        };
      },
      [theme, msg]
    );

    return h('div', { class: 'week4-app' }, [
      h('div', { class: 'week4-phase-meta', role: 'group', 'aria-label': '4단계 용어' }, [
        h('p', { class: 'week4-phase-meta__item' }, [
          h('strong', { class: 'week4-phase-meta__name' }, hText('부수 효과 ')),
          hText('(useEffect) — 화면(VNode→DOM) 반영이 끝난 뒤 실행. 구독·로그·외부 DOM 수정 등.'),
        ]),
        h('p', { class: 'week4-phase-meta__item' }, [
          h('strong', { class: 'week4-phase-meta__name' }, hText('의존 배열 ')),
          hText('(deps) — [theme, msg]가 바뀔 때만 effect 본문을 다시 돌림(이전 cleanup 후).'),
        ]),
      ]),
      h(
        'p',
        { class: 'week4-line week4-line--em' },
        hText(
          'render #' +
            renderId +
            ' 완료 (이후 microtask에서 effect 실행 예정)'
        )
      ),
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
  function ChildPreview(props) {
    return h('section', { class: 'week4-child-preview' }, [
      h('p', { class: 'week4-child-preview__title' }, hText('자식이 실제로 받은 props')),
      h('p', { class: 'week4-child-preview__line' }, hText('count: ' + props.count)),
      h('p', { class: 'week4-child-preview__line' }, hText('label: ' + props.label)),
      h('p', { class: 'week4-child-preview__hint' }, hText('이 함수 안에는 useState/useEffect 없음 (표시 전용).')),
    ]);
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
      h('div', { class: 'week4-phase-meta', role: 'group', 'aria-label': '5단계 용어' }, [
        h('p', { class: 'week4-phase-meta__item' }, [
          h('strong', { class: 'week4-phase-meta__name' }, hText('표시 전용 조각 ')),
          hText('(Header 함수) — h(Header, props)로만 그림. 훅 없음, 받은 props로 VNode만 반환.'),
        ]),
        h('p', { class: 'week4-phase-meta__item' }, [
          h('strong', { class: 'week4-phase-meta__name' }, hText('상태 끌어올리기 ')),
          hText('(lifting state up) — useState는 이 루트에만. 자식은 부모가 넘긴 props만 씀.'),
        ]),
      ]),
      h(Header, {
        title: '5단계 · Stateless Header',
        subtitle: 'props만 받음 · 훅 없음',
      }),
      h('div', { class: 'week4-lift-map' }, [
        h('div', { class: 'week4-lift-map__box week4-lift-map__box--root' }, [
          h('p', { class: 'week4-lift-map__title' }, hText('루트가 가진 state (원본)')),
          h('p', { class: 'week4-lift-map__line' }, hText('count = ' + count)),
          h('p', { class: 'week4-lift-map__line' }, hText('label = ' + label)),
        ]),
        h('div', { class: 'week4-lift-map__arrow', 'aria-hidden': 'true' }, hText('props 전달 ->')),
        h('div', { class: 'week4-lift-map__box week4-lift-map__box--child' }, [
          h('p', { class: 'week4-lift-map__title' }, hText('자식은 받은 값만 사용')),
          h('p', { class: 'week4-lift-map__line' }, hText('Header(props)')),
          h('p', { class: 'week4-lift-map__line' }, hText('ChildPreview(props)')),
        ]),
      ]),
      h(ChildPreview, { count: count, label: label }),
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
