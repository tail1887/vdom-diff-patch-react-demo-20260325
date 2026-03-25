/**
 * =============================================================================
 * vdom.js — Virtual DOM(VNode): 1단계 DOM→VNode, 2단계 VNode→DOM
 * =============================================================================
 *
 * [왜 이 파일이 필요한가 — 큰 그림]
 * - 과제의 핵심은 “이전 UI 트리”와 “새 UI 트리”를 비교(diff)해 최소한으로 실제 DOM 만
 *   고치는 흐름이다. 비교의 재료는 **브라우저 안의 DOM 그 자체**보다 **우리가 정의한
 *   순수 데이터 트리(VNode)** 로 두는 것이 안전하고 단순하다.
 *
 * ---------------------------------------------------------------------------
 * Q. “트리는 나중에 JSON 으로 복사·비교(diff) 하기 쉬워야 한다” — 왜 이 조건이 필요한가?
 * ---------------------------------------------------------------------------
 * (대화 중 나온 질문을 코드 주석에 옮김)
 *
 * 1) Diff 는 결국 **값(value) 비교**다.
 *    - “지금 화면이 어떤 구조·속성·텍스트여야 하는가”를 **데이터**로 두고,
 *      이전 스냅샷과 다음 스냅샷의 차이를 알고리즘이 집어 낸다.
 *    - 순수 객체·배열이면 `type / props / children / value` 만 보면 되므로 규칙이 명확해진다.
 *
 * 2) **히스토리(뒤로/앞으로)** 를 구현하려면 “그 시점의 UI 설명”을 **복사해 쌓아 둘** 필요가 있다.
 *    - VNode 처럼 순수 데이터면 **깊은 복사**로 스냅샷을 안정적으로 저장하기 쉽다.
 *    - JSON.stringify 로 파일/콘솔에도 덤프 가능(순환 참조가 없게 설계했을 때) → 디버깅·발표에 유리.
 *
 * 3) “JSON 이 반드시 필수” 는 아니다. 핵심은 **직렬화에 가깝게 만들 순수 스냅샷**이다.
 *    - JSON 은 그 요구를 잘 드러내는 **대표 예시**이고, 과제/문서에서 그렇게 표현한 것이다.
 *
 * ---------------------------------------------------------------------------
 * Q. 그럼 **실제 DOM** 으로는 왜 같은 일이 어렵다고 보나?
 * ---------------------------------------------------------------------------
 *
 * 1) DOM 노드는 **브라우저 네이티브 객체**이지, 우리가 마음대로 필드만 추가한 JSON 이 아니다.
 *    - 비교 대상으로 쓰려면 “어떤 필드만 의미 있나”를 우리가 **추출(domToVNode)** 해야 한다.
 *
 * 2) 노드들은 **서로를 참조**한다(부모·자식·형제).
 *    - 값 비교용 트리가 아니라 **살아 있는 그래프**에 가깝다.
 *    - 단순히 “통째로 복사”해도 순환·참조 동등성 문제로 **diff 입력**으로 쓰기 부담스럽다.
 *
 * 3) **같은 화면**이라도 **노드 인스턴스**가 다를 수 있다.
 *    - 예: 테스트 영역을 지웠다 다시 그리면 구조는 비슷해도 `Node` 참조는 전부 새 것.
 *    - “참조가 같다/다르다”로는 **의미 있는 구조 비교**가 되지 않는다. 비교 단위는 **데이터**여야 한다.
 *
 * 4) DOM 은 **속성 문자열** 말고도 이벤트 리스너·내부 상태 등 “화면에 안 보이는 것”이 붙는다.
 *    - 과제 범위의 “구조·텍스트·속성” diff 와 1:1 로 맞추려면 **우리가 골라 담은 VNode** 가 낫다.
 *
 * [정리]
 * - DOM 은 **진실의 원천(source of truth in the browser)** 이지만,
 *   diff·히스토리·테스트의 **비교 단위**로는 VNode 같은 **순수 스냅샷**이 필요하다.
 *
 * ---------------------------------------------------------------------------
 * [VNode 규칙 — 이 프로젝트에서의 약속]
 * ---------------------------------------------------------------------------
 * - 요소 노드(Element):
 *   { type: 'div' | 'span' | ... (소문자 태그명), props: { 속성명: 문자열값 }, children: VNode[] }
 * - 텍스트 노드(Text):
 *   { type: '#text', value: DOM Text 노드의 nodeValue 와 동일한 문자열 }
 * - DocumentFragment(선택 확장):
 *   { type: '#document-fragment', children: VNode[] }
 *
 * [의도적으로 버리는 노드]
 * - HTML 주석, 일부 특수 노드 등 → domToVNode 가 null 을 반환하고, 부모의 children 에 넣지 않는다.
 * - 나중에 “주석까지 보존”이 필요하면 switch 의 default / nodeType 분기를 확장하면 된다.
 *
 * [알아두면 좋은 브라우저 동작]
 * - childNodes 를 쓰면 태그 사이 줄바꿈·들여쓰기가 “공백만 있는 텍스트 노드”로 들어올 수 있다.
 *   → 소스 HTML 과 VNode 트리가 눈에 보이기 1:1 로 같지 않을 수 있다(정상).
 */

