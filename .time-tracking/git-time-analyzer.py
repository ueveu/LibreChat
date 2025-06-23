#!/usr/bin/env python3
"""
Git Time Analyzer - Estimates work hours from git commits
Usage: python3 git-time-analyzer.py [--author=NAME] [--since=DATE]
"""

import subprocess
import re
import datetime
import argparse
from collections import defaultdict

def get_git_commits(author=None, since=None):
    """Get git commits with timestamps"""
    cmd = ['git', 'log', '--pretty=format:%H|%ai|%an|%s']
    
    if author:
        cmd.extend(['--author', author])
    if since:
        cmd.extend(['--since', since])
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return result.stdout.strip().split('\n')
    except subprocess.CalledProcessError:
        return []

def parse_commits(commits):
    """Parse commit data into structured format"""
    parsed = []
    for commit in commits:
        if not commit.strip():
            continue
        parts = commit.split('|', 3)
        if len(parts) >= 4:
            hash_id, timestamp, author, message = parts
            dt = datetime.datetime.fromisoformat(timestamp.replace(' +', '+'))
            parsed.append({
                'hash': hash_id,
                'timestamp': dt,
                'author': author,
                'message': message
            })
    return sorted(parsed, key=lambda x: x['timestamp'])

def estimate_work_sessions(commits, max_gap_hours=2):
    """Estimate work sessions from commit patterns"""
    if not commits:
        return []
    
    sessions = []
    current_session = {
        'start': commits[0]['timestamp'],
        'end': commits[0]['timestamp'],
        'commits': [commits[0]]
    }
    
    for commit in commits[1:]:
        time_gap = (commit['timestamp'] - current_session['end']).total_seconds() / 3600
        
        if time_gap <= max_gap_hours:
            # Continue current session
            current_session['end'] = commit['timestamp']
            current_session['commits'].append(commit)
        else:
            # Start new session
            sessions.append(current_session)
            current_session = {
                'start': commit['timestamp'],
                'end': commit['timestamp'],
                'commits': [commit]
            }
    
    sessions.append(current_session)
    return sessions

def calculate_work_hours(sessions, min_session_minutes=15):
    """Calculate total work hours from sessions"""
    total_hours = 0
    daily_breakdown = defaultdict(float)
    
    for session in sessions:
        duration = (session['end'] - session['start']).total_seconds() / 3600
        # Minimum session time assumption
        duration = max(duration, min_session_minutes / 60)
        
        total_hours += duration
        date_key = session['start'].strftime('%Y-%m-%d')
        daily_breakdown[date_key] += duration
    
    return total_hours, daily_breakdown

def main():
    parser = argparse.ArgumentParser(description='Analyze git commits for time tracking')
    parser.add_argument('--author', help='Filter by author name')
    parser.add_argument('--since', help='Filter commits since date (e.g., "2024-01-01")')
    parser.add_argument('--detailed', action='store_true', help='Show detailed breakdown')
    
    args = parser.parse_args()
    
    print("📊 Git Time Analysis Report")
    print("=" * 50)
    
    commits = get_git_commits(args.author, args.since)
    if not commits or not commits[0]:
        print("No commits found.")
        return
    
    parsed_commits = parse_commits(commits)
    sessions = estimate_work_sessions(parsed_commits)
    total_hours, daily_breakdown = calculate_work_hours(sessions)
    
    print(f"📈 Total Estimated Work Hours: {total_hours:.1f}")
    print(f"📅 Work Sessions: {len(sessions)}")
    print(f"💻 Total Commits: {len(parsed_commits)}")
    
    if args.detailed:
        print("\n📊 Daily Breakdown:")
        for date, hours in sorted(daily_breakdown.items()):
            print(f"  {date}: {hours:.1f} hours")
        
        print("\n🔍 Recent Sessions:")
        for i, session in enumerate(sessions[-5:], 1):
            start = session['start'].strftime('%Y-%m-%d %H:%M')
            end = session['end'].strftime('%H:%M')
            duration = (session['end'] - session['start']).total_seconds() / 3600
            duration = max(duration, 0.25)  # Min 15 minutes
            print(f"  {i}. {start} - {end} ({duration:.1f}h) - {len(session['commits'])} commits")

if __name__ == '__main__':
    main()
