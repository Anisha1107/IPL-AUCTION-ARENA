// Core Auction Engine for IPL Auction Arena
// Handles bid increments, team budgets, squad limits, timer, and state persistence

class AuctionEngine {
  constructor() {
    this.STORAGE_KEY = 'ipl_auction_arena_state_v1';
    this.players = [];
    this.teams = [];
    this.activePlayerId = null;
    this.currentBid = 0;
    this.leadingTeamId = null;
    this.bidHistory = []; // Bids for current active player
    this.auctionHistory = []; // Finished auctions: [{ player, team, amount, status, timestamp }]
    
    // Timer settings
    this.timerDuration = 20; // seconds
    this.timerSeconds = 20;
    this.timerInterval = null;
    this.isTimerRunning = false;

    this.listeners = new Set();
    this.init();
  }

  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.players = parsed.players || JSON.parse(JSON.stringify(PLAYERS_DATABASE));
        this.teams = parsed.teams || JSON.parse(JSON.stringify(DEFAULT_TEAMS));
        this.activePlayerId = parsed.activePlayerId || null;
        this.currentBid = parsed.currentBid || 0;
        this.leadingTeamId = parsed.leadingTeamId || null;
        this.bidHistory = parsed.bidHistory || [];
        this.auctionHistory = parsed.auctionHistory || [];
      } catch (e) {
        console.error("Failed to restore auction state, loading defaults:", e);
        this.loadDefaults();
      }
    } else {
      this.loadDefaults();
    }
  }

  loadDefaults() {
    this.players = JSON.parse(JSON.stringify(PLAYERS_DATABASE));
    this.teams = JSON.parse(JSON.stringify(DEFAULT_TEAMS));
    this.activePlayerId = null;
    this.currentBid = 0;
    this.leadingTeamId = null;
    this.bidHistory = [];
    this.auctionHistory = [];
    this.save();
  }

  save() {
    const state = {
      players: this.players,
      teams: this.teams,
      activePlayerId: this.activePlayerId,
      currentBid: this.currentBid,
      leadingTeamId: this.leadingTeamId,
      bidHistory: this.bidHistory,
      auctionHistory: this.auctionHistory
    };
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("Storage write failed", e);
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this);
      } catch (err) {
        console.error("Listener error:", err);
      }
    }
  }

  // Currency Formatter: ₹50 Lakh, ₹1.50 Crore, ₹120 Crore
  static formatINR(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return "₹0";
    if (amount === 0) return "₹0";

    const cr = 10000000;
    const lakh = 100000;

    if (amount >= cr) {
      const inCr = amount / cr;
      return `₹${inCr.toFixed(2).replace(/\.00$/, '')} Crore`;
    } else if (amount >= lakh) {
      const inLakh = amount / lakh;
      return `₹${inLakh.toFixed(2).replace(/\.00$/, '')} Lakh`;
    } else {
      return `₹${amount.toLocaleString('en-IN')}`;
    }
  }

  // Short currency for tight badges: ₹1.5 Cr, ₹50 L
  static formatINRShort(amount) {
    if (!amount) return "₹0";
    const cr = 10000000;
    const lakh = 100000;

    if (amount >= cr) {
      return `₹${(amount / cr).toFixed(2).replace(/\.00$/, '')} Cr`;
    } else if (amount >= lakh) {
      return `₹${(amount / lakh).toFixed(2).replace(/\.00$/, '')} L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  }

  // Calculate dynamic bid increment based on current price level
  getNextIncrement(currentAmount) {
    const amt = currentAmount || 0;
    if (amt < 10000000) {
      // Below ₹1 Crore: +₹10 Lakh
      return 1000000;
    } else if (amt < 20000000) {
      // ₹1 Cr - ₹2 Cr: +₹20 Lakh
      return 2000000;
    } else if (amt < 50000000) {
      // ₹2 Cr - ₹5 Cr: +₹25 Lakh
      return 2500000;
    } else if (amt < 100000000) {
      // ₹5 Cr - ₹10 Cr: +₹50 Lakh
      return 5000000;
    } else {
      // ₹10 Cr+: +₹1.00 Crore
      return 10000000;
    }
  }

  getNextBidAmount() {
    if (!this.activePlayerId) return 0;
    const player = this.getActivePlayer();
    if (!player) return 0;

    if (this.bidHistory.length === 0) {
      // First bid is the base price
      return player.basePrice;
    }
    return this.currentBid + this.getNextIncrement(this.currentBid);
  }

  getActivePlayer() {
    if (!this.activePlayerId) return null;
    return this.players.find(p => p.id === this.activePlayerId) || null;
  }

  getLeadingTeam() {
    if (!this.leadingTeamId) return null;
    return this.teams.find(t => t.id === this.leadingTeamId) || null;
  }

  getTeam(teamId) {
    return this.teams.find(t => t.id === teamId) || null;
  }

  // Comprehensive rule validation for a team placing the next bid
  canTeamBid(teamId) {
    const player = this.getActivePlayer();
    if (!player) {
      return { allowed: false, reason: "No active player in auction" };
    }
    if (player.status === "SOLD" || player.status === "UNSOLD") {
      return { allowed: false, reason: "Player auction has ended" };
    }

    const team = this.getTeam(teamId);
    if (!team) {
      return { allowed: false, reason: "Invalid team" };
    }

    // Is already leading?
    if (this.leadingTeamId === teamId) {
      return { allowed: false, reason: "Current highest bidder" };
    }

    // Squad limit check (Max 15 players)
    const currentSquadCount = team.players.length;
    if (currentSquadCount >= team.maxPlayers) {
      return { allowed: false, reason: `Squad full (${team.maxPlayers}/${team.maxPlayers})` };
    }

    // Overseas quota check (Max 6 overseas)
    if (player.category === "Overseas") {
      const overseasCount = team.players.filter(p => p.category === "Overseas").length;
      if (overseasCount >= team.maxOverseas) {
        return { allowed: false, reason: `Overseas quota full (${team.maxOverseas}/${team.maxOverseas})` };
      }
    }

    const nextBid = this.getNextBidAmount();

    // Remaining purse check
    if (team.remainingBudget < nextBid) {
      return {
        allowed: false,
        reason: `Insufficient purse (${AuctionEngine.formatINRShort(team.remainingBudget)} left)`
      };
    }

    // Minimum purse reserve for unfilled slots check
    const remainingSlotsAfterThis = team.maxPlayers - (currentSquadCount + 1);
    const minReserveNeeded = remainingSlotsAfterThis * 2000000; // ₹20L min per slot
    if ((team.remainingBudget - nextBid) < minReserveNeeded && remainingSlotsAfterThis > 0) {
      return {
        allowed: false,
        reason: `Must reserve ${AuctionEngine.formatINRShort(minReserveNeeded)} for remaining ${remainingSlotsAfterThis} slots`
      };
    }

    return { allowed: true, nextBid };
  }

  // Set a player to be auctioned
  selectPlayer(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return false;

    this.stopTimer();
    this.activePlayerId = playerId;
    this.currentBid = player.basePrice;
    this.leadingTeamId = null;
    this.bidHistory = [];

    // Mark previous in-auction players back to upcoming if not sold/unsold
    this.players.forEach(p => {
      if (p.id === playerId) {
        p.status = "IN_AUCTION";
      } else if (p.status === "IN_AUCTION") {
        p.status = "UPCOMING";
      }
    });

    this.resetTimer();
    this.save();
    return true;
  }

  // Select next upcoming player automatically
  selectNextUpcomingPlayer() {
    const upcoming = this.players.filter(p => p.status === "UPCOMING");
    if (upcoming.length === 0) return null;
    // Pick first or random upcoming
    const nextPlayer = upcoming[0];
    this.selectPlayer(nextPlayer.id);
    return nextPlayer;
  }

  // Place bid from a team
  placeBid(teamId, customAmount = null) {
    const check = this.canTeamBid(teamId);
    if (!check.allowed && !customAmount) {
      return { success: false, reason: check.reason };
    }

    const team = this.getTeam(teamId);
    const player = this.getActivePlayer();
    const bidAmount = customAmount || this.getNextBidAmount();

    if (team.remainingBudget < bidAmount) {
      return { success: false, reason: "Insufficient budget for this bid!" };
    }

    this.currentBid = bidAmount;
    this.leadingTeamId = teamId;
    
    this.bidHistory.unshift({
      teamId: team.id,
      teamName: team.name,
      teamShort: team.shortName,
      teamColor: team.color,
      amount: bidAmount,
      timestamp: new Date().toLocaleTimeString()
    });

    if (window.soundFX) {
      window.soundFX.playBid();
    }

    // Auto restart / bump timer on fresh bid
    this.resetTimer();
    this.startTimer();

    this.save();
    return { success: true, bidAmount, team };
  }

  // Mark currently active player as SOLD
  sellCurrentPlayer() {
    const player = this.getActivePlayer();
    if (!player) return { success: false, reason: "No active player" };
    if (!this.leadingTeamId || this.bidHistory.length === 0) {
      return { success: false, reason: "No bids placed yet! Mark as UNSOLD instead." };
    }

    const team = this.getTeam(this.leadingTeamId);
    if (!team) return { success: false, reason: "Invalid winning team" };

    this.stopTimer();

    const finalPrice = this.currentBid;

    // Deduct team budget
    team.remainingBudget -= finalPrice;
    
    // Add player to team roster
    const playerRecord = {
      id: player.id,
      name: player.name,
      role: player.role,
      roleIcon: player.roleIcon,
      category: player.category,
      country: player.country,
      countryFlag: player.countryFlag,
      basePrice: player.basePrice,
      soldPrice: finalPrice,
      image: player.image,
      tier: player.tier,
      rating: player.rating,
      specialty: player.specialty
    };
    team.players.push(playerRecord);

    // Update player status
    player.status = "SOLD";
    player.soldPrice = finalPrice;
    player.soldTo = team.id;
    player.currentBid = finalPrice;

    // Record into completed auction history
    const historyItem = {
      id: Date.now(),
      playerId: player.id,
      playerName: player.name,
      role: player.role,
      roleIcon: player.roleIcon,
      category: player.category,
      country: player.country,
      countryFlag: player.countryFlag,
      basePrice: player.basePrice,
      soldPrice: finalPrice,
      soldToTeamId: team.id,
      soldToTeamName: team.name,
      soldToTeamShort: team.shortName,
      soldToTeamColor: team.color,
      status: "SOLD",
      timestamp: new Date().toLocaleTimeString()
    };
    this.auctionHistory.unshift(historyItem);

    if (window.soundFX) {
      window.soundFX.playSoldFanfare();
    }

    this.save();
    return { success: true, player, team, finalPrice };
  }

  // Mark currently active player as UNSOLD
  passCurrentPlayerUnsold() {
    const player = this.getActivePlayer();
    if (!player) return { success: false, reason: "No active player" };

    this.stopTimer();

    player.status = "UNSOLD";
    player.soldPrice = null;
    player.soldTo = null;

    const historyItem = {
      id: Date.now(),
      playerId: player.id,
      playerName: player.name,
      role: player.role,
      roleIcon: player.roleIcon,
      category: player.category,
      country: player.country,
      countryFlag: player.countryFlag,
      basePrice: player.basePrice,
      soldPrice: null,
      soldToTeamId: null,
      soldToTeamName: null,
      soldToTeamShort: "-",
      soldToTeamColor: "#64748b",
      status: "UNSOLD",
      timestamp: new Date().toLocaleTimeString()
    };
    this.auctionHistory.unshift(historyItem);

    if (window.soundFX) {
      window.soundFX.playUnsoldBuzzer();
    }

    this.save();
    return { success: true, player };
  }

  // Re-open an auctioned player for re-bidding
  reopenPlayerAuction(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return false;

    // If was previously sold to a team, restore team budget and remove from roster
    if (player.status === "SOLD" && player.soldTo && player.soldPrice) {
      const team = this.getTeam(player.soldTo);
      if (team) {
        team.remainingBudget += player.soldPrice;
        team.players = team.players.filter(p => p.id !== player.id);
      }
    }

    // Remove from history
    this.auctionHistory = this.auctionHistory.filter(h => h.playerId !== player.id);

    player.status = "UPCOMING";
    player.soldPrice = null;
    player.soldTo = null;
    player.currentBid = player.basePrice;

    this.selectPlayer(player.id);
    this.save();
    return true;
  }

  // Undo last bid on active player
  undoLastBid() {
    if (this.bidHistory.length === 0) return false;

    this.bidHistory.shift(); // remove latest bid

    if (this.bidHistory.length > 0) {
      const prevBid = this.bidHistory[0];
      this.currentBid = prevBid.amount;
      this.leadingTeamId = prevBid.teamId;
    } else {
      const player = this.getActivePlayer();
      this.currentBid = player ? player.basePrice : 0;
      this.leadingTeamId = null;
    }

    this.save();
    return true;
  }

  // Timer controls
  startTimer() {
    if (this.isTimerRunning) return;
    this.isTimerRunning = true;
    clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      if (this.timerSeconds > 0) {
        this.timerSeconds--;
        if (this.timerSeconds <= 5 && this.timerSeconds > 0) {
          if (window.soundFX) window.soundFX.playWarningTick();
        } else if (this.timerSeconds > 5) {
          if (window.soundFX) window.soundFX.playTick();
        }
        this.notify();
      } else {
        this.stopTimer();
        if (window.soundFX) window.soundFX.playGavel();
        this.notify();
      }
    }, 1000);
    this.notify();
  }

  pauseTimer() {
    this.isTimerRunning = false;
    clearInterval(this.timerInterval);
    this.notify();
  }

  stopTimer() {
    this.isTimerRunning = false;
    clearInterval(this.timerInterval);
  }

  resetTimer(duration = null) {
    if (duration) this.timerDuration = duration;
    this.timerSeconds = this.timerDuration;
    this.stopTimer();
    this.notify();
  }

  // Overall Statistics & Analytics calculations
  getAnalytics() {
    const soldPlayers = this.players.filter(p => p.status === "SOLD");
    const unsoldPlayers = this.players.filter(p => p.status === "UNSOLD");
    const upcomingPlayers = this.players.filter(p => p.status === "UPCOMING" || p.status === "IN_AUCTION");

    let totalSpent = 0;
    soldPlayers.forEach(p => {
      totalSpent += (p.soldPrice || 0);
    });

    // Most expensive sold player
    let mostExpensive = null;
    let cheapestSold = null;

    if (soldPlayers.length > 0) {
      const sortedByPrice = [...soldPlayers].sort((a, b) => (b.soldPrice || 0) - (a.soldPrice || 0));
      mostExpensive = sortedByPrice[0];
      cheapestSold = sortedByPrice[sortedByPrice.length - 1];
    }

    // Team stats
    const teamStats = this.teams.map(t => {
      const spent = t.totalBudget - t.remainingBudget;
      const overseasCount = t.players.filter(p => p.category === "Overseas").length;
      const indianCount = t.players.length - overseasCount;
      const batters = t.players.filter(p => p.role === "Batter").length;
      const bowlers = t.players.filter(p => p.role === "Bowler").length;
      const allRounders = t.players.filter(p => p.role === "All-Rounder").length;
      const keepers = t.players.filter(p => p.role === "Wicket Keeper").length;

      return {
        ...t,
        spent,
        spentFormatted: AuctionEngine.formatINR(spent),
        remainingFormatted: AuctionEngine.formatINR(t.remainingBudget),
        playerCount: t.players.length,
        slotsLeft: t.maxPlayers - t.players.length,
        overseasCount,
        indianCount,
        batters,
        bowlers,
        allRounders,
        keepers
      };
    });

    const topSpendingTeam = [...teamStats].sort((a, b) => b.spent - a.spent)[0];
    const topPurseRemainingTeam = [...teamStats].sort((a, b) => b.remainingBudget - a.remainingBudget)[0];

    return {
      totalPlayers: this.players.length,
      soldCount: soldPlayers.length,
      unsoldCount: unsoldPlayers.length,
      upcomingCount: upcomingPlayers.length,
      totalSpent,
      totalSpentFormatted: AuctionEngine.formatINR(totalSpent),
      mostExpensive,
      cheapestSold,
      topSpendingTeam,
      topPurseRemainingTeam,
      teamStats
    };
  }

  // Export current auction report as CSV
  exportCSV() {
    let csv = "ID,Player Name,Role,Category,Country,Base Price,Sold Price,Winning Team,Status\n";
    this.players.forEach(p => {
      const team = p.soldTo ? this.getTeam(p.soldTo) : null;
      const teamName = team ? team.name : "-";
      const soldPrice = p.soldPrice ? p.soldPrice : "-";
      csv += `"${p.id}","${p.name}","${p.role}","${p.category}","${p.country}","${p.basePrice}","${soldPrice}","${teamName}","${p.status}"\n`;
    });
    return csv;
  }

  // Full reset of entire auction with confirmation
  resetAll() {
    this.stopTimer();
    localStorage.removeItem(this.STORAGE_KEY);
    this.loadDefaults();
    this.notify();
  }
}

window.auctionEngine = new AuctionEngine();
