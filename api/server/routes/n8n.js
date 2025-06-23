const express = require('express');
const { requireJwtAuth } = require('../middleware');
const { logger } = require('~/config');

const router = express.Router();

/**
 * Get N8N service status
 * @route GET /n8n/status
 * @desc Check if N8N service is running and accessible
 * @access Private
 */
router.get('/status', requireJwtAuth, async (req, res) => {
  try {
    const n8nUrl = process.env.N8N_URL || 'http://n8n-proxy:8080';
    
    // Simple health check - could be enhanced with actual N8N API call
    const response = {
      status: 'running',
      url: n8nUrl,
      message: 'N8N service is available',
      timestamp: new Date().toISOString(),
    };

    logger.info('[N8N] Status check requested', { 
      userId: req.user?.id,
      url: n8nUrl 
    });

    res.json(response);
  } catch (error) {
    logger.error('[N8N] Status check failed', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check N8N status',
      error: error.message,
    });
  }
});

/**
 * Get N8N configuration
 * @route GET /n8n/config
 * @desc Get N8N service configuration for frontend
 * @access Private
 */
router.get('/config', requireJwtAuth, async (req, res) => {
  try {
    const config = {
      n8nUrl: process.env.REACT_APP_N8N_URL || 'http://138.199.157.172:8080',
      enabled: true,
      features: {
        embedded: true,
        newWindow: true,
      },
    };

    logger.info('[N8N] Configuration requested', { 
      userId: req.user?.id,
      config 
    });

    res.json(config);
  } catch (error) {
    logger.error('[N8N] Configuration request failed', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get N8N configuration',
      error: error.message,
    });
  }
});

/**
 * Proxy N8N webhooks (if needed for LibreChat integration)
 * @route POST /n8n/webhook/:webhookId
 * @desc Proxy webhooks between LibreChat and N8N
 * @access Private
 */
router.post('/webhook/:webhookId', requireJwtAuth, async (req, res) => {
  try {
    const { webhookId } = req.params;
    const { body } = req;

    logger.info('[N8N] Webhook received', { 
      userId: req.user?.id,
      webhookId,
      body 
    });

    // Here you could implement webhook forwarding to N8N
    // or handle N8N -> LibreChat integrations

    res.json({
      status: 'success',
      message: 'Webhook processed',
      webhookId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[N8N] Webhook processing failed', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to process webhook',
      error: error.message,
    });
  }
});

module.exports = router;