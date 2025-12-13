import React, { useState, useEffect, useCallback } from 'react';
import { fetchInstitutionEducatorAllStudentResults, createInstitutionStudent, updateInstitutionStudent, deleteInstitutionStudent, createTeacher, getTeachersByClass, updateTeacher, deleteTeacher } from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Search,
  Loader,
  AlertCircle,
  Frown,
  X,
  BarChart2,
  FileText,
  Sliders,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  Trash2,
  Edit
} from 'lucide-react';
import Table from '../components/ui/table.jsx';
import { Button } from '../../components/ui/button.jsx';
import { Input } from '../../components/ui/input.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select.jsx';
import { Card, CardHeader, CardContent } from '../../components/ui/card.jsx';
import Modal from '../components/ui/modal.jsx';
import LoadingPage from '../components/LoadingPage.jsx';
import { useInstitution } from './index.jsx';

function IStudentDetails() {
  const { selectedEducatorId, educators } = useInstitution();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupedResults, setGroupedResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalStudent, setModalStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', dob: '', password: '' });
  const [studentNameMap, setStudentNameMap] = useState({});
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [deleteSummary, setDeleteSummary] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({ class_id: '', student_id: '', name: '', dob: '' });
  const [sortField, setSortField] = useState('rank');
  const [sortDirection, setSortDirection] = useState('desc');
  const navigate = useNavigate();

  // Subject-wise educator mappings for the selected batch (right-side panel)
  const [subjectEducators, setSubjectEducators] = useState([]); // { id, subject, educator }
  const [subjModalOpen, setSubjModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjForm, setSubjForm] = useState({ subject: '', educator: '', email: '', phone_number: '', test_range: '' });
  const [classIdForTeachers, setClassIdForTeachers] = useState(null);

  const fetchResults = useCallback(async () => {
    if (!selectedEducatorId) return;
    setLoading(true);
    setError(null);

    try {
      const results = await fetchInstitutionEducatorAllStudentResults(selectedEducatorId);

      if (results && !results.error) {
        if (Array.isArray(results.results)) {
          const grouped = groupResultsByStudent(results.results);
          setGroupedResults(grouped);
        } else {
          console.error("Unexpected results shape:", results);
          setError("Unexpected response structure from API.");
        }
      } else {
        console.error("Failed to fetch student results:", results?.error);
        setError(results?.error || 'An unknown error occurred.');
      }
    } catch (err) {
      console.error("Error fetching results:", err);
      setError('Failed to fetch student results. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedEducatorId]);

  // Show a short summary box after deletion with counts returned by backend
  const renderDeleteSummary = () => {
    if (!deleteSummary) return null;
    const { message, counts } = deleteSummary;
    return (
      <div className="mb-4 p-4 rounded-md bg-green-50 border border-green-200">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-semibold">{message}</p>
            <div className="text-sm text-gray-700 mt-2">
              {Object.keys(counts).length === 0 ? (
                <span>No related records were found.</span>
              ) : (
                <ul className="list-disc ml-5">
                  {Object.entries(counts).map(([k, v]) => (
                    <li key={k}>{k}: {v}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div>
            <Button variant="ghost" onClick={() => setDeleteSummary(null)}>Dismiss</Button>
          </div>
        </div>
      </div>
    );
  };

  // Note: we no longer fetch students here to obtain class_id or names.
  // The institution context provides educator information (including `class_id`).
  // Keep `studentNameMap` empty by default; modal will fall back to `modalStudent.student_name`.

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Fetch teachers using class_id from selected educator
  useEffect(() => {
    if (!selectedEducatorId) {
      setSubjectEducators([]);
      setClassIdForTeachers(null);
      return;
    }

    const fetchTeachers = async () => {
      try {
        // Get class_id from the selected educator in context
        const selectedEducator = educators.find(e => e.id === selectedEducatorId);

        if (!selectedEducator || !selectedEducator.class_id) {
          console.warn('No class_id found for selected educator');
          setClassIdForTeachers(null);
          setSubjectEducators([]);
          return;
        }

        const classId = selectedEducator.class_id;
        setClassIdForTeachers(classId);

        // Fetch teachers for this class
        const teachersRes = await getTeachersByClass(classId);
        if (teachersRes && teachersRes.success && Array.isArray(teachersRes.data)) {
          setSubjectEducators(teachersRes.data);
        } else {
          // No teachers yet, initialize empty
          setSubjectEducators([]);
        }
      } catch (err) {
        console.error('Error fetching teachers:', err);
        toast.error('Failed to load teachers');
      }
    };

    fetchTeachers();
  }, [selectedEducatorId, educators]);

  const groupResultsByStudent = (results) => {
    const grouped = {};

    results.forEach(result => {
      const sid = result.student_id;
      if (!grouped[sid]) {
        grouped[sid] = {
          student_id: sid,
          student_name: result.student_name || `Student ${sid}`,
          test_results: [],
          total_score: 0,
          tests_taken: 0,
          average_score: 0,
        };
      }
      grouped[sid].test_results.push(result);
      grouped[sid].total_score += result.total_score || 0;
      grouped[sid].tests_taken += 1;
      grouped[sid].average_score = Math.round(grouped[sid].total_score / grouped[sid].tests_taken);
    });

    return Object.values(grouped).sort((a, b) => b.average_score - a.average_score);
  };

  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  const getSortValue = (student, field) => {
    switch (field) {
      case 'student_id':
        return student.student_id;
      case 'student_name':
        return studentNameMap[student.student_id] || student.student_name;
      case 'average_score':
        return student.average_score;
      case 'rank':
      default:
        return null;
    }
  };
  const sortedResults = [...groupedResults]
    .filter(student =>
      student.student_id.toString().includes(searchTerm) ||
      (studentNameMap[student.student_id] || student.student_name).toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortField === 'rank') {
        return sortDirection === 'asc' ? a.average_score - b.average_score : b.average_score - a.average_score;
      }
      const aVal = getSortValue(a, sortField);
      const bVal = getSortValue(b, sortField);
      if (sortField === 'average_score') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      if (sortField === 'student_id') {
        return sortDirection === 'asc'
          ? aVal.toString().localeCompare(bVal.toString(), 'en', { numeric: true })
          : bVal.toString().localeCompare(aVal.toString(), 'en', { numeric: true });
      }
      if (sortField === 'student_name') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return 0;
    });

  const rankMap = (() => {
    const sortedByAvg = [...groupedResults]
      .filter(student =>
        student.student_id.toString().includes(searchTerm) ||
        (studentNameMap[student.student_id] || student.student_name).toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.average_score - a.average_score);
    const map = {};
    sortedByAvg.forEach((student, idx) => {
      map[student.student_id] = idx + 1;
    });
    return map;
  })();

  if (!selectedEducatorId) {
    return <div className="text-center py-8 mt-20">Please select an educator to view their students.</div>;
  }

  if (loading) {
    return (
      <div className="relative min-h-screen">
        <LoadingPage fixed={false} className="bg-white/80 dark:bg-gray-900/80 z-10" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <div className="alert alert-error max-w-md shadow-lg">
          <AlertCircle className="stroke-current shrink-0 h-6 w-6" />
          <div>
            <h3 className="font-bold">Error!</h3>
            <div className="text-xs">{error}</div>
          </div>
        </div>
        <Button
          onClick={fetchResults}
          className="mt-4"
          variant="default"
        >
          Retry
        </Button>
      </div>
    );
  }

  const columns = [
    { field: 'rank', label: 'Rank', sortable: true },
    { field: 'student_id', label: 'Student ID', sortable: true },
    { field: 'student_name', label: 'Student Name', sortable: true },
    { field: 'tests_taken', label: 'No of test attended', sortable: false },
    { field: 'average_score', label: 'Average score', sortable: true },
  ];

  const renderRow = (student) => (
    <tr
      key={student.student_id}
      className="hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={() => setModalStudent(student)}>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{rankMap[student.student_id]}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.student_id}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{studentNameMap[student.student_id] || student.student_name}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.tests_taken}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.average_score}</td>
    </tr>
  );

  return (
    <div className="sm:pt-4 w-full mx-auto px-4 sm:px-6 lg:px-0">
      <div className="flex flex-col lg:flex-row gap-6 mt-8">
        <div className="flex-1">
          <Card className="rounded-2xl border border-gray-250 bg-white w-full p-8">
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-800">Student Results</h1>
                <span className="badge badge-lg border-transparent bg-blue-50 text-sm text-blue-700">
                  {groupedResults.length} {groupedResults.length === 1 ? 'Student' : 'Students'}
                </span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="w-full sm:w-96 flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="text"
                      placeholder="Search by ID or name..."
                      className="input input-bordered w-full pl-10 pr-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                    {searchTerm && (
                      <button
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Button variant="outline" className="flex items-center gap-2" onClick={() => setSortModalOpen(true)}>
                    <Sliders className="w-5 h-5" />
                    <span>Sort</span>
                  </Button>
                  <Button className="flex items-center gap-2 w-full sm:w-auto" onClick={() => { setCreateModalOpen(true); setNewStudent({ class_id: '', student_id: '', name: '', dob: '' }); }}>
                    <span>Add Student</span>
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {renderDeleteSummary()}

              <div>
                {sortedResults.length > 0 ? (
                  <>
                    <div className="sm:hidden space-y-3">
                      {sortedResults.map(student => (
                        <div
                          key={student.student_id}
                          className="p-4 border rounded-lg shadow-sm hover:bg-gray-50"
                          onClick={() => setModalStudent(student)}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{studentNameMap[student.student_id] || student.student_name}</div>
                              <div className="text-sm text-gray-500">ID: {student.student_id}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500">Avg</div>
                              <div className="font-medium">{student.average_score}</div>
                            </div>
                          </div>
                          <div className="mt-2 flex justify-between text-sm text-gray-600">
                            <div>Tests: {student.tests_taken}</div>
                            <div>Rank: {rankMap[student.student_id]}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="hidden sm:block overflow-x-auto">
                      <Table
                        columns={columns}
                        data={sortedResults}
                        sortField={sortField}
                        sortDirection={sortDirection}
                        onSort={field => {
                          if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                          setSortField(field);
                        }}
                        renderRow={renderRow}
                        emptyState={
                          <div className="p-8 text-center">
                            <Frown className="h-12 w-12 mx-auto text-gray-400" />
                            <h3 className="mt-2 text-lg font-medium text-gray-900">No results found</h3>
                            <p className="mt-1 text-sm text-gray-500">
                              {searchTerm ? 'Try a different search term' : 'No student results available'}
                            </p>
                            {searchTerm && (
                              <Button onClick={clearSearch} className="mt-4" variant="ghost">Clear search</Button>
                            )}
                          </div>
                        }
                      />
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center">
                    <Frown className="h-12 w-12 mx-auto text-gray-400" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">No results found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm ? 'Try a different search term' : 'No student results available'}
                    </p>
                    {searchTerm && (
                      <Button onClick={clearSearch} className="mt-4" variant="ghost">Clear search</Button>
                    )}
                  </div>
                )}
              </div>

              <Modal
                open={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                title={'Create Student'}
                maxWidth="max-w-lg"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Class ID</label>
                    <Input
                      className="input input-bordered w-full"
                      value={newStudent.class_id}
                      placeholder="Optional: class id (will default to educator's class)"
                      onChange={e => setNewStudent(prev => ({ ...prev, class_id: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Student ID</label>
                    <Input
                      className="input input-bordered w-full"
                      value={newStudent.student_id}
                      onChange={e => setNewStudent(prev => ({ ...prev, student_id: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <Input
                      className="input input-bordered w-full"
                      value={newStudent.name}
                      onChange={e => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">DOB</label>
                    <Input
                      type="date"
                      className="input input-bordered w-full"
                      value={newStudent.dob}
                      onChange={e => setNewStudent(prev => ({ ...prev, dob: e.target.value }))}
                    />
                  </div>
                  <div className="modal-action mt-4 flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="default"
                      className="w-full sm:w-auto"
                      onClick={async () => {
                        setError(null);
                        try {
                          // Validate required fields
                          if (!newStudent.student_id || !newStudent.name || !newStudent.dob) {
                            setError('student_id, name and dob are required');
                            return;
                          }
                          const payload = { student_id: newStudent.student_id.trim(), name: newStudent.name.trim(), dob: newStudent.dob };
                          if (newStudent.class_id && newStudent.class_id.trim() !== '') payload.class_id = newStudent.class_id.trim();
                          const res = await createInstitutionStudent(selectedEducatorId, payload);
                          if (res.error) {
                            setError(res.error);
                          } else {
                            setDeleteSummary({ message: res.message || 'Student created', counts: {} });
                            await fetchResults();
                            setCreateModalOpen(false);
                          }
                        } catch (err) {
                          console.error(err);
                          setError('Failed to create student');
                        }
                      }}
                    >
                      Create
                    </Button>
                    <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
                  </div>
                </div>
              </Modal>

              {/* Modal for adding/editing subject-educator entries */}
              <Modal
                open={subjModalOpen}
                onClose={() => setSubjModalOpen(false)}
                title={editingSubject ? 'Edit Subject Educator' : 'Add Subject Educator'}
                maxWidth="max-w-md"
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subject</label>
                    <Select value={subjForm.subject} onValueChange={(value) => setSubjForm(prev => ({ ...prev, subject: value }))}>
                      <SelectTrigger className="w-full text-start">
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Physics">Physics</SelectItem>
                        <SelectItem value="Chemistry">Chemistry</SelectItem>
                        <SelectItem value="Botany">Botany</SelectItem>
                        <SelectItem value="Zoology">Zoology</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Educator Name</label>
                    <Input className="input input-bordered w-full" value={subjForm.educator} onChange={e => setSubjForm(prev => ({ ...prev, educator: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email (Optional)</label>
                    <Input
                      type="email"
                      className="input input-bordered w-full"
                      placeholder="teacher@example.com"
                      value={subjForm.email}
                      onChange={e => setSubjForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone Number (Optional)</label>
                    <Input
                      type="tel"
                      className="input input-bordered w-full"
                      placeholder="+1234567890"
                      value={subjForm.phone_number}
                      onChange={e => setSubjForm(prev => ({ ...prev, phone_number: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Test Range (Optional)</label>
                    <Input
                      type="text"
                      className="input input-bordered w-full"
                      placeholder="e.g., 1,2,3 or 1-5"
                      value={subjForm.test_range}
                      onChange={e => setSubjForm(prev => ({ ...prev, test_range: e.target.value }))}
                    />
                    <p className="text-xs text-gray-500 mt-1">Specify which tests this teacher handled (e.g., "1,2,3" or "1-5")</p>
                  </div>
                  <div className="modal-action mt-4 flex flex-col sm:flex-row gap-2">
                    <Button variant="default" className="w-full sm:w-auto" onClick={async () => {
                      if (!subjForm.subject || !subjForm.educator) {
                        toast.error('Subject and Educator Name are required');
                        return;
                      }

                      if (!classIdForTeachers) {
                        toast.error('Class ID not available. Please add students first.');
                        return;
                      }

                      try {
                        if (editingSubject && !editingSubject.id.toString().startsWith('temp-')) {
                          // Update existing teacher
                          const updates = {
                            subject: subjForm.subject,
                            teacher_name: subjForm.educator,
                            email: subjForm.email?.trim() || null,
                            phone_number: subjForm.phone_number?.trim() || null,
                            test_range: subjForm.test_range?.trim() || null
                          };
                          const response = await updateTeacher(editingSubject.id, updates);
                          if (response.success) {
                            toast.success('Teacher updated successfully');
                            // Refresh list
                            const teachersRes = await getTeachersByClass(classIdForTeachers);
                            if (teachersRes && teachersRes.success) {
                              setSubjectEducators(teachersRes.data);
                            }
                          }
                        } else {
                          // Create new teacher
                          const payload = {
                            class_id: classIdForTeachers,
                            subject: subjForm.subject,
                            teacher_name: subjForm.educator,
                            email: subjForm.email?.trim() || null,
                            phone_number: subjForm.phone_number?.trim() || null,
                            test_range: subjForm.test_range?.trim() || null
                          };
                          const response = await createTeacher(payload);
                          if (response.success) {
                            toast.success('Teacher added successfully');
                            // Refresh list
                            const teachersRes = await getTeachersByClass(classIdForTeachers);
                            if (teachersRes && teachersRes.success) {
                              setSubjectEducators(teachersRes.data);
                            }
                          }
                        }
                        setSubjModalOpen(false);
                      } catch (err) {
                        console.error('Error saving teacher:', err);
                        toast.error(err.response?.data?.error || 'Failed to save teacher');
                      }
                    }}>
                      Save
                    </Button>
                    <Button variant="ghost" onClick={() => setSubjModalOpen(false)}>Cancel</Button>
                  </div>
                </div>
              </Modal>

              <Modal
                open={!!modalStudent}
                onClose={() => setModalStudent(null)}
                title={modalStudent ? (
                  <>
                    {studentNameMap[modalStudent.student_id] || modalStudent.student_name}
                    <span className="text-xs text-gray-400 ml-2">(ID: {modalStudent.student_id})</span>
                  </>
                ) : ''}
                maxWidth="max-w-3xl"
              >
                {modalStudent && (
                  <>
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Name</label>
                          <Input
                            className="input input-bordered w-full"
                            value={editForm.name}
                            onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">DOB</label>
                          <Input
                            type="date"
                            className="input input-bordered w-full"
                            value={editForm.dob}
                            onChange={e => setEditForm(prev => ({ ...prev, dob: e.target.value }))}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Password</label>
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
                      <div>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4">
                          <div className="flex items-center gap-2">
                            <FileText className="text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-500">Tests</p>
                              <p className="font-medium">{modalStudent.tests_taken}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <BarChart2 className="text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-500">Average</p>
                              <p className="font-medium">{modalStudent.average_score}</p>
                            </div>
                          </div>
                        </div>

                        <h4 className="text-md font-semibold text-gray-800 mb-2">Test Performance</h4>
                        <div className="overflow-x-auto">
                          <table className="table table-zebra table-sm">
                            <thead>
                              <tr>
                                <th>Test #</th>
                                <th>Total Score</th>
                                <th>Physics</th>
                                <th>Chemistry</th>
                                <th>Biology</th>
                                <th>Botany</th>
                                <th>Zoology</th>
                                <th>Accuracy</th>
                              </tr>
                            </thead>
                            <tbody>
                              {modalStudent.test_results.map((test, index) => (
                                <tr key={index}>
                                  <td>{test.test_num}</td>
                                  <td className="font-medium">{test.total_score}</td>
                                  <td>{test.phy_score || "-"}</td>
                                  <td>{test.chem_score || "-"}</td>
                                  <td>{test.bio_score || "-"}</td>
                                  <td>{test.bot_score || "-"}</td>
                                  <td>{test.zoo_score || "-"}</td>
                                  <td>
                                    {test.total_attended ? Math.round((test.total_correct / test.total_attended) * 100) + '%' : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div className="modal-action mt-6 flex justify-between">
                      {isEditing ? (
                        <>
                          <div className="flex gap-2">
                            <Button
                              variant="default"
                              onClick={async () => {
                                try {
                                  // Build payload with only non-empty fields (all fields are optional)
                                  const payload = {};
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
                                    // Refresh and close edit mode
                                    await fetchResults();
                                    setIsEditing(false);
                                    setModalStudent(null);
                                  }
                                } catch (err) {
                                  console.error(err);
                                  setError('Failed to update student');
                                }
                              }}
                            >
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
                              variant="ghost"
                              size="icon"
                              className="text-red-600 rounded-full hover:bg-red-100 hover:text-red-700"
                              onClick={async () => {
                                if (!window.confirm('Delete this student and all related data?')) return;
                                try {
                                  const res = await deleteInstitutionStudent(selectedEducatorId, modalStudent.student_id);
                                  if (res.error) {
                                    setError(res.error);
                                  } else {
                                    // Save deletion summary to show to the user
                                    setDeleteSummary({ message: res.message || 'Deleted', counts: res.deleted_counts || {} });
                                    await fetchResults();
                                    setModalStudent(null);
                                  }
                                } catch (err) {
                                  console.error(err);
                                  setError('Failed to delete student');
                                }
                              }}
                              aria-label="Delete student"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full"
                              onClick={() => {
                                setIsEditing(true);
                                setEditForm({ name: modalStudent.student_name || '', dob: modalStudent.dob || '', password: '' });
                              }}
                              aria-label="Edit student"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                          <Button variant="ghost" onClick={() => setModalStudent(null)}>Close</Button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </Modal>

              {sortModalOpen && (
                <Modal
                  open={sortModalOpen}
                  onClose={() => setSortModalOpen(false)}
                  title={'Sort'}
                  maxWidth="max-w-md"
                >
                  <p className="text-sm text-gray-500 mb-4">Choose how the student list should be ordered.</p>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sort Options</label>
                    <div className="flex flex-col gap-2">
                      {/* 1. Rank - Top to Least */}
                      <Button
                        variant={(sortField === 'rank' && sortDirection === 'desc') ? 'outline' : 'ghost'}
                        className="justify-between"
                        onClick={() => { setSortField('rank'); setSortDirection('desc'); }}
                      >
                        <span className="flex items-center gap-2"><ArrowDown className="w-4 h-4" />Rank — Highest to Lowest</span>
                        {(sortField === 'rank' && sortDirection === 'desc') ? <CheckCircle className="w-5 h-5 text-blue-600" /> : <CheckCircle className="w-5 h-5 opacity-20" />}
                      </Button>

                      {/* 2. Rank - Least to top */}
                      <Button
                        variant={(sortField === 'rank' && sortDirection === 'asc') ? 'outline' : 'ghost'}
                        className="justify-between"
                        onClick={() => { setSortField('rank'); setSortDirection('asc'); }}
                      >
                        <span className="flex items-center gap-2"><ArrowUp className="w-4 h-4" />Rank — Lowest to Highest</span>
                        {(sortField === 'rank' && sortDirection === 'asc') ? <CheckCircle className="w-5 h-5 text-blue-600" /> : <CheckCircle className="w-5 h-5 opacity-20" />}
                      </Button>

                      {/* 3. Student ID - Ascending */}
                      <Button
                        variant={(sortField === 'student_id' && sortDirection === 'asc') ? 'outline' : 'ghost'}
                        className="justify-between"
                        onClick={() => { setSortField('student_id'); setSortDirection('asc'); }}
                      >
                        <span className="flex items-center gap-2"><ArrowUp className="w-4 h-4" />Student ID — Low to High</span>
                        {(sortField === 'student_id' && sortDirection === 'asc') ? <CheckCircle className="w-5 h-5 text-blue-600" /> : <CheckCircle className="w-5 h-5 opacity-20" />}
                      </Button>

                      {/* 4. Student ID - Descending */}
                      <Button
                        variant={(sortField === 'student_id' && sortDirection === 'desc') ? 'outline' : 'ghost'}
                        className="justify-between"
                        onClick={() => { setSortField('student_id'); setSortDirection('desc'); }}
                      >
                        <span className="flex items-center gap-2"><ArrowDown className="w-4 h-4" />Student ID — High to Low</span>
                        {(sortField === 'student_id' && sortDirection === 'desc') ? <CheckCircle className="w-5 h-5 text-blue-600" /> : <CheckCircle className="w-5 h-5 opacity-20" />}
                      </Button>

                      {/* 5. Name - Ascending */}
                      <Button
                        variant={(sortField === 'student_name' && sortDirection === 'asc') ? 'outline' : 'ghost'}
                        className="justify-between"
                        onClick={() => { setSortField('student_name'); setSortDirection('asc'); }}
                      >
                        <span className="flex items-center gap-2"><ArrowUp className="w-4 h-4" />Name — A to Z</span>
                        {(sortField === 'student_name' && sortDirection === 'asc') ? <CheckCircle className="w-5 h-5 text-blue-600" /> : <CheckCircle className="w-5 h-5 opacity-20" />}
                      </Button>

                      {/* 6. Name - Descending */}
                      <Button
                        variant={(sortField === 'student_name' && sortDirection === 'desc') ? 'outline' : 'ghost'}
                        className="justify-between"
                        onClick={() => { setSortField('student_name'); setSortDirection('desc'); }}
                      >
                        <span className="flex items-center gap-2"><ArrowDown className="w-4 h-4" />Name — Z to A</span>
                        {(sortField === 'student_name' && sortDirection === 'desc') ? <CheckCircle className="w-5 h-5 text-blue-600" /> : <CheckCircle className="w-5 h-5 opacity-20" />}
                      </Button>
                    </div>
                  </div>

                  <div className="modal-action mt-4 flex flex-col sm:flex-row gap-2">
                    <Button variant="default" className="w-full sm:w-auto" onClick={() => setSortModalOpen(false)}>Apply</Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSortField('rank');
                        setSortDirection('desc');
                        setSortModalOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </Modal>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right-side panel moved outside card */}
        <aside className="w-full lg:w-80 pl-0 lg:pl-6 card bg-white border border-gray-250 rounded-2xl p-6 h-fit mt-6 lg:mt-0 lg:sticky lg:top-8 self-start">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Class Educators</h3>
            <Button size="sm" onClick={() => { setEditingSubject(null); setSubjForm({ subject: '', educator: '', email: '', phone_number: '', test_range: '' }); setSubjModalOpen(true); }}>Add</Button>
          </div>

          <div className="space-y-3">
            {subjectEducators.length === 0 && (
              <p className="text-sm text-gray-500">No subject mappings for this batch.</p>
            )}

            {subjectEducators.map((s) => (
              <div key={s.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">{s.subject}</div>
                  <div className="text-sm text-gray-500 truncate">{s.teacher_name || s.educator || <span className="italic">Unassigned</span>}</div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => {
                    setEditingSubject(s);
                    setSubjForm({
                      subject: s.subject,
                      educator: s.teacher_name || s.educator || '',
                      email: s.email || '',
                      phone_number: s.phone_number || '',
                      test_range: s.test_range || ''
                    });
                    setSubjModalOpen(true);
                  }} aria-label="Edit subject">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-red-600" onClick={async () => {
                    if (!s.id.toString().startsWith('temp-')) {
                      try {
                        const response = await deleteTeacher(s.id);
                        if (response.success) {
                          toast.success('Teacher deleted successfully');
                          // Refresh list
                          if (classIdForTeachers) {
                            const teachersRes = await getTeachersByClass(classIdForTeachers);
                            if (teachersRes && teachersRes.success) {
                              setSubjectEducators(teachersRes.data);
                            }
                          }
                        }
                      } catch (err) {
                        console.error('Error deleting teacher:', err);
                        toast.error('Failed to delete teacher');
                      }
                    } else {
                      // Just remove from local state for temp items
                      setSubjectEducators(prev => prev.filter(x => x.id !== s.id));
                    }
                  }} aria-label="Delete subject">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default IStudentDetails;
