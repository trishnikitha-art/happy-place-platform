"""
Drive Indexer
Reads Google Drive folders and produces drive_index.json
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from drive_provider import DriveProvider

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")
INDEX_PATH = os.path.join(CACHE_DIR, "drive_index.json")

class DriveIndexer:
    """Indexes Google Drive structure"""
    
    def __init__(self, drive_provider: DriveProvider):
        self.drive = drive_provider
        self.index_path = INDEX_PATH
        self._ensure_cache_dir()
    
    def _ensure_cache_dir(self):
        """Ensure cache directory exists"""
        os.makedirs(CACHE_DIR, exist_ok=True)
    
    def index_folder(self, folder_id: str = 'root', path: str = '') -> Dict[str, Any]:
        """Index a single folder"""
        files = self.drive.list_folder(folder_id)
        
        folder_index = {
            'id': folder_id,
            'path': path,
            'files': [],
            'folders': {},
            'indexedAt': datetime.utcnow().isoformat()
        }
        
        for file in files:
            if file['mimeType'] == 'application/vnd.google-apps.folder':
                folder_name = file['name']
                folder_path = f"{path}/{folder_name}" if path else folder_name
                folder_index['folders'][folder_name] = {
                    'id': file['id'],
                    'name': folder_name,
                    'path': folder_path
                }
            else:
                folder_index['files'].append({
                    'id': file['id'],
                    'name': file['name'],
                    'mimeType': file['mimeType'],
                    'size': file['size'],
                    'modifiedTime': file['modifiedTime'],
                    'checksum': file.get('md5Checksum'),
                    'thumbnailLink': file.get('thumbnailLink'),
                    'webViewLink': file.get('webViewLink'),
                    'webContentLink': file.get('webContentLink')
                })
        
        return folder_index
    
    def index_tree(self, folder_id: str = 'root', path: str = '') -> Dict[str, Any]:
        """Index entire folder tree recursively"""
        files = self.drive.list_folder(folder_id)
        
        tree = {
            'id': folder_id,
            'path': path,
            'files': [],
            'folders': {},
            'indexedAt': datetime.utcnow().isoformat()
        }
        
        for file in files:
            if file['mimeType'] == 'application/vnd.google-apps.folder':
                folder_name = file['name']
                folder_path = f"{path}/{folder_name}" if path else folder_name
                tree['folders'][folder_name] = self.index_tree(file['id'], folder_path)
            else:
                tree['files'].append({
                    'id': file['id'],
                    'name': file['name'],
                    'mimeType': file['mimeType'],
                    'size': file['size'],
                    'modifiedTime': file['modifiedTime'],
                    'checksum': file.get('md5Checksum'),  # Drive provides MD5 checksum
                    'thumbnailLink': file.get('thumbnailLink'),
                    'webViewLink': file.get('webViewLink'),
                    'webContentLink': file.get('webContentLink')
                })
        
        return tree
    
    def build_full_index(self, root_folder_id: str = 'root') -> Dict[str, Any]:
        """Build complete Drive index"""
        logger.info(f"Building Drive index from folder {root_folder_id}")
        
        index = {
            'version': datetime.utcnow().isoformat(),
            'rootFolderId': root_folder_id,
            'tree': self.index_tree(root_folder_id),
            'indexedAt': datetime.utcnow().isoformat()
        }
        
        return index
    
    def save_index(self, index: Dict[str, Any], path: Optional[str] = None) -> bool:
        """Save index to file"""
        save_path = path or self.index_path
        
        try:
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            with open(save_path, 'w') as f:
                json.dump(index, f, indent=2)
            
            logger.info(f"Saved Drive index to {save_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to save index: {e}")
            return False
    
    def load_index(self, path: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Load index from file"""
        load_path = path or self.index_path
        
        if not os.path.exists(load_path):
            return None
        
        try:
            with open(load_path, 'r') as f:
                index = json.load(f)
            
            logger.info(f"Loaded Drive index from {load_path}")
            return index
        except Exception as e:
            logger.error(f"Failed to load index: {e}")
            return None
    
    def get_file_by_path(self, path: str, index: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """Get file by path from index"""
        if not index:
            index = self.load_index()
            if not index:
                return None
        
        # Navigate tree by path
        parts = path.strip('/').split('/')
        current = index['tree']
        
        for i, part in enumerate(parts):
            if part in current['folders']:
                current = current['folders'][part]
            else:
                # Check if it's a file in current folder
                if i == len(parts) - 1:
                    for file in current['files']:
                        if file['name'] == part:
                            return file
                return None
        
        return None
    
    def get_folder_by_path(self, path: str, index: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """Get folder by path from index"""
        if not index:
            index = self.load_index()
            if not index:
                return None
        
        # Navigate tree by path
        parts = path.strip('/').split('/')
        current = index['tree']
        
        for part in parts:
            if part in current['folders']:
                current = current['folders'][part]
            else:
                return None
        
        return current
    
    def list_files_in_folder(self, folder_path: str, index: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """List all files in a folder by path"""
        folder = self.get_folder_by_path(folder_path, index)
        if not folder:
            return []
        
        return folder.get('files', [])
    
    def get_all_images(self, index: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Get all image files from index"""
        if not index:
            index = self.load_index()
            if not index:
                return []
        
        images = []
        
        def collect_images(node):
            for file in node.get('files', []):
                mime = file.get('mimeType', '')
                if mime.startswith('image/'):
                    images.append(file)
            
            for folder in node.get('folders', {}).values():
                collect_images(folder)
        
        collect_images(index['tree'])
        return images
