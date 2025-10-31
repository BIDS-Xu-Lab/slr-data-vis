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
//   'Breathing Category',
  'Slow breathing vs fast breathing vs both',
  'Duration of breating Category',
  'Outcome type',
//   'Primary Outcome Category',
//   'Secondary Outcome Category',
]

const CATEGORY_PALETTE = [
  "rgba(84, 112, 198, 1)",   // #5470C6
  "rgba(145, 204, 117, 1)",  // #91CC75
  "rgba(238, 102, 102, 1)",  // #EE6666
  "rgba(115, 192, 222, 1)",  // #73C0DE
  "rgba(59, 162, 114, 1)",   // #3BA272
  "rgba(252, 132, 82, 1)",   // #FC8452
  "rgba(154, 96, 180, 1)",   // #9A60B4
  "rgba(234, 124, 204, 1)",  // #EA7CCC
  "rgba(47, 69, 84, 1)",     // #2f4554
  "rgba(97, 160, 168, 1)",   // #61a0a8
  "rgba(212, 130, 101, 1)",  // #d48265
  "rgba(116, 159, 131, 1)",  // #749f83
  "rgba(202, 134, 34, 1)",   // #ca8622
  "rgba(189, 162, 154, 1)",  // #bda29a
  "rgba(110, 112, 116, 1)",  // #6e7074
  "rgba(84, 101, 112, 1)",   // #546570
  "rgba(196, 204, 211, 1)"   // #c4ccd3
];

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
//   const colors = []
//   const hStep = Math.round(5 / count);
//   for (let i = 0; i < count; i++) {
//     let c = echarts.color.modifyHSL('#5A94DF', hStep * i);
//     colors.push(c)
//   }
//   return colors
    return CATEGORY_PALETTE.slice(0, count)
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
  console.log("valueToColor", valueToColor);
  

  // Prepare axis configuration first
  const axes = axisColumns.map(column => {
    const values = data.value.map(item => item[column]).filter(val => val !== undefined && val !== null && val !== '')
    const uniqueValues = [...new Set(values)]

    // Sort values: normal values in ascending order, then "NS" and "??" at the end
    const sortedValues = uniqueValues.sort((a, b) => {
      const specialValues = ['NS', '??', 'N/A']
      const aIsSpecial = specialValues.includes(a)
      const bIsSpecial = specialValues.includes(b)

      // If both are special or both are normal, sort alphabetically
      if (aIsSpecial && bIsSpecial) {
        return a.localeCompare(b)
      }
      // If only a is special, move it to the end
      if (aIsSpecial) return 1
      // If only b is special, move it to the end
      if (bIsSpecial) return -1
      // Both are normal values, sort ascending
      return a.localeCompare(b)
    })

    return {
      dim: axisColumns.indexOf(column),
      name: column,
      type: 'category',
      data: sortedValues,
      axisLabel: {
        interval: 0,
        rotate: 45,
        fontSize: 10
      },
      nameLocation: 'start'
    }
  })
  console.log("axes", axes);
  

  // Prepare data for parallel chart - convert values to indices
  const colorDimension = axisColumns.indexOf(selectedColorAttribute.value)

  const chartData = data.value.map(item => {
    const d = []
    for (const column of axisColumns) {
      d.push(item[column] || 'N/A')
    }

    // Add line color based on the selected attribute
    const colorValue = item[selectedColorAttribute.value]
    const lineColor = valueToColor[colorValue] || '#999'

    return {
      value: d,
      lineStyle: {
        color: lineColor
      },
      // Store original item data for tooltip
      itemData: item
    }
  })
  console.log("chartData", chartData);
  console.log("colorDimension", colorDimension);
  
  return {
    grid: {
      left: 100,
      right: 50,
      top: 80,
      bottom: 50
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#ccc',
      borderWidth: 1,
      textStyle: {
        color: '#333',
        fontSize: 12
      },
      formatter: function(params) {
        if (params.data && params.data.itemData) {
          const item = params.data.itemData
          let tooltipContent = '<div style="max-width: 350px; max-height: 400px; overflow-y: auto; overflow-x: hidden; word-wrap: break-word; white-space: normal;">'
          tooltipContent += `<strong style="font-size: 14px;">${item.Title || 'N/A'}</strong><br/>`
          tooltipContent += `<strong>Author:</strong> ${item.Author || 'N/A'}<br/>`
          tooltipContent += `<strong>Year:</strong> ${item.Year || 'N/A'}<br/>`
          tooltipContent += `<strong>Country:</strong> ${item.Country || 'N/A'}<br/>`
          tooltipContent += `<strong>Journal:</strong> ${item.Journal || 'N/A'}<br/><br/>`

          // Show all axis attributes
          tooltipContent += '<div style="border-top: 1px solid #ddd; padding-top: 8px; margin-top: 8px;">'
          axisColumns.forEach(column => {
            tooltipContent += `<strong>${column}:</strong> ${item[column] || 'N/A'}<br/>`
          })
          tooltipContent += '</div>'

          tooltipContent += '</div>'
          return tooltipContent
        }
        return ''
      }
    },

    visualMap: {
      show: true,
      type: 'piecewise',
      categories: colorValues,
      inRange: {
        color: colors
      },
      top: 20,
      left: 20,
      textStyle: {
        color: '#333'
      },
      orient: 'vertical'
    },

    parallelAxis: axes,
    parallel: {
    //   layout: 'vertical',
      left: '150',
      right: '5%',
      top: '10%',
      bottom: '10%'
    },
    series: {
      type: 'parallel',
      data: chartData,
      lineStyle: {
        width: 0.5,
        opacity: 0.7
      },
      emphasis: {
        lineStyle: {
          width: 3,
          opacity: 1
        }
      },
      inactiveOpacity: 0.01,
      activeOpacity: 1,
      progressive: 500,
      smooth: true
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
  display: flex;
  height: 100vh;
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