export type VisualData = {
  chartType?: string;
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  categories?: string[];
  series?: { name: string; data: number[] }[];
  units?: string;
  keyFeatures?: string[];
};
