/**
 * IntelligenceWorker - Execution order with graceful degradation
 * 
 * Constitutional pipeline:
 * Observation
 * ↓
 * Knowledge lookup (degrade: skip)
 * ↓
 * Vector search (degrade: skip)
 * ↓
 * Graph lookup (degrade: skip)
 * ↓
 * LLM (degrade: rule-based)
 * ↓
 * Evidence Package
 * 
 * This worker produces Evidence Package, not Recommendation.
 * Recommendations are derived from Evidence by a separate Recommendation Engine.
 * This separation becomes important when recommendations need approvals, policies,
 * confidence thresholds, or multiple competing options.
 */

export interface Observation {
  id: string;
  type: string;
  data: DomainEvent;
  timestamp: string;
}

export interface DomainEvent {
  [key: string]: any;
}

export interface Knowledge {
  id: string;
  content: string;
  source: string;
  relevance: number;
  confidence: number; // Weighted confidence signal
}

export interface VectorResult {
  id: string;
  content: string;
  similarity: number;
  metadata: EvidenceMetadata;
  confidence: number; // Weighted confidence signal
}

export interface EvidenceMetadata {
  [key: string]: any;
}

export interface GraphResult {
  nodes: any[];
  relationships: any[];
  path: any[];
  confidence: number; // Weighted confidence signal
}

export interface EvidencePackage {
  id: string;
  observationId: string;
  observations: Observation[];
  knowledge: Knowledge[];
  vectors: VectorResult[];
  graph: GraphResult[];
  llmResponse?: LLMResponse;
  confidence: number;
  generatedAt: string;
}

export interface LLMResponse {
  reasoning: string;
  confidence: number;
  metadata?: EvidenceMetadata;
}

export interface IntelligenceWorkerConfig {
  enableKnowledgeLookup: boolean;
  enableVectorSearch: boolean;
  enableGraphLookup: boolean;
  enableLLM: boolean;
  fallbackToRuleBased: boolean;
}

export class IntelligenceWorker {
  private config: IntelligenceWorkerConfig;

  constructor(config: Partial<IntelligenceWorkerConfig> = {}) {
    this.config = {
      enableKnowledgeLookup: true,
      enableVectorSearch: true,
      enableGraphLookup: true,
      enableLLM: true,
      fallbackToRuleBased: true,
      ...config
    };
  }

  async process(observation: Observation): Promise<EvidencePackage> {
    const evidencePackage: EvidencePackage = {
      id: `evidence-${observation.id}`,
      observationId: observation.id,
      observations: [observation],
      knowledge: [],
      vectors: [],
      graph: [],
      confidence: 0,
      generatedAt: new Date().toISOString()
    };

    // Run knowledge, vector, and graph lookups in parallel
    const [knowledgeResult, vectorResult, graphResult] = await Promise.allSettled([
      this.config.enableKnowledgeLookup ? this.knowledgeLookup(observation) : Promise.resolve([]),
      this.config.enableVectorSearch ? this.vectorSearch(observation) : Promise.resolve([]),
      this.config.enableGraphLookup ? this.graphLookup(observation) : Promise.resolve([])
    ]);

    // Handle results with graceful degradation
    if (knowledgeResult.status === 'fulfilled') {
      evidencePackage.knowledge = knowledgeResult.value;
    } else {
      console.warn('Knowledge lookup failed, degrading gracefully:', knowledgeResult.reason);
    }

    if (vectorResult.status === 'fulfilled') {
      evidencePackage.vectors = vectorResult.value;
    } else {
      console.warn('Vector search failed, degrading gracefully:', vectorResult.reason);
    }

    if (graphResult.status === 'fulfilled') {
      evidencePackage.graph = graphResult.value;
    } else {
      console.warn('Graph lookup failed, degrading gracefully:', graphResult.reason);
    }

    // LLM inference (sequential, depends on other results)
    if (this.config.enableLLM) {
      try {
        evidencePackage.llmResponse = await this.llmInference(observation, evidencePackage);
      } catch (error) {
        console.warn('LLM inference failed, degrading gracefully:', error);
        
        if (this.config.fallbackToRuleBased) {
          // Degrade: use rule-based reasoning
          evidencePackage.llmResponse = this.ruleBasedReasoning(observation, evidencePackage);
        }
      }
    }

    // Calculate confidence from weighted signals
    evidencePackage.confidence = this.calculateConfidence(evidencePackage);

    return evidencePackage;
  }

