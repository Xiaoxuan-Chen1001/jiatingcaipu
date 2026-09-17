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
        <!-- 隐藏的文件选择器 -->
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
      <!--  新增：点菜记录入口  -->
      <div class="menu-item" @click="$router.push('/order-history')">
        <span>点菜记录</span><span class="menu-arrow">›</span>
      </div>
      <!-- 新增：点菜记录入口 -->
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
    </div>
  </div>

  <!-- 修改昵称弹窗（改用更稳定的 van-popup） -->
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

/* ==================== 头像上传逻辑 ==================== */
const fileInputRef = ref(null);

// 触发电脑文件选择器
function triggerAvatarUpload() {
  if (!store.user) {
    showToast("请先设置昵称");
    return;
  }
  fileInputRef.value.click();
}

// 处理选中的图片并上传
async function handleAvatarChange(e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    showToast({ message: "上传中...", duration: 0, forbidClick: true });
    // 上传到 Supabase 的 avatars 存储桶
    const fileUrl = await uploadImage(file, "avatars");
    // 更新用户资料
    await updateProfile({ avatar_url: fileUrl });

    // 立即更新页面上的头像（无需刷新页面）
    store.user.avatar_url = fileUrl;

    showToast({ message: "头像更新成功", type: "success" });
  } catch (err) {
    showToast("上传失败：" + err.message);
  } finally {
    showToast.clear();
  }
}

const showDialog = ref(false);
const nicknameInput = ref("");

// 打开弹窗，并自动填入原有昵称
function openNicknameDialog() {
  nicknameInput.value = store.user?.nickname || "";
  showDialog.value = true;
}

// 保存昵称
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
    // 刷新页面状态，让顶部卡片和统计数据同步更新
    window.location.reload();
  } catch (e) {
    showToast(e.message);
  }
}

watch(() => store.family, loadStats, { immediate: true });
onMounted(loadStats);
</script>
