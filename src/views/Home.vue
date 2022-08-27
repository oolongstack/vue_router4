<template>
  <div>
    <router-link to="/one">one</router-link>
    <br>
    <router-link to="/two">two</router-link>
    <router-view></router-view>
  </div>
</template>

<script>

export default {
  beforeRouteLeave(to, from, next) {
    console.log('home beforeRouteLeave');
    next()
  },

  beforeRouteUpdate(to, from, next) {
    console.log('home beforeRouteUpdate');
    next()
  },
  beforeRouteEnter(to, from, next) {
    console.log('home beforeRouteEnter');
    next()
  }
}
</script>

<style lang="scss" scoped>
</style>