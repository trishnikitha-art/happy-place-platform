"""Storage service — orchestrates project folder structure in Drive.

Creates the canonical Customer Name/ subfolder set and persists all folder
IDs in the database. We never rely on folder names alone; every ID is stored.
"""
from __future__ import annotations

from packages.core.config import settings
from packages.core.logging import get_logger
from packages.integrations.google.drive import get_drive_service

log = get_logger("happyplace.storage")

# Canonical subfolder layout created under each project folder.
PROJECT_SUBFOLDERS = ["Estimate", "Before", "During", "After", "Documents", "Warranty"]


async def create_customer_folder(customer_name: str) -> dict:
    """Create (or reuse) the customer root folder under the Drive root."""
    drive = get_drive_service()
    rec = await drive.get_or_create_folder(customer_name, parent_id=settings.google_drive_root_folder or None)
    log.info("customer folder ready", extra={"ctx": {"name": customer_name, "folder_id": rec["id"]}})
    return rec


async def create_project_folders(customer_name: str, project_title: str, db_customer_folder_id: str) -> dict[str, str]:
    """Create the project folder + canonical subfolders, returning a name->id map."""
    drive = get_drive_service()
    # project folder lives under the customer folder
    project_folder = await drive.get_or_create_folder(project_title, parent_id=db_customer_folder_id)
    subfolders = await drive.create_folders(PROJECT_SUBFOLDERS, parent_id=project_folder["id"])
    mapping = {project_title: project_folder["id"]}
    mapping.update({name: rec["id"] for name, rec in subfolders.items()})
    log.info(
        "project folders created",
        extra={"ctx": {"project_folder_id": project_folder["id"], "subfolders": list(subfolders)}},
    )
    return mapping
