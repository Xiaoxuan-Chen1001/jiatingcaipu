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
            {{ o.user_nickname }} 点的
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
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router"; // 引入了 useRouter
import { showToast, showConfirmDialog } from "vant";
import {
  store,
  listDishes,
  listOrdersByDate,
  addOrder,
  cancelOrder,
} from "../store";

const route = useRoute();
const router = useRouter();
const date = ref(route.query.date || ""); // 如果没传日期，给空字符
const mealType = ref("早餐");
const dishes = ref([]);
const orders = ref([]);
let timer = null;

const dateLabel = computed(() => {
  if (!date.value) return "选择日期";
  const parts = date.value.split("-").map(Number);
  if (parts.length !== 3) return "日期格式错误";
  const week = ["日", "一", "二", "三", "四", "五", "六"][
    new Date(parts[0], parts[1] - 1, parts[2]).getDay()
  ];
  return `${parts[1]}月${parts[2]}日 周${week}`;
});

async function loadDishes() {
  try {
    dishes.value = await listDishes();
  } catch (e) {
    showToast(e.message);
  }
}

async function loadOrders() {
  if (!date.value) return;
  try {
    orders.value = await listOrdersByDate(date.value, mealType.value);
  } catch (e) {
    console.error(e);
  }
}

async function onOrder(d) {
  if (!date.value) return showToast("日期无效");
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
  try {
    await cancelOrder(id);
    loadOrders();
  } catch (e) {
    showToast(e.message);
  }
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

onMounted(async () => {
  if (!date.value) {
    showToast("参数丢失，请重新进入");
    setTimeout(() => router.back(), 1000);
    return;
  }
  await loadDishes();
  await loadOrders();
  // 每 3 秒自动刷新，同步家人的点菜
  timer = setInterval(loadOrders, 3000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.dish-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.dish-card {
  position: relative;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.dish-card-img {
  width: 100%;
  height: 130px;
  display: block;
  object-fit: cover;
}
.dish-card-img.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  font-size: 42px;
}
.dish-card-body {
  padding: 10px 12px 12px;
}
.dish-name {
  font-size: 15px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dish-cat {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
.dish-add {
  position: absolute;
  right: 10px;
  bottom: 12px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff9a5a, #ff7a45);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 4px 10px rgba(255, 122, 69, 0.4);
}
</style>
