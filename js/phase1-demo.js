/**
 * phase1-demo.js — 1~4단계 데모 (통합 스크립트)
 *
 * ID 규칙은 index.html 주석과 동일:
 * - container-phase-1-sample, output-phase-1-*, container-phase-2-mount,
 *   control-phase-3-scenario, output-phase-3-vnode-old/new, output-phase-3-patches,
 *   control-phase-4-*, output-phase-4-status, output-phase-4-shadow-html, container-phase-4-moun */

/** 4단계 Shadow 안에서만 쓰는 최소 스타일(외부 base.css 와 유사하게) */
var PHASE4_SHADOW_CSS =
  '.sample-box{ font-family:system-ui,sans-serif;line-height:1.55;color:#0f1419;' +
  'border:1px dashed #94a3b8;border-radius:8px;padding:1.15rem;' +
  'background:linear-gradient(180deg,#fff,#f4f6fa);box-shadow:inset 0 1px 0 rgba(255,255,255,.9);} ' +
  '.sample-box .title{ margin:0 0 .5rem;font-size:1.2rem;font-weight:700;letter-spacing:-.02em;} ' +
  '.sample-box .desc{ margin:0 0 .85rem;color:#5c6570;font-size:.95rem;} ' +
  '.sample-box .hl{ background:linear-gradient(180deg,#fef9c3,#fde047);padding:.05em .2em;border-radius:4px;font-weight:500;} ' +
  '.sample-box .link{ color:#4f46e5;font-weight:600;text-decoration:none;border-bottom:1px solid rgba(79,70,229,.35);} ' +
  '.sample-box .list{ margin:0 0 .75rem;padding-left:1.25rem;font-size:.95rem;} ' +
  '.sample-box .empty{ min-height:6px;margin-top:.35rem;border-radius:4px;' +
  'background:repeating-linear-gradient(-45deg,rgba(15,20,25,.08),rgba(15,20,25,.08) 2px,transparent 2px,transparent 5px);}';

function domToOutline(node, depth) {
  depth = depth || 0;
  var pad = '';
  for (var d = 0; d < depth; d++) pad += '  ';

  if (node.nodeType === Node.TEXT_NODE) {
    var raw = node.nodeValue == null ? '' : String(node.nodeValue);
    // 학습용: 공백-only 텍스트도 요약하지 않고 raw 그대로 보여준다.
    return pad + '#text ' + JSON.stringify(raw) + '\n';
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    var el = node;
    var line = pad + el.tagName.toLowerCase();
    if (el.id) line += '#' + el.id;
    if (el.className && String(el.className).trim()) {
      line += '.' + String(el.className).trim().replace(/\s+/g, '.');
    }
    line += '\n';
    var buf = line;
    for (var i = 0; i < el.childNodes.length; i++) {
      buf += domToOutline(el.childNodes[i], depth + 1);
    }
    return buf;
  }

  return '';
}

function cloneVNodeStripIds(vnode) {
  if (vnode == null || typeof vnode !== 'object') return null;
  if (vnode.type === '#text') {
    return { type: vnode.type, value: vnode.value };
  }
  if (vnode.type === '#document-fragment') {
    var fc = [];
    for (var i = 0; i < (vnode.children || []).length; i++) {
      var fv = cloneVNodeStripIds(vnode.children[i]);
      if (fv != null) fc.push(fv);
    }
    return { type: vnode.type, children: fc };
  }
  var props = {};
  for (var k in vnode.props || {}) {
    if (!Object.prototype.hasOwnProperty.call(vnode.props, k)) continue;
    if (k === 'id') continue;
    props[k] = vnode.props[k];
  }
  var ch = [];
  for (var j = 0; j < (vnode.children || []).length; j++) {
    var ev = cloneVNodeStripIds(vnode.children[j]);
    if (ev != null) ch.push(ev);
  }
  return { type: vnode.type, props: props, children: ch };
}

function vnodeDeepClone(v) {
  return JSON.parse(JSON.stringify(v));
}

