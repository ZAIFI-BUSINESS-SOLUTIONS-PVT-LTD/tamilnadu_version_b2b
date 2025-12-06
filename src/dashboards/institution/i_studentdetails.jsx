import React, { useState, useEffect, useCallback } from 'react';
import { fetchInstitutionEducatorAllStudentResults, fetchInstitutionEducatorStudents, createInstitutionStudent, updateInstitutionStudent, deleteInstitutionStudent } from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlass,
  Spinner,
  WarningCircle,
  SmileySad,
  X,
  ChartBar,
  Exam,
  SlidersHorizontal,
  CaretUp,
  CaretDown
} from '@phosphor-icons/react';
import Table from '../components/ui/table.jsx';
import Modal from '../components/ui/modal.jsx';
import LoadingPage from '../components/LoadingPage.jsx';
import { useInstitution } from './index.jsx';

function IStudentDetails() {
  const { selectedEducatorId } = useInstitution();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupedResults, setGroupedResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalStudent, setModalStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', dob: '', password: '' });
  const [studentNameMap, setStudentNameMap] = useState({});
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [deleteSummary, setDeleteSummary] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({ class_id: '', student_id: '', name: '', dob: '' });
  const [sortField, setSortField] = useState('rank');
  const [sortDirection, setSortDirection] = useState('desc');
  const [scoreRange, setScoreRange] = useState([0, 100]);
  const navigate = useNavigate();

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
            <button className="btn btn-sm btn-ghost" onClick={() => setDeleteSummary(null)}>Dismiss</button>
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (!selectedEducatorId) return;
    const fetchNames = async () => {
      try {
        const res = await fetchInstitutionEducatorStudents(selectedEducatorId);
        if (res && Array.isArray(res.students)) {
          const map = {};
          res.students.forEach(s => {
            map[s.student_id] = s.name;
          });
          setStudentNameMap(map);
        }
      } catch (err) {
        // Optionally handle error
      }
    };
    fetchNames();
  }, [selectedEducatorId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  const minAvg = groupedResults.length ? Math.min(...groupedResults.map(s => s.average_score)) : 0;
  const maxAvg = groupedResults.length ? Math.max(...groupedResults.map(s => s.average_score)) : 100;

  useEffect(() => {
    if (groupedResults.length) {
      setScoreRange([minAvg, maxAvg]);
    }
  }, [groupedResults.length]);

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
      student.average_score >= scoreRange[0] &&
      student.average_score <= scoreRange[1] &&
      (student.student_id.toString().includes(searchTerm) ||
        (studentNameMap[student.student_id] || student.student_name).toLowerCase().includes(searchTerm.toLowerCase()))
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
        student.average_score >= scoreRange[0] &&
        student.average_score <= scoreRange[1] &&
        (student.student_id.toString().includes(searchTerm) ||
          (studentNameMap[student.student_id] || student.student_name).toLowerCase().includes(searchTerm.toLowerCase()))
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
          <WarningCircle className="stroke-current shrink-0 h-6 w-6" weight="bold" />
          <div>
            <h3 className="font-bold">Error!</h3>
            <div className="text-xs">{error}</div>
          </div>
        </div>
        <button
          onClick={fetchResults}
          className="mt-4 btn btn-primary"
        >
          Retry
        </button>
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
      onClick={() => setModalStudent(student)}
    >
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{rankMap[student.student_id]}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.student_id}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{studentNameMap[student.student_id] || student.student_name}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.tests_taken}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{student.average_score}</td>
    </tr>
  );

  return (
    <div className="sm:pt-4 w-full mx-auto">
      <div className="card rounded-2xl border border-gray-250 bg-white w-full mt-8 p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4  pb-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">Student Results</h1>
            <span className="badge badge-lg border-transparent bg-blue-50 text-sm text-blue-700">
              {groupedResults.length} {groupedResults.length === 1 ? 'Student' : 'Students'}
            </span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-96 flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by ID or name..."
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
              <button className="btn btn-ghost border-gray-300 flex items-center gap-2" onClick={() => setFilterModalOpen(true)}>
                <SlidersHorizontal className="w-5 h-5" weight="bold" />
                <span>Filter</span>
              </button>
              <button className="btn btn-primary flex items-center gap-2" onClick={() => { setCreateModalOpen(true); setNewStudent({ class_id: '', student_id: '', name: '', dob: '' }); }}>
                <span>Create Student</span>
              </button>
            </div>
          </div>
        </div>

        {renderDeleteSummary()}

        <div className="overflow-x-auto">
          {sortedResults.length > 0 ? (
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
                  <SmileySad className="h-12 w-12 mx-auto text-gray-400" weight="duotone" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No results found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'Try a different search term' : 'No student results available'}
                  </p>
                  {searchTerm && (
                    <button
                      onClick={clearSearch}
                      className="mt-4 btn btn-sm btn-ghost"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              }
            />
          ) : (
            <div className="p-8 text-center">
              <SmileySad className="h-12 w-12 mx-auto text-gray-400" weight="duotone" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No results found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try a different search term' : 'No student results available'}
              </p>
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="mt-4 btn btn-sm btn-ghost"
                >
                  Clear search
                </button>
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
              <input
                className="input input-bordered w-full"
                value={newStudent.class_id}
                placeholder="Optional: class id (will default to educator's class)"
                onChange={e => setNewStudent(prev => ({ ...prev, class_id: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Student ID</label>
              <input
                className="input input-bordered w-full"
                value={newStudent.student_id}
                onChange={e => setNewStudent(prev => ({ ...prev, student_id: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                className="input input-bordered w-full"
                value={newStudent.name}
                onChange={e => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">DOB</label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={newStudent.dob}
                onChange={e => setNewStudent(prev => ({ ...prev, dob: e.target.value }))}
              />
            </div>
            <div className="modal-action mt-4 flex gap-2">
              <button
                className="btn btn-primary"
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
              </button>
              <button className="btn btn-ghost" onClick={() => setCreateModalOpen(false)}>Cancel</button>
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
                    <input
                      className="input input-bordered w-full"
                      value={editForm.name}
                      onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">DOB</label>
                    <input
                      type="date"
                      className="input input-bordered w-full"
                      value={editForm.dob}
                      onChange={e => setEditForm(prev => ({ ...prev, dob: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input
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
                      <Exam className="text-gray-400" weight="bold" />
                      <div>
                        <p className="text-sm text-gray-500">Tests</p>
                        <p className="font-medium">{modalStudent.tests_taken}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ChartBar className="text-gray-400" weight="bold" />
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

              <div className="modal-action mt-6 flex gap-2">
                        {isEditing ? (
                  <>
                    <button
                      className="btn btn-primary"
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
                    </button>
                    <button className="btn btn-ghost" onClick={() => setIsEditing(false)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn btn-error"
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
                    >
                      Delete
                    </button>
                    <button
                      className="btn"
                      onClick={() => {
                        setIsEditing(true);
                        setEditForm({ name: modalStudent.student_name || '', dob: modalStudent.dob || '', password: '' });
                      }}
                    >
                      Edit
                    </button>
                    <button className="btn" onClick={() => setModalStudent(null)}>Close</button>
                  </>
                )}
              </div>
            </>
          )}
        </Modal>

        {filterModalOpen && (
          <div className="modal modal-open">
            <div className="modal-box max-w-md">
              <h3 className="font-bold text-lg mb-4">Filter by Average Score</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Average Score Range</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={minAvg}
                    max={scoreRange[1]}
                    value={scoreRange[0]}
                    onChange={e => setScoreRange([Number(e.target.value), scoreRange[1]])}
                    className="input input-bordered w-20"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    min={scoreRange[0]}
                    max={maxAvg}
                    value={scoreRange[1]}
                    onChange={e => setScoreRange([scoreRange[0], Number(e.target.value)])}
                    className="input input-bordered w-20"
                  />
                </div>
                <input
                  type="range"
                  min={minAvg}
                  max={maxAvg}
                  value={scoreRange[0]}
                  onChange={e => setScoreRange([Number(e.target.value), scoreRange[1]])}
                  className="range range-xs mt-2"
                />
                <input
                  type="range"
                  min={minAvg}
                  max={maxAvg}
                  value={scoreRange[1]}
                  onChange={e => setScoreRange([scoreRange[0], Number(e.target.value)])}
                  className="range range-xs mt-2"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{minAvg}</span>
                  <span>{maxAvg}</span>
                </div>
              </div>
              <div className="modal-action">
                <button className="btn" onClick={() => setFilterModalOpen(false)}>Apply</button>
              </div>
            </div>
            <div className="modal-backdrop" onClick={() => setFilterModalOpen(false)}></div>
          </div>
        )}

        <div className="mt-6 text-sm text-gray-500 flex items-center gap-2">
          <ChartBar className="w-4 h-4" />
          <p>Results are sorted by average score (highest to lowest)</p>
        </div>
      </div>
    </div>
  );
}

export default IStudentDetails;
