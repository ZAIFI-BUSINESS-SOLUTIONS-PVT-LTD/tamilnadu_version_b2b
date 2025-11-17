import React, { useState, lazy, Suspense, useEffect } from 'react';
import { UploadSimple, Plus, MagnifyingGlass, X } from '@phosphor-icons/react';
import { useTests } from '../components/hooks/e_upload/e_use_tests';
import { useFileUpload } from '../components/hooks/e_upload/e_use_file_upload';
import Table from '../components/ui/table.jsx';
import { Button } from '../../components/ui/button.jsx';
import { Input } from '../../components/ui/input.jsx';
import { Loader2, Search, CheckCircle2, XCircle } from 'lucide-react';
import SubjectConfig from './components/SubjectConfig.jsx';
import { toast } from 'react-hot-toast';

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


  // Handles the upload process and closes the modal upon successful upload
  const handleUploadAndClose = async () => {
    // Pass metadata config (if exists) to be sent with files
    const metadata = savedMetadataConfig ? {
      pattern: savedMetadataConfig.pattern,
      subject_order: savedMetadataConfig.subject_order,
      total_questions: savedMetadataConfig.total_questions,
      section_counts: savedMetadataConfig.section_counts,
    } : null;

    const success = await handleUpload(metadata);
    if (success) {
      setIsModalOpen(false);
      setStep(0);
      setSavedMetadataConfig(null); // Clear metadata for next upload
      loadTests(); // Reload the test data after a successful upload
    }
  };

  // State to control the visibility of the subject config modal
  const [isSubjectConfigOpen, setIsSubjectConfigOpen] = useState(false);
  // State to store the saved metadata config
  const [savedMetadataConfig, setSavedMetadataConfig] = useState(null);

  // Handle opening the upload flow - starts with subject config
  const handleStartUpload = () => {
    setIsSubjectConfigOpen(true);
  };

  // Handle subject configuration completion - just save config locally, don't call API
  const handleSubjectConfigComplete = (config) => {
    // Store the config locally to be sent with file upload
    setSavedMetadataConfig(config);
    toast.success('Subject configuration saved!');

    // Close subject config and open file upload modal
    setIsSubjectConfigOpen(false);
    setIsModalOpen(true);
  };

  // Handle skipping subject configuration
  const handleSubjectConfigSkip = () => {
    // Close subject config and open file upload modal without saving metadata
    setIsSubjectConfigOpen(false);
    setIsModalOpen(true);
    toast.info('Using automatic subject detection');
  };

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
    <div className="w-full mx-auto">
      <div className="hidden sm:block card rounded-2xl border border-gray-250 bg-white w-full mt-8 p-8">
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-center sm:pb-8 sm:border-b sm:border-gray-200 gap-4">
            {/* Heading on the left (hidden on mobile) */}
            <h2 className="hidden sm:block text-2xl font-bold text-gray-800 w-full sm:w-auto text-left">Upload your tests here</h2>
            {/* Search bar and upload button on the right (desktop only) */}
            <div className="hidden sm:flex flex-row w-full sm:w-auto gap-4 items-center justify-end">
              <div className="relative flex-1 sm:w-96">
                <Input
                  type="text"
                  placeholder="Search tests..."
                  className="input input-bordered w-full pl-10 pr-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <MagnifyingGlass
                  className="h-5 w-5 absolute left-3 top-2 opacity-50"
                  weight="bold"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearSearch}
                    className="absolute right-3 top-3 opacity-70 hover:opacity-100"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Button
                variant="default"
                size="md"
                  onClick={handleStartUpload}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all hover:shadow-md"
              >
                <span>Upload New Test</span>
              </Button>
            </div>
          </div>

          {/* Initial loading state */}
          {!hasInitialLoadCompleted ? (
            <div className="min-h-[300px] flex items-center justify-center sm:border-b sm:border-gray-200">
              <div className="animate-pulse">Loading dashboard...</div>
            </div>
          ) : tests.length > 0 ? (
            // Desktop/tablet: show table inside card on sm+ screens
            <div className="hidden sm:block">
              <Table
                columns={columns}
                data={sortedTests}
                sortField={sortField}
                sortDirection={sortDirection}
                onSort={handleSort}
                renderRow={renderRow}
                emptyState={null}
              />
            </div>
          ) : (
            /* Display a message and upload button if no tests are uploaded */
            <div className="flex flex-col items-center justify-center w-full p-16 text-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                <UploadSimple size={40} className="text-primary" weight="duotone" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No tests uploaded yet</h3>
              <p className="text-gray-500 mb-6 max-w-md">Get started by uploading your first test file to begin analysis.</p>
              <Button
                onClick={handleStartUpload}
                className="px-6 py-2 rounded-lg transition-all hover:shadow-md"
              >
                Upload First Test
              </Button>
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
      <div className="sm:hidden mt-4">
        <div className="card bg-transparent w-full pt-2">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search tests..."
                className="input input-bordered w-full pl-10 pr-8 h-12 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <MagnifyingGlass
                className="h-5 w-5 absolute left-3 top-3 opacity-50"
                weight="bold"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearSearch}
                  className="absolute right-3 top-3 opacity-70 hover:opacity-100"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button
              size="md"
              onClick={handleStartUpload}
              className="w-full px-4 py-2 rounded-xl h-12 text-md font-bold"
            >
              Upload New Test
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile-only table container: visible only on small screens */}
      <div className="sm:hidden mt-6">
        <div className="card rounded-2xl border border-gray-250 bg-white w-full p-4">
          {!hasInitialLoadCompleted ? (
            <div className="min-h-[200px] flex items-center justify-center">
              <div className="animate-pulse">Loading dashboard...</div>
            </div>
          ) : tests.length > 0 ? (
            <div className="space-y-4">
              {sortedTests.map((row, idx) => {
                const status = getStatusInfo(row.progress);
                return (
                  <div key={row.test_id || idx} className="flex items-start justify-between gap-4 p-4 border rounded-lg bg-white">
                    <div className="flex-1">
                      <div className="text-sm text-gray-500">Test {row.test_num}</div>
                      <div className="mt-3 flex items-start gap-3">
                        <span className={`p-2 rounded-full ${status.bgClass}`}>{status.icon}</span>
                        <div>
                          <div className={`text-sm font-semibold ${status.colorClass}`}>{status.text}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {row.createdAt && new Date(row.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* actions removed for mobile cards */}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full p-8 text-center">
              <div className="p-3 bg-primary/10 rounded-full mb-3">
                <UploadSimple size={28} className="text-primary" weight="duotone" />
              </div>
              <h4 className="text-sm font-medium text-gray-900 mb-1">No tests uploaded yet</h4>
              <p className="text-sm text-gray-500 mb-3">Upload your first test to begin analysis.</p>
              <Button onClick={handleStartUpload} className="px-4 py-2 rounded-lg">Upload</Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile-only sticky upload button (bottom-right) */}
      <Button
        type="button"
        onClick={handleStartUpload}
        title="Upload new test"
        aria-label="Upload new test"
        variant="default"
        size="icon"
        className="sm:hidden fixed bottom-24 right-4 z-40 bg-primary text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-colors"
      >
        <Plus size={22} weight="bold" />
      </Button>

      {/* Subject Configuration Modal */}
      {isSubjectConfigOpen && (
        <SubjectConfig
          onComplete={handleSubjectConfigComplete}
          onSkip={handleSubjectConfigSkip}
        />
      )}

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