function createCurrentLocation(base) {
  const { pathname, search, hash } = window.location;
  const hasPos = base.indexOf("#");
  if (hasPos > -1) {
    return base.slice(1) || "/";
  }
  return pathname + search + hash;
}
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
function useHistoryStateNavigation(base) {
  const currentLocation = {
    value: createCurrentLocation(base),
  };
  const historyState = {
    value: window.history.state,
  };
  //第一次进来路由 初始化页面：
  if (!historyState.value) {
    const state = buildState(null, currentLocation.value, null, true);
    changeLocation(currentLocation.value, state, true);
  }
  // 真实修改浏览器路径以及state
  function changeLocation(to, state, replace) {
    const hasPos = base.indexOf("#");
    const url = hasPos > -1 ? base + to : to;
    window.history[replace ? "replaceState" : "pushState"](state, null, url);
    historyState.value = state;
  }
  // 核心方法
  function push(to, data) {
    const currentState = Object.assign({}, historyState.value, {
      forward: to,
      scroll: { left: window.pageXOffset, top: window.pageYOffset },
    });
    changeLocation(currentState.current, currentState, true);
    const state = Object.assign(
      {},
      buildState(currentState.current, to, null, false),
      {
        position: currentState.position + 1,
      }
    );
    changeLocation(to, state, false);
    currentLocation.value = to;
  }
  function replace(to, data) {
    // replace back forward都使用老的
    const { back, forward } = historyState.value;
    const state = Object.assign({}, buildState(back, to, forward, true), data);
    // 跳转路径设置state
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
function useHistoryListeners(historyState, currentLocation, base) {
  const listeners = [];
  const popStateHandler = ({ state }) => {
    // console.log(state);
    const to = createCurrentLocation(base);
    const from = currentLocation.value;
    const fromState = historyState.value;

    currentLocation.value = to;
    historyState.value = state;

    const isBack = state.position - fromState.position < 0;

    listeners.forEach((fn) => fn(to, from, { isBack }));
  };
  window.addEventListener("popstate", popStateHandler);

  function listen(cb) {
    listeners.push(cb);
  }
  return {
    listen,
  };
}
export function createWebHistory(base = "") {
  const historyNavigation = useHistoryStateNavigation(base);

  // 监听浏览器前进后退
  const historyListeners = useHistoryListeners(
    historyNavigation.state,
    historyNavigation.location,
    base
  );
  const routerHistory = Object.assign({}, historyNavigation, historyListeners);
  Object.defineProperty(routerHistory, "location", {
    get() {
      return historyNavigation.location.value;
    },
  });
  Object.defineProperty(routerHistory, "state", {
    get() {
      return historyNavigation.state.value;
    },
  });
  return routerHistory;
}

// const routerHistory = createWebHistory();
// const routerHistory = craeteWebHashHistory();

// routerHistory.listen((to, from, { isBack }) => {
//   console.log(to, from, isBack);
// });
