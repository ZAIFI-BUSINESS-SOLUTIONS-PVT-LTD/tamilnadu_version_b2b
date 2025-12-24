import React from 'react';
import { CheckCircle, AlertCircle, Filter, Target, Atom, FlaskConical, Microscope, Leaf, PawPrint, User, ChevronDown, Mail, Phone } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { fetchInstitutionEducatorSWOT, fetchAvailableSwotTests_InstitutionEducator, getTeachersByClass } from '../../utils/api';
import LoadingPage from '../components/LoadingPage.jsx';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, } from '../../components/ui/select.jsx';
import { Button } from '../../components/ui/button.jsx';
import PropTypes from 'prop-types';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card.jsx';
import { useState, useEffect } from 'react';
import { useInstitution } from './index.jsx';

const PREFERRED_SUBJECT_ORDER = ['Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology'];

const useSwotData = (fetchSwotData, fetchAvailableTestsData, selectedEducatorId) => {
  const [selectedSubject, setSelectedSubject] = useState('Physics');
  const [selectedTest, setSelectedTest] = useState('');
  const [availableTests, setAvailableTests] = useState([]);
  const [swotData, setSwotData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedEducatorId) return;
    const loadAvailableTests = async () => {
      try {
        const tests = await fetchAvailableTestsData(selectedEducatorId);
        const uniqueTests = [...new Set(tests)];
        uniqueTests.sort((a, b) => {
          if (a === 0) return -1;
          if (b === 0) return 1;
          return b - a;
        });
        const formatted = uniqueTests.map((num) => num === 0 ? 'Overall' : `Test ${num}`);
        setAvailableTests(formatted);
        if (!selectedTest && formatted.length > 0) {
          setSelectedTest(formatted[0]);
        }
      } catch (error) {
        console.error('Error loading available tests:', error);
      }
    };

    loadAvailableTests();
  }, [fetchAvailableTestsData, selectedEducatorId, selectedTest]);

  useEffect(() => {
    if (!selectedTest && availableTests.length > 0) {
      setSelectedTest(availableTests[0]);
    }
  }, [availableTests, selectedTest]);

  useEffect(() => {
    if (!selectedTest || !selectedEducatorId) return;

    const fetchSwot = async () => {
      setLoading(true);
      try {
        let testNum;
        if (selectedTest === 'Overall') {
          testNum = 0;
        } else {
          const parsed = parseInt(selectedTest.split(' ')[1], 10);
          testNum = Number.isNaN(parsed) ? null : parsed;
        }
        if (testNum === null) {
          setSwotData({});
          setLoading(false);
          return;
        }
        const response = await fetchSwotData(selectedEducatorId, testNum);
        if (!response?.error && response?.swot) {
          const formatted = organizeSwotData(response.swot);
          setSwotData(formatted);
        } else {
          setSwotData({});
        }
      } catch (error) {
        console.error('Error fetching SWOT data:', error);
        setSwotData({});
      } finally {
        setLoading(false);
      }
    };

    fetchSwot();
  }, [selectedTest, fetchSwotData, selectedEducatorId]);

  const organizeSwotData = (rawData) => {
    const organized = {};
    for (const metric in rawData) {
      const subjectMap = rawData[metric];
      const [category, title, description] = metricToCategoryMap[metric] || [];
      if (!category) continue;

      for (const subject in subjectMap) {
        if (!organized[subject]) {
          organized[subject] = {
            Strengths: [],
            Weaknesses: [],
            Opportunities: [],
            Threats: [],
          };
        }
        organized[subject][category].push({
          title,
          description,
          topics: subjectMap[subject],
        });
      }
    }
    return organized;
  };

  return {
    selectedSubject,
    setSelectedSubject,
    selectedTest,
    setSelectedTest,
    availableTests,
    swotData,
    loading,
  };
};

