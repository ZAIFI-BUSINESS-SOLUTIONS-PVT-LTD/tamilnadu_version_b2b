import React, { useEffect, useState } from 'react';
import { fetchEducatorAllStudentResults, fetcheducatorstudent, fetchInstitutionEducatorAllStudentResults, fetchInstitutionEducatorStudents } from '../../utils/api';
import Table from './ui/table.jsx';
import Alert from '../../components/ui/alert.jsx';

// Accept optional props so parent components (like Institution dashboard)
// can supply `rawResults` and `studentNameMap` directly and avoid the
// educator-scoped API calls which require an educator token.
const EStudentListMock = ({ rawResults: propRawResults = null, studentNameMap: propStudentNameMap = null, mode = 'educator', educatorId = null }) => {
    const [rawResults, setRawResults] = useState(propRawResults || []);
    const [loading, setLoading] = useState(!propRawResults);
    const [error, setError] = useState(null);
    const [studentNameMap, setStudentNameMap] = useState(propStudentNameMap || {});

    // Fetch results
    useEffect(() => {
        if (propRawResults) {
            setRawResults(propRawResults);
            setLoading(false);
            return;
        }

        const fetchResults = async () => {
            try {
                if (mode === 'institution') {
                    if (!educatorId) {
                        setError('Missing classroom/educator to load students.');
                        setRawResults([]);
                        return;
                    }
                    const res = await fetchInstitutionEducatorAllStudentResults(educatorId);
                    let results = [];
                    if (!res) results = [];
                    else if (Array.isArray(res)) results = res;
                    else if (Array.isArray(res.results)) results = res.results;
                    else if (Array.isArray(res.data)) results = res.data;
                    else results = [];
                    setRawResults(results || []);
                } else {
                    const results = await fetchEducatorAllStudentResults();
                    if (results && !results.error) {
                        setRawResults(results.results || (Array.isArray(results) ? results : []));
                    } else {
                        throw new Error(results?.error || 'Failed to fetch student results');
                    }
                }
            } catch (err) {
                console.error("Error fetching results:", err);
                setError('Failed to fetch student results. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [propRawResults, mode, educatorId]);

    // Always fetch student names separately to ensure proper mapping
    useEffect(() => {
        if (propStudentNameMap) {
            setStudentNameMap(propStudentNameMap);
            return;
        }

        const fetchNames = async () => {
            try {
                let res;
                if (mode === 'institution') {
                    if (!educatorId) {
                        setStudentNameMap({});
                        return;
                    }
                    res = await fetchInstitutionEducatorStudents(educatorId);
                } else {
                    res = await fetcheducatorstudent();
                }

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
                console.error("Error fetching student names:", err);
            }
        };

        fetchNames();
    }, [propStudentNameMap, mode, educatorId]);

    const getStudentName = (test) => {
        if (!test) return '';
        const mapped = studentNameMap[test.student_id];
        if (mapped && String(mapped).trim() !== '') return String(mapped).trim();
        if (test.student_name && String(test.student_name).trim() !== '') return String(test.student_name).trim();
        return `Student ${test.student_id}`;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-32">
                <p className="text-gray-600">Loading student results...</p>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive" className="shadow-sm">
                <div className="font-semibold text-sm">Error!</div>
                <div className="text-sm text-rose-800/80 break-words">{error}</div>
            </Alert>
        );
    }

    if (!rawResults || rawResults.length === 0) {
        return (
            <Alert variant="info" className="shadow-sm my-4">
                <div className="flex items-start gap-2 text-sm text-sky-900">
                    <span className="font-medium">No Students Available.</span>
                </div>
            </Alert>
        );
    }

    // Prepare data for the Table component
    const lastTests = {};
    rawResults.forEach(r => {
        if (!lastTests[r.student_id] || r.test_num > lastTests[r.student_id].test_num) {
            lastTests[r.student_id] = r;
        }
    });
    const lastTestArr = Object.values(lastTests);
    lastTestArr.sort((a, b) => b.test_num - a.test_num || a.student_id - b.student_id);
    const tableData = lastTestArr.slice(0, 5);


    const columns = [
        { field: 'student_id', label: 'Student ID', sortable: false, headerClass: 'text-left' },
        { field: 'student_name', label: 'Student Name', sortable: false, headerClass: 'text-left' },
        { field: 'phy_score', label: 'Physics', sortable: false, headerClass: 'text-center' },
        { field: 'chem_score', label: 'Chemistry', sortable: false, headerClass: 'text-center' },
        { field: 'bio_score', label: 'Biology', sortable: false, headerClass: 'text-center' },
        { field: 'bot_score', label: 'Botany', sortable: false, headerClass: 'text-center' },
        { field: 'zoo_score', label: 'Zoology', sortable: false, headerClass: 'text-center' },
        { field: 'total_score', label: 'Total', sortable: false, headerClass: 'text-center' },
        { field: 'improvement_rate', label: 'Score Improvement', sortable: false, headerClass: 'text-center' },
    ];

    // Build a map of previous test scores for each student
    const prevTestScoreMap = {};
    rawResults.forEach(r => {
        if (!prevTestScoreMap[r.student_id]) prevTestScoreMap[r.student_id] = [];
        prevTestScoreMap[r.student_id].push(r);
    });
    // Sort each student's tests by test_num ascending
    Object.values(prevTestScoreMap).forEach(arr => arr.sort((a, b) => a.test_num - b.test_num));

    const renderRow = (test) => {
        // Find previous test for this student
        const tests = prevTestScoreMap[test.student_id] || [];
        let improvement = 'N/A';
        let badge = improvement;
        if (tests.length > 1) {
            // Find the test just before the current one
            const sorted = tests.filter(t => t.test_num < test.test_num);
            if (sorted.length > 0) {
                const prev = sorted[sorted.length - 1];
                const diff = test.total_score - prev.total_score;
                if (diff > 0) {
                    improvement = `+${diff}`;
                    badge = <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">{improvement}</span>;
                } else if (diff < 0) {
                    improvement = `${diff}`;
                    badge = <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">{improvement}</span>;
                } else {
                    improvement = '0';
                    badge = <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">0</span>;
                }
            }
        }
        return (
            <tr key={test.student_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-left">{test.student_id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-left">{getStudentName(test)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{test.phy_score || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{test.chem_score || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{test.bio_score || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{test.bot_score || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{test.zoo_score || "-"}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{test.total_score}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-center">{badge}</td>
            </tr>
        );
    };

    return (
        <Table
            columns={columns}
            data={tableData}
            renderRow={renderRow}
            emptyState={
                <Alert variant="info" className="shadow-sm my-4">
                    <div className="flex items-start gap-2 text-sm text-sky-900">
                        <span className="font-medium">No Students Available.</span>
                    </div>
                </Alert>
            }
        />
    );
};

export default EStudentListMock;