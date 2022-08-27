import {
  computed,
  getCurrentInstance,
  h,
  inject,
  reactive,
  shallowRef,
  unref,
} from "vue";
import { createWebHashHistory } from "./history/hash";
import { createWebHistory } from "./history/html5";
import { RouterLink } from "./router-link";
import { RouterView } from "./router_view";
function createRouterRecordMatcher(normalizedRecord, parent) {
  // 处理path parent 等
  const matcher = {
    path: normalizedRecord.path,
    record: normalizedRecord,
    parent,
    children: [],
  };

  if (parent) {
    parent.children.push(matcher);
  }
  return matcher;
}
function normalizeRouteRecord(route) {
  return {
    path: route.path,
    meta: route.meta || {},
    beforeEnter: route.beforeEnter,
    name: route.name,
    children: route.children || [],
    components: {
      default: route.component,
    },
  };
}
function createRouterMatcher(routes) {
  const matchers = [];
  function addRoute(route, parent) {
    const normalizedRecord = normalizeRouteRecord(route); // 格式化一下每一个route

    if (parent) {
      normalizedRecord.path = parent.path + normalizedRecord.path;
    }
    const matcher = createRouterRecordMatcher(normalizedRecord, parent);
    if (normalizedRecord.children) {
      const children = normalizedRecord.children;
      for (let i = 0; i < children.length; i++) {
        addRoute(children[i], matcher);
      }
    }
    matchers.push(matcher);
  }

  routes.forEach((route) => addRoute(route, null));

  // 真正去解析匹配的路由的函数 根据matchers
  function resolve(location) {
    const path = location.path;
    const matched = [];
    let target = matchers.find((m) => m.path === path);
    while (target) {
      matched.unshift(target.record);
      target = target.parent;
    }
    return {
      path,
      matched,
    };
  }
  return {
    addRoute,
    resolve,
  };
}

