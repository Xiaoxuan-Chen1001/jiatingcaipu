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
      <div class="family-name">{{ store.family.name }}</div>
      <div class="header-row">
        <van-field
          v-model="rangeDays"
          readonly
          is-link
          label="计划天数"
          @click="showRangePicker = true"
          style="
            background: rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            padding: 4px 10px;
            width: 120px;
            color: #fff;
          "
        />
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

          <!-- 显示具体菜品和点菜人 -->
          <div v-if="day.dishes.length" class="dish-tags">
            <span
              v-for="(item, idx) in day.dishes.slice(0, 3)"
              :key="idx"
              class="dish-tag"
            >
              {{ item.text }}
            </span>
            <span v-if="day.dishes.length > 3" class="dish-more">
              等{{ day.count }}个菜
            </span>
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

    <!-- 模式二：按总量点（直接平铺所有菜品，分早餐和正餐） -->
    <template v-else>
      <div class="section-title" style="margin-top: 16px">
        按总量点菜（1-7天）
      </div>
      <van-tabs v-model:active="totalMealType" shrink>
        <van-tab title="早餐" name="早餐" />
        <van-tab title="正餐" name="正餐" />
      </van-tabs>
      <div v-if="!dishes.length" class="empty-tip">
        菜谱为空，去添加几道菜吧～
      </div>
      <div v-else class="dish-grid" style="margin-top: 12px">
        <div v-for="d in dishes" :key="d.id" class="dish-card">
          <img v-if="d.image_url" :src="d.image_url" class="dish-card-img" />
          <div v-else class="dish-card-img placeholder">🍲</div>
          <div class="dish-card-body">
            <div class="dish-name">{{ d.name }}</div>
            <div class="dish-cat">{{ d.category }}</div>
          </div>
          <div class="dish-add" @click="onTotalOrder(d)">＋</div>
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
import { store, listDishes, countOrdersByDate, addOrder } from "../store";

const router = useRouter();
const rangeDays = ref("未来 3 天");
const showRangePicker = ref(false);
const planMode = ref("daily"); // 'daily' | 'total'
const totalMealType = ref("早餐");
const dishes = ref([]);
const dailyCards = ref([]);
const totalPlanItems = ref([]); // 总量模式下临时存储点菜

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
        userId: o.user_nickname, // 可以留作后续扩展
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

onMounted(async () => {
  if (store.family) {
    await loadDishes();
    await loadDailyCards();
  }
});

let timer = null;

onMounted(async () => {
  if (store.family) {
    await loadDishes();
    await loadDailyCards();
    timer = setInterval(loadDailyCards, 3000); // 每 3 秒刷新卡片上的“已点数量”
  }
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<style scoped>
.header {
  background: linear-gradient(135deg, #ff9a5a, #ff7a45);
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
.meal-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  padding: 3px;
}
.meal-tabs span {
  padding: 5px 16px;
  font-size: 13px;
  border-radius: 999px;
  cursor: pointer;
}
.meal-tabs span.active {
  background: #fff;
  color: #ff7a45;
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
  color: #ff7a45;
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
  min-height: 40px;
}
.dish-tag {
  font-size: 11px;
  background: #fff1eb;
  color: #ff7a45;
  padding: 2px 6px;
  border-radius: 4px;
  max-width: 100%;
  /* 文字过长时显示省略号 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
