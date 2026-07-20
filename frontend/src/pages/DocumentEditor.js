import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { documentsAPI } from '@/services/api';
import { DOCUMENT } from '@/constants/testIds';
import { useToast } from '@/hooks/use-toast';
import { useDocumentSocket } from '@/hooks/useDocumentSocket';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Save, Users, Wifi, WifiOff } from 'lucide-react';

// Generate a consistent color per user_id for the presence chip
function colorForUser(userId) {
  const palette = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-500',
    'bg-emerald-500', 'bg-teal-500', 'bg-sky-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500',
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

export default function DocumentEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [document, setDocument] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Ref used to avoid echoing remote changes back over the wire and to
  // guard against setState-during-typing race conditions.
  const applyingRemote = useRef(false);

  const { activeUsers, sendContentChange, sendTitleChange, connected } = useDocumentSocket(id, {
    onContentChange: (remoteContent) => {
      applyingRemote.current = true;
      setContent(remoteContent);
      // Release the flag on next tick so subsequent local edits are broadcast
      setTimeout(() => { applyingRemote.current = false; }, 0);
    },
    onTitleChange: (remoteTitle) => {
      applyingRemote.current = true;
      setTitle(remoteTitle);
      setTimeout(() => { applyingRemote.current = false; }, 0);
    },
  });

  useEffect(() => {
    loadDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadDocument = async () => {
    try {
      const response = await documentsAPI.getById(id);
      setDocument(response.data);
      setTitle(response.data.title);
      setContent(response.data.content);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load document',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContentChange = (e) => {
    const val = e.target.value;
    setContent(val);
    if (!applyingRemote.current) {
      sendContentChange(val);
    }
  };

  const handleTitleChange = (e) => {
    const val = e.target.value;
    setTitle(val);
    if (!applyingRemote.current) {
      sendTitleChange(val);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await documentsAPI.update(id, { title, content });
      toast({ title: 'Saved', description: 'Document saved!' });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save document',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (document?.workspace_id) {
      navigate(`/workspace/${document.workspace_id}`);
    } else {
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Loading document...</p>
      </div>
    );
  }

  // Show all active users (including current user for clarity)
  const otherUsers = activeUsers.filter((u) => u.user_id !== user?.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button variant="ghost" size="sm" onClick={handleBack} data-testid="doc-editor-back-button">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {/* Presence + connection */}
          <div className="flex items-center gap-3" data-testid="doc-editor-presence">
            <div
              className={`flex items-center gap-1 text-xs ${connected ? 'text-emerald-600' : 'text-gray-400'}`}
              data-testid="doc-editor-connection-status"
              title={connected ? 'Real-time sync active' : 'Disconnected'}
            >
              {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {connected ? 'Live' : 'Offline'}
            </div>

            {otherUsers.length > 0 && (
              <div className="flex items-center gap-2" data-testid="doc-editor-active-users">
                <Users className="h-4 w-4 text-gray-500" />
                <div className="flex -space-x-2">
                  {otherUsers.slice(0, 5).map((u) => (
                    <div
                      key={u.user_id}
                      className={`h-7 w-7 rounded-full ${colorForUser(u.user_id)} text-white text-xs font-semibold flex items-center justify-center ring-2 ring-white`}
                      title={u.user_name}
                      data-testid={`doc-editor-active-user-${u.user_id}`}
                    >
                      {u.user_name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {otherUsers.length > 5 && (
                    <div className="h-7 w-7 rounded-full bg-gray-500 text-white text-xs font-semibold flex items-center justify-center ring-2 ring-white">
                      +{otherUsers.length - 5}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {otherUsers.length} other{otherUsers.length === 1 ? '' : 's'} editing
                </span>
              </div>
            )}

            <Button data-testid={DOCUMENT.saveButton} onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Edit Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                data-testid={DOCUMENT.titleInput}
                id="title"
                value={title}
                onChange={handleTitleChange}
                placeholder="Document title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                data-testid={DOCUMENT.contentEditor}
                id="content"
                value={content}
                onChange={handleContentChange}
                placeholder="Start writing..."
                rows={20}
                className="font-mono"
              />
            </div>
            {document && (
              <div className="text-sm text-gray-500">
                <p>Created by {document.created_by_name}</p>
                <p>Last updated: {new Date(document.updated_at).toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Changes sync in real-time. Click Save to force a snapshot.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
