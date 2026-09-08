import React from 'react';
import './ChartCards.css';

const LineChartCard = ({ data, title }) => {
  if (!data || data.length === 0) {
    return <div className="no-data">No data to display</div>;
  }

  const chartHeight = 200;
  const chartWidth = 500;
  const padding = 40;
  const maxVal = Math.max(...data.map(d => d.value));
  const pointGap = (chartWidth - 2 * padding) / (data.length - 1);

  const points = data
    .map((item, i) => {
      const x = i * pointGap + padding;
      const y = (chartHeight - padding) - (item.value / maxVal) * (chartHeight - 2 * padding);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <div className="line-chart-container">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height={chartHeight}>
          {/* Y-axis */}
          <line x1={padding} y1={padding} x2={padding} y2={chartHeight - padding} stroke="#ccc" />
          <text x="10" y="20" className="axis-label">Value</text>
          
          {/* X-axis */}
          <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="#ccc" />
          
          {data.map((item, i) => (
            <text key={item.name} x={i * pointGap + padding} y={chartHeight - padding + 15} textAnchor="middle" className="axis-label">{item.name}</text>
          ))}

          <polyline
            fill="none"
            stroke="#007bff"
            strokeWidth="2"
            points={points}
          />
        </svg>
      </div>
    </div>
  );
};

export default LineChartCard;

