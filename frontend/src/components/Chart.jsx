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
    const values = data.map(item => parseFloat(item[paramKey]) || 0);

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
          const param = params[0];
          return `${param.axisValue}<br/>${param.seriesName}: ${param.value} ${parameter?.unit || ''}`;
        }
      },
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
      series: [
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
      ],
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
