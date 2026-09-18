<template>
  <van-nav-bar title="我的" fixed placeholder />

  <div class="page">
    <div class="profile-card">
      <div class="avatar-wrapper" @click="triggerAvatarUpload">
        <img
          v-if="store.user?.avatar_url"
          class="profile-avatar"
          :src="store.user.avatar_url"
        />
        <div v-else class="profile-avatar">👤</div>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          style="display: none"
          @change="handleAvatarChange"
        />
      </div>
      <div style="flex: 1">
        <div class="profile-nickname">
          {{ store.user?.nickname || "未设置昵称" }}
        </div>
        <div class="profile-sub">
          {{ store.family ? store.family.name : "尚未加入家庭" }}
        </div>
      </div>
    </div>

    <div class="stats">
      <div class="stat-item">
        <div class="stat-num">{{ stats.dishes }}</div>
        <div class="stat-label">菜品</div>
      </div>
      <div class="stat-line"></div>
      <div class="stat-item">
        <div class="stat-num">{{ stats.orders }}</div>
        <div class="stat-label">点菜记录</div>
      </div>
      <div class="stat-line"></div>
      <div class="stat-item">
        <div class="stat-num">{{ stats.members }}</div>
        <div class="stat-label">家庭成员</div>
      </div>
    </div>

    <div class="menu-card">
      <div class="menu-item" @click="$router.push('/order-history')">
        <span>点菜记录</span><span class="menu-arrow">›</span>
      </div>
      <div class="menu-item" @click="$router.push('/account-manage')">
        <span>账号安全与管理</span><span class="menu-arrow">›</span>
      </div>
      <div class="menu-item" @click="$router.push('/family')">
        <span>我的家庭</span><span class="menu-arrow">›</span>
      </div>
      <div class="menu-item" @click="$router.push('/dishes')">
        <span>菜谱管理</span><span class="menu-arrow">›</span>
      </div>
      <div v-if="store.user" class="menu-item" @click="openNicknameDialog">
        <span>修改昵称</span><span class="menu-arrow">›</span>
      </div>
      <!-- 新增：主题色入口 -->
      <div class="menu-item" @click="showThemePicker = true">
        <span>主题色</span>
        <span class="menu-theme-dot" :style="{ background: themeColor }"></span>
      </div>
    </div>
  </div>

  <!-- 修改昵称弹窗 -->
  <van-popup
    v-model:show="showDialog"
    round
    position="bottom"
    :style="{ padding: '24px' }"
  >
    <div
      style="
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 16px;
        text-align: center;
      "
    >
      {{ store.user ? "修改昵称" : "设置昵称" }}
    </div>
    <van-field
      v-model="nicknameInput"
      placeholder="请输入你的昵称"
      maxlength="12"
    />
    <div style="display: flex; gap: 12px; margin-top: 24px">
      <van-button block round @click="showDialog = false">取消</van-button>
      <van-button block round type="primary" @click="saveNickname"
        >确认</van-button
      >
    </div>
  </van-popup>

  <!-- 新增：主题色选择弹窗 -->
  <van-popup
    v-model:show="showThemePicker"
    round
    position="bottom"
    :style="{ padding: '24px 20px 32px' }"
  >
    <div class="theme-title">选择主题色</div>
    <div class="theme-sub">选一个你喜欢的颜色，整个 App 会跟着变</div>

    <div class="theme-grid">
      <div
        v-for="c in PRESET_COLORS"
        :key="c"
        class="theme-swatch"
        :class="{ active: c === themeColor }"
        :style="{ background: c }"
        @click="pickColor(c)"
      >
        <van-icon v-if="c === themeColor" name="success" color="#fff" />
      </div>
    </div>

    <div class="theme-custom">
      <label class="theme-custom-label">
        <span>自定义颜色</span>
        <input
          type="color"
          :value="themeColor"
          @input="pickColor($event.target.value)"
          class="theme-color-input"
        />
      </label>
    </div>

    <van-button
      block
      round
      type="primary"
      style="margin-top: 24px"
      @click="showThemePicker = false"
      >完成</van-button
    >
  </van-popup>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from "vue";
