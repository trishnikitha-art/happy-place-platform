"""
Drive Provider
Constitutional Runtime - Generic Google Drive API adapter
Published by Runtime, consumed by PING and HPP.
"""

import os
import json
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

CREDENTIALS_PATH = os.path.join(os.path.dirname(__file__), "credentials", "client_secret.json")
TOKEN_PATH = os.path.join(os.path.dirname(__file__), "token.json")

class DriveProvider:
    """Google Drive API client"""
    
    def __init__(self):
        self.base_url = 'https://www.googleapis.com/drive/v3'
        self._load_credentials()
        self._ensure_token()
    
    def _load_credentials(self):
        """Load OAuth credentials"""
        if not os.path.exists(CREDENTIALS_PATH):
            raise FileNotFoundError(f"Credentials file not found: {CREDENTIALS_PATH}")
        
        with open(CREDENTIALS_PATH) as f:
            creds = json.load(f)["installed"]
        
        self.client_id = creds["client_id"]
        self.client_secret = creds["client_secret"]
        self.redirect_uri = "http://localhost/"
        self.auth_uri = creds["auth_uri"]
        self.token_uri = creds["token_uri"]
    
    def _ensure_token(self):
        """Ensure token exists and is valid"""
        if not os.path.exists(TOKEN_PATH):
            raise FileNotFoundError(f"Token file not found: {TOKEN_PATH}. Run google_drive_oauth.py first.")
        
        with open(TOKEN_PATH) as f:
            token_data = json.load(f)
        
        self.access_token = token_data.get("access_token")
        self.refresh_token = token_data.get("refresh_token")
        
        if not self.access_token:
            raise ValueError("No access token found. Re-authenticate with google_drive_oauth.py")
    
    def _refresh_token_if_needed(self):
        """Refresh access token if expired"""
        try:
            # Try to make a request
            response = requests.get(
                f"{self.base_url}/files",
                headers={'Authorization': f"Bearer {self.access_token}"},
                params={'pageSize': 1}
            )
            
            if response.status_code == 401:
                # Token expired, refresh it
                logger.info("Access token expired, refreshing...")
                response = requests.post(self.token_uri, data={
                    'refresh_token': self.refresh_token,
                    'client_id': self.client_id,
                    'client_secret': self.client_secret,
                    'grant_type': 'refresh_token'
                })
                response.raise_for_status()
                
                token_data = response.json()
                self.access_token = token_data['access_token']
                
                # Save updated token
                with open(TOKEN_PATH, 'w') as f:
                    json.dump({
                        'access_token': self.access_token,
                        'refresh_token': self.refresh_token,
                        'expires_in': token_data.get('expires_in'),
                        'scopes': token_data.get('scope', '')
                    }, f, indent=2)
                
                logger.info("Token refreshed successfully")
            
        except Exception as e:
            logger.error(f"Error refreshing token: {e}")
            raise
    
    def _get_auth_headers(self) -> Dict[str, str]:
        """Get authorization headers"""
        self._refresh_token_if_needed()
        return {'Authorization': f"Bearer {self.access_token}"}
    
    def list_folder(self, folder_id: str = 'root') -> List[Dict[str, Any]]:
        """List all files in a folder"""
        headers = self._get_auth_headers()
        
        params = {
            'q': f"'{folder_id}' in parents and trashed=false",
            'fields': 'files(id,name,mimeType,size,modifiedTime,parents,thumbnailLink,webViewLink,webContentLink,description)',
            'pageSize': 1000
        }
        
        response = requests.get(f"{self.base_url}/files", headers=headers, params=params)
        response.raise_for_status()
        
        data = response.json()
        files = data.get('files', [])
        
        return [{
            'id': f['id'],
            'name': f['name'],
            'mimeType': f.get('mimeType'),
            'size': f.get('size'),
            'modifiedTime': f.get('modifiedTime'),
            'parents': f.get('parents', []),
            'thumbnailLink': f.get('thumbnailLink'),
            'webViewLink': f.get('webViewLink'),
            'webContentLink': f.get('webContentLink'),
            'description': f.get('description')
        } for f in files]
    
    def get_file(self, file_id: str) -> Dict[str, Any]:
        """Get file metadata"""
        headers = self._get_auth_headers()
        
        params = {
            'fields': 'id,name,mimeType,size,createdTime,modifiedTime,parents,thumbnailLink,webViewLink,webContentLink,description,version'
        }
        
        response = requests.get(f"{self.base_url}/files/{file_id}", headers=headers, params=params)
        response.raise_for_status()
        
        file_data = response.json()
        
        return {
            'id': file_data['id'],
            'name': file_data['name'],
            'mimeType': file_data.get('mimeType'),
            'size': file_data.get('size'),
            'createdTime': file_data.get('createdTime'),
            'modifiedTime': file_data.get('modifiedTime'),
            'parents': file_data.get('parents', []),
            'thumbnailLink': file_data.get('thumbnailLink'),
            'webViewLink': file_data.get('webViewLink'),
            'webContentLink': file_data.get('webContentLink'),
            'description': file_data.get('description'),
            'version': file_data.get('version')
        }
    
    def download_file(self, file_id: str) -> bytes:
        """Download file content"""
        headers = self._get_auth_headers()
        
        # Get download URL
        params = {'fields': 'webContentLink,mimeType'}
        response = requests.get(f"{self.base_url}/files/{file_id}", headers=headers, params=params)
        response.raise_for_status()
        
        file_data = response.json()
        
        # For Google Docs, need to export
        if file_data.get('mimeType', '').startswith('application/vnd.google-apps'):
            export_mime = {
                'application/vnd.google-apps.document': 'application/pdf',
                'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.google-apps.presentation': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            }.get(file_data['mimeType'], 'application/pdf')
            
            response = requests.get(
                f"{self.base_url}/files/{file_id}/export",
                headers=headers,
                params={'mimeType': export_mime}
            )
        else:
            # Regular file
            download_url = file_data.get('webContentLink')
            if not download_url:
                raise ValueError("No download URL available")
            
            response = requests.get(download_url, headers=headers)
        
        response.raise_for_status()
        return response.content
    
    def get_changes(self, start_page_token: Optional[str] = None) -> Dict[str, Any]:
        """Get changes from Drive (for incremental sync)"""
        headers = self._get_auth_headers()
        
        if start_page_token:
            params = {'pageToken': start_page_token}
        else:
            # Get start page token
            response = requests.get(f"{self.base_url}/changes/startPageToken", headers=headers)
            response.raise_for_status()
            start_page_token = response.json().get('startPageToken')
            params = {'pageToken': start_page_token}
        
        params['pageSize'] = 100
        
        response = requests.get(f"{self.base_url}/changes", headers=headers, params=params)
        response.raise_for_status()
        
        return response.json()
    
    def get_folder_tree(self, folder_id: str = 'root') -> Dict[str, Any]:
        """Get complete folder tree recursively"""
        def build_tree(current_id, path=''):
            files = self.list_folder(current_id)
            
            tree = {
                'id': current_id,
                'path': path,
                'files': [],
                'folders': {}
            }
            
            for file in files:
                if file['mimeType'] == 'application/vnd.google-apps.folder':
                    folder_name = file['name']
                    folder_path = f"{path}/{folder_name}" if path else folder_name
                    tree['folders'][folder_name] = build_tree(file['id'], folder_path)
                else:
                    tree['files'].append(file)
            
            return tree
        
        return build_tree(folder_id)
