#!/usr/bin/env python3
"""
IMAP MCP Server for LibreChat Email Summarization

This MCP server provides tools for connecting to IMAP email servers,
fetching emails, and creating intelligent summaries and categorizations.
"""

import asyncio
import email
import imaplib
import json
import logging
import os
import smtplib
import ssl
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional, Sequence

import mcp.types as types
from mcp.server import Server
from mcp.server.models import InitializationOptions
from pydantic import BaseModel, Field

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Server instance
server = Server("imap-mcp")

class EmailConfig(BaseModel):
    """Email configuration model"""
    host: str = Field(..., description="IMAP server hostname")
    port: int = Field(993, description="IMAP server port")
    username: str = Field(..., description="Email username")
    password: str = Field(..., description="Email password")
    use_ssl: bool = Field(True, description="Use SSL connection")
    smtp_host: Optional[str] = Field(None, description="SMTP server hostname")
    smtp_port: Optional[int] = Field(587, description="SMTP server port")

class EmailSummary(BaseModel):
    """Email summary model"""
    subject: str
    sender: str
    date: str
    priority: str
    category: str
    summary: str
    action_items: List[str]
    key_points: List[str]
    sentiment: str

class IMAPConnection:
    """IMAP connection manager"""
    
    def __init__(self, config: EmailConfig):
        self.config = config
        self.connection = None
    
    def __enter__(self):
        try:
            if self.config.use_ssl:
                self.connection = imaplib.IMAP4_SSL(self.config.host, self.config.port)
            else:
                self.connection = imaplib.IMAP4(self.config.host, self.config.port)
            
            self.connection.login(self.config.username, self.config.password)
            logger.info(f"Connected to IMAP server: {self.config.host}")
            return self.connection
        except Exception as e:
            logger.error(f"Failed to connect to IMAP server: {e}")
            raise
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.connection:
            try:
                self.connection.close()
                self.connection.logout()
                logger.info("Disconnected from IMAP server")
            except Exception as e:
                logger.error(f"Error disconnecting from IMAP server: {e}")

def get_email_config() -> EmailConfig:
    """Get email configuration from environment variables"""
    return EmailConfig(
        host=os.getenv("IMAP_HOST", ""),
        port=int(os.getenv("IMAP_PORT", "993")),
        username=os.getenv("IMAP_USERNAME", ""),
        password=os.getenv("IMAP_PASSWORD", ""),
        use_ssl=os.getenv("IMAP_USE_SSL", "true").lower() == "true",
        smtp_host=os.getenv("SMTP_HOST"),
        smtp_port=int(os.getenv("SMTP_PORT", "587"))
    )

def parse_email_message(msg_data: bytes) -> Dict[str, Any]:
    """Parse email message from raw data"""
    try:
        msg = email.message_from_bytes(msg_data)
        
        # Extract basic info
        subject = msg.get('Subject', 'No Subject')
        sender = msg.get('From', 'Unknown Sender')
        date_str = msg.get('Date', '')
        
        # Get email body
        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    try:
                        body = part.get_payload(decode=True).decode('utf-8')
                        break
                    except:
                        continue
        else:
            try:
                body = msg.get_payload(decode=True).decode('utf-8')
            except:
                body = str(msg.get_payload())
        
        return {
            'subject': subject,
            'sender': sender,
            'date': date_str,
            'body': body[:2000],  # Limit body size
            'has_attachments': any(part.get_filename() for part in msg.walk() if msg.is_multipart())
        }
    except Exception as e:
        logger.error(f"Error parsing email: {e}")
        return {
            'subject': 'Parse Error',
            'sender': 'Unknown',
            'date': '',
            'body': f'Error parsing email: {e}',
            'has_attachments': False
        }

