// ============================================================
// build-schedule.mjs
// Genera el calendario oficial (fecha UTC + sede) de los 104 partidos
// del Mundial 2026 a partir de los datos públicos de OpenFootball.
//
// Uso:  node scripts/build-schedule.mjs
// Salida (por stdout):
//   1) Bloque SQL: INSERT de venues + 104 UPDATE de matches  -> pegar en seed.sql
//   2) Literal TS `SCHEDULE`                                  -> pegar en el mock
//
// El join se hace por (grupo + par de equipos) en fase de grupos y por
// número de partido en eliminatorias. Verifica 104/104 o aborta.
// ============================================================

const OWC_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

// 48 selecciones en el orden de inserción de seed.sql (id = índice + 1).
const TEAMS = [
  ["México", "MEX", "A"], ["Sudáfrica", "RSA", "A"], ["Corea del Sur", "KOR", "A"], ["Chequia", "CZE", "A"],
  ["Canadá", "CAN", "B"], ["Bosnia y Herzegovina", "BIH", "B"], ["Catar", "QAT", "B"], ["Suiza", "SUI", "B"],
  ["Brasil", "BRA", "C"], ["Marruecos", "MAR", "C"], ["Haití", "HAI", "C"], ["Escocia", "SCO", "C"],
  ["Estados Unidos", "USA", "D"], ["Paraguay", "PAR", "D"], ["Australia", "AUS", "D"], ["Turquía", "TUR", "D"],
  ["Alemania", "GER", "E"], ["Curazao", "CUW", "E"], ["Costa de Marfil", "CIV", "E"], ["Ecuador", "ECU", "E"],
  ["Países Bajos", "NED", "F"], ["Japón", "JPN", "F"], ["Suecia", "SWE", "F"], ["Túnez", "TUN", "F"],
  ["Bélgica", "BEL", "G"], ["Egipto", "EGY", "G"], ["Irán", "IRN", "G"], ["Nueva Zelanda", "NZL", "G"],
  ["España", "ESP", "H"], ["Cabo Verde", "CPV", "H"], ["Arabia Saudita", "KSA", "H"], ["Uruguay", "URU", "H"],
  ["Francia", "FRA", "I"], ["Senegal", "SEN", "I"], ["Irak", "IRQ", "I"], ["Noruega", "NOR", "I"],
  ["Argentina", "ARG", "J"], ["Argelia", "ALG", "J"], ["Austria", "AUT", "J"], ["Jordania", "JOR", "J"],
  ["Portugal", "POR", "K"], ["R.D. del Congo", "COD", "K"], ["Uzbekistán", "UZB", "K"], ["Colombia", "COL", "K"],
  ["Inglaterra", "ENG", "L"], ["Croacia", "CRO", "L"], ["Ghana", "GHA", "L"], ["Panamá", "PAN", "L"],
];

// Nombre en inglés de OpenFootball -> código FIFA.
const EN2CODE = {
  Algeria: "ALG", Argentina: "ARG", Australia: "AUS", Austria: "AUT", Belgium: "BEL",
  "Bosnia & Herzegovina": "BIH", Brazil: "BRA", Canada: "CAN", "Cape Verde": "CPV",
  Colombia: "COL", Croatia: "CRO", "Curaçao": "CUW", "Czech Republic": "CZE",
  "DR Congo": "COD", Ecuador: "ECU", Egypt: "EGY", England: "ENG", France: "FRA",
  Germany: "GER", Ghana: "GHA", Haiti: "HAI", Iran: "IRN", Iraq: "IRQ",
  "Ivory Coast": "CIV", Japan: "JPN", Jordan: "JOR", Mexico: "MEX", Morocco: "MAR",
  Netherlands: "NED", "New Zealand": "NZL", Norway: "NOR", Panama: "PAN",
  Paraguay: "PAR", Portugal: "POR", Qatar: "QAT", "Saudi Arabia": "KSA",
  Scotland: "SCO", Senegal: "SEN", "South Africa": "RSA", "South Korea": "KOR",
  Spain: "ESP", Sweden: "SWE", Switzerland: "SUI", Tunisia: "TUN", Turkey: "TUR",
  USA: "USA", Uruguay: "URU", Uzbekistan: "UZB",
};

// `ground` de OpenFootball -> [estadio, ciudad, país]. El id de la sede es el
// orden de este array (1..16) y coincide con el INSERT INTO venues de seed.sql.
const VENUES = [
  ["Atlanta", "Mercedes-Benz Stadium", "Atlanta", "Estados Unidos"],
  ["Boston (Foxborough)", "Gillette Stadium", "Foxborough", "Estados Unidos"],
  ["Dallas (Arlington)", "AT&T Stadium", "Arlington", "Estados Unidos"],
  ["Guadalajara (Zapopan)", "Estadio Akron", "Zapopan", "México"],
  ["Houston", "NRG Stadium", "Houston", "Estados Unidos"],
  ["Kansas City", "Arrowhead Stadium", "Kansas City", "Estados Unidos"],
  ["Los Angeles (Inglewood)", "SoFi Stadium", "Inglewood", "Estados Unidos"],
  ["Mexico City", "Estadio Azteca", "Ciudad de México", "México"],
  ["Miami (Miami Gardens)", "Hard Rock Stadium", "Miami Gardens", "Estados Unidos"],
  ["Monterrey (Guadalupe)", "Estadio BBVA", "Guadalupe", "México"],
  ["New York/New Jersey (East Rutherford)", "MetLife Stadium", "East Rutherford", "Estados Unidos"],
  ["Philadelphia", "Lincoln Financial Field", "Filadelfia", "Estados Unidos"],
  ["San Francisco Bay Area (Santa Clara)", "Levi's Stadium", "Santa Clara", "Estados Unidos"],
  ["Seattle", "Lumen Field", "Seattle", "Estados Unidos"],
  ["Toronto", "BMO Field", "Toronto", "Canadá"],
  ["Vancouver", "BC Place", "Vancouver", "Canadá"],
];
const GROUND2ID = Object.fromEntries(VENUES.map((v, i) => [v[0], i + 1]));

