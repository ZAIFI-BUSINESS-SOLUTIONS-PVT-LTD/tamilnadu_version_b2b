import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '../../../components/ui/select.jsx';
import { Card } from '../../../components/ui/card.jsx';

// Register ChartJS components (safe to call multiple times)
ChartJS.register(ArcElement, Tooltip, Legend);

// Helper: derive subjects dynamically from subjectWiseDataMapping.
// Prefer a sensible canonical order when possible.
const getSubjectsFromMapping = (mapping = []) => {
  if (!Array.isArray(mapping) || mapping.length === 0) return [];
  const set = new Set();
  mapping.forEach((row) => {
    if (!row || typeof row !== 'object') return;
    if (Array.isArray(row.subjectDetails)) {
      row.subjectDetails.forEach((d) => {
        if (d?.name) set.add(String(d.name));
      });
      return;
    }
    Object.keys(row).forEach((k) => {
      if (k === 'Test') return;
      // flattened keys: Subject__correct etc.
      const m = k.match(/^(.+?)__(correct|incorrect|unattempted|skipped)$/);
      if (m && m[1]) set.add(m[1]);
      // totals key: Subject
      if (!k.includes('__') && typeof row[k] !== 'function') {
        // exclude metadata keys
        if (!['id', 'created_at', 'updated_at'].includes(k)) set.add(k);
      }
    });
  });

  const preferred = ['Physics', 'Chemistry', 'Botany', 'Zoology', 'Biology'];
  const rest = Array.from(set)
    .filter((s) => !preferred.includes(s))
    .sort((a, b) => a.localeCompare(b));
  return [...preferred.filter((p) => set.has(p)), ...rest];
};

// Helper: normalize a mapping row into an array of subjectDetails
// with { name, correct, incorrect, unattended, total }
const buildSubjectDetailsFromRow = (row = {}, subjects = []) => {
  // If subjects not provided, attempt to derive from row keys
  if (!subjects || !subjects.length) {
    subjects = getSubjectsFromMapping([row]);
  }

  // If the row already provides subjectDetails array, normalize each entry
  if (Array.isArray(row.subjectDetails)) {
    return row.subjectDetails.map((d) => ({
      name: d?.name ?? d?.subject ?? 'Unknown',
      correct: Number(d?.correct || 0),
      incorrect: Number(d?.incorrect || 0),
      unattended: Number(d?.unattended ?? d?.unattempted ?? d?.skipped ?? 0),
      total: Number(d?.total ?? d?.questions ?? 0)
    }));
  }

  // Detect flattened shape using provided subjects
  const looksLikeFlattened = subjects.some((s) => Object.prototype.hasOwnProperty.call(row, `${s}__correct`));
  if (looksLikeFlattened) {
    return subjects.map((s) => ({
      name: s,
      correct: Number(row[`${s}__correct`] || 0),
      incorrect: Number(row[`${s}__incorrect`] || 0),
      unattended: Number(row[`${s}__unattempted`] || row[`${s}__skipped`] || 0),
      total: Number(row[s] || 0)
    }));
  }

  // Fallback: totals per subject (no breakdown)
  return subjects.map((s) => ({
    name: s,
    correct: Number(row[`${s}__correct`] || 0),
    incorrect: Number(row[`${s}__incorrect`] || 0),
    unattended: Number(row[`${s}__unattempted`] || row[`${s}__skipped`] || 0),
    total: Number(row[s] || 0)
  }));
};

const computeBreakdown = ({
  mapping = [],
  selectedTest,
  selectedSubject
}) => {
  const safeMapping = Array.isArray(mapping) ? mapping : [];
  const tests = safeMapping.map((r) => r?.Test || 'Unknown Test');

  const normalizeTestKey = (v) => String(v || '').toLowerCase().replace(/\s+/g, '');

  // Support "Overall" test = aggregate across all tests
  const isOverallTest = String(selectedTest || '').toLowerCase() === 'overall';
  const testKey = (!selectedTest || selectedTest === '')
    ? (tests.length ? tests[tests.length - 1] : undefined)
    : selectedTest;

  const subjectsList = getSubjectsFromMapping(safeMapping);

  const rowsToUse = isOverallTest
    ? safeMapping
    : [
      // Prefer exact match, fall back to normalized match to handle "Test1" vs "Test 1".
      safeMapping.find((r) => (r?.Test || '') === testKey)
      || safeMapping.find((r) => normalizeTestKey(r?.Test) === normalizeTestKey(testKey))
      || {}
    ];

  let correct = 0;
  let incorrect = 0;
  let skipped = 0;

  const selectedSubName = selectedSubject || 'Overall';

  rowsToUse.forEach((row) => {
    const subjectDetails = buildSubjectDetailsFromRow(row, subjectsList);

    if (String(selectedSubName).toLowerCase() === 'overall') {
      subjectDetails.forEach((d) => {
        if (!d) return;
        correct += Number(d.correct || 0);
        incorrect += Number(d.incorrect || 0);
        skipped += Number(d.unattended ?? d.skipped ?? 0);
      });
      return;
    }

    const found = subjectDetails.find(
      (d) => d && (d.name === selectedSubName || d.name?.toLowerCase?.() === String(selectedSubName).toLowerCase())
    ) || {};

    correct += Number(found.correct || 0);
    incorrect += Number(found.incorrect || 0);
    skipped += Number(found.unattended ?? found.skipped ?? 0);
  });

  return { correct, incorrect, skipped, subjectsList, tests, defaultTest: testKey };
};

