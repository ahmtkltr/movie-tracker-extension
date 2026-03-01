document.addEventListener('DOMContentLoaded', () => {
    const listsWrapper = document.getElementById('lists-wrapper');
    const unwatchedContainer = document.getElementById('unwatched-container');
    const watchedContainer = document.getElementById('watched-container');
    const unwatchedTitle = document.getElementById('unwatched-title');
    const watchedTitle = document.getElementById('watched-title');
    const emptyState = document.getElementById('empty-state');
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const errorMessage = document.getElementById('error-message');

    // Search Modal
    const searchModal = document.getElementById('search-modal');
    const searchResultsList = document.getElementById('search-results-list');
    const searchQueryText = document.getElementById('search-query-text');

    // View Toggles
    const viewCardsBtn = document.getElementById('view-cards-btn');
    const viewListBtn = document.getElementById('view-list-btn');

    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    let currentFilter = 'all';

    // Default view state from localStorage or default to 'cards'
    let currentView = localStorage.getItem('movieTrackerView') || 'cards';
    applyViewMode(currentView);

    viewCardsBtn.addEventListener('click', () => applyViewMode('cards'));
    viewListBtn.addEventListener('click', () => applyViewMode('list'));

    function applyViewMode(mode) {
        currentView = mode;
        localStorage.setItem('movieTrackerView', mode);

        if (mode === 'cards') {
            viewCardsBtn.classList.add('active');
            viewListBtn.classList.remove('active');
            unwatchedContainer.classList.add('cards-view');
            unwatchedContainer.classList.remove('list-view');
            watchedContainer.classList.add('cards-view');
            watchedContainer.classList.remove('list-view');
        } else {
            viewListBtn.classList.add('active');
            viewCardsBtn.classList.remove('active');
            unwatchedContainer.classList.add('list-view');
            unwatchedContainer.classList.remove('cards-view');
            watchedContainer.classList.add('list-view');
            watchedContainer.classList.remove('cards-view');
        }
    }

    // Tab Logic
    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            tabBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.getAttribute('data-filter');
            loadWatchlist();
        });
    });

    // CSV Export Watchlist
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            chrome.storage.local.get(['watchlist'], (result) => {
                const watchlist = result.watchlist || [];
                if (watchlist.length === 0) {
                    alert("Watchlist is empty!");
                    return;
                }

                // CSV Header with UTF-8 BOM for Excel
                let csvContent = "\uFEFFStatus,Title,Year,Type,IMDB_Rating,Plot,IMDB_Link\n";

                // Sort so unwatched is first
                const sortedWatchlist = [...watchlist].sort((a, b) => (a.watched === b.watched) ? 0 : a.watched ? 1 : -1);

                sortedWatchlist.forEach(movie => {
                    // Escape commas and quotes for CSV formatting
                    const status = `"${movie.watched ? 'Watched' : 'To Watch'}"`;
                    const title = `"${(movie.title || '').replace(/"/g, '""')}"`;
                    const year = `"${(movie.year || '').replace(/"/g, '""')}"`;
                    const type = `"${(movie.type || '').replace(/"/g, '""')}"`;
                    const rating = `"${(movie.imdbRating !== 'N/A' ? movie.imdbRating : '')}"`;
                    const plot = `"${(movie.plot || '').replace(/"/g, '""')}"`;
                    const link = `"https://www.imdb.com/title/${movie.imdbID}"`;

                    csvContent += `${status},${title},${year},${type},${rating},${plot},${link}\n`;
                });

                // Create CSV Download link
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", url);
                downloadAnchorNode.setAttribute("download", "movie_tracker_watchlist.csv");
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
                URL.revokeObjectURL(url);
                URL.revokeObjectURL(url);
            });
        });
    }

    // Email Export Watchlist via EmailJS
    const emailBtn = document.getElementById('export-email-btn');
    if (emailBtn) {
        emailBtn.addEventListener('click', () => {
            chrome.storage.local.get(['watchlist', 'defaultExportEmail', 'emailjsPublicKey', 'emailjsServiceId', 'emailjsTemplateId'], (result) => {
                const watchlist = result.watchlist || [];
                const defaultEmail = result.defaultExportEmail || '';
                const pubKey = result.emailjsPublicKey || '';
                const serviceId = result.emailjsServiceId || '';
                const templateId = result.emailjsTemplateId || '';

                if (watchlist.length === 0) {
                    alert("Watchlist is empty!");
                    return;
                }

                if (!pubKey || !serviceId || !templateId) {
                    alert("EmailJS is not configured! Please open Settings (⚙️) to enter your credentials or use the default mail app.");
                    // Fallback to mailto if they haven't set up EmailJS but have a default email? 
                    // Let's just enforce Settings for built-in text per the prompt goal.

                    // Fallback to old behavior:
                    let emailBody = "My Watchlist:\n\n";
                    watchlist.forEach(movie => {
                        emailBody += `- ${movie.title} (${movie.year}) [${movie.type}]\n`;
                        emailBody += `  IMDB: https://www.imdb.com/title/${movie.imdbID}\n\n`;
                    });
                    const subject = encodeURIComponent("My Movie Tracker Watchlist");
                    const body = encodeURIComponent(emailBody);
                    const anchor = document.createElement('a');
                    anchor.href = `mailto:${encodeURIComponent(defaultEmail)}?subject=${subject}&body=${body}`;
                    anchor.click();
                    return;
                }

                if (!defaultEmail) {
                    alert("Please specify a recipient email in Settings (⚙️).");
                    return;
                }

                // Prepare EmailJS Data with a professional HTML table (Excel-like layout)
                let htmlList = `
                    <div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto;">
                        <h2 style="color: #0d1117;">Movie Tracker Watchlist</h2>
                        <p style="font-size: 14px; color: #555;">Here is your requested movie and series watchlist (presented in the table below):</p>
                `;

                const unwatched = watchlist.filter(m => !m.watched);
                const watched = watchlist.filter(m => m.watched);

                if (unwatched.length > 0) {
                    htmlList += `
                        <h3 style="color: #2f81f7; margin-top: 24px;">🍿 To Watch</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #dee2e6;">
                            <thead style="background-color: #f8f9fa;">
                                <tr style="border-bottom: 2px solid #dee2e6;">
                                    <th style="padding: 12px; text-align: left; font-size: 14px;">Title</th>
                                    <th style="padding: 12px; text-align: left; font-size: 14px;">Year</th>
                                    <th style="padding: 12px; text-align: left; font-size: 14px;">Type</th>
                                    <th style="padding: 12px; text-align: center; font-size: 14px;">Rating</th>
                                    <th style="padding: 12px; text-align: left; font-size: 14px;">Link</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    unwatched.forEach((movie) => {
                        const rating = movie.imdbRating !== 'N/A' && movie.imdbRating ? movie.imdbRating : '-';
                        htmlList += `
                                    <tr style="border-bottom: 1px solid #dee2e6;">
                                        <td style="padding: 12px; font-size: 14px;"><strong>${movie.title}</strong></td>
                                        <td style="padding: 12px; font-size: 14px; color: #555;">${movie.year}</td>
                                        <td style="padding: 12px; font-size: 14px; text-transform: capitalize; color: #555;">${movie.type}</td>
                                        <td style="padding: 12px; font-size: 14px; text-align: center; font-weight: bold; color: #238636;">${rating}</td>
                                        <td style="padding: 12px; font-size: 14px;"><a href="https://www.imdb.com/title/${movie.imdbID}" style="color: #2f81f7; text-decoration: none;">📄 IMDB</a></td>
                                    </tr>
                        `;
                    });
                    htmlList += `</tbody></table>`;
                }

                if (watched.length > 0) {
                    htmlList += `
                        <h3 style="color: #238636; margin-top: 32px;">✅ Watched</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 10px; border: 1px solid #dee2e6;">
                            <thead style="background-color: #f8f9fa;">
                                <tr style="border-bottom: 2px solid #dee2e6;">
                                    <th style="padding: 12px; text-align: left; font-size: 14px;">Title</th>
                                    <th style="padding: 12px; text-align: left; font-size: 14px;">Year</th>
                                    <th style="padding: 12px; text-align: left; font-size: 14px;">Type</th>
                                    <th style="padding: 12px; text-align: center; font-size: 14px;">Rating</th>
                                    <th style="padding: 12px; text-align: left; font-size: 14px;">Link</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    watched.forEach((movie) => {
                        const rating = movie.imdbRating !== 'N/A' && movie.imdbRating ? movie.imdbRating : '-';
                        htmlList += `
                                    <tr style="border-bottom: 1px solid #dee2e6; background-color: #f6f8fa;">
                                        <td style="padding: 12px; font-size: 14px; text-decoration: line-through; color: #555;"><strong>${movie.title}</strong></td>
                                        <td style="padding: 12px; font-size: 14px; color: #888;">${movie.year}</td>
                                        <td style="padding: 12px; font-size: 14px; text-transform: capitalize; color: #888;">${movie.type}</td>
                                        <td style="padding: 12px; font-size: 14px; text-align: center; font-weight: bold; color: #666;">${rating}</td>
                                        <td style="padding: 12px; font-size: 14px;"><a href="https://www.imdb.com/title/${movie.imdbID}" style="color: #2f81f7; text-decoration: none;">📄 IMDB</a></td>
                                    </tr>
                        `;
                    });
                    htmlList += `</tbody></table>`;
                }

                htmlList += `
                        <p style="font-size: 12px; color: #888; margin-top: 20px;">Sent via Movie Tracker Chrome Extension</p>
                    </div>
                `;

                // IMPORTANT: For EmailJS to render HTML correctly, ensure your EmailJS template uses {{{message}}} (three curly braces)
                // for the message variable, not {{message}} (two curly braces).
                const templateParams = {
                    to_email: defaultEmail,
                    message: htmlList,
                    reply_to: defaultEmail
                };

                const data = {
                    service_id: serviceId,
                    template_id: templateId,
                    user_id: pubKey,
                    template_params: templateParams
                };

                // Send 
                emailBtn.innerHTML = 'Sending...';
                emailBtn.disabled = true;

                fetch('https://api.emailjs.com/api/v1.0/email/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                })
                    .then(response => {
                        if (response.ok) {
                            emailBtn.innerHTML = 'Sent! ✔';
                            // Show native Chrome Notification
                            chrome.notifications.create({
                                type: 'basic',
                                iconUrl: 'icons/icon48.png',
                                title: 'Email Sent!',
                                message: 'Your watchlist has been successfully sent via email.'
                            });

                            setTimeout(() => {
                                emailBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> Email';
                                emailBtn.disabled = false;
                            }, 2000);
                        } else {
                            response.text().then(text => {
                                alert("Failed to send email: " + text);
                                emailBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> Email';
                                emailBtn.disabled = false;
                            });
                        }
                    })
                    .catch((error) => {
                        alert("Network Error: " + error.message);
                        emailBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> Email';
                        emailBtn.disabled = false;
                    });
            });
        });
    }

    // Open Settings Page
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage().catch(() => {
                    window.open(chrome.runtime.getURL('options.html'));
                });
            } else {
                window.open(chrome.runtime.getURL('options.html'));
            }
        });
    }

    document.getElementById('dismiss-error-btn').addEventListener('click', () => {
        loadWatchlist(); // Reset view
    });

    document.getElementById('close-modal-btn').addEventListener('click', () => {
        searchModal.classList.add('hidden');
        chrome.storage.local.remove(['pendingSearch']); // clear it
    });

    function showError(msg) {
        errorMessage.textContent = msg;
        setUIState('error');
    }

    function setUIState(state) {
        emptyState.classList.add('hidden');
        loadingState.classList.add('hidden');
        errorState.classList.add('hidden');
        listsWrapper.classList.add('hidden');

        if (state === 'loading') loadingState.classList.remove('hidden');
        else if (state === 'error') errorState.classList.remove('hidden');
        else if (state === 'empty') emptyState.classList.remove('hidden');
        else if (state === 'list') {
            listsWrapper.classList.remove('hidden');
            applyViewMode(currentView);
        }
    }

    function createMovieCard(movie) {
        const li = document.createElement('li');
        li.className = 'movie-card';

        const posterUrl = movie.poster !== 'N/A' && movie.poster ? movie.poster : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="120" style="background:%23222"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="24">No Img</text></svg>';
        const imdbUrl = `https://www.imdb.com/title/${movie.imdbID}/`;

        // Use inline opacity style for watched items to make them look faded
        const opacityStyle = movie.watched ? 'opacity: 0.6;' : '';

        li.innerHTML = `
            <div class="poster-wrapper" style="${opacityStyle}">
                <img src="${posterUrl}" alt="${movie.title} poster" loading="lazy">
            </div>
            <div class="movie-info" style="${opacityStyle}">
                <div class="movie-header">
                    <a href="${imdbUrl}" target="_blank" class="movie-title imdb-link" title="View on IMDB" style="${movie.watched ? 'text-decoration: line-through;' : ''}">${movie.title}</a>
                    <button class="btn icon-btn delete-btn" data-id="${movie.imdbID}" title="Remove">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                </div>
                <div class="movie-meta">
                    <span>${movie.year}</span>
                    <span class="dot-separator">•</span>
                    <span style="text-transform: capitalize;">${movie.type}</span>
                    ${movie.imdbRating !== 'N/A' && movie.imdbRating ? `
                        <span class="dot-separator">•</span>
                        <div class="rating">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            ${movie.imdbRating}
                        </div>
                    ` : ''}
                </div>
                <p class="plot" title="${movie.plot || ''}">${movie.plot !== 'N/A' && movie.plot ? movie.plot : ''}</p>
                <div style="margin-top:auto; padding-top:8px;">
                     <button class="watch-btn ${movie.watched ? 'watched' : ''}" data-id="${movie.imdbID}">
                         ${movie.watched ?
                '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg> Watched' :
                '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> Mark as Watched'}
                     </button>
                </div>
            </div>
        `;

        li.querySelector('.delete-btn').addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            removeMovie(id);
        });

        li.querySelector('.watch-btn').addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            toggleWatched(id);
        });

        return li;
    }

    // Render Watchlist
    function loadWatchlist() {
        chrome.storage.local.get(['watchlist'], (result) => {
            let watchlist = result.watchlist || [];

            // Apply filtering
            if (currentFilter !== 'all') {
                watchlist = watchlist.filter(m => m.type === currentFilter);
            }

            if (watchlist.length === 0) {
                setUIState('empty');
                return;
            }

            unwatchedContainer.innerHTML = '';
            watchedContainer.innerHTML = '';

            const unwatched = watchlist.filter(m => !m.watched);
            const watched = watchlist.filter(m => m.watched);

            if (unwatched.length === 0) {
                unwatchedTitle.style.display = 'none';
                unwatchedContainer.style.display = 'none';
            } else {
                unwatchedTitle.style.display = 'block';
                unwatchedContainer.style.display = 'grid'; // will be overridden by applyViewMode if needed
                unwatched.forEach(movie => {
                    unwatchedContainer.appendChild(createMovieCard(movie));
                });
            }

            if (watched.length === 0) {
                watchedTitle.style.display = 'none';
                watchedContainer.style.display = 'none';
            } else {
                watchedTitle.style.display = 'block';
                watchedContainer.style.display = 'grid';
                watched.forEach(movie => {
                    watchedContainer.appendChild(createMovieCard(movie));
                });
            }

            setUIState('list');
        });
    }

    function removeMovie(id) {
        chrome.storage.local.get(['watchlist'], (result) => {
            let watchlist = result.watchlist || [];
            watchlist = watchlist.filter(m => m.imdbID !== id);
            chrome.storage.local.set({ watchlist }, () => {
                loadWatchlist();
            });
        });
    }

    function toggleWatched(id) {
        chrome.storage.local.get(['watchlist'], (result) => {
            let watchlist = result.watchlist || [];
            const index = watchlist.findIndex(m => m.imdbID === id);
            if (index !== -1) {
                watchlist[index].watched = !watchlist[index].watched;
                chrome.storage.local.set({ watchlist }, () => {
                    loadWatchlist();
                });
            }
        });
    }

    // Check for pending search disambiguation modal
    function checkPendingSearch() {
        chrome.storage.local.get(['pendingSearch'], (result) => {
            if (result.pendingSearch && result.pendingSearch.results) {
                showDisambiguationModal(result.pendingSearch);
            }
        });
    }

    function showDisambiguationModal(searchData) {
        searchQueryText.textContent = `Multiple matches for "${searchData.title}". Please choose one:`;
        searchResultsList.innerHTML = '';

        searchData.results.forEach(movie => {
            const li = document.createElement('li');
            li.className = 'movie-card';

            const posterUrl = movie.Poster !== 'N/A' && movie.Poster ? movie.Poster : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="75" style="background:%23222"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="14">No Img</text></svg>';

            li.innerHTML = `
                <div class="poster-wrapper">
                    <img src="${posterUrl}" alt="${movie.Title} poster" loading="lazy">
                </div>
                <div class="movie-info">
                    <div class="movie-header">
                        <h2 class="movie-title">${movie.Title}</h2>
                    </div>
                    <div class="movie-meta">
                        <span>${movie.Year}</span>
                        <span class="dot-separator">•</span>
                        <span style="text-transform: capitalize;">${movie.Type}</span>
                    </div>
                </div>
            `;

            // When clicked, ask background to fetch full details and save
            li.addEventListener('click', () => {
                searchModal.classList.add('hidden');
                setUIState('loading');
                chrome.storage.local.remove(['pendingSearch']); // clear stored state

                // Fetch full details and save using a new background trick or direct popup logic
                // Since popup is open, we can just message background to save it by sending IMDb ID
                chrome.runtime.sendMessage({ action: 'fetchAndSaveSpecific', imdbID: movie.imdbID });
            });

            searchResultsList.appendChild(li);
        });

        searchModal.classList.remove('hidden');
    }

    // Listen for updates from background
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === 'watchlistUpdated') {
            loadWatchlist();
        } else if (request.action === 'showDisambiguation') {
            checkPendingSearch();
        } else if (request.action === 'omdbError') {
            showError("OMDB Error: " + request.error);
        }
    });

    // Initial load
    loadWatchlist();
    checkPendingSearch();
});
