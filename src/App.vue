<template>
  <div
    v-if="store.loading"
    style="padding: 60px; text-align: center; color: #999"
  >
    加载中…
  </div>
  <template v-else>
    <router-view />
    <!-- 只有不在登录页时，才显示底部 Tabbar -->
    <van-tabbar route v-if="$route.path !== '/login'">
      <van-tabbar-item replace to="/home" icon="shopping-cart-o"
        >点菜</van-tabbar-item
      >
      <van-tabbar-item replace to="/dishes" icon="orders-o"
        >菜谱</van-tabbar-item
      >
      <van-tabbar-item replace to="/family" icon="friends-o"
        >家庭</van-tabbar-item
      >
      <van-tabbar-item replace to="/mine" icon="user-o">我的</van-tabbar-item>
    </van-tabbar>
  </template>
</template>

<script setup>
import { onMounted } from "vue";
import { store, initStore } from "./store";

onMounted(initStore);
</script>
