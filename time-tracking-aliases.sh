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
