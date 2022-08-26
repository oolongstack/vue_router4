<template>
  <router-link to="/" :replace="false">home</router-link>
  <br>
  <router-link to="/about" :replace="false">about</router-link>

  <router-view>
    default内容
  </router-view>
</template>
<script setup>
import { useRouter, useRoute } from '@/my_router'
import { getCurrentInstance } from 'vue';

</script>
<style scoped>
</style>
