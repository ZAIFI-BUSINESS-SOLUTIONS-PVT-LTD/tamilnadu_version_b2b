import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { ChartBar } from '@phosphor-icons/react';
import SelectDropdown from '../ui/dropdown.jsx';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const SubjectWiseAnalysisChart = ({
  selectedTest,
  setSelectedTest,
  testData = {},
  subjectLabels = ['Botany', 'Chemistry', 'Physics', 'Zoology'],
  title = 'Subject-wise Analysis',
}) => {
  // Prepare chart data
  const testList = Object.keys(testData);
  const currentTestData = testData[selectedTest] || [];

  // Chart data configuration
  const chartData = {
    labels: subjectLabels,
    datasets: [
      {
        label: 'Marks Obtained',
        data: currentTestData,
        backgroundColor: '#003cff',
        borderRadius: 8,
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
        borderColor: '#01B7F0',
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
    barPercentage: 0.5,
    categoryPercentage: 0.6,
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 space-y-6">
        {/* Header section with title and test dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <ChartBar className="w-5 h-5 text-gray-600" />
            <h3 className="text-primary text-lg font-semibold">
              {title}
            </h3>
          </div>

          {testList.length > 0 && (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-sm text-gray-400">Test</label>
              <SelectDropdown
                options={testList.map(test => ({ 
                  value: test, 
                  label: test 
                }))}
                selectedValue={selectedTest}
                onSelect={setSelectedTest}
                placeholder="Select Test"
                buttonClassName="w-full sm:w-48 justify-between truncate bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm"
              />
            </div>
          )}
        </div>

        {/* Chart display area */}
        <div className="w-full border border-bg-primary rounded-lg p-4">
          {currentTestData.length ? (
            <Bar data={chartData} options={options} />
          ) : (
            <p className="text-gray-500">No subject-wise data available.</p>
          )}
        </div>
    </div>
  );
};

export default SubjectWiseAnalysisChart;