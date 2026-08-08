#!/usr/bin/env python3
"""
Canonical Media Graph Implementation

Constitutional Media Authority for Happy Place Platform

This is the single source of truth for all media.
All metadata (projects, services, heroes, gallery) are generated projections.
"""

import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum


class NodeType(Enum):
    # Layer 0: Binary Evidence
    IMAGE = "image"
    
    # Layer 1: Observations
    IMPORT_SESSION = "import_session"
    FOLDER_OBSERVATION = "folder_observation"
    CLASSIFIER_RUN = "classifier_run"
    
    # Layer 2: Knowledge
    ASSERTION = "assertion"
    ASSERTION_OVERRIDE = "assertion_override"
    DUPLICATE_FAMILY = "duplicate_family"
    DUPLICATE_EVIDENCE = "duplicate_evidence"
    TRANSFORMATION = "transformation"
    PROJECT = "project"
    SERVICE = "service"
    
    # Layer 3: Computed Projections (not stored in graph)
    # PROJECTION = "projection"


class EdgeType(Enum):
    # Evidence connections
    BELONGS_TO_IMPORT_SESSION = "belongs_to_import_session"
    
    # Knowledge connections
    HAS_ASSERTION = "has_assertion"
    BELONGS_TO_DUPLICATE_FAMILY = "belongs_to_duplicate_family"
    HAS_DUPLICATE_EVIDENCE = "has_duplicate_evidence"
    BELONGS_TO_PROJECT = "belongs_to_project"
    BELONGS_TO_SERVICE = "belongs_to_service"
    
    # Legacy (to be removed)
    DUPLICATE_OF = "duplicate_of"  # Keep for migration compatibility
    BEFORE_AFTER_PAIR = "before_after_pair"
    DERIVED_VARIANT = "derived_variant"
    DEPICTS_ROOM = "depicts_room"
    DEPICTS_MATERIAL = "depicts_material"
    FEATURED_ON_PAGE = "featured_on_page"


@dataclass
class Node:
    id: str
    type: NodeType
    data: Dict[str, Any]
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Edge:
    from_id: str
    to_id: str
    type: EdgeType
    data: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)


