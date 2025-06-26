const mongoose = require('mongoose');
const { logger } = require('~/config');

/**
 * Shared Link Schema
 */
const sharedLinkSchema = new mongoose.Schema(
  {
    shareId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    messages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
      },
    ],
    isPublic: {
      type: Boolean,
      default: false,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    showCode: {
      type: Boolean,
      default: true,
    },
    isHelpView: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for efficient queries
sharedLinkSchema.index({ user: 1, createdAt: -1 });

const SharedLink = mongoose.model('SharedLink', sharedLinkSchema);

/**
 * Get shared messages by shareId
 * @param {string} shareId - The share ID
 * @returns {Promise<Object|null>} The shared link with populated messages
 */
async function getSharedMessages(shareId) {
  try {
    const share = await SharedLink.findOne({ shareId })
      .populate({
        path: 'messages',
        select: 'text sender messageId parentMessageId isCreatedByUser createdAt model',
      })
      .populate({
        path: 'user',
        select: 'username name avatar',
      })
      .lean();

    return share;
  } catch (error) {
    logger.error('Error getting shared messages:', error);
    throw error;
  }
}

/**
 * Get shared link by shareId
 * @param {string} shareId - The share ID
 * @returns {Promise<Object|null>} The shared link
 */
async function getSharedLink(shareId) {
  try {
    return await SharedLink.findOne({ shareId }).lean();
  } catch (error) {
    logger.error('Error getting shared link:', error);
    throw error;
  }
}

/**
 * Create a new shared link
 * @param {Object} shareData - The share data
 * @returns {Promise<Object>} The created shared link
 */
async function createSharedLink(shareData) {
  try {
    const share = new SharedLink(shareData);
    await share.save();
    return share.toObject();
  } catch (error) {
    logger.error('Error creating shared link:', error);
    throw error;
  }
}

/**
 * Update a shared link
 * @param {string} shareId - The share ID
 * @param {Object} updateData - The data to update
 * @returns {Promise<Object|null>} The updated shared link
 */
async function updateSharedLink(shareId, updateData) {
  try {
    const share = await SharedLink.findOneAndUpdate(
      { shareId },
      { ...updateData, updatedAt: new Date() },
      { new: true, lean: true }
    );
    return share;
  } catch (error) {
    logger.error('Error updating shared link:', error);
    throw error;
  }
}

/**
 * Get shared links for a user with pagination
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Paginated shared links
 */
async function getSharedLinks(params = {}) {
  try {
    const { user, pageParam, pageSize = 10 } = params;
    
    const query = { user };
    const options = {
      sort: { createdAt: -1 },
      limit: parseInt(pageSize),
      lean: true,
    };

    if (pageParam) {
      query.createdAt = { $lt: new Date(pageParam) };
    }

    const shares = await SharedLink.find(query, null, options);
    
    let nextCursor = null;
    if (shares.length === pageSize) {
      nextCursor = shares[shares.length - 1].createdAt.toISOString();
    }

    return {
      shares,
      nextCursor,
      hasNextPage: !!nextCursor,
    };
  } catch (error) {
    logger.error('Error getting shared links:', error);
    throw error;
  }
}

/**
 * Delete a shared link
 * @param {Object} params - Delete parameters
 * @returns {Promise<Object>} Delete result
 */
async function deleteSharedLink(params) {
  try {
    const { shareId, user } = params;
    const result = await SharedLink.deleteOne({ shareId, user });
    
    return {
      acknowledged: result.acknowledged,
      deletedCount: result.deletedCount,
    };
  } catch (error) {
    logger.error('Error deleting shared link:', error);
    throw error;
  }
}

module.exports = {
  SharedLink,
  getSharedMessages,
  getSharedLink,
  createSharedLink,
  updateSharedLink,
  getSharedLinks,
  deleteSharedLink,
};