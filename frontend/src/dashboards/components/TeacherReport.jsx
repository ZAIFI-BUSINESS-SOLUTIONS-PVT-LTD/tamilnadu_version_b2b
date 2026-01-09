import { useEffect, useState, useMemo } from "react";
import { fetchEducatorSWOT, fetchEducatorAllStudentResults, fetcheducatordetail, fetchInstitutionTeacherDashboard, fetchInstitutionTeacherSWOT, fetchInstitutionAllStudentResults, fetchInstitutionTestStudentPerformance, fetchInstitutionEducatorAllStudentResults } from "../../utils/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, ReferenceLine, PieChart, Pie, Cell } from "recharts";
import { useUserData } from './hooks/z_header/z_useUserData.js';

// Transform raw SWOT payload into a predictable shape:
// { Strengths: [{ subject, topics: [] }], Weaknesses: [...], Opportunities: [...] }
function transformSwotData(rawData) {
    if (!rawData || typeof rawData !== "object") {
        return { Strengths: [], Weaknesses: [], Opportunities: [] };
    }

    const primaryMetrics = {
        Strengths: "TS_BPT",
        Weaknesses: "TW_MCT",
        Opportunities: "TO_RLT",
    };

    const organized = { Strengths: [], Weaknesses: [], Opportunities: [] };

    for (const [category, metric] of Object.entries(primaryMetrics)) {
        const subjectMap = rawData[metric];
        if (subjectMap && typeof subjectMap === "object") {
            for (const [subject, topics] of Object.entries(subjectMap)) {
                organized[category].push({
                    subject,
                    topics: Array.isArray(topics) ? topics : [],
                });
            }
        }
    }

    return organized;
}

const DEFAULT_SUBJECT_ORDER = ["Physics", "Chemistry", "Botany", "Zoology", "Biology"];
// Number of question rows per column on A4 pages
const ROWS_PER_COLUMN = 23;

// Thresholds are centralized so ranges can be tuned without touching rendering code
const SEVERITY_THRESHOLDS = {
    noneMax: 0,
    lowMax: 30,
    mediumMax: 70,
};

const getSeverityLevel = (severity, thresholds = SEVERITY_THRESHOLDS) => {
    const s = Number(severity || 0);
    const { noneMax = 0, lowMax = 30, mediumMax = 70 } = thresholds || {};
    if (s <= noneMax) return 'None';
    if (s <= lowMax) return 'Low';
    if (s <= mediumMax) return 'Medium';
    return 'High';
};

