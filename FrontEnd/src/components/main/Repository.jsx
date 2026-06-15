import React, { useState } from 'react';
import { FolderPlus, FilePlus, Edit, Trash, FolderOpen } from 'lucide-react';
import ContextMenu from './ContextMenu';

const Repository = ({ onCollapse }) => {
  const [repositories] = useState([
    {
      id: 'default',
      label: 'Default',
      type: 'root',
      children: [
        {
          id: 'marvel',
          label: 'MARVEL',
          type: 'folder',
          children: [
            {
              id: 'thor',
              label: 'Thor',
              type: 'folder',
              locked: false,
              children: [
                { id: 'resume', label: 'Resume', type: 'folder', selected: true },
              ]
            },
            { id: 'regard', label: 'Regard', type: 'folder' },
          ]
        },
      ]
    }
  ]);

  return (
    <div className="repositories-section glass-panel">
      <div className="section-header">
        <span>Repositories</span>
        <button className="collapse-btn" onClick={onCollapse}>«</button>
      </div>
      <div className="tree-container">
        <RepoTree data={repositories} />
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .repositories-section {
          height: 100%;
          display: flex;
          flex-direction: column;
          color: var(--text-main);
          border-right: 1px solid var(--glass-border);
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 15px;
          font-weight: 600;
          font-size: 14px;
          border-bottom: 1px solid var(--glass-border);
          background: rgba(255, 255, 255, 0.05);
        }
        .collapse-btn {
          background: none;
          border: none;
          color: var(--text-main);
          cursor: pointer;
          font-size: 16px;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .collapse-btn:hover {
          opacity: 1;
        }
        .tree-container {
          flex: 1;
          overflow-y: auto;
          padding: 5px 10px;
        }
      `}} />
    </div>
  );
};

const RepoTree = ({ data }) => {
  return (
    <div className="repo-tree">
      {data.map(node => <TreeNode key={node.id} node={node} depth={0} />)}
    </div>
  );
};

const TreeNode = ({ node, depth }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [contextMenu, setContextMenu] = useState(null);
  const hasChildren = node.children && node.children.length > 0;

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const options = node.type === 'folder' || node.type === 'root' ? [
      { label: 'Open', icon: <FolderOpen size={14} />, onClick: () => console.log('Open', node.label) },
      { label: 'New Folder', icon: <FolderPlus size={14} />, onClick: () => console.log('New Folder in', node.label) },
      { label: 'New File', icon: <FilePlus size={14} />, onClick: () => console.log('New File in', node.label) },
      { label: 'Rename', icon: <Edit size={14} />, onClick: () => console.log('Rename', node.label) },
      { label: 'Delete', icon: <Trash size={14} />, onClick: () => console.log('Delete', node.label) },
    ] : [
      { label: 'Open', icon: <FolderOpen size={14} />, onClick: () => console.log('Open', node.label) },
      { label: 'Rename', icon: <Edit size={14} />, onClick: () => console.log('Rename', node.label) },
      { label: 'Delete', icon: <Trash size={14} />, onClick: () => console.log('Delete', node.label) },
    ];

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      options
    });
  };

  return (
    <div className="tree-node" style={{ marginLeft: depth * 15 }}>
      <div 
        className={`tree-row ${node.selected ? 'selected' : ''}`}
        onContextMenu={handleContextMenu}
      >
        {hasChildren ? (
          <span className="toggle" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? '⌄' : '›'}
          </span>
        ) : <span className="toggle-spacer" />}
        <span className="node-icon">
          {node.type === 'root' ? '🗄️' : node.type === 'folder' ? '📁' : '📄'}
        </span>
        <span className="node-label">{node.label}</span>
        {node.locked && <span className="lock-icon">🔒</span>}
      </div>
      {isOpen && hasChildren && (
        <div className="node-children">
          {node.children.map(child => (
            <TreeNode key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}

      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          options={contextMenu.options} 
          onClose={() => setContextMenu(null)} 
        />
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        .tree-row {
          display: flex;
          align-items: center;
          padding: 4px 6px;
          cursor: pointer;
          border-radius: 4px;
          font-size: 13px;
          gap: 6px;
          color: var(--text-main);
          transition: background 0.2s;
        }
        .tree-row:hover {
          background: rgba(0, 0, 0, 0.05);
        }
        body.dark-mode .tree-row:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        .tree-row.selected {
          background: rgba(52, 152, 219, 0.2);
          font-weight: 500;
        }
        .toggle {
          width: 14px;
          display: inline-block;
          text-align: center;
          color: var(--text-muted);
        }
        .toggle-spacer {
          width: 14px;
        }
        .lock-icon {
          font-size: 10px;
          margin-left: auto;
          color: var(--text-muted);
        }
      `}} />
    </div>
  );
};

export default Repository;
