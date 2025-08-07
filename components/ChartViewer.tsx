import React from 'react';
import { ChartElement, ChartType } from '../types';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, RadarChart, Radar, ScatterChart, Scatter,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell, ResponsiveContainer,
} from 'recharts';

interface ChartViewerProps {
    element: ChartElement;
}

const ChartViewer: React.FC<ChartViewerProps> = ({ element }) => {
    const { chartType, data, config } = element;

    const renderBarChart = () => (
        <BarChart data={data} barGap={5}>
            {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip wrapperStyle={{ fontSize: '12px', padding: '3px' }}/>
            {config.showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
            {config.dataKeys.map((key, index) => (
                <Bar key={key} dataKey={key} fill={config.colors[index % config.colors.length]} isAnimationActive />
            ))}
        </BarChart>
    );

    const renderLineChart = () => (
        <LineChart data={data}>
            {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip wrapperStyle={{ fontSize: '12px', padding: '3px' }}/>
            {config.showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
            {config.dataKeys.map((key, index) => (
                <Line key={key} type="monotone" dataKey={key} stroke={config.colors[index % config.colors.length]} isAnimationActive strokeWidth={2} />
            ))}
        </LineChart>
    );

    const renderPieChart = () => {
        const RADIAN = Math.PI / 180;
        const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }: any) => {
            if (percent < 0.05) return null; // Don't render labels for tiny slices
            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
            const x = cx + radius * Math.cos(-midAngle * RADIAN);
            const y = cy + radius * Math.sin(-midAngle * RADIAN);
            
            let labelText = '';
            switch(config.labelType) {
                case 'percent': labelText = `${(percent * 100).toFixed(0)}%`; break;
                case 'value': labelText = value; break;
                case 'name': labelText = name; break;
                default: return null;
            }

            return (
                <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="bold">
                    {labelText}
                </text>
            );
        };

        return (
            <PieChart>
                <Pie
                    data={data}
                    dataKey={config.dataKeys[0] || 'value'}
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius="80%"
                    fill="#8884d8"
                    labelLine={false}
                    label={config.labelType ? renderCustomizedLabel : undefined}
                    isAnimationActive
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={config.colors[index % config.colors.length]} />
                    ))}
                </Pie>
                <Tooltip wrapperStyle={{ fontSize: '12px', padding: '3px' }}/>
                {config.showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
            </PieChart>
        );
    }
    
    const renderRadarChart = () => (
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="name" fontSize={12} />
            <PolarRadiusAxis fontSize={10}/>
            <Tooltip wrapperStyle={{ fontSize: '12px', padding: '3px' }}/>
            {config.showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
            {config.dataKeys.map((key, index) => (
                <Radar key={key} name={key} dataKey={key} stroke={config.colors[index % config.colors.length]} fill={config.colors[index % config.colors.length]} fillOpacity={0.6} isAnimationActive/>
            ))}
        </RadarChart>
    );

    const renderScatterChart = () => (
         <ScatterChart>
            {config.showGrid && <CartesianGrid />}
            <XAxis type="number" dataKey={config.dataKeys[0]} name={config.dataKeys[0]} fontSize={12} />
            <YAxis type="number" dataKey={config.dataKeys[1]} name={config.dataKeys[1]} fontSize={12} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} wrapperStyle={{ fontSize: '12px', padding: '3px' }}/>
            {config.showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
            <Scatter name="Data points" data={data} fill={config.colors[0]} isAnimationActive>
                 {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={config.colors[index % config.colors.length]} />
                 ))}
            </Scatter>
        </ScatterChart>
    );
    
    const renderWaterfallChart = () => {
        let cumulative = 0;
        const waterfallData = data.map(entry => {
            const value = entry[config.dataKeys[0]] as number;
            const base = [0, cumulative];
            cumulative += value;
            return {
                ...entry,
                value,
                base,
            };
        });

        return (
            <BarChart data={waterfallData} stackOffset="sign">
                {config.showGrid && <CartesianGrid strokeDasharray="3 3" />}
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip wrapperStyle={{ fontSize: '12px', padding: '3px' }}/>
                <Bar dataKey="base" fill="transparent" stackId="stack" isAnimationActive={false} />
                <Bar dataKey="value" stackId="stack" isAnimationActive>
                    {waterfallData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.value >= 0 ? config.colors[0] : config.colors[1]} />
                    ))}
                </Bar>
            </BarChart>
        );
    };

    let chartComponent;
    switch(chartType) {
        case ChartType.BAR: chartComponent = renderBarChart(); break;
        case ChartType.LINE: chartComponent = renderLineChart(); break;
        case ChartType.PIE: chartComponent = renderPieChart(); break;
        case ChartType.RADAR: chartComponent = renderRadarChart(); break;
        case ChartType.SCATTER: chartComponent = renderScatterChart(); break;
        case ChartType.WATERFALL: chartComponent = renderWaterfallChart(); break;
        default: return <div className="text-red-500 p-4">Unsupported Chart Type</div>;
    }

    return (
        <div className="w-full h-full bg-white rounded-md shadow-inner p-2 pointer-events-auto">
            <ResponsiveContainer width="100%" height="100%">
                {chartComponent}
            </ResponsiveContainer>
        </div>
    );
};

export default ChartViewer;