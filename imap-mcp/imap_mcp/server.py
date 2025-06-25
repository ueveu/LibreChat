"""IMAP MCP Server with Email Summarization"""

import asyncio
import json
import logging
import os
from typing import Any, Dict, List, Optional, Sequence

from mcp import types
from mcp.server import Server
from mcp.server.stdio import stdio_server

from .imap_client import IMAPClient
from .models import EmailConfiguration
from .tools import (
    EmailSummarizationTools,
    fetch_recent_emails_tool,
    summarize_emails_tool,
    categorize_emails_tool
)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global IMAP client instance
imap_client: Optional[IMAPClient] = None


async def setup_imap_client() -> IMAPClient:
    """Initialize IMAP client from configuration"""
    global imap_client
    
    if imap_client is not None:
        return imap_client
    
    try:
        # Load configuration from environment
        config = EmailConfiguration(
            imap_host=os.getenv('IMAP_HOST', 'imap.gmail.com'),
            imap_port=int(os.getenv('IMAP_PORT', '993')),
            username=os.getenv('IMAP_USERNAME', ''),
            use_ssl=os.getenv('IMAP_USE_SSL', 'true').lower() == 'true'
        )
        
        if not config.username:
            raise ValueError("IMAP_USERNAME environment variable is required")
        
        password = os.getenv('IMAP_PASSWORD', '')
        if not password:
            raise ValueError("IMAP_PASSWORD environment variable is required")
        
        imap_client = IMAPClient(config)
        
        # Connect to IMAP server
        connected = await imap_client.connect(password)
        if not connected:
            raise Exception("Failed to connect to IMAP server")
        
        logger.info("IMAP client initialized successfully")
        return imap_client
        
    except Exception as e:
        logger.error(f"Failed to setup IMAP client: {str(e)}")
        raise


# Create MCP server
app = Server("imap-mcp")


@app.list_tools()
async def list_tools() -> List[types.Tool]:
    """List available email processing tools"""
    return [
        types.Tool(
            name="fetch_recent_emails",
            description="Fetch recent emails from specified folder",
            inputSchema={
                "type": "object",
                "properties": {
                    "folder": {
                        "type": "string",
                        "description": "Email folder to search (default: INBOX)",
                        "default": "INBOX"
                    },
                    "days": {
                        "type": "integer", 
                        "description": "Number of days back to fetch (default: 7)",
                        "default": 7,
                        "minimum": 1,
                        "maximum": 30
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of emails to fetch (default: 50)",
                        "default": 50,
                        "minimum": 1,
                        "maximum": 200
                    },
                    "unread_only": {
                        "type": "boolean",
                        "description": "Only fetch unread emails (default: false)",
                        "default": False
                    }
                }
            }
        ),
        types.Tool(
            name="summarize_emails",
            description="Create AI-powered summary of emails",
            inputSchema={
                "type": "object",
                "properties": {
                    "folder": {
                        "type": "string",
                        "description": "Email folder to summarize (default: INBOX)",
                        "default": "INBOX"
                    },
                    "days": {
                        "type": "integer",
                        "description": "Number of days back to summarize (default: 7)",
                        "default": 7,
                        "minimum": 1,
                        "maximum": 30
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of emails to analyze (default: 50)",
                        "default": 50,
                        "minimum": 1,
                        "maximum": 200
                    },
                    "summary_type": {
                        "type": "string",
                        "description": "Type of summary to generate",
                        "enum": ["brief", "detailed", "action-focused"],
                        "default": "brief"
                    },
                    "unread_only": {
                        "type": "boolean", 
                        "description": "Only analyze unread emails (default: false)",
                        "default": False
                    }
                }
            }
        ),
        types.Tool(
            name="categorize_emails",
            description="Categorize emails into logical groups",
            inputSchema={
                "type": "object",
                "properties": {
                    "folder": {
                        "type": "string",
                        "description": "Email folder to categorize (default: INBOX)",
                        "default": "INBOX"
                    },
                    "days": {
                        "type": "integer",
                        "description": "Number of days back to categorize (default: 7)",
                        "default": 7,
                        "minimum": 1,
                        "maximum": 30
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of emails to categorize (default: 100)",
                        "default": 100,
                        "minimum": 1,
                        "maximum": 200
                    }
                }
            }
        ),
        types.Tool(
            name="get_folder_status",
            description="Get status information for email folders",
            inputSchema={
                "type": "object",
                "properties": {
                    "folder": {
                        "type": "string",
                        "description": "Email folder to check (default: INBOX)",
                        "default": "INBOX"
                    }
                }
            }
        ),
        types.Tool(
            name="list_folders",
            description="List available email folders",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        )
    ]


