import React, { useState, useEffect, useCallback } from 'react';
import { fetchInstitutionEducatorAllStudentResults, fetchInstitutionEducatorStudents, createInstitutionStudent, deleteInstitutionStudent, createTeacher, getTeachersByClass, updateTeacher, deleteTeacher } from '../../utils/api';
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
  Edit,
  MoreHorizontal
} from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../components/ui/dropdown-menu.jsx';
import Table from '../components/ui/table.jsx';
import { Button } from '../../components/ui/button.jsx';
import { Input } from '../../components/ui/input.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select.jsx';
import { Card, CardHeader, CardContent } from '../../components/ui/card.jsx';
import Modal from '../components/ui/modal.jsx';
import LoadingPage from '../components/LoadingPage.jsx';
import { useInstitution } from './index.jsx';
import StudentMoreDetails from '../components/StudentMoreDetails.jsx';
import StudentDeleteModal from '../components/StudentDeleteModal.jsx';

const SUBJECTS = [
  { key: 'phy_score', label: 'Physics' },
  { key: 'chem_score', label: 'Chemistry' },
  { key: 'bio_score', label: 'Biology' },
  { key: 'bot_score', label: 'Botany' },
  { key: 'zoo_score', label: 'Zoology' },
];

function IStudentDetails() {
  const { selectedEducatorId, setSelectedEducatorId, educators } = useInstitution();
  const sortedEducators = React.useMemo(() => {
    if (!Array.isArray(educators)) return [];
    return [...educators].sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
  }, [educators]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupedResults, setGroupedResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalStudent, setModalStudent] = useState(null);
  const [initialEditMode, setInitialEditMode] = useState(false);
  const [initialDeleteMode, setInitialDeleteMode] = useState(false);
  const [studentNameMap, setStudentNameMap] = useState({});
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [deleteSummary, setDeleteSummary] = useState(null);
  const [deleteStudentModalOpen, setDeleteStudentModalOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({ student_id: '', name: '', dob: '' });
  const [sortField, setSortField] = useState('rank');
  const [sortDirection, setSortDirection] = useState('desc');
  const selectedClassName = React.useMemo(() => {
    if (!Array.isArray(educators)) return 'Student Results';
    const found = educators.find(e => String(e.id) === String(selectedEducatorId));
    return found && found.name ? found.name : 'Student Results';
  }, [educators, selectedEducatorId]);

  // Subject-wise educator mappings for the selected batch (right-side panel)
  const [subjectEducators, setSubjectEducators] = useState([]); // { id, subject, educator }
  const [subjModalOpen, setSubjModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjForm, setSubjForm] = useState({ subject: '', educator: '', email: '', phone_number: '', test_range: '' });
  const [classIdForTeachers, setClassIdForTeachers] = useState(null);
  const [availableSubjects, setAvailableSubjects] = useState([]);

  const fetchResults = useCallback(async () => {
    if (!selectedEducatorId) return;
    setLoading(true);
    setError(null);

    try {
      const results = await fetchInstitutionEducatorAllStudentResults(selectedEducatorId);

      if (results && !results.error) {
        if (Array.isArray(results.results)) {
          let grouped = groupResultsByStudent(results.results);

          // Also fetch known students for this educator and include any students
          // who have no test results so they still appear in the list.
          try {
            const studentsRes = await fetchInstitutionEducatorStudents(selectedEducatorId);
            let students = [];
            if (!studentsRes) students = [];
            else if (Array.isArray(studentsRes)) students = studentsRes;
            else if (Array.isArray(studentsRes.students)) students = studentsRes.students;
            else if (Array.isArray(studentsRes.data)) students = studentsRes.data;

            const existingIds = new Set(grouped.map(g => String(g.student_id)));
            students.forEach(s => {
              const id = s.student_id ?? s.studentId ?? s.id;
              const name = s.student_name ?? s.name ?? s.full_name ?? '';
              if (!id) return;
              if (!existingIds.has(String(id))) {
                const displayName = name && String(name).trim() !== '' ? String(name).trim() : `Student ${id}`;
                grouped.push({
                  student_id: id,
                  student_name: displayName,
                  test_results: [],
                  total_score: 0,
                  tests_taken: 0,
                  average_score: 0,
                });
                // Ensure studentNameMap contains this name so UI shows it immediately
                setStudentNameMap(prev => ({ ...prev, [id]: displayName }));
              }
            });
          } catch (err) {
            console.warn('Could not fetch students to merge with results:', err);
          }

          // Sort final list by average score (students without results will be at the bottom)
          grouped = grouped.sort((a, b) => b.average_score - a.average_score);
          setGroupedResults(grouped);

          // Compute available subjects based on data
          const availableSubjects = SUBJECTS.filter(sub =>
            results.results.some(result => {
              const val = result[sub.key];
              return val != null && val !== undefined && val !== '' && val !== 0;
            })
          );
          setAvailableSubjects(availableSubjects);
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

  // Load student names for selected educator and populate studentNameMap
  useEffect(() => {
    if (!selectedEducatorId) {
      setStudentNameMap({});
      return;
    }

    let cancelled = false;
    const loadStudentNames = async () => {
      try {
        const res = await fetchInstitutionEducatorStudents(selectedEducatorId);

        let students = [];
        if (!res) students = [];
        else if (Array.isArray(res)) students = res;
        else if (Array.isArray(res.students)) students = res.students;
        else if (Array.isArray(res.data)) students = res.data;
        else students = [];

        const map = {};
        students.forEach((s) => {
          const id = s.student_id ?? s.studentId ?? s.id;
          const name = s.student_name ?? s.name ?? s.full_name ?? '';
          if (id) map[id] = name && String(name).trim() !== '' ? String(name).trim() : `Student ${id}`;
        });

        if (!cancelled) setStudentNameMap(map);
      } catch (err) {
        console.error('Failed to load student names:', err);
      }
    };

    loadStudentNames();
    return () => { cancelled = true; };
  }, [selectedEducatorId]);

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

  // Get the highest test_num conducted across all students
  const lastTestNum = React.useMemo(() => {
    let maxTestNum = 0;
    groupedResults.forEach(student => {
      if (Array.isArray(student.test_results)) {
        student.test_results.forEach(test => {
          if (test.test_num > maxTestNum) {
            maxTestNum = test.test_num;
          }
        });
      }
    });
    return maxTestNum;
  }, [groupedResults]);

  if (!selectedEducatorId) {
    return (
      <div className="text-center py-8 mt-20">
        <div className="flex items-center justify-center mb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Classroom:</span>
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
        <div>Please select an educator to view their students.</div>
      </div>
    );
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

  const educatorColumns = [
    { field: 'subject', label: 'Subject', sortable: false },
    { field: 'educator', label: 'Name', sortable: false },
    { field: 'phone_number', label: 'Phone Number', sortable: false },
    { field: 'actions', label: 'Actions', sortable: false, headerClass: 'justify-end' },
  ];

  const educatorRows = availableSubjects.map((sub) => {
    const entry = (subjectEducators || []).find(s => String(s.subject).toLowerCase() === String(sub.label).toLowerCase());
    const name = entry ? (entry.teacher_name || entry.educator || 'Not assigned') : 'Not assigned';
    const phone = entry ? (entry.phone_number || 'N/A') : 'N/A';
    return { subject: sub.label, name, phone, entry };
  });

  const columns = [
    { field: 'rank', label: 'Rank', sortable: true },
    { field: 'student_id', label: 'Student ID', sortable: true },
    { field: 'student_name', label: 'Student Name', sortable: true },
    { field: 'last_test_score', label: `Last test score (Test ${lastTestNum})`, sortable: false },
    { field: 'average_score', label: 'Average score', sortable: true },
    { field: 'actions', label: 'Actions', sortable: false, headerClass: 'justify-end' },
  ];

  const handleDeleteStudent = async (student) => {
    setStudentToDelete(student);
    setDeleteStudentModalOpen(true);
  };

  const handleDeleteEducator = async (entry) => {
    if (!entry || !entry.id) {
      toast.error('No educator assigned to delete');
      return;
    }
    if (!window.confirm(`Delete teacher for ${entry.subject}?`)) return;
    try {
      const res = await deleteTeacher(entry.id);
      if (res && res.success) {
        toast.success('Teacher deleted successfully');
        if (classIdForTeachers) {
          const teachersRes = await getTeachersByClass(classIdForTeachers);
          if (teachersRes && teachersRes.success) setSubjectEducators(teachersRes.data);
        }
      } else {
        toast.error(res?.error || 'Failed to delete teacher');
      }
    } catch (err) {
      console.error('Error deleting teacher:', err);
      toast.error('Failed to delete teacher');
    }
  };

  const renderEducatorRow = (row) => (
    <tr key={row.subject}>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{row.subject}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.name}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.phone}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
        <div className="flex items-center justify-end gap-2">
          {row.entry ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" aria-label="More">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent sideOffset={6} align="end">
                <DropdownMenuItem onClick={() => {
                  setEditingSubject(row.entry);
                  setSubjForm({
                    subject: row.entry.subject,
                    educator: row.entry.teacher_name || row.entry.educator || '',
                    email: row.entry.email || '',
                    phone_number: row.entry.phone_number || '',
                    test_range: row.entry.test_range || ''
                  });
                  setSubjModalOpen(true);
                }}>Edit</DropdownMenuItem>
                <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteEducator(row.entry)}>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setEditingSubject(null);
                setSubjForm({ subject: row.subject, educator: '', email: '', phone_number: '', test_range: '' });
                setSubjModalOpen(true);
              }}
            >
              Assign educator
            </Button>
          )}
        </div>
      </td>
    </tr>
  );

  const renderRow = (student) => (
    <tr
      key={student.student_id}
      className="">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{rankMap[student.student_id]}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.student_id}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{studentNameMap[student.student_id] || student.student_name}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
        {(() => {
          if (lastTestNum === 0) {
            return 'Not attended';
          }
          // Find the student's result for the last test conducted
          const testResult = Array.isArray(student.test_results)
            ? student.test_results.find(test => test.test_num === lastTestNum)
            : null;
          return testResult && testResult.total_score !== undefined && testResult.total_score !== null
            ? testResult.total_score
            : 'Not attended';
        })()}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.average_score}</td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
        <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="More">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent sideOffset={6} align="end">
              <DropdownMenuItem onClick={() => { setInitialEditMode(false); setModalStudent(student); }}>View more</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setInitialEditMode(true); setModalStudent(student); }}>Edit</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteStudent(student)}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="sm:pt-16 w-full mx-auto px-4 sm:px-6 lg:px-0">
      <div className="hidden lg:flex lg:flex-row lg:items-center lg:justify-between mb-4 pb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-semibold text-gray-800">Classroom Details</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 min-w-max pl-1">Classroom</span>
          <Select value={selectedEducatorId ? String(selectedEducatorId) : ''} onValueChange={(v) => setSelectedEducatorId ? setSelectedEducatorId(v ? Number(v) : null) : null}>
            <SelectTrigger className="btn btn-sm justify-start truncate m-1 w-[220px] lg:w-auto text-start">
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
        </div>
      </div>

      <div className="lg:hidden">
        <div className="flex w-full bg-white px-3 border-b justify-between items-center rounded-xl">
          <div className="text-left py-3">
            <h1 className="text-3xl font-bold text-gray-800">{selectedClassName}</h1>
            <div className="mt-2">
              <Select value={selectedEducatorId ? String(selectedEducatorId) : ''} onValueChange={(v) => setSelectedEducatorId ? setSelectedEducatorId(v ? Number(v) : null) : null}>
                <SelectTrigger className="w-36">
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
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Card className="rounded-2xl border border-gray-250 bg-white w-full">
          <CardHeader className="flex flex-col sm:flex-row justify-start items-start sm:items-center gap-4 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-800">Class Educators</h1>
            </div>
          </CardHeader>

          <div className="overflow-x-auto p-8">
            <Table
              columns={educatorColumns}
              data={educatorRows}
              renderRow={renderEducatorRow}
            />
          </div>
        </Card>

        <div className="flex-1">
          <Card className="rounded-2xl border border-gray-250 bg-white w-full">
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-800">Class Students</h1>
                </div>
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
                  <Button className="flex items-center gap-2 w-full sm:w-auto" onClick={() => { setCreateModalOpen(true); setNewStudent({ student_id: '', name: '', dob: '' }); }}>
                    <span>Add Student</span>
                  </Button>
                </div>
              </div>
            </CardHeader>

            <div className="overflow-x-auto p-8">
              {renderDeleteSummary()}

              <div>
                {sortedResults.length > 0 ? (
                  <>
                    <div className="sm:hidden space-y-3">
                      {sortedResults.map(student => (
                        <div
                          key={student.student_id}
                          className="p-4 border rounded-lg shadow-sm hover:bg-gray-50"
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
                          <div className="mt-3 flex justify-end">
                            <Button variant="ghost" size="sm" onClick={() => setModalStudent(student)}>View more</Button>
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
                  {/* Class is selected from the educator context; no class_id input needed */}
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
                          const res = await createInstitutionStudent(selectedEducatorId, payload);
                          if (res.error) {
                            setError(res.error);
                          } else {
                            setDeleteSummary({ message: res.message || 'Student created', counts: {} });
                            // Ensure the in-memory name map includes the newly created student so the list shows the name
                            if (payload.name) {
                              setStudentNameMap(prev => ({ ...prev, [payload.student_id]: payload.name }));
                            }
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
                        {availableSubjects.map(sub => (
                          <SelectItem key={sub.label} value={sub.label}>{sub.label}</SelectItem>
                        ))}
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
                      placeholder="+91"
                      value={subjForm.phone_number}
                      onChange={e => setSubjForm(prev => ({ ...prev, phone_number: e.target.value }))}
                    />
                  </div>
                  <div className="modal-action mt-4 flex flex-col sm:flex-row gap-2">
                    <Button variant="default" className="w-full sm:w-auto" onClick={async () => {
                      if (!subjForm.subject || !subjForm.educator) {
                        toast.error('Subject and Educator Name are required');
                        return;
                      }

                      // Validate email if provided
                      if (subjForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(subjForm.email)) {
                        toast.error("Please enter a valid email address");
                        return;
                      }

                      // Validate phone number if provided (Indian mobile: 10 digits starting with 6-9)
                      if (subjForm.phone_number) {
                        const phoneDigits = subjForm.phone_number.replace(/\D/g, '');
                        if (!/^[6-9]\d{9}$/.test(phoneDigits)) {
                          toast.error("Please enter a valid Indian mobile number (10 digits starting with 6-9)");
                          return;
                        }
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
                            phone_number: subjForm.phone_number?.trim() || null
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
                            phone_number: subjForm.phone_number?.trim() || null
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

              <StudentMoreDetails
                modalStudent={modalStudent}
                setModalStudent={setModalStudent}
                initialEditMode={initialEditMode}
                setInitialEditMode={setInitialEditMode}
                studentNameMap={studentNameMap}
                selectedEducatorId={selectedEducatorId}
                fetchResults={fetchResults}
                setDeleteSummary={setDeleteSummary}
                setError={setError}
                setStudentNameMap={setStudentNameMap}
              />

              <StudentDeleteModal
                open={deleteStudentModalOpen}
                onClose={() => {
                  setDeleteStudentModalOpen(false);
                  setStudentToDelete(null);
                }}
                modalStudent={studentToDelete}
                studentNameMap={studentNameMap}
                selectedEducatorId={selectedEducatorId}
                fetchResults={fetchResults}
                setDeleteSummary={setDeleteSummary}
                setError={setError}
                setModalStudent={() => {}}
              />

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
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default IStudentDetails;