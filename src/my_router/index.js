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

function createRouter(options) {
  const routerHistory = options.history;

  // 格式化路由配置 好处理
  const matcher = createRouterMatcher(options.routes); // 格式化好的路由routse配置

  const currentRoute = shallowRef(START_LOCATION_NORMALIZED);
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
  function finalizeNavigation(to, from, replace = false) {
    // 第一次
    if (from === START_LOCATION_NORMALIZED || replace) {
      routerHistory.replace(to.path);
    } else {
      routerHistory.push(to.path);
    }
    currentRoute.value = to;
    console.log(currentRoute.value);
    // 还需要监听 popstate
    markAsReady();
  }
  function pushWithRedirect(to) {
    // 通过routes记录 选择渲染的匹配项
    const targetLocation = resolve(to);
    const from = currentRoute.value; // 从哪里来

    finalizeNavigation(targetLocation, from);
  }
  function push(to) {
    return pushWithRedirect(to);
  }
  const router = {
    push,
    replace() {},
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
