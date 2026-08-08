#!/usr/bin/env python3
"""
Duplicate Detection Script for Happy Place Carpentry Media
Computes multiple similarity metrics and groups images into duplicate families.
"""

import os
import json
import hashlib
from pathlib import Path
from datetime import datetime
from collections import defaultdict
import math

try:
    from PIL import Image
    import imagehash
except ImportError:
    print("Installing required packages...")
    os.system("pip install Pillow imagehash")
    from PIL import Image
    import imagehash

# Configuration
ORIGINALS_DIR = r"C:\Users\nolan\CascadeProjects\happy-place-platform\website\media\originals"
CANONICAL_MEDIA_PATH = r"C:\Users\nolan\CascadeProjects\happy-place-platform\website\metadata\canonical-media.json"
OUTPUT_REPORT_PATH = r"C:\Users\nolan\CascadeProjects\happy-place-platform\website\analysis\DUPLICATE_DETECTION_REPORT.md"

# Similarity thresholds
PERCEPTUAL_HASH_THRESHOLD = 5  # Hamming distance <= 5 indicates likely duplicate
SHA256_MATCH_THRESHOLD = 0     # Exact match only
FILENAME_SIMILARITY_THRESHOLD = 0.7  # Levenshtein ratio >= 0.7
TIMESTAMP_CLUSTER_THRESHOLD = 2.0  # Seconds

