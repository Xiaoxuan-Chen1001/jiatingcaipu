<template>
  <van-popup
    v-model:show="visible"
    position="bottom"
    :style="popupStyle"
    :close-on-click-overlay="false"
    :lock-scroll="true"
    @opened="onPopupOpened"
  >
    <div class="cropper-page">
      <van-nav-bar
        title="调整图片"
        left-text="取消"
        right-text="完成"
        @click-left="onCancel"
        @click-right="onConfirm"
      />

      <div class="cropper-body">
        <div
          ref="viewportRef"
          class="cropper-viewport"
          :style="viewportStyle"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @wheel.prevent="onWheel"
          @touchstart="onTouchStart"
          @touchmove.prevent="onTouchMove"
        >
          <img
            v-if="imgUrl"
            ref="imgRef"
            :src="imgUrl"
            class="cropper-img"
            :style="imgStyle"
            draggable="false"
            @load="onImgLoad"
          />
        </div>
      </div>

      <div class="cropper-tip">拖动图片调整位置，滚轮或双指缩放</div>
    </div>
  </van-popup>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount } from "vue";
import { showToast } from "vant";

const props = defineProps({
  show: { type: Boolean, default: false },
  file: { type: Object, default: null },
  aspect: { type: Number, default: 4 / 3 },
  maxSize: { type: Number, default: 1080 },
});

const emit = defineEmits(["update:show", "confirm", "cancel"]);

const visible = computed({
  get: () => props.show,
  set: (v) => emit("update:show", v),
});

const popupStyle = {
  height: "100%",
  borderTopLeftRadius: "0",
  borderTopRightRadius: "0",
};

const imgUrl = ref("");
const imgRef = ref(null);
const viewportRef = ref(null);
const viewportSize = ref({ w: 0, h: 0 });

const imgW = ref(0);
const imgH = ref(0);
const scale = ref(1);
const minScale = ref(1);
const x = ref(0);
const y = ref(0);
const initialized = ref(false);

const viewportStyle = computed(() => ({
  aspectRatio: String(props.aspect),
}));

const imgStyle = computed(() => ({
  width: imgW.value + "px",
  height: imgH.value + "px",
  transform: `translate(${x.value}px, ${y.value}px) scale(${scale.value})`,
  transformOrigin: "0 0",
}));

/* ---------- 监听 file 变化，加载预览 ---------- */
watch(
  () => props.file,
  (f) => {
    if (imgUrl.value) URL.revokeObjectURL(imgUrl.value);
    initialized.value = false;
    imgW.value = 0;
    imgH.value = 0;
    imgUrl.value = f ? URL.createObjectURL(f) : "";
  },
  { immediate: true },
);

/* ---------- 弹层打开后，重新测量视口 + 初始化 ---------- */
function onPopupOpened() {
  measureViewport();
  if (imgW.value && !initialized.value) initCrop();
}

watch(
  () => props.show,
  (v) => {
    if (v) initialized.value = false;
  },
);

function measureViewport() {
  if (!viewportRef.value) return;
  const rect = viewportRef.value.getBoundingClientRect();
  viewportSize.value = { w: rect.width, h: rect.height };
}

/* ---------- 图片加载 ---------- */
function onImgLoad() {
  if (!imgRef.value) return;
  imgW.value = imgRef.value.naturalWidth;
  imgH.value = imgRef.value.naturalHeight;
  if (viewportSize.value.w) {
    initCrop();
  } else {
    nextTick(() => {
      measureViewport();
      if (viewportSize.value.w) initCrop();
    });
  }
}

function initCrop() {
  const vw = viewportSize.value.w;
  const vh = viewportSize.value.h;
  if (!vw || !vh || !imgW.value || !imgH.value) return;

  // cover 模式：图片刚好铺满视口
  const s = Math.max(vw / imgW.value, vh / imgH.value);
  scale.value = s;
  minScale.value = s;
  // 居中
  x.value = (vw - imgW.value * s) / 2;
  y.value = (vh - imgH.value * s) / 2;
  clampPosition();
  initialized.value = true;
}

/* ---------- 位置约束：图片不允许露出视口外 ---------- */
function clampPosition() {
  const vw = viewportSize.value.w;
  const vh = viewportSize.value.h;
  const dispW = imgW.value * scale.value;
  const dispH = imgH.value * scale.value;
  const minX = vw - dispW;
  const minY = vh - dispH;
  x.value = Math.min(0, Math.max(minX, x.value));
  y.value = Math.min(0, Math.max(minY, y.value));
}

