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

    <div style="margin-top: 12px">
      <div v-if="!dishes.length" class="empty-tip">
        还没有菜品，点右下角添加吧～
      </div>
      <van-cell-group v-else inset>
        <van-cell v-for="d in dishes" :key="d.id">
          <template #icon>
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
          <template #title>
            <div style="font-size: 15px; font-weight: 600">{{ d.name }}</div>
            <div style="font-size: 12px; color: #999; margin-top: 4px">
              {{ d.description || "暂无描述" }}
            </div>
          </template>
          <template #value>
            <van-button size="mini" plain type="primary" @click="edit(d)"
              >编辑</van-button
            >
            <van-button
              size="mini"
              plain
              type="danger"
              @click="del(d)"
              style="margin-left: 6px"
              >删除</van-button
            >
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <van-button class="fab" type="primary" icon="plus" round @click="add" />
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { showToast, showConfirmDialog } from "vant";
import { store, listDishes, deleteDish } from "../store";

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
.fab {
  position: fixed;
  right: 24px;
  bottom: 90px;
  width: 56px;
  height: 56px;
  font-size: 22px;
  box-shadow: 0 6px 16px var(--shadow-brand);
}
</style>
