export const CHAT_CONFIG = {
  MAX_MESSAGE_LENGTH: 1000,
  TYPING_DELAY: 900,
  MAX_HISTORY_ITEMS: 50,
  SCROLL_BEHAVIOR: 'smooth',
  AUTO_SCROLL_DELAY: 100,
  DEBOUNCE_DELAY: 300,
  MAX_VISIBLE_MESSAGES: 100
};

export const MESSAGE_TYPES = {
  USER: 'user',
  BOT: 'bot',
  SYSTEM: 'system'
};

export const CHAT_STATES = {
  IDLE: 'idle',
  TYPING: 'typing',
  LOADING: 'loading',
  ERROR: 'error'
};

export const DEFAULT_SUGGESTIONS = [
  'Student Performance Analysis\nGet detailed insights into student performance trends',
  'Attendance Reports\nView and analyze student attendance patterns',
  'Assignment Feedback\nGenerate personalized feedback for student assignments',
  'Learning Recommendations\nGet AI-powered recommendations for student improvement'
];

export const MOCK_HISTORY = [
  { 
    id: 1, 
    title: 'Student Performance', 
    summary: 'Summary of latest student performance.',
    timestamp: new Date(Date.now() - 86400000) // 1 day ago
  },
  { 
    id: 2, 
    title: 'Exam Schedule', 
    summary: 'Upcoming exam dates and details.',
    timestamp: new Date(Date.now() - 172800000) // 2 days ago
  },
  { 
    id: 3, 
    title: 'Attendance Query', 
    summary: 'Attendance report for class 10A.',
    timestamp: new Date(Date.now() - 259200000) // 3 days ago
  },
  { 
    id: 4, 
    title: 'Homework Help', 
    summary: 'Assistance with math homework.',
    timestamp: new Date(Date.now() - 345600000) // 4 days ago
  },
];

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
  SERVER_ERROR: 'Something went wrong. Please try again later.',
  INVALID_INPUT: 'Please enter a valid message.',
  MESSAGE_TOO_LONG: `Message too long. Please keep it under ${CHAT_CONFIG.MAX_MESSAGE_LENGTH} characters.`
};
