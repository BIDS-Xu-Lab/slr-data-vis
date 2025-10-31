<script setup>
import Navi from "../components/Navi.vue";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { GraphChart } from "echarts/charts";
import { TitleComponent, TooltipComponent, LegendComponent } from "echarts/components";
import VChart, { THEME_KEY } from "vue-echarts";
import { ref, provide, onMounted, computed, watch } from "vue";

use([CanvasRenderer, GraphChart, TitleComponent, TooltipComponent, LegendComponent]);

provide(THEME_KEY, "light");

const papers = ref([]);
const attributeOptions = ref([]);
const selectedAttribute = ref("");
const showLabels = ref(true);
const labelsToggle = computed({
  get: () => (showLabels.value ? "on" : "off"),
  set: (v) => { showLabels.value = v === "on"; }
});

const PAPER_COLOR = "#87CEEB"; // sky blue
const CATEGORY_PALETTE = [
  "#5470C6", "#91CC75", "#EE6666", "#73C0DE", "#3BA272",
  "#FC8452", "#9A60B4", "#EA7CCC", "#2f4554", "#61a0a8",
  "#d48265", "#749f83", "#ca8622", "#bda29a", "#6e7074",
  "#546570", "#c4ccd3"
];

// Load data
onMounted(async () => {
  try {
    const res = await fetch("/data-slr.json");
    const json = await res.json();
    papers.value = Array.isArray(json?.data) ? json.data : [];
    attributeOptions.value = computeAttributeOptions(papers.value);
    // Default attribute
    selectedAttribute.value = attributeOptions.value.find(k => k === "Country") || attributeOptions.value[0] || "";
  } catch (e) {
    console.error(e);
  }
});

function computeAttributeOptions(rows) {
  if (!rows || rows.length === 0) return [];
  const sampleSize = Math.min(50, rows.length);
  const counts = new Map();
  const keys = Object.keys(rows[0]);
  for (const key of keys) counts.set(key, { stringish: 0, nonEmpty: 0 });
  for (let i = 0; i < sampleSize; i++) {
    const row = rows[i];
    for (const key of keys) {
      const v = row[key];
      if (v !== null && v !== undefined && v !== "") counts.get(key).nonEmpty++;
      if (typeof v === "string") counts.get(key).stringish++;
    }
  }
  // Prefer fields that are mostly strings and have many non-empty values
  const excluded = new Set(["Owner", "Title"]);
  const candidates = keys.filter(k => !excluded.has(k)).filter(k => {
    const stat = counts.get(k);
    return stat.nonEmpty >= sampleSize * 0.5 && stat.stringish >= sampleSize * 0.5;
  });
  return candidates;
}

// Build color map for attribute values
const valueColorMap = computed(() => {
  const map = new Map();
  const values = Array.from(new Set((papers.value || []).map(p => normalizeValue(p[selectedAttribute.value])).filter(v => v !== null)));
  values.forEach((v, i) => map.set(v, CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]));
  return map;
});

function normalizeValue(v) {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return v.join(", ");
  const s = String(v).trim();
  return s.length ? s : null;
}

