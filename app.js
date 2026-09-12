// IPL Auction Arena - Main Application Controller & UI Logic

class App {
  constructor() {
    this.currentTab = 'home';
    this.searchQuery = '';
    this.selectedRole = 'all';
    this.selectedCategory = 'all';
    this.selectedStatus = 'all';
    this.selectedPriceBracket = 'all';
    this.isProjectorMode = false;

    this.init();
  }

  init() {
    // Subscribe to engine state changes
    window.auctionEngine.subscribe(() => {
      this.render();
    });

    this.setupNavigation();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.render();
  }

  setupNavigation() {
    const navButtons = document.querySelectorAll('[data-tab-target]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = btn.getAttribute('data-tab-target');
        this.switchTab(targetTab);
      });
    });
  }

  switchTab(tabId) {
    this.currentTab = tabId;
    
    // Update active tab buttons
    document.querySelectorAll('[data-tab-target]').forEach(btn => {
      const target = btn.getAttribute('data-tab-target');
      if (target === tabId) {
        btn.classList.add('bg-amber-500/20', 'text-amber-400', 'border-amber-500/50');
        btn.classList.remove('text-slate-400', 'hover:bg-slate-800/50', 'border-transparent');
      } else {
        btn.classList.remove('bg-amber-500/20', 'text-amber-400', 'border-amber-500/50');
        btn.classList.add('text-slate-400', 'hover:bg-slate-800/50', 'border-transparent');
      }
    });

    // Show/hide sections
    document.querySelectorAll('.tab-section').forEach(sec => {
      if (sec.id === `section-${tabId}`) {
        sec.classList.remove('hidden');
      } else {
        sec.classList.add('hidden');
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.render();
  }

  setupEventListeners() {
    // Sound FX Toggle
    const soundBtn = document.getElementById('btnToggleSound');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        const isEnabled = window.soundFX.toggleSound();
        const icon = soundBtn.querySelector('.sound-icon');
        const text = soundBtn.querySelector('.sound-text');
        if (isEnabled) {
          icon.textContent = '🔊';
          text.textContent = 'Sound ON';
          soundBtn.classList.remove('opacity-50', 'border-red-500/40');
          soundBtn.classList.add('border-slate-700');
        } else {
          icon.textContent = '🔇';
          text.textContent = 'Sound OFF';
          soundBtn.classList.add('opacity-50', 'border-red-500/40');
          soundBtn.classList.remove('border-slate-700');
        }
      });
    }

    // Projector Mode Toggle
    const projectorBtn = document.getElementById('btnToggleProjector');
    if (projectorBtn) {
      projectorBtn.addEventListener('click', () => {
        this.isProjectorMode = !this.isProjectorMode;
        document.body.classList.toggle('projector-mode', this.isProjectorMode);
        projectorBtn.classList.toggle('bg-amber-500/30', this.isProjectorMode);
        projectorBtn.classList.toggle('border-amber-400', this.isProjectorMode);
        
        // Try entering browser fullscreen if enabled
        if (this.isProjectorMode && !document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else if (!this.isProjectorMode && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    // Reset Auction Button
    const resetBtn = document.getElementById('btnResetAuction');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm("⚠️ Are you sure you want to RESET the entire auction? All sold player records, bids, and team budgets will be restored to defaults.")) {
          window.auctionEngine.resetAll();
          alert("Auction state has been reset to starting ₹120 Cr purses and 200 upcoming players.");
        }
      });
    }

    // Export CSV Button
    const exportBtn = document.getElementById('btnExportCSV');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const csv = window.auctionEngine.exportCSV();
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `IPL_AUCTION_ARENA_REPORT_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }

    // Player search and filters
    const searchInput = document.getElementById('playerSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderPlayersList();
      });
    }

    const roleFilter = document.getElementById('roleFilterSelect');
    if (roleFilter) {
      roleFilter.addEventListener('change', (e) => {
        this.selectedRole = e.target.value;
        this.renderPlayersList();
      });
    }

    const categoryFilter = document.getElementById('categoryFilterSelect');
    if (categoryFilter) {
      categoryFilter.addEventListener('change', (e) => {
        this.selectedCategory = e.target.value;
        this.renderPlayersList();
      });
    }

    const statusFilter = document.getElementById('statusFilterSelect');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        this.selectedStatus = e.target.value;
        this.renderPlayersList();
      });
    }
  }

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts if user is typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      if (this.currentTab !== 'live-auction') return;

      const engine = window.auctionEngine;
      const player = engine.getActivePlayer();

      if (!player) return;

      // Key 1 to 9 & 0 for bidding for 10 teams
      const key = e.key;
      let teamIndex = -1;
      if (key >= '1' && key <= '9') {
        teamIndex = parseInt(key) - 1;
      } else if (key === '0') {
        teamIndex = 9; // 10th team (LSG)
      }

      if (teamIndex >= 0 && teamIndex < engine.teams.length) {
        const team = engine.teams[teamIndex];
        const res = engine.placeBid(team.id);
        if (!res.success) {
          this.showToast(`Cannot Bid (${team.shortName}): ${res.reason}`, 'error');
        }
        return;
      }

      // Spacebar: SOLD
      if (e.code === 'Space') {
        e.preventDefault();
        this.handleSold();
        return;
      }

      // 'U' key: UNSOLD
      if (e.key.toLowerCase() === 'u') {
        this.handleUnsold();
        return;
      }

      // 'T' key: Timer Toggle
      if (e.key.toLowerCase() === 't') {
        if (engine.isTimerRunning) engine.pauseTimer();
        else engine.startTimer();
        return;
      }

      // 'N' key: Next Player
      if (e.key.toLowerCase() === 'n') {
        this.handleNextPlayer();
        return;
      }
    });
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-300 transform translate-y-2 text-sm font-semibold border ${
      type === 'error' 
        ? 'bg-red-950/90 text-red-200 border-red-500/50 shadow-red-950/50' 
        : type === 'success' 
          ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/50 shadow-emerald-950/50' 
          : 'bg-slate-900/90 text-slate-100 border-amber-500/50 shadow-amber-950/50'
    }`;
    
    const icon = type === 'error' ? '⚠️' : type === 'success' ? '✅' : '📢';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2');
      toast.classList.add('translate-y-0');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  triggerConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = [];
    const colors = ['#f59e0b', '#fbbf24', '#3b82f6', '#10b981', '#ec4899', '#8b5cf6', '#ffffff'];

    for (let i = 0; i < 150; i++) {
      pieces.push({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        vx: (Math.random() - 0.5) * 22,
        vy: (Math.random() - 0.7) * 20 - 4,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 15,
        gravity: 0.45,
        opacity: 1
      });
    }

    let animationFrame;
    const renderConfetti = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let aliveCount = 0;

      pieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.rotationSpeed;
        p.opacity -= 0.009;

        if (p.opacity > 0 && p.y < canvas.height + 50) {
          aliveCount++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      });

      if (aliveCount > 0) {
        animationFrame = requestAnimationFrame(renderConfetti);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        cancelAnimationFrame(animationFrame);
      }
    };

    renderConfetti();
  }

  // Master Render dispatcher
  render() {
    this.renderHeaderStats();
    if (this.currentTab === 'home') this.renderHome();
    if (this.currentTab === 'live-auction') this.renderLiveAuction();
    if (this.currentTab === 'players') this.renderPlayersList();
    if (this.currentTab === 'teams') this.renderTeamsMatrix();
    if (this.currentTab === 'squads') this.renderSquadsBreakdown();
    if (this.currentTab === 'leaderboard') this.renderLeaderboard();
    if (this.currentTab === 'history') this.renderHistory();
  }

  renderHeaderStats() {
    const analytics = window.auctionEngine.getAnalytics();
    const statsEl = document.getElementById('headerQuickStats');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="flex items-center gap-4 text-xs font-semibold text-slate-300">
          <div class="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>SOLD: <strong class="text-emerald-400 font-mono">${analytics.soldCount}</strong> / 200</span>
          </div>
          <div class="hidden sm:flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
            <span>UNSOLD: <strong class="text-rose-400 font-mono">${analytics.unsoldCount}</strong></span>
          </div>
          <div class="hidden md:flex items-center gap-1.5 bg-slate-800/80 px-3 py-1 rounded-full border border-slate-700">
            <span>TOTAL SPENT: <strong class="text-amber-400 font-mono">${analytics.totalSpentFormatted}</strong></span>
          </div>
        </div>
      `;
    }
  }

  // ==================== 1. HOME TAB ====================
  renderHome() {
    const analytics = window.auctionEngine.getAnalytics();
    const engine = window.auctionEngine;
    const activePlayer = engine.getActivePlayer();

    const homeContainer = document.getElementById('section-home');
    if (!homeContainer) return;

    homeContainer.innerHTML = `
      <div class="space-y-12 max-w-7xl mx-auto">
        <!-- Hero Section -->
        <div class="relative overflow-hidden rounded-3xl glass-panel-gold border border-amber-500/30 p-8 md:p-14 text-center">
          <div class="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none"></div>

          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm font-semibold tracking-wider uppercase mb-6">
            🏆 College Symposium Mega Event • Live Mega Auction 2026
          </div>

          <h1 class="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 font-heading">
            IPL AUCTION <span class="text-shimmer">ARENA</span>
          </h1>

          <p class="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed mb-8">
            Welcome to the ultimate IPL Auction simulator. <strong>10 IPL Franchises</strong> with 
            <span class="text-amber-400 font-bold">₹120 Crore purses</span> compete live for 
            <strong>200 world-class cricket superstars</strong>. Real-time automatic bid increments, budget management, and broadcast-grade projector displays.
          </p>

          <div class="flex flex-wrap items-center justify-center gap-4">
            <button onclick="window.app.switchTab('live-auction')" class="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-lg rounded-2xl shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 transform hover:-translate-y-1 transition duration-200 flex items-center gap-3">
              <span>🔨</span>
              <span>ENTER LIVE AUCTION</span>
            </button>
            <button onclick="window.app.switchTab('players')" class="px-8 py-4 bg-slate-800/90 hover:bg-slate-700/90 text-slate-100 font-bold text-lg rounded-2xl border border-slate-700 hover:border-slate-500 transition duration-200 flex items-center gap-3">
              <span>👥</span>
              <span>SCOUT 200 PLAYERS</span>
            </button>
          </div>

          <!-- Quick Metrics Bar -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 pt-10 border-t border-slate-800/80">
            <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div class="text-3xl font-extrabold text-amber-400 font-mono-numeric">10</div>
              <div class="text-xs uppercase tracking-wider text-slate-400 font-semibold mt-1">IPL Teams</div>
            </div>
            <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div class="text-3xl font-extrabold text-blue-400 font-mono-numeric">200</div>
              <div class="text-xs uppercase tracking-wider text-slate-400 font-semibold mt-1">Player Pool</div>
            </div>
            <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div class="text-3xl font-extrabold text-emerald-400 font-mono-numeric">₹120 Cr</div>
              <div class="text-xs uppercase tracking-wider text-slate-400 font-semibold mt-1">Starting Purse/Team</div>
            </div>
            <div class="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div class="text-3xl font-extrabold text-purple-400 font-mono-numeric">15</div>
              <div class="text-xs uppercase tracking-wider text-slate-400 font-semibold mt-1">Max Squad Size</div>
            </div>
          </div>
        </div>

        <!-- 10 Franchises Showcase -->
        <div>
          <div class="flex items-center justify-between mb-6">
            <div>
              <h2 class="text-2xl font-bold text-slate-100 flex items-center gap-2">
                <span>🛡️</span> Participating Franchises (IPL 2026)
              </h2>
              <p class="text-sm text-slate-400">Live purse balance and squad counters for all 10 franchises</p>
            </div>
            <button onclick="window.app.switchTab('teams')" class="text-sm text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1">
              <span>View Full Matrix</span> <span>→</span>
            </button>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            ${engine.teams.map(team => {
              const spent = team.totalBudget - team.remainingBudget;
              const slotsFilled = team.players.length;
              return `
                <div onclick="window.app.openTeamModal('${team.id}')" class="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-amber-500/50 cursor-pointer team-card-hover transition-all relative overflow-hidden group">
                  <div class="absolute top-0 left-0 right-0 h-1" style="background-color: ${team.color}"></div>
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-2xl">${team.fallbackIcon}</span>
                    <span class="px-2 py-0.5 text-xs font-extrabold rounded-md font-mono" style="background-color: ${team.color}; color: ${team.textColor}">${team.shortName}</span>
                  </div>
                  <h3 class="font-bold text-sm text-slate-200 truncate group-hover:text-amber-400 transition">${team.name}</h3>
                  <div class="mt-3 space-y-1.5 text-xs">
                    <div class="flex justify-between text-slate-400">
                      <span>Purse Left:</span>
                      <strong class="text-amber-400 font-mono-numeric">${AuctionEngine.formatINRShort(team.remainingBudget)}</strong>
                    </div>
                    <div class="flex justify-between text-slate-400">
                      <span>Squad:</span>
                      <span class="font-mono-numeric text-slate-200">${slotsFilled} / ${team.maxPlayers}</span>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Rules & Guidelines Card -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl font-bold">1</div>
            <h3 class="text-lg font-bold text-slate-100">Smart Bidding Ladder</h3>
            <p class="text-sm text-slate-400 leading-relaxed">
              Auto-increments dynamically based on current price level: +₹10L below 1Cr, +₹20L up to 2Cr, +₹25L up to 5Cr, +₹50L up to 10Cr, and +₹1Cr above 10Cr.
            </p>
          </div>

          <div class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <div class="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl font-bold">2</div>
            <h3 class="text-lg font-bold text-slate-100">Squad & Quota Limits</h3>
            <p class="text-sm text-slate-400 leading-relaxed">
              Strict limit of <strong>15 players maximum</strong> per team, with a maximum of <strong>6 overseas players</strong> allowed. System auto-prevents violations.
            </p>
          </div>

          <div class="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl font-bold">3</div>
            <h3 class="text-lg font-bold text-slate-100">Purse Reserve Protection</h3>
            <p class="text-sm text-slate-400 leading-relaxed">
              Teams are automatically protected from overspending by reserving the minimum base price (₹20 Lakh) for each unfilled squad slot.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  // ==================== 2. LIVE AUCTION TAB ====================
  renderLiveAuction() {
    const engine = window.auctionEngine;
    const player = engine.getActivePlayer();
    const leadingTeam = engine.getLeadingTeam();
    const container = document.getElementById('section-live-auction');
    if (!container) return;

    if (!player) {
      // Empty state: Select next player
      container.innerHTML = `
        <div class="max-w-4xl mx-auto text-center py-16 px-6 glass-panel-gold rounded-3xl border border-amber-500/30 my-8">
          <div class="w-20 h-20 rounded-full bg-amber-500/20 text-amber-400 text-4xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            🔨
          </div>
          <h2 class="text-3xl font-extrabold text-slate-100 font-heading mb-3">Live Auction Stage Ready</h2>
          <p class="text-slate-300 text-base max-w-xl mx-auto mb-8">
            No player is currently on the auction podium. Call the next player from the 200-player pool or select a specific player to begin live bidding!
          </p>
          <div class="flex flex-wrap items-center justify-center gap-4">
            <button onclick="window.app.handleNextPlayer()" class="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold rounded-2xl shadow-xl shadow-amber-500/25 transition transform hover:-translate-y-0.5 flex items-center gap-2">
              <span>⚡</span>
              <span>CALL NEXT UPCOMING PLAYER</span>
            </button>
            <button onclick="window.app.switchTab('players')" class="px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-2xl border border-slate-700 transition flex items-center gap-2">
              <span>📋</span>
              <span>CHOOSE FROM DATABASE</span>
            </button>
          </div>
        </div>
      `;
      return;
    }

    const nextIncrement = engine.getNextIncrement(engine.currentBid);
    const nextBidAmount = engine.getNextBidAmount();
    const isSoldOrUnsold = player.status === 'SOLD' || player.status === 'UNSOLD';

    container.innerHTML = `
      <div class="max-w-7xl mx-auto space-y-6">
        <!-- Top Action Bar: Timer & Auctioneer Tools -->
        <div class="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-bold text-slate-300 flex items-center gap-2">
              <span>Lot #${player.id}</span>
              <span class="text-slate-500">•</span>
              <span class="text-amber-400">${player.tier.toUpperCase()} SET</span>
            </div>
            
            ${player.status === 'SOLD' ? '<span class="px-3 py-1 text-xs font-black rounded-lg bg-emerald-500 text-slate-950">SOLD</span>' : ''}
            ${player.status === 'UNSOLD' ? '<span class="px-3 py-1 text-xs font-black rounded-lg bg-rose-500 text-slate-100">UNSOLD</span>' : ''}
            ${player.status === 'IN_AUCTION' ? '<span class="px-3 py-1 text-xs font-black rounded-lg bg-amber-500 text-slate-950 animate-pulse">ON PODIUM</span>' : ''}
          </div>

          <!-- Timer Controls -->
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2 bg-slate-950 px-4 py-1.5 rounded-xl border ${engine.timerSeconds <= 5 && engine.isTimerRunning ? 'border-rose-500 text-rose-400 animate-pulse' : 'border-slate-800 text-amber-400'}">
              <span class="text-xs font-bold tracking-wider uppercase text-slate-400">TIMER:</span>
              <span class="font-mono text-xl font-extrabold ${engine.timerSeconds <= 5 ? 'text-rose-400' : 'text-amber-400'}">${engine.timerSeconds}s</span>
            </div>
            <button onclick="window.app.toggleTimer()" class="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold">
              ${engine.isTimerRunning ? '⏸️ Pause' : '▶️ Start'}
            </button>
            <button onclick="window.auctionEngine.resetTimer(20)" class="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs" title="Reset Timer">
              🔄 20s
            </button>
            <button onclick="window.auctionEngine.resetTimer(30)" class="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs" title="30s Timer">
              30s
            </button>
          </div>

          <!-- Navigation Controls -->
          <div class="flex items-center gap-2">
            <button onclick="window.app.handleUndoBid()" ${engine.bidHistory.length === 0 ? 'disabled' : ''} class="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
              <span>↩️</span> Undo Bid
            </button>
            <button onclick="window.app.handleNextPlayer()" class="px-4 py-1.5 text-xs font-bold rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
              <span>Next Player</span> <span>⏭️</span>
            </button>
          </div>
        </div>

        <!-- MAIN PODIUM STAGE (Grid: Player Card Left, Live Bidding Center, Bidding Stream Right) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <!-- LEFT: Player Spotlight (4 cols) -->
          <div class="lg:col-span-4 space-y-4">
            <div class="glass-panel rounded-3xl p-6 border border-slate-800 relative overflow-hidden text-center shadow-2xl">
              <!-- Tier Badge -->
              <div class="flex justify-between items-center mb-4">
                <span class="px-3 py-1 text-xs rounded-full tier-${player.tier.toLowerCase()}">${player.tier}</span>
                <span class="text-xs font-bold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Rating: <strong class="text-amber-400 font-mono">${player.rating}</strong>/99
                </span>
              </div>

              <!-- Avatar & Flag -->
              <div class="relative w-40 h-40 mx-auto my-2 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-amber-500/30 p-2 shadow-2xl flex items-center justify-center">
                <img src="${player.image}" alt="${player.name}" class="w-full h-full object-contain rounded-xl drop-shadow-lg" />
                <div class="absolute -bottom-2 -right-2 text-2xl bg-slate-900/90 p-1.5 rounded-full border border-slate-700 shadow-md">
                  ${player.countryFlag}
                </div>
              </div>

              <!-- Name & Role -->
              <h2 class="text-2xl sm:text-3xl font-extrabold text-slate-100 font-heading mt-4">${player.name}</h2>
              <div class="flex items-center justify-center gap-2 mt-1">
                <span class="text-sm font-semibold text-amber-400">${player.roleIcon} ${player.role}</span>
                <span class="text-slate-600">•</span>
                <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full ${player.category === 'Indian' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'}">
                  ${player.category} (${player.country})
                </span>
              </div>

              <p class="text-xs text-slate-400 italic mt-3 px-4 py-2 rounded-xl bg-slate-900/50 border border-slate-800/80">
                "${player.specialty}"
              </p>

              <!-- Player Stats Grid -->
              <div class="grid grid-cols-2 gap-2 mt-4 text-left text-xs">
                <div class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div class="text-slate-400 text-[11px]">Matches Played</div>
                  <div class="font-bold text-slate-200 font-mono-numeric text-sm">${player.stats.matches}</div>
                </div>
                ${player.role === 'Bowler' ? `
                  <div class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div class="text-slate-400 text-[11px]">Wickets / Best</div>
                    <div class="font-bold text-amber-400 font-mono-numeric text-sm">${player.stats.wickets} <span class="text-xs text-slate-400">(${player.stats.bestBowling})</span></div>
                  </div>
                ` : `
                  <div class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div class="text-slate-400 text-[11px]">Runs / Highest</div>
                    <div class="font-bold text-amber-400 font-mono-numeric text-sm">${player.stats.runs} <span class="text-xs text-slate-400">(${player.stats.highestScore})</span></div>
                  </div>
                `}
                <div class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div class="text-slate-400 text-[11px]">Strike Rate</div>
                  <div class="font-bold text-emerald-400 font-mono-numeric text-sm">${player.stats.strikeRate > 0 ? player.stats.strikeRate : '-'}</div>
                </div>
                <div class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div class="text-slate-400 text-[11px]">Base Price</div>
                  <div class="font-bold text-amber-300 font-mono-numeric text-sm">${AuctionEngine.formatINR(player.basePrice)}</div>
                </div>
              </div>

              <!-- Reopen Button if Sold/Unsold -->
              ${isSoldOrUnsold ? `
                <div class="mt-4 pt-4 border-t border-slate-800">
                  <button onclick="window.auctionEngine.reopenPlayerAuction(${player.id})" class="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold border border-amber-500/30 flex items-center justify-center gap-2">
                    <span>🔄</span> Re-Open Bidding for this Player
                  </button>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- CENTER & RIGHT: Live Bid Display & 10 Team Bidding Pads (8 cols) -->
          <div class="lg:col-span-8 space-y-6">
            
            <!-- Current Price & Leading Team Billboard -->
            <div class="glass-panel-gold rounded-3xl p-6 border border-amber-500/40 relative overflow-hidden shadow-2xl">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <!-- Left: Big Current Bid Amount -->
                <div>
                  <div class="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1 flex items-center gap-2">
                    <span>🔥</span>
                    <span>${engine.bidHistory.length === 0 ? 'STARTING BASE PRICE' : 'CURRENT HIGHEST BID'}</span>
                  </div>
                  <div class="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white font-mono-numeric bid-pop tracking-tight">
                    ${AuctionEngine.formatINR(engine.currentBid)}
                  </div>
                  <div class="text-xs text-slate-400 mt-2 flex items-center gap-2">
                    <span>Next Increment:</span>
                    <strong class="text-emerald-400 font-mono">+${AuctionEngine.formatINRShort(nextIncrement)}</strong>
                    <span class="text-slate-600">→</span>
                    <span>Next Bid:</span>
                    <strong class="text-amber-300 font-mono">${AuctionEngine.formatINR(nextBidAmount)}</strong>
                  </div>
                </div>

                <!-- Right: Leading Franchise -->
                <div class="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 flex items-center gap-4">
                  ${leadingTeam ? `
                    <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg shrink-0" style="background-color: ${leadingTeam.color}; color: ${leadingTeam.textColor}">
                      ${leadingTeam.fallbackIcon}
                    </div>
                    <div class="min-w-0">
                      <div class="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Leading Bidder</div>
                      <div class="text-xl font-extrabold text-slate-100 truncate">${leadingTeam.name}</div>
                      <div class="text-xs text-slate-400 mt-0.5">
                        Remaining Purse: <strong class="text-amber-400 font-mono-numeric">${AuctionEngine.formatINRShort(leadingTeam.remainingBudget)}</strong>
                      </div>
                    </div>
                  ` : `
                    <div class="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl text-slate-500 shrink-0">
                      ⏳
                    </div>
                    <div>
                      <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">No Bids Placed</div>
                      <div class="text-base font-bold text-slate-300">Awaiting opening bid from any team</div>
                    </div>
                  `}
                </div>
              </div>

              <!-- Gavel Auctioneer Actions (SOLD / UNSOLD / CUSTOM) -->
              <div class="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <button onclick="window.app.handleSold()" ${(!leadingTeam || isSoldOrUnsold) ? 'disabled' : ''} class="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-600/30 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 text-sm transition">
                    <span class="animate-hammer">🔨</span>
                    <span>SOLD TO ${leadingTeam ? leadingTeam.shortName : '---'}</span>
                  </button>

                  <button onclick="window.app.handleUnsold()" ${(leadingTeam || isSoldOrUnsold) ? 'disabled' : ''} class="px-5 py-3 bg-rose-900/50 hover:bg-rose-800/60 text-rose-200 border border-rose-600/50 font-bold rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 text-sm transition">
                    <span>❌</span>
                    <span>MARK UNSOLD</span>
                  </button>
                </div>

                <div class="flex items-center gap-2">
                  <button onclick="window.app.promptCustomBid()" ${isSoldOrUnsold ? 'disabled' : ''} class="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold rounded-2xl text-xs disabled:opacity-40 flex items-center gap-1.5">
                    <span>✏️</span> Custom Bid
                  </button>
                  <button onclick="window.soundFX.playGavel()" class="px-3 py-3 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 rounded-2xl text-xs" title="Gavel Sound FX">
                    🔔 Gavel Strike
                  </button>
                </div>
              </div>
            </div>

            <!-- 10 TEAM BIDDING PADS (Interactive Responsive Grid) -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <span>⚡</span> 10 Franchise Bidding Deck (Click to Bid)
                </h3>
                <span class="text-xs text-slate-500">Shortcuts: Keys [1-9, 0] • [Space] for SOLD</span>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                ${engine.teams.map((team, idx) => {
                  const check = engine.canTeamBid(team.id);
                  const isLeading = engine.leadingTeamId === team.id;
                  const keyNumber = idx === 9 ? '0' : (idx + 1);

                  return `
                    <button 
                      onclick="window.app.handleTeamBid('${team.id}')"
                      ${(!check.allowed || isSoldOrUnsold) ? 'disabled' : ''}
                      class="relative p-3 rounded-2xl border text-left transition-all duration-200 group overflow-hidden ${
                        isLeading 
                          ? 'border-emerald-400 bg-emerald-950/40 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-400/50' 
                          : check.allowed && !isSoldOrUnsold
                            ? 'glass-panel border-slate-800 hover:border-amber-400 hover:bg-slate-800/80 cursor-pointer active:scale-95'
                            : 'bg-slate-900/40 border-slate-800/40 opacity-40 cursor-not-allowed'
                      }"
                    >
                      <!-- Key shortcut pill -->
                      <div class="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-slate-800/90 text-[10px] font-mono text-slate-400 border border-slate-700">
                        [${keyNumber}]
                      </div>

                      <div class="flex items-center gap-2 mb-2">
                        <span class="text-xl">${team.fallbackIcon}</span>
                        <span class="font-extrabold text-xs px-2 py-0.5 rounded" style="background-color: ${team.color}; color: ${team.textColor}">${team.shortName}</span>
                      </div>

                      <div class="text-xs font-bold text-slate-200 truncate">${team.name}</div>
                      
                      <div class="mt-2 text-[11px] space-y-1">
                        <div class="flex justify-between text-slate-400">
                          <span>Purse:</span>
                          <span class="font-mono-numeric text-amber-400 font-bold">${AuctionEngine.formatINRShort(team.remainingBudget)}</span>
                        </div>
                        <div class="flex justify-between text-slate-400">
                          <span>Squad:</span>
                          <span class="font-mono-numeric text-slate-300">${team.players.length}/15</span>
                        </div>
                      </div>

                      <!-- Bid action / status pill -->
                      <div class="mt-2.5 pt-2 border-t border-slate-800/60">
                        ${isLeading ? `
                          <div class="text-center text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/20 py-1 rounded-lg">
                            👑 LEADING BID
                          </div>
                        ` : check.allowed && !isSoldOrUnsold ? `
                          <div class="text-center text-[11px] font-extrabold text-slate-950 bg-amber-400 group-hover:bg-amber-300 py-1 rounded-lg transition">
                            BID ${AuctionEngine.formatINRShort(nextBidAmount)}
                          </div>
                        ` : `
                          <div class="text-center text-[10px] font-semibold text-rose-400 bg-rose-500/10 py-1 rounded-lg truncate" title="${check.reason || 'Closed'}">
                            ${check.reason || 'Unavailable'}
                          </div>
                        `}
                      </div>
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Live Bid Stream Log -->
            <div class="glass-panel rounded-2xl p-4 border border-slate-800">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span>📜</span> Bidding Activity for ${player.name}
                </h4>
                <span class="text-xs text-slate-500">${engine.bidHistory.length} total bids</span>
              </div>

              ${engine.bidHistory.length === 0 ? `
                <div class="text-center py-4 text-xs text-slate-500">
                  No bids recorded yet. Click any team above to place the opening bid at base price (${AuctionEngine.formatINR(player.basePrice)}).
                </div>
              ` : `
                <div class="space-y-1.5 max-h-40 overflow-y-auto pr-2">
                  ${engine.bidHistory.map((bid, i) => `
                    <div class="flex items-center justify-between p-2 rounded-xl text-xs ${i === 0 ? 'bg-amber-500/15 border border-amber-500/30' : 'bg-slate-900/60 border border-slate-800/60'}">
                      <div class="flex items-center gap-2">
                        <span class="font-mono text-slate-500">#${engine.bidHistory.length - i}</span>
                        <span class="font-extrabold px-2 py-0.5 rounded text-[10px]" style="background-color: ${bid.teamColor}; color: #000">${bid.teamShort}</span>
                        <span class="font-semibold text-slate-200">${bid.teamName}</span>
                      </div>
                      <div class="flex items-center gap-3">
                        <span class="font-extrabold font-mono-numeric ${i === 0 ? 'text-amber-400 text-sm' : 'text-slate-300'}">${AuctionEngine.formatINR(bid.amount)}</span>
                        <span class="text-[10px] text-slate-500 font-mono">${bid.timestamp}</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>

          </div>
        </div>
      </div>
    `;
  }

  // ==================== 3. PLAYERS DATABASE TAB (200 PLAYERS) ====================
  renderPlayersList() {
    const engine = window.auctionEngine;
    const container = document.getElementById('section-players');
    if (!container) return;

    // Filter players based on current selections
    const filtered = engine.players.filter(p => {
      // Search
      if (this.searchQuery && !p.name.toLowerCase().includes(this.searchQuery) && !p.country.toLowerCase().includes(this.searchQuery)) {
        return false;
      }
      // Role
      if (this.selectedRole !== 'all' && p.role !== this.selectedRole) {
        return false;
      }
      // Category (Indian / Overseas)
      if (this.selectedCategory !== 'all' && p.category !== this.selectedCategory) {
        return false;
      }
      // Status
      if (this.selectedStatus !== 'all' && p.status !== this.selectedStatus) {
        return false;
      }
      return true;
    });

    container.innerHTML = `
      <div class="max-w-7xl mx-auto space-y-6">
        <!-- Header & Search Controls -->
        <div class="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 class="text-2xl font-extrabold text-slate-100 font-heading flex items-center gap-2">
                <span>👥</span> IPL 2026 Player Pool (${filtered.length} / 200 Players)
              </h2>
              <p class="text-xs text-slate-400">Search, filter, and inspect all 200 registered players. Launch any player directly into the live auction room.</p>
            </div>
            
            <div class="flex items-center gap-2">
              <button onclick="window.app.handleNextPlayer()" class="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2">
                <span>⚡</span>
                <span>AUCTION NEXT RANDOM</span>
              </button>
            </div>
          </div>

          <!-- Filters Row -->
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
            <!-- Search Bar -->
            <div>
              <label class="block text-[11px] font-semibold text-slate-400 mb-1">Search Player Name</label>
              <input 
                type="text" 
                id="playerSearchInput" 
                value="${this.searchQuery}" 
                placeholder="e.g. Virat, Bumrah, Head..." 
                class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <!-- Role Filter -->
            <div>
              <label class="block text-[11px] font-semibold text-slate-400 mb-1">Role Filter</label>
              <select id="roleFilterSelect" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400">
                <option value="all" ${this.selectedRole === 'all' ? 'selected' : ''}>All Roles (All 200)</option>
                <option value="Batter" ${this.selectedRole === 'Batter' ? 'selected' : ''}>🏏 Batters (50)</option>
                <option value="Bowler" ${this.selectedRole === 'Bowler' ? 'selected' : ''}>⚡ Bowlers (60)</option>
                <option value="All-Rounder" ${this.selectedRole === 'All-Rounder' ? 'selected' : ''}>🔥 All-Rounders (55)</option>
                <option value="Wicket Keeper" ${this.selectedRole === 'Wicket Keeper' ? 'selected' : ''}>🧤 Wicket Keepers (35)</option>
              </select>
            </div>

            <!-- Category (Indian / Overseas) -->
            <div>
              <label class="block text-[11px] font-semibold text-slate-400 mb-1">Origin Filter</label>
              <select id="categoryFilterSelect" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400">
                <option value="all" ${this.selectedCategory === 'all' ? 'selected' : ''}>All Nationalities</option>
                <option value="Indian" ${this.selectedCategory === 'Indian' ? 'selected' : ''}>🇮🇳 Indian Players</option>
                <option value="Overseas" ${this.selectedCategory === 'Overseas' ? 'selected' : ''}>🌐 Overseas Players</option>
              </select>
            </div>

            <!-- Status Filter -->
            <div>
              <label class="block text-[11px] font-semibold text-slate-400 mb-1">Auction Status</label>
              <select id="statusFilterSelect" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400">
                <option value="all" ${this.selectedStatus === 'all' ? 'selected' : ''}>All Statuses</option>
                <option value="UPCOMING" ${this.selectedStatus === 'UPCOMING' ? 'selected' : ''}>⏳ Upcoming</option>
                <option value="SOLD" ${this.selectedStatus === 'SOLD' ? 'selected' : ''}>✅ Sold</option>
                <option value="UNSOLD" ${this.selectedStatus === 'UNSOLD' ? 'selected' : ''}>❌ Unsold</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Players Grid -->
        ${filtered.length === 0 ? `
          <div class="text-center py-16 glass-panel rounded-3xl border border-slate-800 text-slate-400">
            <span class="text-4xl">🔍</span>
            <h3 class="text-lg font-bold text-slate-200 mt-2">No matching players found</h3>
            <p class="text-xs text-slate-500 mt-1">Try clearing your search query or reset filter dropdowns.</p>
          </div>
        ` : `
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            ${filtered.map(player => {
              const team = player.soldTo ? engine.getTeam(player.soldTo) : null;
              return `
                <div class="glass-panel p-4 rounded-2xl border border-slate-800 hover:border-amber-500/50 transition-all flex flex-col justify-between relative overflow-hidden group">
                  <!-- Status Corner Ribbon -->
                  ${player.status === 'SOLD' ? `
                    <div class="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500 text-slate-950 shadow-sm">
                      SOLD • ${team ? team.shortName : ''}
                    </div>
                  ` : player.status === 'UNSOLD' ? `
                    <div class="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-500 text-slate-100">
                      UNSOLD
                    </div>
                  ` : `
                    <div class="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                      #${player.id}
                    </div>
                  `}

                  <div>
                    <div class="flex items-center gap-3 mb-3">
                      <div class="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 p-1 flex items-center justify-center shrink-0">
                        <img src="${player.image}" alt="${player.name}" class="w-full h-full object-contain rounded-lg" />
                      </div>
                      <div class="min-w-0">
                        <h4 class="font-extrabold text-sm text-slate-100 truncate group-hover:text-amber-400 transition">${player.name}</h4>
                        <div class="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                          <span>${player.roleIcon} ${player.role}</span>
                          <span>•</span>
                          <span>${player.countryFlag}</span>
                        </div>
                      </div>
                    </div>

                    <div class="space-y-1 text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 mb-3">
                      <div class="flex justify-between text-slate-400">
                        <span>Base Price:</span>
                        <strong class="text-amber-300 font-mono-numeric">${AuctionEngine.formatINR(player.basePrice)}</strong>
                      </div>
                      ${player.status === 'SOLD' ? `
                        <div class="flex justify-between text-slate-400">
                          <span>Sold Price:</span>
                          <strong class="text-emerald-400 font-mono-numeric">${AuctionEngine.formatINR(player.soldPrice)}</strong>
                        </div>
                      ` : ''}
                      <div class="flex justify-between text-slate-400">
                        <span>Tier / Rating:</span>
                        <span class="text-slate-300">${player.tier} (${player.rating})</span>
                      </div>
                    </div>
                  </div>

                  <!-- Action Buttons -->
                  <div class="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                    <button onclick="window.app.openPlayerModal(${player.id})" class="flex-1 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition">
                      View Bio
                    </button>
                    <button onclick="window.app.startAuctionForPlayer(${player.id})" class="flex-1 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/40 transition">
                      ${player.status === 'SOLD' ? 'Re-Auction' : 'Auction Now 🔨'}
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;

    // Reattach search and filter listeners
    this.setupEventListeners();
  }

  // ==================== 4. 10 TEAMS MATRIX TAB ====================
  renderTeamsMatrix() {
    const engine = window.auctionEngine;
    const analytics = engine.getAnalytics();
    const container = document.getElementById('section-teams');
    if (!container) return;

    container.innerHTML = `
      <div class="max-w-7xl mx-auto space-y-6">
        <div>
          <h2 class="text-2xl font-extrabold text-slate-100 font-heading flex items-center gap-2">
            <span>🛡️</span> 10 Franchise Hub & Live Purses
          </h2>
          <p class="text-xs text-slate-400">Click any franchise card to view their full bought squad, budget usage, and role compositions.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${analytics.teamStats.map(team => {
            const spentPercent = ((team.spent / team.totalBudget) * 100).toFixed(1);
            return `
              <div onclick="window.app.openTeamModal('${team.id}')" class="glass-panel p-6 rounded-3xl border border-slate-800 hover:border-amber-500/50 cursor-pointer team-card-hover transition-all space-y-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg" style="background-color: ${team.color}; color: ${team.textColor}">
                      ${team.fallbackIcon}
                    </div>
                    <div>
                      <h3 class="text-lg font-extrabold text-slate-100">${team.name}</h3>
                      <div class="text-xs text-slate-400">Code: <strong class="font-mono text-amber-400">${team.shortName}</strong></div>
                    </div>
                  </div>
                  <span class="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    ${team.playerCount} / 15 Players
                  </span>
                </div>

                <!-- Budget Bar -->
                <div>
                  <div class="flex justify-between text-xs font-semibold mb-1.5">
                    <span class="text-slate-400">Remaining Purse: <strong class="text-amber-400 font-mono-numeric">${team.remainingFormatted}</strong></span>
                    <span class="text-slate-400">Spent: <strong class="text-slate-200 font-mono-numeric">${team.spentFormatted}</strong> (${spentPercent}%)</span>
                  </div>
                  <div class="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div class="h-full rounded-full transition-all duration-500" style="width: ${spentPercent}%; background-color: ${team.color}"></div>
                  </div>
                </div>

                <!-- Role Breakdown Badges -->
                <div class="grid grid-cols-4 gap-2 text-center text-xs pt-2 border-t border-slate-800/80">
                  <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div class="text-slate-400 text-[10px]">🏏 Batters</div>
                    <div class="font-bold text-slate-200 font-mono-numeric">${team.batters}</div>
                  </div>
                  <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div class="text-slate-400 text-[10px]">⚡ Bowlers</div>
                    <div class="font-bold text-slate-200 font-mono-numeric">${team.bowlers}</div>
                  </div>
                  <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div class="text-slate-400 text-[10px]">🔥 All-R</div>
                    <div class="font-bold text-slate-200 font-mono-numeric">${team.allRounders}</div>
                  </div>
                  <div class="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div class="text-slate-400 text-[10px]">🧤 Keepers</div>
                    <div class="font-bold text-slate-200 font-mono-numeric">${team.keepers}</div>
                  </div>
                </div>

                <!-- Quota Counter -->
                <div class="flex justify-between items-center text-xs text-slate-400 pt-1">
                  <span>🇮🇳 Indian: <strong class="text-slate-200 font-mono">${team.indianCount}</strong></span>
                  <span>🌐 Overseas: <strong class="text-cyan-400 font-mono">${team.overseasCount} / 6 max</strong></span>
                  <span>Slots Left: <strong class="text-emerald-400 font-mono">${team.slotsLeft}</strong></span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // ==================== 5. SQUADS & RULES BREAKDOWN ====================
  renderSquadsBreakdown() {
    const engine = window.auctionEngine;
    const analytics = engine.getAnalytics();
    const container = document.getElementById('section-squads');
    if (!container) return;

    container.innerHTML = `
      <div class="max-w-7xl mx-auto space-y-6">
        <div>
          <h2 class="text-2xl font-extrabold text-slate-100 font-heading flex items-center gap-2">
            <span>📊</span> Squad Composition & Franchise Balance Matrix
          </h2>
          <p class="text-xs text-slate-400">Complete bird's-eye comparison of all 10 franchises across roles, overseas quotas, and purse expenditure.</p>
        </div>

        <div class="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                <tr>
                  <th class="py-4 px-4 font-bold">Franchise</th>
                  <th class="py-4 px-3 font-bold text-center">Squad (Max 15)</th>
                  <th class="py-4 px-3 font-bold text-center">🏏 Bat</th>
                  <th class="py-4 px-3 font-bold text-center">⚡ Bowl</th>
                  <th class="py-4 px-3 font-bold text-center">🔥 AR</th>
                  <th class="py-4 px-3 font-bold text-center">🧤 WK</th>
                  <th class="py-4 px-3 font-bold text-center">🌐 OS (Max 6)</th>
                  <th class="py-4 px-4 font-bold text-right">Spent</th>
                  <th class="py-4 px-4 font-bold text-right text-amber-400">Remaining Purse</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60 font-mono-numeric">
                ${analytics.teamStats.map(t => `
                  <tr class="hover:bg-slate-800/40 cursor-pointer transition" onclick="window.app.openTeamModal('${t.id}')">
                    <td class="py-3 px-4 flex items-center gap-2.5 font-sans font-bold text-slate-200">
                      <span class="text-lg">${t.fallbackIcon}</span>
                      <span>${t.name}</span>
                      <span class="px-1.5 py-0.5 rounded text-[10px] font-mono" style="background-color: ${t.color}; color: ${t.textColor}">${t.shortName}</span>
                    </td>
                    <td class="py-3 px-3 text-center font-bold ${t.playerCount === 15 ? 'text-emerald-400' : 'text-slate-300'}">${t.playerCount} / 15</td>
                    <td class="py-3 px-3 text-center text-slate-300">${t.batters}</td>
                    <td class="py-3 px-3 text-center text-slate-300">${t.bowlers}</td>
                    <td class="py-3 px-3 text-center text-slate-300">${t.allRounders}</td>
                    <td class="py-3 px-3 text-center text-slate-300">${t.keepers}</td>
                    <td class="py-3 px-3 text-center font-bold ${t.overseasCount >= 6 ? 'text-rose-400' : 'text-cyan-400'}">${t.overseasCount} / 6</td>
                    <td class="py-3 px-4 text-right text-slate-300">${t.spentFormatted}</td>
                    <td class="py-3 px-4 text-right font-extrabold text-amber-400">${t.remainingFormatted}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // ==================== 6. LEADERBOARD & STATS ====================
  renderLeaderboard() {
    const engine = window.auctionEngine;
    const analytics = engine.getAnalytics();
    const container = document.getElementById('section-leaderboard');
    if (!container) return;

    const soldPlayers = engine.players.filter(p => p.status === 'SOLD');
    const sortedByPrice = [...soldPlayers].sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0));
    const top10MostExpensive = sortedByPrice.slice(0, 10);

    container.innerHTML = `
      <div class="max-w-7xl mx-auto space-y-8">
        <div>
          <h2 class="text-2xl font-extrabold text-slate-100 font-heading flex items-center gap-2">
            <span>🏆</span> Auction Leaderboards & Key Records
          </h2>
          <p class="text-xs text-slate-400">Real-time records, highest purchases, top spending franchises, and statistical highlights.</p>
        </div>

        <!-- Highlight Cards (4 Key Metrics) -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <!-- Most Expensive Player -->
          <div class="glass-panel p-5 rounded-3xl border border-amber-500/30 space-y-2">
            <div class="text-[11px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
              <span>👑</span> Most Expensive Buy
            </div>
            ${analytics.mostExpensive ? `
              <div class="text-lg font-extrabold text-slate-100 truncate">${analytics.mostExpensive.name}</div>
              <div class="text-2xl font-extrabold text-amber-400 font-mono-numeric">${AuctionEngine.formatINR(analytics.mostExpensive.soldPrice)}</div>
              <div class="text-xs text-slate-400">Sold to <strong>${engine.getTeam(analytics.mostExpensive.soldTo)?.name || '---'}</strong></div>
            ` : `
              <div class="text-sm text-slate-500 py-3">No players sold yet</div>
            `}
          </div>

          <!-- Total Money Spent -->
          <div class="glass-panel p-5 rounded-3xl border border-slate-800 space-y-2">
            <div class="text-[11px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
              <span>💰</span> Total Money Spent
            </div>
            <div class="text-2xl font-extrabold text-emerald-400 font-mono-numeric">${analytics.totalSpentFormatted}</div>
            <div class="text-xs text-slate-400">Across <strong>${analytics.soldCount}</strong> sold players</div>
          </div>

          <!-- Top Spender Team -->
          <div class="glass-panel p-5 rounded-3xl border border-slate-800 space-y-2">
            <div class="text-[11px] uppercase tracking-wider text-blue-400 font-bold flex items-center gap-1.5">
              <span>💳</span> Highest Spender Franchise
            </div>
            ${analytics.topSpendingTeam ? `
              <div class="text-lg font-extrabold text-slate-100 truncate">${analytics.topSpendingTeam.name}</div>
              <div class="text-2xl font-extrabold text-blue-400 font-mono-numeric">${analytics.topSpendingTeam.spentFormatted}</div>
              <div class="text-xs text-slate-400">Bought ${analytics.topSpendingTeam.playerCount} players</div>
            ` : `
              <div class="text-sm text-slate-500 py-3">No expenditures yet</div>
            `}
          </div>

          <!-- Most Purse Remaining -->
          <div class="glass-panel p-5 rounded-3xl border border-slate-800 space-y-2">
            <div class="text-[11px] uppercase tracking-wider text-purple-400 font-bold flex items-center gap-1.5">
              <span>🏦</span> Largest Purse Left
            </div>
            ${analytics.topPurseRemainingTeam ? `
              <div class="text-lg font-extrabold text-slate-100 truncate">${analytics.topPurseRemainingTeam.name}</div>
              <div class="text-2xl font-extrabold text-purple-400 font-mono-numeric">${analytics.topPurseRemainingTeam.remainingFormatted}</div>
              <div class="text-xs text-slate-400">${analytics.topPurseRemainingTeam.slotsLeft} slots remaining</div>
            ` : `
              <div class="text-sm text-slate-500 py-3">---</div>
            `}
          </div>
        </div>

        <!-- Top 10 Most Expensive Buys Table -->
        <div class="glass-panel rounded-3xl border border-slate-800 p-6">
          <h3 class="text-base font-extrabold text-slate-100 font-heading mb-4 flex items-center gap-2">
            <span>⭐</span> Top 10 Most Expensive Players in IPL 2026 Auction
          </h3>

          ${top10MostExpensive.length === 0 ? `
            <div class="text-center py-8 text-xs text-slate-500">
              No players sold yet. Once players are sold in live auction, top buys will rank here!
            </div>
          ` : `
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-900/60 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <tr>
                    <th class="py-3 px-3">Rank</th>
                    <th class="py-3 px-4">Player</th>
                    <th class="py-3 px-3">Role</th>
                    <th class="py-3 px-3">Base Price</th>
                    <th class="py-3 px-4">Sold Team</th>
                    <th class="py-3 px-4 text-right text-amber-400 font-bold">Final Price</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60 font-mono-numeric">
                  ${top10MostExpensive.map((p, idx) => {
                    const team = engine.getTeam(p.soldTo);
                    return `
                      <tr class="hover:bg-slate-800/40">
                        <td class="py-3 px-3 font-bold text-amber-400 font-mono">#${idx + 1}</td>
                        <td class="py-3 px-4 flex items-center gap-2.5 font-sans font-bold text-slate-200">
                          <span>${p.countryFlag}</span>
                          <span>${p.name}</span>
                        </td>
                        <td class="py-3 px-3 font-sans text-slate-300">${p.roleIcon} ${p.role}</td>
                        <td class="py-3 px-3 text-slate-400">${AuctionEngine.formatINR(p.basePrice)}</td>
                        <td class="py-3 px-4 font-sans text-slate-200">
                          ${team ? `<span class="px-2 py-0.5 rounded text-xs font-bold" style="background-color: ${team.color}; color: ${team.textColor}">${team.shortName}</span> ${team.name}` : '---'}
                        </td>
                        <td class="py-3 px-4 text-right font-extrabold text-amber-400 text-sm">${AuctionEngine.formatINR(p.soldPrice)}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;
  }

  // ==================== 7. AUCTION HISTORY TAB ====================
  renderHistory() {
    const engine = window.auctionEngine;
    const history = engine.auctionHistory;
    const container = document.getElementById('section-history');
    if (!container) return;

    container.innerHTML = `
      <div class="max-w-7xl mx-auto space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 class="text-2xl font-extrabold text-slate-100 font-heading flex items-center gap-2">
              <span>📜</span> Completed Auction Ledger
            </h2>
            <p class="text-xs text-slate-400">Complete timestamped audit log of all completed bids and gavel decisions.</p>
          </div>
          <button id="btnExportCSV" class="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center gap-2">
            <span>📥</span> Download Official CSV Report
          </button>
        </div>

        <div class="glass-panel rounded-3xl border border-slate-800 overflow-hidden">
          ${history.length === 0 ? `
            <div class="text-center py-16 text-slate-500 text-xs">
              No completed auctions recorded yet. Start live auctioning players to populate the ledger.
            </div>
          ` : `
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-900/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <tr>
                    <th class="py-3 px-4">Time</th>
                    <th class="py-3 px-4">Player Name</th>
                    <th class="py-3 px-3">Role</th>
                    <th class="py-3 px-3">Origin</th>
                    <th class="py-3 px-3">Base Price</th>
                    <th class="py-3 px-4">Winning Franchise</th>
                    <th class="py-3 px-4">Status</th>
                    <th class="py-3 px-4 text-right text-amber-400 font-bold">Final Price</th>
                    <th class="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800/60 font-mono-numeric">
                  ${history.map(item => `
                    <tr class="hover:bg-slate-800/40">
                      <td class="py-3 px-4 text-slate-500 text-[11px]">${item.timestamp}</td>
                      <td class="py-3 px-4 font-sans font-bold text-slate-200">
                        ${item.countryFlag} ${item.playerName}
                      </td>
                      <td class="py-3 px-3 font-sans text-slate-300">${item.roleIcon} ${item.role}</td>
                      <td class="py-3 px-3 font-sans text-slate-400">${item.country}</td>
                      <td class="py-3 px-3 text-slate-400">${AuctionEngine.formatINR(item.basePrice)}</td>
                      <td class="py-3 px-4 font-sans">
                        ${item.status === 'SOLD' ? `
                          <span class="px-2 py-0.5 rounded text-xs font-bold" style="background-color: ${item.soldToTeamColor}; color: #fff">${item.soldToTeamShort}</span>
                          <span class="text-slate-300 ml-1 font-semibold">${item.soldToTeamName}</span>
                        ` : '<span class="text-slate-500">---</span>'}
                      </td>
                      <td class="py-3 px-4">
                        ${item.status === 'SOLD' ? `
                          <span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">SOLD</span>
                        ` : `
                          <span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30">UNSOLD</span>
                        `}
                      </td>
                      <td class="py-3 px-4 text-right font-bold ${item.status === 'SOLD' ? 'text-amber-400 text-sm' : 'text-slate-500'}">
                        ${item.soldPrice ? AuctionEngine.formatINR(item.soldPrice) : '---'}
                      </td>
                      <td class="py-3 px-3 text-center">
                        <button onclick="window.auctionEngine.reopenPlayerAuction(${item.playerId})" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded text-[10px] font-bold border border-slate-700">
                          Re-Auction
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>
    `;

    // Reattach CSV listener
    this.setupEventListeners();
  }

  // ==================== AUCTION ACTIONS ====================
  handleTeamBid(teamId) {
    const res = window.auctionEngine.placeBid(teamId);
    if (!res.success) {
      this.showToast(res.reason, 'error');
    } else {
      this.showToast(`Bid Placed by ${res.team.shortName}: ${AuctionEngine.formatINR(res.bidAmount)}`, 'success');
    }
  }

  handleSold() {
    const res = window.auctionEngine.sellCurrentPlayer();
    if (!res.success) {
      this.showToast(res.reason, 'error');
      return;
    }
    this.triggerConfetti();
    this.openSoldModal(res.player, res.team, res.finalPrice);
  }

  handleUnsold() {
    const res = window.auctionEngine.passCurrentPlayerUnsold();
    if (!res.success) {
      this.showToast(res.reason, 'error');
      return;
    }
    this.openUnsoldModal(res.player);
  }

  handleNextPlayer() {
    const nextPlayer = window.auctionEngine.selectNextUpcomingPlayer();
    if (!nextPlayer) {
      this.showToast("All 200 players have already been auctioned!", 'info');
      return;
    }
    this.switchTab('live-auction');
  }

  handleUndoBid() {
    const success = window.auctionEngine.undoLastBid();
    if (success) {
      this.showToast("Previous bid undone.", 'info');
    }
  }

  startAuctionForPlayer(playerId) {
    window.auctionEngine.selectPlayer(playerId);
    this.switchTab('live-auction');
  }

  toggleTimer() {
    const engine = window.auctionEngine;
    if (engine.isTimerRunning) engine.pauseTimer();
    else engine.startTimer();
  }

  promptCustomBid() {
    const engine = window.auctionEngine;
    const player = engine.getActivePlayer();
    if (!player) return;

    const input = prompt(`Enter custom bid in Rupees for ${player.name} (e.g., 50000000 for 5 Crore):`, engine.getNextBidAmount());
    if (!input) return;

    const amount = parseInt(input);
    if (isNaN(amount) || amount <= 0) {
      alert("Invalid bid amount entered.");
      return;
    }

    const teamShort = prompt(`Enter Franchise code to place this bid (${engine.teams.map(t => t.shortName).join(', ')}):`, "CSK");
    if (!teamShort) return;

    const team = engine.teams.find(t => t.shortName.toLowerCase() === teamShort.toLowerCase().trim());
    if (!team) {
      alert("Invalid team code entered.");
      return;
    }

    const res = engine.placeBid(team.id, amount);
    if (!res.success) {
      alert("Bid rejected: " + res.reason);
    }
  }

  // ==================== MODALS ====================
  openSoldModal(player, team, price) {
    const modal = document.getElementById('soldCelebrationModal');
    if (!modal) return;

    modal.innerHTML = `
      <div class="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <div class="glass-panel-gold max-w-lg w-full rounded-3xl p-8 border-2 border-amber-400 text-center relative overflow-hidden shadow-2xl animate-fade-in">
          <div class="sold-stamp inline-block px-6 py-2 rounded-2xl text-2xl font-black tracking-widest uppercase mb-4">
            🔨 SOLD!
          </div>

          <div class="w-32 h-32 mx-auto rounded-2xl bg-slate-800 border-2 border-amber-400/50 p-2 shadow-xl my-4">
            <img src="${player.image}" alt="${player.name}" class="w-full h-full object-contain rounded-xl" />
          </div>

          <h3 class="text-3xl font-extrabold text-slate-100 font-heading">${player.name}</h3>
          <p class="text-sm font-semibold text-amber-400 mt-1">${player.countryFlag} ${player.role} • ${player.category}</p>

          <div class="my-6 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
            <div class="text-xs uppercase tracking-wider text-slate-400">Final Selling Price</div>
            <div class="text-4xl font-extrabold text-amber-400 font-mono-numeric my-1">${AuctionEngine.formatINR(price)}</div>
            <div class="flex items-center justify-center gap-2 text-sm text-slate-200 mt-2 font-bold">
              <span>Bought by:</span>
              <span class="px-2.5 py-0.5 rounded text-xs" style="background-color: ${team.color}; color: ${team.textColor}">${team.shortName}</span>
              <span>${team.name}</span>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button onclick="window.app.closeSoldModal(); window.app.handleNextPlayer();" class="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg transition">
              Call Next Player ⏭️
            </button>
            <button onclick="window.app.closeSoldModal();" class="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-xl border border-slate-700 transition">
              Close
            </button>
          </div>
        </div>
      </div>
    `;
    modal.classList.remove('hidden');
  }

  closeSoldModal() {
    const modal = document.getElementById('soldCelebrationModal');
    if (modal) modal.classList.add('hidden');
  }

  openUnsoldModal(player) {
    const modal = document.getElementById('soldCelebrationModal');
    if (!modal) return;

    modal.innerHTML = `
      <div class="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <div class="glass-panel max-w-md w-full rounded-3xl p-8 border-2 border-rose-500/50 text-center relative overflow-hidden shadow-2xl">
          <div class="unsold-stamp inline-block px-6 py-2 rounded-2xl text-2xl font-black tracking-widest uppercase mb-4">
            ❌ UNSOLD
          </div>

          <div class="w-28 h-28 mx-auto rounded-2xl bg-slate-800 border border-slate-700 p-2 shadow-xl my-4">
            <img src="${player.image}" alt="${player.name}" class="w-full h-full object-contain rounded-xl opacity-75" />
          </div>

          <h3 class="text-2xl font-extrabold text-slate-100 font-heading">${player.name}</h3>
          <p class="text-xs text-slate-400 mt-1">${player.countryFlag} ${player.role} • Base: ${AuctionEngine.formatINR(player.basePrice)}</p>

          <p class="text-xs text-slate-400 my-6 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            No franchise placed an opening bid. Player moves to the Unsold Pool and can be re-auctioned later.
          </p>

          <div class="flex items-center gap-3">
            <button onclick="window.app.closeSoldModal(); window.app.handleNextPlayer();" class="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-lg transition">
              Next Player ⏭️
            </button>
            <button onclick="window.app.closeSoldModal();" class="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-xl border border-slate-700 transition">
              Close
            </button>
          </div>
        </div>
      </div>
    `;
    modal.classList.remove('hidden');
  }

  openPlayerModal(playerId) {
    const player = window.auctionEngine.players.find(p => p.id === playerId);
    if (!player) return;

    const modal = document.getElementById('detailsModal');
    if (!modal) return;

    const team = player.soldTo ? window.auctionEngine.getTeam(player.soldTo) : null;

    modal.innerHTML = `
      <div class="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <div class="glass-panel max-w-lg w-full rounded-3xl p-6 border border-slate-700 text-left relative overflow-hidden shadow-2xl">
          <button onclick="window.app.closeDetailsModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white text-xl">✕</button>

          <div class="flex items-center gap-4 mb-4">
            <div class="w-20 h-20 rounded-2xl bg-slate-800 border border-amber-500/30 p-2 shrink-0">
              <img src="${player.image}" alt="${player.name}" class="w-full h-full object-contain rounded-xl" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="px-2.5 py-0.5 text-[10px] rounded-full tier-${player.tier.toLowerCase()}">${player.tier}</span>
                <span class="text-xs text-slate-400">${player.countryFlag} ${player.country}</span>
              </div>
              <h3 class="text-2xl font-extrabold text-slate-100 font-heading mt-1">${player.name}</h3>
              <p class="text-xs text-amber-400 font-semibold">${player.roleIcon} ${player.role} • ${player.category}</p>
            </div>
          </div>

          <p class="text-xs text-slate-300 italic p-3 rounded-xl bg-slate-900/60 border border-slate-800 mb-4">
            "${player.specialty}"
          </p>

          <div class="grid grid-cols-2 gap-2 text-xs mb-4">
            <div class="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div class="text-slate-400 text-[10px]">IPL Matches</div>
              <div class="font-bold text-slate-100 font-mono text-base">${player.stats.matches}</div>
            </div>
            <div class="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div class="text-slate-400 text-[10px]">Base Price</div>
              <div class="font-bold text-amber-400 font-mono text-base">${AuctionEngine.formatINR(player.basePrice)}</div>
            </div>
            <div class="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div class="text-slate-400 text-[10px]">${player.role === 'Bowler' ? 'Wickets (Best)' : 'Runs (Highest)'}</div>
              <div class="font-bold text-slate-100 font-mono text-base">${player.role === 'Bowler' ? `${player.stats.wickets} (${player.stats.bestBowling})` : `${player.stats.runs} (${player.stats.highestScore})`}</div>
            </div>
            <div class="p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div class="text-slate-400 text-[10px]">Auction Status</div>
              <div class="font-bold ${player.status === 'SOLD' ? 'text-emerald-400' : player.status === 'UNSOLD' ? 'text-rose-400' : 'text-amber-400'} font-mono text-sm">
                ${player.status} ${team ? `(${team.shortName})` : ''}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <button onclick="window.app.startAuctionForPlayer(${player.id}); window.app.closeDetailsModal();" class="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition">
              ${player.status === 'SOLD' ? 'Re-Auction Player' : 'Launch in Live Auction 🔨'}
            </button>
            <button onclick="window.app.closeDetailsModal()" class="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition">
              Close
            </button>
          </div>
        </div>
      </div>
    `;
    modal.classList.remove('hidden');
  }

  openTeamModal(teamId) {
    const engine = window.auctionEngine;
    const team = engine.getTeam(teamId);
    if (!team) return;

    const modal = document.getElementById('detailsModal');
    if (!modal) return;

    const spent = team.totalBudget - team.remainingBudget;

    modal.innerHTML = `
      <div class="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
        <div class="glass-panel max-w-2xl w-full rounded-3xl p-6 border border-slate-700 text-left relative overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
          <button onclick="window.app.closeDetailsModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white text-xl">✕</button>

          <div class="flex items-center gap-3 mb-4 shrink-0">
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg" style="background-color: ${team.color}; color: ${team.textColor}">
              ${team.fallbackIcon}
            </div>
            <div>
              <h3 class="text-2xl font-extrabold text-slate-100 font-heading">${team.name}</h3>
              <div class="text-xs text-slate-400">Purse Left: <strong class="text-amber-400 font-mono-numeric">${AuctionEngine.formatINR(team.remainingBudget)}</strong> • Spent: <strong class="text-slate-200 font-mono-numeric">${AuctionEngine.formatINR(spent)}</strong></div>
            </div>
          </div>

          <div class="flex items-center justify-between text-xs bg-slate-900/80 p-3 rounded-xl border border-slate-800 mb-4 shrink-0 font-mono-numeric">
            <span>Squad: <strong>${team.players.length} / ${team.maxPlayers}</strong></span>
            <span>Overseas: <strong>${team.players.filter(p => p.category === 'Overseas').length} / ${team.maxOverseas}</strong></span>
            <span>Slots Left: <strong>${team.maxPlayers - team.players.length}</strong></span>
          </div>

          <!-- Roster List -->
          <div class="overflow-y-auto space-y-2 pr-1 flex-1">
            <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Purchased Squad (${team.players.length} Players)</h4>
            
            ${team.players.length === 0 ? `
              <div class="text-center py-8 text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800">
                No players purchased yet by ${team.shortName}.
              </div>
            ` : `
              <div class="space-y-2">
                ${team.players.map((p, idx) => `
                  <div class="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    <div class="flex items-center gap-3">
                      <span class="font-mono text-slate-500 font-bold">#${idx + 1}</span>
                      <span class="text-base">${p.countryFlag || '🌐'}</span>
                      <div>
                        <div class="font-bold text-slate-200">${p.name}</div>
                        <div class="text-[11px] text-slate-400">${p.roleIcon} ${p.role} • ${p.category}</div>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="font-bold text-amber-400 font-mono-numeric">${AuctionEngine.formatINR(p.soldPrice)}</div>
                      <div class="text-[10px] text-slate-500">Base: ${AuctionEngine.formatINRShort(p.basePrice)}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

          <div class="pt-4 border-t border-slate-800 mt-4 shrink-0 flex justify-end">
            <button onclick="window.app.closeDetailsModal()" class="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition">
              Close
            </button>
          </div>
        </div>
      </div>
    `;
    modal.classList.remove('hidden');
  }

  closeDetailsModal() {
    const modal = document.getElementById('detailsModal');
    if (modal) modal.classList.add('hidden');
  }
}

// Instantiate on load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
