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
