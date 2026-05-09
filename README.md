# World Cup 2026 Explorer

**Submitted by:** Nico Mannarelli (nicom)

**Group Members:** Richeek Thakur (rthakur6), Nico Mannarelli (nicom)

**App Description:** A Node.js/Express/MongoDB app to explore 2026 FIFA World Cup fixtures and teams, and make score predictions stored in MongoDB.

**YouTube Video Link:** [https://youtu.be/Kw94AlrvgOk]https://youtu.be/Kw94AlrvgOk

**APIs:** [ESPN Site API](https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world) — fixtures, teams, match data, rosters, and player headshots for the 2026 World Cup.

**Contact Email:** richeek.thakur13@gmail.com

**Deployed App Link:** [https://worldcuptracker.onrender.com](https://worldcuptracker.onrender.com)

**AI Use:** Claude Code

---

## How to Run

1. Install dependencies:
   ```
   npm install
   ```

2. Add your credentials to `credentialsDontPost/.env`:
   ```
   MONGO_CONNECTION_STRING=your_mongodb_atlas_connection_string
   FOOTBALL_API_KEY=your_football_data_org_api_key
   SESSION_SECRET=any_long_random_string
   ```

3. Start the server:
   ```
   node server.js 3000
   ```

4. Visit [http://localhost:3000](http://localhost:3000)

Type `stop` in the terminal to shut down gracefully.
