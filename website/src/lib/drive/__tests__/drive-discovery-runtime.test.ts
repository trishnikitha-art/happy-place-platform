import { DriveDiscovery } from '../drive-discovery';
import { getDriveClient, isAuthenticated } from '../oauth-manager';
import { getAuthorizedCorpora, verifyCorpusAuthorization, isMyDriveAuthorized } from '../corpus-authorization';

jest.mock('../oauth-manager', () => ({ getDriveClient: jest.fn(), isAuthenticated: jest.fn() }));
jest.mock('../corpus-authorization', () => ({
  getAuthorizedCorpora: jest.fn(), verifyCorpusAuthorization: jest.fn(), isMyDriveAuthorized: jest.fn(),
}));

describe('Drive discovery runtime boundaries', () => {
  const filesList = jest.fn();
  const filesGet = jest.fn();
  const discovery = new DriveDiscovery();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.mocked(isAuthenticated).mockResolvedValue(true);
    jest.mocked(getDriveClient).mockResolvedValue({ files: { list: filesList, get: filesGet } } as never);
    jest.mocked(verifyCorpusAuthorization).mockResolvedValue({ authorized: true });
    jest.mocked(isMyDriveAuthorized).mockReturnValue(true);
    filesList.mockResolvedValue({ data: { files: [] } });
  });

  afterEach(() => jest.restoreAllMocks());

  it('discovers only HPP-authorized roots with canonical My Drive identity', async () => {
    jest.mocked(getAuthorizedCorpora).mockResolvedValue([
      { id: 'root', name: 'My Drive', type: 'my_drive', authorized: true },
      { id: 'allowed-drive', name: 'Project photos', type: 'shared_drive', authorized: true },
    ]);
    const result = await discovery.discoverStructure();
    expect(result.myDrive).toMatchObject({ id: 'root', corpusId: 'root' });
    expect(result.sharedDrives).toEqual([
      { id: 'allowed-drive', name: 'Project photos', type: 'shared_drive', corpusId: 'allowed-drive' },
    ]);
    expect(filesList).not.toHaveBeenCalled();
    expect(filesGet).not.toHaveBeenCalled();
  });

  it('authorizes a non-root folder even when no driveId was supplied', async () => {
    jest.mocked(verifyCorpusAuthorization).mockResolvedValue({ authorized: false, reason: 'Corpus refused' });
    await expect(discovery.listChildren({ parentId: 'other-folder' })).rejects.toThrow('not authorized');
    expect(verifyCorpusAuthorization).toHaveBeenCalledWith('other-folder', undefined);
    expect(filesList).not.toHaveBeenCalled();
  });

  it('lists the actual shared root for the legacy root + driveId representation', async () => {
    await discovery.listChildren({ parentId: 'root', driveId: 'allowed-drive' }, 'second-page');
    expect(filesList).toHaveBeenCalledWith(expect.objectContaining({
      corpora: 'drive', driveId: 'allowed-drive',
      q: "'allowed-drive' in parents and trashed = false", pageToken: 'second-page',
    }));
  });

  it('retains the actual shared child and exposes shortcut metadata', async () => {
    filesList.mockResolvedValue({ data: { files: [{
      id: 'shortcut', name: 'Deck.jpg', mimeType: 'application/vnd.google-apps.shortcut',
      shortcutDetails: { targetId: 'target', targetMimeType: 'image/jpeg' },
    }], nextPageToken: 'more' } });
    const result = await discovery.listChildren({ parentId: 'child-folder', driveId: 'allowed-drive' });
    expect(filesList).toHaveBeenCalledWith(expect.objectContaining({ q: "'child-folder' in parents and trashed = false" }));
    expect(result).toMatchObject({ nextPageToken: 'more', items: [{
      id: 'shortcut', corpusId: 'allowed-drive', objectType: 'shortcut',
      shortcutDetails: { targetId: 'target' },
    }] });
  });

  it('does not search the user corpus when My Drive is not HPP-authorized', async () => {
    jest.mocked(isMyDriveAuthorized).mockReturnValue(false);
    expect(await discovery.searchFiles('private')).toEqual([]);
    expect(filesList).not.toHaveBeenCalled();
  });

  it('passes corpus, escaped search, and pagination to Google while excluding other corpora', async () => {
    filesList.mockResolvedValue({ data: { files: [
      { id: 'mine', name: "O'Reilly.jpg", mimeType: 'image/jpeg' },
      { id: 'other', name: 'Other.jpg', mimeType: 'image/jpeg', driveId: 'unapproved-drive' },
    ], nextPageToken: 'more' } });
    const result = await discovery.search("O'Reilly", undefined, 'page-two');
    expect(filesList).toHaveBeenCalledWith(expect.objectContaining({
      corpora: 'user', pageToken: 'page-two', q: "name contains 'O\\'Reilly' and trashed = false",
    }));
    expect(result.items.map(item => item.id)).toEqual(['mine']);
    expect(result.nextPageToken).toBe('more');
  });

  it('does not disguise a revoked Google search as an empty folder', async () => {
    filesList.mockRejectedValue(new Error('invalid_grant'));
    await expect(discovery.search('deck')).rejects.toThrow('invalid_grant');
  });
});
