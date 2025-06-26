const crypto = require('crypto');
const { User } = require('~/models');
const { logger } = require('~/config');
const { callTool } = require('~/server/services/ToolService');

// Encryption settings
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || crypto.randomBytes(32);

/**
 * Encrypt sensitive data
 */
function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypt sensitive data
 */
function decrypt(encryptedData) {
  const decipher = crypto.createDecipher(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY);
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Validate IMAP credentials format
 */
function validateCredentials(credentials) {
  const { host, port, username, password, use_ssl } = credentials;
  
  if (!host || typeof host !== 'string') {
    throw new Error('Valid IMAP host is required');
  }
  
  if (!port || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Valid IMAP port is required (1-65535)');
  }
  
  if (!username || typeof username !== 'string') {
    throw new Error('Valid username/email is required');
  }
  
  if (!password || typeof password !== 'string') {
    throw new Error('Password is required');
  }
  
  if (use_ssl !== undefined && typeof use_ssl !== 'boolean') {
    throw new Error('use_ssl must be a boolean value');
  }
  
  return true;
}

/**
 * Save user's IMAP credentials (encrypted)
 */
async function saveEmailCredentials(req, res, next) {
  try {
    const userId = req.user.id;
    const credentials = req.body;
    
    // Validate input
    validateCredentials(credentials);
    
    // Encrypt sensitive data
    const encryptedPassword = encrypt(credentials.password);
    
    // Prepare email config for storage
    const emailConfig = {
      host: credentials.host,
      port: credentials.port,
      username: credentials.username,
      use_ssl: credentials.use_ssl !== false, // Default to true
      encrypted_password: encryptedPassword,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    // Update user document
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          emailConfig: emailConfig 
        } 
      },
      { new: true, select: '-emailConfig.encrypted_password' }
    );
    
    if (!user) {
      const error = new Error('User not found');
      error.name = 'ValidationError';
      throw error;
    }
    
    logger.info(`Email credentials saved for user ${userId}`);
    
    res.status(200).json({
      success: true,
      message: 'Email credentials saved successfully',
      hasCredentials: true,
    });
    
  } catch (error) {
    logger.error('Error saving email credentials:', error);
    next(error);
  }
}

/**
 * Check if user has saved IMAP credentials
 */
async function getEmailCredentials(req, res, next) {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId).select('emailConfig.host emailConfig.port emailConfig.username emailConfig.use_ssl emailConfig.created_at');
    
    if (!user || !user.emailConfig) {
      return res.status(200).json({
        success: true,
        hasCredentials: false,
        config: null,
      });
    }
    
    res.status(200).json({
      success: true,
      hasCredentials: true,
      config: {
        host: user.emailConfig.host,
        port: user.emailConfig.port,
        username: user.emailConfig.username,
        use_ssl: user.emailConfig.use_ssl,
        created_at: user.emailConfig.created_at,
      },
    });
    
  } catch (error) {
    logger.error('Error getting email credentials:', error);
    next(error);
  }
}

/**
 * Delete user's saved IMAP credentials
 */
async function deleteEmailCredentials(req, res, next) {
  try {
    const userId = req.user.id;
    
    await User.findByIdAndUpdate(
      userId,
      { $unset: { emailConfig: 1 } }
    );
    
    logger.info(`Email credentials deleted for user ${userId}`);
    
    res.status(200).json({
      success: true,
      message: 'Email credentials deleted successfully',
    });
    
  } catch (error) {
    logger.error('Error deleting email credentials:', error);
    next(error);
  }
}

/**
 * Get decrypted credentials for internal use
 */
async function getDecryptedCredentials(userId) {
  const user = await User.findById(userId).select('emailConfig');
  
  if (!user || !user.emailConfig || !user.emailConfig.encrypted_password) {
    const error = new Error('No email credentials found for user');
    error.name = 'EmailAuthError';
    throw error;
  }
  
  const config = user.emailConfig;
  const decryptedPassword = decrypt(config.encrypted_password);
  
  return {
    host: config.host,
    port: config.port,
    username: config.username,
    password: decryptedPassword,
    use_ssl: config.use_ssl,
  };
}

/**
 * Test IMAP connection with provided credentials
 */
async function testEmailConnection(req, res, next) {
  try {
    const credentials = req.body;
    
    // Validate input
    validateCredentials(credentials);
    
    // Set environment variables for the MCP server
    process.env.IMAP_HOST = credentials.host;
    process.env.IMAP_PORT = credentials.port.toString();
    process.env.IMAP_USERNAME = credentials.username;
    process.env.IMAP_PASSWORD = credentials.password;
    process.env.IMAP_USE_SSL = credentials.use_ssl ? 'true' : 'false';
    
    // Test connection using MCP tool
    const result = await callTool('list_folders', {}, 'imap-mcp');
    
    res.status(200).json({
      success: true,
      message: 'Email connection successful',
      folders: result.folders || [],
    });
    
  } catch (error) {
    logger.error('Error testing email connection:', error);
    
    const connectionError = new Error('Failed to connect to email server');
    connectionError.name = 'EmailConnectionError';
    next(connectionError);
  }
}

