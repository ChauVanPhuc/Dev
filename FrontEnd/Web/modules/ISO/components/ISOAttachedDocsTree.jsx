import React, { useState, useMemo } from 'react';
import { ChevronRight, Paperclip } from 'lucide-react';
import './ISOAttachedDocsTree.css';

// Tách số BM từ mã, ví dụ "QT02-BM01.1" -> { base: 'BM01', sub: '1' }
const parseBmCode = (code = '') => {
  const m = String(code).toUpperCase().match(/(?:-([A-Z]{2}\d+)|(BM\d+))(?:[._-](\d+))?\s*$/);
  if (!m) return { base: null, sub: null };
  return { base: m[1] || m[2], sub: m[3] || null };
};

const buildTree = (docs) => {
  const parents = [];
  const childrenMap = {};
  const orphanChildren = [];

  docs.forEach((d, idx) => {
    const { base, sub } = parseBmCode(d.code);
    const node = { ...d, _key: d.id || idx, children: [] };
    if (base && sub) {
      (childrenMap[base] = childrenMap[base] || []).push(node);
    } else {
      node._base = base;
      parents.push(node);
    }
  });

  Object.entries(childrenMap).forEach(([base, kids]) => {
    const parent = parents.find((p) => p._base === base);
    if (parent) parent.children = kids;
    else orphanChildren.push(...kids);
  });

  return [...parents, ...orphanChildren];
};

const TreeNode = ({ node, isLast, isChild }) => {
  const subInfo = node.version ? `v${node.version}` : '';
  const label = `${node.code || node.symbol || ''}${node.name ? ` - ${node.name}` : ''}`;
  return (
    <li className={`iso-tree-node ${isLast ? 'is-last' : ''} ${isChild ? 'iso-tree-node--child' : ''}`}>
      <div className="iso-tree-node-content" title={label}>
        <span className="iso-tree-code">{node.code || node.symbol}</span>
        {node.name && <span className="iso-tree-name">{node.name}</span>}
        {subInfo && <span className="iso-tree-version">{subInfo}</span>}
      </div>
      {node.children.length > 0 && (
        <ul className="iso-tree-list iso-tree-list--nested">
          {node.children.map((c, i) => (
            <TreeNode key={c._key} node={c} isChild isLast={i === node.children.length - 1} />
          ))}
        </ul>
      )}
    </li>
  );
};

const ISOAttachedDocsTree = ({ docs = [], defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const tree = useMemo(() => buildTree(docs || []), [docs]);

  if (!docs || docs.length === 0) return null;

  const handleToggle = (e) => {
    e.stopPropagation();
    setIsOpen((v) => !v);
  };

  return (
    <div className={`iso-tree ${isOpen ? 'is-open' : ''}`} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="iso-tree-toggle"
        aria-expanded={isOpen}
        onClick={handleToggle}
        title={isOpen ? 'Thu gọn biểu mẫu' : 'Xem tất cả biểu mẫu'}
      >
        <ChevronRight size={14} className="iso-tree-chevron" />
        <Paperclip size={12} />
        <span className="iso-tree-badge">{docs.length} biểu mẫu</span>
      </button>
      <div className="iso-tree-body">
        <div className="iso-tree-body-inner">
          <ul className="iso-tree-list">
            {tree.map((n, i) => (
              <TreeNode key={n._key} node={n} isLast={i === tree.length - 1} />
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ISOAttachedDocsTree;