function findFirstElement(vnode, tag) {
  if (!vnode || vnode.type === '#text') return null;
  if (vnode.type === tag) return vnode;
  var ch = vnode.children || [];
  for (var i = 0; i < ch.length; i++) {
    var f = findFirstElement(ch[i], tag);
    if (f) return f;
  }
  return null;
}

function demoEditTitleText(vnode) {
  var v = vnodeDeepClone(vnode);
  var h2 = findFirstElement(v, 'h2');
  if (!h2 || !h2.children) return v;
  for (var i = 0; i < h2.children.length; i++) {
    var c = h2.children[i];
    if (c.type === '#text' && String(c.value).indexOf('VDOM') !== -1) {
      c.value = String(c.value).replace('VDOM', 'Diff');
      break;
    }
  }
  return v;
}

function buildNextTree(tree, scenario) {
  if (scenario === 'same') return vnodeDeepClone(tree);
  if (scenario === 'stripIds') return cloneVNodeStripIds(tree);
  if (scenario === 'editTitle') return demoEditTitleText(tree);
  return vnodeDeepClone(tree);
}

/**
 * @param {object} tree - 1단계 샘플에서 만든 기준 VNode
 * @param {string} scenario
 * @param {{ old?: HTMLElement, new?: HTMLElement, patches: HTMLElement }} outs
 */
function runDiffDemo(tree, scenario, outs) {
  var outPatches = outs && outs.patches;
  if (!outPatches || typeof diffVNode !== 'function') {
    if (outPatches) outPatches.textContent = '// diff.js 가 로드되지 않았습니다.\n';
    return;
  }
  var next = buildNextTree(tree, scenario);
  var patches = diffVNode(tree, next);
  if (outs.old) outs.old.textContent = JSON.stringify(tree, null, 2);
  if (outs.new) outs.new.textContent = JSON.stringify(next, null, 2);
  outPatches.textContent = JSON.stringify(
    { scenario: scenario, patchCount: patches.length, patches: patches },
    null,
    2
  );
}

/**
 * ShadowRoot 안의 inner div (renderVNodeInto 대상). id 충돌 방지.
 */
function getPhase4ShadowInner() {
  var host = document.getElementById('container-phase-4-mount');
  if (!host) return null;
  if (!host.__vdomPhase4Inner) {
    var sh = host.attachShadow({ mode: 'open' });
    var st = document.createElement('style');
    st.textContent = PHASE4_SHADOW_CSS;
    sh.appendChild(st);
    var inner = document.createElement('div');
    inner.className = 'sample-box';
    sh.appendChild(inner);
    host.__vdomPhase4Inner = inner;
  }
  return host.__vdomPhase4Inner;
}

/** Shadow 안 실제 DOM 트리에 붙은 id 속성 개수(글자/색은 그대로여도 이 값은 줄어듦) */
function countIdAttributes(domNode) {
  if (!domNode) return 0;
  var n = 0;
  if (domNode.nodeType === Node.ELEMENT_NODE && domNode.hasAttribute('id')) n++;
  var ch = domNode.childNodes;
  for (var i = 0; i < ch.length; i++) n += countIdAttributes(ch[i]);
  return n;
}

function updatePhase4ShadowHtml() {
  var out = document.getElementById('output-phase-4-shadow-html');
  if (!out) return;
  var inner = getPhase4ShadowInner();
  var root = inner && inner.firstElementChild;
  if (!root) {
    out.textContent = '(초기화 후 Shadow 안 HTML이 표시됩니다.)';
    return;
  }
  out.textContent = root.outerHTML;
}

function resetPhase4Dom(vnodeTree) {
  var inner = getPhase4ShadowInner();
  if (!inner || typeof renderVNodeInto !== 'function') return false;
  renderVNodeInto(inner, vnodeDeepClone(vnodeTree));
  updatePhase4ShadowHtml();
  return true;
}

