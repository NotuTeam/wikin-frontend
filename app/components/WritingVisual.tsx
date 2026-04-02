"use client";

import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
);

type WritingVisualData = {
  chartType?: string;
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  categories?: string[];
  series?: { name: string; data: number[] }[];
  units?: string;
  keyFeatures?: string[];
};

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed"];

export default function WritingVisual({ visualData }: { visualData: WritingVisualData }) {
  const labels = visualData.categories || [];
  const datasets = (visualData.series || []).map((s, idx) => ({
    label: s.name,
    data: s.data,
    borderColor: COLORS[idx % COLORS.length],
    backgroundColor: `${COLORS[idx % COLORS.length]}88`,
    fill: false,
    tension: 0.25,
  }));

  if (visualData.chartType === "table" || visualData.chartType === "process") {
    return (
      <div style={{ marginBottom: 12, background: "#f9fafb", border: "1px solid #e5e7eb", padding: 10, borderRadius: 6 }}>
        <p style={{ marginTop: 0, marginBottom: 8, fontWeight: 700 }}>
          {visualData.chartType === "process" ? "Process Data" : "Table Data"}: {visualData.title || "-"}
        </p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={thStyle}>{visualData.xAxisLabel || "Category"}</th>
                {(visualData.series || []).map((s) => (
                  <th key={s.name} style={thStyle}>{s.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((label, rowIdx) => (
                <tr key={`${label}-${rowIdx}`}>
                  <td style={tdStyle}>{label}</td>
                  {(visualData.series || []).map((s) => (
                    <td key={`${label}-${s.name}`} style={tdStyle}>{s.data[rowIdx] ?? "-"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const chartData = { labels, datasets };
  const options = {
    responsive: true,
    plugins: { legend: { position: "top" as const } },
    scales: {
      x: { title: { display: !!visualData.xAxisLabel, text: visualData.xAxisLabel } },
      y: { title: { display: !!visualData.yAxisLabel, text: visualData.yAxisLabel } },
    },
  };

  return (
    <div style={{ marginBottom: 12, background: "#f9fafb", border: "1px solid #e5e7eb", padding: 10, borderRadius: 6 }}>
      <p style={{ marginTop: 0, marginBottom: 8, fontWeight: 700 }}>
        Chart Data: {visualData.title || "-"}
      </p>
      {visualData.chartType === "pie" ? (
        <Pie data={{ labels, datasets: [{ ...datasets[0], backgroundColor: COLORS }] }} />
      ) : visualData.chartType === "bar" ? (
        <Bar data={chartData} options={options} />
      ) : (
        <Line data={chartData} options={options} />
      )}
      {visualData.keyFeatures?.length ? (
        <p style={{ marginTop: 8, marginBottom: 0 }}>
          <strong>Key Features:</strong> {visualData.keyFeatures.join("; ")}
        </p>
      ) : null}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  padding: 6,
  background: "#f3f4f6",
  textAlign: "left",
};

const tdStyle: React.CSSProperties = {
  border: "1px solid #d1d5db",
  padding: 6,
};
