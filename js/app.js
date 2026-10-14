/**
 * Fútbol Libre TV - Main Application Logic
 * Cloned identically from https://futbollibre.men/
 * API: https://ovogoal.cyou/api/v2/flyembed2.json
 * Schedule: Controlled 100% privately from js/config.js (window.FBL_CONFIG.showSchedule)
 */

(function () {
  "use strict";

  // Elements
  const agSection = document.getElementById("agenda");
  const agList = document.getElementById("ag-list");
  const agSearch = document.getElementById("ag-search");
  const agFilter = document.getElementById("ag-filter");
  const agModal = document.getElementById("ag-modal");
  const agModalTitle = document.getElementById("ag-modal-title");
  const agModalFrame = document.getElementById("ag-modal-frame");
  const agModalClose = document.getElementById("ag-modal-close");
  const agModalReload = document.getElementById("ag-modal-reload");

  // Channels Filter Elements
  const chGrid = document.getElementById("ch-grid");
  const chSearch = document.getElementById("ch-search");
  const chFilter = document.getElementById("ch-filter");

  // Mobile Menu Elements
  const menuToggle = document.getElementById("menu-toggle");
  const menuOverlay = document.getElementById("menu-overlay");
  const menuClose = document.getElementById("menu-close");

  // State
  let events = [];
  let searchQuery = "";
  let selectedCategory = "todos";
  let expandedEventId = null;

  // ----------------------------------------------------
  // 1. PRIVATE SCHEDULE CONTROLLER (Controlled via config.js)
  // ----------------------------------------------------
  const isScheduleOn = window.FBL_CONFIG ? Boolean(window.FBL_CONFIG.showSchedule) : true;

  if (!isScheduleOn) {
    // If schedule is turned off in code, completely hide the agenda section
    if (agSection) {
      agSection.style.display = "none";
    }
  } else {
    // If schedule is turned on in code, show agenda and load live matches
    if (agSection) {
      agSection.style.display = "block";
    }
    loadAgendaData();

    // Auto-refresh schedule periodically if set
    if (window.FBL_CONFIG?.autoRefreshInterval) {
      setInterval(loadAgendaData, window.FBL_CONFIG.autoRefreshInterval);
    }
  }

  // ----------------------------------------------------
  // 2. HELPER UTILITIES
  // ----------------------------------------------------
  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, function (m) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[m];
    });
  }

  function formatTime(timeStr) {
    if (!timeStr) return "--:--";
    try {
      const parts = timeStr.split(":");
      if (parts.length >= 2) {
        const h = parts[0].padStart(2, "0");
        const m = parts[1].padStart(2, "0");
        return `${h}:${m}`;
      }
      return timeStr.slice(0, 5);
    } catch (e) {
      return timeStr;
    }
  }

  function getPlayerUrl(iframeUrl) {
    return `/reproducir.html?url=` + encodeURIComponent(iframeUrl);
  }

  // ----------------------------------------------------
  // 3. FETCH & PARSE OVOGOAL API
  // ----------------------------------------------------
  async function loadAgendaData() {
    if (!agList) return;
    agList.innerHTML = `<li class="p-4 text-center text-gray-500">Cargando agenda de partidos…</li>`;

    const apiUrl = window.FBL_CONFIG?.apiEndpoint || "https://ovogoal.cyou/api/v2/flyembed2.json";

    try {
      const res = await fetch(apiUrl, { cache: "no-cache" });
      if (!res.ok) throw new Error("Error HTTP " + res.status);
      const data = await res.json();

      if (Array.isArray(data)) {
        events = data.map((item, idx) => {
          const team1 = item.Team1 || "Equipo 1";
          const team2 = item.Team2 || "Equipo 2";
          const league = item.League || "Competición";
          const sport = item.Sport || "Fútbol";
          const title = team2 && team2.trim() !== "" ? `${team1} vs ${team2}` : team1;

          return {
            id: item.MatchID || idx + 1,
            title: title,
            team1: team1,
            team2: team2,
            team1Logo: item.Team1Logo || "",
            team2Logo: item.Team2Logo || "",
            leagueLogo: item.LeagueLogo || "",
            league: league,
            sport: sport,
            date: item.MatchDate || "",
            time: item.MatchStartTime || "",
            endTime: item.MatchEndTime || "",
            iframeUrl: item.IframeURL || "",
            embeds: [
              {
                name: `Opción 1 - HD (${league})`,
                lang: "ES",
                iframe: item.IframeURL || "",
              },
              {
                name: `Opción 2 - Pelota Libre (${league})`,
                lang: "HD",
                iframe: item.IframeURL || "",
              },
            ],
          };
        });

        populateCategories();
        renderAgendaList();
      } else {
        agList.innerHTML = `<li class="p-4 text-center text-gray-500">No hay partidos disponibles en este momento.</li>`;
      }
    } catch (err) {
      console.error("Error al cargar la agenda:", err);
      agList.innerHTML = `
        <li class="p-4 text-center text-gray-600">
          <p class="mb-2">No se pudo cargar la agenda en vivo.</p>
          <button id="ag-retry-btn" class="rounded bg-green-700 px-4 py-1.5 text-xs font-bold text-white hover:bg-green-800">
            Reintentar
          </button>
        </li>
      `;
      document.getElementById("ag-retry-btn")?.addEventListener("click", loadAgendaData);
    }
  }

  function populateCategories() {
    if (!agFilter) return;
    const sports = [...new Set(events.map((e) => (e.sport || "Otros").trim()))];

    let optionsHtml = `<option value="todos">Todas las categorías</option>`;
    sports.forEach((sp) => {
      optionsHtml += `<option value="${escapeHtml(sp.toLowerCase())}">${escapeHtml(sp)}</option>`;
    });

    agFilter.innerHTML = optionsHtml;
  }

  function getFilteredEvents() {
    return events.filter((e) => {
      const matchCat = selectedCategory === "todos" || e.sport.toLowerCase() === selectedCategory;
      const matchSearch =
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.league.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }

  function renderEmbedList(eventItem) {
    if (!eventItem.embeds || eventItem.embeds.length === 0) {
      return `<ul class="mb-1 ml-8 border-l-2 border-green-200 pl-3">
        <li class="py-1.5 text-xs text-gray-500">Sin enlaces disponibles.</li>
      </ul>`;
    }

    return `<ul class="mb-1 ml-8 border-l-2 border-green-200 pl-3">
      ${eventItem.embeds
        .map(
          (opt, idx) => `
        <li class="flex items-center justify-between gap-2 py-1.5 pr-3">
          <button data-play="${eventItem.id}" data-index="${idx}" class="ag-play flex items-center gap-1.5 text-sm text-gray-700 transition-colors hover:text-green-700">
            <span class="text-green-700">▶</span>
            <span>${escapeHtml(opt.name)}</span>
            ${
              opt.lang
                ? `<span class="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600 font-semibold">${escapeHtml(
                    opt.lang
                  )}</span>`
                : ""
            }
          </button>
          <a href="${escapeHtml(
            getPlayerUrl(opt.iframe)
          )}" target="_blank" rel="noopener noreferrer" title="Abrir en pantalla completa" class="text-xs text-gray-500 hover:text-green-700 font-bold px-2 py-1">
            ↗
          </a>
        </li>
      `
        )
        .join("")}
    </ul>`;
  }

  function renderAgendaList() {
    if (!agList) return;
    const filtered = getFilteredEvents();

    if (filtered.length === 0) {
      agList.innerHTML = `<li class="p-4 text-center text-gray-500">No hay partidos que coincidan con la búsqueda.</li>`;
      return;
    }

    agList.innerHTML = filtered
      .map((ev) => {
        const isExpanded = expandedEventId === ev.id;
        const iconSrc = ev.team1Logo || ev.leagueLogo || "/img/logo-futbol-libre.webp";

        return `
        <li data-id="${ev.id}" class="border-b border-gray-200 last:border-0">
          <button class="ag-toggle flex w-full items-center justify-between px-2.5 py-2.5 text-left text-sm text-gray-900 transition-colors hover:bg-green-700 hover:text-white">
            <span class="flex items-center gap-2 overflow-hidden">
              <time class="w-12 shrink-0 text-center font-bold text-xs sm:text-sm">${formatTime(ev.time)}</time>
              ${
                iconSrc
                  ? `<img src="${escapeHtml(
                      iconSrc
                    )}" alt="" class="h-6 w-6 shrink-0 object-contain rounded bg-white p-0.5" onerror="this.src='/img/logo-futbol-libre.webp'"/>`
                  : ""
              }
              <span class="ml-1 font-semibold truncate text-xs sm:text-sm">${escapeHtml(ev.title)}</span>
              <span class="hidden sm:inline-block rounded bg-green-100 text-green-800 text-[10px] font-bold px-1.5 py-0.5 ml-1">${escapeHtml(
                ev.league
              )}</span>
            </span>
            <span class="ml-3 text-xs text-gray-500">${isExpanded ? "▴" : "▾"}</span>
          </button>
          ${isExpanded ? renderEmbedList(ev) : ""}
        </li>
      `;
      })
      .join("");
  }

  // ----------------------------------------------------
  // 4. IN-PAGE PLAYER MODAL
  // ----------------------------------------------------
  function openPlayerModal(eventItem, option) {
    if (!agModal || !agModalFrame) return;
    if (agModalTitle) agModalTitle.textContent = eventItem.title;
    agModalFrame.src = option.iframe;
    agModal.classList.remove("hidden");
    agModal.classList.add("flex");
  }

  function closePlayerModal() {
    if (!agModal || !agModalFrame) return;
    agModal.classList.add("hidden");
    agModal.classList.remove("flex");
    agModalFrame.src = "";
  }

  // Event Listeners - Agenda List
  if (agList) {
    agList.addEventListener("click", function (e) {
      const toggleBtn = e.target.closest(".ag-toggle");
      if (toggleBtn) {
        const li = toggleBtn.closest("li");
        const id = li ? li.dataset.id : null;
        expandedEventId = expandedEventId === id ? null : id;
        renderAgendaList();
        return;
      }

      const playBtn = e.target.closest(".ag-play");
      if (playBtn) {
        const eventId = playBtn.dataset.play;
        const optIdx = Number(playBtn.dataset.index);
        const ev = events.find((item) => String(item.id) === String(eventId));
        if (ev && ev.embeds && ev.embeds[optIdx]) {
          openPlayerModal(ev, ev.embeds[optIdx]);
        }
      }
    });
  }

  if (agSearch) {
    agSearch.addEventListener("input", function (e) {
      searchQuery = e.target.value.trim();
      renderAgendaList();
    });
  }

  if (agFilter) {
    agFilter.addEventListener("change", function (e) {
      selectedCategory = e.target.value;
      renderAgendaList();
    });
  }

  if (agModalClose) agModalClose.addEventListener("click", closePlayerModal);
  if (agModal) {
    agModal.addEventListener("click", function (e) {
      if (e.target === agModal) closePlayerModal();
    });
  }
  if (agModalReload) {
    agModalReload.addEventListener("click", function () {
      if (agModalFrame && agModalFrame.src) {
        agModalFrame.src = agModalFrame.src;
      }
    });
  }

  // ----------------------------------------------------
  // 5. CHANNELS FILTERING (Inicio - Canales Deportivos México)
  // ----------------------------------------------------
  if (chGrid && (chSearch || chFilter)) {
    const channelCards = Array.from(chGrid.querySelectorAll("a"));

    const filterChannels = () => {
      const q = (chSearch?.value || "").toLowerCase().trim();
      const cat = chFilter?.value || "Todos";

      channelCards.forEach((card) => {
        const name = (card.dataset.name || "").toLowerCase();
        const category = card.dataset.category || "";
        const matchesCategory = cat === "Todos" || category === cat;
        const matchesQuery = name.includes(q);

        card.classList.toggle("hidden", !(matchesCategory && matchesQuery));
      });
    };

    if (chSearch) chSearch.addEventListener("input", filterChannels);
    if (chFilter) chFilter.addEventListener("change", filterChannels);
  }

  // ----------------------------------------------------
  // 6. MOBILE MENU
  // ----------------------------------------------------
  if (menuToggle && menuOverlay && menuClose) {
    const openMenu = () => {
      menuOverlay.classList.remove("hidden");
      menuOverlay.classList.add("flex");
      menuToggle.setAttribute("aria-expanded", "true");
    };

    const closeMenu = () => {
      menuOverlay.classList.add("hidden");
      menuOverlay.classList.remove("flex");
      menuToggle.setAttribute("aria-expanded", "false");
    };

    menuToggle.addEventListener("click", openMenu);
    menuClose.addEventListener("click", closeMenu);
    menuOverlay.addEventListener("click", (e) => {
      if (e.target === menuOverlay) closeMenu();
    });
    menuOverlay.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
  }
})();
