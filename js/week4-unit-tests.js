/**
 * Week 4 미니 React 브라우저 단위테스트 (동기 + microtask)
 */
(function () {
  var statusEl = document.getElementById('output-phase-7-status');
  var logEl = document.getElementById('output-phase-7-log');
  var runBtn = document.getElementById('control-phase-7-run');
  if (!statusEl || !logEl || !runBtn) return;

  var need = [
    'FunctionComponent',
    'h',
    'hText',
    'useState',
    'useEffect',
    'useMemo',
    'diffVNode',
    'applyPatches',
    'vnodeToDom',
  ];
  for (var ni = 0; ni < need.length; ni++) {
    if (typeof window[need[ni]] !== 'function') {
      statusEl.textContent = 'Week4 테스트: 로드 실패 — ' + need[ni];
      logEl.textContent = '';
      return;
    }
  }

  function assert(cond, msg) {
    if (!cond) throw new Error(msg || 'assertion failed');
  }

  function formatError(e) {
    if (!e) return '';
    var msg = e.message ? String(e.message) : String(e);
    if (e.stack) return msg + '\n' + String(e.stack);
    return msg;
  }

  runBtn.addEventListener('click', runAll);

  function runAll() {
    var lines = [];
    var pass = 0;
    var fail = 0;

    function ok(name) {
      pass++;
      lines.push('[PASS] ' + name);
    }
    function bad(name, e) {
      fail++;
      lines.push('[FAIL] ' + name);
      lines.push('  ' + formatError(e).split('\n').join('\n  '));
    }

    function done() {
      statusEl.textContent =
        'Week4 단위테스트: PASS ' + pass + ' / FAIL ' + fail + ' / TOTAL ' + (pass + fail);
      logEl.textContent = lines.join('\n');
    }

    try {
      var v = h('div', { id: 'x' }, hText('a'));
      assert(v.type === 'div' && v.props.id === 'x' && v.children[0].value === 'a', 'shape');
      ok('h + hText: VNode shape');
    } catch (e) {
      bad('h + hText: VNode shape', e);
    }

    try {
      function Child(p) {
        return h('span', null, hText(p.v));
      }
      var out = h(Child, { v: 'ok' });
      assert(out.type === 'span' && out.children[0].value === 'ok', 'child');
      ok('stateless child: h(함수, props)');
    } catch (e2) {
      bad('stateless child: h(함수, props)', e2);
    }

    statusEl.textContent = 'Week4 단위테스트: 비동기 케이스 실행 중…';
    logEl.textContent = lines.join('\n');

    queueMicrotask(function () {
      try {
        var container = document.createElement('div');
        document.body.appendChild(container);
        function Counter() {
          var st = useState(0);
          var c = st[0];
          var setC = st[1];
          return h(
            'div',
            { class: 't-w4' },
            h('span', { id: 't-w4-count' }, hText(String(c))),
            h(
              'button',
              {
                type: 'button',
                id: 't-w4-inc',
                onClick: function () {
                  setC(function (x) {
                    return x + 1;
                  });
                },
              },
              hText('+')
            )
          );
        }
        var comp = new FunctionComponent(Counter);
        comp.mount(container);
        var span = container.querySelector('#t-w4-count');
        var btn = container.querySelector('#t-w4-inc');
        assert(span.textContent === '0', '초기값');
        btn.click();
        assert(span.textContent === '0', '동기 직후는 아직 0 (microtask 배칭)');
        queueMicrotask(function () {
          try {
            assert(span.textContent === '1', 'update 후 1');
            ok('useState + 배칭 update 후 DOM');
          } catch (e3) {
            bad('useState + 배칭 update 후 DOM', e3);
          } finally {
            document.body.removeChild(container);
          }

          var memoCalls = 0;
          var c2 = document.createElement('div');
          document.body.appendChild(c2);
          try {
            function MemoTest() {
              var stA = useState(0);
              var a = stA[0];
              var setA = stA[1];
              var stB = useState(0);
              var b = stB[0];
              var setB = stB[1];
              useMemo(
                function () {
                  memoCalls++;
                  return a * 10;
                },
                [a]
              );
              return h('div', null, [
                h('span', { id: 't-w4-memo' }, hText(String(b))),
                h(
                  'button',
                  {
                    type: 'button',
                    id: 't-w4-only-b',
                    onClick: function () {
                      setB(function (x) {
                        return x + 1;
                      });
                    },
                  },
                  hText('b')
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    id: 't-w4-only-a',
                    onClick: function () {
                      setA(function (x) {
                        return x + 1;
                      });
                    },
                  },
                  hText('a')
                ),
              ]);
            }
            var comp2 = new FunctionComponent(MemoTest);
            comp2.mount(c2);
            assert(memoCalls === 1, 'memo 첫 렌더');
            c2.querySelector('#t-w4-only-b').click();
            queueMicrotask(function () {
              try {
                assert(memoCalls === 1, 'a 불변 → factory 재실행 없음');
                ok('useMemo: deps 동일 시 캐시');
                c2.querySelector('#t-w4-only-a').click();
                queueMicrotask(function () {
                  try {
                    assert(memoCalls === 2, 'a 변경 → 재계산');
                    ok('useMemo: deps 변경 시 재계산');
                  } catch (e4) {
                    bad('useMemo: deps 변경 시 재계산', e4);
                  } finally {
                    document.body.removeChild(c2);
                  }

                  var c3 = document.createElement('div');
                  document.body.appendChild(c3);
                  try {
                    function EffApp() {
                      useState(0);
                      useEffect(
                        function () {
                          var el = document.getElementById('t-w4-eff');
                          if (el) el.textContent = 'effect-ok';
                        },
                        []
                      );
                      return h('div', null, h('span', { id: 't-w4-eff' }, hText('')));
                    }
                    var comp3 = new FunctionComponent(EffApp);
                    comp3.mount(c3);
                    queueMicrotask(function () {
                      try {
                        var mark = document.getElementById('t-w4-eff');
                        assert(mark && mark.textContent === 'effect-ok', 'effect text');
                        ok('useEffect: 마운트 후 microtask 실행');
                      } catch (e5) {
                        bad('useEffect: 마운트 후 microtask 실행', e5);
                      } finally {
                        document.body.removeChild(c3);
                      }
                      done();
                    });
                  } catch (e6) {
                    bad('useEffect: 마운트 후 microtask 실행', e6);
                    document.body.removeChild(c3);
                    done();
                  }
                });
              } catch (e7) {
                bad('useMemo: deps 동일 시 캐시', e7);
                document.body.removeChild(c2);
                done();
              }
            });
          } catch (e8) {
            bad('useMemo: deps 동일 시 캐시', e8);
            document.body.removeChild(c2);
            done();
          }
        });
      } catch (e9) {
        bad('useState + 배칭 update 후 DOM', e9);
        done();
      }
    });
  }

  runAll();
})();
