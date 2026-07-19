"""DriveService — folder/file operations in Google Drive.

Real implementation uses the Drive API v3. When GOOGLE_USE_MOCK is true, an
in-memory mock mirrors the same interface so the rest of the app (folder
creation, photo upload, document storage) runs with zero Google calls.
Folder IDs are always returned and stored in the DB — never the name alone.
"""
from __future__ import annotations

import asyncio
from typing import Any

from packages.core.config import settings
from packages.integrations.google.base import BaseGoogleService, GoogleServiceError


class _DriveMock(BaseGoogleService):
    service_name = "drive(mock)"

    def __init__(self) -> None:
        self._folders: dict[str, dict] = {}
        self._files: dict[str, dict] = {}
        self._counter = 0

    def _new_id(self, prefix: str) -> str:
        self._counter += 1
        return f"{prefix}_{self._counter}"

    async def create_folder(self, name: str, parent_id: str | None = None) -> dict:
        fid = self._new_id("folder")
        rec = {"id": fid, "name": name, "parent": parent_id, "type": "folder"}
        self._folders[fid] = rec
        self._log_call("create_folder", name=name, parent=parent_id, id=fid)
        return rec

    async def get_or_create_folder(self, name: str, parent_id: str | None = None) -> dict:
        for rec in self._folders.values():
            if rec["name"] == name and rec["parent"] == parent_id:
                return rec
        return await self.create_folder(name, parent_id)

    async def create_folders(self, names: list[str], parent_id: str | None = None) -> dict[str, dict]:
        out: dict[str, dict] = {}
        for n in names:
            out[n] = await self.get_or_create_folder(n, parent_id)
        return out

    async def upload_file(self, filename: str, content: bytes, parent_id: str, mime_type: str = "application/octet-stream") -> dict:
        fid = self._new_id("file")
        rec = {"id": fid, "name": filename, "parent": parent_id, "mime_type": mime_type, "size": len(content)}
        self._files[fid] = rec
        self._log_call("upload_file", filename=filename, parent=parent_id, id=fid)
        return rec

    async def delete(self, file_id: str) -> None:
        self._folders.pop(file_id, None)
        self._files.pop(file_id, None)


class _DriveReal(BaseGoogleService):
    service_name = "drive"

    def __init__(self) -> None:
        from googleapiclient.discovery import build

        self._build = build

    def _svc(self):
        from packages.integrations.google.oauth import _TOKEN_STORE  # token store path
        import json
        from google.oauth2.credentials import Credentials

        data = json.loads(_TOKEN_STORE.read_text()) if _TOKEN_STORE.exists() else {}
        creds = Credentials.from_authorized_user_info(data.get("creds", {}), settings.oauth_scopes)
        return self._build("drive", "v3", credentials=creds)

    async def create_folder(self, name: str, parent_id: str | None = None) -> dict:
        body = {"name": name, "mimeType": "application/vnd.google-apps.folder"}
        if parent_id:
            body["parents"] = [parent_id]
        try:
            self._log_call("create_folder", name=name, parent=parent_id)
            res = await asyncio.to_thread(
                self._svc().files().create(body=body, fields="id,name,mimeType").execute
            )
            return {"id": res["id"], "name": res.get("name"), "parent": parent_id}
        except Exception as exc:
            self._log_failure("create_folder", exc, name=name)
            raise GoogleServiceError(str(exc)) from exc

    async def get_or_create_folder(self, name: str, parent_id: str | None = None) -> dict:
        query = f"mimeType='application/vnd.google-apps.folder' and name='{name}' and trashed=false"
        if parent_id:
            query += f" and '{parent_id}' in parents"
        try:
            res = await asyncio.to_thread(self._svc().files().list(q=query, fields="files(id,name)").execute)
            files = res.get("files", [])
            if files:
                return {"id": files[0]["id"], "name": files[0]["name"], "parent": parent_id}
            return await self.create_folder(name, parent_id)
        except Exception as exc:
            self._log_failure("get_or_create_folder", exc, name=name)
            raise GoogleServiceError(str(exc)) from exc

    async def create_folders(self, names: list[str], parent_id: str | None = None) -> dict[str, dict]:
        out: dict[str, dict] = {}
        for n in names:
            out[n] = await self.get_or_create_folder(n, parent_id)
        return out

    async def upload_file(self, filename: str, content: bytes, parent_id: str, mime_type: str = "application/octet-stream") -> dict:
        from googleapiclient.http import MediaInMemoryUpload

        media = MediaInMemoryUpload(content, mimetype=mime_type, resumable=True)
        body = {"name": filename, "parents": [parent_id]}
        try:
            self._log_call("upload_file", filename=filename, parent=parent_id)
            res = await asyncio.to_thread(
                self._svc().files().create(body=body, media_body=media, fields="id,name,mimeType").execute
            )
            return {"id": res["id"], "name": res.get("name"), "parent": parent_id}
        except Exception as exc:
            self._log_failure("upload_file", exc, filename=filename)
            raise GoogleServiceError(str(exc)) from exc

    async def delete(self, file_id: str) -> None:
        try:
            await asyncio.to_thread(self._svc().files().delete(fileId=file_id).execute)
        except Exception as exc:
            self._log_failure("delete", exc, id=file_id)
            raise GoogleServiceError(str(exc)) from exc


def get_drive_service() -> BaseGoogleService:
    return _DriveMock() if settings.google_use_mock else _DriveReal()
