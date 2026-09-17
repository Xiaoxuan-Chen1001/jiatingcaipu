<template>
  <van-nav-bar
    :title="dateLabel"
    fixed
    placeholder
    left-arrow
    @click-left="$router.back()"
  />
  <div class="page">
    <van-tabs v-model:active="mealType" shrink>
      <van-tab title="早餐" name="早餐" />
      <van-tab title="正餐" name="正餐" />
    </van-tabs>

    <div class="section-title" style="margin-top: 16px">
      <span>已点菜品（{{ orders.length }}）</span>
      <van-button
        v-if="orders.length"
        size="mini"
        plain
        type="danger"
        @click="clearAll"
        >清空</van-button
      >
    </div>
    <div v-if="!orders.length" class="empty-tip">
      还没有点菜，去下面点一道吧～
    </div>
    <van-cell-group v-else inset>
      <van-cell v-for="o in orders" :key="o.id">
        <template #title>
          <div style="font-size: 15px; font-weight: 500">{{ o.dish_name }}</div>
          <div style="font-size: 12px; color: #999; margin-top: 4px">
            {{ o.user_nickname }}
          </div>
        </template>
        <template #value>
          <van-button size="mini" type="danger" @click="removeOne(o.id)"
            >删除</van-button
          >
        </template>
      </van-cell>
    </van-cell-group>

    <div class="section-title" style="margin-top: 24px">选菜</div>
    <div class="dish-grid">
      <div v-for="d in dishes" :key="d.id" class="dish-card">
        <img v-if="d.image_url" :src="d.image_url" class="dish-card-img" />
        <div v-else class="dish-card-img placeholder">🍲</div>
        <div class="dish-card-body">
          <div class="dish-name">{{ d.name }}</div>
          <div class="dish-cat">{{ d.category }}</div>
        </div>
        <div class="dish-add" @click="onOrder(d)">＋</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import { showToast, showConfirmDialog } from "vant";
import {
  store,
  listDishes,
  listOrdersByDate,
  addOrder,
  cancelOrder,
} from "../store";

const route = useRoute();
const date = ref(route.query.date || "");
const mealType = ref("早餐");
const dishes = ref([]);
const orders = ref([]);

const dateLabel = computed(() => {
  const parts = date.value.split("-").map(Number);
  const week = ["日", "一", "二", "三", "四", "五", "六"][
    new Date(parts[0], parts[1] - 1, parts[2]).getDay()
  ];
  return `${parts[1]}月${parts[2]}日 周${week}`;
});

async function loadDishes() {
  dishes.value = await listDishes();
}

async function loadOrders() {
  orders.value = await listOrdersByDate(date.value, mealType.value);
}

async function onOrder(d) {
  try {
    const planId = "p_daily_" + date.value;
    await addOrder(
      d,
      date.value,
      mealType.value,
      planId,
      "daily",
      date.value,
      date.value,
    );
    showToast({ message: "已加入", type: "success" });
    loadOrders();
  } catch (e) {
    showToast(e.message);
  }
}

async function removeOne(id) {
  await cancelOrder(id);
  loadOrders();
}

async function clearAll() {
  try {
    await showConfirmDialog({
      title: "清空",
      message: "确定清空这天该餐次的所有菜品吗？",
    });
    for (let o of orders.value) {
      await cancelOrder(o.id);
    }
    loadOrders();
  } catch {}
}

watch(mealType, loadOrders);

let timer = null;

onMounted(async () => {
  await loadDishes();
  await loadOrders();
  // 每 3 秒自动刷新一次，让别人点的菜实时同步过来
  timer = setInterval(loadOrders, 3000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>
