# FinanceFlow - Personal Expense Tracker

A personal finance tracking web application built with vanilla JavaScript, HTML, and CSS. This project helps you track your expenses, set budgets, and visualize your spending patterns.

## 🌟 Features

- **Expense Management**: Add, view, and delete expenses with categories
- **Budget Tracking**: Set monthly budgets with real-time alerts
- **Visual Analytics**: 
  - Budget Breakdown Chart - shows how your budget is divided across categories with remaining budget
  - Daily Spending Trend - bar chart showing expenses for the last 7 days
- **Smart Filtering**: Filter expenses by category and time period
- **Data Persistence**: Everything is saved in your browser's localStorage
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Indian Currency**: All amounts in ₹ (Rupees)

## 🚀 Live Demo

[View Live Demo](#) *(will add deployment link here)*

## 📸 Screenshots

*Screenshots coming soon*

## 🛠️ Technologies Used

- HTML5
- CSS3 (Grid, Flexbox, CSS Variables)
- Vanilla JavaScript (ES6)
- Chart.js for data visualization
- LocalStorage API

## 📦 Installation

1. Clone this repository
   ```bash
   git clone https://github.com/yourusername/financeflow.git
   ```

2. Open `index.html` in your browser
   - That's it! No installation or build process needed

3. Or run a local server:
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node
   npx http-server
   ```

## 🎯 How to Use

1. **Set Budget**: Enter your monthly budget in the Budget section and click "Set Budget"
2. **Add Expenses**: Fill in the expense details (name, amount, category, date) and click "Add Expense"
3. **View Analytics**: Check the charts to see your spending breakdown and trends
4. **Filter Data**: Use the dropdown filters to view specific time periods or categories
5. **Track Progress**: Watch the header stats update as you add expenses

## 📁 Project Structure

```
financeflow/
├── index.html      # Main HTML file
├── styles.css      # All CSS styling
├── app.js          # JavaScript logic
└── README.md       # Documentation
```

## 🎨 Features Details

### Expense Categories
- Food & Dining
- Transportation
- Shopping
- Entertainment
- Bills & Utilities
- Healthcare
- Education
- Other

### Budget Alerts
The app shows different alerts based on your budget usage:
- ✅ Green: Under 75% of budget used
- ⚠️ Yellow: 75-90% of budget used
- 🚨 Red: Over 90% or budget exceeded

### Charts
- **Budget Breakdown**: Pie chart showing spending by category, plus remaining budget in gray
- **Daily Spending**: Bar chart showing spending for each of the last 7 days

## 🚀 Deployment

### GitHub Pages (Free & Easy)
1. Push your code to GitHub
2. Go to Settings → Pages
3. Select main branch as source
4. Your site will be live at `https://yourusername.github.io/financeflow`

### Netlify
1. Go to netlify.com and create account
2. Drag and drop your project folder
3. Done! You'll get a live URL

## 🔧 Customization

You can easily customize the colors by editing the CSS variables in `styles.css`:

```css
:root {
    --color-primary: #0A2342;
    --color-secondary: #2E8B57;
    --color-accent: #E07A5F;
    /* change these to your preferred colors */
}
```

To add more categories, update the `categoryColors` object in `app.js` and add options in the HTML select elements.

## 💡 Future Plans

Things I want to add in the future:
- [ ] Edit functionality for expenses
- [ ] Export data to CSV
- [ ] Multiple budget periods (weekly, yearly)
- [ ] Income tracking
- [ ] Dark mode
- [ ] Recurring expenses

## 🐛 Issues

If you find any bugs, please open an issue on GitHub!

## 📝 What I Learned

Building this project helped me learn:
- DOM manipulation and event handling in JavaScript
- Working with localStorage for data persistence
- Using Chart.js library for visualizations
- CSS Grid and Flexbox for responsive layouts
- Implementing filters and data processing
- Budget calculation and percentage-based alerts
- Working with dates in JavaScript

## 🤝 Contributing

Feel free to fork this project and submit pull requests! Any improvements are welcome.

## 📄 License

This project is open source and available under the MIT License.

## 👤 Author

**Ekta**
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Ekta](https://linkedin.com/in/yourprofile)

## 🙏 Acknowledgments

- Chart.js for the awesome charting library
- Google Fonts for Playfair Display and DM Sans fonts
- Inspired by various finance apps and expense trackers

---

Made with ❤️ by Ekta

⭐ If you found this helpful, consider giving it a star!

## 📧 Contact

Have questions or suggestions? Feel free to reach out or open an issue!
