"use client";

import { CartesianGrid, Line, LineChart, XAxis, Customized } from "recharts";
import { useCallback, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@notra/ui/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@notra/ui/components/ui/chart";
import { Badge } from "@notra/ui/components/ui/badge";
import { TrendingUp } from "lucide-react";

const chartData = [
  { month: "January", desktop: 345, mobile: 210 },
  { month: "February", desktop: 524, mobile: 380 },
  { month: "March", desktop: 417, mobile: 310 },
  { month: "April", desktop: 321, mobile: 480 },
  { month: "May", desktop: 412, mobile: 530 },
  { month: "June", desktop: 598, mobile: 450 },
  { month: "July", desktop: 412, mobile: 290 },
  { month: "August", desktop: 643, mobile: 460 },
  { month: "September", desktop: 489, mobile: 390 },
  { month: "October", desktop: 576, mobile: 470 },
  { month: "November", desktop: 787, mobile: 620 },
  { month: "December", desktop: 298, mobile: 250 },
];

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--secondary-foreground)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function PartialLineChart() {
  const [DasharrayCalculator, lineDasharrays] = useDynamicDasharray({
    splitIndex: chartData.length - 2,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Partial Line Chart
          <Badge
            variant="outline"
            className="text-green-500 bg-green-500/10 border-none ml-2"
          >
            <TrendingUp className="h-4 w-4" />
            <span>5.2%</span>
          </Badge>
        </CardTitle>
        <CardDescription>January - June 2025</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-54 w-full" config={chartConfig}>
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            {Object.entries(chartConfig).map(([key, value]) => (
              <Line
                key={key}
                dataKey={key}
                type="linear"
                stroke={value.color}
                dot={{
                  r: 2.5,
                  fill: value.color,
                }}
                strokeDasharray={
                  lineDasharrays.find((line) => line.name === key)
                    ?.strokeDasharray || "0 0"
                }
              />
            ))}
            <Customized component={DasharrayCalculator} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

interface ChartDataPoint {
  x?: number;
  y?: number;
  value?: number | string;
  payload?: Record<string, unknown>;
}

interface ChartLineData {
  item: {
    props: {
      dataKey: string;
    };
  };
  props: {
    points: ChartDataPoint[];
  };
}

interface CustomizedChartProps {
  formattedGraphicalItems?: ChartLineData[];
}

interface LineConfig {
  name: string;
  splitIndex?: number;
  dashPattern?: number[];
  curveAdjustment?: number;
}

interface UseDynamicDasharrayProps {
  lineConfigs?: LineConfig[];
  splitIndex?: number;
  defaultDashPattern?: number[];
  curveAdjustment?: number;
}

type LineDasharray = {
  name: string;
  strokeDasharray: string;
}[];

export function useDynamicDasharray({
  lineConfigs = [],
  splitIndex = -2,
  defaultDashPattern: dashPattern = [5, 3],
  curveAdjustment = 1,
}: UseDynamicDasharrayProps): [
  (props: CustomizedChartProps) => null,
  LineDasharray,
] {
  const [lineDasharrays, setLineDasharrays] = useState<LineDasharray>([]);

  const DasharrayCalculator = useCallback(
    (props: CustomizedChartProps): null => {
      const chartLines = props?.formattedGraphicalItems;
      const newLineDasharrays: LineDasharray = [];

      const calculatePathLength = (points: ChartDataPoint[]) => {
        return (
          points?.reduce((acc, point, index) => {
            if (index === 0) return acc;

            const prevPoint = points[index - 1];

            const dx = (point.x || 0) - (prevPoint.x || 0);
            const dy = (point.y || 0) - (prevPoint.y || 0);

            acc += Math.sqrt(dx * dx + dy * dy);
            return acc;
          }, 0) || 0
        );
      };

      chartLines?.forEach((line) => {
        const points = line?.props?.points;
        const totalLength = calculatePathLength(points || []);

        const lineName = line?.item?.props?.dataKey;
        const lineConfig = lineConfigs?.find(
          (config) => config?.name === lineName,
        );
        const lineSplitIndex = lineConfig?.splitIndex ?? splitIndex;
        const dashedSegment = points?.slice(lineSplitIndex);
        const dashedLength = calculatePathLength(dashedSegment || []);

        if (!totalLength || !dashedLength) return;

        const solidLength = totalLength - dashedLength;
        const curveCorrectionFactor =
          lineConfig?.curveAdjustment ?? curveAdjustment;
        const adjustment = (solidLength * curveCorrectionFactor) / 100;
        const solidDasharrayPart = solidLength + adjustment;

        const targetDashPattern = lineConfig?.dashPattern || dashPattern;
        const patternSegmentLength =
          (targetDashPattern?.[0] || 0) + (targetDashPattern?.[1] || 0) || 1;
        const repetitions = Math.ceil(dashedLength / patternSegmentLength);
        const dashedPatternSegments = Array.from({ length: repetitions }, () =>
          targetDashPattern.join(" "),
        );

        const finalDasharray = `${solidDasharrayPart} ${dashedPatternSegments.join(
          " ",
        )}`;
        newLineDasharrays.push({
          name: lineName!,
          strokeDasharray: finalDasharray,
        });
      });

      if (
        JSON.stringify(newLineDasharrays) !== JSON.stringify(lineDasharrays)
      ) {
        setTimeout(() => setLineDasharrays(newLineDasharrays), 0);
      }

      return null;
    },
    [splitIndex, curveAdjustment, lineConfigs, dashPattern, lineDasharrays],
  );

  return [DasharrayCalculator, lineDasharrays];
}