const QuestionBreakdownCard = ({
  subjectWiseDataMapping = [],
  selectedTest,
  setSelectedTest,
  selectedSubject,
  setSelectedSubject,
  showSelectors = true,
  title = 'Question Breakdown',
  subtitle = 'Correct / Incorrect / Skipped for selected test & subject'
}) => {
  const { correct, incorrect, skipped, subjectsList, tests, defaultTest } = React.useMemo(
    () => computeBreakdown({ mapping: subjectWiseDataMapping, selectedTest, selectedSubject }),
    [subjectWiseDataMapping, selectedTest, selectedSubject]
  );

  const hasData = correct || incorrect || skipped;

  const data = {
    labels: ['Correct', 'Incorrect', 'Skipped'],
    datasets: [{ data: [correct, incorrect, skipped], backgroundColor: ['#10B981', '#f97316', '#9CA3AF'] }]
  };

  const options = { maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } };

  const centerTextPlugin = {
    id: 'centerText',
    afterDraw: (chart) => {
      try {
        const { ctx } = chart;
        const meta = chart.getDatasetMeta(0);
        if (!meta?.data?.[0]) return;
        const x = meta.data[0].x;
        const y = meta.data[0].y;
        const total = (correct + incorrect + skipped) || 0;

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#111827';
        ctx.font = '600 18px ui-sans-serif, system-ui';
        ctx.fillText(String(total), x, y - 6);

        ctx.fillStyle = '#6B7280';
        ctx.font = '400 12px ui-sans-serif, system-ui';
        ctx.fillText('Questions', x, y + 12);
        ctx.restore();
      } catch (_) {
        // ignore draw errors
      }
    }
  };

  const effectiveSelectedTest = selectedTest || defaultTest || '';
  const effectiveSelectedSubject = selectedSubject || 'Overall';

  return (
    <Card className="h-full rounded-2xl border border-border bg-card flex flex-col items-start justify-start sm:p-0 p-2">
      <div className="w-full flex flex-col h-full p-3 sm:p-6 rounded-2xl">
        <div className="w-full flex flex-col sm:flex-row justify-between items-start mb-0.5 sm:mb-1">
          <div className="flex flex-col items-start justify-start gap-0">
            <h3 className="text-primary text-lg font-semibold">{title}</h3>
            <p className="text-gray-500 text-xs sm:text-sm mb-3 sm:mb-6">{subtitle}</p>
          </div>

          {showSelectors ? (
            <div className="hidden sm:block w-full">
              <div className="flex justify-end">
                <div className="w-fit">
                  <Select
                    onValueChange={(val) => {
                      if (setSelectedTest) setSelectedTest(val);
                      if (setSelectedSubject) setSelectedSubject('Overall');
                    }}
                    value={effectiveSelectedTest}
                  >
                    <SelectTrigger className="w-full max-w-full justify-between truncate text-start bg-white border-gray-200">
                      <SelectValue placeholder="Select Test" />
                    </SelectTrigger>
                    <SelectContent side="bottom" align="start">
                      {tests.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-fit ml-2">
                  <Select
                    onValueChange={(val) => setSelectedSubject && setSelectedSubject(val)}
                    value={effectiveSelectedSubject}
                  >
                    <SelectTrigger className="w-full max-w-full justify-between truncate text-start bg-white border-gray-200">
                      <SelectValue placeholder="Select Subject" />
                    </SelectTrigger>
                    <SelectContent side="bottom" align="start">
                      {['Overall', ...subjectsList].map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="w-full border border-bg-primary rounded-lg p-2 bg-white flex-1 min-h-[160px] sm:min-h-[220px] flex items-center justify-center">
          <div className="h-48 w-48 sm:h-56 sm:w-56">
            {hasData ? (
              <Doughnut data={data} options={options} plugins={[centerTextPlugin]} />
            ) : (
              <p className="text-xs text-gray-500 text-center">No question breakdown</p>
            )}
          </div>
        </div>

        <div className="w-full mt-3 grid grid-cols-3 gap-2">
          <div className="p-2">
            <div className="p-3 bg-white rounded-lg border border-green-600 text-center">
              <div className="text-xs text-gray-500">Correct Answers</div>
              <div className="mt-1 text-lg font-semibold text-green-600">{correct}</div>
            </div>
          </div>
          <div className="p-2">
            <div className="p-3 bg-white rounded-lg border border-orange-500 text-center">
              <div className="text-xs text-gray-500">Incorrect Answers</div>
              <div className="mt-1 text-lg font-semibold text-orange-500">{incorrect}</div>
            </div>
          </div>
          <div className="p-2">
            <div className="p-3 bg-white rounded-lg border border-gray-600 text-center">
              <div className="text-xs text-gray-500">Skipped Questions</div>
              <div className="mt-1 text-lg font-semibold text-gray-600">{skipped}</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default QuestionBreakdownCard;
export { getSubjectsFromMapping, buildSubjectDetailsFromRow };
