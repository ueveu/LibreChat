"""Email Summarization and Processing Tools for MCP Server"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import re

from mcp import types
from .imap_client import IMAPClient
from .models import EmailSummary, EmailCategory, ActionItem

logger = logging.getLogger(__name__)


class EmailSummarizationTools:
    """Tools for email summarization and processing"""

    def __init__(self, imap_client: IMAPClient):
        self.imap_client = imap_client

    async def fetch_recent_emails(
        self,
        folder: str = "INBOX",
        days: int = 7,
        limit: int = 50,
        unread_only: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Fetch recent emails from specified folder
        
        Args:
            folder: Email folder to search (default: INBOX)
            days: Number of days back to fetch (default: 7)
            limit: Maximum number of emails to fetch (default: 50)
            unread_only: Only fetch unread emails (default: False)
            
        Returns:
            List of email dictionaries with headers and content
        """
        try:
            # Calculate date range
            since_date = datetime.now() - timedelta(days=days)
            
            # Build search criteria
            search_criteria = f'SINCE {since_date.strftime("%d-%b-%Y")}'
            if unread_only:
                search_criteria += ' UNSEEN'
                
            # Fetch emails using IMAP client
            emails = await self.imap_client.search_emails(
                folder=folder,
                criteria=search_criteria,
                limit=limit
            )
            
            # Process and format emails
            processed_emails = []
            for email in emails:
                processed_email = {
                    'id': email.get('id'),
                    'uid': email.get('uid'),
                    'subject': email.get('subject', ''),
                    'from': email.get('from', ''),
                    'to': email.get('to', ''),
                    'date': email.get('date', ''),
                    'body': self._extract_text_content(email.get('body', '')),
                    'is_read': email.get('is_read', False),
                    'folder': folder
                }
                processed_emails.append(processed_email)
                
            logger.info(f"Fetched {len(processed_emails)} emails from {folder}")
            return processed_emails
            
        except Exception as e:
            logger.error(f"Error fetching emails: {str(e)}")
            raise

    async def summarize_emails(
        self,
        emails: List[Dict[str, Any]],
        summary_type: str = "brief"
    ) -> EmailSummary:
        """
        Create AI-powered summary of email list
        
        Args:
            emails: List of email dictionaries
            summary_type: Type of summary ("brief", "detailed", "action-focused")
            
        Returns:
            EmailSummary object with key insights
        """
        try:
            if not emails:
                return EmailSummary(
                    total_emails=0,
                    summary="No emails found in the specified timeframe.",
                    key_topics=[],
                    urgent_emails=[],
                    action_items=[],
                    sender_breakdown={}
                )

            # Extract key information
            total_emails = len(emails)
            unread_count = sum(1 for email in emails if not email.get('is_read', True))
            
            # Analyze senders
            sender_breakdown = {}
            for email in emails:
                sender = email.get('from', 'Unknown')
                sender_breakdown[sender] = sender_breakdown.get(sender, 0) + 1

            # Identify urgent emails (based on keywords and patterns)
            urgent_emails = self._identify_urgent_emails(emails)
            
            # Extract action items
            action_items = self._extract_action_items(emails)
            
            # Identify key topics using keyword analysis
            key_topics = self._identify_key_topics(emails)
            
            # Generate natural language summary
            summary_text = self._generate_summary_text(
                emails, urgent_emails, action_items, key_topics, summary_type
            )
            
            return EmailSummary(
                total_emails=total_emails,
                unread_count=unread_count,
                summary=summary_text,
                key_topics=key_topics,
                urgent_emails=urgent_emails,
                action_items=action_items,
                sender_breakdown=sender_breakdown,
                date_range=self._get_date_range(emails)
            )
            
        except Exception as e:
            logger.error(f"Error summarizing emails: {str(e)}")
            raise

    async def categorize_emails(
        self,
        emails: List[Dict[str, Any]]
    ) -> List[EmailCategory]:
        """
        Categorize emails into logical groups
        
        Args:
            emails: List of email dictionaries
            
        Returns:
            List of EmailCategory objects
        """
        try:
            categories = {
                'urgent': [],
                'work': [],
                'personal': [],
                'newsletters': [],
                'notifications': [],
                'other': []
            }
            
            for email in emails:
                category = self._classify_email(email)
                categories[category].append(email)
            
            # Convert to EmailCategory objects
            result = []
            for category_name, category_emails in categories.items():
                if category_emails:  # Only include non-empty categories
                    result.append(EmailCategory(
                        name=category_name.title(),
                        count=len(category_emails),
                        emails=category_emails,
                        description=self._get_category_description(category_name)
                    ))
            
            return result
            
        except Exception as e:
            logger.error(f"Error categorizing emails: {str(e)}")
            raise

    def _extract_text_content(self, body: str) -> str:
        """Extract plain text from email body (remove HTML if present)"""
        if not body:
            return ""
            
        # Simple HTML tag removal
        text = re.sub(r'<[^>]+>', '', body)
        # Clean up extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Limit length for processing
        return text[:2000] if len(text) > 2000 else text

    def _identify_urgent_emails(self, emails: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify emails that require urgent attention"""
        urgent_keywords = [
            'urgent', 'asap', 'immediate', 'emergency', 'critical',
            'deadline', 'expires', 'due today', 'action required'
        ]
        
        urgent_emails = []
        for email in emails:
            subject = email.get('subject', '').lower()
            body = email.get('body', '').lower()
            
            if any(keyword in subject or keyword in body for keyword in urgent_keywords):
                urgent_emails.append(email)
                
        return urgent_emails

    def _extract_action_items(self, emails: List[Dict[str, Any]]) -> List[ActionItem]:
        """Extract action items and tasks from emails"""
        action_patterns = [
            r'please\s+(\w+(?:\s+\w+)*)',
            r'can you\s+(\w+(?:\s+\w+)*)',
            r'need to\s+(\w+(?:\s+\w+)*)',
            r'action required:?\s*(\w+(?:\s+\w+)*)',
            r'todo:?\s*(\w+(?:\s+\w+)*)',
            r'deadline:?\s*(\w+(?:\s+\w+)*)'
        ]
        
        action_items = []
        for email in emails:
            text = f"{email.get('subject', '')} {email.get('body', '')}"
            
            for pattern in action_patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                for match in matches:
                    action_text = match.group(1)[:100]  # Limit length
                    if len(action_text.strip()) > 3:  # Filter out very short matches
                        action_items.append(ActionItem(
                            description=action_text.strip(),
                            email_subject=email.get('subject', ''),
                            sender=email.get('from', ''),
                            urgency=self._assess_urgency(action_text, email)
                        ))
        
        return action_items[:10]  # Return top 10 action items

    def _identify_key_topics(self, emails: List[Dict[str, Any]]) -> List[str]:
        """Identify key topics from email content"""
        # Simple keyword frequency analysis
        word_freq = {}
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
            'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
            'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you',
            'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
        }
        
        for email in emails:
            text = f"{email.get('subject', '')} {email.get('body', '')}"
            words = re.findall(r'\b\w{3,}\b', text.lower())
            
            for word in words:
                if word not in stop_words and len(word) > 2:
                    word_freq[word] = word_freq.get(word, 0) + 1
        
        # Return top topics
        top_topics = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:8]
        return [topic[0].title() for topic, freq in top_topics if freq > 1]

    def _generate_summary_text(
        self,
        emails: List[Dict[str, Any]],
        urgent_emails: List[Dict[str, Any]],
        action_items: List[ActionItem],
        key_topics: List[str],
        summary_type: str
    ) -> str:
        """Generate natural language summary"""
        total_count = len(emails)
        urgent_count = len(urgent_emails)
        action_count = len(action_items)
        
        if summary_type == "brief":
            summary = f"Analyzed {total_count} emails. "
            if urgent_count > 0:
                summary += f"{urgent_count} require urgent attention. "
            if action_count > 0:
                summary += f"{action_count} action items identified. "
            if key_topics:
                summary += f"Main topics: {', '.join(key_topics[:3])}."
                
        elif summary_type == "detailed":
            summary = f"Email Summary Report:\n\n"
            summary += f"• Total emails processed: {total_count}\n"
            if urgent_count > 0:
                summary += f"• Urgent emails requiring attention: {urgent_count}\n"
            if action_count > 0:
                summary += f"• Action items extracted: {action_count}\n"
            if key_topics:
                summary += f"• Key discussion topics: {', '.join(key_topics)}\n"
                
        else:  # action-focused
            summary = f"Action-Focused Summary:\n\n"
            if action_count > 0:
                summary += f"🔥 {action_count} action items require your attention\n"
            if urgent_count > 0:
                summary += f"⚠️ {urgent_count} urgent emails need immediate response\n"
            summary += f"📧 {total_count} total emails processed"
            
        return summary

    def _classify_email(self, email: Dict[str, Any]) -> str:
        """Classify email into categories"""
        subject = email.get('subject', '').lower()
        sender = email.get('from', '').lower()
        body = email.get('body', '').lower()
        
        # Check for urgent indicators
        urgent_keywords = ['urgent', 'asap', 'emergency', 'critical', 'deadline']
        if any(keyword in subject or keyword in body for keyword in urgent_keywords):
            return 'urgent'
            
        # Check for newsletters/notifications
        newsletter_indicators = ['unsubscribe', 'newsletter', 'notification', 'update', 'digest']
        if any(indicator in subject or indicator in body for indicator in newsletter_indicators):
            return 'newsletters'
            
        # Check for automated notifications
        notification_keywords = ['no-reply', 'noreply', 'automated', 'system', 'alert']
        if any(keyword in sender for keyword in notification_keywords):
            return 'notifications'
            
        # Check for work-related content
        work_keywords = ['meeting', 'project', 'deadline', 'report', 'business', 'work']
        if any(keyword in subject or keyword in body for keyword in work_keywords):
            return 'work'
            
        # Check for personal indicators
        personal_keywords = ['family', 'friend', 'personal', 'vacation', 'birthday']
        if any(keyword in subject or keyword in body for keyword in personal_keywords):
            return 'personal'
            
        return 'other'

    def _get_category_description(self, category_name: str) -> str:
        """Get description for email category"""
        descriptions = {
            'urgent': 'Emails requiring immediate attention',
            'work': 'Work-related communications and tasks',
            'personal': 'Personal correspondence and social communications',
            'newsletters': 'Newsletters, marketing emails, and subscriptions',
            'notifications': 'System notifications and automated messages',
            'other': 'Miscellaneous emails not fitting other categories'
        }
        return descriptions.get(category_name, 'Miscellaneous emails')

    def _assess_urgency(self, action_text: str, email: Dict[str, Any]) -> str:
        """Assess urgency level of action item"""
        urgent_keywords = ['urgent', 'asap', 'immediate', 'emergency', 'today']
        text_lower = action_text.lower()
        subject_lower = email.get('subject', '').lower()
        
        if any(keyword in text_lower or keyword in subject_lower for keyword in urgent_keywords):
            return 'high'
        elif 'deadline' in text_lower or 'due' in text_lower:
            return 'medium'
        else:
            return 'low'

    def _get_date_range(self, emails: List[Dict[str, Any]]) -> Dict[str, str]:
        """Get date range of emails"""
        if not emails:
            return {}
            
        dates = []
        for email in emails:
            date_str = email.get('date', '')
            if date_str:
                try:
                    # Simple date parsing - in real implementation would use proper date parsing
                    dates.append(date_str)
                except:
                    continue
                    
        if dates:
            return {
                'earliest': min(dates),
                'latest': max(dates)
            }
        return {}


# MCP Tool Definitions for Email Summarization

async def fetch_recent_emails_tool(
    arguments: Dict[str, Any],
    imap_client: IMAPClient
) -> types.TextContent:
    """MCP tool to fetch recent emails"""
    try:
        tools = EmailSummarizationTools(imap_client)
        
        folder = arguments.get('folder', 'INBOX')
        days = int(arguments.get('days', 7))
        limit = int(arguments.get('limit', 50))
        unread_only = arguments.get('unread_only', False)
        
        emails = await tools.fetch_recent_emails(folder, days, limit, unread_only)
        
        return types.TextContent(
            type="text",
            text=json.dumps({
                'success': True,
                'count': len(emails),
                'emails': emails
            }, indent=2)
        )
        
    except Exception as e:
        logger.error(f"Error in fetch_recent_emails_tool: {str(e)}")
        return types.TextContent(
            type="text", 
            text=json.dumps({
                'success': False,
                'error': str(e)
            })
        )


async def summarize_emails_tool(
    arguments: Dict[str, Any],
    imap_client: IMAPClient
) -> types.TextContent:
    """MCP tool to summarize emails"""
    try:
        tools = EmailSummarizationTools(imap_client)
        
        # Get emails from arguments or fetch recent ones
        emails = arguments.get('emails')
        if not emails:
            folder = arguments.get('folder', 'INBOX')
            days = int(arguments.get('days', 7))
            limit = int(arguments.get('limit', 50))
            unread_only = arguments.get('unread_only', False)
            emails = await tools.fetch_recent_emails(folder, days, limit, unread_only)
        
        summary_type = arguments.get('summary_type', 'brief')
        summary = await tools.summarize_emails(emails, summary_type)
        
        return types.TextContent(
            type="text",
            text=json.dumps({
                'success': True,
                'summary': summary.__dict__
            }, indent=2)
        )
        
    except Exception as e:
        logger.error(f"Error in summarize_emails_tool: {str(e)}")
        return types.TextContent(
            type="text",
            text=json.dumps({
                'success': False,
                'error': str(e)
            })
        )


async def categorize_emails_tool(
    arguments: Dict[str, Any],
    imap_client: IMAPClient
) -> types.TextContent:
    """MCP tool to categorize emails"""
    try:
        tools = EmailSummarizationTools(imap_client)
        
        # Get emails from arguments or fetch recent ones
        emails = arguments.get('emails')
        if not emails:
            folder = arguments.get('folder', 'INBOX')
            days = int(arguments.get('days', 7))
            limit = int(arguments.get('limit', 50))
            emails = await tools.fetch_recent_emails(folder, days, limit, False)
        
        categories = await tools.categorize_emails(emails)
        
        return types.TextContent(
            type="text",
            text=json.dumps({
                'success': True,
                'categories': [cat.__dict__ for cat in categories]
            }, indent=2)
        )
        
    except Exception as e:
        logger.error(f"Error in categorize_emails_tool: {str(e)}")
        return types.TextContent(
            type="text",
            text=json.dumps({
                'success': False,
                'error': str(e)
            })
        )