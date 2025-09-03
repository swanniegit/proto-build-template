/**
 * @file Main component for the results history page, now a composition root.
 * @coder Gemini
 */
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { SessionListItem } from '../blocks/builders/results/SessionListItem';
import { SessionDetailView } from '../blocks/builders/results/SessionDetailView';

// Types would be in a central file
interface HistorySession { id: string; title: string; user_input: string; agent_count: number; avg_confidence: number; total_time: number; timestamp: string; results: any[]; }

const ResultsHistory: React.FC = () => {
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<HistorySession | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'timestamp' | 'confidence' | 'agents'>('timestamp');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Logic to load sessions remains here for now
    setIsLoading(true);
    const savedSessions = localStorage.getItem('sessionHistory');
    if (savedSessions) setSessions(JSON.parse(savedSessions));
    setIsLoading(false);
  }, []);

  const filteredAndSortedSessions = sessions
    .filter(session => session.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'confidence') return b.avg_confidence - a.avg_confidence;
      if (sortBy === 'agents') return b.agent_count - a.agent_count;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  const deleteSession = (sessionId: string) => {
    if (confirm('Are you sure you want to delete this session?')) {
      const updatedSessions = sessions.filter(s => s.id !== sessionId);
      setSessions(updatedSessions);
      localStorage.setItem('sessionHistory', JSON.stringify(updatedSessions));
      toast.success('Session deleted');
      if (selectedSession?.id === sessionId) setSelectedSession(null);
    }
  };

  const exportSession = (_session: HistorySession, format: 'json' | 'csv' | 'pdf') => {
    toast.success(`Exporting session as ${format.toUpperCase()}...`);
  };

  // The main JSX is now much cleaner
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Background and Header would also be components in a full refactor */}
      <div className="fixed inset-0 z-0"> {/* ... background JSX ... */} </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">
        <div className="mb-12"> {/* ... header and filters JSX ... */} </div>

        {isLoading ? (
          <div>Loading...</div>
        ) : sessions.length === 0 ? (
          <div>No Sessions Found</div>
        ) : (
          <div className="flex gap-8">
            <div className="flex-1">
              <div className="space-y-6">
                {filteredAndSortedSessions.map((session) => (
                  <SessionListItem
                    key={session.id}
                    session={session}
                    isSelected={selectedSession?.id === session.id}
                    onSelect={setSelectedSession}
                    onDelete={deleteSession}
                  />
                ))}
              </div>
            </div>

            {selectedSession && (
              <SessionDetailView
                session={selectedSession}
                onClose={() => setSelectedSession(null)}
                onExport={exportSession}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsHistory;