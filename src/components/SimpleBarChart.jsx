import React from 'react';
import './SimpleBarChart.css';

const SimpleBarChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div className="no-data">No data to display</div>;
  }

  const maxRevenue = Math.max(...data.map(d => d.revenue || d.totalEarning || 0));
  const maxDue = Math.max(...data.map(d => d.due || d.totalDue || 0));
  const maxVal = Math.max(maxRevenue, maxDue);

  const chartHeight = 300;
  const barWidth = 30;
  const barMargin = 15;
  const padding = 40;
  const chartWidth = data.length * (barWidth * 2 + barMargin) + 2 * padding;

  return (
    <div className="bar-chart-container">
      <svg width={chartWidth} height={chartHeight}>
        {/* Y-axis */}
        <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke="#ccc" />
        <text x="10" y="20" className="axis-label">Value</text>
        
        {/* X-axis */}
        <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#ccc" />

        <g transform={`translate(${padding}, 0)`}>
          {data.map((d, i) => {
            const revenue = d.revenue || d.totalEarning || 0;
            const due = d.due || d.totalDue || 0;
            const revenueHeight = (revenue / maxVal) * (chartHeight - 2 * padding);
            const dueHeight = (due / maxVal) * (chartHeight - 2 * padding);
            const x1 = i * (barWidth * 2 + barMargin);
            const x2 = x1 + barWidth;

            return (
              <g key={d.period}>
                <rect
                  x={x1}
                  y={chartHeight - padding - revenueHeight}
                  width={barWidth}
                  height={revenueHeight}
                  className="bar revenue"
                />
                <rect
                  x={x2}
                  y={chartHeight - padding - dueHeight}
                  width={barWidth}
                  height={dueHeight}
                  className="bar due"
                />
                <text x={x1 + barWidth} y={chartHeight - padding + 15} textAnchor="middle" className="axis-label">
                  {d.period}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div className="legend">
        <div className="legend-item">
          <div className="color-box revenue"></div>
          <span>Paid</span>
        </div>
        <div className="legend-item">
          <div className="color-box due"></div>
          <span>Due</span>
        </div>
      </div>
    </div>
  );
};

export default SimpleBarChart;
