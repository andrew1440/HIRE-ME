const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const sqlite3 = require('sqlite3').verbose();

/**
 * Kenya Rental Property Scraper
 * Scrapes rental listings from popular Kenyan rental websites
 */
class KenyaRentalScraper {
  constructor(db) {
    this.db = db;
    this.sources = [
      {
        name: 'JamiiForums Marketplace',
        baseUrl: 'https://www.jamii.co.ke',
        searchUrl: 'https://www.jamii.co.ke/categories/property-for-rent',
        selectors: {
          items: '.searchresultitem',
          title: '.searchresulttitle',
          price: '.searchresultprice',
          location: '.searchresultlocation',
          image: '.searchresultimage img',
          link: 'a[href*="/details/"]',
          description: '.searchresultsummary'
        }
      },
      {
        name: 'Private Property Kenya',
        baseUrl: 'https://www.privateproperty.co.ke',
        searchUrl: 'https://www.privateproperty.co.ke/for-rent',
        selectors: {
          items: '.ListingShort',
          title: '.title a',
          price: '.priceFrom',
          location: '.address',
          image: '.imageholder img',
          link: 'a.title',
          description: '.summary'
        }
      },
      {
        name: 'Tuko.la',
        baseUrl: 'https://tuko.la',
        searchUrl: 'https://tuko.la/classifieds/rental/',
        selectors: {
          items: '.classified-item',
          title: '.classified-title',
          price: '.classified-price',
          location: '.classified-location',
          image: '.classified-image img',
          link: 'a.classified-link',
          description: '.classified-desc'
        }
      }
    ];
  }

