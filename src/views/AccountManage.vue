<template>
  <van-nav-bar
    title="账号安全与管理"
    fixed
    placeholder
    left-arrow
    @click-left="$router.back()"
  />
  <div class="page">
    <van-cell-group inset>
      <van-cell
        title="修改昵称"
        :value="store.user?.nickname"
        is-link
        @click="openEdit('nickname')"
      />
      <van-cell
        title="修改手机号"
        :value="store.user?.phone"
        is-link
        @click="openEdit('phone')"
      />
      <van-cell title="修改密码" is-link @click="openEdit('password')" />
      <van-cell title="修改安全密钥" is-link @click="openEdit('securityKey')" />
    </van-cell-group>

    <van-button
      block
      round
      type="danger"
      style="margin-top: 40px"
      @click="onLogout"
      >退出登录</van-button
    >

    <!-- 修改弹窗 -->
    <van-popup
      v-model:show="showEdit"
      position="bottom"
      round
      :style="{ padding: '24px' }"
    >
      <h3 style="text-align: center; margin-top: 0">{{ editTitle }}</h3>

      <template v-if="editType === 'nickname'">
        <van-field
          v-model="form.nickname"
          label="新昵称"
          placeholder="请输入新昵称"
        />
      </template>

      <template v-else-if="editType === 'phone'">
        <van-field
          v-model="form.phone"
          label="新手机号"
          placeholder="请输入新手机号"
          type="tel"
          maxlength="11"
        />
        <van-field
          v-model="form.password"
          label="原密码"
          placeholder="请输入登录密码"
          type="password"
        />
      </template>

      <template v-else-if="editType === 'password'">
        <van-field
          v-model="form.oldPassword"
          label="原密码"
          placeholder="请输入原密码"
          type="password"
        />
        <van-field
          v-model="form.newPassword"
          label="新密码"
          placeholder="字母+数字，至少6位"
          type="password"
        />
      </template>

      <template v-else-if="editType === 'securityKey'">
        <van-field
          v-model="form.password"
          label="原密码"
          placeholder="请输入登录密码"
          type="password"
        />
        <van-field
          v-model="form.securityKey"
          label="新安全密钥"
          placeholder="请输入新安全密钥"
        />
      </template>

      <van-button
        block
        round
        type="primary"
        style="margin-top: 24px"
        @click="onSave"
        >确认修改</van-button
      >
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { showToast, showConfirmDialog } from "vant";
import {
  store,
  logout,
  updateNickname,
  updatePhone,
  updatePassword,
  updateSecurityKey,
  isValidPhone,
  isValidPassword,
} from "../store";

const router = useRouter();
const showEdit = ref(false);
const editType = ref("nickname");
const editTitle = ref("");

const form = reactive({
  nickname: "",
  phone: "",
  password: "",
  oldPassword: "",
  newPassword: "",
  securityKey: "",
});

function openEdit(type) {
  editType.value = type;
  // 清空表单
  form.nickname = store.user?.nickname || "";
  form.phone = "";
  form.password = "";
  form.oldPassword = "";
  form.newPassword = "";
  form.securityKey = "";

  if (type === "nickname") editTitle.value = "修改昵称";
  if (type === "phone") editTitle.value = "修改手机号";
  if (type === "password") editTitle.value = "修改密码";
  if (type === "securityKey") editTitle.value = "修改安全密钥";

  showEdit.value = true;
}

async function onSave() {
  try {
    if (editType.value === "nickname") {
      if (!form.nickname.trim()) return showToast("昵称不能为空");
      await updateNickname(form.nickname.trim());
    } else if (editType.value === "phone") {
      if (!isValidPhone(form.phone)) return showToast("新手机号格式不正确");
      if (!form.password) return showToast("请输入原密码");
      await updatePhone(form.phone, form.password);
    } else if (editType.value === "password") {
      if (!isValidPassword(form.newPassword))
        return showToast("新密码需为字母+数字，至少6位");
      if (!form.oldPassword) return showToast("请输入原密码");
      await updatePassword(form.oldPassword, form.newPassword);
    } else if (editType.value === "securityKey") {
      if (!form.securityKey.trim()) return showToast("新安全密钥不能为空");
      if (!form.password) return showToast("请输入原密码");
      await updateSecurityKey(form.password, form.securityKey.trim());
    }
    showToast({ message: "修改成功", type: "success" });
    showEdit.value = false;
  } catch (e) {
    showToast(e.message);
  }
}

async function onLogout() {
  try {
    await showConfirmDialog({
      title: "退出登录",
      message: "确定要退出当前账号吗？",
    });
    logout();
    router.push("/login");
  } catch {}
}
</script>
