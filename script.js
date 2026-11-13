// ==========================================
// 1. CONFIGURAZIONE SUPABASE (METTI I TUOI DATI)
// ==========================================
const SUPABASE_URL = 'https://ezxjhqhsuzrfcrdnxalf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_GmWBAeq68TUhLk4t2QE4EA_LYtrpnXX';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Data di oggi in formato YYYY-MM-DD (fuso locale)
const oggi = new Date().toLocaleDateString('en-CA');
const inputData = document.getElementById('data-turno');
inputData.value = oggi;
inputData.readOnly = true;
inputData.classList.add('bg-slate-100', 'text-slate-500', 'cursor-not-allowed');

let revealGiaFattoOggi = false;

// Gestione campo custom se selezionato "Altro"
const radioButtons = document.querySelectorAll('input[name="unita"]');
const customInput = document.getElementById('unita-custom');
radioButtons.forEach(radio => {
  radio.addEventListener('change', () => {
    if (document.getElementById('radio-altro').checked) {
      customInput.classList.remove('hidden');
      customInput.required = true;
    } else {
      customInput.classList.add('hidden');
      customInput.required = false;
    }
  });
});

// ==========================================
// 2. CARICAMENTO DATI E CHECK GIORNALIERO
// ==========================================
async function caricaTurnazioni() {
  const { data, error } = await db
    .from('turnazioni')
    .select('*')
    .order('data_turno', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Errore Supabase:', error);
    alert('Errore nel caricamento del database. Controlla URL e Key! (vabbu se la vedrà mattia)');
    return;
  }

  aggiornaBannerOggi(data);
  popolaTabella(data);
}

// Funzione che blocca/sblocca tutti i campi del form
function gestisciStatoForm(bloccato) {
  revealGiaFattoOggi = bloccato;
  const form = document.getElementById('turno-form');
  const elementi = form.querySelectorAll('input, button');
  const btn = document.getElementById('btn-salva');

  elementi.forEach(el => {
    el.disabled = bloccato;
  });

  if (bloccato) {
    form.classList.add('opacity-60', 'select-none');
    btn.className = 'w-full bg-slate-400 text-white font-semibold py-2.5 px-4 rounded-xl cursor-not-allowed';
    btn.textContent = '🔒 Reveal già registrato per oggi';
  } else {
    form.classList.remove('opacity-60', 'select-none');
    btn.className = 'w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-sm transition cursor-pointer';
    btn.textContent = 'Salva Turnazione';
  }
}

function aggiornaBannerOggi(records) {
  const banner = document.getElementById('check-banner');
  const icon = document.getElementById('check-icon');
  const title = document.getElementById('check-title');
  const desc = document.getElementById('check-desc');

  const turniOggi = records.filter(r => r.data_turno === oggi);

  if (turniOggi.length > 0) {
    const ultimo = turniOggi[0];
    banner.className = 'p-4 rounded-xl border flex items-center gap-3 shadow-sm bg-emerald-50 border-emerald-300 text-emerald-900';
    icon.textContent = '✅';
    title.className = 'font-bold text-sm uppercase tracking-wider text-emerald-700';
    title.textContent = `1000 reveal di oggi già fatto`;
    desc.className = 'text-sm text-emerald-800';
    desc.textContent = `Il reveal è stato fatto da ${ultimo.operatore}: ${ultimo.unita_treno}-${ultimo.numero_treno}`;
    
    // Blocca il form
    gestisciStatoForm(true);
  } else {
    banner.className = 'p-4 rounded-xl border flex items-center gap-3 shadow-sm bg-amber-50 border-amber-300 text-amber-900';
    icon.textContent = '⚠️';
    title.className = 'font-bold text-sm uppercase tracking-wider text-amber-700';
    title.textContent = 'Nessun 1000 reveal fatto oggi';
    desc.className = 'text-sm text-amber-800';
    desc.textContent = 'Eh mi sa che tocca andare sul binario 10 a controllare...';
    
    // Sblocca il form
    gestisciStatoForm(false);
  }
}

function popolaTabella(records) {
  const tbody = document.getElementById('tabella-body');
  document.getElementById('conteggio-record').textContent = `${records.length} record`;

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400">Nessun dato presente nel database.</td></tr>`;
    return;
  }

  tbody.innerHTML = records.map(r => {
    const isOggi = r.data_turno === oggi;
    const dataFormattata = new Date(r.data_turno).toLocaleDateString('it-IT');
    return `
      <tr class="${isOggi ? 'bg-blue-50/50' : 'hover:bg-slate-50'} transition">
        <td class="py-3 px-4 whitespace-nowrap font-medium">
          ${dataFormattata}
          ${isOggi ? '<span class="ml-1.5 text-[10px] font-bold uppercase bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Oggi</span>' : ''}
        </td>
        <td class="py-3 px-4 font-semibold text-slate-700">${r.unita_treno}</td>
        <td class="py-3 px-4 font-mono text-slate-900 font-bold">${r.numero_treno}</td>
        <td class="py-3 px-4 text-slate-600">${r.operatore}</td>
        <td class="py-3 px-4 text-right">
          <button onclick="eliminaRecord(${r.id})" class="text-red-500 hover:text-red-700 text-xs font-semibold px-2 py-1 rounded hover:bg-red-50 transition cursor-pointer">
            Elimina
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================
// 3. SALVATAGGIO NUOVO RECORD
// ==========================================
document.getElementById('turno-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (revealGiaFattoOggi) return;

  const btn = document.getElementById('btn-salva');
  btn.disabled = true;
  btn.textContent = 'Salvataggio...';

  let unitaScelta = document.querySelector('input[name="unita"]:checked').value;
  if (unitaScelta === 'Altro') {
    unitaScelta = customInput.value.trim();
  }

  const nuovoRecord = {
    unita_treno: unitaScelta,
    numero_treno: document.getElementById('numero-treno').value.trim(),
    operatore: document.getElementById('operatore').value.trim(),
    data_turno: oggi // Forza sempre la data odierna
  };

  const { error } = await db.from('turnazioni').insert([nuovoRecord]);

  if (error) {
    alert('Errore durante il salvataggio: ' + error.message);
    gestisciStatoForm(false);
  } else {
    // Ricarica l'intera pagina dopo il salvataggio
    window.location.reload();
  }
});

// ==========================================
// 4. ELIMINAZIONE RECORD
// ==========================================
async function eliminaRecord(id) {
  if (!confirm('Vuoi davvero eliminare questo treno?')) return;
  const { error } = await db.from('turnazioni').delete().eq('id', id);
  if (error) {
    alert('Errore eliminazione: ' + error.message);
  } else {
    caricaTurnazioni();
  }
}

// Avvio iniziale
caricaTurnazioni();