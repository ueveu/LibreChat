const express = require('express');
const {
  requireJwtAuth,
  setHeaders,
  checkBan,
  validateEndpoint,
  concurrentLimiter,
} = require('~/server/middleware');
const { toolCallLimiter } = require('~/server/middleware/limiters');
const {
  saveEmailCredentials,
  getEmailCredentials,
  deleteEmailCredentials,
  summarizeEmails,
  categorizeEmails,
  fetchEmails,
  getEmailFolders,
  testEmailConnection,
} = require('~/server/controllers/EmailController');

const router = express.Router();

// Apply common middleware
router.use(requireJwtAuth);
router.use(setHeaders);
router.use(checkBan);

/**
 * @route POST /api/email/credentials
 * @desc Save user's IMAP credentials (encrypted)
 * @access Private
 */
router.post('/credentials', async (req, res, next) => {
  try {
    await saveEmailCredentials(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/email/credentials
 * @desc Check if user has saved IMAP credentials
 * @access Private
 */
router.get('/credentials', async (req, res, next) => {
  try {
    await getEmailCredentials(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/email/credentials
 * @desc Delete user's saved IMAP credentials
 * @access Private
 */
router.delete('/credentials', async (req, res, next) => {
  try {
    await deleteEmailCredentials(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/email/test-connection
 * @desc Test IMAP connection with provided credentials
 * @access Private
 */
router.post('/test-connection', toolCallLimiter, async (req, res, next) => {
  try {
    await testEmailConnection(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/email/folders
 * @desc Get list of available email folders
 * @access Private
 */
router.get('/folders', toolCallLimiter, async (req, res, next) => {
  try {
    await getEmailFolders(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/email/fetch
 * @desc Fetch emails from specified folder and timeframe
 * @access Private
 */
router.post('/fetch', toolCallLimiter, concurrentLimiter, async (req, res, next) => {
  try {
    await fetchEmails(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/email/summarize
 * @desc Generate AI-powered email summary
 * @access Private
 */
router.post('/summarize', toolCallLimiter, concurrentLimiter, async (req, res, next) => {
  try {
    await summarizeEmails(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/email/categorize
 * @desc Categorize emails into logical groups
 * @access Private
 */
router.post('/categorize', toolCallLimiter, concurrentLimiter, async (req, res, next) => {
  try {
    await categorizeEmails(req, res, next);
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Email API Error:', error);
  
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid input data',
      details: error.message,
    });
  }

  if (error.name === 'EmailConnectionError') {
    return res.status(503).json({
      success: false,
      error: 'Failed to connect to email server',
      details: error.message,
    });
  }

  if (error.name === 'EmailAuthError') {
    return res.status(401).json({
      success: false,
      error: 'Email authentication failed',
      details: 'Please check your IMAP credentials and try again',
    });
  }

  if (error.name === 'MCPToolError') {
    return res.status(500).json({
      success: false,
      error: 'Email processing service error',
      details: error.message,
    });
  }

  // Generic error
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
  });
});

module.exports = router;