# World Cup 2026 Explorer

**Submitted by:** TBD (directory ID)

**Group Members:** TBD

**App Description:** A Node.js/Express web app that lets users explore 2026 FIFA World Cup fixtures and teams, and submit score predictions that are saved to MongoDB.

**YouTube Video Link:** TBD

**APIs:** [football-data.org](https://www.football-data.org/) — provides fixtures, team rosters, and match data for the 2026 World Cup.

**Contact Email:** TBD

**Deployed App Link:** TBD

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
