import axios from 'axios';
import dompurify from 'dompurify';

function searchResultsHTML(blizzards) {
  return blizzards
    .map(blizzard => {
      return `
      <a href="/blizzard/${blizzard.slug}" class="search__result">
        <strong>${blizzard.name}</strong>
      </a>
    `;
    })
    .join('');
}

function typeAhead(search) {
  if (!search) return;

  const searchInput = search.querySelector('input[name="search"]');
  const searchResults = search.querySelector('.search__results');

  searchInput.addEventListener('input', function() {
    if (!this.value) {
      searchResults.style.display = 'none';
      return;
    }

    searchResults.style.display = 'block';

    axios
      .get(`/api/v1/search?q=${this.value}`)
      .then(res => {
        if (res.data.length) {
          const html = searchResultsHTML(res.data);
          searchResults.innerHTML = dompurify.sanitize(html);
          return;
        }

        let suggestionStr = `<div class="search__result">No results found for <em>${
          this.value
        }</em>.</div>`;
        if (this.value.length > 5) {
          suggestionStr = `<div class="search__result">No results found for <em>${
            this.value
          }</em>. <a style="font-weight: bolder; color: #28A3FB;" href="/blizzard/add">Add it</a> to Blizzard Judge?</div>`;
        }
        searchResults.innerHTML = dompurify.sanitize(suggestionStr);
      })
      .catch(err => console.error(err));
  });

  searchInput.addEventListener('blur', function() {
    setTimeout(function() {
      searchResults.style.display = 'none';
      searchInput.value = '';
    }, 100);
  });

  // handle arrow keys
  searchInput.addEventListener('keyup', e => {
    // If user is not pressing: up, down or enter, just return
    if (![38, 40, 13].includes(e.keyCode)) return;

    const activeClass = 'search__result--active';
    const current = search.querySelector(`.${activeClass}`);
    const items = search.querySelectorAll('.search__result');
    let next;
    if (e.keyCode === 40 && current) {
      // User pressed "dowm" arrow
      next = current.nextElementSibling || items[0];
    } else if (e.keyCode === 40) {
      // Fist time the user has pressed down within the search results
      next = items[0];
    } else if (e.keyCode === 38 && current) {
      // User pressed "up" arrow
      next = current.previousElementSibling || items[items.length - 1];
    } else if (e.keyCode === 38) {
      next = items[items.length - 1];
    } else if (e.keyCode === 13 && current.href) {
      // User has pressed the enter key
      window.location = current.href;
      return;
    }

    if (current) current.classList.remove(activeClass);
    next.classList.add(activeClass);
  });
}

export default typeAhead;
