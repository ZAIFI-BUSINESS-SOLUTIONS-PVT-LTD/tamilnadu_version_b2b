import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { ChartBar } from '@phosphor-icons/react';
import SelectDropdown from '../../../components/dropdown.jsx';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const PerformanceTrendChart = ({
  selectedSubject,
  setSelectedSubject,
  performanceData = {},
  title = 'Performance Trend',
}) => {
  // Prepare chart data
  const subjectData = performanceData[selectedSubject] || [];
  const dynamicLabels = subjectData.map((_, idx) => `Test ${idx + 1}`);

  // Chart data configuration
  const chartData = {
    labels: dynamicLabels,
    datasets: [
      {
        label: 'Score',
        data: subjectData,
        borderColor: '#003cff',
        backgroundColor: '#06B6D4',
        pointBorderColor: '#003cff',
        pointBackgroundColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 3,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  // Chart options configuration
  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: '#4A4A4A',
        bodyColor: '#4A4A4A',
        borderColor: '#827EF6',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { 
          color: '#6B7280', 
          font: { size: 12 },
        },
      },
      y: {
        grid: { color: '#F3F4F6' },
        ticks: { 
          color: '#6B7280', 
          font: { size: 12 },
        },
      },
    },
    elements: {
      point: {
        radius: 6,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#827EF6',
        hoverRadius: 8,
      },
    },
  };

  // Get available subjects from performance data
  const subjects = Object.keys(performanceData);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-6">
        {/* Header section with title and subject dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <ChartBar className="w-5 h-5 text-gray-600" />
            <h3 className="text-primary text-lg font-semibold">
              {title}
            </h3>
          </div>

          {subjects.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400">Subject</label>
              <SelectDropdown
                options={subjects.map(subj => ({ 
                  value: subj, 
                  label: subj 
                }))}
                selectedValue={selectedSubject}
                onSelect={setSelectedSubject}
                placeholder="Select Subject"
                buttonClassName="w-full sm:w-48 justify-between truncate bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm"
              />
            </div>
          )}
        </div>

        {/* Chart display area */}
        <div className="w-full border border-bg-primary rounded-lg p-4">
          {subjectData.length ? (
            <Line data={chartData} options={options} />
          ) : (
            <p className="text-gray-500">No trend data available.</p>
          )}
        </div>
    </div>
  );
};

export default PerformanceTrendChart;