@app.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> Sequence[types.TextContent]:
    """Handle tool calls"""
    try:
        # Initialize IMAP client if needed
        client = await setup_imap_client()
        
        if name == "fetch_recent_emails":
            result = await fetch_recent_emails_tool(arguments, client)
            return [result]
            
        elif name == "summarize_emails":
            result = await summarize_emails_tool(arguments, client)
            return [result]
            
        elif name == "categorize_emails":
            result = await categorize_emails_tool(arguments, client)
            return [result]
            
        elif name == "get_folder_status":
            folder = arguments.get('folder', 'INBOX')
            status = await client.get_folder_status(folder)
            
            return [types.TextContent(
                type="text",
                text=json.dumps({
                    'success': True,
                    'folder_status': status
                }, indent=2)
            )]
            
        elif name == "list_folders":
            folders = await client.list_folders()
            
            return [types.TextContent(
                type="text", 
                text=json.dumps({
                    'success': True,
                    'folders': folders
                }, indent=2)
            )]
            
        else:
            return [types.TextContent(
                type="text",
                text=json.dumps({
                    'success': False,
                    'error': f"Unknown tool: {name}"
                })
            )]
            
    except Exception as e:
        logger.error(f"Error executing tool {name}: {str(e)}")
        return [types.TextContent(
            type="text",
            text=json.dumps({
                'success': False,
                'error': str(e)
            })
        )]


@app.list_resources()
async def list_resources() -> List[types.Resource]:
    """List available email resources"""
    return [
        types.Resource(
            uri="email://inbox",
            name="Inbox Status",
            description="Current status of the inbox",
            mimeType="application/json"
        ),
        types.Resource(
            uri="email://recent_summary",
            name="Recent Email Summary",
            description="Summary of recent emails",
            mimeType="application/json"
        ),
        types.Resource(
            uri="email://categories",
            name="Email Categories",
            description="Categorized view of recent emails",
            mimeType="application/json"
        )
    ]


@app.read_resource()
async def read_resource(uri: str) -> str:
    """Read email resources"""
    try:
        client = await setup_imap_client()
        tools = EmailSummarizationTools(client)
        
        if uri == "email://inbox":
            status = await client.get_folder_status("INBOX")
            return json.dumps(status, indent=2)
            
        elif uri == "email://recent_summary":
            emails = await tools.fetch_recent_emails("INBOX", 7, 50, False)
            summary = await tools.summarize_emails(emails, "detailed")
            return json.dumps(summary.__dict__, indent=2)
            
        elif uri == "email://categories":
            emails = await tools.fetch_recent_emails("INBOX", 7, 100, False)
            categories = await tools.categorize_emails(emails)
            return json.dumps([cat.__dict__ for cat in categories], indent=2)
            
        else:
            raise ValueError(f"Unknown resource: {uri}")
            
    except Exception as e:
        logger.error(f"Error reading resource {uri}: {str(e)}")
        return json.dumps({
            'error': str(e)
        })


async def cleanup():
    """Cleanup function"""
    global imap_client
    if imap_client:
        await imap_client.disconnect()


async def main():
    """Main server entry point"""
    try:
        # Register cleanup
        import atexit
        atexit.register(lambda: asyncio.run(cleanup()))
        
        logger.info("Starting IMAP MCP Server with Email Summarization")
        
        # Run the server
        async with stdio_server() as (read_stream, write_stream):
            await app.run(
                read_stream,
                write_stream,
                app.create_initialization_options()
            )
            
    except KeyboardInterrupt:
        logger.info("Server interrupted by user")
    except Exception as e:
        logger.error(f"Server error: {str(e)}")
        raise
    finally:
        await cleanup()


if __name__ == "__main__":
    asyncio.run(main())