const metricToCategoryMap = {
  TS_BPT: ['Strengths', 'Best Performing Topics', 'Areas where the student excels:'],
  TS_IOT: ['Strengths', 'Improvement Over Time', 'Topics showing noticeable progress:'],
  TS_SQT: ['Strengths', 'Strongest Question Types', 'Excels in answering specific types of questions:'],
  TW_MCT: ['Weaknesses', 'Most Challenging Topics', 'Topics where the student has struggled:'],
  TW_WOT: ['Weaknesses', 'Weakness Over Time', 'Topics that haven’t improved:'],
  TW_LRT: ['Weaknesses', 'Low Retention Topics', 'Topics with lower retention and recall:'],
  TO_PR: ['Opportunities', 'Practice Recommendations', 'Suggested practice areas:'],
  TO_MO: ['Opportunities', 'Missed Opportunities', 'Topics to review for better consistency:'],
  TO_RLT: ['Opportunities', 'Rapid Learning Topics', 'Topics that can be quickly improved with targeted practice:'],
  TT_RMCG: ['Threats', 'Recurring Mistakes & Conceptual Gaps', 'Repeated errors observed in:'],
  TT_WHIT: ['Threats', 'Weakness on High Impact Topics', 'Underperformance in critical areas:'],
  TT_IP: ['Threats', 'Inconsistent Performance', 'Areas where performance is erratic:'],
};

