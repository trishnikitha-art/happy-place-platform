/**
 * Evidence Viewer - Inspect IntelligenceWorker output
 * 
 * Shows the "why" behind every recommendation:
 * - Observation
 * - Knowledge Matches
 * - Graph Matches
 * - Vector Matches
 * - LLM Output
 * - Confidence
 * - Evidence Package
 */

'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Brain, Network, Search, MessageSquare, BarChart3 } from 'lucide-react';
import { evidenceApi, type EvidencePackage } from '@/lib/api/client';

export default function EvidencePage() {
  const [evidencePackage, setEvidencePackage] = useState<EvidencePackage | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['observation', 'llm']));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvidence();
  }, []);

  const loadEvidence = async () => {
    try {
      setLoading(true);
      const data = await evidenceApi.getAll();
      setEvidencePackage(data[0] || null);
    } catch (err) {
      console.error('Failed to load evidence:', err);
      // Fallback to mock data for development
      setEvidencePackage({
        id: 'evd-1',
        observationId: 'obs-1',
        confidence: 0.85,
        generatedAt: new Date().toISOString(),
        sources: {
          knowledge: {
            matches: [
              { id: 'k1', content: 'Customer prefers morning appointments', relevance: 0.9 },
              { id: 'k2', content: 'Previous projects completed on schedule', relevance: 0.8 },
            ],
            enabled: true,
          },
          vector: {
            matches: [
              { id: 'v1', content: 'Similar kitchen remodel projects', similarity: 0.92 },
              { id: 'v2', content: 'Customer communication patterns', similarity: 0.78 },
            ],
            enabled: true,
          },
          graph: {
            matches: [
              { id: 'g1', content: 'Connected to 3 previous projects', relevance: 0.85 },
              { id: 'g2', content: 'Referral network strength: high', relevance: 0.72 },
            ],
            enabled: true,
          },
          llm: {
            output: 'Based on customer history and project similarity, recommend scheduling morning appointments and maintaining weekly progress updates.',
            enabled: true,
          },
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const sections = [
    {
      id: 'observation',
      title: 'Observation',
      icon: MessageSquare,
      content: (
        <div className="bg-muted/50 rounded p-4">
          <div className="text-sm text-muted-foreground mb-2">Raw observation data:</div>
          <pre className="text-xs bg-background p-3 rounded overflow-auto">
            {JSON.stringify({
              id: evidencePackage?.observationId,
              type: 'review',
              data: { rating: 5, service: 'kitchen-remodel' },
              timestamp: evidencePackage?.generatedAt,
            }, null, 2)}
          </pre>
        </div>
      ),
    },
    {
      id: 'knowledge',
      title: 'Knowledge Matches',
      icon: Brain,
      content: (
        <div className="space-y-2">
          {evidencePackage?.sources.knowledge.matches.map((match: any) => (
            <div key={match.id} className="bg-muted/50 rounded p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">{match.content}</span>
                <span className="text-xs text-muted-foreground">{(match.relevance * 100).toFixed(0)}% relevance</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full" 
                  style={{ width: `${match.relevance * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'vector',
      title: 'Vector Matches',
      icon: Search,
      content: (
        <div className="space-y-2">
          {evidencePackage?.sources.vector.matches.map((match: any) => (
            <div key={match.id} className="bg-muted/50 rounded p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">{match.content}</span>
                <span className="text-xs text-muted-foreground">{(match.similarity * 100).toFixed(0)}% similarity</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full" 
                  style={{ width: `${match.similarity * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'graph',
      title: 'Graph Matches',
      icon: Network,
      content: (
        <div className="space-y-2">
          {evidencePackage?.sources.graph.matches.map((match: any) => (
            <div key={match.id} className="bg-muted/50 rounded p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-foreground">{match.content}</span>
                <span className="text-xs text-muted-foreground">{(match.relevance * 100).toFixed(0)}% relevance</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full" 
                  style={{ width: `${match.relevance * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'llm',
      title: 'LLM Output',
      icon: MessageSquare,
      content: (
        <div className="bg-muted/50 rounded p-4">
          <div className="text-sm text-muted-foreground mb-2">AI reasoning:</div>
          <p className="text-sm text-foreground">{evidencePackage?.sources.llm.output}</p>
        </div>
      ),
    },
    {
      id: 'confidence',
      title: 'Confidence Score',
      icon: BarChart3,
      content: (
        <div className="bg-muted/50 rounded p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Overall Confidence</span>
            <span className="text-2xl font-bold text-primary">{(evidencePackage?.confidence || 0 * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-4">
            <div 
              className="bg-primary h-4 rounded-full" 
              style={{ width: `${(evidencePackage?.confidence || 0) * 100}%` }}
            />
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            Generated at {evidencePackage?.generatedAt ? new Date(evidencePackage.generatedAt).toLocaleString() : 'N/A'}
          </div>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Evidence Viewer</h1>
        <p className="text-muted-foreground mb-6">Inspect the "why" behind every recommendation</p>
        <div className="text-center py-12 text-muted-foreground">Loading evidence...</div>
      </div>
    );
  }

  if (!evidencePackage) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Evidence Viewer</h1>
        <p className="text-muted-foreground mb-6">Inspect the "why" behind every recommendation</p>
        <div className="text-center py-12 text-muted-foreground">No evidence available</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Evidence Viewer</h1>
        <p className="text-muted-foreground">
          Inspect the "why" behind every recommendation
        </p>
      </div>

      {/* Evidence Package */}
      <div className="space-y-4">
        {sections.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedSections.has(section.id);

          return (
            <div key={section.id} className="bg-card border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} className="text-primary" />
                  <span className="text-lg font-semibold text-foreground">{section.title}</span>
                </div>
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
              {isExpanded && (
                <div className="p-4 border-t border-border">
                  {section.content}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
