export function createWebHistory(base = "") {
  const historyNaviagtion = useHistoryStateNavigation(base);
  // 监听前进后退按钮
  const historyListeners = useHistoryListeners(
    historyNaviagtion.state,
    historyNaviagtion.location,
    base
  );

  const routerHistory = Object.assign({}, historyListeners, historyNaviagtion);

  Object.defineProperty(routerHistory, "location", {
    get: () => historyNaviagtion.location.value,
  });

  Object.defineProperty(routerHistory, "state", {
    get: () => historyNaviagtion.state.value,
  });
  return routerHistory;
}

function useHistoryStateNavigation(base) {
  const currentLocation = {
    value: createCurrentLocation(base),
  };
  const historyState = {
    value: window.history.state,
  };

  if (!historyState.value) {
    // 第一次进入app，没有状态，构造一个状态
    const state = buildState(null, currentLocation.value, null, true);
    // 第一次进来先跳转一次
    changeLocation(currentLocation.value, state, true);
  }
  // 真实改变路径
  function changeLocation(to, state, replace) {
    const hasPos = base.indexOf("#");
    const url = hasPos > -1 ? base + to : to;
    window.history[replace ? "replaceState" : "pushState"](state, null, url);
    historyState.value = state;
  }

  function push(to, data) {
    // 做两个状态 跳转前
    const currentState = Object.assign({}, historyState.value, {
      forward: to,
      scroll: { left: window.pageXOffset, top: window.pageYOffset },
    });
    changeLocation(currentState.current, currentState, true); // 进行一次记录 replace到当前路径，只是改了些state
    // 跳转后
    const state = Object.assign(
      {},
      buildState(currentLocation.value, to, null, false),
      { position: currentState.position + 1 },
      data
    );
    changeLocation(to, state, false);
    currentLocation.value = to;
  }

  function replace(to, data) {
    const { back, forward, position } = historyState.value;
    const state = Object.assign({}, buildState(back, to, forward, true), data);
    changeLocation(to, state, true);
    currentLocation.value = to;
  }
  return {
    location: currentLocation,
    state: historyState,
    push,
    replace,
  };
}
/**
 * # back 上一个路径
 * # current 现在路径
 * # forward 去往的路径
 * # replace 是否为replace
 * # computedScroll 是否记录滚动条
 */
function buildState(
  back,
  current,
  forward,
  replace = false,
  computedScroll = false
) {
  return {
    back,
    current,
    forward,
    replace,
    scroll: computedScroll
      ? { left: window.pageXOffset, top: window.pageYOffset }
      : null,
    position: window.history.length - 1, // 进行过多少次跳转 默认从 2 开始，所以要 -1
  };
}
// 将目前地址拼接好返回
function createCurrentLocation(base) {
  const { pathname, search, hash } = window.location;
  const hasPos = base.indexOf("#");
  if (hasPos > -1) {
    return base.slice(1) || "/";
  }
  return pathname + search + hash;
}
function useHistoryListeners(historyState, currentLocation, base) {
  let listeners = [];
  const popstateHandler = ({ state }) => {
    const to = createCurrentLocation(base); // 去的地方
    const from = currentLocation.value; // 来的地方
    const fromState = historyState.value; // 来的数据
    currentLocation.value = to;
    historyState.value = state;

    const isBack = state.position - fromState.position < 0;

    listeners.forEach((listener) => {
      listener(to, from, { isBack });
    });
  };
  window.addEventListener("popstate", popstateHandler);
  function listen(cb) {
    listeners.push(cb);
  }
  return {
    listen,
  };
}