export default function TeacherReport() {
    const [dashboard, setDashboard] = useState(null);
    const [swot, setSwot] = useState(null);
    const [error, setError] = useState(null);
    const [testId, setTestId] = useState(null);
    const [educatorId, setEducatorId] = useState(null);
    const [classId, setClassId] = useState(null);
    const [studentResults, setStudentResults] = useState([]);
    const [testPerformance, setTestPerformance] = useState(null);

    // Normalize student results to canonical fields used by the charts
    const normalizedResults = useMemo(() => {
        if (!Array.isArray(studentResults) || !studentResults.length) return [];

        const pick = (obj, keys) => {
            if (!obj) return undefined;
            for (const k of keys) {
                if (obj[k] != null && obj[k] !== '') return obj[k];
            }
            return undefined;
        };

        return studentResults.map((r) => {
            const test_num = Number((pick(r, ['test_num', 'testNum', 'test_number', 'testNumber', 'test']) ?? (r.test ?? r.tn ?? r.t)) || 0);

            // per-subject score candidates
            const subjScore = (prefix) => Number(pick(r, [
                `${prefix}_score`, `${prefix}__score`, `${prefix}_marks`, `${prefix}_obtained`, `${prefix}_mark`, `${prefix}Marks`, `${prefix}_total_score`, `${prefix}_score_obtained`, prefix
            ]) ?? 0);

            const phy_score = subjScore('phy');
            const chem_score = subjScore('chem');
            const bio_score = subjScore('bio');
            const bot_score = subjScore('bot');
            const zoo_score = subjScore('zoo');

            // totals and overall score
            const total_score = Number(pick(r, ['total_score', 'totalScore', 'score', 'marks', 'total_marks'])) || (phy_score + chem_score + bio_score + bot_score + zoo_score) || 0;

            const pickSubjectMeta = (prefix, fieldVariants) => {
                const obj = {};
                const correct = Number(pick(r, [`${prefix}_correct`, `${prefix}__correct`, `${prefix}_right`, `${prefix}_correct_count`, `${prefix}_correct_marks`]) ?? 0);
                const attended = Number(pick(r, [`${prefix}_attended`, `${prefix}_attempted`, `${prefix}_attempted_count`, `${prefix}_present`, `${prefix}_att`]) ?? 0);
                const total = Number(pick(r, [`${prefix}_total`, `${prefix}_possible`, `${prefix}_questions`, `${prefix}_total_questions`]) ?? 0);
                obj[`${prefix}_correct`] = correct;
                obj[`${prefix}_attended`] = attended;
                obj[`${prefix}_total`] = total;
                return obj;
            };

            const phy_meta = pickSubjectMeta('phy');
            const chem_meta = pickSubjectMeta('chem');
            const bio_meta = pickSubjectMeta('bio');
            const bot_meta = pickSubjectMeta('bot');
            const zoo_meta = pickSubjectMeta('zoo');

            return {
                ...r,
                test_num,
                total_score,
                phy_score,
                chem_score,
                bio_score,
                bot_score,
                zoo_score,
                ...phy_meta,
                ...chem_meta,
                ...bio_meta,
                ...bot_meta,
                ...zoo_meta,
            };
        });
    }, [studentResults]);

    // Track loading state for all data sources
    const [dashboardLoaded, setDashboardLoaded] = useState(false);
    const [swotLoaded, setSwotLoaded] = useState(false);
    const [resultsLoaded, setResultsLoaded] = useState(false);

    // Fetch educator user data
    const { userData: educatorInfo, isLoading: isEducatorLoading } = useUserData(fetcheducatordetail, { name: '', inst: '' });

    // Scoped filters for institution view to avoid mixing classrooms
    const filterInstitutionResults = useMemo(() => {
        if (!classId) return (rows) => rows;
        return (rows) => {
            const cid = classId != null ? String(classId) : null;
            return rows.filter((r) => {
                const classCandidates = [r?.class_id, r?.classId, r?.class, r?.classroom, r?.classroom_id, r?.classroomId];
                const classOk = !cid || classCandidates.some((v) => v != null && String(v) === cid);
                return classOk;
            });
        };
    }, [classId]);

    // Derive classroom and institution names from available payloads
    const { classroomName, institutionName } = useMemo(() => {
        const maybe = (obj, keys) => {
            if (!obj) return undefined;
            for (const k of keys) {
                if (obj[k] != null && obj[k] !== '') return obj[k];
            }
            return undefined;
        };

        // common possible keys
        const classKeys = ['classroom', 'class', 'class_id', 'classId', 'class_name', 'className', 'grade', 'standard'];
        const instKeys = ['inst', 'institution', 'institute', 'school', 'school_name', 'schoolName', 'organization', 'org', 'org_name'];

        let cls = maybe(educatorInfo, classKeys);
        let inst = maybe(educatorInfo, instKeys);

        // fallback to dashboard data if available
        if (!cls && dashboard) {
            cls = maybe(dashboard, ['classroom', 'classroom_name', 'class_name', 'classId', 'class_id']);
            // sometimes nested in summaryCardsData
            if (!cls && Array.isArray(dashboard.summaryCardsData) && dashboard.summaryCardsData.length) {
                const sc = dashboard.summaryCardsData[0];
                cls = maybe(sc, ['classroom', 'class_name', 'class']);
            }
        }

        if (!inst && dashboard) {
            inst = maybe(dashboard, ['inst', 'institution', 'institute', 'school']);
            if (!inst && Array.isArray(dashboard.summaryCardsData) && dashboard.summaryCardsData.length) {
                const sc = dashboard.summaryCardsData[0];
                inst = maybe(sc, ['inst', 'institution', 'institute', 'school']);
            }
        }

        // As a last resort, try to infer from studentResults (e.g., entries may contain school or class fields)
        if ((!cls || !inst) && Array.isArray(studentResults) && studentResults.length) {
            for (const r of studentResults) {
                if (!cls) cls = maybe(r, classKeys);
                if (!inst) inst = maybe(r, instKeys);
                if (cls && inst) break;
            }
        }

        return { classroomName: cls || null, institutionName: inst || null };
    }, [educatorInfo, dashboard, studentResults]);

    // Ensure header uses the same institution normalization as UserDropDown
    const headerInstitutionName = useMemo(() => {
        const isNonEmpty = (v) => v != null && String(v).trim() !== '';

        const candidates = [
            educatorInfo?.inst,
            educatorInfo?.institution,
            educatorInfo?.institute,
            educatorInfo?.school,
            educatorInfo?.school_name,
            educatorInfo?.schoolName,
            educatorInfo?.organization,
            educatorInfo?.org,
            educatorInfo?.org_name,
            institutionName,
            dashboard?.inst,
            dashboard?.institution,
            dashboard?.institute,
            dashboard?.school,
        ];

        for (const c of candidates) {
            if (isNonEmpty(c)) return String(c).trim();
        }

        if (Array.isArray(studentResults) && studentResults.length) {
            const sample = studentResults.find(Boolean) || studentResults[0];
            const studentKeys = ['inst', 'institution', 'institute', 'school', 'school_name', 'schoolName', 'org', 'org_name'];
            for (const k of studentKeys) {
                if (isNonEmpty(sample?.[k])) return String(sample[k]).trim();
            }
        }

        return null;
    }, [educatorInfo, dashboard, studentResults, institutionName]);
    // Extract testId, educatorId, classId from query params once on mount
    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        const extractedTestId = query.get("testId");
        const extractedEducatorId = query.get("educatorId");
        const extractedClassId = query.get("classId");
        setTestId(extractedTestId);
        setEducatorId(extractedEducatorId);
        if (extractedClassId) setClassId(extractedClassId);
    }, []);

    // Check if this is institution view
    const isInstitutionView = !!educatorId;

    // Unified data fetch for dashboard, SWOT and student results
    useEffect(() => {
        if (!testId) return;

        let mounted = true;

        const fetchAllData = async () => {
            try {
                // Dashboard
                let dash;
                if (isInstitutionView) {
                    dash = await fetchInstitutionTeacherDashboard(educatorId, testId, classId);
                } else {
                    dash = { summaryCardsData: [] };
                }

                if (!mounted) return;
                setDashboard(dash);

                // SWOT
                let swotData;
                if (isInstitutionView) {
                    swotData = await fetchInstitutionTeacherSWOT(educatorId, testId, classId);
                } else {
                    try {
                        swotData = await fetchEducatorSWOT(testId);
                    } catch (err) {
                        swotData = null;
                    }
                }
                if (!mounted) return;
                const raw = swotData && swotData.swot ? swotData.swot : swotData;
                setSwot(transformSwotData(raw));

                // Student results
                let results;
                if (isInstitutionView) {
                    // Prefer educator-scoped endpoint; apply class filter client-side if provided
                    results = await fetchInstitutionEducatorAllStudentResults(educatorId);
                } else {
                    results = await fetchEducatorAllStudentResults();
                }
                if (!mounted) return;
                let arr = [];
                if (Array.isArray(results)) {
                    arr = results;
                } else if (results && Array.isArray(results.results)) {
                    arr = results.results;
                } else if (results && Array.isArray(results.data)) {
                    arr = results.data;
                }
                const filtered = isInstitutionView ? filterInstitutionResults(arr) : arr;
                setStudentResults(filtered);

                // Question-wise performance data (institution teacher PDF only for now)
                // Uses the same endpoint referenced by `i_testperformance.jsx`.
                if (isInstitutionView) {
                    const parsedTestNum = (() => {
                        const n = Number(testId);
                        if (!Number.isNaN(n) && Number.isFinite(n)) return n;
                        if (typeof testId === 'string') {
                            const m = testId.match(/\d+/);
                            if (m) return Number(m[0]);
                        }
                        return NaN;
                    })();

                    // Only fetch question-wise data when we can resolve a concrete test number.
                    if (!Number.isNaN(parsedTestNum) && Number.isFinite(parsedTestNum) && parsedTestNum > 0) {
                        const perf = await fetchInstitutionTestStudentPerformance(educatorId, parsedTestNum, classId);
                        if (!mounted) return;
                        if (perf && !perf.error) {
                            setTestPerformance(perf);
                        } else {
                            setTestPerformance(null);
                        }
                    } else {
                        setTestPerformance(null);
                    }
                } else {
                    setTestPerformance(null);
                }

                setError(null);
            } catch (err) {
                // Keep partial data where possible; surface an error message for debugging
                setError(err.message || 'Failed to load teacher report data');
            } finally {
                // Always mark ready for PDF generation (matches StudentReport pattern)
                if (typeof window !== 'undefined') {
                    window.__PDF_READY__ = true;
                }
                if (mounted) {
                    setDashboardLoaded(true);
                    setSwotLoaded(true);
                    setResultsLoaded(true);
                }
            }
        };

        fetchAllData();

        return () => { mounted = false; };
    }, [testId, educatorId, classId, isInstitutionView]);

    // Set __PDF_READY__ flag only when all data is loaded OR if there's an error
    useEffect(() => {
        if (dashboardLoaded && swotLoaded && resultsLoaded) {
            if (typeof window !== 'undefined') {
                window.__PDF_READY__ = true;
            }
        }
    }, [dashboardLoaded, swotLoaded, resultsLoaded]);

    // Also set __PDF_READY__ on error to prevent PDF service timeout
    useEffect(() => {
        if (error) {
            if (typeof window !== 'undefined') {
                window.__PDF_READY__ = true;
            }
        }
    }, [error]);
    // Derive subject-wise buckets (strengths/weaknesses/opportunities)
    const { subjectData, sortedSubjectList } = useMemo(() => {
        const data = {};

        if (swot) {
            Object.entries(swot).forEach(([category, items]) => {
                const key = category.toLowerCase(); // e.g. 'Strengths' -> 'strengths'
                items.forEach((item) => {
                    if (!data[item.subject]) {
                        data[item.subject] = { weaknesses: [], strengths: [] };
                    }
                    // Only populate weaknesses/strengths; skip opportunities
                    if ((key === 'weaknesses' || key === 'strengths') && Array.isArray(item.topics) && item.topics.length) {
                        data[item.subject][key].push(...item.topics);
                    }
                });
            });
        }

        const sorted = Object.keys(data).sort((a, b) => {
            const ia = DEFAULT_SUBJECT_ORDER.indexOf(a);
            const ib = DEFAULT_SUBJECT_ORDER.indexOf(b);
            if (ia === -1 && ib === -1) return a.localeCompare(b);
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
        });

        return { subjectData: data, sortedSubjectList: sorted };
    }, [swot]);

    // Process student results for chart: average total_score per test_num
    const chartData = useMemo(() => {
        if (!normalizedResults.length) return [];

        const grouped = {};
        normalizedResults.forEach(result => {
            const testNum = result.test_num;
            if (!grouped[testNum]) {
                grouped[testNum] = { total: 0, count: 0 };
            }
            grouped[testNum].total += Number(result.total_score || 0);
            grouped[testNum].count += 1;
        });

        const sortedKeys = Object.keys(grouped).sort((a, b) => Number(a) - Number(b));
        return sortedKeys.map(testNum => ({
            testNum: `Test ${testNum}`,
            averageScore: Math.round((grouped[testNum].total / grouped[testNum].count) * 100) / 100, // round to 2 decimals
        }));
    }, [normalizedResults]);

    // Compute Y axis max and ticks (nice round intervals) for better visual alignment — match StudentReport style
    const yAxisConfig = useMemo(() => {
        if (!chartData.length) return { max: 100, ticks: [50, 100] };
        const maxVal = Math.max(...chartData.map(d => Number(d.averageScore || 0)));
        // pad a bit and round up to nearest 50
        const padded = Math.max(100, Math.ceil((maxVal + 20) / 50) * 50);
        const ticks = Array.from({ length: Math.ceil(padded / 50) }, (_, i) => (i + 1) * 50);
        return { max: padded, ticks };
    }, [chartData]);

    // Process student results for subject charts: average subject_score per test_num per subject
    const subjectCharts = useMemo(() => {
        // helper to detect whether a given prefix exists in results
        const hasField = (prefix) => normalizedResults.some(r => r && (
            r[`${prefix}_score`] != null || r[`${prefix}_total`] != null || r[`${prefix}_marks`] != null || r[prefix] != null
        ));

        // mapping from display subject to resolved field key in results. For Botany/Zoology,
        // fallback to Biology fields when bot/zoo-specific fields are absent.
        const resolveFieldKey = (subject) => {
            if (subject === 'Physics') return 'phy_score';
            if (subject === 'Chemistry') return 'chem_score';
            if (subject === 'Biology') return 'bio_score';
            if (subject === 'Botany') return (hasField('bot') ? 'bot_score' : (hasField('bio') ? 'bio_score' : 'bot_score'));
            if (subject === 'Zoology') return (hasField('zoo') ? 'zoo_score' : (hasField('bio') ? 'bio_score' : 'zoo_score'));
            return `${subject.toLowerCase()}_score`;
        };

        // collect all test numbers present so each subject chart has the same x-axis categories
        const testNumsSet = new Set();
        normalizedResults.forEach(r => {
            if (r && (r.test_num != null)) testNumsSet.add(String(r.test_num));
        });
        const allTestNums = Array.from(testNumsSet).sort((a, b) => Number(a) - Number(b));
        // Determine relevant test numbers based on testId
        const parsed = (() => {
            const n = Number(testId);
            if (!Number.isNaN(n)) return n;
            if (typeof testId === 'string') {
                const m = testId.match(/\d+/);
                if (m) return Number(m[0]);
            }
            return NaN;
        })();
        let relevantTestNums;
        // If a specific test number is selected (parsed > 0), show the last up-to-5 tests
        // ending at that test number. Examples: parsed=10 => [6,7,8,9,10]; parsed=4 => [1,2,3,4]
        if (!Number.isNaN(parsed) && Number.isFinite(parsed) && parsed > 0) {
            const upToParsed = allTestNums.filter(num => Number(num) <= parsed && Number(num) >= 1);
            const take = 5;
            relevantTestNums = upToParsed.length ? upToParsed.slice(Math.max(0, upToParsed.length - take)) : [];
        } else if (parsed === 0) {
            // Overall: show last 5 tests (keep consistent with 'last N' behaviour)
            relevantTestNums = allTestNums.slice(-5);
        } else {
            // Fallback: include all available tests
            relevantTestNums = allTestNums;
        }

        return DEFAULT_SUBJECT_ORDER.map(subject => {
            const key = resolveFieldKey(subject);
            // aggregate per test
            const grouped = {};
            normalizedResults.forEach(result => {
                const testNum = String(result.test_num);
                const score = result && (result[key] != null) ? Number(result[key]) : null;
                if (!grouped[testNum]) grouped[testNum] = { total: 0, count: 0 };
                if (score !== null) {
                    grouped[testNum].total += score;
                    grouped[testNum].count += 1;
                }
            });

            // build data entries for every test number in relevantTestNums (fill 0 when no data so charts align)
            const data = relevantTestNums.map(testNum => {
                const entry = grouped[testNum];
                const avg = entry && entry.count ? Math.round((entry.total / entry.count) * 100) / 100 : 0;
                return { testNum: `Test ${testNum}`, averageScore: avg };
            });

            // derive Y axis config per subject: choose a sensible step (10 for small ranges, 50 for larger)
            const maxVal = data.length ? Math.max(...data.map(d => Number(d.averageScore || 0))) : 0;
            const step = maxVal > 50 ? 50 : 10;
            // add a small padding (20% of step) then round up to nearest step
            const padded = Math.max(step, Math.ceil((maxVal + step * 0.2) / step) * step);
            let ticks = Array.from({ length: Math.max(1, Math.ceil(padded / step)) }, (_, i) => (i + 1) * step);

            // Include average value as a tick if available
            const averageValue = data && data.length ? data.reduce((s, d) => s + Number(d.averageScore || 0), 0) / data.length : null;
            if (averageValue != null) {
                ticks = [...new Set([...ticks, Math.round(averageValue)])].sort((a, b) => a - b);
            }

            return { subject, data, yAxis: { max: padded, ticks } };
        });
    }, [normalizedResults, testId]);

    // Compute donut chart data per-subject for class averages: correct, incorrect, skipped
    // This returns a map: { Physics: [{name,value,color}, ...], Chemistry: [...], ... }
    const subjectDonutMap = useMemo(() => {
        if (!normalizedResults.length) return {};

        // helper to detect whether a given prefix exists in results
        const hasField = (prefix) => normalizedResults.some(r => r && (
            r[`${prefix}_score`] != null || r[`${prefix}_total`] != null || r[`${prefix}_marks`] != null || r[`${prefix}_correct`] != null || r[`${prefix}_attended`] != null
        ));

        // mapping prefix for subject-specific fields; allow fallback to Biology when bot/zoo missing
        const resolvePrefix = (subject) => {
            if (subject === 'Botany') {
                return hasField('bot') ? 'bot' : (hasField('bio') ? 'bio' : 'bot');
            }
            if (subject === 'Zoology') {
                return hasField('zoo') ? 'zoo' : (hasField('bio') ? 'bio' : 'zoo');
            }
            if (subject === 'Biology') return 'bio';
            if (subject === 'Physics') return 'phy';
            if (subject === 'Chemistry') return 'chem';
            return subject.toLowerCase();
        };

        // collect test numbers present
        const testNumsSet = new Set();
        normalizedResults.forEach(r => {
            if (r && (r.test_num != null)) testNumsSet.add(String(r.test_num));
        });
        const allTestNums = Array.from(testNumsSet).sort((a, b) => Number(a) - Number(b));

        const parsed = (() => {
            const n = Number(testId);
            if (!Number.isNaN(n)) return n;
            if (typeof testId === 'string') {
                const m = testId.match(/\d+/);
                if (m) return Number(m[0]);
            }
            return NaN;
        })();
        let relevantTestNums;
        if (parsed === 0) {
            // For Overall, use the most recent test's data for donut charts
            relevantTestNums = allTestNums.length ? [allTestNums[allTestNums.length - 1]] : [];
        } else {
            relevantTestNums = allTestNums.includes(String(parsed)) ? [String(parsed)] : [];
        }

        // helper: select relevant results; fallback to all if none matched
        let relevant = normalizedResults.filter(r => relevantTestNums.includes(String(r.test_num)));
        if (!relevant.length) relevant = normalizedResults;

        const map = {};

        Object.keys({ Physics: 1, Chemistry: 1, Biology: 1, Botany: 1, Zoology: 1 }).forEach((subject) => {
            const prefix = resolvePrefix(subject);
            let totalCorrect = 0, totalIncorrect = 0, totalSkipped = 0, count = 0;

            relevant.forEach(result => {
                const correct = Number(result[`${prefix}_correct`] || 0);
                const attended = Number(result[`${prefix}_attended`] || 0);
                const possible = Number(result[`${prefix}_total`] || 0);
                const incorrect = Math.max(0, attended - correct);
                const skipped = Math.max(0, possible - attended);

                totalCorrect += correct;
                totalIncorrect += incorrect;
                totalSkipped += skipped;
                count++;
            });

            const avgCorrect = count ? totalCorrect / count : 0;
            const avgIncorrect = count ? totalIncorrect / count : 0;
            const avgSkipped = count ? totalSkipped / count : 0;

            map[subject] = [
                { name: 'Correct', value: avgCorrect, color: '#7aabfa' },
                { name: 'Incorrect', value: avgIncorrect, color: '#d4d5d6' },
                { name: 'Skipped', value: avgSkipped, color: '#6B7280' },
            ];
        });

        return map;
    }, [normalizedResults, testId]);

    // Question-wise aggregates from `testPerformance` payload
    // NOTE: These hooks must stay ABOVE any conditional returns to keep hook order stable.
    // Output: [{ question_number, question_text, correct, incorrect, unattempted, totalStudents }]
    const questionWiseRows = useMemo(() => {
        const perf = testPerformance;
        const questions = Array.isArray(perf?.questions) ? perf.questions : [];
        const students = Array.isArray(perf?.students) ? perf.students : [];

        if (!questions.length || !students.length) return [];

        // Pre-index responses by student for quick lookups
        const responseMapByStudent = new Map();
        for (const st of students) {
            const responses = Array.isArray(st?.responses) ? st.responses : [];
            const map = new Map();
            for (const r of responses) {
                if (!r) continue;
                const qn = Number(r.question_number);
                if (!Number.isNaN(qn)) map.set(qn, r);
            }
            // Use a deterministic key per student so lookups work.
            const key = st?.student_id ?? st?.student_name;
            responseMapByStudent.set(key, map);
        }

        const totalStudents = students.length;
        const rows = questions
            .map((q) => {
                const qn = Number(q?.question_number);
                if (Number.isNaN(qn)) return null;

                let correct = 0;
                let incorrect = 0;
                let unattempted = 0;

                for (const st of students) {
                    const stKey = st?.student_id ?? st?.student_name;
                    const smap = responseMapByStudent.get(stKey) || new Map();
                    const resp = smap.get(qn);
                    const selected = resp?.selected_answer;
                    const isBlank = selected === null || selected === undefined || String(selected).trim() === '';
                    if (!resp || isBlank) {
                        unattempted += 1;
                    } else if (resp?.is_correct) {
                        correct += 1;
                    } else {
                        incorrect += 1;
                    }
                }

                const pct = (val) => (totalStudents ? Math.round((val / totalStudents) * 1000) / 10 : 0);
                let percent_correct = pct(correct);
                const percent_unattempted = pct(unattempted);
                const percent_incorrect = pct(incorrect);

                // New severity: Total Failure Rate = incorrect + unattempted (as percent)
                const severityRaw = incorrect + unattempted;
                const severity = pct(severityRaw);

                // Safety check: ensure percent_correct + severity == 100% within rounding margins.
                // If small rounding difference exists, adjust percent_correct to make the sum exactly 100.0
                const sumRounded = Math.round((percent_correct + severity) * 10) / 10;
                if (Math.abs(100 - sumRounded) <= 0.3) {
                    percent_correct = Math.round((100 - severity) * 10) / 10;
                }

                return {
                    question_number: qn,
                    subject: q?.subject ?? q?.subject_name ?? q?.topic ?? null,
                    correct,
                    incorrect,
                    unattempted,
                    totalStudents,
                    percent_correct,
                    percent_unattempted,
                    // severity stored as a numeric percentage (one-decimal precision)
                    severity,
                };
            })
            .filter(Boolean)
            .sort((a, b) => Number(a.question_number) - Number(b.question_number));

        return rows;
    }, [testPerformance]);

    // Paginate question rows for print-friendly tables
    const questionPages = useMemo(() => {
        const rows = questionWiseRows || [];
        if (!rows.length) return [];
        const pageSize = 18; // fits A4 comfortably with header
        const pages = [];
        for (let i = 0; i < rows.length; i += pageSize) {
            pages.push(rows.slice(i, i + pageSize));
        }
        return pages;
    }, [questionWiseRows]);

    // Group question rows by subject and paginate per-subject into two-column pages
    const questionPagesBySubject = useMemo(() => {
        const map = {};
        const rows = questionWiseRows || [];
        const rowsPerColumn = ROWS_PER_COLUMN; // rows that fit in one column on A4
        const pageCapacity = ROWS_PER_COLUMN * 2; // two columns per page
        for (const r of rows) {
            const subj = (r.subject && String(r.subject).trim()) || 'Unknown';
            if (!map[subj]) map[subj] = [];
            map[subj].push(r);
        }

        // paginate each subject's rows into pages that hold up to `pageCapacity` rows
        const paged = {};
        for (const [subj, rrows] of Object.entries(map)) {
            if (!rrows || !rrows.length) {
                paged[subj] = [[]];
                continue;
            }
            const pages = [];
            for (let i = 0; i < rrows.length; i += pageCapacity) pages.push(rrows.slice(i, i + pageCapacity));
            paged[subj] = pages;
        }

        return paged;
    }, [questionWiseRows]);

    // Top severity questions per subject (highest `severity` first, up to 6)
    const topSeverityBySubject = useMemo(() => {
        const map = {};
        const rows = questionWiseRows || [];
        if (!rows.length) return map;
        const subjectBuckets = {};
        for (const r of rows) {
            const subj = (r.subject && String(r.subject).trim()) || 'Unknown';
            if (!subjectBuckets[subj]) subjectBuckets[subj] = [];
            subjectBuckets[subj].push(r);
        }
        for (const [subj, list] of Object.entries(subjectBuckets)) {
            // pick top 6 by severity, then order them by severity descending for display
            const topBySeverity = list
                .slice()
                .sort((a, b) => Number(b.severity || 0) - Number(a.severity || 0))
                .slice(0, 6)
                .sort((a, b) => {
                    const severityDiff = Number(b.severity || 0) - Number(a.severity || 0);
                    if (severityDiff !== 0) return severityDiff;
                    return Number(a.question_number || 0) - Number(b.question_number || 0);
                });
            map[subj] = topBySeverity;
        }
        return map;
    }, [questionWiseRows]);

    // Subjects present in question-wise data (drives dynamic rendering to avoid empty sections)
    const subjectsFromQuestions = useMemo(() => {
        const set = new Set();
        const rows = questionWiseRows || [];
        rows.forEach(r => {
            const subj = r?.subject;
            if (!subj) return;
            const name = String(subj).trim();
            if (name) set.add(name);
        });
        return set;
    }, [questionWiseRows]);

    // Determine which subjects to render in teacher report pages.
    // Prefer subjects found in SWOT (`sortedSubjectList`) or default order, but
    // only render a subject if there is actual data to show (chart/donut/SWOT topics).
    // detect which subjects have result data (use normalizedResults for consistency)
    const subjectsFromResults = new Set();
    const hasResultData = (r, prefix) => {
        const score = Number(r?.[`${prefix}_score`] ?? 0);
        const total = Number(r?.[`${prefix}_total`] ?? 0);
        const correct = Number(r?.[`${prefix}_correct`] ?? 0);
        const attended = Number(r?.[`${prefix}_attended`] ?? 0);
        return score > 0 || total > 0 || correct > 0 || attended > 0;
    };

    normalizedResults.forEach(r => {
        if (!r) return;
        if (hasResultData(r, 'bio')) subjectsFromResults.add('Biology');
        if (hasResultData(r, 'phy')) subjectsFromResults.add('Physics');
        if (hasResultData(r, 'chem')) subjectsFromResults.add('Chemistry');
        if (hasResultData(r, 'bot')) subjectsFromResults.add('Botany');
        if (hasResultData(r, 'zoo')) subjectsFromResults.add('Zoology');
    });

    const combined = Array.from(new Set([
        ...Object.keys(subjectData || {}),
        ...Array.from(subjectsFromResults),
        ...Array.from(subjectsFromQuestions),
    ]));

    const subjectHasData = (sub) => {
        const buckets = subjectData[sub] || { weaknesses: [], strengths: [] };
        const hasSwot = (Array.isArray(buckets.weaknesses) && buckets.weaknesses.length) || (Array.isArray(buckets.strengths) && buckets.strengths.length);
        const hasResults = subjectsFromResults.has(sub);
        const hasQuestions = subjectsFromQuestions.has(sub);
        return Boolean(hasSwot || hasResults || hasQuestions);
    };

    const renderSubjects = combined
        .filter(sub => subjectHasData(sub))
        .sort((a, b) => {
            const ia = DEFAULT_SUBJECT_ORDER.indexOf(a);
            const ib = DEFAULT_SUBJECT_ORDER.indexOf(b);
            if (ia === -1 && ib === -1) return a.localeCompare(b);
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
        });

    // Build a combined ordered list of pages: for each subject, subject page then its question pages
    const combinedPages = useMemo(() => {
        const pages = [];
        const subjects = renderSubjects || [];
        for (const subject of subjects) {
            pages.push({ type: 'subject', subject });
            const qpages = questionPagesBySubject[subject] || [];
            if (qpages.length) {
                for (let i = 0; i < qpages.length; i++) {
                    pages.push({ type: 'questions', subject, rows: qpages[i], pageIndexForSubject: i });
                }
            }
        }
        return pages;
    }, [renderSubjects, questionPagesBySubject]);

    // Quick failure / loading states
    if (error) {
        return <div className="p-8 text-center text-red-600">{error}</div>;
    }

    // Show loading only if testId exists but dashboard hasn't loaded yet
    if (testId && !dashboard && !dashboardLoaded) {
        return <div className="p-8 text-center text-gray-600">Generating teacher report...</div>;
    }

    // If no testId yet, show minimal loading
    if (!testId) {
        return <div className="p-8 text-center text-gray-600">Loading...</div>;
    }

    const summaryCards = dashboard?.summaryCardsData || [];

    // parsed test id for display and logic
    const parsedTestId = Number(testId);

    // (Moved earlier) renderSubjects is computed above to avoid TDZ.

    return (
        <>
            <style>{`@media print {
                /* A4 with inner padding so content doesn't get clipped by printer margins */
                /* Avoid inserting a blank page at the end by only breaking after pages that are not the last one */
                .print-page { width:210mm; height:297mm; padding:1mm; box-sizing:border-box; page-break-inside:avoid; -webkit-print-color-adjust:exact; position:relative; }
                .print-page:not(:last-child) { page-break-after:always; }
                .page-content { display:flex; flex-direction:column; height:100%; max-height:295mm; }
                .page-body { flex: 1 1 auto; overflow: hidden; max-height:calc(295mm - 25px); padding-bottom:2mm; }
                .page-footer { flex-shrink:0; height:20px; text-align:center; font-size:10px; color:#9CA3AF; padding-top:2mm; }
                /* tighten some spacings for print */
                .print-page .border { border-color: #e5e7eb; }
            }
            /* small adjustments for screen preview so pages are visually separated */
            @media screen {
                .print-page { page-break-after:always; }
            }
            `}</style>

            <div className="min-h-screen bg-white">
                {/* SVG patterns for print-friendly fills (match Report.jsx theme) */}
                <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
                    <defs>
                        <pattern id="pattern-total" patternUnits="userSpaceOnUse" width="6" height="6">
                            <rect width="6" height="6" fill="#ffffff" />
                            {/* Dense diagonal hatch for total bars */}
                            <path d="M0,5 L5,0" stroke="#000" strokeWidth="0.3" />
                            <path d="M1,6 L6,1" stroke="#000" strokeWidth="0.3" />
                        </pattern>
                    </defs>
                </svg>

                <div className="max-w-4xl mx-auto font-sans text-gray-900 bg-white">


                    {/* Render combined pages: each subject page followed by its question-analysis pages */}
                    {combinedPages.map((page, globalIdx) => {
                        if (page.type === 'subject') {
                            const subject = page.subject;
                            const chartEntry = subjectCharts.find(s => s.subject === subject) || { data: [], yAxis: { max: 100, ticks: [50, 100] } };
                            const { data, yAxis } = chartEntry;
                            const thisDonutData = subjectDonutMap[subject] || [];
                            const averageLineValue = data && data.length ? data.reduce((s, d) => s + Number(d.averageScore || 0), 0) / data.length : null;
                            const buckets = subjectData[subject] || { weaknesses: [], strengths: [] };

                            return (
                                <div key={`subject-${subject}-${globalIdx}`} className="print-page">
                                    <div className="page-content">
                                        <div className="page-body space-y-4">
                                            <div className="flex justify-between items-center px-6 py-4 border border-gray-200 rounded-xl">
                                                <div>
                                                    <h1 className="text-3xl font-bold text-gray-800">Teacher Report - {subject}</h1>
                                                    <p className="text-sm text-gray-400">
                                                        powered by <span className="text-lg font-bold text-gray-800">Inzight</span>
                                                        <span className="text-lg font-bold text-gray-800">Ed</span>
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-500">Test Num: {Number.isNaN(parsedTestId) ? (testId || 'Overall') : (parsedTestId === 0 ? 'Overall' : parsedTestId)}</p>
                                                    <p className="text-sm font-medium text-gray-700">Classroom: {classroomName || educatorInfo?.class_id || educatorInfo?.name || 'Loading...'}</p>
                                                </div>
                                            </div>

                                            <div>
                                                <h4 className="text-lg font-semibold mb-3 text-gray-800 uppercase">{`Student Performance Overview`}</h4>
                                                <div className="flex gap-3">
                                                    <div className="flex-1 border border-gray-200 bg-white p-2 rounded-lg overflow-hidden">
                                                        <div>
                                                            {data && data.length ? (
                                                                <div className="flex">
                                                                    <div className="flex-1 overflow-hidden">
                                                                        <div className="flex justify-end items-center gap-2">
                                                                            {averageLineValue != null && (
                                                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                                    <span>{`Avg: ${averageLineValue.toFixed(1)}`}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <ResponsiveContainer width="75%" height={260}>
                                                                            <LineChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 10 }}>
                                                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                                                {averageLineValue != null && (
                                                                                    <ReferenceLine
                                                                                        y={Number(averageLineValue.toFixed(2))}
                                                                                        stroke="#9CA3AF"
                                                                                        strokeDasharray="4 4"
                                                                                        strokeWidth={1}
                                                                                        strokeOpacity={0.9}
                                                                                    />
                                                                                )}
                                                                                <XAxis dataKey="testNum" stroke="#9CA3AF" padding={{ left: 10, right: 0 }} interval="preserveStartEnd" tickMargin={6} tick={{ fontSize: 12 }} label={{ position: 'insideBottom', offset: -5, fontSize: 14 }} />
                                                                                <YAxis stroke="#9CA3AF" domain={[0, yAxis?.max ?? 100]} ticks={yAxis?.ticks ?? [50, 100]} tick={{ fontSize: 12 }} label={{ angle: -90, position: 'insideLeft', fontSize: 14 }} />
                                                                                <Tooltip />
                                                                                <Line type="monotone" dataKey="averageScore" stroke="#9CA3AF" strokeWidth={2} dot={{ r: 1, fill: "#9CA3AF" }} isAnimationActive={false} animationDuration={0}>
                                                                                    <LabelList dataKey="averageScore" position="top" fill="#000000" fontSize={12} formatter={(value) => (value != null && value !== '' ? Number(value).toFixed(1) : '')} />
                                                                                </Line>
                                                                            </LineChart>
                                                                        </ResponsiveContainer>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-center h-full text-gray-400 italic">No data available for {subject}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="w-64 border border-gray-200 bg-white p-4 rounded-lg">
                                                        {thisDonutData && thisDonutData.length ? (
                                                            <>
                                                                <ResponsiveContainer width="100%" height={160}>
                                                                    <PieChart>
                                                                        <Pie
                                                                            data={thisDonutData}
                                                                            cx="50%"
                                                                            cy="50%"
                                                                            innerRadius={50}
                                                                            outerRadius={80}
                                                                            dataKey="value"
                                                                            labelLine={false}
                                                                            isAnimationActive={false}
                                                                        >
                                                                            {thisDonutData.map((entry, index) => (
                                                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                                                            ))}
                                                                        </Pie>
                                                                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="#374151" fontWeight="500">Class Avg</text>
                                                                        <Tooltip formatter={(value) => [Number(value).toFixed(1), 'Average']} />
                                                                    </PieChart>
                                                                </ResponsiveContainer>

                                                                <div className="mt-2">
                                                                    {(() => {
                                                                        const total = thisDonutData.reduce((s, d) => s + (Number(d.value) || 0), 0) || 0;
                                                                        return (
                                                                            <div className="flex flex-col gap-4 text-sm text-gray-800 pt-6">
                                                                                {thisDonutData.map((d, i) => (
                                                                                    <div key={d.name} className="flex items-center justify-between">
                                                                                        <div className="flex items-center gap-2">
                                                                                            <svg width="16" height="16" aria-hidden>
                                                                                                <rect width="16" height="16" fill={d.color} />
                                                                                            </svg>
                                                                                            <span className="font-medium">{d.name}</span>
                                                                                        </div>
                                                                                        <div className="text-right text-gray-600">
                                                                                            <div className="text-sm">{total ? ((Number(d.value) / total) * 100).toFixed(0) : 0}%</div>
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center justify-center h-48 text-gray-400 italic">No data</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {parsedTestId === 0 && (
                                                <div className="text-sm italic text-gray-500">* The above donut chart shows data only from the last uploaded test</div>
                                            )}
                                            <div>
                                                <h3 className="text-lg font-semibold mb-3 text-gray-800 uppercase">AI Generated Tips</h3>
                                                <div className="border border-gray-200 bg-white p-6 rounded-lg space-y-6 mb-2">
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded-sm"></div>
                                                            <h4 className="font-semibold text-sm text-gray-700">Focus Zone</h4>
                                                        </div>
                                                        <ul className="space-y-2 text-sm ml-5">
                                                            {buckets.weaknesses.length ? (
                                                                buckets.weaknesses.map((topic, idx) => (
                                                                    <li key={idx} className="text-gray-600 relative before:content-['•'] before:absolute before:-left-4 before:text-gray-400 before:font-bold">
                                                                        {topic}
                                                                    </li>
                                                                ))
                                                            ) : (
                                                                <li className="italic text-gray-400 text-sm">No areas need focus</li>
                                                            )}
                                                        </ul>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded-sm"></div>
                                                            <h4 className="font-semibold text-sm text-gray-700">Steady Zone</h4>
                                                        </div>
                                                        <ul className="space-y-2 text-sm ml-5">
                                                            {buckets.strengths.length ? (
                                                                buckets.strengths.map((topic, idx) => (
                                                                    <li key={idx} className="text-gray-600 relative before:content-['•'] before:absolute before:-left-4 before:text-gray-400 before:font-bold">
                                                                        {topic}
                                                                    </li>
                                                                ))
                                                            ) : (
                                                                <li className="italic text-gray-400 text-sm">No established strengths</li>
                                                            )}
                                                        </ul>
                                                    </div>
                                                </div>
                                                {/* Top Severity Questions for this subject */}
                                                <div>
                                                    <h3 className="text-lg font-semibold mb-3 text-gray-800 uppercase">Top Severity Questions</h3>
                                                    {Array.isArray(topSeverityBySubject[subject]) && topSeverityBySubject[subject].length ? (
                                                        (() => {
                                                            const list = topSeverityBySubject[subject];
                                                            const mid = Math.ceil(list.length / 2);
                                                            const left = list.slice(0, mid);
                                                            const right = list.slice(mid);
                                                            return (
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    {/* Left column */}
                                                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                                        <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600">
                                                                            <div className="col-span-2">Q.No</div>
                                                                            <div className="col-span-5 text-center">Severity %</div>
                                                                            <div className="col-span-5 text-center">Severity Level</div>
                                                                        </div>
                                                                        {left.map((q) => (
                                                                            <div key={`TS-L-${subject}-${q.question_number}`} className="grid grid-cols-12 px-4 py-3 text-xs border-t border-gray-200">
                                                                                <div className="col-span-2 font-semibold text-gray-800">{q.question_number}</div>
                                                                                <div className="col-span-5 text-center text-gray-800">{typeof q.severity === 'number' ? `${Number(q.severity).toFixed(1)}%` : '0.0%'}</div>
                                                                                <div className="col-span-5 text-center text-gray-800">{getSeverityLevel(q.severity)}</div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    {/* Right column */}
                                                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                                        <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600">
                                                                            <div className="col-span-2">Q.No</div>
                                                                            <div className="col-span-5 text-center">Severity %</div>
                                                                            <div className="col-span-5 text-center">Severity Level</div>
                                                                        </div>
                                                                        {right.map((q) => (
                                                                            <div key={`TS-R-${subject}-${q.question_number}`} className="grid grid-cols-12 px-4 py-3 text-xs border-t border-gray-200">
                                                                                <div className="col-span-2 font-semibold text-gray-800">{q.question_number}</div>
                                                                                <div className="col-span-5 text-center text-gray-800">{typeof q.severity === 'number' ? `${Number(q.severity).toFixed(1)}%` : '0.0%'}</div>
                                                                                <div className="col-span-5 text-center text-gray-800">{getSeverityLevel(q.severity)}</div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()
                                                    ) : (
                                                        <div className="border border-gray-200 rounded-lg overflow-hidden px-4 py-6 text-sm text-gray-500 italic">No question-wise severity available</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="page-footer">Generated by InzightEd — Page {globalIdx + 1} of {combinedPages.length}</div>
                                    </div>
                                </div>
                            );
                        }

                        // question pages for a subject
                        if (page.type === 'questions') {
                            const subject = page.subject;
                            const rows = page.rows || [];
                            const isEmpty = !rows.length;
                            const firstPageForSubject = page.pageIndexForSubject === 0;

                            const leftRows = rows.slice(0, ROWS_PER_COLUMN);
                            const rightRows = rows.slice(ROWS_PER_COLUMN, ROWS_PER_COLUMN * 2);

                            return (
                                <div key={`q-${subject}-${page.pageIndexForSubject}-${globalIdx}`} className="print-page">
                                    <div className="page-content">
                                        <div className="page-body space-y-6">
                                            {firstPageForSubject && (
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <h1 className="text-3xl font-bold text-gray-800">Question-wise Analysis: {subject}</h1>
                                                    </div>
                                                </div>
                                            )}

                                            {isEmpty ? (
                                                <div className="border border-gray-200 rounded-lg overflow-hidden px-4 py-6 text-sm text-gray-500 italic">Question-wise data is not available for this subject.</div>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-4">
                                                    {/* Left column */}
                                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                        <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600">
                                                            <div className="col-span-2">Q.No</div>
                                                            <div className="col-span-5 text-center">Severity %</div>
                                                            <div className="col-span-5 text-center">Severity Level</div>
                                                        </div>
                                                        {leftRows.map((r) => (
                                                            <div key={`L-${r.question_number}`} className="grid grid-cols-12 px-4 py-3 text-xs border-t border-gray-200">
                                                                <div className="col-span-2 font-semibold text-gray-800">{r.question_number}</div>
                                                                <div className="col-span-5 text-center text-gray-800">{typeof r.severity === 'number' ? `${Number(r.severity).toFixed(1)}%` : '0.0%'}</div>
                                                                <div className="col-span-5 text-center text-gray-800">{getSeverityLevel(r.severity)}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {/* Right column */}
                                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                                        <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600">
                                                            <div className="col-span-2">Q.No</div>
                                                            <div className="col-span-5 text-center">Severity %</div>
                                                            <div className="col-span-5 text-center">Severity Level</div>
                                                        </div>
                                                        {rightRows.map((r) => (
                                                            <div key={`R-${r.question_number}`} className="grid grid-cols-12 px-4 py-3 text-xs border-t border-gray-200">
                                                                <div className="col-span-2 font-semibold text-gray-800">{r.question_number}</div>
                                                                <div className="col-span-5 text-center text-gray-800">{typeof r.severity === 'number' ? `${Number(r.severity).toFixed(1)}%` : '0.0%'}</div>
                                                                <div className="col-span-5 text-center text-gray-800">{getSeverityLevel(r.severity)}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="page-footer">Generated by InzightEd — Page {globalIdx + 1} of {combinedPages.length}</div>
                                    </div>
                                </div>
                            );
                        }

                        return null;
                    })}

                    {/* Combined pages render handles question pages per-subject; no global question pages block needed */}


                </div>
            </div>
        </>
    );
}
