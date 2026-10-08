export function getExplorerNextPageToken(state: {
  activeSearchQuery: string;
  folderNextPageToken?: string;
  searchNextPageToken?: string;
}): string | undefined {
  return state.activeSearchQuery ? state.searchNextPageToken : state.folderNextPageToken;
}