const SwotSection = ({ label, displayLabel, color, data, selectedSubject }) => {
  const displayText = displayLabel || label;
  const itemsToRender = data?.[selectedSubject]?.[label] || [];

  const zoneSubtitleMap = {
    'Focus Zone': 'Areas to improve',
    'Steady Zone': 'Strong areas',
  };

  const subtitle = zoneSubtitleMap[displayText] || '';

  return (
    <Card className="bg-white h-full flex flex-col border-none rounded-none">
      <CardHeader className="p-0 pb-2">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <div>
              <CardTitle className={`${color} font-semibold items-center mb-0 text-lg`}>{displayText}</CardTitle>
              {subtitle && <div className="text-sm text-gray-700">{subtitle}</div>}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 border border-yellow-200 rounded-2xl bg-yellow-100/20">
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-auto">
            {itemsToRender.length > 0 ? (
              <div className="divide-y divide-yellow-200">
                {itemsToRender.map((item, idx) => (
                  <div
                    key={item.id || `${displayText}-${selectedSubject}-${item.title || ''}-${idx}`}
                    className="px-4 py-3 border-t border-yellow-200 first:border-t-0"
                  >
                    {item.topics && item.topics.length > 0 ? (
                      <div className="divide-y divide-yellow-200">
                        {item.topics.map((topic, i) => (
                          <div
                            key={`${item.id || item.title || ''}-topic-${topic}-${i}`}
                            className="flex items-start gap-2 py-2 text-sm md:text-base text-gray-700"
                          >
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/70" aria-hidden="true" />
                            <span className="leading-relaxed break-words whitespace-pre-wrap">{topic}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No data available for this category.</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-4 py-3 text-sm text-gray-500 italic">No data available for this category.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

SwotSection.propTypes = {
  label: PropTypes.string.isRequired,
  displayLabel: PropTypes.string,
  icon: PropTypes.element.isRequired,
  color: PropTypes.string.isRequired,
  border: PropTypes.string.isRequired,
  selectedSubject: PropTypes.string.isRequired,
  data: PropTypes.object.isRequired,
};

import FilterDrawer from '../../components/ui/filter-drawer.jsx';

const IAnalysis = () => {
  const { selectedEducatorId, setSelectedEducatorId, educators } = useInstitution();
  const sortedEducators = React.useMemo(() => {
    if (!Array.isArray(educators)) return [];
    return [...educators].sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
  }, [educators]);
  const {
    selectedSubject,
    setSelectedSubject,
    selectedTest,
    setSelectedTest,
    availableTests = [],
    swotData,
    loading,
    error
  } = useSwotData(fetchInstitutionEducatorSWOT, fetchAvailableSwotTests_InstitutionEducator, selectedEducatorId);

  const filteredSwotData = React.useMemo(() => {
    if (!swotData) return swotData;
    const filtered = { ...swotData };
    for (const subject in filtered) {
      if (filtered[subject].Weaknesses) {
        filtered[subject].Weaknesses = filtered[subject].Weaknesses.filter(item =>
          item.title !== 'Weakness Over Time' && item.title !== 'Low Retention Topics'
        );
      }
      if (filtered[subject].Strengths) {
        filtered[subject].Strengths = filtered[subject].Strengths.filter(item =>
          item.title !== 'Strongest Question Types' && item.title !== 'Improvement Over Time'
        );
      }
    }
    return filtered;
  }, [swotData]);

  // State for teacher data
  const [teachers, setTeachers] = useState([]);

  // Fetch teachers when selectedEducatorId changes
  useEffect(() => {
    // Clear previous teachers immediately to avoid showing stale data
    setTeachers([]);

    if (!selectedEducatorId) return;

    const fetchTeachers = async () => {
      try {
        // Get class_id from the selected educator
        const educator = educators?.find(e => e.id === selectedEducatorId || String(e.id) === String(selectedEducatorId));
        if (!educator || !educator.class_id) {
          setTeachers([]);
          return;
        }
        const response = await getTeachersByClass(educator.class_id);
        if (response && response.success) {
          setTeachers(Array.isArray(response.data) ? response.data : []);
        } else {
          setTeachers([]);
        }
      } catch (error) {
        console.error('Error fetching teachers:', error);
        setTeachers([]);
      }
    };

    fetchTeachers();
  }, [selectedEducatorId, educators]);

  const sections = [
    {
      label: 'Weaknesses',
      displayLabel: 'Focus Zone',
      icon: <Target className="mr-2" />,
      color: 'text-red-600',
      border: 'border-red-200'
    },
    {
      label: 'Strengths',
      displayLabel: 'Steady Zone',
      icon: <CheckCircle className="mr-2" />,
      color: 'text-green-600',
      border: 'border-green-200'
    }
  ];

  const testOptions = availableTests.map(test => ({
    value: test,
    label: test
  }));

  const subjectsFromData = Object.keys(swotData || {});

  const orderedSubjects = (() => {
    if (subjectsFromData.length === 0) return PREFERRED_SUBJECT_ORDER.slice();
    const ordered = PREFERRED_SUBJECT_ORDER.filter(s => subjectsFromData.includes(s));
    const remainder = subjectsFromData.filter(s => !PREFERRED_SUBJECT_ORDER.includes(s));
    return ordered.concat(remainder);
  })();

  const subjectOptions = orderedSubjects.map(subject => ({ value: subject, label: subject }));

  React.useEffect(() => {
    if (!orderedSubjects || orderedSubjects.length === 0) return;
    if (!orderedSubjects.includes(selectedSubject)) {
      setSelectedSubject && setSelectedSubject(orderedSubjects[0]);
    }
  }, [orderedSubjects, selectedSubject, setSelectedSubject]);

  const [selectedTab, setSelectedTab] = React.useState('yetToDecide');

  const keyToLabel = (key) => {
    if (key === 'yetToDecide') return 'Focus Zone';
    if (key === 'keyStrengths') return 'Steady Zone';
    return 'Focus Zone';
  };

  const activeLabel = keyToLabel(selectedTab);

  // Active teacher for the selected subject (used in header display)
  const activeTeacher = teachers.find(t => String(t.subject || '').toLowerCase() === String(selectedSubject || '').toLowerCase());
  const teacherName = activeTeacher && activeTeacher.teacher_name ? activeTeacher.teacher_name : 'Not assigned';
  const teacherInitials = teacherName && teacherName !== 'Not assigned'
    ? teacherName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '';
  const teacherEmail = activeTeacher?.email || 'Not provided';
  const teacherPhone = activeTeacher?.phone_number || 'Not provided';
  const canEmail = !!(activeTeacher?.email);

  // Drawer state for mobile-only Test selection
  const [testDrawerOpen, setTestDrawerOpen] = React.useState(false);

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
                {sortedEducators.map((edu) => (
                  <SelectItem key={edu.id} value={String(edu.id)}>
                    {edu.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>Please select an educator to view their analysis.</div>
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
            <h3 className="font-bold">Error</h3>
            <div className="text-xs">{String(error)}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="md:mt-12 lg:px-4 lg:space-y-6">
      <div className="hidden lg:flex lg:flex-row lg:items-start lg:justify-between mb-4 pb-4 gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-semibold text-gray-800">Classroom Analysis</h2>
          <p className="text-sm text-gray-500">Review strengths and focus areas by subject and test.</p>
        </div>
        <div className="flex items-start gap-4 flex-wrap justify-end">
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

            <span className="text-sm text-gray-400 min-w-max pl-1">Test</span>
            <Select value={selectedTest} onValueChange={(v) => setSelectedTest && setSelectedTest(v)}>
              <SelectTrigger className="btn btn-sm justify-start truncate m-1 w-full lg:w-auto text-start">
                <SelectValue placeholder="Select Test" />
              </SelectTrigger>
              <SelectContent side="bottom" align="end">
                {testOptions.map(opt => (
                  <SelectItem key={String(opt.value)} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-sm text-gray-400 min-w-max pl-1">Subject</span>
            <Select value={selectedSubject} onValueChange={(v) => setSelectedSubject && setSelectedSubject(v)}>
              <SelectTrigger className="btn btn-sm justify-start truncate m-1 w-full lg:w-auto text-start">
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent side="bottom" align="end">
                {subjectOptions.map(opt => (
                  <SelectItem key={String(opt.value)} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <div className="lg:hidden">
        <div>
          <div className="flex w-full bg-white px-3 border-b justify-between items-center">
            <div className="text-left py-4">
              <h1 className="text-2xl font-bold text-gray-800">Test wise analysis</h1>
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
            <div className="py-4">
              <button
                className="btn btn-sm justify-start rounded-lg text-sm w-auto inline-flex items-center gap-2"
                onClick={() => setTestDrawerOpen(true)}
                aria-label="Select Test"
              >
                <span className="truncate">{selectedTest || 'Select Test'}</span>
                <ChevronDown size={16} className="ml-1" />
              </button>

              <FilterDrawer
                open={testDrawerOpen}
                onOpenChange={setTestDrawerOpen}
                panels={[{
                  key: 'test',
                  label: 'Test',
                  options: testOptions,
                  selected: selectedTest,
                  onSelect: (v) => setSelectedTest && setSelectedTest(v),
                }]}
                initialActivePanel="test"
                title="Select Test"
              />
            </div>
          </div>

          <div className="flex bg-white border-b relative pb-1 overflow-x-auto">
            {orderedSubjects.map((subject) => {
              const shortName = subject === 'Physics'
                ? 'Phy'
                : subject === 'Chemistry'
                  ? 'Chem'
                  : subject === 'Biology'
                    ? 'Bio'
                    : subject === 'Botany'
                      ? 'Bot'
                      : 'Zoo';

              const icon = subject === 'Physics'
                ? <Atom size={16} />
                : subject === 'Chemistry'
                  ? <FlaskConical size={16} />
                  : subject === 'Biology'
                    ? <Microscope size={16} />
                    : subject === 'Botany'
                      ? <Leaf size={16} />
                      : <PawPrint size={16} />;

              const baseBg = subject === 'Physics'
                ? 'bg-cyan-100'
                : subject === 'Chemistry'
                  ? 'bg-violet-100'
                  : subject === 'Biology'
                    ? 'bg-amber-100'
                    : subject === 'Botany'
                      ? 'bg-lime-100'
                      : 'bg-rose-100';

              const activeBg = subject === 'Physics'
                ? 'bg-cyan-200'
                : subject === 'Chemistry'
                  ? 'bg-violet-200'
                  : subject === 'Biology'
                    ? 'bg-amber-200'
                    : subject === 'Botany'
                      ? 'bg-lime-200'
                      : 'bg-rose-200';
              const isSelected = selectedSubject === subject;
              return (
                <button
                  key={subject}
                  onClick={() => setSelectedSubject(subject)}
                  className={`flex-1 pt-2 px-1 text-center text-sm font-medium flex flex-col items-center justify-center gap-1 transition-all duration-200 ${isSelected ? 'text-gray-800' : 'text-gray-600 hover:text-gray-800'}`}
                >
                  <div className={`${isSelected ? activeBg : baseBg} rounded-lg p-2 mb-1 transform ${isSelected ? 'scale-105 shadow-md' : 'scale-100'}`}>
                    {icon}
                  </div>
                  <span className={`${isSelected ? 'font-semibold' : 'font-medium'}`}>{shortName}</span>
                </button>
              );
            })}

            {orderedSubjects.length > 0 && (
              <motion.div
                className="absolute bottom-0 h-0.5 bg-blue-500 rounded-full"
                style={{ width: `${100 / (orderedSubjects.length || 1)}%` }}
                animate={{ left: `${(Math.max(0, orderedSubjects.indexOf(selectedSubject || orderedSubjects[0])) * (100 / (orderedSubjects.length || 1)))}%` }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              />
            )}
          </div>

          <div className="max-w-2xl mx-auto px-3">
            {(() => {
              const tabs = [
                { key: 'yetToDecide', label: 'Focus Zone' },
                { key: 'keyStrengths', label: 'Steady Zone' }
              ];

              return (
                <>
                  <div className="flex space-x-3 mt-3 mb-2">
                    {tabs.map((tab) => {
                      const isActive = selectedTab === tab.key;
                      let activeClasses = '';
                      if (isActive) {
                        if (tab.key === 'keyStrengths') {
                          activeClasses = 'bg-green-100 text-green-900 shadow-sm shadow-green-200/50 border border-green-300';
                        } else if (tab.key === 'yetToDecide') {
                          activeClasses = 'bg-orange-100 text-orange-900 shadow-sm shadow-orange-200/60 border border-orange-300';
                        }
                      }
                      return (
                        <button
                          key={tab.key}
                          onClick={() => setSelectedTab(tab.key)}
                          aria-pressed={isActive}
                          role="tab"
                          className={`flex-1 py-2 px-2 text-sm font-semibold rounded-xl transition-all duration-300 ease-out transform scale-[1.02] ${isActive
                            ? activeClasses
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white/50 active:scale-95'
                            }`}
                        >
                          <div className="text-center">
                            <div className={`font-semibold text-sm ${isActive ? '' : 'text-gray-600'}`}>
                              {tab.label}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3">
                    {(() => {
                      const activeSection = sections.find(s => s.displayLabel === activeLabel) || sections[0];
                      const zoneData = filteredSwotData?.[selectedSubject]?.[activeSection.label] || [];
                      const allTopics = zoneData.flatMap(item => item.topics || []);

                      if (allTopics.length > 0) {
                        return (
                          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <ul className="divide-y divide-gray-100/80">
                              {allTopics.map((topic, i) => (
                                <li
                                  key={`${activeLabel}-${selectedSubject}-${i}`}
                                  className="py-1 px-4 text-gray-700 hover:bg-gray-50/50 transition-colors duration-200 group"
                                >
                                  <div className="flex items-start space-x-2">
                                    <div className="flex-shrink-0 w-1.5 h-1.5 bg-primary rounded-full mt-2 transform transition-transform duration-300" />
                                    <span className="text-sm leading-relaxed transition-colors">
                                      {topic}
                                    </span>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      }

                      return (
                        <div className="text-center py-8 bg-white/50 rounded-2xl border-2 border-dashed border-gray-200/70">
                          <div className="w-10 h-10 mx-auto mb-3 bg-gray-100/70 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </div>
                          <p className="text-gray-500 text-sm font-medium">No insights available</p>
                          <p className="text-gray-400 text-xs mt-1">Check back later for updates</p>
                        </div>
                      );
                    })()}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="hidden lg:grid grid-cols-[3fr_1fr] gap-6 items-start">
        <div className="flex flex-col space-y-6 bg-white rounded-2xl p-6 border border-gray-200">
          {sections.map(({ label, displayLabel, icon, color, border }) => (
            <SwotSection
              key={displayLabel}
              label={label}
              displayLabel={displayLabel}
              icon={icon}
              color={color}
              border={border}
              data={filteredSwotData}
              selectedSubject={selectedSubject}
            />
          ))}
        </div>

        <aside className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full border border-gray-200">
              {teacherInitials ? (
                <span className="text-base font-semibold text-gray-700">{teacherInitials}</span>
              ) : (
                <User className="w-5 h-5 text-gray-500" />
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">{teacherName}</div>
              <div className="text-xs text-gray-500">Educator · {selectedSubject}</div>
            </div>
          </div>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="truncate">{teacherEmail}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="truncate">{teacherPhone}</span>
            </div>
          </div>
          <Button
            variant="default"
            disabled={!canEmail}
            onClick={() => {
              if (!canEmail) return;
              window.location.href = `mailto:${teacherEmail}`;
            }}
          >
            Notify by email
          </Button>
        </aside>
      </div>
    </div>
  );
};

export default IAnalysis;
