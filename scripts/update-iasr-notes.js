import 'dotenv/config'
import pg from 'pg'
const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

const NOTES = `Published 3 February 2026 (DSIT 2026/001) ahead of the India AI Impact Summit. 200 pages, 1,451 references. Second annual edition in an ongoing series.

Secretariat: UK AI Security Institute (within DSIT), which has pledged to host until a long-term international home is established. The institute rebranded from "AI Safety Institute" between the 2025 and 2026 editions.

Chair: Yoshua Bengio. Lead writers: Stephen Clare and Carina Prunkl. Senior advisers span Daron Acemoglu, Geoffrey Hinton, Stuart Russell, Andrew Yao, and Yi Zeng.

Series history: May 2024 Interim Report (ahead of Seoul Summit); 29 January 2025 first full annual (DSIT 2025/001, ahead of France AI Action Summit); 15 October 2025 First Key Update on Capabilities and Risk Implications (arXiv:2510.13653); 25 November 2025 Second Key Update on Technical Safeguards and Risk Management (arXiv:2511.19863); 3 February 2026 second full annual.

Scope: risk taxonomy covers misuse (bio/chem uplift, cyberattacks, influence operations), malfunctions (loss of control, bias, reliability), and systemic risks (labor markets, market concentration, environmental, privacy). Deliberately makes no policy recommendations.`

const r = await pool.query('UPDATE entity SET notes = $1 WHERE id = 653 RETURNING id, name', [NOTES])
console.log(r.rows)
await pool.end()