/* ---------- 拖动（鼠标/单指） ---------- */
const dragging = ref(false);
const dragStart = { px: 0, py: 0, x: 0, y: 0 };

function onPointerDown(e) {
  if (e.pointerType === "touch" && e.isPrimary === false) return;
  dragging.value = true;
  dragStart.px = e.clientX;
  dragStart.py = e.clientY;
  dragStart.x = x.value;
  dragStart.y = y.value;
  try {
    e.target.setPointerCapture(e.pointerId);
  } catch {}
}

function onPointerMove(e) {
  if (!dragging.value) return;
  x.value = dragStart.x + (e.clientX - dragStart.px);
  y.value = dragStart.y + (e.clientY - dragStart.py);
  clampPosition();
}

function onPointerUp(e) {
  dragging.value = false;
  try {
    e.target.releasePointerCapture(e.pointerId);
  } catch {}
}

/* ---------- 滚轮缩放 ---------- */
function onWheel(e) {
  const factor = e.deltaY > 0 ? 0.95 : 1.05;
  zoomAt(factor, viewportSize.value.w / 2, viewportSize.value.h / 2);
}

/* ---------- 双指缩放 ---------- */
let lastTouchDist = 0;

function getTouchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function onTouchStart(e) {
  if (e.touches.length === 2) {
    dragging.value = false;
    lastTouchDist = getTouchDist(e.touches);
  }
}

function onTouchMove(e) {
  if (e.touches.length === 2) {
    const dist = getTouchDist(e.touches);
    if (lastTouchDist > 0) {
      zoomAt(
        dist / lastTouchDist,
        viewportSize.value.w / 2,
        viewportSize.value.h / 2,
      );
    }
    lastTouchDist = dist;
  }
}

/* ---------- 缩放核心：围绕视口中心 ---------- */
function zoomAt(factor, cx, cy) {
  const oldScale = scale.value;
  let newScale = oldScale * factor;
  newScale = Math.max(minScale.value, Math.min(minScale.value * 4, newScale));
  if (newScale === oldScale) return;

  const imgX = (cx - x.value) / oldScale;
  const imgY = (cy - y.value) / oldScale;
  x.value = cx - imgX * newScale;
  y.value = cy - imgY * newScale;
  scale.value = newScale;
  clampPosition();
}

/* ---------- 导出裁剪 ---------- */
function onConfirm() {
  if (!imgRef.value || !imgW.value) {
    showToast("图片未就绪");
    return;
  }
  const vw = viewportSize.value.w;
  const vh = viewportSize.value.h;

  // 视口对应原图上的区域
  const srcX = -x.value / scale.value;
  const srcY = -y.value / scale.value;
  const srcW = vw / scale.value;
  const srcH = vh / scale.value;

  // 输出尺寸：最长边 maxSize，比例 aspect
  let outW, outH;
  if (props.aspect >= 1) {
    outW = props.maxSize;
    outH = Math.round(props.maxSize / props.aspect);
  } else {
    outH = props.maxSize;
    outW = Math.round(props.maxSize * props.aspect);
  }

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outW, outH);

  try {
    ctx.drawImage(imgRef.value, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
  } catch (err) {
    showToast("裁剪失败：" + err.message);
    return;
  }

  canvas.toBlob(
    (blob) => {
      if (!blob) {
        showToast("裁剪失败");
        return;
      }
      emit("confirm", blob);
      visible.value = false;
    },
    "image/jpeg",
    0.85,
  );
}

function onCancel() {
  emit("cancel");
  visible.value = false;
}

onBeforeUnmount(() => {
  if (imgUrl.value) URL.revokeObjectURL(imgUrl.value);
});
</script>

<style scoped>
.cropper-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-page);
}
.cropper-body {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20px;
  overflow: hidden;
}
.cropper-viewport {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: #000;
  touch-action: none;
  user-select: none;
  border-radius: var(--radius-md);
}
.cropper-img {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
  user-select: none;
  pointer-events: none;
  -webkit-user-drag: none;
}
.cropper-tip {
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
  padding: 20px 16px 32px;
}
</style>
