import React, { useMemo } from 'react';
import { FileText, Key, File, Spinner, ArrowLeft, ArrowRight, CheckCircle } from '@phosphor-icons/react';
import Modal from '../../components/ui/modal.jsx';

// DropZone component (merged from e_dropzone.jsx)
import DropZone from '../../components/ui/dropzone.jsx';
const EducatorDropZone = (props) => <DropZone {...props} />;

// Modal component for handling multi-step file uploads
const UploadModal = ({ step, setStep, files, setFiles, onSubmit, onClose, isUploading }) => {
  // Configuration for each upload step
  const stepsConfig = useMemo(
    () => [
      {
        key: 'questionPaper',
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
        label: 'Response Sheets',
        icon: File,
        file: files.responseSheets,
        setFile: (file) => setFiles({ ...files, responseSheets: file }),
        accept: '.csv',
        actionText: 'Upload Response Sheets',
        description: 'Upload student response sheets in CSV format',
      },
    ],
    [files] // Re-memoize when the 'files' object changes
  );

  // Get the configuration for the current step
  const currentStep = stepsConfig[step];
  // Determine if the user can proceed to the next step
  const canProceed = !!currentStep?.file;
  // Check if the current step is the last one
  const isLastStep = step === stepsConfig.length - 1;

  // Calculate the number of completed steps
  const completedSteps = useMemo(() => stepsConfig.filter((s, i) => i < step && !!s.file).length, [step, stepsConfig]);
  // Calculate the progress percentage
  const progressPercentage = useMemo(() => Math.round((completedSteps / stepsConfig.length) * 100), [
    completedSteps,
    stepsConfig.length,
  ]);

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={
        <div className="flex items-center mb-1">
          <span className="badge badge-ghost badge-sm mr-2">Step {step + 1}/{stepsConfig.length}</span>
          <span className="text-xl font-bold text-gray-800">{currentStep?.actionText}</span>
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
              onClick={() => canProceed && setStep(step + 1)}
              disabled={!canProceed || isUploading}
            >
              Next <ArrowRight size={16} className="ml-1" />
            </button>
          ) : (
            <button
              className={`btn btn-success btn-sm px-6 ${!canProceed || isUploading ? 'btn-disabled opacity-50' : ''}`}
              onClick={onSubmit}
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
      {/* Header description */}
      <div className="mb-6">
        <p className="text-gray-600 text-sm">{currentStep?.description}</p>
      </div>
      {/* Progress bar */}
      <div className="w-full h-1 bg-base-200 rounded-full mb-6 overflow-hidden">
        <div
          className="h-full bg-success transition-all duration-300"
          style={{ width: `${((step + (canProceed ? 0.5 : 0)) / stepsConfig.length) * 100}%` }}
        />
      </div>
      {/* Step indicators */}
      <div className="flex justify-between mb-6 px-2">
        {stepsConfig.map((s, index) => (
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
              {index < step ? <CheckCircle weight="fill" size={18} /> : <s.icon size={18} />}
            </div>
            <span
              className={`text-xs mt-1 ${index === step ? 'font-medium text-primary' : 'text-gray-500'}`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
      {/* Dropzone */}
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