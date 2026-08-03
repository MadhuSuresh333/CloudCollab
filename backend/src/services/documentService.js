import Document from '../models/Document.js';

/**
 * Create a new document.
 */
export const createDocument = async ({ title, content, owner }) => {
  const document = await Document.create({ title, content, owner });
  return document;
};

/**
 * Get all documents owned by or shared with a user.
 */
export const getUserDocuments = async (userId) => {
  const documents = await Document.find({
    $or: [
      { owner: userId },
      { 'collaborators.user': userId },
      { isPublic: true },
    ],
  })
    .populate('owner', 'name email avatar')
    .sort({ updatedAt: -1 });

  return documents;
};

/**
 * Get a document by ID.
 */
export const getDocumentById = async (documentId) => {
  const document = await Document.findById(documentId)
    .populate('owner', 'name email avatar')
    .populate('collaborators.user', 'name email avatar');

  return document;
};

/**
 * Update a document by ID.
 */
export const updateDocument = async (documentId, updateData) => {
  const document = await Document.findByIdAndUpdate(documentId, updateData, {
    new: true,
    runValidators: true,
  });
  return document;
};

/**
 * Delete a document by ID.
 */
export const deleteDocument = async (documentId) => {
  await Document.findByIdAndDelete(documentId);
};

/**
 * Add a collaborator to a document.
 */
export const addCollaborator = async (documentId, userId, permission = 'view') => {
  const document = await Document.findByIdAndUpdate(
    documentId,
    {
      $addToSet: { collaborators: { user: userId, permission } },
    },
    { new: true }
  );
  return document;
};
