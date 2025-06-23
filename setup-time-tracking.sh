#!/bin/bash

# Comprehensive Time Tracking Setup for LibreChat Project
# This script sets up multiple time tracking methods

set -e

echo "🕐 Setting Up Comprehensive Time Tracking for LibreChat Project"
echo "============================================================"

# Create time tracking directory
mkdir -p .time-tracking
cd .time-tracking

echo "1️⃣ Setting up Git-based time tracking..."

# Create git commit time analyzer
cat > git-time-analyzer.py << 'EOF'
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
EOF

chmod +x git-time-analyzer.py

echo "2️⃣ Setting up automated work session logging..."

# Create work session tracker
cat > work-session-tracker.sh << 'EOF'
#!/bin/bash

# Work Session Tracker - Manual start/stop logging
WORK_LOG_FILE="$HOME/.librechat-work-log.txt"
SESSION_FILE="/tmp/librechat-work-session"

case "$1" in
    start)
        if [ -f "$SESSION_FILE" ]; then
            echo "⚠️  Work session already active!"
            exit 1
        fi
        
        echo "$(date '+%Y-%m-%d %H:%M:%S')" > "$SESSION_FILE"
        echo "🚀 Work session started at $(date '+%H:%M')"
        echo "📝 Use './work-session-tracker.sh stop' to end session"
        ;;
    
    stop)
        if [ ! -f "$SESSION_FILE" ]; then
            echo "❌ No active work session found!"
            exit 1
        fi
        
        START_TIME=$(cat "$SESSION_FILE")
        END_TIME=$(date '+%Y-%m-%d %H:%M:%S')
        
        # Calculate duration
        START_EPOCH=$(date -d "$START_TIME" +%s)
        END_EPOCH=$(date -d "$END_TIME" +%s)
        DURATION=$((END_EPOCH - START_EPOCH))
        HOURS=$((DURATION / 3600))
        MINUTES=$(((DURATION % 3600) / 60))
        
        # Log to file
        echo "$START_TIME,$END_TIME,${HOURS}h ${MINUTES}m,LibreChat Development" >> "$WORK_LOG_FILE"
        
        echo "✅ Work session completed!"
        echo "⏱️  Duration: ${HOURS}h ${MINUTES}m"
        echo "📝 Logged to: $WORK_LOG_FILE"
        
        rm "$SESSION_FILE"
        ;;
    
    status)
        if [ -f "$SESSION_FILE" ]; then
            START_TIME=$(cat "$SESSION_FILE")
            START_EPOCH=$(date -d "$START_TIME" +%s)
            CURRENT_EPOCH=$(date +%s)
            DURATION=$((CURRENT_EPOCH - START_EPOCH))
            HOURS=$((DURATION / 3600))
            MINUTES=$(((DURATION % 3600) / 60))
            
            echo "⏱️  Active session: ${HOURS}h ${MINUTES}m (started at $(date -d "$START_TIME" '+%H:%M'))"
        else
            echo "💤 No active work session"
        fi
        ;;
    
    report)
        if [ -f "$WORK_LOG_FILE" ]; then
            echo "📊 Work Log Summary"
            echo "==================="
            python3 -c "
import csv
from collections import defaultdict
import sys

try:
    with open('$WORK_LOG_FILE', 'r') as f:
        total_minutes = 0
        daily_totals = defaultdict(int)
        
        for line in f:
            parts = line.strip().split(',')
            if len(parts) >= 3:
                start_time = parts[0]
                duration = parts[2]
                date = start_time.split(' ')[0]
                
                # Parse duration
                if 'h' in duration and 'm' in duration:
                    hours = int(duration.split('h')[0])
                    minutes = int(duration.split('h')[1].split('m')[0].strip())
                    total_minutes += hours * 60 + minutes
                    daily_totals[date] += hours * 60 + minutes
        
        print(f'Total Hours: {total_minutes // 60}h {total_minutes % 60}m')
        print('\\nDaily Breakdown:')
        for date, minutes in sorted(daily_totals.items()):
            print(f'  {date}: {minutes // 60}h {minutes % 60}m')
            
except FileNotFoundError:
    print('No work log file found. Start tracking with: ./work-session-tracker.sh start')
"
        else
            echo "📝 No work log found. Start tracking with: ./work-session-tracker.sh start"
        fi
        ;;
    
    *)
        echo "LibreChat Work Session Tracker"
        echo "=============================="
        echo "Usage: $0 {start|stop|status|report}"
        echo ""
        echo "Commands:"
        echo "  start  - Start a new work session"
        echo "  stop   - End the current work session"
        echo "  status - Show current session status"
        echo "  report - Show work summary"
        ;;
esac
EOF

chmod +x work-session-tracker.sh

echo "3️⃣ Setting up git hooks for automatic time tracking..."

# Create git post-commit hook
mkdir -p ../.git/hooks
cat > ../.git/hooks/post-commit << 'EOF'
#!/bin/bash

# Auto-log git commits with timestamps
LOG_FILE="$HOME/.librechat-git-activity.log"
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --pretty=format:"%s")
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "$TIMESTAMP,$COMMIT_HASH,\"$COMMIT_MSG\"" >> "$LOG_FILE"

# If work session is active, note the commit
SESSION_FILE="/tmp/librechat-work-session"
if [ -f "$SESSION_FILE" ]; then
    echo "📝 Commit logged during active work session: $COMMIT_MSG"
