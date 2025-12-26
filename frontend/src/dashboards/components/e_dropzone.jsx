import React from 'react';
import DropZone from './ui/dropzone.jsx';

// Wrapper for backward compatibility if needed
const EducatorDropZone = (props) => <DropZone {...props} />;

export default React.memo(EducatorDropZone);