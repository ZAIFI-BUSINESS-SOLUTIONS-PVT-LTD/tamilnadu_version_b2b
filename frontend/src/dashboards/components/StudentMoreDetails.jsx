import React, { useState } from 'react';
import { updateInstitutionStudent, deleteInstitutionStudentTest, reuploadInstitutionStudentResponses } from '../../utils/api';
import toast from 'react-hot-toast';
import {
    Loader,
    BarChart2,
    FileText,
    Trash2,
    Edit,
    AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/button.jsx';
import { Input } from '../../components/ui/input.jsx';
import Modal from '../../components/modal.jsx';
import Table from '../../components/table.jsx';
import StudentDeleteModal from './StudentDeleteModal.jsx';

const SUBJECTS = [
    { key: 'phy_score', label: 'Physics' },
    { key: 'chem_score', label: 'Chemistry' },
    { key: 'bio_score', label: 'Biology' },
    { key: 'bot_score', label: 'Botany' },
    { key: 'zoo_score', label: 'Zoology' },
];

function StudentMoreDetails({
    modalStudent,
    setModalStudent,
    initialEditMode = false,
    setInitialEditMode,
    studentNameMap,
    selectedEducatorId,
    fetchResults,
    setDeleteSummary,
    setError,
    setStudentNameMap,
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ student_id: '', name: '', dob: '', password: '' });
    const [deleteTestModalOpen, setDeleteTestModalOpen] = useState(false);
    const [testToDelete, setTestToDelete] = useState(null);
    const [deleteStudentModalOpen, setDeleteStudentModalOpen] = useState(false);
    const [reuploadModalOpen, setReuploadModalOpen] = useState(false);
    const [reuploadData, setReuploadData] = useState({ studentId: null, testNum: null });
    const [reuploadFile, setReuploadFile] = useState(null);
    const [reuploadLoading, setReuploadLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [localError, setLocalError] = useState(null);
    const initialEditModeApplied = React.useRef(false);

    // Handle initial edit mode when modal opens
    React.useEffect(() => {
        if (!modalStudent) {
            initialEditModeApplied.current = false;
            return;
        }

        if (initialEditMode && !initialEditModeApplied.current) {
            setIsEditing(true);
            setEditForm({
                student_id: modalStudent.student_id || '',
                name: studentNameMap[modalStudent.student_id] || modalStudent.student_name || '',
                dob: modalStudent.dob || '',
                password: ''
            });
            initialEditModeApplied.current = true;
            if (setInitialEditMode) setInitialEditMode(false);
        } else if (!initialEditMode) {
            setIsEditing(false);
        }
    }, [modalStudent, studentNameMap, setInitialEditMode]);

    const handleSaveEdit = async () => {
        try {
            // Build payload with only non-empty fields (all fields are optional)
            const payload = {};
            if (editForm.student_id && editForm.student_id.trim() !== '') payload.student_id = editForm.student_id.trim();
            if (editForm.name && editForm.name.trim() !== '') payload.name = editForm.name.trim();
            if (editForm.dob && editForm.dob.trim() !== '') payload.dob = editForm.dob.trim();
            if (editForm.password && editForm.password.trim() !== '') payload.password = editForm.password.trim();

            // Ensure at least one field is being updated
            if (Object.keys(payload).length === 0) {
                setError('Please enter at least one field to update');
                return;
            }

            const res = await updateInstitutionStudent(selectedEducatorId, modalStudent.student_id, payload);
            if (res.error) {
                setError(res.error);
            } else {
                // If name was updated, ensure it shows immediately in the list
                if (payload.name) {
                    setStudentNameMap(prev => ({ ...prev, [modalStudent.student_id]: payload.name }));
                }
                // Refresh and close edit mode
                await fetchResults();
                setIsEditing(false);
                setModalStudent(null);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to update student');
        }
    };

    const handleDelete = async () => {
        setDeleteStudentModalOpen(true);
    };

    const handleDeleteTest = async () => {
        try {
            setLoading(true);
            const res = await deleteInstitutionStudentTest(
                selectedEducatorId,
                testToDelete.studentId,
                testToDelete.testNum
            );

            if (res.error) {
                setError(res.error);
                toast.error(res.error);
            } else {
                // Show success message with details
                const statusMsg = [];
                if (res.neo4j?.status === 'ok') {
                    statusMsg.push('✅ Neo4j test deleted');
                } else {
                    statusMsg.push(`⚠️ Neo4j: ${res.neo4j?.message || 'failed'}`);
                }

                if (res.dashboard?.status === 'ok') {
                    statusMsg.push('✅ Dashboard regenerated');
                } else if (res.dashboard?.status === 'partial') {
                    statusMsg.push(`⚠️ Dashboard: ${res.dashboard?.message || 'partial'}`);
                }

                setDeleteSummary({
                    message: res.message || `Test ${testToDelete.testNum} deleted`,
                    counts: res.deleted_counts || {}
                });

                toast.success(`${res.message}\n${statusMsg.join(' | ')}`);

                // Refresh results
                await fetchResults();

                // Close modals
                setDeleteTestModalOpen(false);
                setTestToDelete(null);
                setModalStudent(null);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to delete test');
            toast.error('Failed to delete test');
        } finally {
            setLoading(false);
        }
    };

    const handleReupload = async () => {
        if (!reuploadFile) {
            setLocalError('Please select a CSV file');
            return;
        }

        setLocalError(null);
        setReuploadLoading(true);

        try {
            const res = await reuploadInstitutionStudentResponses(
                selectedEducatorId,
                reuploadData.studentId,
                reuploadData.testNum,
                reuploadFile
            );

            if (res.error) {
                setLocalError(res.error);
                toast.error(res.error);
            } else {
                // Show success message with details
                const statusMsg = [];

                if (res.responses?.status === 'ok') {
                    statusMsg.push(`✅ ${res.responses.count} responses uploaded`);
                } else {
                    statusMsg.push(`⚠️ Responses: ${res.responses?.message || 'failed'}`);
                }

                if (res.analysis?.status === 'ok') {
                    statusMsg.push('✅ Analysis completed');
                } else {
                    statusMsg.push(`⚠️ Analysis: ${res.analysis?.message || 'failed'}`);
                }

                if (res.dashboard?.status === 'ok') {
                    statusMsg.push('✅ Dashboard updated');
                } else if (res.dashboard?.status === 'partial') {
                    statusMsg.push(`⚠️ Dashboard: ${res.dashboard?.message || 'partial'}`);
                }

                setDeleteSummary({
                    message: res.message || 'Responses re-uploaded successfully',
                    counts: { responses: res.responses?.count || 0 }
                });

                toast.success(`${res.message}\n${statusMsg.join(' | ')}`);

                // Refresh results
                await fetchResults();

                // Close modal
                setReuploadModalOpen(false);
                setReuploadData({ studentId: null, testNum: null });
                setReuploadFile(null);
                setModalStudent(null);
            }
        } catch (err) {
            console.error(err);
            setLocalError('Failed to re-upload responses');
            toast.error('Failed to re-upload responses');
        } finally {
            setReuploadLoading(false);
        }
    };

    if (!modalStudent) return null;

    return (
        <>
            {/* Main Student Details Modal */}
            <Modal
                open={!!modalStudent}
                onClose={() => setModalStudent(null)}
                title={modalStudent ? (
                    <>
                        {studentNameMap[modalStudent.student_id] || modalStudent.student_name}
                        <span className="text-xs text-muted-foreground ml-2">(ID: {modalStudent.student_id})</span>
                    </>
                ) : ''}
                maxWidth="max-w-5xl"
            >
                <div className="flex flex-col h-[80vh]">
                    {modalStudent && (
                        <>
                            {/* Header Section - Sticky */}
                            <div className="sticky top-0 bg-card border-b border-border pb-4 mb-4">
                                {isEditing ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-foreground">Student ID</label>
                                            <Input
                                                className="input input-bordered w-full"
                                                value={editForm.student_id}
                                                onChange={e => setEditForm(prev => ({ ...prev, student_id: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground">Name</label>
                                            <Input
                                                className="input input-bordered w-full"
                                                value={editForm.name}
                                                onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground">DOB</label>
                                            <Input
                                                type="date"
                                                className="input input-bordered w-full"
                                                value={editForm.dob}
                                                onChange={e => setEditForm(prev => ({ ...prev, dob: e.target.value }))}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground">Password</label>
                                            <Input
                                                type="password"
                                                className="input input-bordered w-full"
                                                value={editForm.password}
                                                placeholder="Leave blank to keep current password"
                                                onChange={e => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                                        <div className="flex items-center gap-2">
                                            <FileText className="text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Tests</p>
                                                <p className="font-medium">{modalStudent.tests_taken}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <BarChart2 className="text-muted-foreground" />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Average</p>
                                                <p className="font-medium">{modalStudent.average_score}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Scrollable Content Section */}
                            <div className="flex-1 overflow-y-auto pr-2">
                                {!isEditing && (
                                    <>
                                        {(() => {
                                            const activeSubjects = SUBJECTS.filter(sub =>
                                                modalStudent.test_results.some(test => {
                                                    const val = test[sub.key];
                                                    return val != null && val !== undefined && val !== '' && val !== 0;
                                                })
                                            );

                                            const sortedTests = [...modalStudent.test_results].sort((a, b) => b.test_num - a.test_num);

                                            const columns = [
                                                { field: 'test_num', label: 'Test #', sortable: false },
                                                { field: 'total_score', label: 'Total Score', sortable: false },
                                                ...activeSubjects.map(sub => ({ field: sub.key, label: sub.label, sortable: false })),
                                                { field: 'actions', label: 'Actions', sortable: false, headerClass: 'text-right' }
                                            ];

                                            return (
                                                <>
                                                    <h4 className="text-md font-semibold text-foreground mb-4">Test Performance</h4>
                                                    <Table
                                                        columns={columns}
                                                        data={sortedTests}
                                                        renderRow={(test, index) => (
                                                            <tr key={index}>
                                                                <td className="px-6 py-3 text-sm text-foreground">{test.test_num}</td>
                                                                <td className="px-6 py-3 text-sm font-medium text-foreground">{test.total_score}</td>
                                                                {activeSubjects.map(sub => (
                                                                    <td key={sub.key} className="px-6 py-3 text-sm text-foreground">
                                                                        {test[sub.key] != null && test[sub.key] !== undefined && test[sub.key] !== '' && test[sub.key] !== 0 ? test[sub.key] : "-"}
                                                                    </td>
                                                                ))}
                                                                <td className="px-6 py-3 text-sm">
                                                                    <div className="flex items-center gap-2 flex-nowrap">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="text-red-600 border-red-200 hover:bg-red-50/80 dark:border-red-900/30 dark:hover:bg-red-950/40 whitespace-nowrap"
                                                                            onClick={() => {
                                                                                setTestToDelete({ studentId: modalStudent.student_id, testNum: test.test_num });
                                                                                setDeleteTestModalOpen(true);
                                                                            }}
                                                                        >
                                                                            <Trash2 className="w-3 h-3 mr-1" />
                                                                            Delete
                                                                        </Button>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="text-blue-600 border-blue-200 hover:bg-blue-50/80 dark:border-blue-900/30 dark:hover:bg-blue-950/40 whitespace-nowrap"
                                                                            onClick={() => {
                                                                                setReuploadData({ studentId: modalStudent.student_id, testNum: test.test_num });
                                                                                setReuploadModalOpen(true);
                                                                            }}
                                                                        >
                                                                            <FileText className="w-3 h-3 mr-1" />
                                                                            Re-upload
                                                                        </Button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    />
                                                </>
                                            );
                                        })()}
                                    </>
                                )}
                            </div>

                            {/* Footer Section - Sticky */}
                            <div className="sticky bottom-0 bg-card border-t border-border pt-4 mt-4 flex justify-between">
                                {isEditing ? (
                                    <>
                                        <div className="flex gap-2">
                                            <Button variant="default" onClick={handleSaveEdit}>
                                                Save
                                            </Button>
                                            <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                                        </div>
                                        <Button variant="ghost" onClick={() => setModalStudent(null)}>Close</Button>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                                onClick={handleDelete}
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Delete
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => {
                                                    setIsEditing(true);
                                                    setEditForm({ student_id: modalStudent.student_id || '', name: studentNameMap[modalStudent.student_id] || modalStudent.student_name || '', dob: modalStudent.dob || '', password: '' });
                                                }}
                                            >
                                                <Edit className="w-4 h-4 mr-2" />
                                                Edit
                                            </Button>
                                        </div>
                                        <Button variant="ghost" onClick={() => setModalStudent(null)}>Close</Button>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </Modal>

            {/* Delete Test Confirmation Modal */}
            {deleteTestModalOpen && testToDelete && (
                <Modal
                    open={deleteTestModalOpen}
                    onClose={() => {
                        setDeleteTestModalOpen(false);
                        setTestToDelete(null);
                    }}
                    title="Delete Test"
                    maxWidth="max-w-md"
                >
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                            <div>
                                <p className="text-sm text-foreground">
                                    Are you sure you want to delete <strong>Test {testToDelete.testNum}</strong> for student <strong>{testToDelete.studentId}</strong>?
                                </p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    This will permanently delete:
                                </p>
                                <ul className="list-disc ml-5 text-sm text-muted-foreground mt-1">
                                    <li>All Neo4j test nodes and relationships</li>
                                    <li>All Postgres test data (results, responses, SWOT)</li>
                                    <li>Student dashboard will be regenerated</li>
                                </ul>
                                <p className="text-sm text-red-600 mt-3 font-medium">
                                    This action cannot be undone.
                                </p>
                            </div>
                        </div>

                        <div className="modal-action mt-4 flex flex-col sm:flex-row gap-2">
                            <Button
                                variant="default"
                                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                                onClick={handleDeleteTest}
                            >
                                Delete Test
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full sm:w-auto"
                                onClick={() => {
                                    setDeleteTestModalOpen(false);
                                    setTestToDelete(null);
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Re-upload Student Responses Modal */}
            {reuploadModalOpen && reuploadData.studentId && (
                <Modal
                    open={reuploadModalOpen}
                    onClose={() => {
                        if (!reuploadLoading) {
                            setReuploadModalOpen(false);
                            setReuploadData({ studentId: null, testNum: null });
                            setReuploadFile(null);
                        }
                    }}
                    title="Re-upload Student Responses"
                    maxWidth="max-w-lg"
                >
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <FileText className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                            <div>
                                <p className="text-sm text-foreground">
                                    Re-upload responses for <strong>{reuploadData.studentId}</strong> - Test <strong>{reuploadData.testNum}</strong>
                                </p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    This will:
                                </p>
                                <ul className="list-disc ml-5 text-sm text-muted-foreground mt-1">
                                    <li>Replace student responses in database</li>
                                    <li>Re-run student analysis with existing answer key</li>
                                    <li>Regenerate Neo4j knowledge graph</li>
                                    <li>Update student dashboard (Overview, Performance, SWOT)</li>
                                </ul>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Upload Response CSV
                            </label>
                            <Input
                                type="file"
                                accept=".csv"
                                className="w-full"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setReuploadFile(e.target.files[0]);
                                    }
                                }}
                                disabled={reuploadLoading}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                CSV must contain this student's ID in the header row
                            </p>
                        </div>

                        {localError && (
                            <div className="p-3 rounded-md bg-red-50 border border-red-200">
                                <p className="text-sm text-red-700">{localError}</p>
                            </div>
                        )}

                        <div className="modal-action mt-4 flex flex-col sm:flex-row gap-2">
                            <Button
                                variant="default"
                                className="w-full sm:w-auto"
                                onClick={handleReupload}
                                disabled={!reuploadFile || reuploadLoading}
                            >
                                {reuploadLoading ? (
                                    <>
                                        <Loader className="w-4 h-4 mr-2 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    'Re-upload & Process'
                                )}
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full sm:w-auto"
                                onClick={() => {
                                    setReuploadModalOpen(false);
                                    setReuploadData({ studentId: null, testNum: null });
                                    setReuploadFile(null);
                                }}
                                disabled={reuploadLoading}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Delete Student Confirmation Modal */}
            <StudentDeleteModal
                open={deleteStudentModalOpen}
                onClose={() => setDeleteStudentModalOpen(false)}
                modalStudent={modalStudent}
                studentNameMap={studentNameMap}
                selectedEducatorId={selectedEducatorId}
                fetchResults={fetchResults}
                setDeleteSummary={setDeleteSummary}
                setError={setError}
                setModalStudent={setModalStudent}
            />
        </>
    );
}

export default StudentMoreDetails;
