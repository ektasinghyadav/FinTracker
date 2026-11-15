// Seed script: creates ONE demo user with about 3 months of sample expenses,
// so the charts, forecast, insights and AI summary have data to show.
//
// Run it from the project folder:   node scripts/seed.js
// Running it again resets the demo user (it never creates duplicates).
// It only touches the demo user below, never anyone else's data.

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../server/models/User');
const Expense = require('../server/models/Expense');
const Budget = require('../server/models/Budget');

const DEMO_EMAIL = 'demo@fintracker.test';
const DEMO_PASSWORD = 'demo1234';
const DEMO_BUDGET = 20000;

// Each line is: [months ago, day of month, description, amount, category]
// "0" means the current month. Days after today are moved back to today,
// so we never create expenses in the future.
const SAMPLE_EXPENSES = [
    // Current month
    [0, 1,  'Rent share',            6000, 'Bills & Utilities'],
    [0, 2,  'Groceries',              850, 'Food & Dining'],
    [0, 3,  'Metro card recharge',    500, 'Transportation'],
    [0, 5,  'Dinner with friends',   1200, 'Food & Dining'],
    [0, 7,  'Electricity bill',      1800, 'Bills & Utilities'],
    [0, 9,  'Online course',         2500, 'Education'],
    [0, 11, 'Headphones',            4500, 'Shopping'],   // big purchase: good for the "anomaly" insight
    [0, 12, 'Cinema tickets',         700, 'Entertainment'],
    [0, 14, 'Pharmacy',               420, 'Healthcare'],
    [0, 15, 'Lunch',                  250, 'Food & Dining'],

    // One month ago
    [1, 1,  'Rent share',            6000, 'Bills & Utilities'],
    [1, 3,  'Groceries',             1100, 'Food & Dining'],
    [1, 6,  'Bus pass',               600, 'Transportation'],
    [1, 8,  'Electricity bill',      1650, 'Bills & Utilities'],
    [1, 10, 'Restaurant',            1500, 'Food & Dining'],
    [1, 14, 'Books',                  900, 'Education'],
    [1, 18, 'Shoes',                 2200, 'Shopping'],
    [1, 21, 'Concert',               1800, 'Entertainment'],
    [1, 25, 'Doctor visit',           800, 'Healthcare'],
    [1, 28, 'Groceries',              950, 'Food & Dining'],

    // Two months ago
    [2, 1,  'Rent share',            6000, 'Bills & Utilities'],
    [2, 4,  'Groceries',              900, 'Food & Dining'],
    [2, 7,  'Cab rides',              700, 'Transportation'],
    [2, 9,  'Electricity bill',      1500, 'Bills & Utilities'],
    [2, 13, 'Takeaway',               650, 'Food & Dining'],
    [2, 17, 'Jacket',                3000, 'Shopping'],
    [2, 22, 'Movie night',            600, 'Entertainment'],
    [2, 26, 'Stationery',             350, 'Education']
];

// Turn year, month (0-11) and day into "YYYY-MM-DD" (the format the app stores)
function makeDate(year, monthIndex, day) {
    const mm = String(monthIndex + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
}

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);

    // Step 1: remove the old demo user and its data (if it exists)
    const old = await User.findOne({ email: DEMO_EMAIL });
    if (old) {
        await Expense.deleteMany({ userId: old._id });
        await Budget.deleteMany({ userId: old._id });
        await User.deleteOne({ _id: old._id });
    }

    // Step 2: create the demo user (password is hashed, same as real sign-ups)
    const hashed = await bcrypt.hash(DEMO_PASSWORD, 12);
    const user = await User.create({ name: 'Demo User', email: DEMO_EMAIL, password: hashed });

    // Step 3: create the expenses
    const today = new Date();
    const rows = SAMPLE_EXPENSES.map(([monthsAgo, day, name, amount, category]) => {
        const first = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
        // keep the current month's days from going past today
        const safeDay = monthsAgo === 0 ? Math.min(day, today.getDate()) : day;
        const date = makeDate(first.getFullYear(), first.getMonth(), safeDay);
        return {
            userId: user._id,
            name,
            amount,
            category,
            date,
            // noon on that day, so newest-first sorting follows the date
            timestamp: new Date(`${date}T12:00:00`).getTime()
        };
    });
    await Expense.insertMany(rows);

    // Step 4: set the monthly budget
    await Budget.create({ userId: user._id, amount: DEMO_BUDGET });

    console.log(`Demo user ready: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
    console.log(`Added ${rows.length} expenses and a budget of ${DEMO_BUDGET}.`);
}

seed()
    .catch(err => {
        console.error('Seeding failed:', err.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
