const OMDB_API_KEY = '';

// Create right-click context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "add-to-movie-tracker",
    title: "Add '%s' to Movie Tracker",
    contexts: ["selection"]
  });
});

// Listen for context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "add-to-movie-tracker") {
    const selectedText = info.selectionText.trim();
    if (selectedText) {
      searchMovieData(selectedText);
    }
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fetchAndSaveSpecific') {
    fetchAndSaveFullDetails(request.imdbID);
    return true;
  }
});

async function searchMovieData(title) {
  try {
    // First we do a broad search 's=' to get multiple results
    const url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(title)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.Response === 'True') {
      const results = data.Search;

      if (results.length === 1) {
        // Only one match, fetch full details and save
        fetchAndSaveFullDetails(results[0].imdbID);
      } else {
        // Multiple matches found. We need to alert the popup to show a disambiguation modal
        // We save the pending search results temporarily to storage so the popup can read them
        chrome.storage.local.set({ pendingSearch: { title: title, results: results } }, () => {
          // Open the popup if possible (Note: Chrome doesn't allow background to force-open popup usually,
          // but we will show a notification telling them to click the extension)
          chrome.runtime.sendMessage({ action: 'showDisambiguation' }).catch(() => { });

          chrome.notifications?.create({
            type: 'basic',
            iconUrl: 'icons/icon128.png',
            title: 'Multiple Matches Found',
            message: `Found multiple matches for "${title}". Click the Movie Tracker icon to choose!`
          });
        });
      }
    } else {
      console.log('OMDB Error:', data.Error);
      chrome.notifications?.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Movie Not Found',
        message: `Could not find any results for "${title}".`
      });
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

async function fetchAndSaveFullDetails(imdbID) {
  try {
    const url = `https://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbID}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.Response === 'True') {
      const movieInfo = {
        imdbID: data.imdbID,
        title: data.Title,
        year: data.Year,
        poster: data.Poster,
        plot: data.Plot,
        imdbRating: data.imdbRating,
        type: data.Type, // movie or series
        watched: false, // New watch status tracker
        addedAt: Date.now()
      };
      saveMovieDirectly(movieInfo);
    }
  } catch (e) {
    console.error(e);
  }
}

function saveMovieDirectly(movieInfo, sendResponseCallback) {
  chrome.storage.local.get(['watchlist'], (result) => {
    const watchlist = result.watchlist || [];
    // Check if it already exists
    const exists = watchlist.find(m => m.imdbID === movieInfo.imdbID);
    if (!exists) {
      watchlist.unshift(movieInfo); // Add to top
      chrome.storage.local.set({ watchlist }, () => {
        console.log('Saved to watchlist:', movieInfo.title);
        // Notify UI to update if open
        chrome.runtime.sendMessage({ action: 'watchlistUpdated' }).catch(() => { });

        // Show success tick notification
        chrome.notifications?.create({
          type: 'basic',
          iconUrl: movieInfo.poster !== 'N/A' ? movieInfo.poster : 'icons/icon128.png',
          title: '✔ Added to Watchlist',
          message: `${movieInfo.title} (${movieInfo.year}) has been added.`
        });

        if (sendResponseCallback) sendResponseCallback({ success: true, movie: movieInfo });
      });
    } else {
      console.log('Movie already in watchlist.');
      chrome.notifications?.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Already Added',
        message: `${movieInfo.title} is already in your watchlist.`
      });
      if (sendResponseCallback) sendResponseCallback({ success: false, error: 'Already in watchlist' });
    }
  });
}
