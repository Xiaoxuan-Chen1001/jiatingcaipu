<template>
  <van-nav-bar
    :title="isEdit ? '编辑菜品' : '添加菜品'"
    fixed
    placeholder
    left-arrow
    @click-left="$router.back()"
  />

  <div class="page">
    <div class="form-card">
      <div class="form-label">菜品图片</div>
      <div v-if="form.image_url" class="img-preview-wrap">
        <img :src="form.image_url" />
        <div class="img-remove" @click="form.image_url = ''">✕</div>
      </div>
      <div v-else class="img-picker" @click="pickImage">
        <div class="plus">＋</div>
        <div>上传图片</div>
      </div>
    </div>

    <div class="form-card">
      <div class="form-label">菜名 <span style="color: #ff4d4f">*</span></div>
      <van-field
        v-model="form.name"
        placeholder="例如：红烧排骨"
        maxlength="20"
      />

      <div class="form-label" style="margin-top: 14px">分类</div>
      <van-field
        v-model="form.category"
        is-link
        readonly
        @click="showPicker = true"
      />
      <van-popup v-model:show="showPicker" position="bottom" round>
        <van-picker
          :columns="categoryOptions"
          @confirm="onPickCat"
          @cancel="showPicker = false"
        />
      </van-popup>

      <div class="form-label" style="margin-top: 14px">做法 / 备注</div>
      <van-field
        v-model="form.description"
        type="textarea"
        rows="3"
        autosize
        placeholder="简单描述做法或口味"
        maxlength="200"
      />
    </div>

    <div style="display: flex; gap: 12px; margin-top: 24px">
      <van-button block round @click="$router.back()">取消</van-button>
      <van-button block round type="primary" :loading="saving" @click="save">
        {{ isEdit ? "保存修改" : "添加菜品" }}
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";
import { showToast } from "vant";
import { store, saveDish, uploadImage } from "../store";
import { supabase } from "../supabase";

const route = useRoute();
const router = useRouter();
const isEdit = ref(false);
const saving = ref(false);
const showPicker = ref(false);
const categoryOptions = [
  { text: "早餐", value: "早餐" },
  { text: "家常菜", value: "家常菜" },
  { text: "汤羹", value: "汤羹" },
  { text: "主食", value: "主食" },
  { text: "凉菜", value: "凉菜" },
  { text: "甜点", value: "甜点" },
  { text: "水果", value: "水果" },
  { text: "小吃", value: "小吃" },
  { text: "其他", value: "其他" },
];

const form = reactive({
  id: "",
  name: "",
  description: "",
  image_url: "",
  category: "家常菜",
});

function onPickCat({ selectedOptions }) {
  if (selectedOptions && selectedOptions.length) {
    form.category = selectedOptions[0].value; // 改成取 .value
  }
  showPicker.value = false;
}

async function pickImage() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      showToast({ message: "上传中…", duration: 0 });
      form.image_url = await uploadImage(file, "dishes");
      showToast({ message: "上传成功", type: "success" });
    } catch (e) {
      showToast("上传失败：" + e.message);
    }
  };
  input.click();
}

async function save() {
  if (!form.name.trim()) return showToast("请填写菜名");
  saving.value = true;
  try {
    await saveDish({ ...form });
    showToast({ message: "保存成功", type: "success" });
    setTimeout(() => router.back(), 500);
  } catch (e) {
    showToast(e.message);
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  const id = route.query.id;
  if (!id) return;
  isEdit.value = true;
  const { data } = await supabase
    .from("dishes")
    .select("*")
    .eq("id", id)
    .single();
  if (data) Object.assign(form, data);
});
</script>
