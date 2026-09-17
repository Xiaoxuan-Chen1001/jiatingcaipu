<template>
  <van-nav-bar
    title="点菜记录"
    fixed
    placeholder
    left-arrow
    @click-left="$router.back()"
  />
  <div class="page">
    <div v-if="!plans.length" class="empty-tip">还没有点菜记录</div>
    <van-cell-group v-else inset>
      <van-cell
        v-for="p in plans"
        :key="p.planId"
        :title="
          p.planType === 'daily'
            ? `${formatDate(p.startDate)} - ${formatDate(p.endDate)} 计划`
            : `${formatDate(p.startDate)} - ${formatDate(p.endDate)} 总量计划`
        "
        :label="`共 ${p.orderCount} 个菜`"
        is-link
        @click="goDetail(p.planId, p.planType)"
      />
    </van-cell-group>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { listPlans } from "../store";

const router = useRouter();
const plans = ref([]);

function formatDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  return `${parts[1]}月${parts[2]}日`;
}

async function load() {
  plans.value = await listPlans();
}

function goDetail(planId, planType) {
  router.push({ path: "/plan-detail", query: { planId, planType } });
}

onMounted(load);
</script>
