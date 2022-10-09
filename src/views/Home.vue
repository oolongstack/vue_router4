<template>
  <div>
    <router-link to="/one">one</router-link>
    <br />
    <router-link to="/two">two</router-link>
    <router-view />
  </div>
</template>

<script>
export default {
  beforeRouteLeave(to, from, next) {
    console.log("home beforeRouteLeave");
  },
  beforeRouteUpdate(to, from, next) {
    console.log("home beforeRouteUpdate");
  },
  beforeRouteEnter(to, from, next) {
    console.log("home beforeRouteEnter");
  },
};
</script>

<style lang="scss" scoped></style>
