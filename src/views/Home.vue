<template>
  <van-nav-bar title="今日点菜" fixed placeholder />

  <div v-if="!store.family" class="page">
    <van-empty description="还没有家庭">
      <van-button type="primary" round @click="$router.push('/family')"
        >去创建 / 加入家庭</van-button
      >
    </van-empty>
  </div>

  <div v-else class="page">
    <!-- 顶部：范围选择与模式切换 -->
    <div class="header">
      <div class="today-date">{{ todayDate }}</div>
      <div class="family-name">{{ store.family.name }}</div>
      <div class="header-row">
        <div class="plan-days-btn" @click="showRangePicker = true">
          <span>{{ rangeDays }}</span>
        </div>
        <van-popup v-model:show="showRangePicker" position="bottom" round>
          <van-picker
            :columns="rangeOptions"
            @confirm="onRangeChange"
            @cancel="showRangePicker = false"
          />
        </van-popup>

        <div class="meal-tabs">
          <span
            :class="{ active: planMode === 'daily' }"
            @click="switchMode('daily')"
            >一天天点</span
          >
          <span
            :class="{ active: planMode === 'total' }"
            @click="switchMode('total')"
            >按总量点</span
          >
        </div>
      </div>
    </div>

    <!-- 模式一：一天天点（日期卡片列表） -->
    <template v-if="planMode === 'daily'">
      <div class="section-title">
        <span>选择日期进行点菜</span>
      </div>
      <div v-if="!dailyCards.length" class="empty-tip">正在生成日期计划…</div>
      <div v-else class="daily-grid">
        <div
          v-for="day in dailyCards"
          :key="day.date"
          class="daily-card"
          @click="goDailyDetail(day.date)"
        >
          <div class="daily-date">{{ day.label }}</div>

          <!-- 显示具体菜品和点菜人 👇 这里修正了渲染逻辑 -->
          <div v-if="day.dishes.length" class="dish-tags">
            <span
              v-for="(item, idx) in day.dishes.slice(0, 3)"
              :key="idx"
              class="dish-tag"
            >
              {{ item.text }}
            </span>
            <span v-if="day.dishes.length > 3" class="dish-more"
              >等{{ day.count }}个菜</span
            >
          </div>
          <div v-else class="daily-count" style="color: #999">暂无点菜</div>

          <div
            class="daily-status"
            :class="day.count > 0 ? 'has-order' : 'no-order'"
          >
            {{ day.count > 0 ? "查看/修改" : "去点菜" }}
          </div>
        </div>
      </div>
    </template>

    <!-- 模式二：按总量点 -->
    <template v-else>
      <div class="section-title" style="margin-top: 16px">
        按总量点菜（1-7天）
      </div>
      <van-tabs v-model:active="totalMealType" shrink>
        <van-tab title="早餐" name="早餐" />
        <van-tab title="正餐" name="正餐" />
      </van-tabs>

      <!-- 清单区域 -->
      <div v-if="totalPlanItems.length" class="total-cart">
        <div class="cart-title">已选清单（{{ totalPlanItems.length }}）</div>
        <div
          v-for="(item, index) in totalPlanItems"
          :key="index"
          class="cart-item"
        >
          <span>{{ item.mealType }} · {{ item.dish.name }}</span>
          <van-button
            size="mini"
            type="danger"
            plain
            @click="removeTotalOrder(index)"
            >移除</van-button
          >
        </div>
      </div>

      <div v-if="!dishes.length" class="empty-tip">
        菜谱为空，去添加几道菜吧～
      </div>
      <div v-else class="dish-grid" style="margin-top: 12px">
        <div
          v-for="d in dishes"
          :key="d.id"
          class="dish-card"
          @click="goDishDetail(d)"
        >
          <img v-if="d.image_url" :src="d.image_url" class="dish-card-img" />
          <div v-else class="dish-card-img placeholder">🍲</div>
          <div class="dish-card-body">
            <div class="dish-name">{{ d.name }}</div>
            <div class="dish-cat">{{ d.category }}</div>
          </div>
          <div class="dish-add" @click.stop="onTotalOrder(d)">＋</div>
        </div>
      </div>
      <div style="margin-top: 20px">
        <van-button block round type="primary" @click="submitTotalPlan"
          >提交总量计划</van-button
        >
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { showToast } from "vant";
import { store, listDishes, addOrder, listOrdersForDates } from "../store";

