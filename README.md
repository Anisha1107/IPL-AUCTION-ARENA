# 🏏 IPL AUCTION ARENA (2026 Edition)

A modern, interactive, broadcast-ready live auction platform built specifically for college symposium non-technical events, cultural fests, sports quizzes, and interactive competitions.

---

## 🚀 Quick Start

1. Open `index.html` in any web browser (Google Chrome, Microsoft Edge, Brave, Firefox, Safari).
2. No internet server installation or database configuration is required.
3. All bids, team rosters, and budgets persist locally in `localStorage` in real-time.

---

## ✨ Features & Architecture

### 1. 200 Real IPL 2026 Players Pool
- **🏏 50 Batters**: Virat Kohli, Rohit Sharma, Shubman Gill, Travis Head, Suryakumar Yadav, Yashasvi Jaiswal, etc.
- **⚡ 60 Bowlers**: Jasprit Bumrah, Mitchell Starc, Pat Cummins, Rashid Khan, Kagiso Rabada, Mohammed Shami, Kuldeep Yadav, etc.
- **🔥 55 All-Rounders**: Hardik Pandya, Ravindra Jadeja, Andre Russell, Sunil Narine, Glenn Maxwell, Axar Patel, Sam Curran, etc.
- **🧤 35 Wicket Keepers**: MS Dhoni, Rishabh Pant, Sanju Samson, KL Rahul, Heinrich Klaasen, Nicholas Pooran, Jos Buttler, etc.
- **Nationalities**: 117 Indian Stars + 83 Global Overseas Superstars.
- **Base Prices**: ₹20 Lakh, ₹30 Lakh, ₹50 Lakh, ₹75 Lakh, ₹1 Crore, ₹1.5 Crore, ₹2.00 Crore.

### 2. 10 Official IPL Franchises
- **CSK** (Chennai Super Kings)
- **MI** (Mumbai Indians)
- **RCB** (Royal Challengers Bengaluru)
- **KKR** (Kolkata Knight Riders)
- **RR** (Rajasthan Royals)
- **SRH** (Sunrisers Hyderabad)
- **DC** (Delhi Capitals)
- **PBKS** (Punjab Kings)
- **GT** (Gujarat Titans)
- **LSG** (Lucknow Super Giants)

- **Starting Budget**: **₹120 Crore** per franchise.
- **Max Squad Size**: **15 Players** per team.
- **Overseas Quota**: Max **6 Overseas Players** per team.

---

## 🔨 Live Auction Engine & Smart Ladder

- **Below ₹1.00 Cr**: +₹10 Lakh
- **₹1.00 Cr – ₹2.00 Cr**: +₹20 Lakh
- **₹2.00 Cr – ₹5.00 Cr**: +₹25 Lakh
- **₹5.00 Cr – ₹10.00 Cr**: +₹50 Lakh
- **₹10.00 Cr+**: +₹1.00 Crore
- **Custom Bid**: Enter manual jump bids whenever required.

### Smart Protections
- Automatically prevents bids when purse is depleted.
- Automatically prevents bids if team has already reached max 15 players.
- Automatically prevents overseas bids if team has 6 overseas players.
- Reserves minimum ₹20 Lakh base price for unfilled squad slots so teams don't get trapped with empty roster slots.

---

## ⌨️ Live Event Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `1` to `9` | Instant Bid for Teams 1 to 9 (CSK, MI, RCB, KKR, RR, SRH, DC, PBKS, GT) |
| `0` | Instant Bid for Team 10 (LSG) |
| `Space` | **SOLD** Hammer Strike (Gavel + Fanfare + Confetti) |
| `U` | **UNSOLD** Gavel Stamp & Buzzer |
| `T` | Start / Pause Countdown Timer |
| `N` | Call Next Player to the Auction Stage |

---

## 📽️ Projector Mode

Click **"Projector View"** in the top navigation bar (or press `F11`) to activate the high-contrast, large-font broadcast layout designed for auditorium and symposium screens.

---

## 📊 Analytics, Leaderboards & Export

- **Top 10 Most Expensive Buys**
- **Franchise Spending Leaderboards**
- **Squad Composition Matrix**
- **1-Click CSV Export** of the complete auction ledger.
