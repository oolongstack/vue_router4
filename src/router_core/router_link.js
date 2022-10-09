import { h, inject } from "vue";
function useLink({ to }) {
  const router = inject("router");
  function navigate() {
    router.push(to);
  }
  return {
    navigate,
  };
}
export const RouterLink = {
  name: "RouterLink",
  props: {
    to: {
      type: [String, Object],
      required: true,
    },
  },
  setup(props, { slots }) {
    const link = useLink(props);
    return () => {
      return h(
        "a",
        {
          onClick: link.navigate,
        },
        slots.default && slots.default()
      );
    };
  },
};
