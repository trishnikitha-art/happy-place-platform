#!/usr/bin/env python3
"""
Phase A Migration: Freeze Evidence

Extract immutable evidence from Image nodes into separate constitutional entities.

This migration:
1. Keeps ImageNode with only immutable evidence
2. Creates ImportSession for current import
3. Creates ClassifierRun for current classification
4. Extracts Assertions from image metadata
5. Extracts DuplicateFamily and DuplicateEvidence
6. Removes stored decisions from ImageNode
"""

import json
import uuid
from datetime import datetime
from typing import Dict, List, Any
from canonical_media_graph import CanonicalMediaGraph, Node, Edge, NodeType, EdgeType


def migrate_phase_a(graph_path: str, output_path: str) -> None:
    """Migrate graph to Phase A constitutional architecture"""
    
    # Load current graph
    print(f"Loading graph from {graph_path}...")
    with open(graph_path, 'r') as f:
        graph_data = json.load(f)
    
    graph = CanonicalMediaGraph()
    
    # Reconstruct current graph
    for node_data in graph_data["nodes"]:
        node = Node(
            id=node_data["id"],
            type=NodeType(node_data["type"]),
            data=node_data["data"],
            created_at=datetime.fromisoformat(node_data["created_at"])
        )
        graph.add_node(node)
    
    for edge_data in graph_data["edges"]:
        edge = Edge(
            from_id=edge_data["from"],
            to_id=edge_data["to"],
            type=EdgeType(edge_data["type"]),
            data=edge_data["data"],
            created_at=datetime.fromisoformat(edge_data["created_at"])
        )
        graph.add_edge(edge)
    
    print(f"Loaded {len(graph.nodes)} nodes, {len(graph.edges)} edges")
    
    # Step 1: Create ImportSession
    print("\nStep 1: Creating ImportSession...")
    import_session_id = str(uuid.uuid5(uuid.NAMESPACE_URL, "import-session-2026-08-05"))
    import_session = Node(
        id=import_session_id,
        type=NodeType.IMPORT_SESSION,
        data={
            "source": "Shared Drive",
            "import_timestamp": "2026-08-05T00:00:00Z",
            "total_files": 43,
            "total_size": 63260000  # 63.26 MB
        },
        created_at=datetime.utcnow()
    )
    graph.add_node(import_session)
    
    # Step 2: Connect all images to ImportSession
    print("Step 2: Connecting images to ImportSession...")
    image_nodes = [n for n in graph.nodes.values() if n.type == NodeType.IMAGE]
    for image_node in image_nodes:
        edge = Edge(
            from_id=image_node.id,
            to_id=import_session_id,
            type=EdgeType.BELONGS_TO_IMPORT_SESSION,
            data={},
            created_at=datetime.utcnow()
        )
        graph.add_edge(edge)
    
    # Step 3: Create ClassifierRun
    print("Step 3: Creating ClassifierRun...")
    classifier_run_id = str(uuid.uuid5(uuid.NAMESPACE_URL, "classifier-run-2026-08-05"))
    classifier_run = Node(
        id=classifier_run_id,
        type=NodeType.CLASSIFIER_RUN,
        data={
            "model": "folder-based-inference",
            "version": "1.0.0",
            "run_timestamp": "2026-08-05T00:00:00Z",
            "total_assertions": len(image_nodes)
        },
        created_at=datetime.utcnow()
    )
    graph.add_node(classifier_run)
    
    # Step 4: Extract Assertions
    print("Step 4: Extracting Assertions...")
    assertion_count = 0
    for image_node in image_nodes:
        data = image_node.data
        
        # Extract service assertion
        if "service" in data:
            assertion_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{image_node.id}-service"))
            assertion = Node(
                id=assertion_id,
                type=NodeType.ASSERTION,
                data={
                    "image_id": image_node.id,
                    "classifier_run_id": classifier_run_id,
                    "assertion_type": "service",
                    "value": data["service"],
                    "confidence": 1.0  # Folder-based = high confidence
                },
                created_at=datetime.utcnow()
            )
            graph.add_node(assertion)
            
            edge = Edge(
                from_id=image_node.id,
                to_id=assertion_id,
                type=EdgeType.HAS_ASSERTION,
                data={},
                created_at=datetime.utcnow()
            )
            graph.add_edge(edge)
            assertion_count += 1
        
        # Extract room assertion
        if "room" in data:
            assertion_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"{image_node.id}-room"))
            assertion = Node(
                id=assertion_id,
                type=NodeType.ASSERTION,
                data={
                    "image_id": image_node.id,
                    "classifier_run_id": classifier_run_id,
                    "assertion_type": "room",
                    "value": data["room"],
                    "confidence": 0.8  # Filename-based = medium confidence
                },
                created_at=datetime.utcnow()
            )
            graph.add_node(assertion)
            
            edge = Edge(
                from_id=image_node.id,
                to_id=assertion_id,
                type=EdgeType.HAS_ASSERTION,
                data={},
                created_at=datetime.utcnow()
            )
            graph.add_edge(edge)
            assertion_count += 1
    
    print(f"Created {assertion_count} assertions")
    
    # Step 5: Extract Duplicate Families
    print("Step 5: Extracting Duplicate Families...")
    duplicate_groups = {}
    for edge in graph.edges:
        if edge.type == EdgeType.DUPLICATE_OF:
            canonical_id = edge.to_id
            if canonical_id not in duplicate_groups:
                duplicate_groups[canonical_id] = []
            duplicate_groups[canonical_id].append(edge.from_id)
    
    family_count = 0
    evidence_count = 0
    for canonical_id, member_ids in duplicate_groups.items():
        # Create DuplicateFamily
        family_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"duplicate-family-{canonical_id}"))
        family = Node(
            id=family_id,
            type=NodeType.DUPLICATE_FAMILY,
            data={
                "representative_id": canonical_id,
                "created_at": datetime.utcnow().isoformat()
            },
            created_at=datetime.utcnow()
        )
        graph.add_node(family)
        family_count += 1
        
        # Connect representative
        edge = Edge(
            from_id=canonical_id,
            to_id=family_id,
            type=EdgeType.BELONGS_TO_DUPLICATE_FAMILY,
            data={"role": "representative"},
            created_at=datetime.utcnow()
        )
        graph.add_edge(edge)
        
        # Connect members
        for member_id in member_ids:
            edge = Edge(
                from_id=member_id,
                to_id=family_id,
                type=EdgeType.BELONGS_TO_DUPLICATE_FAMILY,
                data={"role": "member"},
                created_at=datetime.utcnow()
            )
            graph.add_edge(edge)
            
            # Create DuplicateEvidence
            evidence_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"duplicate-evidence-{member_id}"))
            evidence = Node(
                id=evidence_id,
                type=NodeType.DUPLICATE_EVIDENCE,
                data={
                    "duplicate_family_id": family_id,
                    "image_id": member_id,
                    "algorithm": "perceptual-hash+filename+exif",
                    "confidence": 0.85,
                    "timestamp": datetime.utcnow().isoformat()
                },
                created_at=datetime.utcnow()
            )
            graph.add_node(evidence)
            
            edge = Edge(
                from_id=family_id,
                to_id=evidence_id,
                type=EdgeType.HAS_DUPLICATE_EVIDENCE,
                data={},
                created_at=datetime.utcnow()
            )
            graph.add_edge(edge)
            evidence_count += 1
    
    print(f"Created {family_count} duplicate families, {evidence_count} evidence nodes")
    
    # Step 6: Remove stored decisions from ImageNode
    print("Step 6: Removing stored decisions from ImageNode...")
    fields_to_remove = [
        "canonical", "hero_candidate", "featured_candidate", "gallery_candidate",
        "before_after", "alt_text", "caption", "tags", "upload_status",
        "website_status", "dashboard_status", "duplicate_group", "authority_status",
        "project", "service", "room", "job"  # These are now assertions
    ]
    
    for image_node in image_nodes:
        for field in fields_to_remove:
            if field in image_node.data:
                del image_node.data[field]
    
    # Remove old duplicate_of edges
    print("Removing old duplicate_of edges...")
    graph.edges = [e for e in graph.edges if e.type != EdgeType.DUPLICATE_OF]
    
    # Save migrated graph
    print(f"\nSaving migrated graph to {output_path}...")
    graph.save(output_path)
    
    print("\n" + "="*50)
    print("Phase A Migration Complete!")
    print("="*50)
    print(f"Total nodes: {len(graph.nodes)}")
    print(f"Total edges: {len(graph.edges)}")
    print(f"  - Image nodes: {len(image_nodes)}")
    print(f"  - ImportSession: 1")
    print(f"  - ClassifierRun: 1")
    print(f"  - Assertions: {assertion_count}")
    print(f"  - DuplicateFamilies: {family_count}")
    print(f"  - DuplicateEvidence: {evidence_count}")
    print(f"\nConstitutional layers:")
    layer_0 = len([n for n in graph.nodes.values() if n.type == NodeType.IMAGE])
    layer_1 = len([n for n in graph.nodes.values() if n.type in [NodeType.IMPORT_SESSION, NodeType.CLASSIFIER_RUN]])
    layer_2 = len([n for n in graph.nodes.values() if n.type in [NodeType.ASSERTION, NodeType.DUPLICATE_FAMILY, NodeType.DUPLICATE_EVIDENCE, NodeType.PROJECT, NodeType.SERVICE]])
    print(f"  - Layer 0 (Evidence): {layer_0}")
    print(f"  - Layer 1 (Observations): {layer_1}")
    print(f"  - Layer 2 (Knowledge): {layer_2}")


if __name__ == "__main__":
    input_path = "C:/Users/nolan/CascadeProjects/happy-place-platform/website/metadata/canonical-media-graph.json"
    output_path = "C:/Users/nolan/CascadeProjects/happy-place-platform/website/metadata/canonical-media-graph-phase-a.json"
    
    migrate_phase_a(input_path, output_path)
