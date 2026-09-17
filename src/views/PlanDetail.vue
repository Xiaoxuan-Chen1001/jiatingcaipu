<template>
  <van-nav-bar
    title="计划明细"
    fixed
    placeholder
    left-arrow
    @click-left="$router.back()"
  />
  <div class="page">
    <div v-if="planType === 'daily'">
      <div v-for="day in dailyGroups" :key="day.date" class="plan-day">
        <div class="plan-day-title">{{ formatDate(day.date) }}</div>
        <van-cell-group inset>
          <van-cell v-for="o in day.orders" :key="o.id">
            <template #title>
              <span style="font-size: 14px"
                >{{ o.meal_type }} · {{ o.dish_name }}</span
              >
            </template>
            <template #value>
              <van-button size="mini" type="danger" @click="removeOne(o.id)"
                >删除</van-button
              >
            </template>
          </van-cell>
        </van-cell-group>
      </div>
    </div>

    <div v-else>
      <div class="plan-day-title">总量计划（不分具体日期）</div>
      <van-cell-group inset>
        <van-cell v-for="o in totalOrders" :key="o.id">
          <template #title>
            <span style="font-size: 14px"
              >{{ o.meal_type }} · {{ o.dish_name }}</span
            >
          </template>
          <template #value>
            <van-button size="mini" type="danger" @click="removeOne(o.id)"
              >删除</van-button
            >
          </template>
        </van-cell>
      </van-cell-group>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { listOrdersByPlan, cancelOrder } from "../store";

const route = useRoute();
const planId = ref(route.query.planId || "");
const planType = ref(route.query.planType || "daily");
const orders = ref([]);

const dailyGroups = computed(() => {
  const map = {};
  orders.value.forEach((o) => {
    if (!map[o.date]) map[o.date] = { date: o.date, orders: [] };
    map[o.date].orders.push(o);
  });
  return Object.values(map);
});

const totalOrders = computed(() => orders.value);

function formatDate(dateStr) {
  if (!dateStr) return "未指定日期";
  const parts = dateStr.split("-");
  return `${parts[1]}月${parts[2]}日`;
}

async function load() {
  orders.value = await listOrdersByPlan(planId.value);
}

async function removeOne(id) {
  await cancelOrder(id);
  load();
}

onMounted(load);
</script>

<style scoped>
.plan-day {
  margin-bottom: 20px;
}
.plan-day-title {
  font-size: 15px;
  font-weight: 600;
  padding: 8px 16px;
}
</style>
