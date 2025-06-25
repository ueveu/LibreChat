"""Data models for email processing and summarization"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional
from datetime import datetime


@dataclass
class ActionItem:
    """Represents an action item extracted from emails"""
    description: str
    email_subject: str
    sender: str
    urgency: str  # 'low', 'medium', 'high'
    due_date: Optional[str] = None
    completed: bool = False


@dataclass
class EmailCategory:
    """Represents a category of emails"""
    name: str
    count: int
    emails: List[Dict[str, Any]]
    description: str
    priority_score: Optional[float] = None


@dataclass
class EmailSummary:
    """Comprehensive summary of email analysis"""
    total_emails: int
    unread_count: int
    summary: str
    key_topics: List[str]
    urgent_emails: List[Dict[str, Any]]
    action_items: List[ActionItem]
    sender_breakdown: Dict[str, int]
    date_range: Optional[Dict[str, str]] = None
    categories: Optional[List[EmailCategory]] = None
    

@dataclass
class EmailMessage:
    """Represents a single email message"""
    uid: str
    subject: str
    sender: str
    recipients: List[str]
    date: datetime
    body_text: str
    body_html: Optional[str] = None
    is_read: bool = False
    is_flagged: bool = False
    folder: str = "INBOX"
    attachments: List[str] = None
    message_id: Optional[str] = None
    
    def __post_init__(self):
        if self.attachments is None:
            self.attachments = []


@dataclass
class EmailThread:
    """Represents a thread of related emails"""
    thread_id: str
    subject: str
    messages: List[EmailMessage]
    participants: List[str]
    last_activity: datetime
    is_unread: bool = False
    

@dataclass
class EmailAnalytics:
    """Analytics data for email processing"""
    processing_time: float
    emails_processed: int
    categories_found: int
    action_items_extracted: int
    urgent_emails_identified: int
    success_rate: float
    errors_encountered: List[str] = None
    
    def __post_init__(self):
        if self.errors_encountered is None:
            self.errors_encountered = []


@dataclass
class EmailConfiguration:
    """Configuration for email processing"""
    imap_host: str
    imap_port: int
    username: str
    use_ssl: bool = True
    folder_whitelist: Optional[List[str]] = None
    max_emails_per_request: int = 100
    summarization_model: str = "claude-3-sonnet"
    
    def __post_init__(self):
        if self.folder_whitelist is None:
            self.folder_whitelist = ["INBOX", "Sent", "Archive"]