// 路由开始的状态（响应式数据）
const START_LOCATION_NORMALIZED = {
  path: "/",
  matched: [], // 当前路径匹配到的记录
};
function useCallback() {
  // 闭包的特性
  const handlers = [];
  function add(handler) {
    handlers.push(handler);
  }
  return {
    add,
    list: () => handlers,
  };
}
function createRouter(options) {
  const routerHistory = options.history;
  // 格式化路由配置 好处理
  const matcher = createRouterMatcher(options.routes); // 格式化好的路由routse配置

  const currentRoute = shallowRef(START_LOCATION_NORMALIZED);

  // 定义钩子
  const beforeGuards = useCallback();
  const beforeResolveGuards = useCallback();
  const afterGuargs = useCallback();
  function extractChangeRecords(to, from) {
    const leavingRecords = [];
    const updatingRecords = [];
    const enteringRecords = [];
    const len = Math.max(to.matched.length, from.matched.length);

    for (let i = 0; i < len; i++) {
      const recordFrom = from.matched[i];
      if (recordFrom) {
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
    return function () {
      return new Promise((resolve, reject) => {
        const next = () => resolve();
        const guardReturn = guard.call(record, to, from, next); // 还可以通过钩子返回值决定跳换与否
        return Promise.resolve(guardReturn).then(next); // 自动调用 next
      });
    };
  }
  function runGuardsQueue(guards) {
    // 多个guards情况，promise组合
    return guards.reduce((promise, guard) => {
      return promise.then(() => {
        return guard();
      });
    }, Promise.resolve());
  }
  function resolve(to) {
    if (typeof to === "string") {
      return matcher.resolve({ path: to });
    } else {
      return matcher.resolve(to);
    }
  }
  let ready;
  function markAsReady() {
    if (ready) return;
    ready = true; // 第二次不会进来
    routerHistory.listen((to) => {
      const targetLocation = resolve(to);
      const from = currentRoute.value;
      finalizeNavigation(targetLocation, from, true);
    });
  }
  /**
   * 实现路由钩子
   * @param {*} to
   * @param {*} from
   */
  async function navigate(to, from) {
    // 可以处理组件内的路由钩子
    const [leavingRecords, updatingRecords, enteringRecords] =
      extractChangeRecords(to, from);
    // 找出组件内对应的钩子
    let guards = extractComponentsGuards(
      leavingRecords.reverse(),
      "beforeRouteLeave",
      to,
      from
    );
    return runGuardsQueue(guards)
      .then(() => {
        // 还是那个一个路由离开了，执行全局的进入
        guards = [];
        for (const guard of beforeGuards.list()) {
          guards.push(guardToPromise(guard, to, from, guard));
        }
        return runGuardsQueue(guards);
      })
      .then(() => {
        // 现在应该走更新的钩子
        guards = extractComponentsGuards(
          updatingRecords.reverse(),
          "beforeRouteUpdate",
          to,
          from
        );
        return runGuardsQueue(guards);
      })
      .then(() => {
        guards = [];
        for (const record of to.matched) {
          if (record.beforeEnter) {
            guards.push(guardToPromise(record.beforeEnter, to, from, record));
          }
        }
        return runGuardsQueue(guards);
      })
      .then(() => {
        guards = extractComponentsGuards(
          enteringRecords.reverse(),
          "beforeRouteEnter",
          to,
          from
        );
        return runGuardsQueue(guards);
      })
      .then(() => {
        guards = [];
        for (const guard of beforeResolveGuards.list()) {
          guards.push(guardToPromise(guard, to, from, guard));
        }
        return runGuardsQueue(guards);
      });
  }
  function finalizeNavigation(to, from, replace = false) {
    // 第一次
    if (from === START_LOCATION_NORMALIZED || replace) {
      routerHistory.replace(to.path);
    } else {
      routerHistory.push(to.path);
    }
    currentRoute.value = to;
    // console.log(currentRoute.value);
    // 还需要监听 popstate
    markAsReady();
  }
  function pushWithRedirect(to) {
    // 通过routes记录 选择渲染的匹配项
    const targetLocation = resolve(to);
    const from = currentRoute.value; // 从哪里来
    navigate(targetLocation, from)
      .then(() => {
        console.log("跳转");
        return finalizeNavigation(targetLocation, from); // 调用跳转函数
      })
      .then(() => {
        // 调用离开的钩子
        const afterGuardList = afterGuargs.list();
        for (let i = 0; i < afterGuardList.length; i++) {
          afterGuardList[i](targetLocation, from);
        }
      });
  }
  function push(to) {
    return pushWithRedirect(to);
  }
  const router = {
    push,
    replace() {},
    beforeEach: beforeGuards.add,
    beforeResolve: beforeResolveGuards.add,
    afterEach: afterGuargs.add,
    install(app) {
      const reactiveRoute = {};
      for (const key in currentRoute.value) {
        reactiveRoute[key] = computed(() => currentRoute.value[key]);
      }

      app.config.globalProperties.$router = router;
      Object.defineProperty(app.config.globalProperties, "$route", {
        enumerable: true,
        get: () => unref(currentRoute),
      });

      app.provide("router", router);
      app.provide("route location", reactive(reactiveRoute));

      app.component("RouterLink", RouterLink);
      app.component("RouterView", RouterView);
      // 每次刷新整个app就会走这个init方法，包括手动输入路径
      if (currentRoute.value == START_LOCATION_NORMALIZED) {
        console.log("init");
        // 初始化状态 默认要先进行一次跳转
        push(routerHistory.location);
      }
    },
  };
  return router;
}
export function useRouter() {
  const instance = getCurrentInstance();
  if (instance) {
    return inject("router", {});
  } else {
    console.warn("只能在组件内使用");
  }
}
export function useRoute() {
  const instance = getCurrentInstance();
  if (instance) {
    return inject("route location", {});
  } else {
    console.warn("只能在组件内使用");
  }
}
export { createRouter, createWebHashHistory, createWebHistory };
