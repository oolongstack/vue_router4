<template>
  <div>About</div>
</template>

<script>
export default {
  beforeRouteLeave(to, from, next) {
    console.log("about beforeRouteLeave");
  },
  beforeRouteUpdate(to, from, next) {
    console.log("about beforeRouteUpdate");
  },
  beforeRouteEnter(to, from, next) {
    console.log("about beforeRouteEnter");
  },
};
</script>

<style lang="scss" scoped></style>
