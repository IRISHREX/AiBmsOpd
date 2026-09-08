import React from 'react';
import './ChartCards.css';

const PieChartCard = ({ data, title }) => {
  if (!data || data.length === 0) {
    return <div className="no-data">No data to display</div>;
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let startAngle = 0;

  const slices = data.map((item, index) => {
    const angle = (item.value / total) * 360;
    const largeArcFlag = angle > 180 ? 1 : 0;
    const x1 = 50 + 40 * Math.cos((Math.PI * startAngle) / 180);
    const y1 = 50 + 40 * Math.sin((Math.PI * startAngle) / 180);
    startAngle += angle;
    const x2 = 50 + 40 * Math.cos((Math.PI * startAngle) / 180);
    const y2 = 50 + 40 * Math.sin((Math.PI * startAngle) / 180);

    const pathData = `M 50,50 L ${x1},${y1} A 40,40 0 ${largeArcFlag},1 ${x2},${y2} Z`;

    return <path key={item.name} d={pathData} fill={COLORS[index % COLORS.length]} />;
  });

  return (
    <div className="chart-card">
      <h3>{title}</h3>
      <div className="pie-chart-container">
        <svg viewBox="0 0 100 100" width="150" height="150">
          {slices}
        </svg>
        <div className="legend">
          {data.map((item, index) => (
            <div key={item.name} className="legend-item">
              <div
                className="color-box"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              ></div>
              <span>{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PieChartCard;
