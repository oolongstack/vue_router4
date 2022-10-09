import { computed, reactive, shallowRef, unref, inject } from "vue";
import { createWebHistory } from "./history/html5";
import { craeteWebHashHistory } from "./history/hash";
import { RouterLink } from "./router_link";
import { RouterView } from "./router_view";
import { createRouterMatcher } from "./matcher";
function useCallback() {
  const handlers = [];
  function add(handler) {
    handlers.push(handler);
  }

  return {
    add,
    list: () => handlers,
  };
}
function runGuardsQueue(guards) {
  return guards.reduce((promise, guard) => {
    return promise.then(() => {
      return guard();
    });
  }, Promise.resolve());
}
// 初始状态
const STATE_LOCATION_NORMALIZED = {
  path: "/",
  matched: [],
};
function createRouter(options) {
  const { history: routerHistory, routes } = options;
  const matcher = createRouterMatcher(routes);
  // 后续改变currentRoute就可以更新视图
  const currentRoute = shallowRef(STATE_LOCATION_NORMALIZED);
  const beforeGuards = useCallback();
  const afterGuards = useCallback();
  const beforeResolveGuards = useCallback();

  function resolve(to) {
    if (typeof to === "string") {
      return matcher.resolve({
        path: to,
      });
    } else {
      return matcher.resolve(to);
    }
  }
  let ready;
  function markAsReady() {
    if (ready) return;
    ready = true;
    routerHistory.listen((to) => {
      const targetLocation = resolve(to);
      const from = currentRoute.value;
      finalizeNavigation(targetLocation, from, true);
    });
  }
  function finalizeNavigation(to, from, replace = false) {
    if (from === STATE_LOCATION_NORMALIZED || replace) {
      routerHistory.replace(to.path);
    } else {
      routerHistory.push(to.path);
    }
    currentRoute.value = to;
    // 监听popstate
    markAsReady();
  }
  // extractChangeRecords 路由修改后，寻找进入更新离开的路由
  function extractChangeRecords(to, from) {
    const leavingRecords = [];
    const updatingRecords = [];
    const enteringRecords = [];
    const len = Math.max(to.matched.length, from.matched.length);
    for (let i = 0; i < len; i++) {
      const recordFrom = from.matched[i];
      if (recordFrom) {
        // 去和来都有会更新
        if (to.matched.find((record) => record.path === recordFrom.path)) {
          updatingRecords.push(recordFrom);
        } else {
          leavingRecords.push(recordFrom);
        }
      }
      const recordTo = to.matched[i];
      if (recordTo) {
        if (!from.matched.find((record) => record.path === recordTo.path)) {
          enteringRecords.push(recordTo);
        }
      }
    }

    return [leavingRecords, updatingRecords, enteringRecords];
  }
  function extractComponentsGuards(matched, guardType, to, from) {
    const guards = [];
    for (const record of matched) {
      const rawComponent = record.components.default;
      const guard = rawComponent[guardType];
      if (guard) {
        guards.push(guardToPromise(guard, to, from, record));
      }
    }
    return guards;
  }
  function guardToPromise(guard, to, from, record) {
    return () =>
      new Promise((resolve) => {
        const next = () => resolve();
        const guardReturn = guard.call(record, to, from, next);
        return Promise.resolve(guardReturn).then(next); // 自动next
      });
  }
  async function navigate(to, from) {
    const [leavingRecords, updatingRecords, enteringRecords] =
      extractChangeRecords(to, from);
    let guards = extractComponentsGuards(
      leavingRecords.reverse(),
      "beforeRouteLeave",
      to,
      from
    );
    // 组件内routeleave🪝
    return runGuardsQueue(guards)
      .then(() => {
        guards = [];
        for (const guard of beforeGuards.list()) {
          guards.push(guardToPromise(guard, to, from, guard));
        }
        // 全局 beforeEach
        return runGuardsQueue(guards);
      })
      .then(() => {
        guards = extractComponentsGuards(
          updatingRecords,
          "beforeRouteUpdate",
          to,
          from
        );
        // 组件内的update🪝
        return runGuardsQueue(guards);
      })
      .then(() => {
        guards = [];
        for (const record of to.matched) {
          if (record.beforeEnter) {
            guards.push(guardToPromise(record.beforeEnter, to, from, record));
          }
        }
        // 路由配置的beforeEnter
        return runGuardsQueue(guards);
      })
      .then(() => {
        guards = extractComponentsGuards(
          enteringRecords.reverse(),
          "beforeRouteEnter",
          to,
          from
        );
        // 组件内的beforeRouteEnter
        return runGuardsQueue(guards);
      })
      .then(() => {
        guards = [];
        for (const guard of beforeResolveGuards.list()) {
          guards.push(guardToPromise(guard, to, from, guard));
        }
        // 全局的beforeResolve
        return runGuardsQueue(guards);
      });
  }
  // push页面以及重定向
  function pushWithRedirect(to) {
    const targetLocation = resolve(to);
    const from = currentRoute.value;
    // 钩子
    navigate(targetLocation, from)
      .then(() => {
        return finalizeNavigation(targetLocation, from);
      })
      .then(() => {
        for (const afterGuard of afterGuards.list()) {
          afterGuard(targetLocation, from);
        }
      });
  }
  function push(to) {
    return pushWithRedirect(to);
  }

  return {
    push,
    beforeEach: beforeGuards.add,
    afterEach: afterGuards.add,
    beforeResolve: beforeResolveGuards.add,
    install(app) {
      const router = this;
      const reactiveRoute = {};
      for (const key in STATE_LOCATION_NORMALIZED) {
        reactiveRoute[key] = computed(() => currentRoute.value[key]);
      }
      app.config.globalProperties.$router = router;
      Object.defineProperty(app.config.globalProperties, "$route", {
        enumerable: true,
        get() {
          return unref(currentRoute);
        },
      });

      app.provide("router", router);
      app.provide("route location", reactive(reactiveRoute));

      app.component("RouterLink", RouterLink);
      app.component("RouterView", RouterView);

      if (currentRoute.value === STATE_LOCATION_NORMALIZED) {
        // 第一次进来路由，刷新页面（）默认进行一次跳转
        push(routerHistory.location);
      }
    },
  };
}
function useRouter() {
  return inject("router") || {};
}
function useRoute() {
  return inject("route location") || {};
}
export {
  createRouter,
  createWebHistory,
  craeteWebHashHistory,
  useRouter,
  useRoute,
};