/** 텍스트 노드 type (태그명과 겹치지 않게 '#' 접두사) */
var VDOM_TEXT = '#text';

/** DocumentFragment 를 VNode 로 옮겼을 때의 type */
var VDOM_FRAGMENT = '#document-fragment';

/**
 * 임의의 브라우저 Node 를 재귀적으로 순회하며 VNode 로 변환한다.
 *
 * [재귀 구조]
 * - Element: 자식들에 대해 다시 domToVNode 를 호출해 children 배열을 채운다.
 * - Text  : 자식이 없고 value 만 가진 잎(leaf) 노드가 된다.
 *
 * @param {Node | null | undefined} node - 변환 시작점(요소, 텍스트, document 등)
 * @returns {object | null} VNode 트리의 루트에 해당하는 객체, 또는 변환 불가 시 null
 */
function domToVNode(node) {
  if (node == null) return null;

  switch (node.nodeType) {
    case Node.ELEMENT_NODE:
      // 일반 HTML 요소: tag/props/children 을 가진 트리 노드로 변환
      return elementToVNode(node);
    case Node.TEXT_NODE:
      // 텍스트 조각: 잎 노드로 저장
      return textToVNode(node);
    case Node.DOCUMENT_NODE:
      // document 전체가 들어오면 최상위 html 요소(documentElement)를 루트로 사용
      return domToVNode(node.documentElement);
    case Node.DOCUMENT_FRAGMENT_NODE:
      // fragment 는 태그명 대신 전용 type 으로 유지
      return {
        type: VDOM_FRAGMENT,
        children: childNodesToVNodes(node.childNodes),
      };
    default:
      // 주석/처리명령 등 현재 과제 범위 밖 노드는 버림
      return null;
  }
}

/**
 * Text 노드 → { type: '#text', value }
 *
 * [nodeValue vs textContent]
 * - nodeValue: 이 텍스트 노드 안의 문자열만 (Text 노드에 적합)
 * - textContent 는 요소 전체 하위 텍스트를 합친 것이라 Text 노드에는 보통 nodeValue 와 같지만,
 *   의미상 “이 노드 한 조각”에는 nodeValue 가 더 정확하다.
 *
 * @param {Text} textNode
 */
function textToVNode(textNode) {
  return {
    type: VDOM_TEXT,
    value: textNode.nodeValue == null ? '' : String(textNode.nodeValue),
  };
}

/**
 * Element 노드 → { type, props, children }
 *
 * [props 수집]
 * - getAttributeNames(): 해당 시점에 요소에 실려 있는 “HTML 속성 이름” 목록
 * - 각 이름에 대해 getAttribute 로 문자열 값을 얻는다.
 *
 * [children 수집]
 * - childNodes: 자식 “노드” 전체(텍스트 + 요소 + ...)
 * - children 프로퍼티(HTMLElement)는 “요소 자식만”이라 텍스트 노드가 사라진다.
 *   → 과제용으로는 childNodes 가 원본 DOM 에 더 충실하다.
 *
 * @param {Element} el
 */
function elementToVNode(el) {
  var props = {};
  if (el.hasAttributes && el.hasAttributes()) {
    // DOM 속성은 NamedNodeMap 이라 순회 도우미를 사용해 평면 객체로 복사
    var names = el.getAttributeNames();
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      props[name] = el.getAttribute(name) || '';
    }
  }
  return {
    type: el.tagName.toLowerCase(),
    props: props,
    children: childNodesToVNodes(el.childNodes),
  };
}

/**
 * NamedNodeMap/NodeList 는 배열이 아니기 때문에 인덱스 for 문으로 순회한다.
 *
 * @param {NodeList} childNodes - el.childNodes 또는 fragment.childNodes
 * @returns {object[]} null 이 아닌 자식 VNode 만 모은 배열
 */
function childNodesToVNodes(childNodes) {
  var out = [];
  for (var i = 0; i < childNodes.length; i++) {
    var v = domToVNode(childNodes[i]);
    if (v != null) out.push(v);
  }
  return out;
}

/**
 * =============================================================================
 * 2단계 — VNode → 실제 DOM (createElement / createTextNode)
 * =============================================================================
 *
 * [역할]
 * - domToVNode 의 “역방향”: 순수 객체 트리를 다시 브라우저 Node 로 만든다.
 * - 과제 최종 흐름에서 “테스트 영역 VNode → DOM 으로 그리기”, “히스토리 복원 시
 *   통째로 다시 그리기” 등에 쓸 수 있다. (나중 단계에서 patch 가 최소 변경으로 대체)
 *
 * [주의]
 * - 속성은 문자열로 setAttribute 만 처리 (1단계와 짝을 맞춤). style 객체 분해 등은 없음.
 * - boolean 속성: 값이 true 이면 빈 문자열 속성으로 설정.
 * - 미지원 type 의 VNode 는 null (부모에서 append 생략).
 *
 * @param {object | null} vnode
 * @returns {Node | null}
 */