function applyPhase4Patches(vnodeTree, scenario, statusEl) {
  if (typeof applyPatches !== 'function') {
    if (statusEl) statusEl.textContent = 'patch.js 가 로드되지 않았습니다.';
    return;
  }
  resetPhase4Dom(vnodeTree);
  var inner = getPhase4ShadowInner();
  var root = inner && inner.firstElementChild;
  if (!root) {
    if (statusEl) statusEl.textContent = '루트 요소 없음';
    return;
  }
  var beforeIds = countIdAttributes(root);
  var nextV = buildNextTree(vnodeTree, scenario);
  var patches = diffVNode(vnodeTree, nextV);
  if (patches.length === 0) {
    if (statusEl) {
      statusEl.textContent =
        '패치 0개 — 화면/속성 변화 없음(시나리오: ' + scenario + '). Shadow 안 id 는 ' + beforeIds + '개 그대로.';
    }
    updatePhase4ShadowHtml();
    return;
  }
  applyPatches(root, patches);
  var afterIds = countIdAttributes(root);
  updatePhase4ShadowHtml();
  if (statusEl) {
    statusEl.textContent =
      '적용 완료 — 패치 ' +
      patches.length +
      '개 (시나리오: ' +
      scenario +
      '). Shadow 트리 id 속성: ' +
      beforeIds +
      '개 → ' +
      afterIds +
      '개. (id 제거는 화면은 비슷해 보일 수 있음)';
  }
}

(function () {
  var root = document.getElementById('container-phase-1-sample');
  var outVdom = document.getElementById('output-phase-1-vdom-json');
  var outOuter = document.getElementById('output-phase-1-outer-html');
  var outOutline = document.getElementById('output-phase-1-tree-outline');
  var mount2 = document.getElementById('container-phase-2-mount');
  var outDiffOld = document.getElementById('output-phase-3-vnode-old');
  var outDiffNew = document.getElementById('output-phase-3-vnode-new');
  var outDiff = document.getElementById('output-phase-3-patches');
  var diffSelect = document.getElementById('control-phase-3-scenario');
  var btnReset4 = document.getElementById('control-phase-4-reset');
  var btnApply4 = document.getElementById('control-phase-4-apply');
  var status4 = document.getElementById('output-phase-4-status');
  var outPhase4Html = document.getElementById('output-phase-4-shadow-html');

  if (!root || !outVdom) return;

  if (outOuter) {
    outOuter.textContent = root.outerHTML;
  }
  if (outOutline) {
    outOutline.textContent = domToOutline(root, 0).trimEnd() + '\n';
  }

  var tree = domToVNode(root);
  outVdom.textContent = JSON.stringify(tree, null, 2);

  if (mount2 && typeof renderVNodeInto === 'function' && typeof cloneVNodeStripIds === 'function') {
    renderVNodeInto(mount2, cloneVNodeStripIds(tree));
  }

  function refreshDiff() {
    var sc = diffSelect ? diffSelect.value : 'stripIds';
    runDiffDemo(tree, sc, {
      old: outDiffOld,
      new: outDiffNew,
      patches: outDiff
    });
  }

  if (diffSelect) {
    diffSelect.addEventListener('change', refreshDiff);
  }
  refreshDiff();

  if (btnReset4) {
    btnReset4.addEventListener('click', function () {
      if (resetPhase4Dom(tree)) {
        var inner = getPhase4ShadowInner();
        var r = inner && inner.firstElementChild;
        var idn = r ? countIdAttributes(r) : 0;
        if (status4) {
          status4.textContent =
            '초기화됨 — Shadow 안 id 속성 ' + idn + '개. 오른쪽 HTML에서 id 문자열을 확인한 뒤 “패치 적용”을 눌러보세요.';
        }
      }
    });
  }

  if (outPhase4Html && typeof resetPhase4Dom === 'function' && resetPhase4Dom(tree)) {
    if (status4) {
      status4.textContent =
        '4단계 준비됨 — 오른쪽 패널에 Shadow 안 HTML이 표시됩니다. id 제거 시나리오는 패치 적용 후 문자열에서 id가 사라집니다.';
    }
  }

  if (btnApply4) {
    btnApply4.addEventListener('click', function () {
      var sc = diffSelect ? diffSelect.value : 'stripIds';
      applyPhase4Patches(tree, sc, status4);
    });
  }
})();
