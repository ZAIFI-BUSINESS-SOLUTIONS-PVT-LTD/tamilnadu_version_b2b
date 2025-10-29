import { useEffect, useState } from "react";
import { getEducatorDashboardData, fetchEducatorSWOT } from "../../utils/api";

// --- SWOT helpers (copied from Report.jsx) ---
const metricToCategoryMap = {
    TS_BPT: { category: 'Strengths', subtitle: 'Best Performing Topics' },
    TW_MCT: { category: 'Weaknesses', subtitle: 'Most Challenging Topics' },
    TO_RLT: { category: 'Opportunities', subtitle: 'Rapid Learning Topics' },
    TT_WHIT: { category: 'Threats', subtitle: 'Weakness on High Impact Topics' },
};
function formatTopics(topics) {
    return Array.isArray(topics) && topics.length ? topics.join('\n') : 'No data available';
}
function transformSwotData(rawData) {
    if (!rawData || typeof rawData !== 'object') return { Strengths: [], Weaknesses: [], Opportunities: [], Threats: [] };
    const organized = { Strengths: [], Weaknesses: [], Opportunities: [], Threats: [] };
    const primaryMetrics = {
        Strengths: 'TS_BPT',
        Weaknesses: 'TW_MCT',
        Opportunities: 'TO_RLT',
        Threats: 'TT_WHIT',
    };
    for (const [category, metric] of Object.entries(primaryMetrics)) {
        const subjectMap = rawData[metric];
        if (subjectMap && typeof subjectMap === 'object') {
            for (const [subject, topics] of Object.entries(subjectMap)) {
                organized[category].push({
                    subject,
                    topics: Array.isArray(topics) ? topics : [],
                    subtitle: metricToCategoryMap[metric]?.subtitle,
                });
            }
        }
    }
    return organized;
}
function getSwotSubtitle(category) {
    switch (category) {
        case 'Strengths': return 'Best Performing Topics';
        case 'Weaknesses': return 'Most Challenging Topics';
        case 'Opportunities': return 'Rapid Learning Topics';
        case 'Threats': return 'Weakness on High Impact Topics';
        default: return '';
    }
}
const SWOT_COLORS = {
    Strengths: {
        border: "border-green-300",
        title: "text-green-700",
    },
    Weaknesses: {
        border: "border-red-300",
        title: "text-red-700",
    },
    Opportunities: {
        border: "border-yellow-300",
        title: "text-yellow-700",
    },
    Threats: {
        border: "border-purple-300",
        title: "text-purple-700",
    },
};

export default function TeacherReport() {
    const [dashboard, setDashboard] = useState(null);
    const [swot, setSwot] = useState(null);
    const [error, setError] = useState(null);
    const [testId, setTestId] = useState(null);

    useEffect(() => {
        // Get testId from URL query params
        const query = new URLSearchParams(window.location.search);
        const test = query.get("testId");
        setTestId(test);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const dash = await getEducatorDashboardData(testId);
                setDashboard(dash);
                setError(null);
            } catch (err) {
                setError("Failed to load teacher report data");
            } finally {
                // Set PDF_READY after dashboard attempt
                if (typeof window !== 'undefined') window.__PDF_READY__ = true;
            }
        };
        if (testId) fetchData();
    }, [testId]);

    useEffect(() => {
        const fetchSwot = async () => {
            if (!testId) return;
            try {
                const swotData = await fetchEducatorSWOT(testId);
                setSwot(swotData.swot ? transformSwotData(swotData.swot) : transformSwotData(swotData));
            } catch {
                setSwot(null);
            }
        };
        if (testId) fetchSwot();
    }, [testId]);

    if (error) {
        if (typeof window !== 'undefined') window.__PDF_READY__ = true;
        return <div className="p-8 text-center text-red-600">{error}</div>;
    }
    if (!dashboard) return <div className="p-8 text-center text-gray-600">Generating teacher report...</div>;

    // Summary cards
    const summaryCards = dashboard?.summaryCardsData || [];

    return (
        <div className="min-h-screen bg-blue-50">
            <div className="max-w-4xl mx-auto font-sans text-blue-900 bg-white p-8 space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-6 border border-blue-200 rounded-xl shadow-md">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Teacher Report</h1>
                        <p className="text-sm text-gray-400">powered by <span className="text-xl font-bold text-gray-800">Inzight</span><span className="text-xl font-bold text-blue-500">Ed</span></p>
                    </div>
                </div>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {summaryCards.map((card, idx) => (
                        <div key={idx} className="flex flex-col items-center border border-blue-200 bg-blue-100 p-3 rounded-lg">
                            <span className="text-sm text-blue-700">{card.title}</span>
                            <span className="text-2xl font-bold text-blue-900">{card.value}</span>
                        </div>
                    ))}
                </div>
                {/* SWOT Analysis */}
                {testId && swot && (
                    <div>
                        <h2 className="text-xl font-bold text-center mt-10 mb-10">SWOT Analysis</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {['Strengths', 'Weaknesses', 'Opportunities', 'Threats'].map((type) => (
                                <div
                                    key={type}
                                    className={`border ${SWOT_COLORS[type].border} bg-white p-4 rounded-lg shadow-md`}
                                >
                                    <h3 className={`font-bold mb-2 text-sm uppercase ${SWOT_COLORS[type].title}`}>
                                        {type} ({getSwotSubtitle(type)})
                                    </h3>
                                    <ul className="list-disc list-inside text-sm space-y-1">
                                        {swot[type]?.length ? (
                                            swot[type].map((item, idx) => (
                                                <li key={idx} className="text-gray-700">
                                                    <strong>{item.subject}:</strong>
                                                    <span className="whitespace-pre-wrap block ml-2">{formatTopics(item.topics)}</span>
                                                </li>
                                            ))
                                        ) : (
                                            <li className="italic text-gray-400">No data</li>
                                        )}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="text-center text-xs text-gray-400 pt-6 mt-6">Generated by InzightEd</div>
            </div>
        </div>
    );
}
