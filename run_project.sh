#!/usr/bin/env bash

# Exit on error
set -e

WORKSPACE="/home/mk/Documents/New_Cicada_404"
REDIS_PORT=6379
MYSQL_PORT=3306

echo "=== Starting Redis Server ==="
redis-server --port $REDIS_PORT --daemonize yes

echo "=== Starting MySQL Server (User Space) ==="
# Ensure pid/sock paths are clean
rm -f "$WORKSPACE/local_mysql/mysql.sock" "$WORKSPACE/local_mysql/mysql.pid"
"$WORKSPACE/local_mysql_bin/mysqld" \
  --no-defaults \
  --datadir="$WORKSPACE/local_mysql" \
  --log-error="$WORKSPACE/local_mysql/error.log" \
  --pid-file="$WORKSPACE/local_mysql/mysql.pid" \
  --socket="$WORKSPACE/local_mysql/mysql.sock" \
  --port=$MYSQL_PORT \
  --user=$(whoami) &

# Save mysql pid
MYSQL_PID=$!

echo "Waiting for Redis to be ready..."
until redis-cli -p $REDIS_PORT ping | grep -q PONG; do
  sleep 0.5
done
echo "Redis is ready!"

echo "Waiting for MySQL to be ready..."
until mysql --socket="$WORKSPACE/local_mysql/mysql.sock" -u root -e "SELECT 1;" >/dev/null 2>&1; do
  sleep 0.5
done
echo "MySQL is ready!"

echo "=== Initializing MySQL Databases ==="
mysql --socket="$WORKSPACE/local_mysql/mysql.sock" -u root -e "CREATE DATABASE IF NOT EXISTS secure_auth;"

echo "=== Starting Backend Flask App ==="
export DB_HOST="127.0.0.1"
export DB_USER="root"
export DB_PASSWORD=""
export DB_NAME="secure_auth"
export FLASK_ENV="development"
export RATE_LIMIT_STORAGE="redis://127.0.0.1:6379"

cd "$WORKSPACE/secure-auth-backend"
# Initialize DB tables
"$WORKSPACE/secure-auth-backend/venv/bin/python" -c "from db import init_db; init_db()"

# Start Flask backend in background
"$WORKSPACE/secure-auth-backend/venv/bin/python" app.py &
BACKEND_PID=$!

echo "Waiting for Backend to be ready..."
until curl -s http://localhost:5000/health | grep -q "healthy"; do
  sleep 0.5
done
echo "Backend is ready!"

echo "=== Starting Frontend Dev Server ==="
cd "$WORKSPACE/secure-auth-frontend"
export VITE_API_BASE_URL="http://localhost:5000"
export PATH="/home/mk/.cache/ms-playwright-go/1.57.0:$PATH"
node node_modules/vite/bin/vite.js --port 3000 --host 0.0.0.0 &
FRONTEND_PID=$!

echo "=== All services running ==="
echo "Frontend: http://localhost:3000"
echo "Backend: http://localhost:5000"
echo "MySQL: Port 3306"
echo "Redis: Port 6379"
echo "Press Ctrl+C to stop all services."

# Trap Ctrl+C to kill all background jobs
cleanup() {
  echo "Stopping all services..."
  kill $BACKEND_PID || true
  kill $FRONTEND_PID || true
  kill $MYSQL_PID || true
  redis-cli -p $REDIS_PORT shutdown || true
  exit 0
}
trap cleanup SIGINT SIGTERM

# Keep the script running
wait
