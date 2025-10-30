<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import Navi from "../components/Navi.vue";
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { ParallelComponent, TitleComponent, TooltipComponent, VisualMapComponent } from 'echarts/components'
import { ParallelChart } from 'echarts/charts'
import * as echarts from 'echarts'
import VChart from 'vue-echarts'

use([CanvasRenderer, ParallelComponent, TitleComponent, TooltipComponent, VisualMapComponent, ParallelChart])

// Data and state
const data = ref([])
const selectedColorAttribute = ref('Continent')
const chartRef = ref(null)

// Define the columns to use as axes
const axisColumns = [
  'Continent',
  'Study Design Standardized',
  'Duration Category',
//   'Pop Condition',
  'Pop Characteristic',
  'Age Category',
  'Breathing Category',
  'Slow breathing vs fast breathing vs both',
  'Duration of breating Category',
  'Outcome type',
//   'Primary Outcome Category',
//   'Secondary Outcome Category',
]

// Load data
onMounted(async () => {
  try {
    const response = await fetch('/data-slr.json')
    const jsonData = await response.json()
    data.value = jsonData.data
  } catch (error) {
    console.error('Error loading data:', error)
  }
})

// Get unique values for color attribute
const colorAttributeStats = computed(() => {
  if (!data.value.length) return { uniqueValues: 0, valueCounts: {} }
  
  const values = data.value.map(item => item[selectedColorAttribute.value]).filter(val => val !== undefined && val !== null && val !== '')
  const uniqueValues = [...new Set(values)]
  const valueCounts = {}
  
  uniqueValues.forEach(value => {
    valueCounts[value] = values.filter(v => v === value).length
  })
  
  return {
    uniqueValues: uniqueValues.length,
    valueCounts: valueCounts
  }
})

// Generate colors for different groups
const generateColors = (count) => {
  const colors = []
  const hStep = Math.round(5 / count);
  for (let i = 0; i < count; i++) {
    let c = echarts.color.modifyHSL('#5A94DF', hStep * i);
    colors.push(c)
  }
  return colors
}

// Chart configuration
const chartOption = computed(() => {
  if (!data.value.length) return {}
  
  // Get unique values for color attribute
  const colorValues = [...new Set(data.value.map(item => item[selectedColorAttribute.value]).filter(val => val !== undefined && val !== null && val !== ''))]
  const colors = generateColors(colorValues.length)
  const valueToColor = {}
  colorValues.forEach((value, index) => {
    valueToColor[value] = colors[index]
  })
  console.log("colorValues", colorValues);
  console.log("colors", colors);
  
  // Prepare data for parallel chart
  const chartData = data.value.map(item => {
    const d = []
    for (const column of axisColumns) {
      d.push(item[column] || 'N/A')
    }
    return d
  })
  console.log("chartData", chartData);
  
  // Prepare axis configuration
  const axes = axisColumns.map(column => {
    const values = data.value.map(item => item[column]).filter(val => val !== undefined && val !== null && val !== '')
    const uniqueValues = [...new Set(values)]
    
    return {
        dim: axisColumns.indexOf(column),
        name: column,
      type: 'category',
      data: uniqueValues,
    }
  })


  console.log("axes", axes);
  
  return {
    grid: {
      right: 200,
    },
    tooltip: {
      trigger: 'item',
    //   formatter: function(params) {
    //     if (params.data && params.data.attributes) {
    //       const attrs = params.data.attributes
    //       let tooltipContent = '<div style="max-width: 300px;">'
    //       tooltipContent += `<strong>${attrs.Title || 'N/A'}</strong><br/>`
    //       tooltipContent += `<strong>Author:</strong> ${attrs.Author || 'N/A'}<br/>`
    //       tooltipContent += `<strong>Year:</strong> ${attrs.Year || 'N/A'}<br/>`
    //       tooltipContent += `<strong>Country:</strong> ${attrs.Country || 'N/A'}<br/>`
    //       tooltipContent += `<strong>Journal:</strong> ${attrs.Journal || 'N/A'}<br/><br/>`
          
    //       // Show all axis attributes
    //       axisColumns.forEach(column => {
    //         tooltipContent += `<strong>${column}:</strong> ${attrs[column] || 'N/A'}<br/>`
    //       })
          
    //       tooltipContent += '</div>'
    //       return tooltipContent
    //     }
    //     return ''
    //   }
    },

    visualMap: {
      show: true,
      type: 'piecewise',
      categories: colorValues,
      dimension: 0,
      inRange: {
        color: colorValues //['#d94e5d','#eac736','#50a3ba']
      },
      outOfRange: {
        color: ['#ccc'] //['#d94e5d','#eac736','#50a3ba']
      },
      top: 20,
      realtime: false
    },

    parallelAxis: axes,
    parallel: {
      layout: 'vertical',
    },
    series: {
      type: 'parallel',
        inactiveOpacity: 0,
        activeOpacity: 0.5,
        progressive: 500,
      smooth: true,
      data: chartData,
    }
  }
})

