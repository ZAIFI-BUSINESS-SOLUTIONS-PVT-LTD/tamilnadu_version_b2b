import React, { useMemo, useState, useEffect } from 'react';
import { FileText, Loader, ArrowLeft, ArrowRight, CheckCircle, Download, Atom, Key, File, FlaskConical, Sprout, PawPrint } from 'lucide-react';
import Modal from '../../components/ui/modal.jsx';
import { validateAnswerKeyCSV, validateResponseSheetCSV, formatValidationErrors } from '../../../utils/csvValidation.js';
import { toast } from 'react-hot-toast';
import { Button } from '../../components/ui/button.jsx';

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
  const [answerKeyValidation, setAnswerKeyValidation] = useState(null);
  const [responseValidation, setResponseValidation] = useState(null);
  const [correctedResponseFile, setCorrectedResponseFile] = useState(null);

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

  // (No auto-detect option — user must pick a syllabus pattern)

  const subjectIcons = {
    Physics: [Atom],
    Chemistry: [FlaskConical],
    Botany: [Sprout],
    Zoology: [PawPrint],
    Biology: [Sprout, PawPrint]
  };

  useEffect(() => {
    // Only populate subjects when `pattern` matches a known pattern key
    if (pattern && patterns[pattern]) {
      const patternSubjects = patterns[pattern].subjects;
      setSubjects(patternSubjects);
      const initialCounts = {};
      if (pattern === 'PHY_CHEM_BIO') {
        // Specific counts for Physics, Chemistry, Biology: 45, 45, 90
        initialCounts['Physics'] = 45;
        initialCounts['Chemistry'] = 45;
        initialCounts['Biology'] = 90;
      } else {
        // Equal division for other patterns
        const equalCount = 180 / patternSubjects.length;
        patternSubjects.forEach(subj => {
          initialCounts[subj] = Math.floor(equalCount);
        });
      }
      setSubjectCounts(initialCounts);

    } else {
      // Unknown pattern or cleared selection -> reset subjects/counts
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
    return total >= 0;
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

  // Validate answer key CSV (called on submit, not on file selection)
  const validateAnswerKey = async () => {
    console.log('validateAnswerKey() start, files.answerKey=', files.answerKey);
    if (!files.answerKey) {
      console.log('No answer key file provided');
      return true;
    }

    try {
      const expectedQuestionCount = metadata?.total_questions;
      const validation = await validateAnswerKeyCSV(files.answerKey, { expectedQuestionCount });
      console.log('Answer key validation result:', validation);
      setAnswerKeyValidation(validation);

      if (!validation.valid) {
        const errorMessage = formatValidationErrors(validation.errors);
        toast.error(errorMessage, {
          duration: 8000,
          style: {
            maxWidth: '600px',
            whiteSpace: 'pre-line'
          }
        });
        return false;
      }

      // Show success with summary
      const { summary } = validation;
      toast.success(
        `✅ Answer key validated successfully!\n` +
        `Total questions: ${summary.totalRows}\n` +
        `Unique questions: ${summary.uniqueQuestions}`,
        {
          duration: 4000,
          style: { whiteSpace: 'pre-line' }
        }
      );
      return true;
    } catch (error) {
      toast.error(`Validation error: ${error.message}`);
      return false;
    }
  };

  // Validate and auto-correct response sheet CSV
  const validateResponseSheet = async () => {
    console.log('validateResponseSheet() start, files.responseSheets=', files.responseSheets, 'files.answerKey=', files.answerKey);
    if (!files.responseSheets) {
      console.log('No response sheet file provided');
      return { valid: true };
    }

    try {
      const expectedQuestionCount = metadata?.total_questions;
      console.log('METADATA CHECK:', { metadata, expectedQuestionCount });
      const validation = await validateResponseSheetCSV(
        files.responseSheets,
        files.answerKey,
        { expectedQuestionCount }
      );
      setResponseValidation(validation);
      console.log('Response CSV validation result:', validation);

      if (!validation.valid) {
        const errorMessage = formatValidationErrors(validation.errors);
        toast.error(errorMessage, {
          duration: 8000,
          style: {
            maxWidth: '600px',
            whiteSpace: 'pre-line'
          }
        });
        setResponseValidation(validation);
        return validation;
      }

      // Store corrected file to upload instead of original
      if (validation.correctedFile) {
        setCorrectedResponseFile(validation.correctedFile);
      }

      // Show success with corrections summary
      const { summary, warnings } = validation;
      let message = `✅ Response sheet validated!\n` + `Total students: ${summary.totalRows}\n`;

      if (warnings.length > 0) {
        message += `\n⚠️ Warnings: ${warnings.length}`;
      }

      toast.success(message, {
        duration: 5000,
        style: { whiteSpace: 'pre-line' }
      });

      return validation;
    } catch (error) {
      console.error('Response validation exception:', error);
      toast.error(`Response validation error: ${error.message}`);
      return { valid: false, errors: [{ type: 'parse', message: error.message }], warnings: [], summary: {} };
    }
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
        setFile: (file) => { console.log('questionPaper selected', file); setFiles({ ...files, questionPaper: file }); },
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
        setFile: (file) => { console.log('answerKey selected', file); setFiles({ ...files, answerKey: file }); setAnswerKeyValidation(null); },
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
        setFile: (file) => { console.log('responseSheets selected', file); setFiles({ ...files, responseSheets: file }); setResponseValidation(null); setCorrectedResponseFile(null); },
        accept: '.csv',
        actionText: 'Upload Response Sheets',
        description: 'Upload student response sheets in CSV format',
      },
    ],
    [files, metadata]
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
          <span className="mr-2 inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700">Step {step + 1}/{steps.length}</span>
          <span className="text-xl font-bold text-gray-800">{currentStep.type === 'file' ? currentStep?.actionText : currentStep.label}</span>
        </div>
      }
      loading={isUploading}
      maxWidth="max-w-xl"
      className="p-0"
      footer={
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-2">
            {currentStep.type === 'file' && currentStep.key === 'answerKey' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    const response = await fetch('https://api.github.com/repos/ZAIFI-BUSINESS-SOLUTIONS-PVT-LTD/inzighted-public-files/contents/sample%20answer%20key.csv');
                    const data = await response.json();
                    const content = atob(data.content);
                    const blob = new Blob([content], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'sample_answer_key.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (error) {
                    toast.error('Failed to download sample answer key');
                  }
                }}
                aria-label="Download sample answer key"
              >
                <Download size={14} />
                <span className="text-xs hidden sm:inline">Sample answer key</span>
              </Button>
            )}
            {currentStep.type === 'file' && currentStep.key === 'responseSheets' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    const response = await fetch('https://api.github.com/repos/ZAIFI-BUSINESS-SOLUTIONS-PVT-LTD/inzighted-public-files/contents/sample%20response%20sheet.csv');
                    const data = await response.json();
                    const content = atob(data.content);
                    const blob = new Blob([content], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'sample_response_sheet.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (error) {
                    toast.error('Failed to download sample response sheet');
                  }
                }}
                aria-label="Download sample response sheet"
              >
                <Download size={14} />
                <span className="text-sm hidden sm:inline">Sample response sheet</span>
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className={`${step > 0 ? '' : 'invisible'}`}
              onClick={() => step > 0 && setStep(step - 1)}
              disabled={isUploading}
            >
              <ArrowLeft size={16} className="mr-1" /> Back
            </Button>
            {!isLastStep ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (!canProceed) return;
                  if (currentStep.key === 'counts') {
                    handleSaveConfig();
                    setStep(step + 1);
                    return;
                  }
                  setStep(step + 1);
                }}
                disabled={!canProceed || isUploading}
              >
                Next <ArrowRight size={16} className="ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="success"
                className="px-6"
                onClick={async () => {
                  console.log('Submit All clicked', { files, metadata });

                  // Validate both answer key and response sheet independently
                  const answerValid = await validateAnswerKey();
                  console.log('validateAnswerKey returned:', answerValid, 'answerKeyValidation=', answerKeyValidation);

                  const responseResult = await validateResponseSheet();
                  console.log('validateResponseSheet returned:', responseResult);

                  // Only proceed if both are valid
                  if (!answerValid || !responseResult || !responseResult.valid) {
                    console.log('Validation failed - answer key valid:', answerValid, 'response valid:', responseResult?.valid);
                    return;
                  }

                  // Use corrected file from validation result if available (avoid state race)
                  const filesToSubmit = {
                    ...files,
                    responseSheets: responseResult.correctedFile || files.responseSheets
                  };

                  console.log('Submitting files:', filesToSubmit);

                  // Pass corrected files to onSubmit
                  onSubmit(metadata, filesToSubmit);
                }}
                disabled={!canProceed || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader size={16} className="animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  'Submit All'
                )}
              </Button>
            )}
          </div>
        </div>
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
              {index < step ? <CheckCircle size={18} className="text-white" /> : (s.type === 'file' ? <s.icon size={18} /> : <FileText size={18} />)}
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
                <div className="text-xs text-gray-500">Choose the syllabus pattern that matches your test</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(patterns).map(([key, value]) => {
                  const selected = pattern === key;
                  return (
                    <button
                      key={key}
                      onClick={() => { setPattern(key); }}
                      aria-pressed={selected}
                      aria-label={value.label}
                      className={`relative p-3 text-left border flex items-center justify-center min-h-[56px] rounded-xl transition-all ${selected ? 'border-blue-300 bg-blue-50' : 'border-slate-100 bg-white hover:bg-blue-50 hover:border-blue-300'}`}>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {(value.subjects || []).map(s => {
                          const Icons = subjectIcons[s] || [FileText];
                          return (
                            <span key={s} className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 ${selected ? 'bg-blue-100 text-blue-700 border border-blue-100' : 'bg-white text-gray-700 border border-gray-100'}`}>
                              {Icons.map((Icon, idx) => <Icon key={idx} size={14} className={`${selected ? 'text-blue-600' : 'text-gray-600'}`} />)}
                              <span>{s}</span>
                            </span>
                          );
                        })}
                      </div>
                    </button>
                  );
                })}

              </div>
            </div>
          ) : (
            <div>
                <div className="mb-3">
                  <h4 className="font-semibold">Configure Question Counts</h4>
                </div>

              <div className="mb-3">
                <p className="text-sm font-medium text-gray-800">Question Counts per Subject</p>
              </div>

              <div className="space-y-3">
                {subjects.map((s, idx) => {
                  const CountIcons = subjectIcons[s] || [FileText];
                  return (
                    <div key={s} className="grid grid-cols-12 items-center gap-3 py-2">
                      <div className="col-span-6 flex items-center gap-3">
                        {CountIcons.map((Icon, idx) => <Icon key={idx} size={16} className="text-gray-600" />)}
                        <span className="text-sm font-medium">{s}</span>
                      </div>
                      <div className="col-span-3 flex justify-center">
                        <input
                          type="number"
                          value={subjectCounts[s] || ''}
                          onChange={e => handleCountChange(s, e.target.value)}
                          className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-center text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label={`${s} question count`}
                        />
                      </div>
                      <div className="col-span-3 flex justify-end gap-2">
                        <Button size="sm" variant="ghost" className="h-8 w-8 px-0" onClick={() => moveSubject(idx, 'up')} aria-label={`Move ${s} up`}>
                          ↑
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 px-0" onClick={() => moveSubject(idx, 'down')} aria-label={`Move ${s} down`}>
                          ↓
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <div className="mt-2 text-sm text-gray-600">Total: <span className="font-medium">{calculateTotal()}</span> questions</div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-4 px-4 pt-2">
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

          {currentStep?.key === 'answerKey' && answerKeyValidation && !answerKeyValidation.valid && (
            <div className="mt-4 p-3 border border-error rounded bg-error/5 text-error text-sm" style={{ whiteSpace: 'pre-wrap' }}>
              {formatValidationErrors(answerKeyValidation.errors)}
            </div>
          )}

          {currentStep?.key === 'responseSheets' && responseValidation && (
            <>
              {!responseValidation.valid && (
                <div className="mt-4 p-3 border border-error rounded bg-error/5 text-error text-sm" style={{ whiteSpace: 'pre-wrap' }}>
                  <div className="font-semibold mb-2">❌ Validation Failed</div>
                  {formatValidationErrors(responseValidation.errors)}
                </div>
              )}

              {(responseValidation.warnings?.length > 0) && (
                <div className="mt-4 p-3 border border-warning rounded bg-warning/5 text-sm">
                  <div className="font-semibold mb-2 text-warning">⚠️ Response Sheet Issues Detected</div>

                  <div className="text-xs max-h-40 overflow-y-auto text-gray-700">
                    {responseValidation.warnings.slice(0, 10).map((w, idx) => (
                      <div key={idx} className="mb-1">
                        • {w.message}
                      </div>
                    ))}
                    {responseValidation.warnings.length > 10 && (
                      <div className="mt-2 text-xs opacity-70">
                        ... and {responseValidation.warnings.length - 10} more warnings
                      </div>
                    )}
                  </div>

                  <div className="mt-2 text-xs text-gray-600 italic">
                    ℹ️ Original file will be uploaded to backend (no auto-corrections applied)
                  </div>
                </div>
              )}
            </>
          )}

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