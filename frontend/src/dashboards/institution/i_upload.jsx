import React, { useState, lazy, Suspense } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, Plus, Search, X, Loader2, CheckCircle2, XCircle, Clock, MoreHorizontal, Edit2, Save } from 'lucide-react';
import { useTests } from '../components/hooks/e_upload/e_use_tests';
import { useFileUpload } from '../components/hooks/e_upload/e_use_file_upload';
import Table from '../../components/table.jsx';
import { Button } from '../../components/ui/button.jsx';
import { Input } from '../../components/ui/input.jsx';
import LoadingPage from '../components/LoadingPage.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select.jsx';
import { toast } from 'react-hot-toast';
import { useInstitution } from './index.jsx';
import FeedbackModal from '../components/feedback/FeedbackModal.jsx';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../components/ui/dropdown-menu.jsx';
import Modal from '../../components/modal.jsx';
import { updateTestName } from '../../utils/api.js';

// Reuse the educator upload modal
const UploadModal = lazy(() => import('../components/docsupload.jsx'));

const IUpload = () => {
  const { selectedEducatorId, setSelectedEducatorId, educators } = useInstitution();
  const queryClient = useQueryClient();
  const sortedEducators = React.useMemo(() => {
    if (!Array.isArray(educators)) return [];
    return [...educators].sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
  }, [educators]);

  // State to control the visibility of the upload modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  // State to control the visibility of the feedback modal after upload
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  // State to manage the current step in the upload modal
  const [step, setStep] = useState(0);
  // State for selected test to view details
  const [selectedTest, setSelectedTest] = useState(null);
  // State for editing test name
  const [isEditingTestName, setIsEditingTestName] = useState(false);
  const [editedTestName, setEditedTestName] = useState('');

  // Custom hook to fetch and manage uploaded tests data - passing selectedEducatorId
  const {
    tests,
    isLoading: testsLoading,
    refetch: refetchTests,
  } = useTests(selectedEducatorId, { enabled: !!selectedEducatorId });

  // Custom hook to manage file uploads
  const { files, setFiles, isUploading, handleUpload } = useFileUpload();

  // State for sorting the table
  const [sortField, setSortField] = useState('test_num');
  const [sortDirection, setSortDirection] = useState('desc');
  // State for search input
  const [searchTerm, setSearchTerm] = useState("");

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
    const testNameMatch = test.test_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch = test.progress?.toLowerCase().includes(searchTerm.toLowerCase());
    const dateMatch = test.createdAt && new Date(test.createdAt).toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short"
    }).toLowerCase().includes(searchTerm.toLowerCase());
    return testNumMatch || testNameMatch || statusMatch || dateMatch;
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
    if (sortField === 'test_name') {
      const nameA = (a.test_name || '').toLowerCase();
      const nameB = (b.test_name || '').toLowerCase();
      return sortDirection === 'asc'
        ? nameA.localeCompare(nameB)
        : nameB.localeCompare(nameA);
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

  const handleSaveTestName = async () => {
    if (!editedTestName.trim()) {
      toast.error("Test name cannot be empty");
      return;
    }

    // Check for duplicates (excluding the current test)
    const isDuplicate = tests.some(
      test =>
        test.test_num !== selectedTest.test_num &&
        test.test_name &&
        test.test_name.toLowerCase() === editedTestName.trim().toLowerCase()
    );

    if (isDuplicate) {
      toast.error("This test name already exists. Please choose a different name.");
      return;
    }

    try {
      const response = await updateTestName(selectedTest.test_num, editedTestName.trim(), selectedEducatorId);

      if (response.error) {
        toast.error(response.error);
        return;
      }

      toast.success("Test name updated successfully");
      setIsEditingTestName(false);
      setSelectedTest({ ...selectedTest, test_name: editedTestName.trim() });
      await queryClient.invalidateQueries({ queryKey: ['institution', 'tests', selectedEducatorId] });
      await refetchTests();
    } catch (error) {
      toast.error("Failed to update test name");
      console.error("Error updating test name:", error);
    }
  };

  const handleUploadAndClose = async (metadata = null) => {
    console.debug('i_upload - metadata to send with upload:', metadata);
    // Pass selectedEducatorId to handleUpload
    const success = await handleUpload(metadata, null, selectedEducatorId);
    if (success) {
      setIsModalOpen(false);
      setStep(0);
      await queryClient.invalidateQueries({ queryKey: ['institution', 'tests', selectedEducatorId] });
      await refetchTests();
      // Open feedback modal after successful upload
      setShowFeedbackModal(true);
    }
  };

  const getStatusInfo = (progress) => {
    const statusMap = {
      processing: {
        icon: <Loader2 size={18} className="animate-spin mr-1.5 text-yellow-500 dark:text-yellow-200" />,
        text: 'Processing...',
        colorClass: 'text-yellow-600 dark:text-yellow-200',
        bgClass: 'bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200/60 dark:border-yellow-800/60'
      },
      analyzing: {
        icon: <Search size={18} className="mr-1.5 text-blue-500 dark:text-blue-200" />,
        text: 'Analyzing',
        colorClass: 'text-blue-600 dark:text-blue-200',
        bgClass: 'bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/60'
      },
      successful: {
        icon: <CheckCircle2 size={18} className="mr-1.5 text-green-600 dark:text-green-200" />,
        text: 'Completed',
        colorClass: 'text-green-600 dark:text-green-200',
        bgClass: 'bg-green-50 dark:bg-green-950/30 border border-green-200/60 dark:border-green-800/60'
      },
      failed: {
        icon: <XCircle size={18} className="mr-1.5 text-red-600 dark:text-red-200" />,
        text: 'Failed',
        colorClass: 'text-red-600 dark:text-red-200',
        bgClass: 'bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/60'
      },
      default: {
        icon: null,
        text: 'Unknown',
        colorClass: 'text-muted-foreground',
        bgClass: 'bg-muted border border-border'
      }
    };
    return statusMap[progress] || statusMap.default;
  };

  const columns = [
    { field: 'test_num', label: 'Test #', sortable: true },
    { field: 'test_name', label: 'Test Name', sortable: true },
    { field: 'progress', label: 'Status', sortable: true },
    { field: 'createdAt', label: 'Uploaded', sortable: true },
    { field: 'actions', label: 'Actions', sortable: false, headerClass: 'justify-end' },
  ];

  const renderRow = (row, idx) => {
    const status = getStatusInfo(row.progress);
    return (
      <tr key={row.test_id || idx}>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">Test {row.test_num}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{row.test_name || 'Untitled'}</td>
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <div className={`flex items-center gap-2 ${status.colorClass}`}>
            <span className={`p-1 rounded-full ${status.bgClass}`}>{status.icon}</span>
            <span className="text-xs font-semibold">{status.text}</span>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
          {row.createdAt && new Date(row.createdAt).toLocaleString("en-GB", {
            dateStyle: "medium",
            timeStyle: "short"
          })}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
          <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="More">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent sideOffset={6} align="end">
                <DropdownMenuItem onClick={() => {
                  setSelectedTest(row);
                  setEditedTestName(row.test_name || '');
                  setIsEditingTestName(false);
                }}>
                  View more
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </td>
      </tr>
    );
  };

  if (!selectedEducatorId) {
    return (
      <div className="w-full h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Classroom:</span>
              <Select value={selectedEducatorId ? String(selectedEducatorId) : ''} onValueChange={(v) => setSelectedEducatorId ? setSelectedEducatorId(v ? Number(v) : null) : null}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select Educator" />
                </SelectTrigger>
                <SelectContent>
                  {(Array.isArray(educators) ? educators : []).map((edu) => (
                    <SelectItem key={edu.id} value={String(edu.id)}>
                      {edu.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <h3 className="text-lg font-medium text-foreground">No Educator Selected</h3>
          <p className="text-muted-foreground">Please select an educator to manage tests for that classroom.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sm:pt-16 w-full mx-auto px-4 sm:px-6 lg:px-0">
      <div className="hidden lg:flex lg:flex-row lg:items-center lg:justify-between mb-4 pb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-semibold text-foreground">Upload your tests here</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground min-w-max pl-1">Classroom</span>
          <Select value={selectedEducatorId ? String(selectedEducatorId) : ''} onValueChange={(v) => setSelectedEducatorId ? setSelectedEducatorId(v ? Number(v) : null) : null}>
            <SelectTrigger className="m-1 w-[220px] lg:w-auto justify-start truncate text-start bg-card border-border">
              <SelectValue placeholder="Select Classroom" />
            </SelectTrigger>
            <SelectContent side="bottom" align="start">
              {sortedEducators.map((edu) => (
                <SelectItem key={edu.id} value={String(edu.id)}>
                  {edu.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="default"
            onClick={handleStartUpload}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all hover:shadow-md"
          >
            <span>Upload New Test</span>
          </Button>
        </div>

      </div>
      <div className="hidden sm:block card rounded-2xl border border-border bg-card w-full p-8">
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-center sm:pb-8 gap-4">
            <h2 className="hidden sm:flex items-center gap-2 text-2xl font-bold text-foreground w-full sm:w-auto text-left">
              <Clock size={24} className="text-muted-foreground" />
              History
            </h2>
            <div className="hidden sm:flex flex-row w-full sm:w-auto gap-4 items-center justify-end">
              <div className="relative flex-1 sm:w-96">
                <Input
                  type="text"
                  placeholder="Search tests..."
                  className="input input-bordered w-full pl-10 pr-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search
                  className="h-5 w-5 absolute left-3 top-2 opacity-50"
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
            </div>
          </div>

          {testsLoading && !tests.length ? (
            <div className="relative min-h-[300px] flex items-center justify-center sm:border-b sm:border-border">
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
            <div className="flex flex-col items-center justify-center w-full p-16 text-center border-2 border-dashed border-border rounded-xl bg-muted">
              <div className="p-4 bg-primary/10 rounded-full mb-4">
                <Upload size={40} className="text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No tests uploaded yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md">Get started by uploading a test file for this educator.</p>
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
            <div className="flex items-center justify-center">
              <Select value={selectedEducatorId ? String(selectedEducatorId) : ''} onValueChange={(v) => setSelectedEducatorId ? setSelectedEducatorId(v ? Number(v) : null) : null}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Classroom" />
                </SelectTrigger>
                <SelectContent>
                  {sortedEducators.map((edu) => (
                    <SelectItem key={edu.id} value={String(edu.id)}>
                      {edu.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative">
              <Input
                type="text"
                placeholder="Search tests..."
                className="input input-bordered w-full pl-10 pr-8 h-12 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search
                className="h-5 w-5 absolute left-3 top-3 opacity-50"
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
        <div className="card rounded-2xl border border-border bg-card w-full p-4">
          {testsLoading && !tests.length ? (
            <div className="relative min-h-[200px] flex items-center justify-center">
              <LoadingPage fixed={false} className="bg-transparent" />
            </div>
          ) : tests.length > 0 ? (
            <div className="space-y-4">
              {sortedTests.map((row, idx) => {
                const status = getStatusInfo(row.progress);
                return (
                  <div key={row.test_id || idx} className="flex items-start justify-between gap-4 p-4 border border-border rounded-lg bg-card">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground mb-1">{row.test_name || 'Untitled'}</div>
                      <div className="text-xs text-muted-foreground mb-3">Test {row.test_num}</div>
                      <div className="flex items-start gap-3">
                        <span className={`p-2 rounded-full ${status.bgClass}`}>{status.icon}</span>
                        <div>
                          <div className={`text-sm font-semibold ${status.colorClass}`}>{status.text}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {row.createdAt && new Date(row.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-full" aria-label="More">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent sideOffset={6} align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedTest(row);
                            setEditedTestName(row.test_name || '');
                            setIsEditingTestName(false);
                          }}>
                            View more
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full p-8 text-center">
              <div className="p-3 bg-primary/10 rounded-full mb-3">
                <Upload size={28} className="text-primary" />
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
        <Plus size={22} />
      </Button>

      {isModalOpen && (
        <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"><LoadingPage fixed={false} className="bg-transparent" /></div>}>
          <UploadModal
            step={step}
            setStep={setStep}
            files={files}
            setFiles={setFiles}
            onSubmit={handleUploadAndClose}
            onClose={() => { setIsModalOpen(false); setStep(0); }}
            isUploading={isUploading}
            existingTests={tests}
          />
        </Suspense>
      )}
      {showFeedbackModal && (
        <FeedbackModal onClose={() => setShowFeedbackModal(false)} userType="institution" />
      )}

      {selectedTest && (
        <Modal
          open={!!selectedTest}
          onClose={() => {
            setSelectedTest(null);
            setIsEditingTestName(false);
            setEditedTestName('');
          }}
          title="Test Details"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6 p-6">
            {/* Test Name */}
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex-1">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Test Name</label>
                {isEditingTestName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={editedTestName}
                      onChange={(e) => setEditedTestName(e.target.value)}
                      className="flex-1"
                      placeholder="Enter test name"
                      autoFocus
                    />
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleSaveTestName}
                      className="flex items-center gap-1"
                    >
                      <Save size={16} />
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEditingTestName(false);
                        setEditedTestName(selectedTest.test_name || '');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-semibold text-foreground">{selectedTest.test_name || 'Untitled'}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsEditingTestName(true)}
                      className="h-8 w-8"
                      title="Edit test name"
                    >
                      <Edit2 size={16} />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Test Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Test Number</label>
                <p className="text-base text-foreground">Test {selectedTest.test_num}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Status</label>
                <div className="flex items-center gap-2">
                  {(() => {
                    const status = getStatusInfo(selectedTest.progress);
                    return (
                      <>
                        <span className={`p-1.5 rounded-full ${status.bgClass}`}>{status.icon}</span>
                        <span className={`text-sm font-semibold ${status.colorClass}`}>{status.text}</span>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Upload Date</label>
                <p className="text-base text-foreground">
                  {selectedTest.createdAt && new Date(selectedTest.createdAt).toLocaleString("en-GB", {
                    dateStyle: "long",
                    timeStyle: "short"
                  })}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Test ID</label>
                <p className="text-base text-foreground font-mono">{selectedTest.test_id || 'N/A'}</p>
              </div>
            </div>

            {/* Additional information can be added here */}
            {selectedTest.pattern && (
              <div className="pt-4 border-t border-border">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Syllabus Pattern</label>
                <p className="text-base text-foreground">{selectedTest.pattern}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default React.memo(IUpload);
