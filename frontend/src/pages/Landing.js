import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { HOME } from '@/constants/testIds';
import { Cloud, FileText, Users, FolderKanban, Lock, Zap } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Cloud className="h-8 w-8 text-indigo-600" />
          <span className="text-2xl font-bold text-gray-900">CloudCollab</span>
        </div>
        <div className="space-x-4">
          <Button variant="ghost" onClick={() => navigate('/login')}>
            Login
          </Button>
          <Button onClick={() => navigate('/register')}>Get Started</Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
          Collaborate Better,
          <br />
          <span className="text-indigo-600">Work Smarter</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          The all-in-one collaborative workspace for teams. Manage documents, files, projects, and tasks in one place.
        </p>
        <Button
          data-testid={HOME.emergentLink}
          size="lg"
          className="text-lg px-8 py-6"
          onClick={() => navigate('/register')}
        >
          Start Collaborating Free
        </Button>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Everything you need to collaborate</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<FileText className="h-10 w-10 text-indigo-600" />}
            title="Document Collaboration"
            description="Create and edit documents together with your team in real-time."
          />
          <FeatureCard
            icon={<Cloud className="h-10 w-10 text-indigo-600" />}
            title="File Management"
            description="Store and organize files securely in the cloud, accessible anywhere."
          />
          <FeatureCard
            icon={<FolderKanban className="h-10 w-10 text-indigo-600" />}
            title="Project Management"
            description="Track projects with Kanban boards and manage tasks efficiently."
          />
          <FeatureCard
            icon={<Users className="h-10 w-10 text-indigo-600" />}
            title="Team Workspaces"
            description="Organize your teams into workspaces with role-based access control."
          />
          <FeatureCard
            icon={<Lock className="h-10 w-10 text-indigo-600" />}
            title="Secure & Private"
            description="Your data is encrypted and secured with enterprise-grade security."
          />
          <FeatureCard
            icon={<Zap className="h-10 w-10 text-indigo-600" />}
            title="Lightning Fast"
            description="Built for speed and performance, so you can focus on work."
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="bg-indigo-600 rounded-2xl p-12 text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-xl mb-8 opacity-90">Join thousands of teams already using CloudCollab</p>
          <Button
            size="lg"
            variant="secondary"
            className="text-lg px-8 py-6"
            onClick={() => navigate('/register')}
          >
            Create Your Free Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-600">
        <p>© 2026 CloudCollab. Built with ❤️ by Emergent AI</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
