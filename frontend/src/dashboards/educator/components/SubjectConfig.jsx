import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flask, 
  Atom, 
  Plant, 
  Dna, 
  ArrowsDownUp,
  CheckCircle,
  Info
} from '@phosphor-icons/react';

const SubjectConfig = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(1); // 1: pattern, 2: order/counts
  const [pattern, setPattern] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [questionMode, setQuestionMode] = useState('total'); // 'total' or 'perSubject'
  const [totalQuestions, setTotalQuestions] = useState('');
  const [subjectCounts, setSubjectCounts] = useState({});

  const patterns = {
    PHY_CHEM_BOT_ZOO: {
      label: 'Physics → Chemistry → Botany → Zoology',
      subjects: ['Physics', 'Chemistry', 'Botany', 'Zoology'],
      icon: '🔬⚗️🌿🧬'
    },
    PHY_CHEM_BIO: {
      label: 'Physics → Chemistry → Biology',
      subjects: ['Physics', 'Chemistry', 'Biology'],
      icon: '🔬⚗️🧬'
    }
  };

  const subjectIcons = {
    Physics: <Atom size={24} weight="duotone" className="text-blue-500" />,
    Chemistry: <Flask size={24} weight="duotone" className="text-purple-500" />,
    Botany: <Plant size={24} weight="duotone" className="text-green-500" />,
    Zoology: <Dna size={24} weight="duotone" className="text-orange-500" />,
    Biology: <Dna size={24} weight="duotone" className="text-teal-500" />
  };

  useEffect(() => {
    if (pattern) {
      const patternSubjects = patterns[pattern].subjects;
      setSubjects(patternSubjects);
      // Initialize counts with equal distribution
      const equalCount = 180 / patternSubjects.length;
      const initialCounts = {};
      patternSubjects.forEach(subj => {
        initialCounts[subj] = Math.floor(equalCount);
      });
      setSubjectCounts(initialCounts);
      setTotalQuestions('180'); // Default NEET standard
    }
  }, [pattern]);

  const handlePatternSelect = (patternKey) => {
    setPattern(patternKey);
    setStep(2);
  };

  const moveSubject = (index, direction) => {
    const newSubjects = [...subjects];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newSubjects.length) {
      [newSubjects[index], newSubjects[targetIndex]] = [newSubjects[targetIndex], newSubjects[index]];
      setSubjects(newSubjects);
    }
  };

  const handleCountChange = (subject, value) => {
    const numValue = parseInt(value) || 0;
    setSubjectCounts(prev => ({ ...prev, [subject]: numValue }));
  };

  const calculateTotal = () => {
    return Object.values(subjectCounts).reduce((sum, count) => sum + count, 0);
  };

  const isValid = () => {
    if (questionMode === 'total') {
      return totalQuestions && parseInt(totalQuestions) > 0;
    } else {
      const total = calculateTotal();
      return total > 0 && Object.values(subjectCounts).every(c => c > 0);
    }
  };

  const handleComplete = () => {
    const config = {
      pattern,
      subject_order: subjects,
      total_questions: questionMode === 'total' ? parseInt(totalQuestions) : calculateTotal(),
      section_counts: questionMode === 'perSubject' ? subjectCounts : null
    };
    onComplete(config);
  };

  return (
    <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg border border-blue-200 p-6 mb-6">
      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Info size={24} className="text-blue-600" weight="fill" />
                <h3 className="text-xl font-bold text-gray-800">
                  Subject Configuration (Optional)
                </h3>
              </div>
              <button
                onClick={onSkip}
                className="btn btn-ghost btn-sm text-gray-600 hover:text-gray-800"
              >
                Skip (Use Auto-Detection)
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-6">
              Choose your test's subject pattern to optimize processing and reduce AI costs
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(patterns).map(([key, value]) => (
                <motion.button
                  key={key}
                  onClick={() => handlePatternSelect(key)}
                  className="card bg-white hover:bg-blue-50 border-2 border-transparent hover:border-blue-400 cursor-pointer transition-all duration-200 p-6"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="text-4xl mb-3 text-center">{value.icon}</div>
                  <h4 className="font-semibold text-center text-gray-800 text-sm">
                    {value.label}
                  </h4>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                Configure Subject Order & Questions
              </h3>
              <button
                onClick={() => setStep(1)}
                className="btn btn-ghost btn-sm"
              >
                ← Back
              </button>
            </div>

            {/* Subject Order */}
            <div className="mb-6">
              <label className="label">
                <span className="label-text font-semibold text-gray-700">
                  Subject Order (drag to reorder)
                </span>
              </label>
              <div className="flex flex-wrap gap-3">
                {subjects.map((subject, index) => (
                  <motion.div
                    key={subject}
                    className="flex items-center gap-2 bg-white rounded-lg p-3 shadow-sm border border-gray-200"
                    layout
                  >
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => moveSubject(index, 'up')}
                        disabled={index === 0}
                        className="btn btn-xs btn-circle btn-ghost"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveSubject(index, 'down')}
                        disabled={index === subjects.length - 1}
                        className="btn btn-xs btn-circle btn-ghost"
                      >
                        ↓
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {subjectIcons[subject]}
                      <span className="font-medium text-gray-800">{subject}</span>
                      <span className="badge badge-sm">{index + 1}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Question Count Mode */}
            <div className="mb-6">
              <label className="label">
                <span className="label-text font-semibold text-gray-700">
                  Question Count Mode
                </span>
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setQuestionMode('total')}
                  className={`btn btn-sm ${questionMode === 'total' ? 'btn-primary' : 'btn-outline'}`}
                >
                  Total Questions Only
                </button>
                <button
                  onClick={() => setQuestionMode('perSubject')}
                  className={`btn btn-sm ${questionMode === 'perSubject' ? 'btn-primary' : 'btn-outline'}`}
                >
                  Per-Subject Counts
                </button>
              </div>
            </div>

            {/* Question Inputs */}
            {questionMode === 'total' ? (
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Total Number of Questions</span>
                </label>
                <input
                  type="number"
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(e.target.value)}
                  placeholder="e.g., 180"
                  className="input input-bordered w-full max-w-xs"
                  min="1"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <label className="label">
                  <span className="label-text font-semibold">Questions per Subject</span>
                </label>
                {subjects.map(subject => (
                  <div key={subject} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-40">
                      {subjectIcons[subject]}
                      <span className="font-medium text-gray-700">{subject}</span>
                    </div>
                    <input
                      type="number"
                      value={subjectCounts[subject] || ''}
                      onChange={(e) => handleCountChange(subject, e.target.value)}
                      className="input input-bordered input-sm w-24"
                      min="1"
                      placeholder="45"
                    />
                  </div>
                ))}
                <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3 mt-4">
                  <span className="font-semibold text-gray-800">Total:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {calculateTotal()} questions
                  </span>
                </div>
              </div>
            )}

            {/* Complete Button */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={onSkip}
                className="btn btn-ghost btn-sm"
              >
                Skip & Use Auto-Detection
              </button>
              <button
                onClick={handleComplete}
                disabled={!isValid()}
                className={`btn btn-primary ${!isValid() ? 'btn-disabled' : ''}`}
              >
                <CheckCircle size={20} weight="fill" className="mr-2" />
                Save Configuration
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SubjectConfig;
