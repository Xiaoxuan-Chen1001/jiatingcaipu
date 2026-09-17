<template>
  <van-nav-bar title="我的家庭" fixed placeholder />

  <div class="page">
    <template v-if="store.family">
      <div class="header">
        <div class="family-name">{{ store.family.name }}</div>
        <van-button
          size="mini"
          plain
          @click="rename"
          style="
            background: rgba(255, 255, 255, 0.25);
            color: #fff;
            border: none;
          "
        >
          改名
        </van-button>
      </div>

      <div class="code-card">
        <div class="code-label">家庭邀请码</div>
        <div class="code-value">{{ store.family.invite_code }}</div>
        <div class="code-tip">把邀请码发给家人，在「家庭」页输入加入</div>
        <div style="display: flex; gap: 10px">
          <van-button block round plain type="primary" @click="refresh"
            >🔄 刷新邀请码</van-button
          >
          <van-button block round plain @click="copy">📋 复制</van-button>
        </div>
      </div>

      <div class="section-title" style="margin-top: 20px">家庭成员</div>

      <!-- 成员列表 -->
      <div style="background: #fff; border-radius: 12px; overflow: hidden">
        <div v-for="m in members" :key="m.id" class="member-item">
          <img v-if="m.avatar_url" class="member-avatar" :src="m.avatar_url" />
          <div v-else class="member-avatar">👤</div>
          <div class="member-name">
            {{ m.nickname }}
            <span v-if="m.id === store.user.id" class="me-tag">我</span>
          </div>

          <!-- 只有房主才能看到“移除”按钮，且不能移除自己 -->
          <van-button
            v-if="
              store.user.id === store.family.owner_id && m.id !== store.user.id
            "
            size="mini"
            plain
            type="danger"
            @click="onKick(m)"
            >移除</van-button
          >

          <!-- 如果是房主本人，显示房主标签 -->
          <div v-else-if="m.id === store.family.owner_id" class="owner-tag">
            房主
          </div>
        </div>
      </div>

      <div class="quit" @click="quit">退出家庭</div>
    </template>

    <template v-else>
      <van-empty description="还没有加入家庭" />

      <div class="form-card">
        <div class="form-label">创建家庭</div>
        <van-field
          v-model="createName"
          placeholder="给家庭起个名字，如：幸福一家"
          maxlength="12"
        />
        <van-button
          style="margin-top: 14px"
          block
          round
          type="primary"
          @click="onCreate"
        >
          创建家庭
        </van-button>
      </div>

      <div class="form-card">
        <div class="form-label">加入家庭</div>
        <van-field
          v-model="joinCode"
          placeholder="输入 8 位数字邀请码"
          maxlength="8"
          type="digit"
        />
        <van-button
          style="margin-top: 14px"
          block
          round
          type="primary"
          @click="onJoin"
        >
          加入家庭
        </van-button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { showToast, showConfirmDialog } from "vant";
import {
  store,
  createFamily,
  joinFamily,
  refreshInviteCode,
  renameFamily,
  quitFamily,
  getFamilyMembers,
  kickMember, // 👈 确保这个引入了
} from "../store";

const createName = ref("");
const joinCode = ref("");
const members = ref([]);

async function loadMembers() {
  if (!store.family) return;
  members.value = await getFamilyMembers(store.family.id);
}

// 房主移除成员
async function onKick(member) {
  try {
    await showConfirmDialog({
      title: "移除成员",
      message: `确定要把「${member.nickname}」移出家庭吗？`,
      confirmButtonColor: "#ff4d4f",
    });
    await kickMember(member.id);
    showToast({ message: "已移除", type: "success" });
    loadMembers();
  } catch (e) {
    if (e !== "cancel") showToast(e.message);
  }
}

async function onCreate() {
  if (!store.user) return showToast("请先到「我的」设置昵称");
  try {
    await createFamily(createName.value.trim());
    showToast({ message: "创建成功", type: "success" });
    loadMembers();
  } catch (e) {
    showToast(e.message);
  }
}

async function onJoin() {
  if (!store.user) return showToast("请先到「我的」设置昵称");
  if (!/^\d{8}$/.test(joinCode.value))
    return showToast("邀请码必须是 8 位数字");
  try {
    await joinFamily(joinCode.value);
    showToast({ message: "加入成功", type: "success" });
    loadMembers();
  } catch (e) {
    showToast(e.message);
  }
}

async function refresh() {
  try {
    await refreshInviteCode();
    showToast({ message: "邀请码已刷新", type: "success" });
  } catch (e) {
    showToast(e.message);
  }
}

async function copy() {
  try {
    await navigator.clipboard.writeText(store.family.invite_code);
    showToast({ message: "已复制", type: "success" });
  } catch {
    showToast("复制失败，请长按手动复制");
  }
}

async function rename() {
  const name = window.prompt("请输入新的家庭名称", store.family.name);
  if (!name || !name.trim()) return;
  try {
    await renameFamily(name.trim());
    showToast({ message: "修改成功", type: "success" });
  } catch (e) {
    showToast(e.message);
  }
}

async function quit() {
  try {
    await showConfirmDialog({
      title: "退出家庭",
      message: "退出后无法查看该家庭的菜谱和记录，确定吗？",
    });
    await quitFamily();
    members.value = [];
    showToast({ message: "已退出", type: "success" });
  } catch {}
}

onMounted(loadMembers);
</script>