function vnodeToDom(vnode) {
  if (vnode == null || typeof vnode !== 'object') return null;

  if (vnode.type === VDOM_TEXT) {
    // 텍스트 VNode 복원
    var s = vnode.value == null ? '' : String(vnode.value);
    return document.createTextNode(s);
  }

  if (vnode.type === VDOM_FRAGMENT) {
    // Fragment 는 래퍼 태그 없이 자식만 담는다.
    var frag = document.createDocumentFragment();
    vnodeAppendChildren(frag, vnode.children);
    return frag;
  }

  if (typeof vnode.type === 'string' && vnode.type.charAt(0) !== '#') {
    return vnodeElementToDom(vnode);
  }

  return null;
}

/**
 * 요소 VNode → Element
 *
 * @param {object} vnode — { type, props, children }
 */
function vnodeElementToDom(vnode) {
  var el = document.createElement(vnode.type);
  var props = vnode.props || {};
  for (var key in props) {
    if (!Object.prototype.hasOwnProperty.call(props, key)) continue;
    var val = props[key];
    if (val === false || val == null) continue;
    if (val === true) {
      el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(val));
    }
  }
  vnodeAppendChildren(el, vnode.children);
  return el;
}

/**
 * 자식 VNode 들을 DOM 으로 만들어 parent 에 순서대로 붙인다.
 *
 * @param {Node} parent — Element 또는 DocumentFragment
 * @param {object[] | undefined} children
 */
function vnodeAppendChildren(parent, children) {
  if (!children || !children.length) return;
  for (var i = 0; i < children.length; i++) {
    var n = vnodeToDom(children[i]);
    if (n != null) parent.appendChild(n);
  }
}

/**
 * 컨테이너를 비우고 VNode 한 덩어리를 그 안에 렌더한다.
 * (루트가 Fragment 이면 자식들이 통째로 붙는다.)
 *
 * @param {Element | null} container
 * @param {object | null} vnode
 */
function renderVNodeInto(container, vnode) {
  if (container == null) return;
  // 학습 데모에서는 "통째 리렌더"를 명확히 보여주기 위해 replaceChildren 사용.
  // 최소 변경은 4~5단계의 patch 흐름에서 다룬다.
  container.replaceChildren();
  var n = vnodeToDom(vnode);
  if (n != null) container.appendChild(n);
}

/**
 * VNode → HTML 문자열 (5단계 테스트 영역 textarea 복원·표시용, 데모 한정)
 * - 과제 스냅샷을 사용자가 다시 편집할 수 있게 직렬화.
 * - 브라우저 innerHTML 과 1:1 이 아닐 수 있음(공백·빈 속성 등).
 */
var VDOM_VOID_TAGS = {
  area: true,
  base: true,
  br: true,
  col: true,
  embed: true,
  hr: true,
  img: true,
  input: true,
  link: true,
  meta: true,
  param: true,
  source: true,
  track: true,
  wbr: true,
};

function vnodeEscapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function vnodeEscapeAttr(s) {
  return vnodeEscapeHtml(String(s)).replace(/"/g, '&quot;');
}

/**
 * @param {object | null} vnode
 * @returns {string}
 */
function vnodeToHTMLString(vnode) {
  if (vnode == null) return '';
  if (vnode.type === VDOM_TEXT || vnode.type === '#text') {
    // 텍스트는 반드시 escape 해야 태그로 오해되지 않는다.
    return vnodeEscapeHtml(vnode.value == null ? '' : String(vnode.value));
  }
  if (vnode.type === VDOM_FRAGMENT || vnode.type === '#document-fragment') {
    var ch = vnode.children || [];
    var buf = '';
    for (var i = 0; i < ch.length; i++) buf += vnodeToHTMLString(ch[i]);
    return buf;
  }
  var tag = vnode.type;
  var props = vnode.props || {};
  var out = '<' + tag;
  for (var k in props) {
    if (!Object.prototype.hasOwnProperty.call(props, k)) continue;
    // 속성 값도 escape 처리해 쌍따옴표/꺽쇠 깨짐 방지
    out += ' ' + k + '="' + vnodeEscapeAttr(props[k]) + '"';
  }
  if (VDOM_VOID_TAGS[tag]) {
    return out + '>';
  }
  out += '>';
  var kids = vnode.children || [];
  for (var j = 0; j < kids.length; j++) {
    out += vnodeToHTMLString(kids[j]);
  }
  out += '</' + tag + '>';
  return out;
}
