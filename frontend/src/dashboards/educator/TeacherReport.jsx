import { useEffect, useState, useMemo } from "react";
import { getEducatorDashboardData, fetchEducatorSWOT, fetchEducatorAllStudentResults, fetcheducatordetail, fetchInstitutionTeacherDashboard, fetchInstitutionTeacherSWOT, fetchInstitutionAllStudentResults, fetchInstitutionTestStudentPerformance } from "../../utils/api";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, ReferenceLine, PieChart, Pie, Cell } from "recharts";
import { useUserData } from '../components/hooks/z_header/z_useUserData.js';

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

const DEFAULT_SUBJECT_ORDER = ["Physics", "Chemistry", "Biology", "Botany", "Zoology"];

export default function TeacherReport() {
    const [dashboard, setDashboard] = useState(null);
    const [swot, setSwot] = useState(null);
    const [error, setError] = useState(null);
    const [testId, setTestId] = useState(null);
    const [educatorId, setEducatorId] = useState(null);
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

    // If the header values are missing, log the payloads so the user can share the schema
    useEffect(() => {
        const missing = !classroomName || !institutionName;
        if (missing) {
            console.log('[TeacherReport] Header fields missing. educatorInfo schema:', educatorInfo);
            console.log('[TeacherReport] Dashboard schema:', dashboard);
            console.log('[TeacherReport] Sample studentResults (first 3):', studentResults.slice(0, 3));
        }
    }, [classroomName, institutionName, educatorInfo, dashboard, studentResults]);

    // Log normalized results sample when available for debugging
    useEffect(() => {
        if (normalizedResults && normalizedResults.length) {
            console.log('[TeacherReport] Normalized studentResults sample (first 3):', normalizedResults.slice(0, 3));
        }
    }, [classroomName, institutionName, educatorInfo, dashboard, studentResults]);

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
    // Extract testId and educatorId from query params once on mount
    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        const extractedTestId = query.get("testId");
        const extractedEducatorId = query.get("educatorId");
        console.log('[TeacherReport] URL Parameters:', {
            extractedTestId,
            extractedEducatorId,
            fullSearch: window.location.search
        });
        setTestId(extractedTestId);
        setEducatorId(extractedEducatorId);
    }, []);

    // Check if this is institution view
    const isInstitutionView = !!educatorId;

    // Unified data fetch for dashboard, SWOT and student results
    useEffect(() => {
        if (!testId) return;

        let mounted = true;
        console.log('[TeacherReport] Fetching all report data...', { testId, isInstitutionView });

        const fetchAllData = async () => {
            try {
                // Dashboard
                let dash;
                if (isInstitutionView) {
                    dash = await fetchInstitutionTeacherDashboard(educatorId, testId);
                } else {
                    dash = { summaryCardsData: [] };
                }

                if (!mounted) return;
                setDashboard(dash);

                // SWOT
                let swotData;
                if (isInstitutionView) {
                    swotData = await fetchInstitutionTeacherSWOT(educatorId, testId);
                } else {
                    try {
                        swotData = await fetchEducatorSWOT(testId);
                    } catch (err) {
                        console.warn('[TeacherReport] SWOT data not available, will skip:', err);
                        swotData = null;
                    }
                }
                if (!mounted) return;
                const raw = swotData && swotData.swot ? swotData.swot : swotData;
                setSwot(transformSwotData(raw));

                // Student results
                let results;
                if (isInstitutionView) {
                    results = await fetchInstitutionAllStudentResults();
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
                console.log("Normalized student results array (length=" + arr.length + "):", arr);
                setStudentResults(arr);

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
                        const perf = await fetchInstitutionTestStudentPerformance(educatorId, parsedTestNum);
                        if (!mounted) return;
                        if (perf && !perf.error) {
                            setTestPerformance(perf);
                        } else {
                            setTestPerformance(null);
                            console.warn('[TeacherReport] testPerformance not available:', perf?.error);
                        }
                    } else {
                        setTestPerformance(null);
                    }
                } else {
                    setTestPerformance(null);
                }

                setError(null);
            } catch (err) {
                console.error('[TeacherReport] Error fetching report data:', err);
                // Keep partial data where possible; surface an error message for debugging
                setError(err.message || 'Failed to load teacher report data');
            } finally {
                // Always mark ready for PDF generation (matches StudentReport pattern)
                if (typeof window !== 'undefined') {
                    console.log('[TeacherReport] Setting __PDF_READY__ (finally)');
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
    }, [testId, educatorId, isInstitutionView]);

    // Set __PDF_READY__ flag only when all data is loaded OR if there's an error
    useEffect(() => {
        if (dashboardLoaded && swotLoaded && resultsLoaded) {
            console.log('[TeacherReport] All data loaded, setting __PDF_READY__');
            if (typeof window !== 'undefined') {
                window.__PDF_READY__ = true;
            }
        }
    }, [dashboardLoaded, swotLoaded, resultsLoaded]);

    // Also set __PDF_READY__ on error to prevent PDF service timeout
    useEffect(() => {
        if (error) {
            console.log('[TeacherReport] Error occurred, setting __PDF_READY__');
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

        const subjects = Object.keys(data);
        // If Botany/Zoology are missing but Biology exists in SWOT, copy Biology buckets
        // into Botany and Zoology so the report can render those subject pages.
        if (!data['Botany'] && !data['Zoology'] && data['Biology']) {
            data['Botany'] = { ...data['Biology'] };
            data['Zoology'] = { ...data['Biology'] };
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

        Object.keys({ Physics:1, Chemistry:1, Biology:1, Botany:1, Zoology:1 }).forEach((subject) => {
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

    // Debug logging to help diagnose empty charts
    useEffect(() => {
        try {
            const parsedTestIdLocal = Number(testId);
            console.log('[TeacherReport] Debug:', {
                testId,
                parsedTestId: parsedTestIdLocal,
                normalizedCount: normalizedResults?.length ?? 0,
                chartDataSample: chartData && chartData.length ? chartData.slice(0, 5) : [],
                subjectChartsSummary: Array.isArray(subjectCharts) ? subjectCharts.map(s => ({ subject: s.subject, points: (s.data || []).length })) : subjectCharts,
            });
        } catch (e) {
            console.warn('[TeacherReport] Debug log failed', e);
        }
    }, [testId, normalizedResults, chartData, subjectCharts]);

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

                return {
                    question_number: qn,
                    question_text: q?.question_text ?? '',
                    correct,
                    incorrect,
                    unattempted,
                    totalStudents,
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

    // Determine which subjects to render in teacher report pages.
    // Prefer subjects found in SWOT (`sortedSubjectList`) or default order, but
    // only render a subject if there is actual data to show (chart/donut/SWOT topics).
    // detect which subjects have result data (use normalizedResults for consistency)
    const subjectsFromResults = new Set();
    let _hasBio = false, _hasBot = false, _hasZoo = false;
    normalizedResults.forEach(r => {
        if (!r) return;
        if ((r.bio_total || r.bio_score) != null) { subjectsFromResults.add('Biology'); _hasBio = true; }
        if ((r.phy_total || r.phy_score) != null) subjectsFromResults.add('Physics');
        if ((r.chem_total || r.chem_score) != null) subjectsFromResults.add('Chemistry');
        if ((r.bot_total || r.bot_score) != null) { subjectsFromResults.add('Botany'); _hasBot = true; }
        if ((r.zoo_total || r.zoo_score) != null) { subjectsFromResults.add('Zoology'); _hasZoo = true; }
    });

    // If Botany and Zoology data are not present but Biology is, treat Botany and Zoology
    // as present by deriving them from Biology so the report still shows subject pages.
    if (!_hasBot && !_hasZoo && _hasBio) {
        subjectsFromResults.add('Botany');
        subjectsFromResults.add('Zoology');
    }

    const baseSubjects = (sortedSubjectList && sortedSubjectList.length) ? sortedSubjectList.slice() : DEFAULT_SUBJECT_ORDER.slice();
    const combined = Array.from(new Set([...baseSubjects, ...Array.from(subjectsFromResults)]));

    // Filter subjects: only render subjects that have SWOT topics present.
    // If a subject's SWOT is missing, hide the whole subject section.
    // Render a subject if it has result data OR SWOT topics
    // Special handling: treat `Biology` vs (`Botany` + `Zoology`) as exclusive.
    // - If both Botany and Zoology are present, skip Biology.
    // - If Biology is present, skip Botany and Zoology.
    // Determine which subjects actually have data (either results or SWOT topics).
    const subjectHasData = (sub) => {
        const buckets = subjectData[sub] || { weaknesses: [], strengths: [] };
        const hasSwot = (Array.isArray(buckets.weaknesses) && buckets.weaknesses.length) || (Array.isArray(buckets.strengths) && buckets.strengths.length);
        const hasResults = subjectsFromResults.has(sub);
        return Boolean(hasSwot || hasResults);
    };

    const hasBiologyData = subjectHasData('Biology');
    const hasBotanyData = subjectHasData('Botany');
    const hasZoologyData = subjectHasData('Zoology');

    const renderSubjects = combined.filter(sub => {
        // exclusive grouping rules should consider only subjects that actually have data.
        // If both Botany and Zoology have data, prefer showing them and hide Biology.
        if (sub === 'Biology' && hasBotanyData && hasZoologyData) return false;

        return subjectHasData(sub);
    });

    // Debug: expose why subjects are rendered or hidden (helps diagnose missing Botany/Zoology)
    try {
        console.log('[TeacherReport] Subject rendering debug:', {
            subjectDataKeys: Object.keys(subjectData || {}),
            subjectsFromResults: Array.from(subjectsFromResults),
            combined,
            hasBiologyData,
            hasBotanyData,
            hasZoologyData,
            renderSubjects,
        });
    } catch (e) {
        // swallow logging errors in non-browser environments
    }

    // Page counts for print pagination: subject pages + question pages (at least 1 page reserved for question section)
    const subjectPagesCount = (Array.isArray(renderSubjects) ? renderSubjects.length : 0);
    const questionCountPages = (questionPages && questionPages.length) ? questionPages.length : 1;
    const totalPages = subjectPagesCount + questionCountPages;

    return (
        <>
            <style>{`@media print {
                /* A4 with inner padding so content doesn't get clipped by printer margins */
                /* Avoid inserting a blank page at the end by only breaking after pages that are not the last one */
                .print-page { width:210mm; height:297mm; padding:2mm; box-sizing:border-box; page-break-inside:avoid; -webkit-print-color-adjust:exact; }
                .print-page:not(:last-child) { page-break-after:always; }
                .page-content { display:flex; flex-direction:column; height:100%; justify-content:space-between; }
                .page-body { flex: 1 1 auto; overflow: hidden; }
                .page-footer { text-align:center; font-size:10px; color:#9CA3AF; }
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

                <div className="max-w-4xl mx-auto font-sans text-gray-900 bg-white p-8 space-y-6">


                    {/* Grouped subject sections: header, subject chart, then FES card (one subject at a time) */}
                    {renderSubjects.map((subject, idx) => {
                        const chartEntry = subjectCharts.find(s => s.subject === subject) || { data: [], yAxis: { max: 100, ticks: [50, 100] } };
                        const { data, yAxis } = chartEntry;
                        const thisDonutData = subjectDonutMap[subject] || [];
                        const averageLineValue = data && data.length ? data.reduce((s, d) => s + Number(d.averageScore || 0), 0) / data.length : null;
                        const buckets = subjectData[subject] || { weaknesses: [], strengths: [] };
                        return (
                            <div key={subject} className="print-page">
                                <div className="page-content">
                                    <div className="page-body space-y-8">
                                        {/* Header for the subject group */}
                                        <div className="flex justify-between items-center px-6 py-6 border border-gray-200 rounded-xl">
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
                                        {/* Subject performance chart */}
                                        <div>
                                            <h4 className="text-lg font-semibold mb-3 text-gray-800 uppercase">{`Student Performance Overview`}</h4>
                                            <div className="flex gap-4">
                                                <div className="flex-1 border border-gray-200 bg-white p-2 rounded-lg">
                                                    <div className="pb-6">
                                                        {data && data.length ? (
                                                            <div className="flex">
                                                                <div className="flex-1">
                                                                    <div className="flex justify-end items-center gap-4 mb-2">
                                                                        {averageLineValue != null && (
                                                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                                                <span>{`Avg: ${averageLineValue.toFixed(1)}`}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <ResponsiveContainer width="100%" height={260}>
                                                                        <LineChart data={data} margin={{ top: 20, right: 60, left: 30, bottom: 5 }}>
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
                                                                            <XAxis dataKey="testNum" stroke="#9CA3AF" padding={{ left: 20, right: 20 }} interval={0} tick={{ fontSize: 12 }} label={{ value: 'Test', position: 'insideBottom', offset: -5, fontSize: 14 }} />
                                                                            <YAxis stroke="#9CA3AF" domain={[0, yAxis?.max ?? 100]} ticks={yAxis?.ticks ?? [50, 100]} tick={{ fontSize: 12 }} label={{ value: 'Avg Score', angle: -90, position: 'insideLeft', fontSize: 14 }} />
                                                                            <Tooltip />
                                                                            {/* legend rendered externally above the chart */}
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

                                                            {/* Legend below the chart for print-friendly view */}
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

                                        {/* FES/ SWOT card for the subject */}
                                        {parsedTestId === 0 && (
                                            <div className="text-sm italic text-gray-500">* The above donut chart shows data only from the last uploaded test</div>
                                        )}
                                        <div>
                                            <h3 className="text-lg font-semibold mb-3 text-gray-800 uppercase">AI Generated Tips</h3>
                                            <div className="border border-gray-200 bg-white p-6 rounded-lg space-y-6 mb-32">
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

                                                {/* Edge Zone removed - only Focus and Steady zones shown */}

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
                                        </div>
                                    </div>

                                    <div className="page-footer">Generated by InzightEd — Page {idx + 1} of {totalPages}</div>
                                </div>
                            </div>

                        );
                    })}

                    {/* Question-wise analysis pages (after subject pages) */}
                    {questionPages.length > 0 && (
                        questionPages.map((rows, pageIdx) => (
                            <div key={`qwise-${pageIdx}`} className="print-page">
                                <div className="page-content">
                                    <div className="page-body space-y-6">
                                        {pageIdx === 0 && (
                                            <div className="flex justify-between items-center px-6 py-6 border border-gray-200 rounded-xl">
                                                <div>
                                                    <h1 className="text-3xl font-bold text-gray-800">Question-wise Analysis</h1>
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
                                        )}

                                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                                            <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600">
                                                <div className="col-span-1">Q.No</div>
                                                <div className="col-span-7">Question</div>
                                                <div className="col-span-1 text-center">Correct</div>
                                                <div className="col-span-1 text-center">Incorrect</div>
                                                <div className="col-span-2 text-center">Unattempted</div>
                                            </div>
                                            {rows.map((r) => (
                                                <div key={r.question_number} className="grid grid-cols-12 px-4 py-3 text-xs border-t border-gray-200">
                                                    <div className="col-span-1 font-semibold text-gray-800">{r.question_number}</div>
                                                    <div className="col-span-7 text-gray-700 line-clamp-2 whitespace-pre-wrap">{r.question_text || '—'}</div>
                                                    <div className="col-span-1 text-center text-gray-800">{r.correct}</div>
                                                    <div className="col-span-1 text-center text-gray-800">{r.incorrect}</div>
                                                    <div className="col-span-2 text-center text-gray-800">{r.unattempted}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="text-xs text-gray-500 italic">Unattempted includes missing response or blank selected answer.</div>
                                    </div>
                                    <div className="page-footer">Generated by InzightEd — Page {subjectPagesCount + pageIdx + 1} of {totalPages}</div>
                                </div>
                            </div>
                        ))
                    )}

                    {/* Show an informative message if endpoint isn't available */}
                    {isInstitutionView && questionPages.length === 0 && (
                        <div className="print-page">
                            <div className="page-content">
                                <div className="page-body space-y-6">
                                    <div className="flex justify-between items-center px-6 py-6 border border-gray-200 rounded-xl">
                                        <div>
                                            <h1 className="text-3xl font-bold text-gray-800">Question-wise Analysis</h1>
                                            <p className="text-sm text-gray-400">powered by <span className="text-lg font-bold text-gray-800">Inzight</span><span className="text-lg font-bold text-gray-800">Ed</span></p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-500">Test Num: {Number.isNaN(parsedTestId) ? (testId || 'Overall') : (parsedTestId === 0 ? 'Overall' : parsedTestId)}</p>
                                            <p className="text-sm font-medium text-gray-700">Classroom: {classroomName || educatorInfo?.class_id || educatorInfo?.name || 'Loading...'}</p>
                                        </div>
                                    </div>
                                    <div className="border border-gray-200 bg-white p-6 rounded-lg text-sm text-gray-500 italic">
                                        Question-wise data is not available for this selection.
                                    </div>
                                </div>
                                <div className="page-footer">Generated by InzightEd — Page {subjectPagesCount + 1} of {totalPages}</div>
                            </div>
                        </div>
                    )}


                </div>
            </div>
        </>
    );
}
