/**
 * =============================================================================
 * patch.js — 4단계: diffVNode 가 만든 patches[] 를 실제 DOM 에 적용
 * =============================================================================
 *
 * [전제]
 * - `domRoot`: diff 때의 “이전 VNode”와 같은 모양을 가진 **실제 DOM 루트 요소**.
 *   path 는 항상 이 루트 기준 childNodes 인덱스 체인이다 (diff.js 와 동일).
 * - `vnodeToDom` 은 vdom.js 에 있어야 한다.
 *
 * [반환]
 * - `applyPatches(domRoot, patches)`는 루트가 바뀐 경우(예: REPLACE_NODE path []) 새 루트를,
 *   그렇지 않으면 같은 `domRoot` 참조를 돌려준다. 호출 측이 더 이상 옛 루트를 쓰지 않게 한다.
 *
 * [주의]
 * - 한 번의 patches 배열 안에 “루트 교체” 뒤에 옛 트리 기준 깊은 path 패치가 섞이면 안 된다.
 *   현재 diff.js 출력은 그렇게 섞이지 않도록 설계되어 있다.
 */

/**
 * path 가 가리키는 노드 (Text 포함). path 빈 배열이면 root 자신.
 *
 * @param {Node} root
 * @param {number[]} path
 * @returns {Node | null}
 */
function getDomNodeAtPath(root, path) {
  if (!root) return null;
  // path 가 [] 이면 "루트 자신"을 가리킨다.
  if (!path || path.length === 0) return root;
  var node = root;
  for (var i = 0; i < path.length; i++) {
    var idx = path[i];
    // diff.js 가 childNodes 기준 인덱스를 만들었으므로 동일 기준으로 탐색.
    node = node.childNodes[idx];
    if (node == null) return null;
  }
  return node;
}

/**
 * @param {Node} domRoot
 * @param {object[]} patches
 * @returns {Node} 갱신 후 루트 요소(또는 교체된 새 루트)
 */
function applyPatches(domRoot, patches) {
  var root = domRoot;
  if (!patches || !patches.length) return root;
  for (var i = 0; i < patches.length; i++) {
    // 루트 교체 패치가 나오면 applyOnePatch 가 새 루트를 반환한다.
    // 이후 패치들은 그 최신 루트를 기준으로 path 를 해석하게 된다.
    var nextRoot = applyOnePatch(root, patches[i]);
    if (nextRoot != null) root = nextRoot;
  }
  return root;
}

/**
 * @param {Node} root — path 해석의 기준 루트
 * @param {object} patch
 * @returns {Node | null} 루트가 바뀌었을 때만 새 루트, 아니면 null
 */
function applyOnePatch(root, patch) {
  if (!patch || !patch.op) return null;

  switch (patch.op) {
    case 'SET_TEXT': {
      var tn = getDomNodeAtPath(root, patch.path);
      if (tn && tn.nodeType === Node.TEXT_NODE) {
        // Text 노드 내용 교체
        tn.nodeValue = patch.value == null ? '' : String(patch.value);
      }
      return null;
    }
    case 'SET_PROP': {
      var el = getDomNodeAtPath(root, patch.path);
      if (el && el.nodeType === Node.ELEMENT_NODE) {
        if (typeof patch.value === 'function' && /^on/i.test(patch.name)) {
          if (typeof vnodeAttachPropHandler === 'function') {
            vnodeAttachPropHandler(el, patch.name, patch.value);
          }
        } else {
          el.setAttribute(patch.name, patch.value == null ? '' : String(patch.value));
        }
      }
      return null;
    }
    case 'REMOVE_PROP': {
      var el2 = getDomNodeAtPath(root, patch.path);
      if (el2 && el2.nodeType === Node.ELEMENT_NODE) {
        if (/^on/i.test(patch.name) && typeof vnodeDetachPropHandler === 'function') {
          vnodeDetachPropHandler(el2, patch.name);
        } else {
          el2.removeAttribute(patch.name);
        }
      }
      return null;
    }
    case 'REPLACE_CHILDREN': {
      var host = getDomNodeAtPath(root, patch.path);
      if (host && host.nodeType === Node.ELEMENT_NODE) {
        // "부분 비교" 대신 자식 전체 교체 정책: 먼저 비우고 새 children 재구성.
        while (host.firstChild) host.removeChild(host.firstChild);
        var list = patch.children || [];
        for (var j = 0; j < list.length; j++) {
          var c = vnodeToDom(list[j]);
          if (c) host.appendChild(c);
        }
      }
      return null;
    }
    case 'REPLACE_NODE': {
      var fresh = vnodeToDom(patch.vnode);
      if (fresh == null) return null;
      var path = patch.path || [];
      if (path.length === 0) {
        // 루트 교체: 부모가 있을 때만 실제 교체 가능.
        var parent = root.parentNode;
        if (parent) {
          parent.replaceChild(fresh, root);
          return fresh;
        }
        return null;
      }
      var par = getDomNodeAtPath(root, path.slice(0, path.length - 1));
      var idx = path[path.length - 1];
      if (par && par.childNodes[idx]) {
        // 일반 노드 교체: 부모가 자식 idx 를 가리킬 수 있을 때만 실행.
        par.replaceChild(fresh, par.childNodes[idx]);
      }
      return null;
    }
    case 'REMOVE_NODE': {
      var pathR = patch.path || [];
      if (pathR.length === 0) {
        // 루트 제거 요청: 컨테이너 레벨에서 루트가 사라질 수 있다.
        var pr = root.parentNode;
        if (pr) pr.removeChild(root);
        return null;
      }
      var parentR = getDomNodeAtPath(root, pathR.slice(0, pathR.length - 1));
      var ix = pathR[pathR.length - 1];
      if (parentR && parentR.childNodes[ix]) {
        // 일반 제거
        parentR.removeChild(parentR.childNodes[ix]);
      }
      return null;
    }
    default:
      return null;
  }
}
