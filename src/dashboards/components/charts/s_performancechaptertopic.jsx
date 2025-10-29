import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import SelectDropdown from '../ui/dropdown.jsx';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const PerformanceChapterTopicChart = ({
  title,
  data,
  labels,
  dropdownOptions = [],
  selectedDropdownValue,
  onDropdownSelect,
  dropdownLabel = 'Select',
}) => {
  // Chart data configuration
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Accuracy',
        data,
        borderColor: '#003cff',
        backgroundColor: '#06B6D4',
        tension: 0.3,
        pointBorderColor: '#003cff',
        pointBackgroundColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6,
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
        callbacks: {
          label: function (context) {
            const value = context.parsed.y;
            return `Accuracy: ${value}%`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#6B7280', font: { size: 12 } },
      },
      y: {
        grid: { color: '#F3F4F6' },
        ticks: { color: '#6B7280', font: { size: 12 } },
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

  /**
   * Format dropdown options to ensure consistent structure
   * Converts string options to {value, label} objects
   */
  const formattedOptions = dropdownOptions.map(option =>
    typeof option === 'string' ? { value: option, label: option } : option
  );

  return (
    <div className="card bg-white shadow-lg rounded-2xl border border-gray-100">
      <div className="card-body p-6 space-y-6">
        {/* Header section with title and dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <h3 className="card-title text-primary text-xl font-semibold">
              {title}
            </h3>
          </div>

          {dropdownOptions.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400">{dropdownLabel}</label>
              <SelectDropdown
                options={formattedOptions}
                selectedValue={selectedDropdownValue}
                onSelect={onDropdownSelect}
                buttonClassName="btn btn-sm w-60 justify-start truncate"
                dropdownClassName="bg-base-100 rounded-box z-[1] p-2 shadow max-h-96 overflow-y-auto"
                itemClassName="hover:bg-primary/10 hover:text-primary transition-colors duration-200 rounded-md text-sm whitespace-nowrap"
              />
            </div>
          )}
        </div>

        {/* Chart display area */}
        <div className="w-full border border-gray-200 rounded-lg p-4">
          {data.length ? (
            <Line data={chartData} options={options} />
          ) : (
            <p className="text-gray-500">No data available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceChapterTopicChart;