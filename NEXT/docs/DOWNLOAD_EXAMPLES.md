# Chat System Usage Examples

## 📥 PDF Download Functionality

### Basic Download Example

```typescript
import { useChat } from '@/hooks/use-chat';

function ChatComponent() {
  const { downloadReport } = useChat();

  const handleDownload = async (reportId: string) => {
    const success = await downloadReport(reportId);
    if (success) {
      console.log('Download started!');
    } else {
      console.error('Download failed');
    }
  };

  return (
    <button onClick={() => handleDownload('report-uuid-here')}>
      Download Report
    </button>
  );
}
```

### Advanced Download with Custom Filename

```typescript
const handleCustomDownload = async () => {
  const reportId = 'your-report-id';
  const customFilename = `patient_john_doe_${new Date().toISOString().split('T')[0]}.pdf`;
  
  const success = await downloadReport(reportId, customFilename);
  if (success) {
    alert(`Report downloaded as: ${customFilename}`);
  }
};
```

### Direct API Usage

```typescript
import { chatAPI } from '@/lib/api/chat';

// Method 1: Trigger automatic download
const downloadSuccess = await chatAPI.triggerReportDownload('report-id');

// Method 2: Get blob for custom handling
const result = await chatAPI.downloadReport('report-id');
if (result.success) {
  const blob = result.data;
  // Handle blob manually
}
```

## 🎯 Complete Chat Flow with Downloads

### 1. X-ray Analysis to Report Download

```typescript
function XrayAnalysisFlow() {
  const {
    sendMessageWithImage,
    messages,
    downloadReport,
    isLoading
  } = useChat();

  const handleXrayUpload = async (file: File) => {
    // Step 1: Upload and analyze X-ray
    await sendMessageWithImage('Please analyze this X-ray', file, {
      name: 'John Doe',
      age: '30',
      gender: 'Male'
    });
  };

  const handleGenerateReport = async () => {
    // Step 2: Request report generation
    await sendMessage('Generate a detailed PDF report for my analysis');
  };

  const handleDownloadFromAction = (action: ChatAction) => {
    // Step 3: Download when action is clicked
    if (action.type === 'download_report' && action.data?.report_id) {
      downloadReport(action.data.report_id, action.data.filename);
    }
  };

  return (
    <div>
      <input type="file" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleXrayUpload(file);
      }} />
      
      {messages.map(msg => (
        <div key={msg.id}>
          <p>{msg.content}</p>
          {msg.actions?.map(action => (
            <button 
              key={action.type}
              onClick={() => handleDownloadFromAction(action)}
            >
              {action.label}
            </button>
          ))}
          {msg.attachments?.map(attachment => (
            <div key={attachment.url}>
              <a href={attachment.url} download={attachment.name}>
                📄 {attachment.name}
              </a>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

### 2. Chat Actions Handler

```typescript
const handleChatAction = async (action: ChatAction) => {
  switch (action.type) {
    case 'download_report':
      if (action.data?.report_id) {
        const success = await downloadReport(
          action.data.report_id, 
          action.data.filename || 'orthoassist_report.pdf'
        );
        
        if (!success) {
          alert('Download failed. Please try again.');
        }
      }
      break;

    case 'email_report':
      await sendMessage('Please email me the report');
      break;

    case 'share_report':
      if (action.data?.report_id) {
        const shareUrl = `${window.location.origin}/api/reports/${action.data.report_id}/download`;
        await navigator.clipboard.writeText(shareUrl);
        alert('Share link copied to clipboard!');
      }
      break;

    case 'generate_report':
      await sendMessage('Generate a detailed PDF report for my analysis');
      break;

    default:
      await sendMessage(action.label);
  }
};
```

## 🔗 API Endpoint Examples

### Download Endpoint

```bash
# Direct download URL
GET /api/reports/{report_id}/download

# Example
GET /api/reports/123e4567-e89b-12d3-a456-426614174000/download
```

### Response Headers

```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Disposition: attachment; filename="orthoassist_report_123e4567.pdf"
Content-Length: 1048576
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

## 🛡️ Error Handling

### Download Error Scenarios