class ImageMetadata:
    def __init__(self, filepath):
        self.filepath = filepath
        self.filename = os.path.basename(filepath)
        self.relative_path = os.path.relpath(filepath, ORIGINALS_DIR)
        
        # Compute all metrics
        self.sha256_hash = self._compute_sha256()
        self.perceptual_hash = self._compute_perceptual_hash()
        self.dimensions = self._get_dimensions()
        self.exif_data = self._get_exif_data()
        self.file_size = os.path.getsize(filepath)
        self.modification_time = datetime.fromtimestamp(os.path.getmtime(filepath))
        
    def _compute_sha256(self):
        """Compute SHA256 hash of the entire file."""
        sha256_hash = hashlib.sha256()
        with open(self.filepath, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256_hash.update(chunk)
        return sha256_hash.hexdigest()
    
    def _compute_perceptual_hash(self):
        """Compute perceptual hash using ImageHash."""
        try:
            img = Image.open(self.filepath)
            # Use average hash for perceptual comparison
            phash = imagehash.average_hash(img)
            return str(phash)
        except Exception as e:
            print(f"Error computing perceptual hash for {self.filename}: {e}")
            return None
    
    def _get_dimensions(self):
        """Get image dimensions."""
        try:
            img = Image.open(self.filepath)
            return (img.width, img.height)
        except Exception as e:
            print(f"Error getting dimensions for {self.filename}: {e}")
            return (0, 0)
    
    def _get_exif_data(self):
        """Extract relevant EXIF data."""
        try:
            img = Image.open(self.filepath)
            exif_dict = {}
            
            if hasattr(img, '_getexif') and img._getexif() is not None:
                exif = img._getexif()
                
                # Extract camera info
                exif_dict['make'] = exif.get(271, 'Unknown')  # Make
                exif_dict['model'] = exif.get(272, 'Unknown')  # Model
                
                # Extract timestamp
                timestamp = exif.get(36867) or exif.get(306)  # DateTimeOriginal or DateTime
                if timestamp:
                    try:
                        exif_dict['timestamp'] = datetime.strptime(timestamp, '%Y:%m:%d %H:%M:%S')
                    except:
                        exif_dict['timestamp'] = None
                else:
                    exif_dict['timestamp'] = None
                
                # Extract GPS if available
                gps_info = exif.get(34853)
                if gps_info:
                    exif_dict['gps'] = str(gps_info)
                else:
                    exif_dict['gps'] = None
                
                # Extract other relevant fields
                exif_dict['software'] = exif.get(305, 'Unknown')  # Software
                exif_dict['orientation'] = exif.get(274, 1)  # Orientation
                
            return exif_dict
        except Exception as e:
            print(f"Error extracting EXIF for {self.filename}: {e}")
            return {}

def levenshtein_distance(s1, s2):
    """Compute Levenshtein distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    
    if len(s2) == 0:
        return len(s1)
    
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    
    return previous_row[-1]

def levenshtein_ratio(s1, s2):
    """Compute Levenshtein similarity ratio (0-1)."""
    distance = levenshtein_distance(s1, s2)
    max_len = max(len(s1), len(s2))
    if max_len == 0:
        return 1.0
    return 1.0 - (distance / max_len)

def hamming_distance(hash1, hash2):
    """Compute Hamming distance between two perceptual hashes."""
    if not hash1 or not hash2:
        return float('inf')
    
    h1 = imagehash.hex_to_hash(hash1)
    h2 = imagehash.hex_to_hash(hash2)
    return h1 - h2

def compare_exif(exif1, exif2):
    """Compare EXIF data and return similarity score."""
    if not exif1 or not exif2:
        return 0.0
    
    score = 0.0
    factors = 0
    
    # Compare camera make/model
    if exif1.get('make') == exif2.get('make') and exif1.get('make') != 'Unknown':
        score += 1
        factors += 1
    if exif1.get('model') == exif2.get('model') and exif1.get('model') != 'Unknown':
        score += 1
        factors += 1
    
    # Compare timestamps
    ts1 = exif1.get('timestamp')
    ts2 = exif2.get('timestamp')
    if ts1 and ts2:
        time_diff = abs((ts1 - ts2).total_seconds())
        if time_diff < TIMESTAMP_CLUSTER_THRESHOLD:
            score += 1
        factors += 1
    
    # Compare GPS
    if exif1.get('gps') and exif2.get('gps') and exif1['gps'] == exif2['gps']:
        score += 1
        factors += 1
    
    if factors == 0:
        return 0.0
    
    return score / factors

def compare_dimensions(dim1, dim2):
    """Compare image dimensions."""
    if dim1 == dim2:
        return 1.0
    if dim1[0] == dim2[0] or dim1[1] == dim2[1]:
        return 0.5
    return 0.0

def find_all_images(directory):
    """Find all image files in directory and subdirectories."""
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp', '.avif'}
    images = []
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            if os.path.splitext(file)[1].lower() in image_extensions:
                images.append(os.path.join(root, file))
    
    return sorted(images)

def group_duplicates(images_metadata):
    """Group images into duplicate families based on multiple metrics."""
    groups = []
    assigned = set()
    
    for i, img1 in enumerate(images_metadata):
        if i in assigned:
            continue
        
        # Start a new group
        group = [img1]
        assigned.add(i)
        
        # Find similar images
        for j, img2 in enumerate(images_metadata):
            if j in assigned or i == j:
                continue
            
            # Compute similarity metrics
            perceptual_dist = hamming_distance(img1.perceptual_hash, img2.perceptual_hash)
            sha256_match = img1.sha256_hash == img2.sha256_hash
            filename_sim = levenshtein_ratio(img1.filename, img2.filename)
            exif_sim = compare_exif(img1.exif_data, img2.exif_data)
            dim_sim = compare_dimensions(img1.dimensions, img2.dimensions)
            
            # Decision logic for grouping
            is_duplicate = False
            
            # Exact byte match - definitely duplicate
            if sha256_match:
                is_duplicate = True
            # Perceptual hash match with supporting evidence
            elif perceptual_dist <= PERCEPTUAL_HASH_THRESHOLD:
                if filename_sim >= FILENAME_SIMILARITY_THRESHOLD or exif_sim >= 0.5 or dim_sim == 1.0:
                    is_duplicate = True
            # Strong filename similarity with other evidence
            elif filename_sim >= 0.9:
                if exif_sim >= 0.5 or dim_sim == 1.0:
                    is_duplicate = True
            
            if is_duplicate:
                group.append(img2)
                assigned.add(j)
        
        if len(group) > 1:
            groups.append(group)
    
    return groups

def designate_canonical(group):
    """Designate canonical image from a duplicate group."""
    # Prioritization criteria:
    # 1. Higher resolution
    # 2. Larger file size
    # 3. More complete EXIF data
    # 4. Simpler filename (no copy/version suffixes)
    
    def score_image(img):
        score = 0
        
        # Resolution score
        resolution = img.dimensions[0] * img.dimensions[1]
        score += resolution / 1000000  # Normalize to reasonable range
        
        # File size score
        score += img.file_size / 1000000
        
        # EXIF completeness
        exif_score = sum(1 for v in img.exif_data.values() if v is not None and v != 'Unknown')
        score += exif_score * 0.1
        
        # Filename simplicity (penalize copy suffixes)
        lower_name = img.filename.lower()
        if 'copy' in lower_name or '(1)' in lower_name or '(2)' in lower_name:
            score -= 5
        
        return score
    
    canonical = max(group, key=score_image)
    return canonical

def generate_report(images_metadata, groups, canonical_media):
    """Generate comprehensive duplicate detection report."""
    report_lines = []
    
    report_lines.append("# Duplicate Detection Report")
    report_lines.append(f"\n**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    report_lines.append(f"**Total Images Analyzed:** {len(images_metadata)}")
    report_lines.append(f"**Duplicate Groups Found:** {len(groups)}")
    report_lines.append(f"**Images in Duplicate Groups:** {sum(len(g) for g in groups)}")
    report_lines.append(f"**Unique Images:** {len(images_metadata) - sum(len(g) for g in groups) + len(groups)}")
    
    report_lines.append("\n---\n")
    report_lines.append("## Detection Methodology")
    report_lines.append("\nThe following metrics were computed for each image:")
    report_lines.append("1. **Perceptual Hash** (using PIL + ImageHash) - Detects visually similar images")
    report_lines.append("2. **SHA256 Byte Hash** - Detects exact byte-for-byte duplicates")
    report_lines.append("3. **Filename Similarity** (Levenshtein distance) - Detects similarly named files")
    report_lines.append("4. **EXIF Similarity** (camera, timestamp, GPS) - Detects images from same capture session")
    report_lines.append("5. **Dimension Comparison** - Detects same-size images")
    report_lines.append("6. **Timestamp Clustering** - Groups images captured within 2 seconds")
    
    report_lines.append("\n**Grouping Criteria:**")
    report_lines.append(f"- Perceptual hash distance ≤ {PERCEPTUAL_HASH_THRESHOLD} with supporting evidence")
    report_lines.append(f"- Exact SHA256 match (automatic duplicate)")
    report_lines.append(f"- Filename similarity ≥ {FILENAME_SIMILARITY_THRESHOLD} with other evidence")
    report_lines.append("- Images grouped when multiple metrics indicate similarity")
    
    report_lines.append("\n**Canonical Selection:**")
    report_lines.append("- Highest resolution")
    report_lines.append("- Largest file size")
    report_lines.append("- Most complete EXIF data")
    report_lines.append("- Simplest filename (no copy/version suffixes)")
    
    report_lines.append("\n---\n")
    report_lines.append("## Image Inventory")
    report_lines.append("\n| # | Filename | Path | Dimensions | Size (KB) | SHA256 | Perceptual Hash |")
    report_lines.append("|---|----------|------|------------|-----------|--------|-----------------|")
    
    for i, img in enumerate(images_metadata, 1):
        size_kb = img.file_size / 1024
        sha_short = img.sha256_hash[:16] + "..."
        phash_short = img.perceptual_hash[:16] + "..." if img.perceptual_hash else "N/A"
        report_lines.append(f"| {i} | {img.filename} | {img.relative_path} | {img.dimensions[0]}×{img.dimensions[1]} | {size_kb:.1f} | `{sha_short}` | `{phash_short}` |")
    
    report_lines.append("\n---\n")
    report_lines.append("## Duplicate Groups")
    
    if not groups:
        report_lines.append("\n✅ **No duplicate groups detected.** All images appear to be unique.")
    else:
        for group_idx, group in enumerate(groups, 1):
            canonical = designate_canonical(group)
            
            report_lines.append(f"\n### Group {group_idx}: {len(group)} images")
            report_lines.append(f"\n**Canonical Original:** `{canonical.filename}`")
            report_lines.append(f"- Path: `{canonical.relative_path}`")
            report_lines.append(f"- Dimensions: {canonical.dimensions[0]}×{canonical.dimensions[1]}")
            report_lines.append(f"- Size: {canonical.file_size / 1024:.1f} KB")
            report_lines.append(f"- SHA256: `{canonical.sha256_hash[:32]}...`")
            
            report_lines.append(f"\n**Derivatives:**")
            for img in group:
                if img == canonical:
                    continue
                
                # Compute similarity to canonical
                perceptual_dist = hamming_distance(canonical.perceptual_hash, img.perceptual_hash)
                sha256_match = canonical.sha256_hash == img.sha256_hash
                filename_sim = levenshtein_ratio(canonical.filename, img.filename)
                exif_sim = compare_exif(canonical.exif_data, img.exif_data)
                dim_sim = compare_dimensions(canonical.dimensions, img.dimensions)
                
                report_lines.append(f"\n#### `{img.filename}`")
                report_lines.append(f"- Path: `{img.relative_path}`")
                report_lines.append(f"- Dimensions: {img.dimensions[0]}×{img.dimensions[1]}")
                report_lines.append(f"- Size: {img.file_size / 1024:.1f} KB")
                report_lines.append(f"- SHA256: `{img.sha256_hash[:32]}...`")
                report_lines.append(f"- **Similarity to Canonical:**")
                report_lines.append(f"  - Perceptual hash distance: {perceptual_dist}")
                report_lines.append(f"  - SHA256 match: {'✅ YES' if sha256_match else '❌ NO'}")
                report_lines.append(f"  - Filename similarity: {filename_sim:.2%}")
                report_lines.append(f"  - EXIF similarity: {exif_sim:.2%}")
                report_lines.append(f"  - Dimension similarity: {dim_sim:.2%}")
    
    report_lines.append("\n---\n")
    report_lines.append("## Canonical Media Updates")
    report_lines.append("\nThe following `duplicate_group` assignments should be added to `canonical-media.json`:")
    
    if not groups:
        report_lines.append("\nNo updates needed - no duplicate groups detected.")
    else:
        for group_idx, group in enumerate(groups, 1):
            canonical = designate_canonical(group)
            group_id = f"dup-group-{group_idx:03d}"
            
            report_lines.append(f"\n### {group_id}")
            report_lines.append(f"```json")
            report_lines.append(f"// Group {group_idx}: {len(group)} images")
            report_lines.append(f"// Canonical: {canonical.filename}")
            
            # Find canonical_id from existing canonical-media.json
            canonical_id = None
            for entry in canonical_media:
                if entry.get('original_filename') == canonical.filename:
                    canonical_id = entry.get('canonical_id')
                    break
            
            if canonical_id:
                report_lines.append(f'// Canonical ID: {canonical_id}')
            
            for img in group:
                report_lines.append(f'// {img.filename} -> duplicate_group: "{group_id}"')
            
            report_lines.append(f"```")
    
    report_lines.append("\n---\n")
    report_lines.append("## Recommendations")
    
    if not groups:
        report_lines.append("\n✅ **No action required.** All images are unique and properly organized.")
    else:
        report_lines.append("\n### Immediate Actions")
        report_lines.append("\n1. **Review duplicate groups** above to confirm they are true duplicates")
        report_lines.append("2. **Update `canonical-media.json`** with the `duplicate_group` assignments")
        report_lines.append("3. **Consider removing derivatives** after confirming canonical originals are correct")
        report_lines.append("4. **Update any references** in project files to point to canonical originals")
        
        report_lines.append("\n### Long-term Improvements")
        report_lines.append("\n1. **Implement automatic duplicate detection** in the image pipeline")
        report_lines.append("2. **Add duplicate prevention** to photo intake process")
        report_lines.append("3. **Create archive policy** for derivative images")
        report_lines.append("4. **Consider using hard links** for identical files to save space")
    
    report_lines.append("\n---\n")
    report_lines.append(f"*Report generated by duplicate_detection.py*")
    report_lines.append(f"*Happy Place Carpentry Media Analysis*")
    
    return "\n".join(report_lines)

def update_canonical_media(groups, canonical_media_path):
    """Update canonical-media.json with duplicate_group assignments."""
    try:
        with open(canonical_media_path, 'r', encoding='utf-8') as f:
            canonical_media = json.load(f)
    except Exception as e:
        print(f"Error reading canonical-media.json: {e}")
        return False
    
    # Create filename to canonical_id mapping
    filename_to_id = {}
    for entry in canonical_media:
        filename_to_id[entry.get('original_filename')] = entry.get('canonical_id')
    
    # Update entries with duplicate_group
    updated_count = 0
    for group_idx, group in enumerate(groups, 1):
        canonical = designate_canonical(group)
        group_id = f"dup-group-{group_idx:03d}"
        
        for img in group:
            for entry in canonical_media:
                if entry.get('original_filename') == img.filename:
                    if entry.get('duplicate_group') != group_id:
                        entry['duplicate_group'] = group_id
                        if img == canonical:
                            entry['authority_status'] = 'canonical'
                        else:
                            entry['authority_status'] = 'derivative'
                        updated_count += 1
                    break
    
    # Write updated file
    try:
        with open(canonical_media_path, 'w', encoding='utf-8') as f:
            json.dump(canonical_media, f, indent=2, ensure_ascii=False)
        print(f"Updated {updated_count} entries in canonical-media.json")
        return True
    except Exception as e:
        print(f"Error writing canonical-media.json: {e}")
        return False

def main():
    print("=" * 80)
    print("DUPLICATE DETECTION FOR HAPPY PLACE CARPENTRY MEDIA")
    print("=" * 80)
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(OUTPUT_REPORT_PATH), exist_ok=True)
    
    # Find all images
    print(f"\nScanning {ORIGINALS_DIR} for images...")
    image_files = find_all_images(ORIGINALS_DIR)
    print(f"Found {len(image_files)} images")
    
    # Load existing canonical media
    print(f"\nLoading {CANONICAL_MEDIA_PATH}...")
    try:
        with open(CANONICAL_MEDIA_PATH, 'r', encoding='utf-8') as f:
            canonical_media = json.load(f)
        print(f"Loaded {len(canonical_media)} canonical media entries")
    except Exception as e:
        print(f"Error loading canonical-media.json: {e}")
        canonical_media = []
    
    # Compute metadata for all images
    print("\nComputing image metadata (this may take a moment)...")
    images_metadata = []
    for i, filepath in enumerate(image_files, 1):
        print(f"  [{i}/{len(image_files)}] Processing {os.path.basename(filepath)}...")
        metadata = ImageMetadata(filepath)
        images_metadata.append(metadata)
    
    # Group duplicates
    print("\nDetecting duplicate groups...")
    groups = group_duplicates(images_metadata)
    print(f"Found {len(groups)} duplicate groups")
    
    # Generate report
    print("\nGenerating report...")
    report = generate_report(images_metadata, groups, canonical_media)
    
    # Write report
    with open(OUTPUT_REPORT_PATH, 'w', encoding='utf-8') as f:
        f.write(report)
    print(f"Report written to {OUTPUT_REPORT_PATH}")
    
    # Update canonical-media.json
    if groups:
        print("\nUpdating canonical-media.json with duplicate_group assignments...")
        update_canonical_media(groups, CANONICAL_MEDIA_PATH)
    
    print("\n" + "=" * 80)
    print("DUPLICATE DETECTION COMPLETE")
    print("=" * 80)
    print(f"\nSummary:")
    print(f"  Total images analyzed: {len(images_metadata)}")
    print(f"  Duplicate groups found: {len(groups)}")
    print(f"  Images in groups: {sum(len(g) for g in groups)}")
    print(f"  Report: {OUTPUT_REPORT_PATH}")
    
    return groups

if __name__ == "__main__":
    main()
