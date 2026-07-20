import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { workspacesAPI, documentsAPI, filesAPI, projectsAPI } from '@/services/api';
import { DOCUMENT, PROJECT, WORKSPACE } from '@/constants/testIds';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, FileText, Upload, FolderKanban, Users, Trash2 } from 'lucide-react';

export default function Workspace() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [workspace, setWorkspace] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [files, setFiles] = useState([]);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Document dialog
  const [showDocDialog, setShowDocDialog] = useState(false);
  const [docForm, setDocForm] = useState({ title: '', content: '' });
  const [creatingDoc, setCreatingDoc] = useState(false);

  // Project dialog
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: '', description: '' });
  const [creatingProject, setCreatingProject] = useState(false);

  // File upload
  const [uploading, setUploading] = useState(false);

  // Member invite
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadWorkspaceData();
  }, [id]);

  const loadWorkspaceData = async () => {
    try {
      const [wsRes, docsRes, filesRes, projectsRes, membersRes] = await Promise.all([
        workspacesAPI.getById(id),
        documentsAPI.getAll(id),
        filesAPI.getAll(id),
        projectsAPI.getAll(id),
        workspacesAPI.getMembers(id),
      ]);
      
      setWorkspace(wsRes.data);
      setDocuments(docsRes.data);
      setFiles(filesRes.data);
      setProjects(projectsRes.data);
      setMembers(membersRes.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load workspace data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async (e) => {
    e.preventDefault();
    setCreatingDoc(true);
    try {
      const response = await documentsAPI.create(id, docForm);
      setDocuments([...documents, response.data]);
      setShowDocDialog(false);
      setDocForm({ title: '', content: '' });
      toast({ title: 'Success', description: 'Document created!' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create document',
        variant: 'destructive',
      });
    } finally {
      setCreatingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    
    try {
      await documentsAPI.delete(docId);
      setDocuments(documents.filter((d) => d.id !== docId));
      toast({ title: 'Success', description: 'Document deleted!' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive',
      });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await filesAPI.upload(id, file);
      setFiles([...files, response.data]);
      toast({ title: 'Success', description: 'File uploaded!' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    
    try {
      await filesAPI.delete(fileId);
      setFiles(files.filter((f) => f.id !== fileId));
      toast({ title: 'Success', description: 'File deleted!' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete file',
        variant: 'destructive',
      });
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setCreatingProject(true);
    try {
      const response = await projectsAPI.create(id, projectForm);
      setProjects([...projects, response.data]);
      setShowProjectDialog(false);
      setProjectForm({ name: '', description: '' });
      toast({ title: 'Success', description: 'Project created!' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive',
      });
    } finally {
      setCreatingProject(false);
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    setInviting(true);
    try {
      const response = await workspacesAPI.inviteMember(id, { email: inviteEmail, role: 'member' });
      setMembers([...members, response.data]);
      setShowInviteDialog(false);
      setInviteEmail('');
      toast({ title: 'Success', description: 'Member invited!' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to invite member',
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    
    try {
      await workspacesAPI.removeMember(id, userId);
      setMembers(members.filter((m) => m.user_id !== userId));
      toast({ title: 'Success', description: 'Member removed!' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to remove member',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{workspace?.name}</h1>
              {workspace?.description && (
                <p className="text-gray-600 text-sm">{workspace.description}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="documents" className="space-y-4">
          <TabsList className="bg-white">
            <TabsTrigger value="documents">
              <FileText className="h-4 w-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="files">
              <Upload className="h-4 w-4 mr-2" />
              Files
            </TabsTrigger>
            <TabsTrigger value="projects">
              <FolderKanban className="h-4 w-4 mr-2" />
              Projects
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users className="h-4 w-4 mr-2" />
              Members
            </TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Documents</CardTitle>
                    <CardDescription>Collaborative documents in this workspace</CardDescription>
                  </div>
                  <Dialog open={showDocDialog} onOpenChange={setShowDocDialog}>
                    <DialogTrigger asChild>
                      <Button data-testid={DOCUMENT.createButton}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Document
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Document</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateDocument} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="doc-title">Title</Label>
                          <Input
                            data-testid={DOCUMENT.titleInput}
                            id="doc-title"
                            value={docForm.title}
                            onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="doc-content">Content</Label>
                          <Textarea
                            data-testid={DOCUMENT.contentEditor}
                            id="doc-content"
                            value={docForm.content}
                            onChange={(e) => setDocForm({ ...docForm, content: e.target.value })}
                            rows={5}
                          />
                        </div>
                        <Button
                          data-testid={DOCUMENT.saveButton}
                          type="submit"
                          className="w-full"
                          disabled={creatingDoc}
                        >
                          {creatingDoc ? 'Creating...' : 'Create Document'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No documents yet</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        data-testid={DOCUMENT.card}
                        className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => navigate(`/document/${doc.id}`)}
                        >
                          <h4 className="font-semibold text-gray-900">{doc.title}</h4>
                          <p className="text-sm text-gray-500">
                            by {doc.created_by_name} • {new Date(doc.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          data-testid={DOCUMENT.deleteButton}
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteDocument(doc.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Files</CardTitle>
                    <CardDescription>Uploaded files in this workspace</CardDescription>
                  </div>
                  <div>
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    <Button asChild disabled={uploading}>
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="h-4 w-4 mr-2" />
                        {uploading ? 'Uploading...' : 'Upload File'}
                      </label>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {files.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No files yet</p>
                ) : (
                  <div className="space-y-2">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <h4 className="font-semibold text-gray-900">{file.name}</h4>
                          <p className="text-sm text-gray-500">
                            {(file.size / 1024).toFixed(2)} KB • by {file.uploaded_by_name} •{' '}
                            {new Date(file.uploaded_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteFile(file.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Projects</CardTitle>
                    <CardDescription>Manage projects and tasks</CardDescription>
                  </div>
                  <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
                    <DialogTrigger asChild>
                      <Button data-testid={PROJECT.createButton}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Project
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Project</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateProject} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="project-name">Name</Label>
                          <Input
                            data-testid={PROJECT.nameInput}
                            id="project-name"
                            value={projectForm.name}
                            onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="project-desc">Description</Label>
                          <Textarea
                            data-testid={PROJECT.descriptionInput}
                            id="project-desc"
                            value={projectForm.description}
                            onChange={(e) =>
                              setProjectForm({ ...projectForm, description: e.target.value })
                            }
                            rows={3}
                          />
                        </div>
                        <Button
                          data-testid={PROJECT.submitButton}
                          type="submit"
                          className="w-full"
                          disabled={creatingProject}
                        >
                          {creatingProject ? 'Creating...' : 'Create Project'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No projects yet</p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {projects.map((project) => (
                      <Card
                        key={project.id}
                        data-testid={PROJECT.card}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`/project/${project.id}`)}
                      >
                        <CardHeader>
                          <CardTitle className="text-lg">{project.name}</CardTitle>
                          {project.description && (
                            <CardDescription>{project.description}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-500">
                            Created by {project.created_by_name}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Members</CardTitle>
                    <CardDescription>Workspace members and roles</CardDescription>
                  </div>
                  <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite Member</DialogTitle>
                        <DialogDescription>
                          Enter the email address of the user to invite
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleInviteMember} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="invite-email">Email</Label>
                          <Input
                            id="invite-email"
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={inviting}>
                          {inviting ? 'Inviting...' : 'Send Invite'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <h4 className="font-semibold text-gray-900">{member.user_name}</h4>
                        <p className="text-sm text-gray-500">
                          {member.user_email} • {member.role}
                        </p>
                      </div>
                      {member.role !== 'owner' && workspace?.owner_id === user?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.user_id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
