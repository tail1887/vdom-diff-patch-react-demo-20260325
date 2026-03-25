/**
 * unit-tests.js — phase 6
 * 브라우저 내 간단 테스트 러너(외부 프레임워크 없음)
 *
 * 표시:
 * - output-phase-6-status: 요약(PASS/FAIL/TOTAL)
 * - output-phase-6-log: 각 테스트의 PASS/FAIL 로그
 *
 * 실행:
 * - 페이지 로드 시 자동 실행
 * - control-phase-6-run 버튼으로 재실행
 */

(function () {
  var statusEl = document.getElementById('output-phase-6-status');
  var logEl = document.getElementById('output-phase-6-log');
  var runBtn = document.getElementById('control-phase-6-run');

  if (!statusEl || !logEl || !runBtn) return;

  // 핵심 함수들이 로드되어 있는지 확인
  var need = [
    'domToVNode',
    'vnodeToDom',
    'diffVNode',
    'applyPatches',
  ];
  for (var i = 0; i < need.length; i++) {
    if (typeof window[need[i]] !== 'function') {
      statusEl.textContent = '필수 함수 로드 실패: ' + need[i];
      logEl.textContent = '';
      return;
    }
  }

  function assert(condition, message) {
    if (!condition) throw new Error(message || 'assertion failed');
  }

  function formatError(e) {
    if (!e) return '';
    var msg = e.message ? String(e.message) : String(e);
    if (e.stack) return msg + '\n' + String(e.stack);
    return msg;
  }

  function runCase(testName, fn) {
    try {
      fn();
      return { name: testName, pass: true, error: null };
    } catch (e) {
      return { name: testName, pass: false, error: e };
    }
  }

  function runAll() {
    var tests = [];

    // 1) DOM -> VNode: 요소/속성/텍스트 스냅샷
    tests.push(
      runCase('domToVNode: element props+text', function () {
        var el = document.createElement('div');
        el.setAttribute('id', 't1');
        el.setAttribute('class', 'c1');
        el.appendChild(document.createTextNode('hi'));

        var vnode = window.domToVNode(el);
        assert(vnode.type === 'div', 'type should be div');
        assert(vnode.props.id === 't1', 'id should be t1');
        assert(vnode.props.class === 'c1', 'class should be c1');
        assert(vnode.children && vnode.children.length === 1, 'children length should be 1');
        assert(vnode.children[0].type === '#text', 'child type should be #text');
        assert(vnode.children[0].value === 'hi', 'text value should be hi');
      })
    );

    // 2) VNode -> DOM: 텍스트 노드 생성/값 반영
    tests.push(
      runCase('vnodeToDom: #text', function () {
        var vnode = { type: '#text', value: 'hello' };
        var node = window.vnodeToDom(vnode);
        assert(node && node.nodeType === Node.TEXT_NODE, 'should create Text node');
        assert(node.nodeValue === 'hello', 'Text node value mismatch');
      })
    );

    // 3) Diff: 텍스트 값 변경 -> SET_TEXT
    tests.push(
      runCase('diffVNode: text change => SET_TEXT', function () {
        var oldV = { type: '#text', value: 'a' };
        var newV = { type: '#text', value: 'b' };
        var patches = window.diffVNode(oldV, newV);
        assert(patches.length === 1, 'should produce 1 patch');
        assert(patches[0].op === 'SET_TEXT', 'op should be SET_TEXT');
        assert(patches[0].path.length === 0, 'root path should be []');
        assert(patches[0].value === 'b', 'value should be b');
      })
    );

    // 4) Diff: 속성 변경 -> SET_PROP
    tests.push(
      runCase('diffVNode: prop change => SET_PROP', function () {
        var oldV = {
          type: 'div',
          props: { id: 'a', class: 'c' },
          children: [],
        };
        var newV = {
          type: 'div',
          props: { id: 'b', class: 'c' },
          children: [],
        };
        var patches = window.diffVNode(oldV, newV);
        assert(patches.length === 1, 'should produce 1 patch');
        assert(patches[0].op === 'SET_PROP', 'op should be SET_PROP');
        assert(patches[0].path.length === 0, 'root path should be []');
        assert(patches[0].name === 'id', 'should patch id');
        assert(patches[0].value === 'b', 'should set id to b');
      })
    );

    // 5) Diff: children 길이 다름 -> REPLACE_CHILDREN
    tests.push(
      runCase('diffVNode: children length => REPLACE_CHILDREN', function () {
        var oldV = {
          type: 'div',
          props: {},
          children: [{ type: '#text', value: 'a' }],
        };
        var newV = {
          type: 'div',
          props: {},
          children: [
            { type: '#text', value: 'a' },
            { type: '#text', value: 'b' },
          ],
        };
        var patches = window.diffVNode(oldV, newV);
        assert(patches.length === 1, 'should produce 1 patch');
        assert(patches[0].op === 'REPLACE_CHILDREN', 'op should be REPLACE_CHILDREN');
        assert(patches[0].path.length === 0, 'root path should be []');
      })
    );

    // 6) Patch: SET_TEXT 적용
    tests.push(
      runCase('applyPatches: SET_TEXT updates Text node', function () {
        var domRoot = document.createTextNode('a');
        var patches = [{ op: 'SET_TEXT', path: [], value: 'b' }];
        window.applyPatches(domRoot, patches);
        assert(domRoot.nodeValue === 'b', 'Text node should be updated to b');
      })
    );

    // 7) Patch: REPLACE_NODE(루트 교체)
    tests.push(
      runCase('applyPatches: REPLACE_NODE swaps subtree', function () {
        var container = document.createElement('div');
        var domRoot = document.createElement('div');
        domRoot.appendChild(document.createTextNode('x'));
        container.appendChild(domRoot);

        var patches = [
          {
            op: 'REPLACE_NODE',
            path: [],
            vnode: {
              type: 'span',
              props: {},
              children: [{ type: '#text', value: 'z' }],
            },
          },
        ];

        window.applyPatches(domRoot, patches);
        assert(container.firstElementChild.tagName.toLowerCase() === 'span', 'root should become span');
        assert(container.firstElementChild.textContent === 'z', 'span should contain z');
      })
    );

    // 요약 + 로그 출력
    var passCount = 0;
    var failCount = 0;
    var total = tests.length;
    var lines = [];

    for (var j = 0; j < tests.length; j++) {
      var r = tests[j];
      if (r.pass) {
        passCount++;
        lines.push('[PASS] ' + r.name);
      } else {
        failCount++;
        lines.push('[FAIL] ' + r.name);
        lines.push('  ' + formatError(r.error).split('\n').join('\n  '));
      }
    }

    statusEl.textContent = '단위테스트: PASS ' + passCount + ' / FAIL ' + failCount + ' / TOTAL ' + total;
    logEl.textContent = lines.join('\n');
  }

  // 버튼: 재실행
  runBtn.addEventListener('click', runAll);

  // 페이지 로드 시 1회 실행
  runAll();
})();

