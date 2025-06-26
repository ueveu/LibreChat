# IMAP MCP Server for LibreChat

A Model Context Protocol (MCP) server that provides email integration for LibreChat, enabling AI assistants to fetch, summarize, and analyze emails from IMAP servers.

## Features

- **Email Fetching**: Connect to IMAP servers and fetch recent emails
- **AI Summarization**: Automatically categorize and summarize emails with priority detection
- **Smart Search**: Search emails by subject, sender, or content with date filtering  
- **Statistics**: Get email analytics and overview statistics
- **Security**: Encrypted password storage with LibreChat user integration

## Installation

```bash
cd imap-mcp
pip install -e .
```

## Configuration

Configure via environment variables in LibreChat's `.env` file:

```env
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USERNAME=your-email@gmail.com
IMAP_PASSWORD=your-app-password
IMAP_USE_SSL=true
```

## MCP Tools

### `fetch_recent_emails`
Fetch recent emails from specified folder.

**Parameters:**
- `count` (integer, default: 10): Number of emails to fetch (1-50)
- `folder` (string, default: "INBOX"): Email folder to search

### `summarize_emails` 
Analyze and summarize recent emails with AI categorization.

**Parameters:**
- `count` (integer, default: 5): Number of emails to analyze (1-20)
- `folder` (string, default: "INBOX"): Email folder to analyze

### `search_emails`
Search emails by query with date filtering.

**Parameters:**
- `query` (string, required): Search term for subject/sender/content
- `folder` (string, default: "INBOX"): Email folder to search
- `days_back` (integer, default: 30): Days to search back (1-365)

### `get_email_stats`
Get email statistics and analytics overview.

**Parameters:**
- `folder` (string, default: "INBOX"): Email folder to analyze

## Email Summarization Features

- **Priority Detection**: Automatic priority classification (high/medium/low)
- **Categorization**: Smart categorization (meeting, finance, project, newsletter, general)
- **Action Items**: Extraction of actionable items from email content
- **Key Points**: Identification of important information
- **Sentiment Analysis**: Basic sentiment detection (positive/negative/neutral)

## Integration with LibreChat

The server integrates with LibreChat's user system through:

1. **User Email Config**: Stored in user profile with encrypted passwords
2. **MCP Configuration**: Defined in `librechat.yaml` 
3. **Frontend Components**: Email display and summarization UI
4. **API Routes**: Backend controllers for email operations

## Security

- Passwords are encrypted using AES-256-GCM
- SSL/TLS connections for IMAP
- User-specific email configurations
- No plain text password storage

## Testing

```bash
pytest imap_mcp/tests/
```

## Development

```bash
# Install in development mode
pip install -e .[dev]

# Run tests
python -m pytest

# Start server
python -m imap_mcp.server
```