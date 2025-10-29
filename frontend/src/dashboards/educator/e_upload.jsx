import React, { useState, lazy, Suspense, useEffect } from 'react';
import { UploadSimple, Plus, MagnifyingGlass, X } from '@phosphor-icons/react';
import { useTests } from '../components/hooks/e_upload/e_use_tests';
import { useFileUpload } from '../components/hooks/e_upload/e_use_file_upload';
import Table from '../components/ui/table.jsx';
import { Loader2, Search, CheckCircle2, XCircle } from 'lucide-react';

// Lazy load the modal component to improve initial load time
const UploadModal = lazy(() => import('./components/e_docsupload.jsx'));

// Dashboard component for educators to upload and manage tests
const EUpload = () => {
  // State to control the visibility of the upload modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  // State to manage the current step in the upload modal (if it's a multi-step process)
  const [step, setStep] = useState(0);
  // Custom hook to fetch and manage uploaded tests data
  const { tests, loadTests } = useTests();
  // Custom hook to manage file uploads
  const { files, setFiles, isUploading, handleUpload } = useFileUpload();
  // State for sorting the table
  const [sortField, setSortField] = useState('test_num');
  const [sortDirection, setSortDirection] = useState('desc');
  // State to track if the table component has been loaded
  const [isTableLoaded, setIsTableLoaded] = useState(false);
  // State to ensure that the initial data loading has completed before rendering the table or empty state
  const [hasInitialLoadCompleted, setHasInitialLoadCompleted] = useState(false);
  // State for search input
  const [searchTerm, setSearchTerm] = useState("");

  // Preload the table component and initial test data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Only load test data, no need to import the old table component
        await loadTests();
        setIsTableLoaded(true);
        setHasInitialLoadCompleted(true);
      } catch (error) {
        console.error('Failed to load resources', error);
      }
    };

    loadData();
  }, [loadTests]); // Re-run effect only if loadTests function reference changes

  // Handles sorting of the test table
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle sort direction if the same field is clicked again
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set the new sort field and default to ascending direction
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort the tests array based on the search term, sort field, and direction
  const filteredTests = tests.filter(test => {
    // You can expand this logic to include more fields if needed
    const testNumMatch = test.test_num?.toString().toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch = test.progress?.toLowerCase().includes(searchTerm.toLowerCase());
    const dateMatch = test.createdAt && new Date(test.createdAt).toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short"
    }).toLowerCase().includes(searchTerm.toLowerCase());
    return testNumMatch || statusMatch || dateMatch;
  });

  const sortedTests = [...filteredTests].sort((a, b) => {
    if (sortField === 'createdAt') {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    }
    if (sortField === 'progress') {
      const statusOrder = {
        processing: 1,
        analyzing: 2,
        successful: 3,
        failed: 4,
      };
      return sortDirection === 'asc'
        ? statusOrder[a.progress] - statusOrder[b.progress]
        : statusOrder[b.progress] - statusOrder[a.progress];
    }
    return sortDirection === 'asc'
      ? a.test_num - b.test_num
      : b.test_num - a.test_num;
  });

  // Handler to clear the search input
  const clearSearch = () => setSearchTerm("");

  // Placeholder function for handling download action
  const handleDownload = (testId) => {
    console.log('Downloading test', testId);
    // Implement download logic here
  };

  // Placeholder function for handling view details action
  const handleViewDetails = (testId) => {
    console.log('Viewing details for test', testId);
    // Implement view details logic here
  };

  // Handles the upload process and closes the modal upon successful upload
  const handleUploadAndClose = async () => {
    const success = await handleUpload();
    if (success) {
      setIsModalOpen(false);
      setStep(0);
      loadTests(); // Reload the test data after a successful upload
    }
  };

  // Helper to get status info (icon, text, color)
  const getStatusInfo = (progress) => {
    const statusMap = {
      processing: {
        icon: <Loader2 size={18} className="animate-spin mr-1.5 text-yellow-500" />,
        text: 'Processing...',
        colorClass: 'text-yellow-500',
        bgClass: 'bg-yellow-50'
      },
      analyzing: {
        icon: <Search size={18} className="mr-1.5 text-blue-500" />,
        text: 'Analyzing',
        colorClass: 'text-blue-500',
        bgClass: 'bg-blue-50'
      },
      successful: {
        icon: <CheckCircle2 size={18} className="mr-1.5 text-green-600" />,
        text: 'Completed',
        colorClass: 'text-green-600',
        bgClass: 'bg-green-50'
      },
      failed: {
        icon: <XCircle size={18} className="mr-1.5 text-red-600" />,
        text: 'Failed',
        colorClass: 'text-red-600',
        bgClass: 'bg-red-50'
      },
      default: {
        icon: null,
        text: 'Unknown',
        colorClass: 'text-gray-500',
        bgClass: 'bg-gray-50'
      }
    };
    return statusMap[progress] || statusMap.default;
  };

  // Table columns configuration
  const columns = [
    { field: 'test_num', label: 'Test #', sortable: true },
    { field: 'progress', label: 'Status', sortable: true },
    { field: 'createdAt', label: 'Uploaded', sortable: true },
    { field: 'actions', label: 'Actions', sortable: false },
  ];

  // Render a row for the Table component
  const renderRow = (row, idx) => {
    const status = getStatusInfo(row.progress);
    return (
      <tr key={row.test_id || idx}>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Test {row.test_num}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <div className={`flex items-center gap-2 ${status.colorClass}`}>
            <span className={`p-1 rounded-full ${status.bgClass}`}>{status.icon}</span>
            <span className="text-xs font-semibold">{status.text}</span>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {row.createdAt && new Date(row.createdAt).toLocaleString("en-GB", {
            dateStyle: "medium",
            timeStyle: "short"
          })}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
          <button
            className="btn btn-xs btn-outline btn-primary"
            onClick={() => handleDownload(row.test_id)}
          >
            Download
          </button>
          <button
            className="btn btn-xs btn-outline btn-secondary"
            onClick={() => handleViewDetails(row.test_id)}
          >
            Details
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="px-6 py-14 w-full mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          {/* Search Input Field on the right */}
          <div className="order-2 w-full sm:w-96 flex gap-2 justify-end">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search tests..."
                className="input input-bordered w-full pl-10 pr-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <MagnifyingGlass
                className="h-5 w-5 absolute left-3 top-3 opacity-50"
                weight="bold"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-3 opacity-70 hover:opacity-100"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          {/* Upload Button on the left */}
          <button
            className="order-1 btn btn-secondary btn-md text-base flex items-center gap-2 px-4 py-2 rounded-lg transition-all hover:shadow-md"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={18} weight="bold" />
            <span>Upload New Test</span>
          </button>
        </div>

        {/* Initial loading state */}
        {!hasInitialLoadCompleted ? (
          <div className="min-h-[300px] flex items-center justify-center">
            <div className="animate-pulse">Loading dashboard...</div>
          </div>
        ) : tests.length > 0 ? (
          <Table
            columns={columns}
            data={sortedTests}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            renderRow={renderRow}
            emptyState={null}
          />
        ) : (
          /* Display a message and upload button if no tests are uploaded */
          <div className="flex flex-col items-center justify-center w-full p-16 text-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
            <div className="p-4 bg-primary/10 rounded-full mb-4">
              <UploadSimple size={40} className="text-primary" weight="duotone" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No tests uploaded yet</h3>
            <p className="text-gray-500 mb-6 max-w-md">Get started by uploading your first test file to begin analysis.</p>
            <button
              className="btn btn-primary px-6 py-2 rounded-lg transition-all hover:shadow-md"
              onClick={() => setIsModalOpen(true)}
            >
              Upload First Test
            </button>
          </div>
        )}
      </div>

      {/* Render the upload modal if isModalOpen is true */}
      {isModalOpen && (
        <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">Loading modal...</div>}>
          <UploadModal
            step={step}
            setStep={setStep}
            files={files}
            setFiles={setFiles}
            onSubmit={handleUploadAndClose}
            onClose={() => setIsModalOpen(false)}
            isUploading={isUploading}
          />
        </Suspense>
      )}
    </div>
  );
};

export default React.memo(EUpload);