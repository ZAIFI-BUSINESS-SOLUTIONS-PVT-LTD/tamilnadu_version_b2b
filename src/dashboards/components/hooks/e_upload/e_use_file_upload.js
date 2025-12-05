import { useState, useCallback } from 'react';
import { uploadTest } from '../../../../utils/api';
import { toast } from 'react-hot-toast';

export const useFileUpload = () => {
  // State to manage the selected files for upload
  const [files, setFiles] = useState({
    questionPaper: null,
    answerKey: null,
    responseSheets: null,
  });

  // State to track the upload status
  const [isUploading, setIsUploading] = useState(false);

  // useCallback hook to handle the file upload process
  const handleUpload = useCallback(async (metadata = null, filesToUpload = null) => {
    // Prevent multiple uploads if already uploading
    if (isUploading) {
      return false;
    }

    try {
      // Set uploading state to true
      setIsUploading(true);
      // Use provided files or default to state files
      const uploadFiles = filesToUpload || files;
      // Call the API to upload the test files
      // Forward optional metadata to the API helper so server receives subject config
      const response = await uploadTest(
        uploadFiles.questionPaper,
        uploadFiles.answerKey,
        uploadFiles.responseSheets,
        metadata
      );

      // Handle API response for errors
      if (response?.error) {
        toast.error(`Upload failed: ${response.error}`);
        return false; // Return false if upload failed
      }

      // Display success message and reset the files state
      toast.success(response?.message || 'Upload successful!');
      setFiles({ questionPaper: null, answerKey: null, responseSheets: null });
      return true; // Return true on successful upload
    } catch (error) {
      // Display generic error message for network or other errors
      toast.error('Upload failed');
      console.error('Error during file upload:', error);
      return false; // Return false if an error occurred
    } finally {
      // Set uploading state back to false, regardless of success or failure
      setIsUploading(false);
    }
  }, [files, isUploading]); // Re-create the function if 'files' or 'isUploading' changes

  // Return the state and the upload handler function
  return { files, setFiles, isUploading, handleUpload };
};