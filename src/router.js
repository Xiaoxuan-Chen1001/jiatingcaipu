import { createRouter, createWebHashHistory } from "vue-router";

const routes = [
  { path: "/login", component: () => import("./views/Login.vue") },
  {
    path: "/account-manage",
    component: () => import("./views/AccountManage.vue"),
  },
  { path: "/", redirect: "/home" },
  { path: "/home", component: () => import("./views/Home.vue") },
  { path: "/daily-order", component: () => import("./views/DailyOrder.vue") },
  {
    path: "/order-history",
    component: () => import("./views/OrderHistory.vue"),
  },
  { path: "/plan-detail", component: () => import("./views/PlanDetail.vue") },
  { path: "/dishes", component: () => import("./views/Dishes.vue") },
  { path: "/dish-edit", component: () => import("./views/DishEdit.vue") },
  { path: "/dish/:id", component: () => import("./views/DishDetail.vue") },
  { path: "/family", component: () => import("./views/Family.vue") },
  { path: "/mine", component: () => import("./views/Mine.vue") },
];

// 1. 先创建 router 实例
const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

// 2. 再给 router 添加守卫（因为此时 router 已经存在了）
router.beforeEach((to, from, next) => {
  const user = localStorage.getItem("fc_user");
  if (to.path !== "/login" && !user) {
    next("/login");
  } else if (to.path === "/login" && user) {
    next("/home");
  } else {
    next();
  }
});

// 3. 最后导出 router
export default router;
