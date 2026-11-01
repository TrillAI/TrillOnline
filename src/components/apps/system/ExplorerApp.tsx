import React, { useState, useEffect } from 'react';
import { useOS, VFSNode } from '../../../context/OSContext';

interface ExplorerAppProps {
  windowId: string;
  isRecycleBin?: boolean;
  payload?: Record<string, unknown>;
}

export const ExplorerApp: React.FC<ExplorerAppProps> = ({ windowId, isRecycleBin = false, payload }) => {
  const {
    vfs,
    recycleBinItems,
    createFolder,
    createFile,
    deleteNodeToRecycleBin,
    restoreNodeFromRecycleBin,
    emptyRecycleBin,
    openApp,
    updateWindowTitle,
  } = useOS();

  const [currentId, setCurrentId] = useState<string>(
    isRecycleBin ? 'recycle' : (payload?.folderId as string) || 'root'
  );
  const [history, setHistory] = useState<string[]>([
    isRecycleBin ? 'recycle' : (payload?.folderId as string) || 'root',
  ]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    const incomingFolder = payload?.folderId as string | undefined;
    if (!isRecycleBin && incomingFolder && incomingFolder !== currentId) {
      setCurrentId(incomingFolder);
      setHistory((h) => [...h, incomingFolder]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload?.folderId]);

  const navigateTo = (folderId: string) => {
    setCurrentId(folderId);
    setHistory((h) => [...h, folderId]);
    setSelectedNodeId(null);
    if (folderId === 'root') updateWindowTitle(windowId, 'My Computer');
    else if (folderId === 'recycle') updateWindowTitle(windowId, 'Recycle Bin');
    else {
      const node = vfs.find((n) => n.id === folderId);
      if (node) updateWindowTitle(windowId, node.name);
    }
  };

  const goUp = () => {
    if (currentId === 'root' || currentId === 'recycle') return;
    const cur = vfs.find((n) => n.id === currentId);
    navigateTo(cur?.parentId || 'root');
  };

  const goBack = () => {
    if (history.length <= 1) return;
    const prev = history[history.length - 2];
    setHistory((h) => h.slice(0, -1));
    setCurrentId(prev);
  };

  const items: VFSNode[] =
    currentId === 'recycle'
      ? recycleBinItems
      : currentId === 'root'
      ? vfs.filter((n) => n.parentId === null)
      : vfs.filter((n) => n.parentId === currentId);

  const openNode = (node: VFSNode) => {
    if (currentId === 'recycle') return;
    if (node.type === 'drive' || node.type === 'folder') {
      navigateTo(node.id);
      return;
    }
    if (node.type === 'shortcut' && node.targetAppId) {
      openApp(node.targetAppId, node.targetPayload);
      return;
    }
    if (node.mime?.startsWith('video/') || node.name.endsWith('.webm') || node.name.endsWith('.mp4')) {
      openApp('wmplayer', { vfsId: node.id, title: `${node.name} - Windows Media Player` });
      return;
    }
    if (node.mime?.startsWith('image/')) {
      openApp('picture-viewer', { src: node.content, title: `${node.name} - Windows Picture and Fax Viewer` });
      return;
    }
    if (node.mime === 'text/html' || node.name.endsWith('.html')) {
      openApp('ie', { url: `vfs://${node.id}` });
      return;
    }
    openApp('notepad', { fileId: node.id, title: `${node.name} - Notepad` });
  };

  const handleUploadFromPC = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const targetFolder = currentId === 'root' || currentId === 'recycle' ? 'my-docs' : currentId;
    const reader = new FileReader();
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      reader.onload = () => createFile(targetFolder, file.name, String(reader.result || ''), file.type);
      reader.readAsDataURL(file);
    } else {
      const mime = file.name.endsWith('.html') ? 'text/html' : 'text/plain';
      reader.onload = () => createFile(targetFolder, file.name, String(reader.result || ''), mime);
      reader.readAsText(file);
    }
  };

  const addressText =
    currentId === 'recycle'
      ? 'Recycle Bin'
      : currentId === 'root'
      ? 'My Computer'
      : vfs.find((n) => n.id === currentId)?.name || 'C:\\';

  const getNodeIcon = (n: VFSNode) => {
    if (n.icon) return n.icon;
    if (n.type === 'folder') return '/icons/318(48x48).png';
    if (n.mime?.startsWith('video/')) return '/icons/luna48/file_generic_video_project.png';
    if (n.mime?.startsWith('image/')) return '/icons/luna48/file_jpg.png';
    if (n.mime === 'text/html' || n.name.endsWith('.html')) return '/icons/luna48/file_html.png';
    return '/icons/luna48/file_txt.png';
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ece9d8', fontSize: 11, minHeight: 0 }}>
      {/* Explorer Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          borderBottom: '1px solid #d8d2bd',
          flexWrap: 'wrap',
        }}
      >
        <button className="xp-btn" onClick={goBack} disabled={history.length <= 1}>
          <img src="/icons/back.png" alt="" style={{ width: 16, height: 16 }} /> Back
        </button>
        <button className="xp-btn" onClick={goUp} disabled={currentId === 'root' || currentId === 'recycle'}>
          <img src="/icons/up.png" alt="" style={{ width: 16, height: 16 }} /> Up
        </button>
        <button className="xp-btn" onClick={() => navigateTo('root')}>
          <img src="/icons/676(16x16).png" alt="" style={{ width: 16, height: 16 }} /> My Computer
        </button>
        <button className="xp-btn" onClick={() => navigateTo('my-docs')}>
          <img src="/icons/308(16x16).png" alt="" style={{ width: 16, height: 16 }} /> My Documents
        </button>
        <button className="xp-btn" onClick={() => openApp('arena-ai')}>
          <img src="/icons/arena-ai.svg" alt="" style={{ width: 15, height: 15 }} /> Arena AI
        </button>
        {currentId !== 'root' && currentId !== 'recycle' && (
          <>
            <button
              className="xp-btn"
              onClick={() => {
                const name = prompt('New folder name:', 'New Folder');
                if (name) createFolder(currentId, name);
              }}
            >
              📁 New Folder
            </button>
            <label className="xp-btn" style={{ cursor: 'pointer' }}>
              ⬆ Import File
              <input type="file" hidden onChange={handleUploadFromPC} />
            </label>
          </>
        )}
      </div>

      {/* Address Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 8px',
          borderBottom: '1px solid #aca899',
        }}
      >
        <span style={{ color: '#555' }}>Address</span>
        <input readOnly className="xp-input" style={{ flex: 1 }} value={addressText} />
      </div>

      {/* Main Split: Blue XP Common Tasks Sidebar + Icon Grid */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div className="xp-explorer-sidebar">
          {currentId === 'recycle' ? (
            <div className="xp-task-box">
              <div className="xp-task-box-header">Recycle Bin Tasks</div>
              <div className="xp-task-box-body">
                <div className="xp-task-link" onClick={emptyRecycleBin}>
                  🗑️ Empty the Recycle Bin
                </div>
                {selectedNodeId && (
                  <div className="xp-task-link" onClick={() => restoreNodeFromRecycleBin(selectedNodeId)}>
                    ↩ Restore this item
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="xp-task-box">
              <div className="xp-task-box-header">System & AI Tasks</div>
              <div className="xp-task-box-body">
                <div
                  className="xp-task-link"
                  style={{ fontWeight: 700, color: '#1d4ed8' }}
                  onClick={() => openApp('arena-ai')}
                >
                  ✨ Create Files / Images / Videos with Arena AI
                </div>
                <div className="xp-task-link" onClick={() => openApp('windows-update')}>
                  🛡️ Windows Update
                </div>
                <div className="xp-task-link" onClick={() => openApp('software-center')}>
                  📦 Add or remove programs
                </div>
                <div className="xp-task-link" onClick={() => openApp('control-panel', { section: 'system' })}>
                  💻 View system information
                </div>
                {selectedNodeId && (
                  <div
                    className="xp-task-link"
                    style={{ color: '#b91c1c', fontWeight: 700 }}
                    onClick={() => {
                      deleteNodeToRecycleBin(selectedNodeId);
                      setSelectedNodeId(null);
                    }}
                  >
                    ✕ Delete selected item
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="xp-task-box">
            <div className="xp-task-box-header">Other Places</div>
            <div className="xp-task-box-body">
              <div className="xp-task-link" onClick={() => navigateTo('root')}>
                🖥️ My Computer
              </div>
              <div className="xp-task-link" onClick={() => navigateTo('my-docs')}>
                📂 My Documents
              </div>
              <div className="xp-task-link" onClick={() => navigateTo('my-pics')}>
                🖼️ My Pictures
              </div>
              <div className="xp-task-link" onClick={() => navigateTo('my-videos')}>
                🎬 My Videos
              </div>
              <div className="xp-task-link" onClick={() => navigateTo('arena-projects')}>
                🤖 Arena AI Projects
              </div>
              <div className="xp-task-link" onClick={() => navigateTo('c-progfiles')}>
                🧰 Program Files
              </div>
              <div className="xp-task-link" onClick={() => navigateTo('recycle')}>
                🗑️ Recycle Bin ({recycleBinItems.length})
              </div>
            </div>
          </div>
        </div>

        {/* Folder Items Area */}
        <div
          style={{
            flex: 1,
            background: '#fff',
            padding: 14,
            overflowY: 'auto',
            display: 'flex',
            flexWrap: 'wrap',
            alignContent: 'flex-start',
            gap: 14,
          }}
          onClick={() => setSelectedNodeId(null)}
        >
          {items.length === 0 ? (
            <div style={{ color: '#64748b', padding: 16 }}>
              {currentId === 'recycle' ? 'The Recycle Bin is empty.' : 'This folder is empty.'}
            </div>
          ) : (
            items.map((node) => {
              const sel = selectedNodeId === node.id;
              const isImgThumb = node.type === 'file' && node.mime?.startsWith('image/') && node.content;
              return (
                <div
                  key={node.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(node.id);
                  }}
                  onDoubleClick={() => openNode(node)}
                  style={{
                    width: 114,
                    padding: 6,
                    borderRadius: 4,
                    background: sel ? '#e0edff' : 'transparent',
                    border: sel ? '1px solid #316ac5' : '1px solid transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 5,
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  {isImgThumb ? (
                    <img
                      src={node.content}
                      alt={node.name}
                      style={{
                        width: 54,
                        height: 42,
                        objectFit: 'cover',
                        borderRadius: 3,
                        border: '1px solid #94a3b8',
                      }}
                    />
                  ) : (
                    <img src={getNodeIcon(node)} alt="" style={{ width: 42, height: 42, objectFit: 'contain' }} />
                  )}
                  <span style={{ fontSize: 11, fontWeight: node.type === 'drive' ? 700 : 400, wordBreak: 'break-word' }}>
                    {node.name}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
