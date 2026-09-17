<template>
  <div class="login-page">
    <div class="login-header">
      <h1>家庭菜谱</h1>
      <p>记录每一餐的幸福</p>
    </div>

    <van-tabs v-model:active="activeTab" shrink>
      <!-- 登录 -->
      <van-tab title="登录" name="login">
        <van-form @submit="onLogin">
          <van-field
            v-model="loginForm.phone"
            label="手机号"
            placeholder="请输入手机号"
            type="tel"
            maxlength="11"
          />
          <van-field
            v-model="loginForm.password"
            label="密码"
            placeholder="请输入密码"
            type="password"
          />
          <div style="padding: 16px 0">
            <van-checkbox v-model="loginForm.remember" shape="square"
              >记住我</van-checkbox
            >
          </div>
          <van-button block round type="primary" native-type="submit"
            >登 录</van-button
          >
          <div class="link-row" @click="activeTab = 'reset'">忘记密码？</div>
        </van-form>
      </van-tab>

      <!-- 注册 -->
      <van-tab title="注册" name="register">
        <van-form @submit="onRegister">
          <van-field
            v-model="regForm.phone"
            label="手机号"
            placeholder="请输入手机号"
            type="tel"
            maxlength="11"
          />
          <van-field
            v-model="regForm.nickname"
            label="昵称"
            placeholder="给自己起个名字"
            maxlength="12"
          />
          <van-field
            v-model="regForm.password"
            label="密码"
            placeholder="字母+数字，至少6位"
            type="password"
          />
          <van-field
            v-model="regForm.securityKey"
            label="安全密钥"
            placeholder="生日/幸运数字等，用于找回密码"
          />
          <van-button
            block
            round
            type="primary"
            native-type="submit"
            style="margin-top: 20px"
            >注 册</van-button
          >
        </van-form>
      </van-tab>

      <!-- 重置密码 -->
      <van-tab title="重置密码" name="reset">
        <van-form @submit="onReset">
          <van-field
            v-model="resetForm.phone"
            label="手机号"
            placeholder="请输入注册时的手机号"
            type="tel"
            maxlength="11"
          />
          <van-field
            v-model="resetForm.securityKey"
            label="安全密钥"
            placeholder="请输入注册时设置的密钥"
          />
          <van-field
            v-model="resetForm.newPassword"
            label="新密码"
            placeholder="字母+数字，至少6位"
            type="password"
          />
          <van-button
            block
            round
            type="primary"
            native-type="submit"
            style="margin-top: 20px"
            >重置密码</van-button
          >
          <div class="link-row" @click="activeTab = 'login'">
            想起密码了？去登录
          </div>
        </van-form>
      </van-tab>
    </van-tabs>
  </div>
</template>

<script setup>
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { showToast } from "vant";
import {
  login,
  register,
  resetPassword,
  saveLoginState,
  isValidPhone,
  isValidPassword,
} from "../store";

const router = useRouter();
const activeTab = ref("login");

const loginForm = reactive({ phone: "", password: "", remember: true });
const regForm = reactive({
  phone: "",
  nickname: "",
  password: "",
  securityKey: "",
});
const resetForm = reactive({ phone: "", securityKey: "", newPassword: "" });

async function onLogin() {
  if (!isValidPhone(loginForm.phone)) return showToast("手机号格式不正确");
  if (!loginForm.password) return showToast("请输入密码");
  try {
    await login(loginForm.phone, loginForm.password);
    if (loginForm.remember) saveLoginState();
    showToast({ message: "登录成功", type: "success" });
    router.push("/home");
  } catch (e) {
    showToast(e.message);
  }
}

async function onRegister() {
  if (!isValidPhone(regForm.phone)) return showToast("手机号格式不正确");
  if (!regForm.nickname.trim()) return showToast("请填写昵称");
  if (!isValidPassword(regForm.password))
    return showToast("密码需为字母+数字，至少6位");
  if (!regForm.securityKey.trim()) return showToast("请填写安全密钥");
  try {
    await register(
      regForm.phone,
      regForm.password,
      regForm.nickname.trim(),
      regForm.securityKey.trim(),
    );
    saveLoginState();
    showToast({ message: "注册成功", type: "success" });
    router.push("/home");
  } catch (e) {
    showToast(e.message);
  }
}

async function onReset() {
  if (!isValidPhone(resetForm.phone)) return showToast("手机号格式不正确");
  if (!resetForm.securityKey.trim()) return showToast("请输入安全密钥");
  if (!isValidPassword(resetForm.newPassword))
    return showToast("新密码需为字母+数字，至少6位");
  try {
    await resetPassword(
      resetForm.phone,
      resetForm.securityKey.trim(),
      resetForm.newPassword,
    );
    showToast({ message: "密码重置成功", type: "success" });
    activeTab.value = "login";
  } catch (e) {
    showToast(e.message);
  }
}
</script>

<style scoped>
.login-page {
  padding: 40px 20px;
  max-width: 500px;
  margin: 0 auto;
}
.login-header {
  text-align: center;
  margin-bottom: 40px;
  margin-top: 20px;
}
.login-header h1 {
  font-size: 28px;
  color: #ff7a45;
  margin: 0 0 10px;
}
.login-header p {
  font-size: 14px;
  color: #999;
}
.link-row {
  text-align: center;
  margin-top: 16px;
  color: #ff7a45;
  font-size: 14px;
  cursor: pointer;
}
</style>
