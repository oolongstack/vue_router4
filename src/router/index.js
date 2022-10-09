// import { createRouter, createWebHistory } from "vue-router"; //官网

import { createRouter, createWebHistory } from "@/router_core";
import Home from "../views/Home.vue";
import One from "../views/HomeChild1.vue";
import Two from "../views/HomeChild2.vue";

import About from "../views/About.vue";
const routes = [
  {
    path: "/",
    component: Home,
    children: [
      {
        path: "one",
        component: One,
      },
      {
        path: "two",
        component: Two,
      },
    ],
  },
  {
    path: "/about",
    component: About,
    beforeEnter(to, from, next) {
      console.log("about router beforeEnter");
      next();
    },
  },
];

const router = createRouter({
  routes,
  history: createWebHistory(),
});

router.beforeEach((to, from, next) => {
  console.log("beforeEach", to, from);
});

router.beforeResolve((to, from, next) => {
  console.log("beforeResolve");
});

router.afterEach((to, from) => {
  console.log("afterEach", to, from);
});

export default router;
