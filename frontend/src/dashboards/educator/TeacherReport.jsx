import { useEffect, useState, useMemo } from "react";
import { getEducatorDashboardData, fetchEducatorSWOT, fetchEducatorAllStudentResults, fetcheducatordetail, fetchInstitutionTeacherDashboard, fetchInstitutionTeacherSWOT, fetchInstitutionAllStudentResults } from "../../utils/api";
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

    // Fetch educator user data
    const { userData: educatorInfo, isLoading: isEducatorLoading } = useUserData(fetcheducatordetail, { name: '', inst: '' });

    // Extract testId and educatorId from query params once on mount
    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        setTestId(query.get("testId"));
        setEducatorId(query.get("educatorId"));
    }, []);

    // Check if this is institution view
    const isInstitutionView = !!educatorId;

    // Fetch dashboard data when we have a testId
    useEffect(() => {
        if (!testId) return;

        let mounted = true;
        (async () => {
            try {
                let dash;
                if (isInstitutionView) {
                    dash = await fetchInstitutionTeacherDashboard(educatorId, testId);
                } else {
                    dash = await getEducatorDashboardData(testId);
                }
                if (!mounted) return;
                setDashboard(dash);
                setError(null);
            } catch (err) {
                if (!mounted) return;
                setError("Failed to load teacher report data");
            } finally {
                if (typeof window !== "undefined") window.__PDF_READY__ = true;
            }
        })();

        return () => {
            mounted = false;
        };
    }, [testId, educatorId, isInstitutionView]);

    // Fetch SWOT data when we have a testId
    useEffect(() => {
        if (!testId) return;

        let mounted = true;
        (async () => {
            try {
                let swotData;
                if (isInstitutionView) {
                    swotData = await fetchInstitutionTeacherSWOT(educatorId, testId);
                } else {
                    swotData = await fetchEducatorSWOT(testId);
                }
                if (!mounted) return;
                // API may return an object with a `swot` key or the raw payload
                const raw = swotData && swotData.swot ? swotData.swot : swotData;
                setSwot(transformSwotData(raw));
            } catch (err) {
                if (!mounted) return;
                setSwot(null);
            }
        })();

        return () => {
            mounted = false;
        };
    }, [testId, educatorId, isInstitutionView]);

    // Fetch and normalize all student results data
    useEffect(() => {
        if (!testId) return;

        (async () => {
            try {
                let results;
                if (isInstitutionView) {
                    results = await fetchInstitutionAllStudentResults();
                } else {
                    results = await fetchEducatorAllStudentResults(testId);
                }
                // API may return an array or an object like { results: [...] }
                let arr = [];
                if (Array.isArray(results)) {
                    arr = results;
                } else if (results && Array.isArray(results.results)) {
                    arr = results.results;
                } else if (results && Array.isArray(results.data)) {
                    // some endpoints use `data` key
                    arr = results.data;
                }
                console.log("Normalized student results array (length=" + arr.length + "):", arr);
                setStudentResults(arr);
            } catch (err) {
                console.error("Failed to fetch student results:", err);
                setStudentResults([]);
            }
        })();
    }, [testId, educatorId, isInstitutionView]);
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
        const sorted = subjects.sort((a, b) => {
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
        if (!studentResults.length) return [];

        const grouped = {};
        studentResults.forEach(result => {
            const testNum = result.test_num;
            if (!grouped[testNum]) {
                grouped[testNum] = { total: 0, count: 0 };
            }
            grouped[testNum].total += result.total_score || 0;
            grouped[testNum].count += 1;
        });

        const sortedKeys = Object.keys(grouped).sort((a, b) => Number(a) - Number(b));
        return sortedKeys.map(testNum => ({
            testNum: `Test ${testNum}`,
            averageScore: Math.round((grouped[testNum].total / grouped[testNum].count) * 100) / 100, // round to 2 decimals
        }));
    }, [studentResults]);

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
        // mapping from display subject to field key in results
        const subjectFieldMap = {
            Physics: "phy_score",
            Chemistry: "chem_score",
            Biology: "bio_score",
            Botany: "bot_score",
            Zoology: "zoo_score",
        };

        // collect all test numbers present so each subject chart has the same x-axis categories
        const testNumsSet = new Set();
        studentResults.forEach(r => {
            if (r && (r.test_num != null)) testNumsSet.add(String(r.test_num));
        });
        const allTestNums = Array.from(testNumsSet).sort((a, b) => Number(a) - Number(b));
        // Determine relevant test numbers based on testId
        const parsed = Number(testId);
        let relevantTestNums;
        if (parsed === 0) {
            // Overall: show last 8 tests
            relevantTestNums = allTestNums.slice(-8);
        } else {
            // Specific test: include tests from 1 up to the parsed test number (1..N)
            relevantTestNums = allTestNums.filter(num => Number(num) <= parsed && Number(num) >= 1);
        }

        return DEFAULT_SUBJECT_ORDER.map(subject => {
            const key = subjectFieldMap[subject];
            // aggregate per test
            const grouped = {};
            studentResults.forEach(result => {
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
    }, [studentResults, testId]);

    // Compute donut chart data per-subject for class averages: correct, incorrect, skipped
    // This returns a map: { Physics: [{name,value,color}, ...], Chemistry: [...], ... }
    const subjectDonutMap = useMemo(() => {
        if (!studentResults.length) return {};

        // mapping prefix for subject-specific fields
        const prefixMap = {
            Physics: 'phy',
            Chemistry: 'chem',
            Biology: 'bio',
            Botany: 'bot',
            Zoology: 'zoo',
        };

        // collect test numbers present
        const testNumsSet = new Set();
        studentResults.forEach(r => {
            if (r && (r.test_num != null)) testNumsSet.add(String(r.test_num));
        });
        const allTestNums = Array.from(testNumsSet).sort((a, b) => Number(a) - Number(b));

        const parsed = Number(testId);
        let relevantTestNums;
        if (parsed === 0) {
            // For Overall, use the most recent test's data for donut charts
            relevantTestNums = allTestNums.length ? [allTestNums[allTestNums.length - 1]] : [];
        } else {
            relevantTestNums = allTestNums.includes(String(parsed)) ? [String(parsed)] : [];
        }

        // helper: select relevant results; fallback to all if none matched
        let relevant = studentResults.filter(r => relevantTestNums.includes(String(r.test_num)));
        if (!relevant.length) relevant = studentResults;

        const map = {};

        Object.entries(prefixMap).forEach(([subject, prefix]) => {
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
    }, [studentResults, testId]);

    // Quick failure / loading states
    if (error) {
        if (typeof window !== "undefined") window.__PDF_READY__ = true;
        return <div className="p-8 text-center text-red-600">{error}</div>;
    }

    if (!dashboard) {
        return <div className="p-8 text-center text-gray-600">Generating teacher report...</div>;
    }

    const summaryCards = dashboard?.summaryCardsData || [];

    // parsed test id for display and logic
    const parsedTestId = Number(testId);

    // Determine which subjects to render in teacher report pages.
    // Prefer subjects found in SWOT (`sortedSubjectList`) or default order, but
    // only render a subject if there is actual data to show (chart/donut/SWOT topics).
    const subjectsFromResults = new Set();
    studentResults.forEach(r => {
        if (!r) return;
        if ((r.bio_total || r.bio_score) != null) subjectsFromResults.add('Biology');
        if ((r.phy_total || r.phy_score) != null) subjectsFromResults.add('Physics');
        if ((r.chem_total || r.chem_score) != null) subjectsFromResults.add('Chemistry');
        if ((r.bot_total || r.bot_score) != null) subjectsFromResults.add('Botany');
        if ((r.zoo_total || r.zoo_score) != null) subjectsFromResults.add('Zoology');
    });

    const baseSubjects = (sortedSubjectList && sortedSubjectList.length) ? sortedSubjectList.slice() : DEFAULT_SUBJECT_ORDER.slice();
    const combined = Array.from(new Set([...baseSubjects, ...Array.from(subjectsFromResults)]));

    // Filter subjects: only render subjects that have SWOT topics present.
    // If a subject's SWOT is missing, hide the whole subject section.
    const renderSubjects = combined.filter(sub => {
        const buckets = subjectData[sub] || { weaknesses: [], strengths: [] };
        const hasSwot = (buckets.weaknesses && buckets.weaknesses.length) || (buckets.strengths && buckets.strengths.length);
        return Boolean(hasSwot);
    });

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
                    {renderSubjects.map((subject) => {
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
                                                <p className="text-sm font-medium text-gray-700">Batch: {educatorInfo?.name || 'Loading...'}</p>
                                                <p className="text-sm text-gray-500">Institute: {educatorInfo?.inst || 'Loading...'}</p>
                                                <p className="text-sm text-gray-500">Test Num: {Number.isNaN(parsedTestId) ? (testId || 'Overall') : (parsedTestId === 0 ? 'Overall' : parsedTestId)}</p>
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

                                    <div className="page-footer">Generated by InzightEd</div>
                                </div>
                            </div>

                        );
                    })}


                </div>
            </div>
        </>
    );
}
