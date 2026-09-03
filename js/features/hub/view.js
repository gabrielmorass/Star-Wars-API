export function renderHub(container, navigate) {
  container.innerHTML = `
    <section class="hub-hero">
      <h1>Codex Estelar</h1>
      <p>Uma enciclopédia navegável da saga: explore o sistema planetário e conheça os personagens que o habitam.</p>
    </section>
    <div class="hub-cards">
      <button class="hub-card" data-nav="planets" type="button">
        <span class="hub-card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <ellipse cx="12" cy="12" rx="10" ry="3.2" transform="rotate(-20 12 12)"></ellipse>
          </svg>
        </span>
        <h2>Sistema planetário</h2>
        <p>Navegue pelos planetas e veja espécies presentes e filmes em que aparecem.</p>
        <span class="hub-card-arrow" aria-hidden="true">Explorar →</span>
      </button>
      <button class="hub-card" data-nav="people" type="button">
        <span class="hub-card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="8" r="3.2"></circle>
            <path d="M5 20c0-4 3.2-6.5 7-6.5s7 2.5 7 6.5"></path>
          </svg>
        </span>
        <h2>Personagens</h2>
        <p>Busque e explore os personagens da saga, com detalhes de cada um.</p>
        <span class="hub-card-arrow" aria-hidden="true">Explorar →</span>
      </button>
      <button class="hub-card" data-nav="films" type="button">
        <span class="hub-card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="1.5"></rect>
            <path d="M3 9h18M8 5v4M16 5v4M8 15v4M16 15v4"></path>
          </svg>
        </span>
        <h2>Filmes</h2>
        <p>Percorra os episódios da saga e leia a abertura de cada um.</p>
        <span class="hub-card-arrow" aria-hidden="true">Explorar →</span>
      </button>
      <button class="hub-card" data-nav="vehicles" type="button">
        <span class="hub-card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 15l2-6a2 2 0 0 1 2-1.4h10a2 2 0 0 1 2 1.4l2 6"></path>
            <path d="M3 15h18v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"></path>
            <circle cx="7.5" cy="18" r="1.2"></circle>
            <circle cx="16.5" cy="18" r="1.2"></circle>
          </svg>
        </span>
        <h2>Naves e Veículos</h2>
        <p>Compare specs de naves estelares e veículos usados na saga.</p>
        <span class="hub-card-arrow" aria-hidden="true">Explorar →</span>
      </button>
      <button class="hub-card" data-nav="species" type="button">
        <span class="hub-card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3c2 2.5 3 5 3 7.5S13.5 17 12 21c-1.5-4-3-7-3-10.5S10 5.5 12 3Z"></path>
            <path d="M4.5 9c1.8 1 3 2.6 3 4.5S6.3 17 4.5 18"></path>
            <path d="M19.5 9c-1.8 1-3 2.6-3 4.5s1.2 3.5 3 4.5"></path>
          </svg>
        </span>
        <h2>Espécies</h2>
        <p>Conheça as espécies da galáxia, seu idioma e planeta natal.</p>
        <span class="hub-card-arrow" aria-hidden="true">Explorar →</span>
      </button>
    </div>
  `;
  container.querySelectorAll("[data-nav]").forEach((el) => {
    el.addEventListener("click", () => navigate(el.dataset.nav));
  });
}
