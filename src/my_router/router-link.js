import { h, inject } from "vue";
function useLink(props) {
  const router = inject("router");
  function navigate() {
    const { to, replace } = props;
    if (!replace) {
      // push
      router.push(to);
    } else {
      // replace
      router.replace(to);
    }
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
    replace: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { slots }) {
    const link = useLink(props);
    return () => {
      return h(
        "a",
        { onClick: link.navigate },
        slots.default && slots.default()
      );
    };
  },
};
