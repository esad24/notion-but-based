// sample pages for trying the app at realistic volume: sampleTasks() builds ~700 pages around today, marked demo:true so they can be removed in one go
const SAMPLE_TITLES = {
  business:['Rechnung an Kunden schicken','Angebot für Website-Projekt','Call mit Burak wegen Business','Unterlagen für Steuerberater','Umsatzsteuer-Voranmeldung','Pitch Deck überarbeiten','Domain verlängern','Invoice tracking sheet','Investor Meeting vorbereiten','Marktanalyse Konkurrenz','Landing Page Texte','Business Plan Kapitel 3'],
  job:['Sprint Planning','Code Review PR','1:1 mit Teamlead','Backlog aufräumen','Deploy auf Prod','AWS Lab Übung','Retro','Onboarding Doku lesen','Bug fix Login Flow','Architektur Meeting','Kunden-Demo','Incident Postmortem'],
  karriere:['LinkedIn Profil updaten','Bewerbung schreiben','CV aktualisieren','Networking Event','Gehaltsverhandlung vorbereiten','Portfolio Projekt','Mentoring Call','AWS Zertifikat lernen'],
  tech:['Home Server Backup','Raspberry Pi Setup','Obsidian Vault aufräumen','Python Script für Rechnungen','Router Firmware Update','Nextcloud self-hosten','Claude Projekt weiterbauen','iPhone Shortcuts bauen','NAS Festplatte tauschen'],
  iq:['Buch lesen: Thinking, Fast and Slow','Anki Karten wiederholen','Chess Puzzles','Online Kurs Statistik','Podcast Notizen','Deep Work Block','Journaling','Paper über Lernen lesen'],
  looks:['Skincare Routine','Friseur Termin','Dermatologe','Outfit planen','Hautarzt Befund besprechen','Zahnreinigung','Brille abholen'],
  training:['Push Day','Pull Day','Leg Day','Laufen 5 km','Mobility 20 min','Schwimmen','Boxtraining','Stretching'],
  health:['Blutwerte checken lassen','Meal Prep','Supplements bestellen','Schlaf tracken','Hausarzt Termin','Meditation','Physiotherapie','Vitamin D Spiegel'],
  opsec:['Passwörter rotieren','2FA überall aktivieren','VPN Abo verlängern','Alte Accounts löschen','Backup verschlüsseln','Privacy Settings prüfen'],
  osint:['OSINT Kurs Modul','Recherche Tools testen','CTF Challenge','Writeup lesen','Maltego ausprobieren'],
  termine:['Bürgeramt Termin','Autowerkstatt','Abendessen mit Freunden','Paket abholen','Wohnungsbesichtigung','Kfz-Versicherung','Geburtstag Mama','Kino'],
};
const SAMPLE_TRIPS = ['Urlaub Barcelona','AWS Summit','Familienbesuch','Skiurlaub','Workshop Berlin','Wochenendtrip Hamburg','Konferenz München'];
const SAMPLE_NOTES = ['Unterlagen vorher ausdrucken.','Link im Kalender, 10 min vorher rein.','- Punkt 1 klären\n- Budget besprechen\n- Nächste Schritte','Nicht vergessen: Ausweis mitnehmen.','Notizen aus dem letzten Mal durchgehen.','Erst recherchieren, dann entscheiden.'];
const isSample = t => !!(t && t.demo);
function sampleTasks(today = todayKey()){
  let seed = 20261018;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = a => a[Math.floor(rnd() * a.length)];
  const sp = statusProp(), pp = S.schema.props.find(p => p.id === 'priority' && p.type === 'select');
  const cp = S.schema.props.find(p => p.id === 'category' && p.type === 'select');
  const dp = P('date') && P('date').type === 'date' ? P('date') : S.schema.props.find(p => p.type === 'date');
  const has = (p, id) => !!opt(p, id);
  const cats = cp ? Object.keys(SAMPLE_TITLES).filter(k => has(cp, k)) : [];
  const status = (sp && {todo:groupOpt(sp, 'todo'), doing:groupOpt(sp, 'doing'), done:groupOpt(sp, 'done')}) || {};
  const prio = () => { if (!pp) return null; const r = rnd(); const id = r < .1 ? 'sh' : r < .35 ? 'h' : r < .55 ? 'mh' : r < .8 ? 'm' : r < .9 ? 'n' : ''; return has(pp, id) ? id : null; };
  const out = [];
  const add = (cat, title, date, opts = {}) => {
    const key = date ? date.d : '';
    const past = key && lastDay(date) < today, isToday = key && key <= today && lastDay(date) >= today;
    const r = rnd();
    const g = past ? (r < .88 ? 'done' : r < .93 ? 'doing' : 'todo') : isToday ? (r < .35 ? 'done' : r < .55 ? 'doing' : 'todo') : (r < .1 ? 'doing' : 'todo');
    const p = {};
    if (status[g]) p[sp.id] = status[g].id;
    const pr = opts.prio !== undefined ? opts.prio : prio(); if (pr && pp && has(pp, pr)) p[pp.id] = pr;
    if (cp && cat && has(cp, cat)) p[cp.id] = cat;
    if (dp && date) p[dp.id] = date;
    const base = (key ? parseKey(key).getTime() : Date.now() - 864e5 * 30) - Math.floor(rnd() * 12) * 864e5 - Math.floor(rnd() * 864e5);
    out.push({id:'sx' + out.length.toString(36).padStart(4, '0'), title, body:rnd() < .2 ? pick(SAMPLE_NOTES) : '', created:base, updated:base + Math.floor(rnd() * 3 * 864e5), order:base, p, demo:true});
  };
  const timed = (d, t, mins) => ({d, t, ed:d, e:fromMin(Math.min(toMin(t) + mins, 1439))});
  const allDay = (d, ed = '') => ({d, t:'', ed, e:''});
  const anyCat = () => cats.length ? pick(cats) : '';
  const titleFor = c => pick(SAMPLE_TITLES[c] || SAMPLE_TITLES.business);
  for (let i = -120; i <= 60; i++) {
    const d = addDays(today, i), wd = parseKey(d).getDay(), weekend = wd === 0 || wd === 6;
    if (!weekend) {
      if (rnd() < .8) add('job', 'Daily Standup', timed(d, '09:30', 15), {prio:'n'});
      const meetings = rnd() < .6 ? 1 + Math.floor(rnd() * 2) : 0;
      for (let m = 0; m < meetings; m++) add('job', titleFor('job'), timed(d, fromMin(600 + Math.floor(rnd() * 14) * 30), pick([30, 45, 60, 90])));
      if ((wd === 1 || wd === 3 || wd === 5) && rnd() < .85) add('training', titleFor('training'), rnd() < .7 ? timed(d, '18:00', 90) : timed(d, '07:00', 60), {prio:null});
      if (rnd() < .25) add('termine', titleFor('termine'), timed(d, pick(['08:00', '12:30', '16:00', '17:30']), 60));
      for (let n = 1 + Math.floor(rnd() * 3); n > 0; n--) { const c = anyCat(); add(c, titleFor(c), allDay(d)); }
    } else {
      if (rnd() < .5) add('training', titleFor('training'), timed(d, '10:00', 75), {prio:null});
      if (rnd() < .3) add('termine', pick(['Abendessen mit Freunden', 'Kino', 'Geburtstag Mama']), timed(d, '19:00', 180), {prio:null});
      for (let n = Math.floor(rnd() * 3); n > 0; n--) { const c = anyCat(); add(c, titleFor(c), allDay(d)); }
    }
    if ((i + 120) % 19 === 7) add(rnd() < .5 ? 'termine' : 'karriere', pick(SAMPLE_TRIPS), allDay(d, addDays(d, 1 + Math.floor(rnd() * 4))), {prio:null});
  }
  for (let n = 0; n < 35; n++) { const c = anyCat(); add(c, titleFor(c), null); }
  return out;
}
function addSamples(){
  const list = sampleTasks();
  for (const t of list) { S.tasks.set(t.id, t); persist(t.id); }
  render(); toast(`Added ${list.length} sample pages`);
  return list.length;
}
function removeSamples(){
  const ids = [...S.tasks.values()].filter(isSample).map(t => t.id);
  for (const id of ids) { S.tasks.delete(id); persistDelete(id); }
  render(); toast(`Removed ${ids.length} sample pages`);
}
