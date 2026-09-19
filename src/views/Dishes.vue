<template>
  <van-nav-bar title="我的菜谱" fixed placeholder />

  <div class="page">
    <van-search
      v-model="keyword"
      placeholder="搜索菜名"
      @update:model-value="onSearch"
    />
    <van-tabs v-model:active="category" @change="load" shrink>
      <van-tab v-for="c in categories" :key="c" :title="c" :name="c" />
    </van-tabs>

    <!-- 管理按钮：分类下方，靠右 -->
    <div class="manage-row">
      <span class="manage-btn" @click="toggleManage">
        {{ manageMode ? "取消" : "管理" }}
      </span>
    </div>

    <div style="margin-top: 12px">
      <div v-if="!dishes.length" class="empty-tip">
        还没有菜品，点右下角添加吧～
      </div>
      <van-cell-group v-else inset>
        <van-cell v-for="d in dishes" :key="d.id" @click="onCellClick(d)">
          <template #icon>
            <!-- 管理模式：显示勾选框 -->
            <van-checkbox
              v-if="manageMode"
              :model-value="selectedIds.includes(d.id)"
              @click.stop="toggleSelect(d.id)"
              class="cell-checkbox"
            />
            <!-- 非管理模式：显示缩略图 -->
            <template v-else>
              <img
                v-if="d.image_url"
                :src="d.image_url"
                class="dish-thumb"
                style="width: 60px; height: 60px"
              />
              <div
                v-else
                class="dish-thumb placeholder"
                style="width: 60px; height: 60px"
              >
                🍲
              </div>
            </template>
          </template>
          <template #title>
            <div style="font-size: 15px; font-weight: 600">{{ d.name }}</div>
            <div style="font-size: 12px; color: #999; margin-top: 4px">
              {{ d.description || "暂无描述" }}
            </div>
          </template>
          <template #value>
            <!-- 管理模式：隐藏编辑/删除 -->
            <template v-if="!manageMode">
              <van-button size="mini" plain type="primary" @click.stop="edit(d)"
                >编辑</van-button
              >
              <van-button
                size="mini"
                plain
                type="danger"
                @click.stop="del(d)"
                style="margin-left: 6px"
                >删除</van-button
              >
            </template>
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 非管理模式才显示添加按钮 -->
    <van-button
      v-if="!manageMode"
      class="fab"
      type="primary"
      icon="plus"
      round
      @click="add"
    />
  </div>

  <!-- 管理模式：底部工具栏 -->
  <div v-if="manageMode" class="manage-bar">
    <van-checkbox :model-value="allSelected" @click="toggleAll">
      全选
    </van-checkbox>
    <div style="flex: 1"></div>
    <van-button
      size="small"
      type="danger"
      round
      :disabled="!selectedIds.length"
      @click="onBatchDelete"
    >
      删除{{ selectedIds.length ? `（${selectedIds.length}）` : "" }}
    </van-button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { showToast, showConfirmDialog } from "vant";
import { store, listDishes, deleteDish, deleteDishes } from "../store";

const router = useRouter();
const categories = [
  "全部",
  "早餐",
  "家常菜",
  "汤羹",
  "主食",
  "凉菜",
  "甜点",
  "水果",
  "小吃",
  "其他",
];
const category = ref("全部");
const keyword = ref("");
const dishes = ref([]);
let timer = null;

/* ==================== 管理模式 ==================== */
const manageMode = ref(false);
const selectedIds = ref([]);

const allSelected = computed(
  () =>
    dishes.value.length > 0 && selectedIds.value.length === dishes.value.length,
);

function toggleManage() {
  manageMode.value = !manageMode.value;
  if (!manageMode.value) selectedIds.value = [];
}

function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id);
  if (idx >= 0) selectedIds.value.splice(idx, 1);
  else selectedIds.value.push(id);
}

function toggleAll() {
  if (allSelected.value) selectedIds.value = [];
  else selectedIds.value = dishes.value.map((d) => d.id);
}

function onCellClick(d) {
  if (manageMode.value) toggleSelect(d.id);
  else goDetail(d);
}

async function onBatchDelete() {
  if (!selectedIds.value.length) return;
  try {
    await showConfirmDialog({
      title: "批量删除",
      message: `确定删除选中的 ${selectedIds.value.length} 道菜吗？`,
    });
    await deleteDishes(selectedIds.value);
    showToast({ message: "已删除", type: "success" });
    selectedIds.value = [];
    manageMode.value = false;
    load();
  } catch {}
}

/* ==================== 原有逻辑 ==================== */
async function load() {
  if (!store.family) return;
  try {
    dishes.value = await listDishes(category.value, keyword.value);
  } catch (e) {
    showToast(e.message);
  }
}

function onSearch() {
  clearTimeout(timer);
  timer = setTimeout(load, 300);
}

function add() {
  if (!store.family) return showToast("请先创建或加入家庭");
  router.push("/dish-edit");
}

function edit(d) {
  router.push({ path: "/dish-edit", query: { id: d.id } });
}

function goDetail(d) {
  router.push(`/dish/${d.id}`);
}

async function del(d) {
  try {
    await showConfirmDialog({
      title: "删除菜品",
      message: `确定删除「${d.name}」吗？`,
    });
    await deleteDish(d.id);
    showToast({ message: "已删除", type: "success" });
    load();
  } catch {}
}

onMounted(load);
</script>

<style scoped>
.manage-row {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px 0;
}

.manage-btn {
  color: var(--brand);
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
}

.cell-checkbox {
  margin-right: 12px;
}

.fab {
  position: fixed;
  right: 24px;
  bottom: 90px;
  width: 56px;
  height: 56px;
  font-size: 22px;
  box-shadow: 0 6px 16px rgba(255, 122, 69, 0.4);
}

/* 底部批量操作栏 */
.manage-bar {
  position: fixed;
  left: 50%;
  bottom: 50px;
  transform: translateX(-50%);
  width: 100%;
  max-width: 640px;
  background: #fff;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
  z-index: 10;
  box-sizing: border-box;
}
</style>