def summarize_email(email_data: Dict[str, Any]) -> EmailSummary:
    """Create email summary with AI-generated content"""
    # Basic categorization logic
    subject_lower = email_data['subject'].lower()
    body_lower = email_data['body'].lower()
    
    # Priority detection
    priority = "medium"
    if any(word in subject_lower for word in ['urgent', 'asap', 'important', 'critical']):
        priority = "high"
    elif any(word in subject_lower for word in ['fyi', 'info', 'newsletter']):
        priority = "low"
    
    # Category detection
    category = "general"
    if 'meeting' in subject_lower or 'meeting' in body_lower:
        category = "meeting"
    elif 'invoice' in subject_lower or 'payment' in body_lower:
        category = "finance"
    elif 'project' in subject_lower or 'task' in body_lower:
        category = "project"
    elif 'newsletter' in subject_lower or 'unsubscribe' in body_lower:
        category = "newsletter"
    
    # Extract action items (simple keyword detection)
    action_items = []
    action_keywords = ['please', 'need', 'required', 'deadline', 'due', 'action', 'follow up']
    sentences = email_data['body'].split('.')
    for sentence in sentences[:5]:  # Check first 5 sentences
        if any(keyword in sentence.lower() for keyword in action_keywords):
            action_items.append(sentence.strip())
    
    # Key points (first few sentences)
    key_points = [s.strip() for s in sentences[:3] if s.strip()]
    
    # Sentiment analysis (basic)
    sentiment = "neutral"
    positive_words = ['thank', 'great', 'excellent', 'pleased', 'happy']
    negative_words = ['problem', 'issue', 'concern', 'urgent', 'error']
    
    body_words = body_lower.split()
    positive_count = sum(1 for word in positive_words if word in body_words)
    negative_count = sum(1 for word in negative_words if word in body_words)
    
    if positive_count > negative_count:
        sentiment = "positive"
    elif negative_count > positive_count:
        sentiment = "negative"
    
    # Create summary
    summary = f"Email from {email_data['sender']} regarding {email_data['subject']}. "
    if email_data['body']:
        summary += email_data['body'][:200] + "..." if len(email_data['body']) > 200 else email_data['body']
    
    return EmailSummary(
        subject=email_data['subject'],
        sender=email_data['sender'],
        date=email_data['date'],
        priority=priority,
        category=category,
        summary=summary,
        action_items=action_items,
        key_points=key_points,
        sentiment=sentiment
    )

