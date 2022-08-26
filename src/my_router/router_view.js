import { computed, h, inject, provide } from "vue";

export const RouterView = {
  name: "RouterView",
  setup(_, { slots }) {
    // 先去取一次depth，娶不到就说明是第一次渲染router-view，并且层级默认为0
    const depth = inject("depth", 0);
    // setup 只会执行一次
    const injectRoute = inject("route location");

    const matchedRouteRef = computed(() => injectRoute.matched[depth]);

    // 记录层级 因为组件由父到子进行渲染，在第一次渲染router-view时可以提供一个层级
    provide("depth", depth + 1);

    return () => {
      const matchRoute = matchedRouteRef.value;
      const viewComponent = matchRoute && matchRoute.components.default;
      // console.log(viewComponent);
      if (!viewComponent) {
        return h("div", null, slots.default && slots.default());
      }
      return h(viewComponent);
    };
  },
};
