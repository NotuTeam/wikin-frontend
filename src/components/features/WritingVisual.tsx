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
import { VisualData } from "@/types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed"];

interface WritingVisualProps {
  visualData: VisualData;
}

export function WritingVisual({ visualData }: WritingVisualProps) {
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
      <div className="mb-3 bg-gray-50 border border-gray-200 p-3 rounded-lg">
        <p className="font-semibold mb-2">
          {visualData.chartType === "process" ? "Process Data" : "Table Data"}: {visualData.title || "-"}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2 bg-gray-100 text-left font-medium">
                  {visualData.xAxisLabel || "Category"}
                </th>
                {(visualData.series || []).map((s) => (
                  <th key={s.name} className="border border-gray-300 p-2 bg-gray-100 text-left font-medium">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((label, rowIdx) => (
                <tr key={`${label}-${rowIdx}`}>
                  <td className="border border-gray-300 p-2">{label}</td>
                  {(visualData.series || []).map((s) => (
                    <td key={`${label}-${s.name}`} className="border border-gray-300 p-2">
                      {s.data[rowIdx] ?? "-"}
                    </td>
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
    <div className="mb-3 bg-gray-50 border border-gray-200 p-3 rounded-lg">
      <p className="font-semibold mb-2">Chart Data: {visualData.title || "-"}</p>
      {visualData.chartType === "pie" ? (
        <Pie data={{ labels, datasets: [{ ...datasets[0], backgroundColor: COLORS }] }} />
      ) : visualData.chartType === "bar" ? (
        <Bar data={chartData} options={options} />
      ) : (
        <Line data={chartData} options={options} />
      )}
      {visualData.keyFeatures?.length ? (
        <p className="mt-2 text-sm">
          <span className="font-medium">Key Features:</span> {visualData.keyFeatures.join("; ")}
        </p>
      ) : null}
    </div>
  );
}
