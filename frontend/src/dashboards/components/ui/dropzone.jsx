import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  File,
  UploadSimple,
  Trash,
  CheckCircle,
  XCircle,
  WarningCircle,
  ArrowClockwise,
  FilePdf,
  FileCsv,
  Question,
} from '@phosphor-icons/react';
import { toast } from 'react-hot-toast';
import { validateFile } from '../../../utils/validation';
import { Button } from '../../../components/ui/button.jsx';

/**
 * Generic reusable DropZone component for file uploads
 * @param {string} label - Label for the dropzone
 * @param {File|null} file - The selected file
 * @param {function} setFile - Setter for file
 * @param {React.Component} icon - Icon to show when no file
 * @param {string} accept - Accepted file types (e.g. '.pdf')
 * @param {boolean} disabled - Disable the dropzone
 * @param {function} onFileValidation - Callback after file validation
 */
const DropZone = ({ label, file, setFile, icon: Icon, accept, disabled = false, onFileValidation }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [dragTimeout, setDragTimeout] = useState(null);
  const fileInputRef = useRef(null);

  const getFileIcon = useCallback((filename) => {
    if (!filename) return File;
    if (filename.endsWith('.pdf')) return FilePdf;
    if (filename.endsWith('.csv')) return FileCsv;
    return File;
  }, []);

  const FileIcon = file ? getFileIcon(file.name) : Icon;

  const handleFileValidation = useCallback(
    async (selectedFile) => {
      setIsValidating(true);
      try {
        const validation = validateFile(selectedFile, accept);
        if (validation.valid) {
          setFile(selectedFile);
          onFileValidation?.(selectedFile);
          toast.success('File validated successfully!', {
            icon: <CheckCircle weight="fill" size={20} className="text-emerald-600" />,
            duration: 3000,
          });
        } else {
          toast.error(validation.error, {
            icon: <XCircle weight="fill" size={20} className="text-rose-600" />,
            duration: 4000,
          });
        }
      } catch (error) {
        toast.error('Error validating file', {
          icon: <WarningCircle weight="fill" size={20} className="text-rose-600" />,
        });
      } finally {
        setIsValidating(false);
      }
    },
    [accept, setFile, onFileValidation]
  );

  const handleDragEnter = (e) => {
    e.preventDefault();
    if (disabled) return;
    if (dragTimeout) clearTimeout(dragTimeout);
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    const timeout = setTimeout(() => setIsDragging(false), 100);
    setDragTimeout(timeout);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (dragTimeout) clearTimeout(dragTimeout);
    setIsDragging(false);
    if (disabled) {
      toast.error('File upload is currently disabled', {
        icon: <XCircle weight="fill" size={20} />,
      });
      return;
    }
    if (e.dataTransfer.files?.[0]) {
      handleFileValidation(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    if (disabled) {
      toast.error('File upload is currently disabled', {
        icon: <XCircle weight="fill" size={20} />,
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (e) => {
    e.stopPropagation();
    setFile(null);
    toast.success('File removed', {
      icon: <CheckCircle weight="fill" size={20} className="text-emerald-600" />,
    });
  };

  const getAcceptLabel = () => {
    if (accept === '.pdf') return 'PDF documents';
    if (accept === '.csv') return 'CSV spreadsheets';
    return accept;
  };

  return (
    <div className="w-full">
      <motion.div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          handleDragEnter(e);
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`w-full mx-auto border-2 rounded-xl cursor-pointer
          transition-all duration-300 flex flex-col items-center justify-center
          bg-background p-6 min-h-[220px]
          ${isDragging
            ? 'border-dashed border-primary bg-primary/5 shadow-lg transform scale-[1.01]'
            : file
              ? 'border-solid border-gray-200 hover:border-primary/50 hover:shadow'
              : 'border-dashed border-gray-200 hover:border-primary/50 hover:shadow'
          }
          ${disabled ? 'opacity-70 cursor-not-allowed bg-muted' : ''}`}
        aria-label={file ? `Selected file: ${file.name}` : `Upload ${label || 'file'}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick();
          }
        }}
        initial={{ opacity: 0.9, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={!disabled ? { scale: 1.005 } : {}}
        transition={{ duration: 0.2 }}
      >
        {file ? (
          <div className="flex flex-col items-center justify-center w-full p-2">
            <motion.div
              className="p-3 rounded-full bg-primary/10 text-primary mb-3"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10, stiffness: 200 }}
            >
              <FileIcon size={28} weight="fill" className="text-primary" />
            </motion.div>
            <div className="flex items-center justify-center space-x-2 w-full max-w-full mb-1">
              <p className="font-medium text-center break-all line-clamp-1 text-gray-800">{file.name}</p>
            </div>
            <div className="flex items-center text-xs text-base-content/60 mb-4 gap-1">
              <span className="px-2 py-1 rounded-full bg-muted text-foreground/70">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </span>
              <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">
                {file.name.split('.').pop().toUpperCase()}
              </span>
            </div>
            {!disabled && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  <ArrowClockwise size={16} className="mr-1" /> Replace
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRemoveFile}
                  title="Remove file"
                  disabled={isValidating}
                  aria-label="Remove file"
                  className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <Trash size={16} className="mr-1" /> Remove
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-3">
            {isValidating ? (
              <motion.div
                className="flex flex-col items-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span className="mb-3 inline-block h-8 w-8 rounded-full border-4 border-primary/30 border-t-primary animate-spin"></span>
                <p className="text-sm font-medium">Validating file...</p>
                <p className="text-xs text-muted-foreground mt-1">Please wait while we check your file</p>
              </motion.div>
            ) : (
              <>
                <motion.div
                  className={`p-4 rounded-full ${isDragging ? 'bg-primary/20' : 'bg-muted'}`}
                  animate={{
                    scale: isDragging ? 1.1 : 1,
                    backgroundColor: isDragging ? 'rgba(37, 99, 235, 0.2)' : 'rgba(243, 244, 246, 1)',
                  }}
                  transition={{ duration: 0.2 }}
                >
                  <UploadSimple
                    size={40}
                    weight={isDragging ? 'fill' : 'regular'}
                    className={`${isDragging ? 'text-primary' : 'text-primary/80'}`}
                  />
                </motion.div>
                <motion.p
                  className="text-md font-medium text-primary mt-4 mb-1"
                  animate={{
                    scale: isDragging ? 1.05 : 1,
                  }}
                >
                  {isDragging
                    ? 'Drop to upload'
                    : disabled
                      ? 'Upload disabled'
                      : `Drag & drop your ${label?.toLowerCase() || 'file'}`}
                </motion.p>
                {!isDragging && (
                  <>
                    <p className="text-sm text-muted-foreground mb-3">
                      or <span className="font-medium text-primary underline">browse files</span>
                    </p>
                    <div className="flex items-center text-xs text-muted-foreground gap-1">
                      <span className="px-2 py-1 rounded-full bg-muted flex items-center gap-1">
                        <Icon size={12} /> {getAcceptLabel()}
                      </span>
                      <span className="px-2 py-1 rounded-full bg-muted">Max 50MB</span>
                      <div className="relative group">
                        <Question size={14} className="text-muted-foreground cursor-help" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 p-2 bg-white text-xs text-left rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none border border-gray-200 z-10">
                          Only files matching the required format will be accepted. Make sure your file is properly
                          formatted.
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
        {isDragging && !disabled && (
          <motion.div
            className="absolute inset-0 border-2 border-dashed border-primary rounded-xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </motion.div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept={accept}
        disabled={disabled || isValidating}
        onChange={(e) => {
          const selectedFile = e.target.files?.[0];
          if (selectedFile) {
            handleFileValidation(selectedFile);
          }
          e.target.value = '';
        }}
        aria-hidden="true"
      />
    </div>
  );
};

export default React.memo(DropZone);
