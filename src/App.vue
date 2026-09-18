<template>
  <van-config-provider :theme-vars="themeVars">
    <div
      v-if="store.loading"
      style="padding: 60px; text-align: center; color: #999"
    >
      加载中…
    </div>
    <template v-else>
      <router-view />
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
  </van-config-provider>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { store, initStore } from "./store";
import { themeColor, loadThemeColor } from "./theme";

const themeVars = computed(() => ({
  primaryColor: themeColor.value,
  buttonPrimaryBackground: themeColor.value,
  buttonPrimaryBorderColor: themeColor.value,
  buttonBorderRadius: "12px",
  tabActiveTextColor: themeColor.value,
  tabsBottomBarColor: themeColor.value,
  navBarTitleTextColor: "#2b2b2b",
  cellGroupInsetBorderRadius: "12px",
}));

onMounted(() => {
  loadThemeColor();
  initStore();
});
</script>
