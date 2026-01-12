const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const TransactionService = require('../src/plugins/internal/economy/services/TransactionService');
const BalanceService = require('../src/plugins/internal/economy/services/BalanceService');

// Configuration
const DB_PATH = path.join(__dirname, '../database.sqlite');
const TRANSACTION_COUNT = 50;
const CURRENCIES = ['coins', 'gems'];
const TYPES = ['earn', 'spend', 'admin'];
const SOURCES = ['gameplay', 'shop', 'admin_panel', 'daily_reward'];

async function main() {
    console.log('🚀 Starting fake transaction generator...');

    // Connect to DB
    const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('❌ Could not connect to database:', err);
            process.exit(1);
        }
    });

    const transactionService = new TransactionService(db);
    const balanceService = new BalanceService(db); // To ensure balances exist

    try {
        // 1. Get all users
        const users = await new Promise((resolve, reject) => {
            db.all('SELECT id FROM users', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (users.length === 0) {
            console.error('❌ No users found to attach transactions to.');
            process.exit(1);
        }

        console.log(`Found ${users.length} users. Generating ${TRANSACTION_COUNT} transactions...`);

        // 2. Generate Transactions
        for (let i = 0; i < TRANSACTION_COUNT; i++) {
            const user = users[Math.floor(Math.random() * users.length)];
            const currency = CURRENCIES[Math.floor(Math.random() * CURRENCIES.length)];
            const type = TYPES[Math.floor(Math.random() * TYPES.length)];

            let amount = Math.floor(Math.random() * 100) + 1;
            if (type === 'spend') amount = -amount; // Spend is negative? Wait, TransactionService usually takes positive amount + type 'spend' and handles logic?
            // Let's check TransactionService logic.
            // It calculates: newBalance = currentBalance + amount.
            // So for 'spend', amount MUST be negative.
            if (type === 'spend') amount = -Math.abs(amount);

            const transaction = {
                userId: user.id,
                currencyId: currency,
                amount: amount,
                type: type,
                source: SOURCES[Math.floor(Math.random() * SOURCES.length)],
                description: `Fake transaction #${i + 1}`,
                metadata: { generated: true }
            };

            try {
                // Ensure positive balance before spending
                if (amount < 0) {
                    const currentBalance = await balanceService.getBalance(user.id, currency);
                    if (currentBalance + amount < 0) {
                        // console.log(`Skipping spend for user ${user.id} (insufficient funds)`);
                        continue;
                    }
                }

                await transactionService.processTransaction(transaction);
                process.stdout.write('.');
            } catch (err) {
                // Ignore concurrent modification or insufficient funds errors occasionally
                // console.warn('Failed tx:', err.message);
            }
        }

        console.log('\n✅ Successfully generated fake transactions!');

    } catch (error) {
        console.error('\n❌ Error:', error);
    } finally {
        db.close();
    }
}

main();
