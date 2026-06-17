
const FileProperties = ({ data }) => {
  const properties = [
    { label: 'ID', value: data.id },
    { label: 'File Name', value: data.title },
    { label: 'Size', value: data.size },
    { label: 'Owner', value: data.owner },
    { label: 'QR Code', value: data.qrCode },
    { label: 'Size', value: data.size },
    { label: 'Version', value: data.version },
    { label: 'Version History', value: '-' },
    { label: 'Created on', value: data.createdOn },
    { label: 'Published on', value: data.publishedOn },
    { label: 'Version filer', value: '-' },
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