// Stats for sidebar
const valueStats = computed(() => {
  const counts = new Map();
  for (const p of papers.value) {
    const val = normalizeValue(p[selectedAttribute.value]);
    if (val === null) continue;
    counts.set(val, (counts.get(val) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
});

const uniqueValueCount = computed(() => valueStats.value.length);

// Graph data
const graphData = computed(() => {
  const nodes = [];
  const edges = [];

  // Attribute nodes first so their index is stable
  const valueToNodeId = new Map();
  valueStats.value.forEach(({ value, count }, idx) => {
    const id = `attr-${idx}`;
    valueToNodeId.set(value, id);
    nodes.push({
      id,
      name: value,
      value: count,
      category: "attribute",
      symbolSize: Math.max(12, Math.min(60, 10 + count * 2)),
      itemStyle: { color: valueColorMap.value.get(value) },
      label: {
        show: showLabels.value,
        fontSize: 16,
        fontWeight: "bold"
      }
    });
  });

  // Paper nodes and edges
  papers.value.forEach((p, i) => {
    const paperId = `paper-${i}`;
    const label = `${p["Author"] || "Unknown"}, ${p["Year"] || ""}`;
    nodes.push({
      id: paperId,
      name: label,
      category: "paper",
      symbolSize: 10,
      itemStyle: { color: PAPER_COLOR },
      label: { show: showLabels.value },
      paper: {
        Author: p["Author"] || "Unknown",
        Year: p["Year"] ?? "",
        Journal: p["Journal"] || "",
        Title: p["Title"] || "",
        StudyDesign: p["Study design"] || p["Study Design Standardized"] || "",
        Duration: p["Duration of intervention/study"] || ""
      }
    });
    const val = normalizeValue(p[selectedAttribute.value]);
    if (val !== null && valueToNodeId.has(val)) {
      const attrId = valueToNodeId.get(val);
      edges.push({
        source: paperId,
        target: attrId,
        lineStyle: { color: valueColorMap.value.get(val) }
      });
    }
  });

  return { nodes, edges };
});

const chartOption = computed(() => ({
  title: {
    text: selectedAttribute.value ? `Papers by ${selectedAttribute.value}` : "Papers",
    left: 10,
    top: 10,
    textStyle: {
      fontSize: 18,
      fontWeight: 'bold'
    }
  },
  tooltip: {
    trigger: "item",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderColor: "#ccc",
    borderWidth: 1,
    textStyle: {
      color: "#333",
      fontSize: 12
    },
    extraCssText: "max-width: 300px; word-wrap: break-word; white-space: normal;",
    formatter: (params) => {
      if (params.data?.category === "paper") {
        const d = params.data.paper || {};
        const lines = [
          `- Author: ${d.Author ?? ""}`,
          `- Year: ${d.Year ?? ""}`,
          `- Journal: ${d.Journal ?? ""}`,
          `- Title: ${d.Title ?? ""}`,
          `- Study design: ${d.StudyDesign ?? ""}`,
          `- Duration: ${d.Duration ?? ""}`
        ];
        return lines.join("<br/>");
      }
      if (params.data?.category === "attribute") {
        const attrName = selectedAttribute.value || "Attribute";
        return `${attrName}: ${params.data.name}`;
      }
      if (params.dataType === "edge") return `${params.data.source} -> ${params.data.target}`;
      return params.name || "";
    }
  },
  series: [
    {
      type: "graph",
      layout: "force",
      roam: true,
      draggable: true,
      force: { repulsion: 120, edgeLength: 80 },
      data: graphData.value.nodes,
      edges: graphData.value.edges,
      lineStyle: { width: 1, opacity: 0.7 },
      emphasis: { focus: "adjacency" },
      label: { position: "right" },
      labelLayout: {
        hideOverlap: true
      },
      lineStyle: {
        curveness: 0.3
      }
    }
  ]
}));

// Recompute on attribute change
watch(selectedAttribute, () => {
  /* reactive computeds will update chartOption */
});
</script>

<template>
<div class="page network-page">
  <div class="sidebar">
    <Navi />
    <label>
        <i class="fa-solid fa-list"></i>
        Attribute Selection
    </label>
    <select style="width: 100%;"
        v-model="selectedAttribute">
      <option v-for="attr in attributeOptions" :key="attr" :value="attr">{{ attr }}</option>
    </select>

    <div v-if="selectedAttribute" 
        class="stats" >
      <div class="stat-row"><strong>Unique values:</strong> {{ uniqueValueCount }}</div>
      <div class="stat-row"><strong>Total papers:</strong> {{ papers.length }}</div>
      <h4 style="margin-top: 12px;">Counts</h4>
      <div class="value-list">
        <div class="value-item" v-for="row in valueStats" :key="row.value">
          <span class="swatch" :style="{ backgroundColor: valueColorMap.get(row.value) || '#999' }"></span>
          <span class="value-text">{{ row.value }}</span>
          <span class="value-count">{{ row.count }}</span>
        </div>
      </div>
      <div class="stat-row" style="margin-top: 12px;">
        <strong>Show labels:</strong>
        <label style="margin-left: 8px;">
          <input type="radio" name="labels-toggle" value="on" v-model="labelsToggle" /> On
        </label>
        <label style="margin-left: 8px;">
          <input type="radio" name="labels-toggle" value="off" v-model="labelsToggle" /> Off
        </label>
      </div>
    </div>
  </div>
  <div class="chart-pane">
    <VChart class="chart" :option="chartOption" autoresize />
  </div>
  </div>
</template>


<style scoped>
.network-page {
  box-sizing: border-box;
}
.chart {
  width: 100%;
  height: 100%;
}
.stats {
  margin-top: 12px;
  font-size: 13px;
}
.stat-row {
  margin: 4px 0;
}
.value-list {
  margin-top: 6px;
  max-height: 300px;
  overflow: auto;
}
.value-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}
.swatch {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid rgba(0,0,0,0.15);
}
.value-text {
  flex: 1;
}
.value-count {
  color: #666;
}
</style>