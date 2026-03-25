/**
 * =============================================================================
 * diff.js — 3단계: 두 VNode 트리 비교 → Patch 연산 목록
 * =============================================================================
 *
 * [위치]
 * - vdom.js 가 정의한 VNode 형태(type / props / children / value)를 입력으로 받는다.
 * - 4단계 patch.js 의 `applyPatches` 가 이 배열을 순서대로 실제 DOM 에 적용한다.
 *
 * [path 규칙]
 * - 루트(컨테이너의 단일 자식에 해당하는 VNode)의 path 는 [].
 * - path 가 [0, 2] 이면: 루트의 0번 자식 → 그 자식의 2번 자식.
 *
 * [연산 종류 — 과제·발표에서 말하는 “최소 변경”의 예시 단위]
 *
 * | op               | 의미 |
 * |------------------|------|
 * | SET_TEXT         | 해당 path 의 Text 노드 값을 교체 |
 * | SET_PROP         | 해당 path Element 의 속성 설정 |
 * | REMOVE_PROP      | 해당 path Element 에서 속성 제거 |
 * | REPLACE_CHILDREN | 자식 배열 전체를 새 VNode 목록으로 갈아끼움(개수 불일치 등 단순화) |
 * | REPLACE_NODE     | 해당 path 노드 전체(서브트리)를 새 VNode 로 교체 |
 * | REMOVE_NODE      | 해당 path 노드 제거(상위에서 떼어 내기) |
 *
 * [자식 배열 전략]
 * - 자식 **개수가 같으면** 인덱스마다 재귀 diff(구조·텍스트·속성 변화를 패치로 쪼갬).
 * - 개수가 **다르면** 중간 삽입 정렬 비용을 피하고, 한 번에 REPLACE_CHILDREN 으로 맞춤.
 *   (키 기반 리스트 재배치는 범위 밖; 필요 시 후속 과제.)
 *
 * vdom.js 가 먼저 로드되어 VDOM_TEXT / VDOM_FRAGMENT 가 전역에 있으면 그것을 쓴다.
 */

var DIFF_TEXT = typeof VDOM_TEXT !== 'undefined' ? VDOM_TEXT : '#text';
var DIFF_FRAG = typeof VDOM_FRAGMENT !== 'undefined' ? VDOM_FRAGMENT : '#document-fragment';

/**
 * 공개 API: 이전 VNode 트리와 새 VNode 트리를 비교해 패치 배열을 만든다.
 *
 * @param {object | null} oldVNode
 * @param {object | null} newVNode
 * @returns {object[]} 패치 객체 배열(적용 순서는 4단계에서 정의; 보통 얕은 path 먼저 등 규칙 필요)
 */
function diffVNode(oldVNode, newVNode) {
  return diffWalk(oldVNode, newVNode, []);
}

/**
 * @param {object | null} oldV
 * @param {object | null} newV
 * @param {number[]} path
 * @returns {object[]}
 */
function diffWalk(oldV, newV, path) {
  var patches = [];

  // 둘 다 없으면 "변경 없음". (루트/자식 모두에서 공통 베이스 케이스)
  if (oldV == null && newV == null) return patches;

  // 이전엔 없고 새로 생긴 노드: 삽입을 별도 op 로 두지 않고 REPLACE_NODE 로 단순화.
  // patch 단계에서 해당 path 자리에 통째로 새 노드를 꽂는다.
  if (oldV == null) {
    patches.push({ op: 'REPLACE_NODE', path: path.slice(), vnode: newV });
    return patches;
  }

  // 새 트리에 없어진 노드: 제거 op.
  if (newV == null) {
    patches.push({ op: 'REMOVE_NODE', path: path.slice() });
    return patches;
  }

  // 텍스트끼리는 "내용 값"만 비교하면 된다.
  // type 이 같고 value 만 다르면 가장 작은 단위인 SET_TEXT 1개로 끝난다.
  if (oldV.type === DIFF_TEXT && newV.type === DIFF_TEXT) {
    if (oldV.value !== newV.value) {
      patches.push({ op: 'SET_TEXT', path: path.slice(), value: newV.value });
    }
    return patches;
  }

  // 태그명/노드종류가 달라졌다면, 하위 비교를 해도 의미가 적다.
  // 예) div -> p, text -> span: 서브트리 전체를 교체하는 편이 단순하고 안전.
  if (oldV.type !== newV.type) {
    patches.push({ op: 'REPLACE_NODE', path: path.slice(), vnode: newV });
    return patches;
  }

  // Fragment 는 자체 props 가 없으므로 children 만 재귀 비교.
  if (oldV.type === DIFF_FRAG) {
    patches.push.apply(patches, diffChildren(oldV.children, newV.children, path));
    return patches;
  }

  // 같은 요소 타입이면:
  // 1) 속성 차이
  // 2) 자식 차이
  // 순서로 패치를 만든다.
  patches.push.apply(patches, diffProps(oldV.props || {}, newV.props || {}, path));
  patches.push.apply(patches, diffChildren(oldV.children, newV.children, path));
  return patches;
}

/**
 * @param {object} oldP
 * @param {object} newP
 * @param {number[]} path
 */
function diffProps(oldP, newP, path) {
  var patches = [];
  var keys = {};
  var k;
  // old/new 속성 키의 합집합을 만든 뒤 한 번만 순회한다.
  // (삭제/추가/값변경을 모두 같은 루프에서 처리 가능)
  for (k in oldP) {
    if (Object.prototype.hasOwnProperty.call(oldP, k)) keys[k] = true;
  }
  for (k in newP) {
    if (Object.prototype.hasOwnProperty.call(newP, k)) keys[k] = true;
  }
  for (k in keys) {
    if (!Object.prototype.hasOwnProperty.call(keys, k)) continue;
    var inOld = Object.prototype.hasOwnProperty.call(oldP, k);
    var inNew = Object.prototype.hasOwnProperty.call(newP, k);
    if (!inNew) {
      // old 에만 있으면 제거
      patches.push({ op: 'REMOVE_PROP', path: path.slice(), name: k });
    } else if (!inOld || oldP[k] !== newP[k]) {
      // 새로 생겼거나 값이 달라졌으면 설정(덮어쓰기 포함)
      patches.push({ op: 'SET_PROP', path: path.slice(), name: k, value: newP[k] });
    }
  }
  return patches;
}

/**
 * @param {object[] | undefined} oldCh
 * @param {object[] | undefined} newCh
 * @param {number[]} path
 */
function diffChildren(oldCh, newCh, path) {
  var patches = [];
  var oc = oldCh || [];
  var nc = newCh || [];

  // 이 구현의 단순화 포인트:
  // 길이가 다르면 key 기반 정렬/삽입 계산 대신 자식 배열 전체 교체.
  // 복잡도는 줄고, 발표/학습용으로 동작이 예측 가능해진다.
  if (oc.length !== nc.length) {
    patches.push({ op: 'REPLACE_CHILDREN', path: path.slice(), children: nc.slice() });
    return patches;
  }

  // 길이가 같을 때만 인덱스별로 깊게 비교한다.
  // path.concat(i)로 "부모 path + 현재 자식 인덱스"를 만든다.
  for (var i = 0; i < oc.length; i++) {
    patches.push.apply(patches, diffWalk(oc[i], nc[i], path.concat(i)));
  }
  return patches;
}