fi
EOF

chmod +x ../.git/hooks/post-commit

echo "4️⃣ Creating comprehensive time tracking dashboard..."

cat > time-dashboard.py << 'EOF'
#!/usr/bin/env python3
"""
LibreChat Time Tracking Dashboard
Combines git activity, manual logs, and file modifications
"""

import os
import subprocess
import datetime
import json
from pathlib import Path

def get_git_activity():
    """Get git-based time estimates"""
    try:
        result = subprocess.run([
            'python3', 'git-time-analyzer.py', '--detailed'
        ], capture_output=True, text=True)
        return result.stdout
    except:
        return "Git analysis not available"

def get_manual_logs():
    """Get manual work session logs"""
    log_file = Path.home() / '.librechat-work-log.txt'
    if log_file.exists():
        with open(log_file, 'r') as f:
            return f.read()
    return "No manual logs found"

def get_file_activity():
    """Get recent file modification activity"""
    try:
        result = subprocess.run([
            'find', '.', '-type', 'f', '-name', '*.js', '-o', '-name', '*.ts', 
            '-o', '-name', '*.tsx', '-o', '-name', '*.py', '-o', '-name', '*.yml',
            '-o', '-name', '*.yaml', '-o', '-name', '*.json', '-o', '-name', '*.md',
            '-mtime', '-7', '-exec', 'ls', '-la', '{}', '+'
        ], capture_output=True, text=True, cwd='..')
        return result.stdout
    except:
        return "File activity analysis failed"

def generate_dashboard():
    """Generate comprehensive time tracking dashboard"""
    print("🕐 LibreChat Project Time Tracking Dashboard")
    print("=" * 60)
    print(f"📅 Generated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    print("📊 Git-Based Time Analysis:")
    print("-" * 30)
    print(get_git_activity())
    print()
    
    print("✋ Manual Work Sessions:")
    print("-" * 24)
    manual_logs = get_manual_logs()
    if "No manual logs" not in manual_logs:
        print(manual_logs)
    else:
        print("💡 Start tracking with: ./work-session-tracker.sh start")
    print()
    
    print("📁 Recent File Activity (Last 7 Days):")
    print("-" * 35)
    file_activity = get_file_activity()
    if file_activity:
        lines = file_activity.split('\n')[:20]  # Show first 20 files
        for line in lines:
            if line.strip():
                print(f"  {line}")
        if len(file_activity.split('\n')) > 20:
            print(f"  ... and {len(file_activity.split('\n')) - 20} more files")
    else:
        print("  No recent file activity detected")

if __name__ == '__main__':
    generate_dashboard()
EOF

chmod +x time-dashboard.py

echo "5️⃣ Creating quick access aliases..."

cat > ../time-tracking-aliases.sh << 'EOF'
#!/bin/bash

# Time Tracking Aliases for LibreChat Project
# Add these to your ~/.bashrc or ~/.zshrc

alias work-start='./.time-tracking/work-session-tracker.sh start'
alias work-stop='./.time-tracking/work-session-tracker.sh stop'
alias work-status='./.time-tracking/work-session-tracker.sh status'
alias work-report='./.time-tracking/work-session-tracker.sh report'
alias work-dashboard='cd .time-tracking && python3 time-dashboard.py && cd ..'
alias work-git-analysis='cd .time-tracking && python3 git-time-analyzer.py --detailed && cd ..'

echo "🔧 LibreChat Time Tracking Aliases Loaded!"
echo "📝 Available commands:"
echo "  work-start     - Start work session"
echo "  work-stop      - End work session"
echo "  work-status    - Check current session"
echo "  work-report    - View work summary"
echo "  work-dashboard - Full time tracking dashboard"
echo "  work-git-analysis - Detailed git time analysis"
EOF

echo "6️⃣ Setting up VS Code time tracking (if available)..."

if command -v code &> /dev/null; then
    echo "Installing WakaTime extension for VS Code..."
    code --install-extension WakaTime.vscode-wakatime 2>/dev/null || echo "WakaTime extension install failed (may need manual setup)"
fi

cd ..

echo ""
echo "✅ Time Tracking Setup Complete!"
echo "================================"
echo ""
echo "🚀 Quick Start:"
echo "1. Start work session:    ./.time-tracking/work-session-tracker.sh start"
echo "2. Do your development work..."
echo "3. End work session:      ./.time-tracking/work-session-tracker.sh stop"
echo "4. View dashboard:        ./.time-tracking/time-dashboard.py"
echo ""
echo "📊 Analysis Tools:"
echo "• Git time analysis:      ./.time-tracking/git-time-analyzer.py --detailed"
echo "• Manual session report:  ./.time-tracking/work-session-tracker.sh report"
echo "• Full dashboard:         ./.time-tracking/time-dashboard.py"
echo ""
echo "🔧 Advanced Setup:"
echo "• Add aliases: source time-tracking-aliases.sh"
echo "• Install WakaTime for IDE tracking"
echo "• Set up RescueTime for system-wide tracking"
echo ""
echo "📝 The system tracks:"
echo "✓ Git commits with timestamps"
echo "✓ Manual start/stop work sessions"
echo "✓ File modification patterns"
echo "✓ Daily and weekly summaries"