const router = useRouter();
const rangeDays = ref("未来 3 天");
const showRangePicker = ref(false);
const planMode = ref("daily"); // 'daily' | 'total'
const totalMealType = ref("早餐");
const dishes = ref([]);
const dailyCards = ref([]);
const totalPlanItems = ref([]);
// 获取今天的日期文案（如：9月18日 周五）
const todayDate = computed(() => {
  const d = new Date();
  const p = (n) => (n < 10 ? "0" + n : "" + n);
  const week = ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日 周${week}`;
});

const rangeOptions = [
  { text: "未来 1 天", value: "未来 1 天" },
  { text: "未来 2 天", value: "未来 2 天" },
  { text: "未来 3 天", value: "未来 3 天" },
  { text: "未来 4 天", value: "未来 4 天" },
  { text: "未来 5 天", value: "未来 5 天" },
  { text: "未来 6 天", value: "未来 6 天" },
  { text: "未来 7 天", value: "未来 7 天" },
];

function getRangeNum() {
  return parseInt(rangeDays.value.replace(/\D/g, "")) || 3;
}

function getDateStr(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const p = (n) => (n < 10 ? "0" + n : "" + n);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function formatLabel(dateStr) {
  const parts = dateStr.split("-").map(Number);
  const week = ["日", "一", "二", "三", "四", "五", "六"][
    new Date(parts[0], parts[1] - 1, parts[2]).getDay()
  ];
  return `${parts[1]}月${parts[2]}日 周${week}`;
}

function removeTotalOrder(index) {
  totalPlanItems.value.splice(index, 1);
}

async function loadDailyCards() {
  const num = getRangeNum();
  const dates = [];
  for (let i = 0; i < num; i++) {
    dates.push(getDateStr(i));
  }

  try {
    const allOrders = await listOrdersForDates(dates);

    const cards = dates.map((date) => {
      const dayOrders = allOrders.filter((o) => o.date === date);
      // 拼接成“点菜人：菜名”的格式
      const displayItems = dayOrders.map((o) => ({
        text: `${o.user_nickname || "家人"}：${o.dish_name}`,
      }));
      return {
        date,
        label: formatLabel(date),
        count: dayOrders.length,
        dishes: displayItems,
      };
    });
    dailyCards.value = cards;
  } catch (e) {
    console.error(e);
  }
}

function switchMode(mode) {
  planMode.value = mode;
  if (mode === "daily") {
    loadDailyCards();
  } else {
    loadDishes();
  }
}

function onRangeChange({ selectedOptions }) {
  rangeDays.value = selectedOptions[0].text;
  showRangePicker.value = false;
  if (planMode.value === "daily") loadDailyCards();
}

function goDailyDetail(date) {
  router.push({ path: "/daily-order", query: { date } });
}

function goDishDetail(d) {
  router.push(`/dish/${d.id}`);
}

async function loadDishes() {
  try {
    dishes.value = await listDishes();
  } catch (e) {
    showToast("加载菜谱失败");
  }
}

async function onTotalOrder(d) {
  totalPlanItems.value.push({
    dish: d,
    mealType: totalMealType.value,
  });
  showToast("已加入总量计划");
}

async function submitTotalPlan() {
  if (!totalPlanItems.value.length) return showToast("请至少点一道菜");
  try {
    const planId = "p_" + Date.now();
    const start = getDateStr(0);
    const end = getDateStr(getRangeNum() - 1);
    for (let item of totalPlanItems.value) {
      await addOrder(
        item.dish,
        null,
        item.mealType,
        planId,
        "total",
        start,
        end,
      );
    }
    showToast({ message: "计划提交成功", type: "success" });
    totalPlanItems.value = [];
    router.push("/order-history");
  } catch (e) {
    showToast(e.message);
  }
}

// 定时器，用于自动同步家人点菜
let timer = null;

onMounted(async () => {
  if (store.family) {
    await loadDishes();
    await loadDailyCards();
    // 每 3 秒刷新一次日期卡片，家人点菜实时同步
    timer = setInterval(() => {
      if (planMode.value === "daily") {
        loadDailyCards();
      }
    }, 3000);
  }
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.header {
  background: var(--brand-gradient);
  border-radius: 14px;
  padding: 18px;
  color: #fff;
  margin-bottom: 12px;
}
.family-name {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 12px;
}
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.plan-days-btn {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 8px 16px;
  color: #fff;
  font-size: 14px;
  flex: 1; /* 自适应宽度 */
  min-width: 0; /* 允许收缩 */
  white-space: nowrap; /* 文字永不换行 */
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  justify-content: center;
}

.meal-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  padding: 3px;
  flex-shrink: 0; /* ⚠️ 新增：防止被挤扁 */
}
.meal-tabs span {
  padding: 5px 16px;
  font-size: 13px;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap; /* ⚠️ 新增：文字不换行 */
}
.meal-tabs span.active {
  background: #fff;
  color: var(--shadow-brand);
  font-weight: 600;
}

.daily-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.daily-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: pointer;
}
.daily-date {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 6px;
}
.daily-count {
  font-size: 12px;
  color: #999;
  margin-bottom: 10px;
}
.daily-status {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  display: inline-block;
}
.daily-status.has-order {
  background: #fff1eb;
  color: var(--shadow-brand);
}
.daily-status.no-order {
  background: #f3f4f6;
  color: #999;
}
.dish-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
  margin-bottom: 10px;
  min-height: 44px;
}
.dish-tag {
  font-size: 11px;
  background: #fff1eb;
  color: var(--shadow-brand);
  padding: 2px 6px;
  border-radius: 4px;
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dish-more {
  font-size: 11px;
  color: #999;
  align-self: center;
}

.total-cart {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-top: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.cart-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--shadow-brand);
  margin-bottom: 10px;
}
.cart-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f5f6f8;
  font-size: 14px;
}
.cart-item:last-child {
  border-bottom: none;
}

.today-date {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85); /* 半透明白色，不抢家庭名字的风头 */
  margin-bottom: 4px;
  letter-spacing: 0.5px;
}
</style>
