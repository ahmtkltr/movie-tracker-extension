# Movie Tracker - Chrome Extension 🍿✅

A premium, fast, and feature-rich Chrome Extension that instantly looks up movies and TV shows from OMDB and saves them to a beautifully designed, dark-mode Watchlist. 

Track your movies, easily mark them as watched, and export the entire list to Excel CSV or email!

## ✨ Features
* **Smart OMDB Search:** Simply highlight any movie name on a website, right-click, and hit "Add to Movie Tracker" to fetch details, poster, year, and plot.
* **Organized Watchlist:** Automatically sorts films into a "🍿 To Watch" and a faded "✅ Watched" section so you can keep track of what you've finished.
* **Filter by Type:** Switch between viewing *All*, *Movies*, or *Series*.
* **Advanced Exports:**
  * **Email:** Sends a professionally styled HTML table (mimicking an Excel document) via EmailJS silently in the background.
  * **Excel-ready CSV:** Advanced export with UTC-8 support separating Watched and To-Watch items seamlessly in a downloaded file.
* **Settings Page:** Fully adjustable recipient emails and custom EmailJS API connections.

## 🚀 Installation Guide

Since this extension is not on the Chrome Web Store (yet), you can easily install it on your browser using "Developer Mode".

1. **Download the Code:**
   * Click the green **Code** button at the top of this repository.
   * Select **Download ZIP**.
   * Extract the `.zip` file into a folder on your computer.

2. **Load the Extension into Chrome:**
   * Open Google Chrome.
   * Type \`chrome://extensions/\` into your browser's address bar and hit Enter.
   * In the top-right corner, turn on **Developer mode**.
   * Click the **Load unpacked** button that appears in the top-left corner.
   * Select the unzipped folder you created in Step 1.

3. **Pin and Use!**
   * Click the puzzle piece icon next to your Chrome profile picture.
   * Find **Movie Tracker** and click the pin icon to keep it visible on your toolbar.

## ⚙️ Setting Up Email Exports (Optional)

If you want the "Email" export button to work, you will need your own free [EmailJS](https://www.emailjs.com/) account.
1. Sign up for a free EmailJS account.
2. In the EmailJS dashboard, add a new Email Service (e.g. Gmail) to get a **Service ID**.
3. Create an Email Template. 
   > **Note:** Be sure to put \`{{{message}}}\` (with exactly 3 curly braces!) in your EmailJS template box so the HTML Excel Tables render beautifully!
   Note your **Template ID**.
4. In the Account tab, find your **Public Key**.
5. Right-click the Movie Tracker icon in Chrome and click **Options**.
6. Fill in your default recipient email and your three EmailJS IDs and hit Save.

## 🔑 OMDB API Setup (Required)
Since this extension fetches live data from OMDB, you need to provide your own free API Key for it to work.

1. Go to [OMDB API website](https://www.omdbapi.com/apikey.aspx) and sign up for a FREE API Key.
2. Open the downloaded extension folder.
3. Open [background.js] in any text editor (like Notepad or VS Code).
4. On **Line 1**, replace the empty string with your new API key:
   `const OMDB_API_KEY = 'YOUR_API_KEY_HERE';`
5. Save the file and load the extension into Chrome.

## 🛠️ Built With
* HTML / CSS / Vanilla JavaScript
* Manifest V3 Chrome Extension architecture
* OMDB API
* EmailJS REST API

## 📝 License
This project is open-source and available under the [MIT License](LICENSE).


