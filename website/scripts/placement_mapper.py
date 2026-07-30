"""
Placement Mapper
Maps Drive folders to website components
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional
from drive_indexer import DriveIndexer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config", "placements.json")

class PlacementMapper:
    """Maps Drive folders to website components"""
    
    def __init__(self, drive_indexer: DriveIndexer):
        self.indexer = drive_indexer
        self.config_path = CONFIG_PATH
        self.placements = self._load_placements()
    
    def _load_placements(self) -> Dict[str, Any]:
        """Load placements configuration"""
        if not os.path.exists(self.config_path):
            logger.warning(f"Placements config not found at {self.config_path}, using empty config")
            return {}
        
        try:
            with open(self.config_path, 'r') as f:
                placements = json.load(f)
            
            logger.info(f"Loaded placements from {self.config_path}")
            return placements
        except Exception as e:
            logger.error(f"Failed to load placements: {e}")
            return {}
    
    def save_placements(self, placements: Dict[str, Any]) -> bool:
        """Save placements configuration"""
        try:
            os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
            with open(self.config_path, 'w') as f:
                json.dump(placements, f, indent=2)
            
            self.placements = placements
            logger.info(f"Saved placements to {self.config_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to save placements: {e}")
            return False
    
    def get_placement(self, placement_id: str) -> Optional[Dict[str, Any]]:
        """Get placement configuration by ID"""
        return self.placements.get(placement_id)
    
    def list_placements(self) -> List[Dict[str, Any]]:
        """List all placements"""
        return [
            {
                'id': placement_id,
                **placement_data
            }
            for placement_id, placement_data in self.placements.items()
        ]
    
    def resolve_placement_files(self, placement_id: str, drive_index: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Resolve Drive folder ID for a placement to file list"""
        placement = self.get_placement(placement_id)
        if not placement:
            logger.warning(f"Placement {placement_id} not found")
            return []
        
        drive_folder_id = placement.get('driveFolderId')
        if not drive_folder_id:
            logger.warning(f"Placement {placement_id} has no driveFolderId")
            return []
        
        # Get files from Drive index by folder ID
        files = self._get_files_by_folder_id(drive_folder_id, drive_index)
        
        # Apply selection rules
        selection = placement.get('selection', 'all')
        sort = placement.get('sort', 'name')
        
        resolved_files = self._apply_selection(files, selection)
        resolved_files = self._apply_sort(resolved_files, sort)
        
        return resolved_files
    
    def _get_files_by_folder_id(self, folder_id: str, drive_index: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Get files from Drive index by folder ID"""
        if not drive_index:
            drive_index = self.indexer.load_index()
            if not drive_index:
                return []
        
        def search_folder(node):
            # Check if this is the target folder
            if node.get('id') == folder_id:
                return node.get('files', [])
            
            # Search in subfolders
            for folder_name, folder_node in node.get('folders', {}).items():
                result = search_folder(folder_node)
                if result is not None:
                    return result
            
            return None
        
        files = search_folder(drive_index['tree'])
        return files if files else []
    
    def _apply_selection(self, files: List[Dict[str, Any]], selection: str) -> List[Dict[str, Any]]:
        """Apply selection rule to files"""
        if selection == 'all':
            return files
        elif selection == 'cover':
            # Return first file (cover image)
            return files[:1] if files else []
        elif selection == 'latest':
            # Sort by modified time, return latest
            sorted_files = sorted(files, key=lambda f: f.get('modifiedTime', ''), reverse=True)
            return sorted_files[:1] if sorted_files else []
        elif selection == 'images':
            # Filter to images only
            return [f for f in files if f.get('mimeType', '').startswith('image/')]
        else:
            # Unknown selection, return all
            return files
    
    def _apply_sort(self, files: List[Dict[str, Any]], sort: str) -> List[Dict[str, Any]]:
        """Apply sorting to files"""
        if sort == 'name':
            return sorted(files, key=lambda f: f.get('name', ''))
        elif sort == 'filename':
            return sorted(files, key=lambda f: f.get('name', ''))
        elif sort == 'modified':
            return sorted(files, key=lambda f: f.get('modifiedTime', ''), reverse=True)
        elif sort == 'size':
            return sorted(files, key=lambda f: int(f.get('size', 0)) if f.get('size') else 0, reverse=True)
        else:
            return files
    
    def resolve_all_placements(self, drive_index: Optional[Dict[str, Any]] = None) -> Dict[str, List[Dict[str, Any]]]:
        """Resolve all placements to their file lists"""
        resolved = {}
        
        for placement_id in self.placements.keys():
            files = self.resolve_placement_files(placement_id, drive_index)
            resolved[placement_id] = files
        
        return resolved
    
    def add_placement(self, placement_id: str, drive_folder_id: str, component: str, 
                     selection: str = 'all', sort: str = 'name', metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Add a new placement"""
        if placement_id in self.placements:
            logger.warning(f"Placement {placement_id} already exists")
            return False
        
        self.placements[placement_id] = {
            'driveFolderId': drive_folder_id,
            'component': component,
            'selection': selection,
            'sort': sort,
            'metadata': metadata or {}
        }
        
        return self.save_placements(self.placements)
    
    def update_placement(self, placement_id: str, **kwargs) -> bool:
        """Update an existing placement"""
        if placement_id not in self.placements:
            logger.warning(f"Placement {placement_id} not found")
            return False
        
        for key, value in kwargs.items():
            if key in ['driveFolderId', 'component', 'selection', 'sort', 'metadata']:
                self.placements[placement_id][key] = value
        
        return self.save_placements(self.placements)
    
    def remove_placement(self, placement_id: str) -> bool:
        """Remove a placement"""
        if placement_id not in self.placements:
            logger.warning(f"Placement {placement_id} not found")
            return False
        
        del self.placements[placement_id]
        return self.save_placements(self.placements)
    
    def get_component_for_placement(self, placement_id: str) -> Optional[str]:
        """Get component name for a placement"""
        placement = self.get_placement(placement_id)
        return placement.get('component') if placement else None
    
    def get_drive_folder_for_placement(self, placement_id: str) -> Optional[str]:
        """Get Drive folder ID for a placement"""
        placement = self.get_placement(placement_id)
        return placement.get('driveFolderId') if placement else None