  private async knowledgeLookup(observation: Observation): Promise<Knowledge[]> {
    // Knowledge base lookup
    // In production, this would query a knowledge base
    return [];
  }

  private async vectorSearch(observation: Observation): Promise<VectorResult[]> {
    // Vector similarity search using Qdrant
    // In production, this would query Qdrant
    return [];
  }

  private async graphLookup(observation: Observation): Promise<GraphResult[]> {
    // Graph traversal using Neo4j
    // In production, this would query Neo4j
    return [];
  }

  private async llmInference(observation: Observation, evidencePackage: EvidencePackage): Promise<LLMResponse> {
    // LLM inference using Ollama
    // In production, this would call Ollama API
    return {
      reasoning: 'LLM-based reasoning',
      confidence: 0.8
    };
  }

  private ruleBasedReasoning(observation: Observation, evidencePackage: EvidencePackage): LLMResponse {
    // Fallback rule-based reasoning when LLM is unavailable
    return {
      reasoning: 'Rule-based reasoning (LLM fallback)',
      confidence: 0.5
    };
  }

  private calculateConfidence(evidencePackage: EvidencePackage): number {
    // Calculate confidence from weighted signals, not arbitrary additions
    const signals: number[] = [];

    // Knowledge signals
    if (evidencePackage.knowledge.length > 0) {
      const avgKnowledgeConfidence = evidencePackage.knowledge.reduce((sum, k) => sum + k.confidence, 0) / evidencePackage.knowledge.length;
      signals.push(avgKnowledgeConfidence);
    }

    // Vector signals
    if (evidencePackage.vectors.length > 0) {
      const avgVectorConfidence = evidencePackage.vectors.reduce((sum, v) => sum + v.confidence, 0) / evidencePackage.vectors.length;
      signals.push(avgVectorConfidence);
    }

    // Graph signals
    if (evidencePackage.graph.length > 0) {
      const avgGraphConfidence = evidencePackage.graph.reduce((sum, g) => sum + g.confidence, 0) / evidencePackage.graph.length;
      signals.push(avgGraphConfidence);
    }

    // LLM signal
    if (evidencePackage.llmResponse) {
      signals.push(evidencePackage.llmResponse.confidence);
    }

    // Combine weighted signals (simple average for now, can be enhanced)
    if (signals.length === 0) return 0.5; // Base confidence with no signals
    
    return signals.reduce((sum, signal) => sum + signal, 0) / signals.length;
  }

  // Health check for each service
  async healthCheck(): Promise<{
    knowledge: boolean;
    vector: boolean;
    graph: boolean;
    llm: boolean;
  }> {
    return {
      knowledge: await this.checkKnowledgeService(),
      vector: await this.checkVectorService(),
      graph: await this.checkGraphService(),
      llm: await this.checkLLMService()
    };
  }

  private async checkKnowledgeService(): Promise<boolean> {
    try {
      // Health check for knowledge service
      return true;
    } catch {
      return false;
    }
  }

  private async checkVectorService(): Promise<boolean> {
    try {
      // Health check for vector service (Qdrant)
      return true;
    } catch {
      return false;
    }
  }

  private async checkGraphService(): Promise<boolean> {
    try {
      // Health check for graph service (Neo4j)
      return true;
    } catch {
      return false;
    }
  }

  private async checkLLMService(): Promise<boolean> {
    try {
      // Health check for LLM service (Ollama)
      return true;
    } catch {
      return false;
    }
  }

  // Update configuration dynamically
  updateConfig(config: Partial<IntelligenceWorkerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