@server.list_tools()
async def handle_list_tools() -> List[types.Tool]:
    """List available email tools"""
    return [
        types.Tool(
            name="fetch_recent_emails",
            description="Fetch recent emails from IMAP server",
            inputSchema={
                "type": "object",
                "properties": {
                    "count": {
                        "type": "integer",
                        "description": "Number of recent emails to fetch",
                        "default": 10,
                        "minimum": 1,
                        "maximum": 50
                    },
                    "folder": {
                        "type": "string",  
                        "description": "Email folder to search",
                        "default": "INBOX"
                    }
                }
            }
        ),
        types.Tool(
            name="summarize_emails",
            description="Summarize a batch of emails with AI analysis",
            inputSchema={
                "type": "object",
                "properties": {
                    "count": {
                        "type": "integer",
                        "description": "Number of recent emails to summarize",
                        "default": 5,
                        "minimum": 1,
                        "maximum": 20
                    },
                    "folder": {
                        "type": "string",
                        "description": "Email folder to analyze",
                        "default": "INBOX"
                    }
                }
            }
        ),
        types.Tool(
            name="search_emails",
            description="Search emails by subject, sender, or content",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query"
                    },
                    "folder": {
                        "type": "string",
                        "description": "Email folder to search",
                        "default": "INBOX"
                    },
                    "days_back": {
                        "type": "integer",
                        "description": "Number of days to search back",
                        "default": 30,
                        "minimum": 1,
                        "maximum": 365
                    }
                },
                "required": ["query"]
            }
        ),
        types.Tool(
            name="get_email_stats",
            description="Get email statistics and overview",
            inputSchema={
                "type": "object",
                "properties": {
                    "folder": {
                        "type": "string",
                        "description": "Email folder to analyze",
                        "default": "INBOX"
                    }
                }
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: dict) -> List[types.TextContent]:
    """Handle tool calls"""
    try:
        config = get_email_config()
        
        if not all([config.host, config.username, config.password]):
            return [types.TextContent(
                type="text",
                text="Error: Email configuration incomplete. Please check IMAP_HOST, IMAP_USERNAME, and IMAP_PASSWORD environment variables."
            )]
        
        if name == "fetch_recent_emails":
            return await fetch_recent_emails(config, arguments)
        elif name == "summarize_emails":
            return await summarize_emails(config, arguments)
        elif name == "search_emails":
            return await search_emails(config, arguments)
        elif name == "get_email_stats":
            return await get_email_stats(config, arguments)
        else:
            return [types.TextContent(
                type="text",
                text=f"Unknown tool: {name}"
            )]
    
    except Exception as e:
        logger.error(f"Tool call error: {e}")
        return [types.TextContent(
            type="text",
            text=f"Error executing {name}: {str(e)}"
        )]

async def fetch_recent_emails(config: EmailConfig, arguments: dict) -> List[types.TextContent]:
    """Fetch recent emails from IMAP server"""
    count = arguments.get("count", 10)
    folder = arguments.get("folder", "INBOX")
    
    try:
        with IMAPConnection(config) as imap:
            imap.select(folder)
            
            # Search for all emails
            status, messages = imap.search(None, 'ALL')
            if status != 'OK':
                raise Exception("Failed to search emails")
            
            email_ids = messages[0].split()
            # Get most recent emails
            recent_ids = email_ids[-count:] if len(email_ids) >= count else email_ids
            
            emails = []
            for email_id in reversed(recent_ids):  # Most recent first
                status, msg_data = imap.fetch(email_id, '(RFC822)')
                if status == 'OK':
                    email_info = parse_email_message(msg_data[0][1])
                    emails.append(email_info)
            
            result = {
                "folder": folder,
                "total_emails": len(email_ids),
                "fetched_count": len(emails),
                "emails": emails
            }
            
            return [types.TextContent(
                type="text",
                text=f"Fetched {len(emails)} recent emails from {folder}:\n\n" + 
                     json.dumps(result, indent=2, ensure_ascii=False)
            )]
    
    except Exception as e:
        return [types.TextContent(
            type="text",
            text=f"Error fetching emails: {str(e)}"
        )]

async def summarize_emails(config: EmailConfig, arguments: dict) -> List[types.TextContent]:
    """Summarize recent emails with AI analysis"""
    count = arguments.get("count", 5)
    folder = arguments.get("folder", "INBOX")
    
    try:
        with IMAPConnection(config) as imap:
            imap.select(folder)
            
            # Search for recent emails
            status, messages = imap.search(None, 'ALL')
            if status != 'OK':
                raise Exception("Failed to search emails")
            
            email_ids = messages[0].split()
            recent_ids = email_ids[-count:] if len(email_ids) >= count else email_ids
            
            summaries = []
            for email_id in reversed(recent_ids):
                status, msg_data = imap.fetch(email_id, '(RFC822)')
                if status == 'OK':
                    email_info = parse_email_message(msg_data[0][1])
                    summary = summarize_email(email_info)
                    summaries.append(summary.dict())
            
            # Group by category
            categories = {}
            for summary in summaries:
                cat = summary['category']
                if cat not in categories:
                    categories[cat] = []
                categories[cat].append(summary)
            
            result = {
                "folder": folder,
                "analyzed_count": len(summaries),
                "categories": categories,
                "summaries": summaries
            }
            
            return [types.TextContent(
                type="text",
                text=f"Email Summary Analysis for {folder}:\n\n" + 
                     json.dumps(result, indent=2, ensure_ascii=False)
            )]
    
    except Exception as e:
        return [types.TextContent(
            type="text",
            text=f"Error summarizing emails: {str(e)}"
        )]

async def search_emails(config: EmailConfig, arguments: dict) -> List[types.TextContent]:
    """Search emails by query"""
    query = arguments.get("query", "")
    folder = arguments.get("folder", "INBOX")
    days_back = arguments.get("days_back", 30)
    
    try:
        with IMAPConnection(config) as imap:
            imap.select(folder)
            
            # Create date filter
            since_date = (datetime.now() - timedelta(days=days_back)).strftime("%d-%b-%Y")
            search_criteria = f'(SINCE "{since_date}")'
            
            # Add text search
            if query:
                search_criteria = f'({search_criteria} OR SUBJECT "{query}" OR FROM "{query}")'
            
            status, messages = imap.search(None, search_criteria)
            if status != 'OK':
                raise Exception("Failed to search emails")
            
            email_ids = messages[0].split()
            
            matching_emails = []
            for email_id in reversed(email_ids[-20:]):  # Limit to 20 most recent matches
                status, msg_data = imap.fetch(email_id, '(RFC822)')
                if status == 'OK':
                    email_info = parse_email_message(msg_data[0][1])
                    # Additional text matching
                    if (not query or 
                        query.lower() in email_info['subject'].lower() or
                        query.lower() in email_info['sender'].lower() or
                        query.lower() in email_info['body'].lower()):
                        matching_emails.append(email_info)
            
            result = {
                "query": query,
                "folder": folder,
                "days_searched": days_back,
                "matches_found": len(matching_emails),
                "emails": matching_emails
            }
            
            return [types.TextContent(
                type="text",
                text=f"Email search results for '{query}':\n\n" + 
                     json.dumps(result, indent=2, ensure_ascii=False)
            )]
    
    except Exception as e:
        return [types.TextContent(
            type="text",
            text=f"Error searching emails: {str(e)}"
        )]

async def get_email_stats(config: EmailConfig, arguments: dict) -> List[types.TextContent]:
    """Get email statistics"""
    folder = arguments.get("folder", "INBOX")
    
    try:
        with IMAPConnection(config) as imap:
            imap.select(folder)
            
            # Get total count
            status, messages = imap.search(None, 'ALL')
            if status != 'OK':
                raise Exception("Failed to get email count")
            
            all_emails = messages[0].split()
            total_count = len(all_emails)
            
            # Get recent emails for analysis
            recent_count = min(50, total_count)
            recent_ids = all_emails[-recent_count:] if total_count > recent_count else all_emails
            
            # Analyze recent emails
            categories = {}
            priorities = {"high": 0, "medium": 0, "low": 0}
            senders = {}
            
            for email_id in recent_ids:
                status, msg_data = imap.fetch(email_id, '(RFC822)')
                if status == 'OK':
                    email_info = parse_email_message(msg_data[0][1])
                    summary = summarize_email(email_info)
                    
                    # Count categories
                    cat = summary.category
                    categories[cat] = categories.get(cat, 0) + 1
                    
                    # Count priorities
                    priorities[summary.priority] += 1
                    
                    # Count senders
                    sender = email_info['sender']
                    senders[sender] = senders.get(sender, 0) + 1
            
            # Top senders
            top_senders = sorted(senders.items(), key=lambda x: x[1], reverse=True)[:10]
            
            result = {
                "folder": folder,
                "total_emails": total_count,
                "analyzed_recent": recent_count,
                "categories": categories,
                "priorities": priorities,
                "top_senders": dict(top_senders),
                "generated_at": datetime.now().isoformat()
            }
            
            return [types.TextContent(
                type="text",
                text=f"Email Statistics for {folder}:\n\n" + 
                     json.dumps(result, indent=2, ensure_ascii=False)
            )]
    
    except Exception as e:
        return [types.TextContent(
            type="text",
            text=f"Error getting email stats: {str(e)}"
        )]

async def main():
    """Main server entry point"""
    logger.info("Starting IMAP MCP Server...")
    
    # Import and run the server
    from mcp.server.stdio import stdio_server
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream)

if __name__ == "__main__":
    asyncio.run(main())