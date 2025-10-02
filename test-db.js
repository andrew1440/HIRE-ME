const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./hire-me.db');

console.log('Testing database connection and tables...');

// Check what tables exist
db.serialize(() => {
  db.each(`SELECT name FROM sqlite_master WHERE type='table'`, (err, row) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log('Table:', row.name);
    }
  });
  
  // Check if orders table exists and has data
  setTimeout(() => {
    db.get(`SELECT COUNT(*) as count FROM orders`, (err, row) => {
      if (err) {
        console.log('Orders table error:', err.message);
      } else {
        console.log('Orders count:', row.count);
      }
      
      // Check if order_items table exists and has data
      db.get(`SELECT COUNT(*) as count FROM order_items`, (err, row) => {
        if (err) {
          console.log('Order items table error:', err.message);
        } else {
          console.log('Order items count:', row.count);
        }
        
        db.close();
      });
    });
  }, 500);
});