```typescript
const handleDownloadWithErrorHandling = async (reportId: string) => {
  try {
    const success = await downloadReport(reportId);
    
    if (!success) {
      // Handle download failure
      const errorMessage = error || 'Download failed';
      
      if (errorMessage.includes('not found')) {
        alert('Report not found. It may have expired.');
      } else if (errorMessage.includes('network')) {
        alert('Network error. Please check your connection.');
      } else {
        alert('Download failed. Please try again.');
      }
    }
  } catch (error) {
    console.error('Download error:', error);
    alert('An unexpected error occurred during download.');
  }
};
```

### Retry Download

```typescript
const retryDownload = async (reportId: string, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`Download attempt ${attempt}/${maxRetries}`);
    
    const success = await downloadReport(reportId);
    if (success) {
      return true;
    }
    
    if (attempt < maxRetries) {
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  
  return false;
};
```

## 📱 Mobile Download Handling

```typescript
const handleMobileDownload = async (reportId: string) => {
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  if (isMobile) {
    // For mobile, open in new tab instead of triggering download
    const downloadUrl = `/api/reports/${reportId}/download`;
    window.open(downloadUrl, '_blank');
  } else {
    // Desktop: trigger automatic download
    await downloadReport(reportId);
  }
};
```

## 🎨 UI Components

### Download Button Component

```typescript
interface DownloadButtonProps {
  reportId: string;
  filename?: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

function DownloadButton({ 
  reportId, 
  filename, 
  variant = 'primary',
  disabled = false 
}: DownloadButtonProps) {
  const { downloadReport, isLoading } = useChat();
  const [downloading, setDownloading] = useState(false);

  const handleClick = async () => {
    setDownloading(true);
    try {
      const success = await downloadReport(reportId, filename);
      if (!success) {
        alert('Download failed. Please try again.');
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading || downloading}
      variant={variant}
    >
      {downloading ? (
        <>
          <Loader className="h-4 w-4 mr-2 animate-spin" />
          Downloading...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4 mr-2" />
          Download Report
        </>
      )}
    </Button>
  );
}
```

### Attachment Display Component

```typescript
interface AttachmentDisplayProps {
  attachments: ChatAttachment[];
  onDownload: (reportId: string, filename: string) => void;
}

function AttachmentDisplay({ attachments, onDownload }: AttachmentDisplayProps) {
  const extractReportId = (url: string) => {
    const match = url.match(/\/reports\/([^\/]+)\/download/);
    return match ? match[1] : null;
  };

  return (
    <div className="space-y-2">
      {attachments.map((attachment, idx) => {
        const reportId = extractReportId(attachment.url);
        
        return (
          <div
            key={idx}
            className="flex items-center gap-3 p-3 border rounded-lg bg-card"
          >
            <FileDown className="h-5 w-5 text-primary" />
            
            <div className="flex-1">
              <div className="font-medium">{attachment.name}</div>
              <div className="text-sm text-muted-foreground">
                {attachment.type.toUpperCase()}
                {attachment.size && (
                  <span> • {(attachment.size / 1024 / 1024).toFixed(2)} MB</span>
                )}
              </div>
            </div>
            
            {reportId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(reportId, attachment.name)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

## 🔧 Configuration

### Environment Variables

```env
# .env.local
FASTAPI_BASE_URL=http://localhost:8000
NEXT_PUBLIC_MAX_FILE_SIZE_MB=10
NEXT_PUBLIC_DOWNLOAD_TIMEOUT_MS=30000
```

### Download Configuration

```typescript
// lib/config/download.ts
export const DOWNLOAD_CONFIG = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  supportedMimeTypes: ['application/pdf'],
  chunkSize: 1024 * 1024, // 1MB chunks for large files
};
```

## 🚀 Production Considerations

### 1. Security
- Validate report IDs
- Implement rate limiting
- Add authentication if needed
- Sanitize filenames

### 2. Performance
- Implement caching for frequently downloaded reports
- Use CDN for report delivery
- Compress files when possible

### 3. Monitoring
- Track download success rates
- Monitor download times
- Log failed download attempts

### 4. Error Recovery
- Implement retry mechanisms
- Provide alternative download methods
- Cache reports temporarily for retry attempts

---

This covers the complete download functionality for your chat system! The PDF downloads are now fully integrated with proper error handling, mobile support, and comprehensive UI components.