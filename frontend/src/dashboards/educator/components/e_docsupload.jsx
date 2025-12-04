import React, { useMemo, useState, useEffect } from 'react';
import { FileText, Key, File, Spinner, ArrowLeft, ArrowRight, CheckCircle } from '@phosphor-icons/react';
import Modal from '../../components/ui/modal.jsx';

// DropZone component (merged from e_dropzone.jsx)
import DropZone from '../../components/ui/dropzone.jsx';
const EducatorDropZone = (props) => <DropZone {...props} />;

// Modal component for handling multi-step file uploads
const UploadModal = ({ step, setStep, files, setFiles, onSubmit, onClose, isUploading }) => {
  // Subject configurator state (in-modal)
  const [showConfig, setShowConfig] = useState(false);
  const [configStep, setConfigStep] = useState(1); // 1: pattern, 2: order/counts
  const [pattern, setPattern] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [questionMode, setQuestionMode] = useState('perSubject');
  const [subjectCounts, setSubjectCounts] = useState({});
  const [metadata, setMetadata] = useState(null);

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
    Physics: <FileText size={18} className="text-blue-500" />, // placeholder icon
    Chemistry: <Key size={18} className="text-purple-500" />,
    Botany: <File size={18} className="text-green-500" />,
    Zoology: <File size={18} className="text-orange-500" />,
    Biology: <File size={18} className="text-teal-500" />
  };

  useEffect(() => {
    // Only populate subjects when `pattern` matches a known pattern key
    if (pattern && patterns[pattern]) {
      const patternSubjects = patterns[pattern].subjects;
      setSubjects(patternSubjects);
      const equalCount = 180 / patternSubjects.length;
      const initialCounts = {};
      patternSubjects.forEach(subj => {
        initialCounts[subj] = Math.floor(equalCount);
      });
      setSubjectCounts(initialCounts);
    } else {
      // Unknown pattern (eg. 'AUTO_DETECT') or cleared selection -> reset subjects/counts
      setSubjects([]);
      setSubjectCounts({});
    }
  }, [pattern]);

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

  const calculateTotal = () => Object.values(subjectCounts).reduce((sum, count) => sum + count, 0);

  const isConfigValid = () => {
    const total = calculateTotal();
    return total > 0 && Object.values(subjectCounts).every(c => c > 0);
  };

  const handleSaveConfig = () => {
    const cfg = {
      pattern,
      subject_order: subjects,
      total_questions: calculateTotal(),
      section_counts: subjectCounts
    };
    setMetadata(cfg);
    setShowConfig(false);
  };

  const handleClearConfig = () => {
    setMetadata(null);
    setPattern(null);
    setSubjects([]);
    setQuestionMode('perSubject');
    setSubjectCounts({});
  };
  // File upload steps (kept separate so we can merge with config steps)
  const fileSteps = useMemo(
    () => [
      {
        key: 'questionPaper',
        type: 'file',
        label: 'Question Paper',
        icon: FileText,
        file: files.questionPaper,
        setFile: (file) => setFiles({ ...files, questionPaper: file }),
        accept: '.pdf',
        actionText: 'Upload Question Paper',
        description: 'Upload your examination question paper in PDF format',
      },
      {
        key: 'answerKey',
        type: 'file',
        label: 'Answer Key',
        icon: Key,
        file: files.answerKey,
        setFile: (file) => setFiles({ ...files, answerKey: file }),
        accept: '.csv',
        actionText: 'Upload Answer Key',
        description: 'Upload the answer key in CSV format with correct answers',
      },
      {
        key: 'responseSheets',
        type: 'file',
        label: 'Response Sheets',
        icon: File,
        file: files.responseSheets,
        setFile: (file) => setFiles({ ...files, responseSheets: file }),
        accept: '.csv',
        actionText: 'Upload Response Sheets',
        description: 'Upload student response sheets in CSV format',
      },
    ],
    [files]
  );

  // Combined steps: two config steps followed by three file steps
  const steps = [
    { key: 'syllabus', type: 'config', label: 'Select Syllabus' },
    { key: 'counts', type: 'config', label: 'Configure Questions' },
    ...fileSteps,
  ];

  // Current step object
  const currentStep = steps[step];

  // Whether the current step is the last overall
  const isLastStep = step === steps.length - 1;

  // Determine if user can proceed from the current step
  const canProceed = (() => {
    if (currentStep.type === 'file') return !!currentStep.file;
    if (currentStep.key === 'syllabus') return !!pattern; // require pattern selection before proceeding via Next
    if (currentStep.key === 'counts') return isConfigValid();
    return true;
  })();

  // Completed steps count for progress bar (approximate: config steps considered completed when metadata exists or skipped)
  const completedSteps = (() => {
    if (!metadata) return 0;
    // Count config steps as completed when metadata exists
    return steps.slice(0, 2).length + fileSteps.filter((s, i) => i < step - 2 && steps[step - 2 + i]?.file).length;
  })();

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={
        <div className="flex items-center mb-1">
          <span className="badge badge-ghost badge-sm mr-2">Step {step + 1}/{steps.length}</span>
          <span className="text-xl font-bold text-gray-800">{currentStep.type === 'file' ? currentStep?.actionText : currentStep.label}</span>
        </div>
      }
      loading={isUploading}
      maxWidth="max-w-xl"
      className="p-0"
      footer={
        <>
          <button
            className={`btn btn-sm ${step > 0 ? '' : 'invisible'}`}
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={isUploading}
          >
            <ArrowLeft size={16} className="mr-1" /> Back
          </button>
          {!isLastStep ? (
            <button
              className={`btn btn-secondary btn-sm ${!canProceed || isUploading ? 'btn-disabled opacity-50' : ''}`}
              onClick={() => {
                if (!canProceed) return;
                if (currentStep.key === 'counts') {
                  handleSaveConfig();
                  setStep(step + 1);
                  return;
                }
                if (currentStep.key === 'syllabus') {
                  // If user selected Auto-detect, skip counts and go to first file step
                  if (pattern === 'AUTO_DETECT') {
                    setStep(2);
                    return;
                  }
                }
                setStep(step + 1);
              }}
              disabled={!canProceed || isUploading}
            >
              Next <ArrowRight size={16} className="ml-1" />
            </button>
          ) : (
            <button
              className={`btn btn-success btn-sm px-6 ${!canProceed || isUploading ? 'btn-disabled opacity-50' : ''}`}
              onClick={() => onSubmit(metadata)}
              disabled={!canProceed || isUploading}
            >
              {isUploading ? (
                <>
                  <Spinner size={16} className="animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                'Submit All'
              )}
            </button>
          )}
        </>
      }
    >
      {/* Step indicators (render immediately under header for consistent positioning) */}
      <div className="flex justify-between mb-6 px-2">
        {steps.map((s, index) => (
          <div key={s.key} className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${index < step
                ? 'bg-success border-success text-white'
                : index === step
                  ? 'border-primary text-primary'
                  : 'border-gray-300 text-gray-400'
                }`}
              style={{ cursor: index < step ? 'pointer' : 'default' }}
              onClick={() => index < step && setStep(index)}
            >
              {index < step ? <CheckCircle weight="fill" size={18} /> : (s.type === 'file' ? <s.icon size={18} /> : <FileText size={18} />)}
            </div>
            <span
              className={`text-xs mt-1 ${index === step ? 'font-medium text-primary' : 'text-gray-500'}`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Config step UI (first two steps) or file header description for file steps */}
      {currentStep.type === 'config' ? (
        <div className="p-6 border rounded-2xl mb-6">
          {currentStep.key === 'syllabus' ? (
            <div>
              <div className="mb-3">
                <div className="text-sm text-gray-600">Select subject syllabus</div>
                <div className="text-xs text-gray-500">Choose a known syllabus or use auto-detect</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(patterns).map(([key, value]) => {
                  const selected = pattern === key;
                  return (
                    <button
                      key={key}
                      onClick={() => { setPattern(key); /* select only - do not auto advance */ }}
                      className={`card relative p-4 text-left border flex flex-col justify-between min-h-[80px] ${selected ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary'}`}>
                      <div className="flex items-start justify-between">
                        <div className="text-sm font-medium flex items-center gap-2">
                          {selected && <CheckCircle size={16} className="text-primary" />}
                          <span>{value.label}</span>
                        </div>
                        <div className="text-xs text-gray-500">{value.icon}</div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">Select this syllabus pattern</div>
                    </button>
                  );
                })}
                {/* Auto-detect / Skip option as the third card (selectable) */}
                <button
                  key="AUTO_DETECT"
                  onClick={() => { handleClearConfig(); setPattern('AUTO_DETECT'); }}
                  className={`card relative p-4 text-left border flex flex-col justify-between min-h-[80px] ${pattern === 'AUTO_DETECT' ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary'}`}>
                  <div className="flex items-start justify-between">
                    <div className="text-sm font-medium flex items-center gap-2">
                      {pattern === 'AUTO_DETECT' && <CheckCircle size={16} className="text-primary" />}
                      <span>Auto-detect subjects (Skip)</span>
                    </div>
                    <div className="text-xs text-gray-500">🤖</div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">Let the system detect subjects automatically</div>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-3">
                <h4 className="font-semibold">Configure Question Counts</h4>
              </div>

              <div className="mb-3">
                <label className="label"><span className="label-text">Question Counts per Subject</span></label>
              </div>

              <div className="space-y-3">
                {subjects.map((s, idx) => (
                  <div key={s} className="grid grid-cols-12 items-center gap-3 py-2">
                    <div className="col-span-6 flex items-center gap-3">
                      <span className="text-sm">{subjectIcons[s]}</span>
                      <span className="text-sm font-medium">{s}</span>
                    </div>
                    <div className="col-span-3 flex justify-center">
                      <input
                        type="number"
                        value={subjectCounts[s] || ''}
                        onChange={e => handleCountChange(s, e.target.value)}
                        className="input input-bordered w-24 text-center"
                        aria-label={`${s} question count`}
                      />
                    </div>
                    <div className="col-span-3 flex justify-end gap-2">
                      <button onClick={() => moveSubject(idx, 'up')} className="btn btn-xs btn-ghost" aria-label={`Move ${s} up`}>↑</button>
                      <button onClick={() => moveSubject(idx, 'down')} className="btn btn-xs btn-ghost" aria-label={`Move ${s} down`}>↓</button>
                    </div>
                  </div>
                ))}

                <div className="mt-2 text-sm text-gray-600">Total: <span className="font-medium">{calculateTotal()}</span> questions</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6 px-4 pt-2">
          <p className="text-gray-600 text-sm">{currentStep?.description}</p>
        </div>
      )}
      {/* Dropzone (for file steps) */}
      {currentStep.type === 'file' && (
        <div className="mb-8">
          <EducatorDropZone
            label={currentStep?.label}
            file={currentStep?.file}
            setFile={currentStep?.setFile}
            icon={currentStep?.icon}
            accept={currentStep?.accept}
            disabled={isUploading}
          />

          {!canProceed && (
            <p className="text-error text-sm text-center mt-3">
              Please upload a file to continue
            </p>
          )}
        </div>
      )}

      {/* Help text */}
      {isLastStep && canProceed && !isUploading && (
        <p className="text-xs text-center mt-4 text-gray-500">
          Click Submit All to process your files and generate results
        </p>
      )}
    </Modal>
  );
};

export default React.memo(UploadModal);