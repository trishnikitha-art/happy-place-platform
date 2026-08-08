#!/usr/bin/env python3
"""
Migration Script: Import canonical-media.json into CanonicalMediaGraph

This script reads the canonical-media.json file and imports it into the
CanonicalMediaGraph structure, creating:
- ImageNodes for each image
- ProjectNodes based on the 'project' field
- ServiceNodes based on normalized services
- belongs_to_project edges
- belongs_to_service edges
- duplicate_of edges (if duplicate_group is not null)
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Set, Optional

# Add the analysis directory to the path to import canonical_media_graph
sys.path.insert(0, str(Path(__file__).parent))

from canonical_media_graph import (
    CanonicalMediaGraph,
    Node,
    Edge,
    NodeType,
    EdgeType,
    normalize_service
)


def create_project_id(project_name: str) -> str:
    """Generate a consistent ID for a project node"""
    import uuid
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"project:{project_name.lower()}"))


def create_service_id(service_name: str) -> str:
    """Generate a consistent ID for a service node"""
    import uuid
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"service:{service_name.lower()}"))


def import_canonical_media_to_graph(
    input_path: str,
    output_path: str
) -> CanonicalMediaGraph:
    """
    Import canonical-media.json into a CanonicalMediaGraph
    
    Args:
        input_path: Path to canonical-media.json
        output_path: Path to save the resulting graph
        
    Returns:
        The populated CanonicalMediaGraph
    """
    # Load the canonical media data
    print(f"Loading canonical media from {input_path}...")
    with open(input_path, 'r', encoding='utf-8') as f:
        media_records = json.load(f)
    
    print(f"Loaded {len(media_records)} media records")
    
    # Create the graph
    graph = CanonicalMediaGraph()
    
    # Track projects and services to avoid duplicates
    project_nodes: Dict[str, Node] = {}
    service_nodes: Dict[str, Node] = {}
    
    # Track duplicate groups for later edge creation
    duplicate_groups: Dict[str, List[str]] = {}
    
    # First pass: Create all nodes
    print("Creating nodes...")
    for record in media_records:
        # Create ImageNode
        image_id = record['canonical_id']
        image_data = {
            'original_filename': record.get('original_filename'),
            'shared_drive_path': record.get('shared_drive_path'),
            'category': record.get('category'),
            'room': record.get('room'),
            'job': record.get('job'),
            'hero_candidate': record.get('hero_candidate', False),
            'featured_candidate': record.get('featured_candidate', False),
            'gallery_candidate': record.get('gallery_candidate', False),
            'before_after': record.get('before_after', False),
            'alt_text': record.get('alt_text'),
            'caption': record.get('caption'),
            'tags': record.get('tags', []),
            'upload_status': record.get('upload_status'),
            'website_status': record.get('website_status'),
            'dashboard_status': record.get('dashboard_status'),
            'authority_status': record.get('authority_status'),
            'exif': record.get('exif')
        }
        
        image_node = Node(
            id=image_id,
            type=NodeType.IMAGE,
            data=image_data
        )
        graph.add_node(image_node)
        
        # Create ProjectNode if it doesn't exist
        project_name = record.get('project')
        if project_name:
            project_id = create_project_id(project_name)
            if project_id not in project_nodes:
                project_node = Node(
                    id=project_id,
                    type=NodeType.PROJECT,
                    data={'name': project_name}
                )
                graph.add_node(project_node)
                project_nodes[project_id] = project_node
        
        # Create ServiceNode if service is normalized and not None
        service_name = record.get('service')
        if service_name:
            normalized_service = normalize_service(service_name)
            if normalized_service:
                service_id = create_service_id(normalized_service)
                if service_id not in service_nodes:
                    service_node = Node(
                        id=service_id,
                        type=NodeType.SERVICE,
                        data={'name': normalized_service}
                    )
                    graph.add_node(service_node)
                    service_nodes[service_id] = service_node
        
        # Track duplicate groups
        duplicate_group = record.get('duplicate_group')
        if duplicate_group is not None:
            if duplicate_group not in duplicate_groups:
                duplicate_groups[duplicate_group] = []
            duplicate_groups[duplicate_group].append(image_id)
    
    print(f"Created {len(graph.nodes)} nodes ({len(project_nodes)} projects, {len(service_nodes)} services)")
    
    # Second pass: Create edges
    print("Creating edges...")
    for record in media_records:
        image_id = record['canonical_id']
        
        # Create belongs_to_project edge
        project_name = record.get('project')
        if project_name:
            project_id = create_project_id(project_name)
            if project_id in project_nodes:
                edge = Edge(
                    from_id=image_id,
                    to_id=project_id,
                    type=EdgeType.BELONGS_TO_PROJECT,
                    data={}
                )
                graph.add_edge(edge)
        
        # Create belongs_to_service edge
        service_name = record.get('service')
        if service_name:
            normalized_service = normalize_service(service_name)
            if normalized_service:
                service_id = create_service_id(normalized_service)
                if service_id in service_nodes:
                    edge = Edge(
                        from_id=image_id,
                        to_id=service_id,
                        type=EdgeType.BELONGS_TO_SERVICE,
                        data={}
                    )
                    graph.add_edge(edge)
    
    # Create duplicate_of edges
    print(f"Processing {len(duplicate_groups)} duplicate groups...")
    for group_id, image_ids in duplicate_groups.items():
        if len(image_ids) > 1:
            # Sort to ensure deterministic ordering
            image_ids_sorted = sorted(image_ids)
            # First image is considered canonical
            canonical_id = image_ids_sorted[0]
            # Create edges from duplicates to canonical
            for duplicate_id in image_ids_sorted[1:]:
                edge = Edge(
                    from_id=duplicate_id,
                    to_id=canonical_id,
                    type=EdgeType.DUPLICATE_OF,
                    data={'group_id': group_id}
                )
                graph.add_edge(edge)
    
    print(f"Created {len(graph.edges)} edges")
    
    # Save the graph
    print(f"Saving graph to {output_path}...")
    graph.save(output_path)
    
    return graph


def main():
    """Main entry point"""
    # Define paths
    base_path = Path(__file__).parent.parent
    input_path = base_path / "metadata" / "canonical-media.json"
    output_path = base_path / "metadata" / "canonical-media-graph.json"
    
    # Check if input file exists
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)
    
    # Run the import
    try:
        graph = import_canonical_media_to_graph(
            str(input_path),
            str(output_path)
        )
        
        # Print summary
        print("\n" + "="*50)
        print("Import completed successfully!")
        print("="*50)
        print(f"Total nodes: {len(graph.nodes)}")
        print(f"Total edges: {len(graph.edges)}")
        
        # Count by type
        image_count = sum(1 for n in graph.nodes.values() if n.type == NodeType.IMAGE)
        project_count = sum(1 for n in graph.nodes.values() if n.type == NodeType.PROJECT)
        service_count = sum(1 for n in graph.nodes.values() if n.type == NodeType.SERVICE)
        
        print(f"  - Image nodes: {image_count}")
        print(f"  - Project nodes: {project_count}")
        print(f"  - Service nodes: {service_count}")
        
        # Count edges by type
        edge_types = {}
        for edge in graph.edges:
            edge_type = edge.type.value
            edge_types[edge_type] = edge_types.get(edge_type, 0) + 1
        
        print("\nEdge breakdown:")
        for edge_type, count in sorted(edge_types.items()):
            print(f"  - {edge_type}: {count}")
        
        print(f"\nGraph saved to: {output_path}")
        
    except Exception as e:
        print(f"Error during import: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
