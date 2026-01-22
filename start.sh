sudo -u postgres psql -c "CREATE USER admin WITH PASSWORD 'admin123';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE propaganda OWNER admin;" 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER admin CREATEDB;" 2>/dev/null || true

# Wait for DB
sleep 2

# Push DB
npx prisma db push

# Start App and Worker
echo "Starting App and Worker..."
npm run dev &
npm run whatsapp &
wait
