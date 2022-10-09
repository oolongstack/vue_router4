<template>
  <router-link to="/" :replace="false">home</router-link>
  <br />
  <router-link to="/about" :replace="false">about</router-link>

  <router-view />
</template>
<script setup>
import { useRouter, useRoute } from "@/router_core";
const router = useRouter();
const route = useRoute();
console.log(router, "router");
console.log(route, "route");
</script>
<style scoped></style>