/**
 * Get list of available email folders
 */
async function getEmailFolders(req, res, next) {
  try {
    const userId = req.user.id;
    
    // Get user's credentials
    const credentials = await getDecryptedCredentials(userId);
    
    // Set environment variables for the MCP server
    process.env.IMAP_HOST = credentials.host;
    process.env.IMAP_PORT = credentials.port.toString();
    process.env.IMAP_USERNAME = credentials.username;
    process.env.IMAP_PASSWORD = credentials.password;
    process.env.IMAP_USE_SSL = credentials.use_ssl ? 'true' : 'false';
    
    // Get folders using MCP tool
    const result = await callTool('list_folders', {}, 'imap-mcp');
    
    res.status(200).json({
      success: true,
      folders: result.folders || [],
    });
    
  } catch (error) {
    logger.error('Error getting email folders:', error);
    next(error);
  }
}

/**
 * Fetch emails from specified folder and timeframe
 */
async function fetchEmails(req, res, next) {
  try {
    const userId = req.user.id;
    const { folder = 'INBOX', days = 7, limit = 50, unread_only = false } = req.body;
    
    // Get user's credentials
    const credentials = await getDecryptedCredentials(userId);
    
    // Set environment variables for the MCP server
    process.env.IMAP_HOST = credentials.host;
    process.env.IMAP_PORT = credentials.port.toString();
    process.env.IMAP_USERNAME = credentials.username;
    process.env.IMAP_PASSWORD = credentials.password;
    process.env.IMAP_USE_SSL = credentials.use_ssl ? 'true' : 'false';
    
    // Fetch emails using MCP tool
    const result = await callTool('fetch_recent_emails', {
      folder,
      days: parseInt(days),
      limit: parseInt(limit),
      unread_only: Boolean(unread_only),
    }, 'imap-mcp');
    
    res.status(200).json({
      success: true,
      emails: result.emails || [],
      count: result.count || 0,
    });
    
  } catch (error) {
    logger.error('Error fetching emails:', error);
    next(error);
  }
}

/**
 * Generate AI-powered email summary
 */
async function summarizeEmails(req, res, next) {
  try {
    const userId = req.user.id;
    const { 
      folder = 'INBOX', 
      days = 7, 
      limit = 50, 
      summary_type = 'brief',
      unread_only = false 
    } = req.body;
    
    // Get user's credentials
    const credentials = await getDecryptedCredentials(userId);
    
    // Set environment variables for the MCP server
    process.env.IMAP_HOST = credentials.host;
    process.env.IMAP_PORT = credentials.port.toString();
    process.env.IMAP_USERNAME = credentials.username;
    process.env.IMAP_PASSWORD = credentials.password;
    process.env.IMAP_USE_SSL = credentials.use_ssl ? 'true' : 'false';
    
    // Generate summary using MCP tool
    const result = await callTool('summarize_emails', {
      folder,
      days: parseInt(days),
      limit: parseInt(limit),
      summary_type,
      unread_only: Boolean(unread_only),
    }, 'imap-mcp');
    
    logger.info(`Email summary generated for user ${userId}: ${result.summary?.total_emails || 0} emails processed`);
    
    res.status(200).json({
      success: true,
      summary: result.summary || {},
    });
    
  } catch (error) {
    logger.error('Error summarizing emails:', error);
    next(error);
  }
}

/**
 * Categorize emails into logical groups
 */
async function categorizeEmails(req, res, next) {
  try {
    const userId = req.user.id;
    const { folder = 'INBOX', days = 7, limit = 100 } = req.body;
    
    // Get user's credentials
    const credentials = await getDecryptedCredentials(userId);
    
    // Set environment variables for the MCP server
    process.env.IMAP_HOST = credentials.host;
    process.env.IMAP_PORT = credentials.port.toString();
    process.env.IMAP_USERNAME = credentials.username;
    process.env.IMAP_PASSWORD = credentials.password;
    process.env.IMAP_USE_SSL = credentials.use_ssl ? 'true' : 'false';
    
    // Categorize emails using MCP tool
    const result = await callTool('categorize_emails', {
      folder,
      days: parseInt(days),
      limit: parseInt(limit),
    }, 'imap-mcp');
    
    res.status(200).json({
      success: true,
      categories: result.categories || [],
    });
    
  } catch (error) {
    logger.error('Error categorizing emails:', error);
    next(error);
  }
}

module.exports = {
  saveEmailCredentials,
  getEmailCredentials,
  deleteEmailCredentials,
  testEmailConnection,
  getEmailFolders,
  fetchEmails,
  summarizeEmails,
  categorizeEmails,
};