class CanonicalMediaGraph:
    """Constitutional Media Graph - Single Source of Truth"""
    
    def __init__(self):
        self.nodes: Dict[str, Node] = {}
        self.edges: List[Edge] = []
        self._constitutional_layers = {
            NodeType.IMAGE: 0,  # Layer 0: Binary Evidence
            NodeType.IMPORT_SESSION: 1,  # Layer 1: Observations
            NodeType.FOLDER_OBSERVATION: 1,
            NodeType.CLASSIFIER_RUN: 1,
            NodeType.ASSERTION: 2,  # Layer 2: Knowledge
            NodeType.ASSERTION_OVERRIDE: 2,
            NodeType.DUPLICATE_FAMILY: 2,
            NodeType.DUPLICATE_EVIDENCE: 2,
            NodeType.TRANSFORMATION: 2,
            NodeType.PROJECT: 2,
            NodeType.SERVICE: 2,
        }
    
    def _get_layer(self, node_type: NodeType) -> int:
        """Get constitutional layer for a node type"""
        return self._constitutional_layers.get(node_type, 2)  # Default to Layer 2
    
    def _validate_mutation(self, node_id: str, new_data: Dict[str, Any]) -> bool:
        """Validate that mutation doesn't violate constitutional rules"""
        node = self.nodes.get(node_id)
        if not node:
            return False
        
        layer = self._get_layer(node.type)
        
        # Layer 0 (Evidence) cannot be mutated
        if layer == 0:
            # Only allow adding new keys, not modifying existing ones
            for key in new_data:
                if key in node.data:
                    raise ValueError(f"Cannot mutate evidence field '{key}' in Layer 0 node")
        
        return True
    
    def add_node(self, node: Node) -> None:
        """Add a node to the graph"""
        self.nodes[node.id] = node
    
    def add_edge(self, edge: Edge) -> None:
        """Add an edge to the graph"""
        self.edges.append(edge)
    
    def get_node(self, node_id: str) -> Optional[Node]:
        """Get a node by ID"""
        return self.nodes.get(node_id)
    
    def get_edges_from(self, node_id: str, edge_type: Optional[EdgeType] = None) -> List[Edge]:
        """Get all edges from a node, optionally filtered by type"""
        edges = [e for e in self.edges if e.from_id == node_id]
        if edge_type:
            edges = [e for e in edges if e.type == edge_type]
        return edges
    
    def get_edges_to(self, node_id: str, edge_type: Optional[EdgeType] = None) -> List[Edge]:
        """Get all edges to a node, optionally filtered by type"""
        edges = [e for e in self.edges if e.to_id == node_id]
        if edge_type:
            edges = [e for e in edges if e.type == edge_type]
        return edges
    
    def query_project_images(self, project_id: str) -> List[Node]:
        """Query all images belonging to a project"""
        edges = self.get_edges_to(project_id, EdgeType.BELONGS_TO_PROJECT)
        return [self.nodes[e.from_id] for e in edges]
    
    def query_service_images(self, service_id: str) -> List[Node]:
        """Query all images belonging to a service"""
        edges = self.get_edges_to(service_id, EdgeType.BELONGS_TO_SERVICE)
        return [self.nodes[e.from_id] for e in edges]
    
    def query_duplicate_families(self) -> Dict[str, List[Node]]:
        """Query all duplicate families"""
        families = {}
        for edge in self.edges:
            if edge.type == EdgeType.DUPLICATE_OF:
                canonical_id = edge.to_id
                if canonical_id not in families:
                    families[canonical_id] = []
                families[canonical_id].append(self.nodes[edge.from_id])
        return families
    
    def query_orphans(self) -> List[Node]:
        """Query images without project or service edges"""
        orphans = []
        for node_id, node in self.nodes.items():
            if node.type == NodeType.IMAGE:
                project_edges = self.get_edges_from(node_id, EdgeType.BELONGS_TO_PROJECT)
                service_edges = self.get_edges_from(node_id, EdgeType.BELONGS_TO_SERVICE)
                if not project_edges and not service_edges:
                    orphans.append(node)
        return orphans
    
    def to_dict(self) -> Dict[str, Any]:
        """Export graph to dictionary"""
        return {
            "nodes": [
                {
                    "id": node.id,
                    "type": node.type.value,
                    "data": node.data,
                    "created_at": node.created_at.isoformat()
                }
                for node in self.nodes.values()
            ],
            "edges": [
                {
                    "from": edge.from_id,
                    "to": edge.to_id,
                    "type": edge.type.value,
                    "data": edge.data,
                    "created_at": edge.created_at.isoformat()
                }
                for edge in self.edges
            ]
        }
    
    def save(self, filepath: str) -> None:
        """Save graph to JSON file"""
        with open(filepath, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)
    
    @classmethod
    def load(cls, filepath: str) -> 'CanonicalMediaGraph':
        """Load graph from JSON file"""
        with open(filepath, 'r') as f:
            data = json.load(f)
        
        graph = cls()
        
        for node_data in data["nodes"]:
            node = Node(
                id=node_data["id"],
                type=NodeType(node_data["type"]),
                data=node_data["data"],
                created_at=datetime.fromisoformat(node_data["created_at"])
            )
            graph.add_node(node)
        
        for edge_data in data["edges"]:
            edge = Edge(
                from_id=edge_data["from"],
                to_id=edge_data["to"],
                type=EdgeType(edge_data["type"]),
                data=edge_data["data"],
                created_at=datetime.fromisoformat(edge_data["created_at"])
            )
            graph.add_edge(edge)
        
        return graph


# Service Normalization
CONSTITUTIONAL_SERVICES = {
    "drywall": "Drywall",
    "painting": "Painting",
    "finish-carpentry": "Finish Carpentry",
    "fencing": "Fencing",
    "outdoor-living": "Outdoor Living",
    "bathroom-remodeling": "Bathroom Remodeling",
    "repairs": "Repairs",
    "built-ins": "Built-ins",
    "decks": "Decks",
    "pergolas": "Pergolas",
    "pole-barns": "Pole Barns",
    "kitchens": "Kitchens",
    "adus": "ADUs",
    "restoration": "Restoration",
    "other": "Restoration",  # Default mapping
    "featured": None  # Not a service, used for hero selection
}


def normalize_service(legacy_service: str) -> Optional[str]:
    """Normalize legacy service to constitutional service"""
    return CONSTITUTIONAL_SERVICES.get(legacy_service.lower())


if __name__ == "__main__":
    # Example usage
    graph = CanonicalMediaGraph()
    
    # Add an image node
    image_node = Node(
        id=str(uuid.uuid5(uuid.NAMESPACE_URL, "test-image.jpg")),
        type=NodeType.IMAGE,
        data={
            "original_path": "H:\\Shared drives\\Happy Place Carpentry Website\\test.jpg",
            "sha256": "abc123",
            "dimensions": {"width": 1920, "height": 1080}
        }
    )
    graph.add_node(image_node)
    
    # Add a project node
    project_node = Node(
        id=str(uuid.uuid5(uuid.NAMESPACE_URL, "test-project")),
        type=NodeType.PROJECT,
        data={"name": "Test Project", "slug": "test-project"}
    )
    graph.add_node(project_node)
    
    # Add edge
    edge = Edge(
        from_id=image_node.id,
        to_id=project_node.id,
        type=EdgeType.BELONGS_TO_PROJECT,
        data={"role": "hero"}
    )
    graph.add_edge(edge)
    
    # Save
    graph.save("test_graph.json")
    print("Graph saved to test_graph.json")