// Watch for changes in color attribute selection
watch(selectedColorAttribute, () => {
  // Chart will automatically update due to computed property
})
</script>

<template>
  <div class="page parallel-page">
    <div class="sidebar">
      <Navi />
      <h2>Attribute Selector</h2>
      
      <div class="attribute-selector">
        <label for="color-attribute">Color by:</label>
        <select 
          id="color-attribute" 
          v-model="selectedColorAttribute"
          class="attribute-select"
        >
          <option 
            v-for="column in axisColumns" 
            :key="column" 
            :value="column"
          >
            {{ column }}
          </option>
        </select>
      </div>
      
      <div class="statistics">
        <h3>Statistics</h3>
        <div class="stat-item">
          <strong>Total Papers:</strong> {{ data.length }}
        </div>
        <div class="stat-item">
          <strong>Unique {{ selectedColorAttribute }} Values:</strong> 
          {{ colorAttributeStats.uniqueValues }}
        </div>
        
        <div class="value-breakdown">
          <h4>Value Distribution:</h4>
          <div 
            v-for="(count, value) in colorAttributeStats.valueCounts" 
            :key="value"
            class="value-item"
          >
            <span class="value-name">{{ value }}</span>
            <span class="value-count">{{ count }} papers</span>
          </div>
        </div>
      </div>

    </div>
    
  <div class="chart-pane">
      <VChart 
        :option="chartOption" 
        class="chart"
        autoresize
      />
    </div>
  </div>
</template>

<style scoped>
.parallel-page {
    box-sizing: border-box;
}

.chart {
  width: 100%;
  height: 100%;
}

.attribute-selector {
  margin-bottom: 20px;
}

.attribute-selector label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #333;
}

.attribute-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  font-size: 14px;
}

.attribute-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
}

.stat-item {
  margin-bottom: 10px;
  padding: 8px;
  background-color: #f8f9fa;
  border-radius: 4px;
  font-size: 14px;
}

.value-breakdown {
  margin-top: 15px;
}

.value-breakdown h4 {
  margin-bottom: 10px;
  color: #666;
  font-size: 14px;
}

.value-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  margin-bottom: 4px;
  background-color: #f8f9fa;
  border-radius: 3px;
  font-size: 13px;
}

.value-name {
  flex: 1;
  color: #333;
  word-break: break-word;
}

.value-count {
  color: #007bff;
  font-weight: bold;
  margin-left: 10px;
}

.axis-info {
  margin-top: 20px;
}

.axis-list {
  max-height: 200px;
  overflow-y: auto;
}

.axis-item {
  padding: 6px 8px;
  margin-bottom: 3px;
  background-color: #e9ecef;
  border-radius: 3px;
  font-size: 12px;
  color: #495057;
  border-left: 3px solid #007bff;
}

/* Responsive design */
@media (max-width: 768px) {
  .parallel-view {
    flex-direction: column;
    height: auto;
  }
  
  .sidebar {
    width: 100%;
    height: auto;
    max-height: 300px;
  }
  
  .chart-container {
    margin: 10px 0;
  }
}
</style>