// Esquema de numeración de seed.sql en fase de grupos: por grupo,
// M1:1v2 M2:3v4 M3:1v3 M4:2v4 M5:1v4 M6:2v3 (posiciones 1-4 dentro del grupo).
const SCHEME = [[1, 2], [3, 4], [1, 3], [2, 4], [1, 4], [2, 3]];

/** Hora local + offset de OpenFootball ("13:00 UTC-6") -> ISO UTC. */
function toUtcIso(date, time) {
  const [hhmm, utc] = time.split(" ");
  const off = parseInt(utc.replace("UTC", ""), 10);
  const sign = off < 0 ? "-" : "+";
  const oh = String(Math.abs(off)).padStart(2, "0");
  return new Date(`${date}T${hhmm}:00${sign}${oh}:00`).toISOString();
}

async function main() {
  const res = await fetch(OWC_URL);
  if (!res.ok) throw new Error(`No se pudo descargar OpenFootball: HTTP ${res.status}`);
  const owc = await res.json();
  const owcGroup = owc.matches.filter((m) => m.group);
  const owcKO = owc.matches.filter((m) => !m.group);

  // Partidos de grupo de seed.sql.
  const seedGroup = [];
  for (let g = 0; g < 12; g++) {
    const letter = "ABCDEFGHIJKL"[g];
    for (let j = 0; j < 6; j++) {
      const [a, b] = SCHEME[j];
      seedGroup.push({
        num: g * 6 + j + 1,
        group: letter,
        homeCode: TEAMS[g * 4 + a - 1][1],
        awayCode: TEAMS[g * 4 + b - 1][1],
      });
    }
  }

  const schedule = {}; // num -> { iso, venueId }
  const unmatched = [];

  for (const sm of seedGroup) {
    const pair = new Set([sm.homeCode, sm.awayCode]);
    const grp = "Group " + sm.group;
    const found = owcGroup.find(
      (m) =>
        m.group === grp &&
        pair.has(EN2CODE[m.team1]) &&
        pair.has(EN2CODE[m.team2]) &&
        EN2CODE[m.team1] !== EN2CODE[m.team2]
    );
    if (!found) { unmatched.push("GS " + sm.num); continue; }
    schedule[sm.num] = { iso: toUtcIso(found.date, found.time), venueId: GROUND2ID[found.ground] };
  }

  for (let n = 73; n <= 104; n++) {
    let m;
    if (n <= 102) m = owcKO.find((x) => x.num === n);
    else if (n === 103) m = owcKO.find((x) => x.round === "Match for third place");
    else m = owcKO.find((x) => x.round === "Final");
    if (!m) { unmatched.push("KO " + n); continue; }
    schedule[n] = { iso: toUtcIso(m.date, m.time), venueId: GROUND2ID[m.ground] };
  }

  const matched = Object.keys(schedule).length;
  if (matched !== 104 || unmatched.length) {
    throw new Error(`Join incompleto: ${matched}/104. Sin emparejar: ${unmatched.join(", ")}`);
  }

  // 1) SQL para seed.sql
  let sql = "INSERT INTO venues (name, city, country) VALUES\n";
  sql += VENUES.map(
    (v, i) =>
      `  ('${v[1].replace(/'/g, "''")}', '${v[2].replace(/'/g, "''")}', '${v[3]}')` +
      (i < 15 ? "," : ";")
  ).join("\n");
  sql += "\n\n";
  for (let n = 1; n <= 104; n++) {
    const s = schedule[n];
    sql += `UPDATE matches SET match_date='${s.iso.replace(".000Z", "+00")}', venue_id=${s.venueId} WHERE match_number=${n};\n`;
  }

  // 2) Literal TS para el mock
  let ts = "export const SCHEDULE: Record<number, { date: string; venue: number }> = {\n";
  for (let n = 1; n <= 104; n++) {
    const s = schedule[n];
    ts += `  ${n}: { date: "${s.iso.replace(".000Z", "Z")}", venue: ${s.venueId} },\n`;
  }
  ts += "};\n";

  console.log("-- Join verificado: 104/104\n");
  console.log("=== SQL (seed.sql) ===");
  console.log(sql);
  console.log("=== TS SCHEDULE (mock) ===");
  console.log(ts);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
