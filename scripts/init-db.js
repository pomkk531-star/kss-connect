const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('🔧 Initializing Supabase database...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS logins (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        user_type TEXT NOT NULL,
        login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        user_agent TEXT
      );

      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        email TEXT,
        first_name TEXT,
        last_name TEXT,
        role TEXT DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        first_name TEXT,
        last_name TEXT,
        class_code TEXT,
        role TEXT DEFAULT 'student',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        event_date DATE NOT NULL,
        location TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS announcements (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        target_audience TEXT,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER,
        recipient_id INTEGER,
        subject TEXT,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS admin_messages (
        id SERIAL PRIMARY KEY,
        sender_name TEXT,
        sender_email TEXT,
        subject TEXT NOT NULL,
        content TEXT NOT NULL,
        is_anonymous BOOLEAN DEFAULT false,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        reporter_id INTEGER,
        report_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS dress_code (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        day_of_week TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS schedules (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT,
        date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS teachers (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT,
        first_name TEXT,
        last_name TEXT,
        subject TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS ai_knowledge (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        keywords TEXT,
        category TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Database schema initialized');
  } catch (err) {
    if (err.code === '42P07') {
      console.log('ℹ️  Tables already exist');
    } else {
      console.error('❌ Error initializing database:', err.message);
    }
  } finally {
    client.release();
  }
}

async function createAdmin(username, password) {
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT id FROM admins WHERE username = $1', [username]);
    
    if (existing.rows.length > 0) {
      console.log(`⚠️  Admin "${username}" already exists`);
      return;
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = await client.query(
      'INSERT INTO admins (username, password_hash, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING *',
      [username, passwordHash]
    );

    console.log('✅ Admin created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`👤 Username: ${username}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`🆔 Admin ID: ${result.rows[0].id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
  } catch (err) {
    console.error('❌ Error creating admin:', err.message);
  } finally {
    client.release();
  }
}

async function main() {
  const [username, password] = process.argv.slice(2);

  // Initialize database first
  await initializeDatabase();

  // Create admin if provided
  if (username && password) {
    await createAdmin(username, password);
  }

  await pool.end();
  console.log('✅ Done!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
