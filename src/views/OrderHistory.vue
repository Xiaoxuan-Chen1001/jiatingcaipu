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

    <div v-else class="plan-list">
      <div
        v-for="p in plans"
        :key="p.planId"
        class="plan-card"
        :class="p.planType === 'daily' ? 'is-daily' : 'is-total'"
        @click="goDetail(p.planId, p.planType)"
      >
        <div class="plan-bar"></div>
        <div class="plan-body">
          <div class="plan-title">
            {{ formatRange(p.startDate, p.endDate) }}
          </div>
          <div class="plan-meta">
            <span class="plan-count">{{ p.orderCount }} 个菜</span>
            <span class="plan-type">
              {{ p.planType === "daily" ? "一天天点" : "按总量点" }}
            </span>
          </div>
        </div>
        <van-icon name="arrow" class="plan-arrow" />
      </div>
    </div>
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

function formatRange(start, end) {
  if (!start) return "";
  const s = formatDate(start);
  const e = formatDate(end);
  return s === e ? s : `${s} - ${e}`;
}

async function load() {
  plans.value = await listPlans();
}

function goDetail(planId, planType) {
  router.push({ path: "/plan-detail", query: { planId, planType } });
}

onMounted(load);
</script>

<style scoped>
.plan-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plan-card {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 14px 16px 14px 20px;
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}
.plan-card:active {
  transform: scale(0.985);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

/* 左侧色条 */
.plan-bar {
  position: absolute;
  left: 0;
  top: 14px;
  bottom: 14px;
  width: 4px;
  border-radius: 0 4px 4px 0;
}
.plan-card.is-daily .plan-bar {
  background: var(--brand-gradient);
}
.plan-card.is-total .plan-bar {
  background: linear-gradient(180deg, var(--brand-lighter), var(--brand-light));
}

.plan-body {
  flex: 1;
  min-width: 0;
}

.plan-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-main);
  margin-bottom: 6px;
}

.plan-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.plan-count {
  font-size: 12px;
  color: var(--text-muted);
}

.plan-type {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
}
.plan-card.is-daily .plan-type {
  background: var(--brand-soft);
  color: var(--brand);
}
.plan-card.is-total .plan-type {
  background: #fff7f0;
  color: #d97a3f;
}

.plan-arrow {
  color: #c2c6cc;
  font-size: 16px;
  margin-left: 8px;
}
</style>
