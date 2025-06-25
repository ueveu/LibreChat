"""IMAP Client for email operations"""

import asyncio
import email
import imaplib
import logging
import ssl
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
from email.header import decode_header
from email.utils import parsedate_to_datetime

from .models import EmailMessage, EmailConfiguration

logger = logging.getLogger(__name__)


class IMAPClient:
    """Async IMAP client for email operations"""
    
    def __init__(self, config: EmailConfiguration):
        self.config = config
        self.connection: Optional[imaplib.IMAP4_SSL] = None
        self._connected = False
        
    async def connect(self, password: str) -> bool:
        """Connect to IMAP server"""
        try:
            if self.config.use_ssl:
                context = ssl.create_default_context()
                self.connection = imaplib.IMAP4_SSL(
                    self.config.imap_host, 
                    self.config.imap_port,
                    ssl_context=context
                )
            else:
                self.connection = imaplib.IMAP4(
                    self.config.imap_host, 
                    self.config.imap_port
                )
            
            # Login
            self.connection.login(self.config.username, password)
            self._connected = True
            
            logger.info(f"Connected to IMAP server {self.config.imap_host}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to IMAP server: {str(e)}")
            self._connected = False
            return False
    
    async def disconnect(self):
        """Disconnect from IMAP server"""
        try:
            if self.connection and self._connected:
                self.connection.logout()
                self._connected = False
                logger.info("Disconnected from IMAP server")
        except Exception as e:
            logger.error(f"Error disconnecting from IMAP server: {str(e)}")
    
    async def list_folders(self) -> List[str]:
        """List available email folders"""
        try:
            if not self._connected:
                raise Exception("Not connected to IMAP server")
                
            status, folders = self.connection.list()
            if status != 'OK':
                raise Exception(f"Failed to list folders: {status}")
            
            folder_names = []
            for folder in folders:
                # Parse folder name from IMAP response
                # Format: (\\HasNoChildren) "/" "INBOX"
                parts = folder.decode().split('"')
                if len(parts) >= 3:
                    folder_name = parts[-2]
                    folder_names.append(folder_name)
            
            return folder_names
            
        except Exception as e:
            logger.error(f"Error listing folders: {str(e)}")
            raise
    
    async def search_emails(
        self,
        folder: str = "INBOX",
        criteria: str = "ALL",
        limit: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Search for emails matching criteria"""
        try:
            if not self._connected:
                raise Exception("Not connected to IMAP server")
            
            # Select folder
            status, _ = self.connection.select(folder)
            if status != 'OK':
                raise Exception(f"Failed to select folder {folder}")
            
            # Search for emails
            status, message_nums = self.connection.search(None, criteria)
            if status != 'OK':
                raise Exception(f"Search failed: {status}")
            
            # Get email UIDs
            email_uids = message_nums[0].split()
            if limit:
                email_uids = email_uids[-limit:]  # Get most recent emails
            
            emails = []
            for uid in email_uids:
                try:
                    email_data = await self._fetch_email(uid.decode())
                    if email_data:
                        emails.append(email_data)
                except Exception as e:
                    logger.warning(f"Failed to fetch email {uid}: {str(e)}")
                    continue
            
            logger.info(f"Found {len(emails)} emails in {folder}")
            return emails
            
        except Exception as e:
            logger.error(f"Error searching emails: {str(e)}")
            raise
    
    async def _fetch_email(self, uid: str) -> Optional[Dict[str, Any]]:
        """Fetch and parse individual email"""
        try:
            # Fetch email data
            status, msg_data = self.connection.fetch(uid, '(RFC822)')
            if status != 'OK':
                return None
            
            # Parse email message
            raw_email = msg_data[0][1]
            email_message = email.message_from_bytes(raw_email)
            
            # Extract headers
            subject = self._decode_header(email_message.get('Subject', ''))
            from_addr = self._decode_header(email_message.get('From', ''))
            to_addr = self._decode_header(email_message.get('To', ''))
            date_str = email_message.get('Date', '')
            message_id = email_message.get('Message-ID', '')
            
            # Parse date
            email_date = None
            if date_str:
                try:
                    email_date = parsedate_to_datetime(date_str)
                except:
                    email_date = datetime.now()
            
            # Extract body content
            body_text, body_html = self._extract_body(email_message)
            
            # Check if email is read (this is a simplified check)
            is_read = True  # Default assumption - would need FLAGS check for accurate status
            
            return {
                'id': message_id,
                'uid': uid,
                'subject': subject,
                'from': from_addr,
                'to': to_addr,
                'date': email_date.isoformat() if email_date else '',
                'body': body_text,
                'body_html': body_html,
                'is_read': is_read,
                'folder': self.connection.folder if hasattr(self.connection, 'folder') else 'INBOX'
            }
            
        except Exception as e:
            logger.error(f"Error fetching email {uid}: {str(e)}")
            return None
    
    def _decode_header(self, header: str) -> str:
        """Decode email header"""
        if not header:
            return ""
        
        try:
            decoded_parts = decode_header(header)
            decoded_header = ""
            
            for part, encoding in decoded_parts:
                if isinstance(part, bytes):
                    if encoding:
                        decoded_header += part.decode(encoding)
                    else:
                        decoded_header += part.decode('utf-8', errors='ignore')
                else:
                    decoded_header += part
            
            return decoded_header
            
        except Exception as e:
            logger.warning(f"Failed to decode header '{header}': {str(e)}")
            return str(header)
    
    def _extract_body(self, email_message) -> Tuple[str, Optional[str]]:
        """Extract text and HTML body from email"""
        body_text = ""
        body_html = None
        
        try:
            if email_message.is_multipart():
                for part in email_message.walk():
                    content_type = part.get_content_type()
                    content_disposition = str(part.get("Content-Disposition", ""))
                    
                    # Skip attachments
                    if "attachment" in content_disposition:
                        continue
                    
                    if content_type == "text/plain":
                        charset = part.get_content_charset() or 'utf-8'
                        body_text = part.get_payload(decode=True).decode(charset, errors='ignore')
                    elif content_type == "text/html":
                        charset = part.get_content_charset() or 'utf-8'
                        body_html = part.get_payload(decode=True).decode(charset, errors='ignore')
            else:
                # Single part message
                content_type = email_message.get_content_type()
                charset = email_message.get_content_charset() or 'utf-8'
                
                if content_type == "text/plain":
                    body_text = email_message.get_payload(decode=True).decode(charset, errors='ignore')
                elif content_type == "text/html":
                    body_html = email_message.get_payload(decode=True).decode(charset, errors='ignore')
                    # Extract text from HTML if no plain text available
                    if not body_text:
                        body_text = self._html_to_text(body_html)
            
            return body_text, body_html
            
        except Exception as e:
            logger.error(f"Error extracting email body: {str(e)}")
            return "", None
    
    def _html_to_text(self, html: str) -> str:
        """Simple HTML to text conversion"""
        if not html:
            return ""
        
        import re
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', html)
        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        return text
    
    async def mark_as_read(self, uid: str, folder: str = "INBOX") -> bool:
        """Mark email as read"""
        try:
            if not self._connected:
                return False
            
            # Select folder
            self.connection.select(folder)
            
            # Mark as read
            self.connection.store(uid, '+FLAGS', '\\Seen')
            return True
            
        except Exception as e:
            logger.error(f"Error marking email {uid} as read: {str(e)}")
            return False
    
    async def get_folder_status(self, folder: str = "INBOX") -> Dict[str, Any]:
        """Get folder status (message count, unread count, etc.)"""
        try:
            if not self._connected:
                raise Exception("Not connected to IMAP server")
            
            # Select folder
            status, data = self.connection.select(folder)
            if status != 'OK':
                raise Exception(f"Failed to select folder {folder}")
            
            total_messages = int(data[0])
            
            # Count unread messages
            status, unread_data = self.connection.search(None, 'UNSEEN')
            unread_count = len(unread_data[0].split()) if unread_data[0] else 0
            
            return {
                'folder': folder,
                'total_messages': total_messages,
                'unread_messages': unread_count,
                'read_messages': total_messages - unread_count
            }
            
        except Exception as e:
            logger.error(f"Error getting folder status for {folder}: {str(e)}")
            raise