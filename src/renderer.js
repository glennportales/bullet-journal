const tabs = document.querySelectorAll('.tabs button');
const views = document.querySelectorAll('.view');
const entryDate = document.querySelector('#entry-date');
const entryType = document.querySelector('#entry-type');
const entryTags = document.querySelector('#entry-tags');
const entryContent = document.querySelector('#entry-content');
const addEntryButton = document.querySelector('#add-entry');
const dailyView = document.querySelector('#daily-view');
const monthlyView = document.querySelector('#monthly-view');
const collectionsView = document.querySelector('#collections-view');
const trackersView = document.querySelector('#trackers-view');
const indexList = document.querySelector('#index-list');
const searchInput = document.querySelector('#search');
const addCollectionButton = document.querySelector('#add-collection');
const collectionNameInput = document.querySelector('#collection-name');
const collectionList = document.querySelector('#collection-list');
const trackerList = document.querySelector('#tracker-list');
const trackerNameInput = document.querySelector('#tracker-name');
const trackerTypeSelect = document.querySelector('#tracker-type');
const trackerUnitInput = document.querySelector('#tracker-unit');
const addTrackerButton = document.querySelector('#add-tracker');
const exportButton = document.querySelector('#export');

function formatDate(date) {
  return new Date(date + 'T00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

function statusLabel(status) {
  switch (status) {
    case 'open':
      return '•';
    case 'done':
      return '✔';
    case 'migrated_forward':
      return '→';
    case 'migrated_backward':
      return '←';
    case 'canceled':
      return '✘';
    default:
      return '•';
  }
}

function tagList(tags) {
  if (!tags) return '';
  return tags
    .split(',')
    .map((tag) => `<span class="tag">#${tag.trim()}</span>`)
    .join(' ');
}

async function loadDailyView() {
  const today = entryDate.value;
  const entries = await window.journal.listEntries({ date: today });
  dailyView.innerHTML = entries
    .map(
      (entry) => `
        <article class="entry-card" data-id="${entry.id}">
          <div class="entry-header">
            <div class="entry-meta">
              <span>${statusLabel(entry.status)}</span>
              <span>${entry.type.toUpperCase()}</span>
              <span>${formatDate(entry.date)}</span>
            </div>
            <div class="status-buttons">
              <button data-status="done">✔</button>
              <button data-status="migrated_forward">→</button>
              <button data-status="migrated_backward">←</button>
              <button data-status="canceled">✘</button>
            </div>
          </div>
          <p class="note-content">${entry.content}</p>
          <div>${tagList(entry.tags)}</div>
        </article>
      `
    )
    .join('');
}

async function loadMonthlyView() {
  const month = entryDate.value.slice(0, 7);
  const entries = await window.journal.listEntries({ month });
  const grouped = entries.reduce((acc, entry) => {
    (acc[entry.date] = acc[entry.date] || []).push(entry);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort((a, b) => (a > b ? -1 : 1));
  monthlyView.innerHTML = dates
    .map((date) => {
      const items = grouped[date]
        .map(
          (entry) => `
            <div class="entry-card" data-id="${entry.id}">
              <div class="entry-meta">
                <span>${statusLabel(entry.status)}</span>
                <span>${entry.type.toUpperCase()}</span>
                <span>${formatDate(entry.date)}</span>
              </div>
              <p class="note-content">${entry.content}</p>
              <div>${tagList(entry.tags)}</div>
            </div>
          `
        )
        .join('');
      return `
        <section class="collection-card">
          <header class="entry-meta">
            <strong>${formatDate(date)}</strong>
            <span>${grouped[date].length} entries</span>
          </header>
          ${items}
        </section>
      `;
    })
    .join('');
}

async function loadIndex(query = '') {
  const entries = await window.journal.listEntries({ query });
  indexList.innerHTML = entries
    .slice(0, 50)
    .map(
      (entry) => `
        <li data-id="${entry.id}">
          <div><strong>${entry.type}</strong> – ${entry.content.slice(0, 80)}</div>
          <small>${entry.date}</small>
        </li>
      `
    )
    .join('');
}

async function loadCollections() {
  const collections = await window.journal.listCollections();
  const listMarkup = collections
    .map((collection) => `<li data-id="${collection.id}">${collection.name}</li>`)
    .join('');
  collectionList.innerHTML = listMarkup || '<li>No collections yet</li>';

  const cards = await Promise.all(
    collections.map(async (collection) => {
      const entries = await window.journal.getCollectionEntries(collection.id);
      const items = entries
        .map(
          (entry) => `
            <div class="entry-card">
              <div class="entry-meta">
                <span>${statusLabel(entry.status)}</span>
                <span>${entry.type.toUpperCase()}</span>
                <span>${formatDate(entry.date)}</span>
              </div>
              <p class="note-content">${entry.content}</p>
              <div>${tagList(entry.tags)}</div>
            </div>
          `
        )
        .join('');
      return `
        <article class="collection-card">
          <header class="entry-header">
            <h3>${collection.name}</h3>
            <span>${entries.length} entries</span>
          </header>
          ${items || '<p>No entries yet.</p>'}
        </article>
      `;
    })
  );

  collectionsView.innerHTML = cards.join('');
}

async function loadTrackers() {
  const trackers = await window.journal.listTrackers();
  trackerList.innerHTML = trackers
    .map((tracker) => `<li data-id="${tracker.id}">${tracker.name}</li>`)
    .join('');

  const cards = await Promise.all(
    trackers.map(async (tracker) => {
      const values = await window.journal.getTrackerValues(tracker.id);
      const inputs =
        tracker.type === 'boolean'
          ? `<select data-role="value">
                <option value="yes">Completed</option>
                <option value="no">Skipped</option>
             </select>`
          : `<input type="number" step="any" placeholder="Value${tracker.unit ? ` (${tracker.unit})` : ''}" data-role="value" />`;

      const valuesMarkup = values
        .map((value) => `<div>${value.date}: ${value.value}${tracker.unit ? ` ${tracker.unit}` : ''}</div>`)
        .join('');

      return `
        <article class="tracker-card" data-id="${tracker.id}" data-type="${tracker.type}">
          <header class="entry-header">
            <h3>${tracker.name}</h3>
            <span>${tracker.type === 'boolean' ? 'Habit' : 'Numeric'}${
        tracker.unit ? ` · ${tracker.unit}` : ''
      }</span>
          </header>
          <div class="tracker-log">
            <input type="date" data-role="date" />
            ${inputs}
            <button data-role="log">Log</button>
          </div>
          <div class="tracker-values">${valuesMarkup || '<p>No logs yet.</p>'}</div>
        </article>
      `;
    })
  );

  trackersView.innerHTML = cards.join('');
}

async function refreshAll() {
  await Promise.all([loadDailyView(), loadMonthlyView(), loadIndex(searchInput.value), loadCollections(), loadTrackers()]);
}

function setToday() {
  const today = new Date().toISOString().split('T')[0];
  entryDate.value = today;
}

async function handleAddEntry() {
  const content = entryContent.value.trim();
  if (!content) return;

  await window.journal.createEntry({
    type: entryType.value,
    date: entryDate.value,
    tags: entryTags.value,
    content
  });

  entryContent.value = '';
  await refreshAll();
}

function switchView(targetView) {
  views.forEach((view) => view.classList.toggle('hidden', view.id !== `${targetView}-view`));
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.view === targetView));
}

function handleEntryAction(event) {
  const statusButton = event.target.closest('button[data-status]');
  if (!statusButton) return;

  const article = event.target.closest('[data-id]');
  if (!article) return;

  const id = Number(article.dataset.id);
  const status = statusButton.dataset.status;
  const date = status === 'migrated_forward' ? new Date(new Date(entryDate.value).getTime() + 86400000).toISOString().split('T')[0] : status === 'migrated_backward' ? new Date(new Date(entryDate.value).getTime() - 86400000).toISOString().split('T')[0] : undefined;

  window.journal.updateEntryStatus({ id, status, date }).then(refreshAll);
}

function handleCollectionAssign(event) {
  if (event.target.tagName !== 'LI') return;
  const collectionId = Number(event.target.dataset.id);
  const selectedEntry = dailyView.querySelector('.entry-card.selected');
  if (!selectedEntry) return;

  const entryId = Number(selectedEntry.dataset.id);
  window.journal.assignEntryToCollection({ entryId, collectionId }).then(loadCollections);
}

function handleEntrySelection(event) {
  const card = event.target.closest('.entry-card');
  if (!card) return;
  dailyView.querySelectorAll('.entry-card').forEach((el) => el.classList.remove('selected'));
  card.classList.add('selected');
}

function handleTrackerLog(event) {
  const button = event.target.closest('button[data-role="log"]');
  if (!button) return;

  const card = button.closest('.tracker-card');
  const trackerId = Number(card.dataset.id);
  const type = card.dataset.type;
  const dateInput = card.querySelector('input[data-role="date"]');
  const valueInput = card.querySelector('[data-role="value"]');

  const date = dateInput.value || new Date().toISOString().split('T')[0];
  let value = valueInput.value;

  if (type === 'boolean') {
    value = valueInput.value === 'yes' ? 'Yes' : 'No';
  }

  window.journal.logTrackerValue({ trackerId, date, value }).then(loadTrackers);
}

addEntryButton.addEventListener('click', handleAddEntry);
entryContent.addEventListener('keyup', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    handleAddEntry();
  }
});

tabs.forEach((tab) =>
  tab.addEventListener('click', () => {
    switchView(tab.dataset.view);
  })
);

dailyView.addEventListener('click', handleEntryAction);
dailyView.addEventListener('click', handleEntrySelection);
collectionList.addEventListener('click', handleCollectionAssign);
trackersView.addEventListener('click', handleTrackerLog);

searchInput.addEventListener('input', () => loadIndex(searchInput.value));

addCollectionButton.addEventListener('click', async () => {
  const name = collectionNameInput.value.trim();
  if (!name) return;
  await window.journal.createCollection(name);
  collectionNameInput.value = '';
  await loadCollections();
});

addTrackerButton.addEventListener('click', async () => {
  const name = trackerNameInput.value.trim();
  if (!name) return;
  await window.journal.createTracker({
    name,
    type: trackerTypeSelect.value,
    unit: trackerUnitInput.value.trim()
  });
  trackerNameInput.value = '';
  trackerUnitInput.value = '';
  await loadTrackers();
});

exportButton.addEventListener('click', async () => {
  const path = await window.journal.exportData();
  if (path) {
    exportButton.textContent = 'Exported!';
    setTimeout(() => (exportButton.textContent = 'Export'), 1500);
  }
});

setToday();
refreshAll();
