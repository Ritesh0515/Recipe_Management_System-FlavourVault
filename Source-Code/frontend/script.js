// Toggle mobile menu visibility
function toggleMenu() {
  const navList = document.querySelector('.nav-list');
  navList.classList.toggle('active');
}

// Filter recipes by category
function filterRecipes(category) {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => btn.classList.remove('active'));
  
  event.target.classList.add('active');

  const recipeCards = document.querySelectorAll('.recipe-card');
  recipeCards.forEach(card => {
    if (category === 'all' || card.dataset.category === category) {
      card.classList.remove('hidden');
      card.style.display = 'block';
    } else {
      card.classList.add('hidden');
      card.style.display = 'none';
    }
  });

  updateRecipeCount();
}

// Update recipe count display based on visible cards
function updateRecipeCount() {
  const visibleCards = [...document.querySelectorAll('.recipe-card')].filter(card => !card.classList.contains('hidden'));
  const countDisplay = document.getElementById('recipe-count');
  if (countDisplay) {
    countDisplay.textContent = `Showing ${visibleCards.length} recipe${visibleCards.length !== 1 ? 's' : ''}`;
  }
}

// Live recipe search filtering
function searchRecipes() {
  const searchInput = document.getElementById('recipe-search');
  const filter = searchInput.value.toLowerCase();
  const recipeCards = document.querySelectorAll('.recipe-card');
  
  recipeCards.forEach(card => {
    const title = card.querySelector('h2').textContent.toLowerCase();
    const description = card.querySelector('p').textContent.toLowerCase();
    if (title.includes(filter) || description.includes(filter)) {
      card.classList.remove('hidden');
      card.style.display = 'block';
    } else {
      card.classList.add('hidden');
      card.style.display = 'none';
    }
  });

  updateRecipeCount();
}

// Support search on Enter key press
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('recipe-search');
  if (searchInput) {
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        searchRecipes();
      }
    });
  }

  // Initial count update on page load
  updateRecipeCount();
});

// Mobile menu close when clicking outside
document.addEventListener('click', (event) => {
  const navList = document.querySelector('.nav-list');
  const menuIcon = document.querySelector('.menu-icon');
  
  if (!navList.contains(event.target) && !menuIcon.contains(event.target)) {
    navList.classList.remove('active');
  }
});

// Handle home page search submission
function handleHomeSearch(event) {
  event.preventDefault();
  const query = document.getElementById('home-search').value.trim();
  if (!query) {
    alert('Please enter a search term.');
    return;
  }
  const encodedQuery = encodeURIComponent(query);
  window.location.href = `recipes.html?search=${encodedQuery}`;
}

// On recipes page, auto-fill and search for query from URL param
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.pathname.endsWith('recipes.html')) {
    const params = new URLSearchParams(window.location.search);
    const searchQuery = params.get('search');
    if (searchQuery) {
      const searchInput = document.getElementById('recipe-search');
      if (searchInput) {
        searchInput.value = searchQuery;
        searchRecipes();
      }
    }
  }
});
