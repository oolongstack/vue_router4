import { computed, h, inject, provide } from "vue";

export const RouterView = {
  name: "RouterView",
  setup(props, { slots }) {
    const injectRoute = inject("route location");
    const depth = inject("depth", 0);
    const matchedRouteRef = computed(() => injectRoute.matched[depth]);
    provide("depth", depth + 1);
    return () => {
      const matchRoute = matchedRouteRef.value;
      const viewComponent = matchRoute && matchRoute.components.default;

      if (!viewComponent) {
        return (slots.default && slots.default()) || "";
      } else {
        return h(viewComponent);
      }
    };
  },
};