import { showToast } from "vant";
import { supabase } from "../supabase";
import {
  store,
  register,
  updateProfile,
  getFamilyMembers,
  uploadImage,
} from "../store";
import { themeColor, applyThemeColor, PRESET_COLORS } from "../theme";

const stats = reactive({ dishes: 0, orders: 0, members: 0 });

async function loadStats() {
  if (!store.family) {
    stats.dishes = stats.orders = stats.members = 0;
    return;
  }
  const fid = store.family.id;
  const [d, o, m] = await Promise.all([
    supabase
      .from("dishes")
      .select("id", { count: "exact", head: true })
      .eq("family_id", fid),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("family_id", fid),
    getFamilyMembers(fid),
  ]);
  stats.dishes = d.count || 0;
  stats.orders = o.count || 0;
  stats.members = m.length;
}

/* ==================== 主题色 ==================== */
const showThemePicker = ref(false);

function pickColor(hex) {
  applyThemeColor(hex);
}

/* ==================== 头像上传 ==================== */
const fileInputRef = ref(null);

function triggerAvatarUpload() {
  if (!store.user) {
    showToast("请先设置昵称");
    return;
  }
  fileInputRef.value.click();
}

async function handleAvatarChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    showToast({ message: "上传中...", duration: 0, forbidClick: true });
    const fileUrl = await uploadImage(file, "avatars");
    await updateProfile({ avatar_url: fileUrl });
    store.user.avatar_url = fileUrl;
    showToast({ message: "头像更新成功", type: "success" });
  } catch (err) {
    showToast("上传失败：" + err.message);
  } finally {
    showToast.clear();
  }
}

/* ==================== 修改昵称 ==================== */
const showDialog = ref(false);
const nicknameInput = ref("");

function openNicknameDialog() {
  nicknameInput.value = store.user?.nickname || "";
  showDialog.value = true;
}

async function saveNickname() {
  const name = nicknameInput.value.trim();
  if (!name) {
    showToast("昵称不能为空");
    return;
  }
  try {
    if (store.user) {
      await updateProfile({ nickname: name });
    } else {
      await register(name);
    }
    showToast({ message: "保存成功", type: "success" });
    window.location.reload();
  } catch (e) {
    showToast(e.message);
  }
}

watch(() => store.family, loadStats, { immediate: true });
onMounted(loadStats);
</script>

<style scoped>
/* 新增：主题色相关样式 */
.menu-theme-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-block;
  box-shadow:
    0 0 0 2px #fff,
    0 0 0 3px rgba(0, 0, 0, 0.06);
}

.theme-title {
  font-size: 17px;
  font-weight: 600;
  text-align: center;
  color: var(--text-main);
}
.theme-sub {
  font-size: 13px;
  color: var(--text-muted);
  text-align: center;
  margin-top: 6px;
  margin-bottom: 20px;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}
.theme-swatch {
  aspect-ratio: 1;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.theme-swatch:active {
  transform: scale(0.92);
}
.theme-swatch.active {
  box-shadow:
    0 0 0 3px #fff,
    0 0 0 5px var(--brand);
}

.theme-custom {
  border-top: 1px solid var(--border-soft);
  padding-top: 18px;
}
.theme-custom-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  color: var(--text-main);
  cursor: pointer;
}
.theme-color-input {
  width: 44px;
  height: 44px;
  border: none;
  background: none;
  padding: 0;
  cursor: pointer;
  border-radius: 50%;
  overflow: hidden;
}
.theme-color-input::-webkit-color-swatch-wrapper {
  padding: 0;
}
.theme-color-input::-webkit-color-swatch {
  border: none;
  border-radius: 50%;
}
</style>
