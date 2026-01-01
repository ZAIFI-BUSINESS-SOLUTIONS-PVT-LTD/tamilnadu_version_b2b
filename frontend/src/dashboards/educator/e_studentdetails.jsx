import React, { useState, useEffect, useCallback } from 'react';
import { fetchEducatorAllStudentResults, fetcheducatorstudent } from '../../utils/api';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Loader2,
  AlertCircle,
  Frown,
  X,
  BarChart,
  FileText,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import Table from '../../components/table.jsx';
import Modal from '../../components/modal.jsx';
import LoadingPage from '../components/LoadingPage.jsx';
import { Button } from '../../components/ui/button.jsx';
import Alert from '../../components/ui/alert.jsx';

function EResults() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupedResults, setGroupedResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalStudent, setModalStudent] = useState(null);
  const [studentNameMap, setStudentNameMap] = useState({});
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [sortField, setSortField] = useState('rank');
  const [sortDirection, setSortDirection] = useState('desc');
  const [scoreRange, setScoreRange] = useState([0, 100]);
  const navigate = useNavigate();

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const results = await fetchEducatorAllStudentResults();

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
        if (results?.error?.includes('Unauthorized')) {
          navigate('/unauthorized');
        }
      }
    } catch (err) {
      console.error("Error fetching results:", err);
      setError('Failed to fetch student results. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Fetch student names for mapping
  useEffect(() => {
    const fetchNames = async () => {
      try {
        const res = await fetcheducatorstudent();

        let students = [];
        if (!res) students = [];
        else if (Array.isArray(res)) students = res;
        else if (Array.isArray(res.students)) students = res.students;
        else if (Array.isArray(res.data)) students = res.data;
        else students = [];

        const map = {};
        students.forEach(s => {
          const id = s.student_id ?? s.studentId ?? s.id;
          const name = s.student_name ?? s.name ?? s.full_name ?? '';
          if (id) map[id] = name && String(name).trim() !== '' ? String(name).trim() : `Student ${id}`;
        });
        setStudentNameMap(map);
      } catch (err) {
        console.error('Failed to fetch educator students:', err);
      }
    };
    fetchNames();
  }, []);

  const getStudentName = (student) => {
    if (!student) return '';
    const mapped = studentNameMap[student.student_id];
    if (mapped && String(mapped).trim() !== '') return String(mapped).trim();
    if (student.student_name && String(student.student_name).trim() !== '') return String(student.student_name).trim();
    return `Student ${student.student_id}`;
  };

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  // Compute min/max average score for slider (move this above useEffect)
  const minAvg = groupedResults.length ? Math.min(...groupedResults.map(s => s.average_score)) : 0;
  const maxAvg = groupedResults.length ? Math.max(...groupedResults.map(s => s.average_score)) : 100;

  // Set default range to max range on data load
  useEffect(() => {
    if (groupedResults.length) {
      setScoreRange([minAvg, maxAvg]);
    }
    // eslint-disable-next-line
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

  // Sorting logic
  const getSortValue = (student, field) => {
    switch (field) {
      case 'student_id':
        return student.student_id;
      case 'student_name':
        return getStudentName(student);
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
        getStudentName(student).toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortField === 'rank') {
        // Sort by average score, direction based on sortDirection
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

  // Compute rank mapping based on average score (descending)
  const rankMap = (() => {
    const sortedByAvg = [...groupedResults]
      .filter(student =>
        student.average_score >= scoreRange[0] &&
        student.average_score <= scoreRange[1] &&
        (student.student_id.toString().includes(searchTerm) ||
          getStudentName(student).toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => b.average_score - a.average_score);
    const map = {};
    sortedByAvg.forEach((student, idx) => {
      map[student.student_id] = idx + 1;
    });
    return map;
  })();

  // Sort icon component
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown size={14} className="text-gray-400" />;
    return sortDirection === 'asc'
      ? <ChevronUp size={14} className="text-primary" />
      : <ChevronDown size={14} className="text-primary" />;
  };

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
        <div className="max-w-md w-full space-y-4">
          <Alert
            variant="destructive"
            icon={<AlertCircle className="h-5 w-5 text-rose-600" aria-hidden />}
            className="shadow-sm"
          >
            <div className="font-semibold text-sm">Error!</div>
            <div className="text-xs text-rose-800/80 break-words">{error}</div>
          </Alert>
          <Button onClick={fetchResults} className="w-full sm:w-auto">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Table columns configuration for students
  const columns = [
    { field: 'rank', label: 'Rank', sortable: true },
    { field: 'student_id', label: 'Student ID', sortable: true },
    { field: 'student_name', label: 'Student Name', sortable: true },
    { field: 'tests_taken', label: 'No of test attended', sortable: false },
    { field: 'average_score', label: 'Average score', sortable: true },
  ];

  // Render a row for the Table component
  const renderRow = (student) => (
    <tr
      key={student.student_id}
      className="hover:bg-muted cursor-pointer transition-colors"
      onClick={() => setModalStudent(student)}
    >
      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{rankMap[student.student_id]}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{student.student_id}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{getStudentName(student)}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{student.tests_taken}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{student.average_score}</td>
    </tr>
  );

  return (
    <div className="sm:pt-4 w-full mx-auto">
      <div className="rounded-2xl border border-border bg-card w-full mt-8 p-8 shadow-sm">
        {/* Page Header and Search Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4  pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">Student Results</h1>
            <span className="inline-flex items-center rounded-full border border-transparent bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
              {groupedResults.length} {groupedResults.length === 1 ? 'Student' : 'Students'}
            </span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-96 flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by ID or name..."
                  className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search
                  className="h-5 w-5 absolute left-3 top-3 opacity-50"
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
              <Button variant="outline" className="flex items-center gap-2 border-gray-300" onClick={() => setFilterModalOpen(true)}>
                <SlidersHorizontal className="w-5 h-5" />
                <span>Filter</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Styled Table Layout */}

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
                  <Frown className="h-12 w-12 mx-auto text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">No results found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'Try a different search term' : 'No student results available'}
                  </p>
                  {searchTerm && (
                    <Button variant="ghost" size="sm" className="mt-4" onClick={clearSearch}>
                      Clear search
                    </Button>
                  )}
                </div>
              }
            />
          ) : (
            <div className="p-8 text-center">
              <Frown className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No results found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Try a different search term' : 'No student results available'}
              </p>
              {searchTerm && (
                <Button variant="ghost" size="sm" className="mt-4" onClick={clearSearch}>
                  Clear search
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Modal for student details */}
        <Modal
          open={!!modalStudent}
          onClose={() => setModalStudent(null)}
          title={modalStudent ? (
            <>
                {getStudentName(modalStudent)}
              <span className="text-xs text-gray-400 ml-2">(ID: {modalStudent.student_id})</span>
            </>
          ) : ''}
          maxWidth="max-w-3xl"
        >
          {modalStudent && (
            <>
              <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Tests</p>
                    <p className="font-medium">{modalStudent.tests_taken}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart className="text-gray-400" />
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
              <div className="mt-6 flex justify-end">
                <Button variant="outline" onClick={() => setModalStudent(null)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </Modal>

        {/* Filter Modal */}
        <Modal
          open={filterModalOpen}
          onClose={() => setFilterModalOpen(false)}
          title="Filter by Average Score"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Average Score Range</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={minAvg}
                  max={scoreRange[1]}
                  value={scoreRange[0]}
                  onChange={e => setScoreRange([Number(e.target.value), scoreRange[1]])}
                  className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                />
                <span>-</span>
                <input
                  type="number"
                  min={scoreRange[0]}
                  max={maxAvg}
                  value={scoreRange[1]}
                  onChange={e => setScoreRange([scoreRange[0], Number(e.target.value)])}
                  className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                />
              </div>
              <input
                type="range"
                min={minAvg}
                max={maxAvg}
                value={scoreRange[0]}
                onChange={e => setScoreRange([Number(e.target.value), scoreRange[1]])}
                className="mt-2 w-full accent-blue-500"
              />
              <input
                type="range"
                min={minAvg}
                max={maxAvg}
                value={scoreRange[1]}
                onChange={e => setScoreRange([scoreRange[0], Number(e.target.value)])}
                className="mt-2 w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{minAvg}</span>
                <span>{maxAvg}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setFilterModalOpen(false)}>Cancel</Button>
              <Button onClick={() => setFilterModalOpen(false)}>Apply</Button>
            </div>
          </div>
        </Modal>

        <div className="mt-6 text-sm text-gray-500 flex items-center gap-2">
          <BarChart className="w-4 h-4" />
          <p>Results are sorted by average score (highest to lowest)</p>
        </div>
      </div>
    </div>
  );
}

export default EResults;