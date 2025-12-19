import ReactECharts from 'echarts-for-react';

const Chart = ({ data, parameter }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No data available. Please select a station and parameter.</p>
      </div>
    );
  }

  const getOption = () => {
    // Prepare data for the chart
    const timestamps = data.map(item => item.DATETIMEDATA || item.datetime);
    // Get values using the parameter ID (PM25, PM10, etc.)
    const paramKey = parameter?.id || 'value';

    // Check if data has gap filling information
    const hasGapFilling = data.some(item => item.hasOwnProperty('gap_filled') || item.hasOwnProperty('was_gap'));

    let series;
    let hasAnomalies = false;

    if (hasGapFilling) {
      // Get original values and predicted values for all points
      const originalValues = data.map((item) => {
        const value = parseFloat(item[paramKey]);
        return !isNaN(value) ? value : null;
      });

      // Show AI predictions for ALL data points (not just gaps)
      const predictedValues = data.map((item) => {
        // Use predicted_value if available, otherwise use filled_value
        const value = parseFloat(item.predicted_value !== undefined ? item.predicted_value : item.filled_value);
        return !isNaN(value) ? value : null;
      });

      // Create array to highlight gap-filled points
      const gapPoints = data.map((item, index) => {
        const isGap = item.gap_filled || item.was_gap;
        return isGap ? predictedValues[index] : null;
      });

      // Calculate statistics for anomaly detection (if not provided by API)
      const validValues = originalValues.filter(v => v !== null);
      const mean = validValues.length > 0 ? validValues.reduce((a, b) => a + b, 0) / validValues.length : 0;
      const stdDev = validValues.length > 0 ? Math.sqrt(validValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / validValues.length) : 0;
      const threshold = mean + 2 * stdDev; // Points above 2 standard deviations are anomalies

      // Create array for anomaly points
      const anomalyPoints = data.map((item, index) => {
        // Check if marked as anomaly by API
        const isApiAnomaly = item.is_anomaly || item.anomaly || item.statistical_anomaly || item.domain_anomaly;
        // Or detect locally based on threshold
        const value = originalValues[index];
        const isStatisticalAnomaly = value !== null && value > threshold;

        if (isApiAnomaly || isStatisticalAnomaly) {
          return value;
        }
        return null;
      });

      hasAnomalies = anomalyPoints.some(v => v !== null);

      series = [
        {
          name: `${parameter?.name || 'Value'} (Actual)`,
          type: 'line',
          data: originalValues,
          smooth: true,
          connectNulls: false,
          lineStyle: {
            width: 3,
            color: parameter?.color || '#3b82f6'
          },
          itemStyle: {
            color: parameter?.color || '#3b82f6'
          },
          symbol: 'circle',
          symbolSize: 6,
          z: 3
        },
        {
          name: `${parameter?.name || 'Value'} (AI Prediction)`,
          type: 'line',
          data: predictedValues,
          smooth: true,
          lineStyle: {
            width: 2,
            type: 'dashed',
            color: '#10b981'
          },
          itemStyle: {
            color: '#10b981'
          },
          symbol: 'emptyCircle',
          symbolSize: 4,
          z: 2
        },
        {
          name: `Gap-Filled Points`,
          type: 'scatter',
          data: gapPoints,
          itemStyle: {
            color: '#f59e0b',
            borderColor: '#fff',
            borderWidth: 2
          },
          symbol: 'circle',
          symbolSize: 10,
          z: 4
        }
      ];

      // Add anomaly series if anomalies exist
      if (hasAnomalies) {
        series.push({
          name: 'Anomaly Points',
          type: 'scatter',
          data: anomalyPoints,
          itemStyle: {
            color: '#ef4444',
            borderColor: '#fff',
            borderWidth: 2
          },
          symbol: 'triangle',
          symbolSize: 12,
          z: 5
        });
      }
    } else {
      // Regular data without gap filling
      const values = data.map(item => parseFloat(item[paramKey]) || 0);
      series = [
        {
          name: parameter?.name || 'Value',
          type: 'line',
          data: values,
          smooth: true,
          lineStyle: {
            width: 3,
            color: parameter?.color || '#3b82f6'
          },
          itemStyle: {
            color: parameter?.color || '#3b82f6'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: parameter?.color ? `${parameter.color}40` : 'rgba(59, 130, 246, 0.3)'
                },
                {
                  offset: 1,
                  color: parameter?.color ? `${parameter.color}10` : 'rgba(59, 130, 246, 0.05)'
                }
              ]
            }
          }
        }
      ];
    }

    return {
      title: {
        text: `${parameter?.name || 'Air Quality'} Trend`,
        left: 'center',
        textStyle: {
          fontSize: 18,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          let tooltip = `${params[0].axisValue}<br/>`;
          params.forEach(param => {
            if (param.value !== null && param.value !== undefined) {
              const formattedValue = typeof param.value === 'number' ? param.value.toFixed(2) : param.value;
              tooltip += `${param.marker}${param.seriesName}: ${formattedValue} ${parameter?.unit || ''}<br/>`;
            }
          });

          // Add gap and anomaly status if available
          if (hasGapFilling && params[0] && params[0].dataIndex !== undefined) {
            const dataPoint = data[params[0].dataIndex];
            if (dataPoint && (dataPoint.gap_filled || dataPoint.was_gap)) {
              tooltip += `<span style="color: #f59e0b;">⚠ Gap-filled by AI</span><br/>`;
            }
            // Check for anomaly
            const isAnomaly = dataPoint?.is_anomaly || dataPoint?.anomaly || dataPoint?.statistical_anomaly || dataPoint?.domain_anomaly;
            if (isAnomaly) {
              tooltip += `<span style="color: #ef4444;">🔺 Anomaly Detected</span>`;
            }
          }

          return tooltip;
        }
      },
      legend: hasGapFilling ? {
        data: [
          `${parameter?.name || 'Value'} (Actual)`,
          `${parameter?.name || 'Value'} (AI Prediction)`,
          'Gap-Filled Points',
          ...(hasAnomalies ? ['Anomaly Points'] : [])
        ],
        top: '8%',
        right: '5%',
        textStyle: { fontSize: 11 }
      } : undefined,
      toolbox: {
        feature: {
          dataZoom: {
            yAxisIndex: 'none',
            title: {
              zoom: 'Zoom',
              back: 'Reset Zoom'
            }
          },
          restore: {
            title: 'Restore'
          },
          saveAsImage: {
            title: 'Save as Image'
          }
        },
        right: '5%',
        top: '5%'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: timestamps,
        axisLabel: {
          rotate: 45,
          formatter: (value) => {
            // Format timestamp for better readability
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
          }
        }
      },
      yAxis: {
        type: 'value',
        name: parameter?.unit || '',
        nameLocation: 'middle',
        nameGap: 50,
        nameTextStyle: {
          fontSize: 14
        }
      },
      series: series,
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: false
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          height: 20,
          bottom: 10,
          fillerColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: '#3b82f6',
          handleStyle: {
            color: '#3b82f6'
          },
          moveHandleStyle: {
            color: '#3b82f6'
          },
          emphasis: {
            handleStyle: {
              color: '#2563eb'
            },
            moveHandleStyle: {
              color: '#2563eb'
            }
          }
        }
      ]
    };
  };

  return (
    <div className="w-full h-full">
      <ReactECharts
        option={getOption()}
        style={{ height: '100%', width: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
};

export default Chart;
