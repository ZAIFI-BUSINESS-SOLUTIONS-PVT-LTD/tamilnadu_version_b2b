import React, { useState, lazy, Suspense, useEffect } from 'react';
import { UploadSimple, Plus, MagnifyingGlass, X } from '@phosphor-icons/react';
import { useTests } from '../components/hooks/e_upload/e_use_tests';
import { useFileUpload } from '../components/hooks/e_upload/e_use_file_upload';
import Table from '../components/ui/table.jsx';
import { Button } from '../../components/ui/button.jsx';
import { Input } from '../../components/ui/input.jsx';
import { Loader2, Search, CheckCircle2, XCircle } from 'lucide-react';
import LoadingPage from '../components/LoadingPage.jsx';
import { toast } from 'react-hot-toast';
import { useInstitution } from './index.jsx';

// Reuse the educator upload modal
const UploadModal = lazy(() => import('../educator/components/e_docsupload.jsx'));

const IUpload = () => {
  const { selectedEducatorId } = useInstitution();
  
  // State to control the visibility of the upload modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  // State to manage the current step in the upload modal
  const [step, setStep] = useState(0);
  
  // Custom hook to fetch and manage uploaded tests data - passing selectedEducatorId
  const { tests, loadTests } = useTests(selectedEducatorId, { enabled: !!selectedEducatorId });
  
  // Custom hook to manage file uploads
  const { files, setFiles, isUploading, handleUpload } = useFileUpload();
  
  // State for sorting the table
  const [sortField, setSortField] = useState('test_num');
  const [sortDirection, setSortDirection] = useState('desc');
  // State to ensure that the initial data loading has completed
  const [hasInitialLoadCompleted, setHasInitialLoadCompleted] = useState(false);
  // State for search input
  const [searchTerm, setSearchTerm] = useState("");

  // Preload the table component and initial test data on component mount or when educator changes
  useEffect(() => {
    const loadData = async () => {
      try {
        setHasInitialLoadCompleted(false);
        await loadTests();
        setHasInitialLoadCompleted(true);
      } catch (error) {
        console.error('Failed to load resources', error);
        setHasInitialLoadCompleted(true);
      }
    };

    if (selectedEducatorId) {
        loadData();
    } else {
        setHasInitialLoadCompleted(true); // No educator selected, just show empty state
    }
  }, [loadTests, selectedEducatorId]);

  // Handles sorting of the test table
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and sort the tests array
  const filteredTests = tests.filter(test => {
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

  const clearSearch = () => setSearchTerm("");

  const handleStartUpload = () => {
    if (!selectedEducatorId) {
        toast.error("Please select an educator first");
        return;
    }
    setIsModalOpen(true);
  };

  const handleUploadAndClose = async (metadata = null) => {
    console.debug('i_upload - metadata to send with upload:', metadata);
    // Pass selectedEducatorId to handleUpload
    const success = await handleUpload(metadata, null, selectedEducatorId);
    if (success) {
      setIsModalOpen(false);
      setStep(0);
      loadTests(); 
    }
  };

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

  const columns = [
    { field: 'test_num', label: 'Test #', sortable: true },
    { field: 'progress', label: 'Status', sortable: true },
    { field: 'createdAt', label: 'Uploaded', sortable: true },
  ];

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
      </tr>
    );
  };

  if (!selectedEducatorId) {
      return (
          <div className="w-full h-[50vh] flex items-center justify-center">
              <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900">No Educator Selected</h3>
                  <p className="text-gray-500">Please select an educator from the top bar to manage tests.</p>
              </div>
          </div>
      );
  }

  return (
    <div className="w-full mx-auto">
      <div className="hidden sm:block card rounded-2xl border border-gray-250 bg-white w-full mt-20 p-8">
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-center sm:pb-8 sm:border-b sm:border-gray-200 gap-4">
            <h2 className="hidden sm:block text-2xl font-bold text-gray-800 w-full sm:w-auto text-left">Upload Tests</h2>
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

          {!hasInitialLoadCompleted ? (
            <div className="relative min-h-[300px] flex items-center justify-center sm:border-b sm:border-gray-200">
              <LoadingPage fixed={false} className="bg-transparent" />
            </div>
          ) : tests.length > 0 ? (
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
            <div className="flex flex-col items-center justify-center w-full p-16 text-center border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                <UploadSimple size={40} className="text-primary" weight="duotone" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No tests uploaded yet</h3>
              <p className="text-gray-500 mb-6 max-w-md">Get started by uploading a test file for this educator.</p>
              <Button
                onClick={handleStartUpload}
                className="px-6 py-2 rounded-lg transition-all hover:shadow-md"
              >
                Upload First Test
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile View */}
      <div className="sm:hidden mt-4 px-3">
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
              variant="default"
              size="md"
              onClick={handleStartUpload}
              className="w-full px-4 py-2 rounded-xl h-12 text-md font-bold"
            >
              Upload New Test
            </Button>
          </div>
        </div>
      </div>

      <div className="sm:hidden mt-6 px-3">
        <div className="card rounded-2xl border border-gray-250 bg-white w-full p-4">
          {!hasInitialLoadCompleted ? (
            <div className="relative min-h-[200px] flex items-center justify-center">
              <LoadingPage fixed={false} className="bg-transparent" />
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
              <p className="text-sm text-gray-500 mb-3">Upload a test to begin analysis.</p>
              <Button onClick={handleStartUpload} className="px-4 py-2 rounded-lg">Upload</Button>
            </div>
          )}
        </div>
      </div>

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

      {isModalOpen && (
        <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"><LoadingPage fixed={false} className="bg-transparent" /></div>}>
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

export default React.memo(IUpload);
