
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === undefined || bytes === null || bytes === '') return '-';
  const parsed = parseInt(bytes, 10);
  if (isNaN(parsed) || parsed === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(parsed) / Math.log(k));
  return parseFloat((parsed / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getFileType = (filename, type) => {
  if (type && type !== 'unknown') return type;
  if (!filename) return 'unknown';
  const ext = filename.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (['xls', 'xlsx'].includes(ext)) return 'excel';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) return 'video';
  if (['zip', 'rar'].includes(ext)) return 'zip';
  if (['txt', 'md', 'csv'].includes(ext)) return 'text';
  return 'unknown';
};

const FileProperties = ({ data = {} }) => {
  const resolvedType = getFileType(data?.title, data?.type);
  const isFolder = resolvedType === 'folder';

  const properties = [
    { label: 'ID', value: data?.id || '-' },
    { label: isFolder ? 'Folder Name' : 'File Name', value: data?.title || '-' },
    { label: 'Type', value: resolvedType ? resolvedType.toUpperCase() : '-' },
    // Only show size if it's a file
    ...(!isFolder ? [{ label: 'Size', value: formatBytes(data?.size) }] : []),
    { label: 'Owner', value: data?.owner || '-' },
    // Only show file-specific metadata if it's a file
    ...(!isFolder ? [
      { label: 'Tags', value: data?.tags || '-' },
      { label: 'QR Code', value: data?.qrCode || '-' },
      { label: 'Version', value: data?.version || '-' },
      { label: 'Version History', value: '-' },
    ] : []),
    { label: 'Created on', value: data?.dateModified || data?.createdOn || '-' },
    { label: 'Published on', value: data?.publishedOn || '-' },
  ];

  return (
    <div className="document-properties glass-panel">
      <div className="properties-header">
        <span>Properties</span>
      </div>
      <div className="properties-content">
        <table className="properties-table">
          <tbody>
            {properties.map((prop, index) => (
              <tr key={index}>
                <td className="prop-label">{prop.label}</td>
                <td className="prop-value">{prop.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .document-properties {
          height: 100%;
          display: flex;
          flex-direction: column;
          color: var(--text-main);
          border-top: 1px solid var(--glass-border);
        }
        .properties-header {
          padding: 10px 15px;
          font-weight: bold;
          font-size: 14px;
          border-bottom: 1px solid var(--glass-border);
        }
        .properties-content {
          flex: 1;
          overflow-y: auto;
          padding: 10px;
        }
        .properties-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        .properties-table td {
          padding: 6px 4px;
        }
        .prop-label {
          color: var(--text-muted);
          width: 100px;
        }
        .prop-value {
          color: var(--text-main);
        }
      `}} />
    </div>
  );
};

export default FileProperties;
