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
