export function renderHub(container, navigate) {
  container.innerHTML = `
    <section class="hub-hero">
      <h1>Codex Estelar</h1>
      <p>Uma enciclopédia navegável da saga: explore o sistema planetário e conheça os personagens que o habitam.</p>
    </section>
    <div class="hub-cards">
      <button class="hub-card" data-nav="planets" type="button">
        <span class="hub-card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20.341 6.484A10 10 0 0 1 10.266 21.85"></path>
            <path d="M3.659 17.516A10 10 0 0 1 13.74 2.152"></path>
            <circle cx="12" cy="12" r="3"></circle>
            <circle cx="19" cy="5" r="2"></circle>
            <circle cx="5" cy="19" r="2"></circle>
          </svg>
        </span>
        <h2>Sistema planetário</h2>
        <p>Navegue pelos planetas e veja espécies presentes e filmes em que aparecem.</p>
        <span class="hub-card-arrow" aria-hidden="true">Explorar →</span>
      </button>
      <button class="hub-card" data-nav="people" type="button">
        <span class="hub-card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <path d="M16 3.128a4 4 0 0 1 0 7.744"></path>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
            <circle cx="9" cy="7" r="4"></circle>
          </svg>
        </span>
        <h2>Personagens</h2>
        <p>Busque e explore os personagens da saga, com detalhes de cada um.</p>
        <span class="hub-card-arrow" aria-hidden="true">Explorar →</span>
      </button>
      <button class="hub-card" data-nav="films" type="button">
        <span class="hub-card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m12.296 3.464 3.02 3.956"></path>
            <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z"></path>
            <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <path d="m6.18 5.276 3.1 3.899"></path>
          </svg>
        </span>
        <h2>Filmes</h2>
        <p>Percorra os episódios da saga e leia a abertura de cada um.</p>
        <span class="hub-card-arrow" aria-hidden="true">Explorar →</span>
      </button>
      <button class="hub-card" data-nav="vehicles" type="button">
        <span class="hub-card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09"></path>
            <path d="M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z"></path>
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05"></path>
          </svg>
        </span>
        <h2>Naves e Veículos</h2>
        <p>Compare specs de naves estelares e veículos usados na saga.</p>
        <span class="hub-card-arrow" aria-hidden="true">Explorar →</span>
      </button>
      <button class="hub-card" data-nav="species" type="button">
        <span class="hub-card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m10 16 1.5 1.5"></path>
            <path d="m14 8-1.5-1.5"></path>
            <path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"></path>
            <path d="m16.5 10.5 1 1"></path>
            <path d="m17 6-2.891-2.891"></path>
            <path d="M2 15c6.667-6 13.333 0 20-6"></path>
            <path d="m20 9 .891.891"></path>
            <path d="M3.109 14.109 4 15"></path>
            <path d="m6.5 12.5 1 1"></path>
            <path d="m7 18 2.891 2.891"></path>
            <path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"></path>
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
