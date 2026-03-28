'use client';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
}

export function Sparkline({ data, width = 200, height = 48 }: SparklineProps) {
  if (data.length < 2) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        className="sparkline"
        preserveAspectRatio="none"
      />
    );
  }

  const min = Math.min(...data) * 0.9;
  const max = Math.max(...data) * 1.1 || 1;
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const trending = last >= prev ? 'up' : 'down';
  const strokeColor = trending === 'up' ? '#4ce59f' : '#ff6b6b';
  const fillId = `spark-fill-${trending}`;

  // Close the polygon for the fill area.
  const fillPoints = `0,${height} ${points.join(' ')} ${width},${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      className="sparkline"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPoints} fill={`url(#${fillId})`} />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
