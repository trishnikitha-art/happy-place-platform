import json

canonical_media_path = r"C:\Users\nolan\CascadeProjects\happy-place-platform\website\archive\legacy-runtime\canonical-media.json"

with open(canonical_media_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

dup_entries = [e for e in data if e.get('duplicate_group')]
print(f'Total entries: {len(data)}')
print(f'Entries with duplicate_group: {len(dup_entries)}')
print('\nDuplicate group assignments:')
for e in dup_entries:
    print(f"{e['original_filename']}: {e.get('duplicate_group')} ({e.get('authority_status')})")
