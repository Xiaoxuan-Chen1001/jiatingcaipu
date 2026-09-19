<template>
  <van-nav-bar
    title="菜品详情"
    fixed
    placeholder
    left-arrow
    @click-left="$router.back()"
  />

  <div v-if="loading" class="loading-tip">加载中…</div>
  <div v-else-if="!dish" class="empty-tip">菜品不存在或已删除</div>

  <div v-else class="page">
    <div class="detail-card">
      <img v-if="dish.image_url" :src="dish.image_url" class="detail-img" />
      <div v-else class="detail-img placeholder">🍲</div>

      <div class="detail-body">
        <div class="detail-name">{{ dish.name }}</div>
        <div class="detail-cat">{{ dish.category }}</div>

        <div class="stat-row">
          <div class="stat-block">
            <div class="stat-num">{{ stats.recent30 }}</div>
            <div class="stat-label">近 30 天点过</div>
          </div>
          <div class="stat-line"></div>
          <div class="stat-block">
            <div class="stat-num">{{ stats.total }}</div>
            <div class="stat-label">累计点过</div>
          </div>
        </div>

        <div class="detail-section-title">描述</div>
        <div class="detail-desc">
          {{ dish.description || "暂无描述" }}
        </div>
      </div>
    </div>

    <div class="action-row">
      <van-button block round @click="goEdit">编辑</van-button>
      <van-button block round type="danger" @click="onDelete">删除</van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { showToast, showConfirmDialog } from "vant";
import { supabase } from "../supabase";
import { store, getDishOrderStats, deleteDish } from "../store";

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const dish = ref(null);
const stats = reactive({ total: 0, recent30: 0 });

async function loadDish() {
  const id = route.params.id;
  if (!id) {
    loading.value = false;
    return;
  }
  const { data, error } = await supabase
    .from("dishes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    loading.value = false;
    return;
  }
  dish.value = data;
  loading.value = false;

  // 加载统计（失败了不影响详情展示）
  if (store.family) {
    try {
      const s = await getDishOrderStats(id, store.family.id);
      stats.total = s.total;
      stats.recent30 = s.recent30;
    } catch (e) {
      console.error("加载统计失败", e);
    }
  }
}

function goEdit() {
  router.push({ path: "/dish-edit", query: { id: dish.value.id } });
}

async function onDelete() {
  try {
    await showConfirmDialog({
      title: "删除菜品",
      message: `确定删除「${dish.value.name}」吗？`,
    });
    await deleteDish(dish.value.id);
    showToast({ message: "已删除", type: "success" });
    router.back();
  } catch {}
}

onMounted(loadDish);
</script>

<style scoped>
.loading-tip,
.empty-tip {
  text-align: center;
  color: var(--text-muted);
  padding: 60px 20px;
  font-size: 14px;
}

.detail-card {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-card);
}

.detail-img {
  width: 100%;
  height: 240px;
  display: block;
  object-fit: cover;
}
.detail-img.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  font-size: 64px;
}

.detail-body {
  padding: 18px 16px 20px;
}

.detail-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main);
}

.detail-cat {
  font-size: 12px;
  color: var(--brand);
  background: var(--brand-soft);
  display: inline-block;
  padding: 2px 10px;
  border-radius: var(--radius-pill);
  margin-top: 8px;
}

.stat-row {
  display: flex;
  align-items: center;
  background: var(--brand-soft);
  border-radius: var(--radius-md);
  padding: 14px 0;
  margin-top: 18px;
}
.stat-block {
  flex: 1;
  text-align: center;
}
.stat-num {
  font-size: 22px;
  font-weight: 700;
  color: var(--brand);
}
.stat-label {
  font-size: 12px;
  color: var(--text-sub);
  margin-top: 4px;
}
.stat-line {
  width: 1px;
  height: 28px;
  background: rgba(0, 0, 0, 0.06);
}

.detail-section-title {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 20px;
  margin-bottom: 8px;
}
.detail-desc {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-main);
  white-space: pre-wrap;
  word-break: break-word;
}

.action-row {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}
</style>
