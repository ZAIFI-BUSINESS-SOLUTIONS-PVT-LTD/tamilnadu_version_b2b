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
  Sliders,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  ChevronUp,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react';
import Table from '../../components/table.jsx';
import Modal from '../../components/modal.jsx';
import LoadingPage from '../components/LoadingPage.jsx';
import { Button } from '../../components/ui/button.jsx';
import Alert from '../../components/ui/alert.jsx';
import { Card, CardHeader, CardContent } from '../../components/ui/card.jsx';
import { Badge } from '../../components/ui/badge.jsx';
import { Input } from '../../components/ui/input.jsx';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../components/ui/dropdown-menu.jsx';

function EResults() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [groupedResults, setGroupedResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalStudent, setModalStudent] = useState(null);
  const [studentNameMap, setStudentNameMap] = useState({});
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [sortField, setSortField] = useState('rank');
  const [sortDirection, setSortDirection] = useState('desc');
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
      student.student_id.toString().includes(searchTerm) ||
      getStudentName(student).toLowerCase().includes(searchTerm.toLowerCase())
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
        student.student_id.toString().includes(searchTerm) ||
        getStudentName(student).toLowerCase().includes(searchTerm.toLowerCase())
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

  // Sort icon component
  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown size={14} className="text-muted-foreground" />;
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
    { field: 'last_test_score', label: `Last test score (Test ${lastTestNum})`, sortable: false },
    { field: 'average_score', label: 'Average score', sortable: true },
    { field: 'actions', label: 'Actions', sortable: false, headerClass: 'justify-end' },
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
      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
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
      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{student.average_score}</td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
        <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="More">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent sideOffset={6} align="end">
              <DropdownMenuItem onClick={() => setModalStudent(student)}>View more</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );

  return (
    <div className="sm:pt-12 w-full mx-auto">
      <Card className="rounded-2xl border border-border bg-card w-full">
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Student Results</h1>
            <Badge variant="outline" className="text-sm">
              {groupedResults.length} {groupedResults.length === 1 ? 'Student' : 'Students'}
            </Badge>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-96 flex gap-2">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Search by ID or name..."
                  className="w-full pl-10 pr-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search
                  className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50"
                />
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
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto p-8">
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
                  <Frown className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="mt-2 text-lg font-medium text-foreground">No results found</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
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
              <Frown className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="mt-2 text-lg font-medium text-foreground">No results found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
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
              <span className="text-xs text-muted-foreground ml-2">(ID: {modalStudent.student_id})</span>
            </>
          ) : ''}
          maxWidth="max-w-5xl"
        >
          {modalStudent && (
            <div className="flex flex-col h-[80vh]">
              <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tests</p>
                    <p className="font-medium">{modalStudent.tests_taken}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <BarChart className="text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Average</p>
                    <p className="font-medium">{modalStudent.average_score}</p>
                  </div>
                </div>
              </div>
              <h4 className="text-md font-semibold text-foreground mb-2">Test Performance</h4>
              <div className="overflow-x-auto flex-1">
                <table className="w-full border-collapse border border-border rounded-lg overflow-hidden">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Test #</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Total Score</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Physics</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Chemistry</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Biology</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Botany</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Zoology</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {modalStudent.test_results.map((test, index) => (
                      <tr key={index} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-sm text-muted-foreground">{test.test_num}</td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground">{test.total_score}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{test.phy_score || "-"}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{test.chem_score || "-"}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{test.bio_score || "-"}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{test.bot_score || "-"}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{test.zoo_score || "-"}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
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
            </div>
          )}
        </Modal>

        {/* Sort Modal */}
        <Modal
          open={sortModalOpen}
          onClose={() => setSortModalOpen(false)}
          title={'Sort'}
          maxWidth="max-w-md"
        >
          <p className="text-sm text-muted-foreground mb-4">Choose how the student list should be ordered.</p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-foreground mb-2">Sort Options</label>
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

        <div className="mt-6 text-sm text-muted-foreground flex items-center gap-2">
          <BarChart className="w-4 h-4" />
          <p>Use the Sort button to change how results are ordered</p>
        </div>
      </Card>
    </div>
  );
}

export default EResults;