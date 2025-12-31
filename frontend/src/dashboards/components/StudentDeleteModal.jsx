import React from 'react';
import { deleteInstitutionStudent } from '../../utils/api';
import toast from 'react-hot-toast';
import {
    Loader,
    AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/button.jsx';
import Modal from './ui/modal.jsx';

function StudentDeleteModal({
    open,
    onClose,
    modalStudent,
    studentNameMap,
    selectedEducatorId,
    fetchResults,
    setDeleteSummary,
    setError,
    setModalStudent,
}) {
    const [loading, setLoading] = React.useState(false);

    const confirmDelete = async () => {
        try {
            setLoading(true);
            const res = await deleteInstitutionStudent(selectedEducatorId, modalStudent.student_id);
            if (res.error) {
                setError(res.error);
                toast.error(res.error);
            } else {
                // Save deletion summary to show to the user
                setDeleteSummary({ message: res.message || 'Deleted', counts: res.deleted_counts || {} });
                toast.success('Student deleted successfully');
                await fetchResults();
                setModalStudent(null);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to delete student');
            toast.error('Failed to delete student');
        } finally {
            setLoading(false);
            onClose();
        }
    };

    if (!modalStudent) return null;

    return (
        <Modal
            open={open}
            onClose={() => {
                if (!loading) {
                    onClose();
                }
            }}
            title="Delete Student"
            maxWidth="max-w-md"
        >
            <div className="space-y-4">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                    <div>
                        <p className="text-sm text-gray-700">
                            Are you sure you want to delete <strong>{studentNameMap[modalStudent.student_id] || modalStudent.student_name}</strong> (ID: <strong>{modalStudent.student_id}</strong>)?
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                            This will permanently delete:
                        </p>
                        <ul className="list-disc ml-5 text-sm text-gray-600 mt-1">
                            <li>Student profile and all personal data</li>
                            <li>All test results and responses</li>
                            <li>All SWOT analysis and insights</li>
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
                        onClick={confirmDelete}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader className="w-4 h-4 mr-2 animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            'Delete Student'
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full sm:w-auto"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

export default StudentDeleteModal;