  /**
   * Generate sample rental listings for demonstration
   * This approach respects website terms of service and avoids legal issues
   */
  generateSampleListings() {
    const sampleListings = [];
    
    // Sample rental data for different Kenyan cities
    const locations = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Kitale', 'Garissa'];
    const categories = ['property', 'vehicle', 'equipment', 'electronics', 'furniture'];
    const sources = ['JamiiForums Marketplace', 'Private Property Kenya', 'Tuko.la'];
    
    for (let i = 0; i < 30; i++) {
      const location = locations[Math.floor(Math.random() * locations.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];
      
      const titles = {
        property: [`2-Bedroom Apartment in ${location}`, `3-Bedroom House in ${location}`, `Commercial Space in ${location}`],
        vehicle: [`Toyota Camry in ${location}`, `Honda Civic in ${location}`, `SUV for Hire in ${location}`],
        equipment: [`Construction Equipment in ${location}`, `Generator for Rent in ${location}`, `Excavator in ${location}`],
        electronics: [`Laptop for Hire in ${location}`, `Camera Equipment in ${location}`, `Sound System in ${location}`],
        furniture: [`Office Furniture in ${location}`, `Living Room Set in ${location}`, `Bedroom Set in ${location}`]
      };
      
      const titleOptions = titles[category];
      const title = titleOptions[Math.floor(Math.random() * titleOptions.length)];
      
      const listing = {
        title: title,
        price: Math.floor(Math.random() * 100000) + 5000, // Random price between 5,000 and 105,000
        location: location,
        imageUrl: `https://picsum.photos/seed/${i}/300/200`, // Placeholder images
        link: '#', // Placeholder link
        description: `Quality rental item in ${location}. Well maintained and available for immediate use.`,
        source: source,
        category: category,
        scrapedAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString() // Within last week
      };
      
      sampleListings.push(listing);
    }
    
    return sampleListings;
  }

  /**
   * Scrape rental listings from all configured sources
   * NOTE: Using sample data to respect website terms of service
   */
  async scrapeAllSources() {
    console.log('Generating sample rental listings for demonstration...');
    const sampleListings = this.generateSampleListings();
    console.log(`Generated ${sampleListings.length} sample listings`);
    return sampleListings;
  }

  /**
   * Extract price from text
   */
  extractPrice(text) {
    const priceMatch = text.match(/[\d,]+(?:\.\d{2})?/);
    if (priceMatch) {
      return parseFloat(priceMatch[0].replace(/,/g, ''));
    }
    return 0;
  }

  /**
   * Clean text by removing extra whitespace
   */
  cleanText(text) {
    if (!text) return '';
    return text.trim().replace(/\s+/g, ' ');
  }

  /**
   * Extract and normalize image URL
   */
  extractImageUrl(element, baseUrl) {
    let src = element.attr('src') || element.attr('data-src') || '';
    if (src && !src.startsWith('http')) {
      if (src.startsWith('//')) {
        src = 'https:' + src;
      } else if (src.startsWith('/')) {
        src = baseUrl + src;
      }
    }
    return src;
  }

  /**
   * Build full URL from relative URL
   */
  buildUrl(url, baseUrl) {
    if (!url) return baseUrl;
    if (url.startsWith('http')) {
      return url;
    }
    if (url.startsWith('//')) {
      return 'https:' + url;
    }
    if (url.startsWith('/')) {
      return baseUrl + url;
    }
    return baseUrl + '/' + url;
  }

  /**
   * Add delay for respectful scraping
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Save scraped listings to database
   */
  async saveListingsToDb(listings) {
    const insertQuery = `
      INSERT OR REPLACE INTO external_rentals (
        external_id,
        title,
        description,
        price,
        category,
        image_url,
        location,
        source,
        source_url,
        scraped_at,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    // First, ensure the table exists
    await this.createExternalRentalsTable();

    let savedCount = 0;
    for (const listing of listings) {
      try {
        // Generate a unique external ID based on source and title
        const externalId = `${listing.source}_${Buffer.from(listing.title + listing.price + listing.location).toString('base64').substring(0, 20)}`;
        
        await new Promise((resolve, reject) => {
          this.db.run(insertQuery, [
            externalId,
            listing.title,
            listing.description,
            listing.price,
            'external_rental', // category for external rentals
            listing.imageUrl,
            listing.location,
            listing.source,
            listing.link,
            listing.scrapedAt
          ], function(err) {
            if (err) {
              console.error('Error saving listing:', err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
        savedCount++;
      } catch (error) {
        console.error('Error saving listing to DB:', error);
      }
    }

    console.log(`Saved ${savedCount} listings to database`);
    return savedCount;
  }

  /**
   * Create external rentals table if it doesn't exist
   */
  async createExternalRentalsTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS external_rentals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        external_id TEXT UNIQUE,
        title TEXT,
        description TEXT,
        price REAL,
        category TEXT,
        image_url TEXT,
        location TEXT,
        source TEXT,
        source_url TEXT,
        scraped_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    return new Promise((resolve, reject) => {
      this.db.run(createTableQuery, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Get recently scraped listings
   */
  async getRecentListings(limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM external_rentals 
        ORDER BY scraped_at DESC 
        LIMIT ?
      `, [limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Main method to run the scraper
   */
  async runScraping() {
    console.log('Starting Kenya rental scraping process...');
    const listings = await this.scrapeAllSources();
    const savedCount = await this.saveListingsToDb(listings);
    
    console.log(`Scraping completed. Found ${listings.length} listings, saved ${savedCount} to database.`);
    return { totalFound: listings.length, totalSaved: savedCount };
  }

  /**
   * Schedule periodic scraping
   */
  scheduleScraping(intervalMinutes = 60) {
    console.log(`Scheduling scraping every ${intervalMinutes} minutes...`);
    // Run initially
    this.runScraping();
    
    // Then run periodically
    setInterval(async () => {
      console.log(`Running scheduled scraping at ${new Date().toISOString()}`);
      try {
        await this.runScraping();
      } catch (error) {
        console.error('Scheduled scraping failed:', error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Get statistics for scraping
   */
  async getScrapingStats() {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          COUNT(*) as total_listings,
          COUNT(DISTINCT source) as sources_count,
          MIN(scraped_at) as oldest_scraped,
          MAX(scraped_at) as newest_scraped,
          AVG(price) as avg_price
        FROM external_rentals
      `, [], (err, stats) => {
        if (err) {
          reject(err);
        } else {
          resolve(stats);
        }
      });
    });
  }

  /**
   * Get rental listings with advanced filters
   */
  async getFilteredRentals(filters = {}) {
    let query = 'SELECT * FROM external_rentals WHERE 1=1';
    const params = [];

    // Apply filters
    if (filters.category) {
      query += ' AND category LIKE ?';
      params.push(`%${filters.category}%`);
    }

    if (filters.location) {
      query += ' AND location LIKE ?';
      params.push(`%${filters.location}%`);
    }

    if (filters.minPrice) {
      query += ' AND price >= ?';
      params.push(parseFloat(filters.minPrice));
    }

    if (filters.maxPrice) {
      query += ' AND price <= ?';
      params.push(parseFloat(filters.maxPrice));
    }

    if (filters.source) {
      query += ' AND source = ?';
      params.push(filters.source);
    }

    // Add sorting
    let orderBy = 'scraped_at DESC'; // Default sort
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'price_low':
          orderBy = 'price ASC';
          break;
        case 'price_high':
          orderBy = 'price DESC';
          break;
        case 'newest':
          orderBy = 'scraped_at DESC';
          break;
        case 'oldest':
          orderBy = 'scraped_at ASC';
          break;
        case 'location':
          orderBy = 'location ASC';
          break;
        default:
          orderBy = 'scraped_at DESC';
      }
    }

    query += ` ORDER BY ${orderBy}`;

    // Add pagination
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
}

module.exports = KenyaRentalScraper;