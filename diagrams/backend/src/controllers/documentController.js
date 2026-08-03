import * as documentService from '../services/documentService.js';

/**
 * @desc    Create a new document
 * @route   POST /api/documents
 * @access  Private
 */
export const createDocument = async (req, res, next) => {
  try {
    const { title, content } = req.body;
    const document = await documentService.createDocument({
      title,
      content,
      owner: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all documents for the logged-in user
 * @route   GET /api/documents
 * @access  Private
 */
export const getDocuments = async (req, res, next) => {
  try {
    const documents = await documentService.getUserDocuments(req.user._id);

    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get a single document by ID
 * @route   GET /api/documents/:id
 * @access  Private
 */
export const getDocument = async (req, res, next) => {
  try {
    const document = await documentService.getDocumentById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a document
 * @route   PUT /api/documents/:id
 * @access  Private
 */
export const updateDocument = async (req, res, next) => {
  try {
    const document = await documentService.updateDocument(req.params.id, req.body);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a document
 * @route   DELETE /api/documents/:id
 * @access  Private
 */
export const deleteDocument = async (req, res, next) => {
  try {
    const document = await documentService.getDocumentById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    await documentService.deleteDocument(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Document deleted',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add collaborator to a document
 * @route   POST /api/documents/:id/collaborators
 * @access  Private
 */
export const addCollaborator = async (req, res, next) => {
  try {
    const { userId, permission } = req.body;
    const document = await documentService.addCollaborator(
      req.params.id,
      userId,
      permission
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    next(error);
  }
};
