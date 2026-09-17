import { reactive } from "vue";
import { supabase } from "./supabase";
import CryptoJS from "crypto-js";

const USER_KEY = "fc_user";

export const store = reactive({
  user: null,
  family: null,
  loading: true,
});

/* ---------- 工具函数 ---------- */

// 生成 8 位数字邀请码
function genInviteCode() {
  let code = "";
  for (let i = 0; i < 8; i++) code += Math.floor(Math.random() * 10);
  return code;
}

// 获取今天的日期 YYYY-MM-DD
export function today() {
  const d = new Date();
  const p = (n) => (n < 10 ? "0" + n : "" + n);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function genId() {
  return "u_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

// 密码哈希
export function hashPassword(password) {
  return CryptoJS.SHA256(password).toString();
}

// 手机号正则
export function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(phone);
}

// 密码正则（至少6位，字母+数字）
export function isValidPassword(password) {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,20}$/.test(password);
}

/* ---------- 初始化 ---------- */
export async function initStore() {
  const localUser = localStorage.getItem(USER_KEY);
  if (!localUser) {
    store.loading = false;
    return;
  }
  try {
    const user = JSON.parse(localUser);
    // 去数据库校验一下这个用户是否还存在
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (data) {
      store.user = data;
      if (data.family_id) {
        const { data: family } = await supabase
          .from("families")
          .select("*")
          .eq("id", data.family_id)
          .maybeSingle();
        store.family = family;
      }
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch (e) {
    localStorage.removeItem(USER_KEY);
  }
  store.loading = false;
}

/* ---------- 账号认证逻辑 ---------- */

// 注册
export async function register(phone, password, nickname, securityKey) {
  const { data: exist } = await supabase
    .from("users")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  if (exist) throw new Error("该手机号已被注册，请更换");

  const id = genId();
  const password_hash = hashPassword(password);

  const { data, error } = await supabase
    .from("users")
    .insert({
      id,
      nickname,
      phone,
      password_hash,
      security_key: securityKey,
      avatar_url: "",
      family_id: null,
    })
    .select()
    .single();

  if (error) throw error;
  store.user = data;
  return data;
}

// 登录
export async function login(phone, password) {
  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();
  if (!user) throw new Error("账号不存在，请先注册");

  const hash = hashPassword(password);
  if (user.password_hash !== hash) throw new Error("密码错误，请重试");

  store.user = user;
  if (user.family_id) {
    const { data: family } = await supabase
      .from("families")
      .select("*")
      .eq("id", user.family_id)
      .maybeSingle();
    store.family = family;
  } else {
    store.family = null;
  }
  return user;
}

// 记住我（保存状态）
export function saveLoginState() {
  if (store.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(store.user));
  }
}

// 退出登录
export function logout() {
  store.user = null;
  store.family = null;
  localStorage.removeItem(USER_KEY);
}

// 重置密码（忘记密码）
export async function resetPassword(phone, securityKey, newPassword) {
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("phone", phone)
    .maybeSingle();
  if (!user) throw new Error("该手机号未注册");
  if (user.security_key !== securityKey)
    throw new Error("安全密钥错误，请重试");

  const password_hash = hashPassword(newPassword);
  const { error } = await supabase
    .from("users")
    .update({ password_hash })
    .eq("id", user.id);
  if (error) throw error;
  return true;
}

/* ---------- 账号安全与管理（登录后修改） ---------- */

// 修改昵称
export async function updateNickname(nickname) {
  const { error } = await supabase
    .from("users")
    .update({ nickname })
    .eq("id", store.user.id);
  if (error) throw error;
  store.user.nickname = nickname;
  saveLoginState();
}

// 修改手机号（需要原密码）
export async function updatePhone(newPhone, password) {
  if (!isValidPhone(newPhone)) throw new Error("手机号格式不正确");
  const hash = hashPassword(password);
  if (hash !== store.user.password_hash) throw new Error("原密码错误");

  const { data: exist } = await supabase
    .from("users")
    .select("id")
    .eq("phone", newPhone)
    .maybeSingle();
  if (exist) throw new Error("该手机号已被注册，请更换");

  const { error } = await supabase
    .from("users")
    .update({ phone: newPhone })
    .eq("id", store.user.id);
  if (error) throw error;
  store.user.phone = newPhone;
  saveLoginState();
}

// 修改密码（需要原密码）
export async function updatePassword(oldPassword, newPassword) {
  const oldHash = hashPassword(oldPassword);
  if (oldHash !== store.user.password_hash) throw new Error("原密码错误");

  const newHash = hashPassword(newPassword);
  const { error } = await supabase
    .from("users")
    .update({ password_hash: newHash })
    .eq("id", store.user.id);
  if (error) throw error;
  store.user.password_hash = newHash;
  saveLoginState();
}

// 修改安全密钥（需要原密码）
export async function updateSecurityKey(password, newSecurityKey) {
  const hash = hashPassword(password);
  if (hash !== store.user.password_hash) throw new Error("原密码错误");

  const { error } = await supabase
    .from("users")
    .update({ security_key: newSecurityKey })
    .eq("id", store.user.id);
  if (error) throw error;
  store.user.security_key = newSecurityKey;
  saveLoginState();
}

/* ---------- 家庭 ---------- */
export async function createFamily(name) {
  const code = genInviteCode();
  const id = "f_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  const now = Date.now();
  const { data: family, error } = await supabase
    .from("families")
    .insert({
      id,
      name: name || "我的家",
      owner_id: store.user.id,
      invite_code: code,
      invite_code_expire: new Date(now + 24 * 3600 * 1000).toISOString(),
    })
    .select()
    .single();
  if (error) throw error;

  await supabase
    .from("users")
    .update({ family_id: id })
    .eq("id", store.user.id);
  store.user.family_id = id;
  saveLoginState();
  store.family = family;
  return family;
}

export async function joinFamily(code) {
  const { data: family } = await supabase
    .from("families")
    .select("*")
    .eq("invite_code", code)
    .maybeSingle();
  if (!family) throw new Error("邀请码不存在");
  if (
    family.invite_code_expire &&
    new Date(family.invite_code_expire).getTime() < Date.now()
  ) {
    throw new Error("邀请码已过期，请让家人刷新");
  }
  await supabase
    .from("users")
    .update({ family_id: family.id })
    .eq("id", store.user.id);
  store.user.family_id = family.id;
  saveLoginState();
  store.family = family;
  return family;
}

export async function refreshInviteCode() {
  const code = genInviteCode();
  const expire = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from("families")
    .update({
      invite_code: code,
      invite_code_expire: expire,
    })
    .eq("id", store.family.id)
    .select()
    .single();
  if (error) throw error;
  store.family = data;
  return data;
}

export async function renameFamily(name) {
  const { data, error } = await supabase
    .from("families")
    .update({ name })
    .eq("id", store.family.id)
    .select()
    .single();
  if (error) throw error;
  store.family = data;
  return data;
}

export async function quitFamily() {
  if (!store.user) return;
  await supabase
    .from("users")
    .update({ family_id: null })
    .eq("id", store.user.id);
  store.user.family_id = null;
  saveLoginState();
  store.family = null;
}

export async function kickMember(memberId) {
  // 1. 校验权限：必须是房主
  if (!store.family) throw new Error("你还没有加入家庭");
  if (store.family.owner_id !== store.user.id)
    throw new Error("只有房主可以移除成员");
  if (memberId === store.user.id)
    throw new Error("不能移除自己，请使用退出家庭");

  // 2. 将该成员的 family_id 置空
  const { error } = await supabase
    .from("users")
    .update({ family_id: null })
    .eq("id", memberId);
  if (error) throw error;

  return true;
}

export async function getFamilyMembers(familyId) {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("family_id", familyId);
  return data || [];
}

/* ---------- 菜品 ---------- */
export async function listDishes(category = "全部", keyword = "") {
  let q = supabase.from("dishes").select("*").eq("family_id", store.family.id);
  if (category && category !== "全部") q = q.eq("category", category);
  if (keyword) q = q.ilike("name", `%${keyword}%`);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveDish(dish) {
  if (dish.id) {
    const { data, error } = await supabase
      .from("dishes")
      .update({
        name: dish.name,
        description: dish.description,
        image_url: dish.image_url,
        category: dish.category,
      })
      .eq("id", dish.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("dishes")
    .insert({
      family_id: store.family.id,
      name: dish.name,
      description: dish.description,
      image_url: dish.image_url,
      category: dish.category,
      creator_id: store.user.id,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDish(id) {
  await supabase.from("orders").delete().eq("dish_id", id);
  const { error } = await supabase.from("dishes").delete().eq("id", id);
  if (error) throw error;
}

/* ---------- 点菜（新版逻辑） ---------- */

// 生成一个计划ID
export function genPlanId() {
  return "p_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

// 获取某一天的点菜记录（用于首页日期卡片内部）
export async function listOrdersByDate(date, mealType) {
  if (!store.family) return [];
  let q = supabase
    .from("orders")
    .select("*")
    .eq("family_id", store.family.id)
    .eq("date", date);
  if (mealType) q = q.eq("meal_type", mealType);
  const { data, error } = await q.order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

// 获取某一天的点菜数量（用于首页卡片显示已点几个菜）
export async function countOrdersByDate(date) {
  if (!store.family) return 0;
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("family_id", store.family.id)
    .eq("date", date);
  if (error) throw error;
  return count || 0;
}

// 点菜（允许多次点同一道菜）
export async function addOrder(
  dish,
  date,
  mealType,
  planId,
  planType,
  startDate,
  endDate,
) {
  const { data, error } = await supabase
    .from("orders")
    .insert({
      family_id: store.family.id,
      dish_id: dish.id,
      dish_name: dish.name,
      dish_image: dish.image_url,
      date: date || null, // 总量模式可能没有具体日期
      meal_type: mealType,
      plan_id: planId,
      plan_type: planType,
      plan_start_date: startDate,
      plan_end_date: endDate,
      user_id: store.user.id,
      user_nickname: store.user.nickname,
      user_avatar: store.user.avatar_url,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// 取消点菜
export async function cancelOrder(orderId) {
  const { error } = await supabase.from("orders").delete().eq("id", orderId);
  if (error) throw error;
}

// 获取所有计划（用于点菜记录页面）
export async function listPlans() {
  if (!store.family) return [];
  const { data, error } = await supabase
    .from("orders")
    .select("plan_id, plan_type, plan_start_date, plan_end_date")
    .eq("family_id", store.family.id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  // 按 plan_id 聚合去重
  const map = {};
  data.forEach((o) => {
    if (!map[o.plan_id]) {
      map[o.plan_id] = {
        planId: o.plan_id,
        planType: o.plan_type,
        startDate: o.plan_start_date,
        endDate: o.plan_end_date,
        orderCount: 0,
      };
    }
    map[o.plan_id].orderCount += 1;
  });
  return Object.values(map);
}

// 获取某个计划的所有点菜明细
export async function listOrdersByPlan(planId) {
  if (!store.family) return [];
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("plan_id", planId)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function clearOrders(date, mealType) {
  await supabase
    .from("orders")
    .delete()
    .eq("family_id", store.family.id)
    .eq("date", date)
    .eq("meal_type", mealType);
}

/* ---------- 图片上传 ---------- */
export async function uploadImage(file, bucket = "dishes") {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// 补充：用于头像上传时更新用户资料
export async function updateProfile(patch) {
  if (!store.user) throw new Error("用户未登录");
  const { error } = await supabase
    .from("users")
    .update(patch)
    .eq("id", store.user.id);
  if (error) throw error;
  Object.assign(store.user, patch);
  saveLoginState(); // 同步更新本地缓存
}
